import { randomUUID } from "node:crypto";
import { z } from "zod";
import { repo, owned, fail, audit, assertVersion } from "./workspace.common.js";
import { serviceScope } from "./service-management.service.js";
import { itemSchema, actionsFor } from "./service-management.validation.js";
import { packageInput } from "./workspace.validation.js";
const parent = (id, ctx, tx, write = true) =>
  owned("services", id, serviceScope(ctx).id, tx, write);
export async function packageDetails(packageId, ctx) {
  const row = await owned(
    "packages",
    packageId,
    serviceScope(ctx).id,
    undefined,
    false,
  );
  const items = await repo.select(
    "SELECT ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit FROM dbo.PackageItems WHERE PackageId=:packageId ORDER BY SortOrder,PackageItemId",
    { packageId },
  );
  return {
    id: row.PackageId,
    serviceId: row.ServiceId,
    name: row.PackageName,
    description: row.Description || "",
    price: Number(row.Price),
    discount: Number(row.DiscountPercentage),
    minimumGuests: row.MinimumGuests,
    maximumGuests: row.MaximumGuests,
    duration: row.DurationMinutes,
    featured: !!row.IsFeatured,
    active: !!row.IsActive,
    updatedAt: row.UpdatedAt,
    items,
    ...(row.DetailsJson ? JSON.parse(row.DetailsJson) : {}),
  };
}
export async function children(kind, id, ctx) {
  await parent(id, ctx, undefined, false);
  return kind === "items"
    ? repo.select(
        "SELECT ServiceItemId AS id,ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit,UnitPrice AS price,IsIncluded AS included,SortOrder AS sortOrder FROM dbo.ServiceItems WHERE ServiceId=:id ORDER BY SortOrder,ServiceItemId",
        { id },
      )
    : repo.select(
        "SELECT PackageId AS id,PackageName AS name,Description AS description,Price AS price,DiscountPercentage AS discount,FinalPrice AS finalPrice,IsActive AS active,UpdatedAt AS updatedAt,DetailsJson AS details FROM dbo.ServicePackages WHERE ServiceId=:id ORDER BY CreatedAt DESC,PackageId",
        { id },
      );
}
export async function itemMutation(id, itemId, input, ctx, del = false) {
  const body = z
    .object({
      expectedUpdatedAt: z.iso.datetime(),
      item: itemSchema.optional(),
      order: z.array(z.coerce.number().int().positive()).max(100).optional(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await parent(id, ctx, tx);
    assertVersion(row, body.expectedUpdatedAt);
    if (!actionsFor(row).edit)
      fail("Service cannot be edited during review or suspension.", 409);
    if (itemId) {
      const item = await owned("items", itemId, serviceScope(ctx).id, tx);
      if (item.ServiceId.toLowerCase() !== id.toLowerCase())
        fail("Item not found in this service.", 404);
    }
    if (del)
      await repo.select(
        "DELETE FROM dbo.ServiceItems WHERE ServiceItemId=:itemId AND ServiceId=:id",
        { itemId, id },
        tx,
      );
    else if (body.order) {
      const all = await repo.select(
        "SELECT ServiceItemId AS id FROM dbo.ServiceItems WHERE ServiceId=:id",
        { id },
        tx,
      );
      if (
        all.length !== body.order.length ||
        new Set(body.order).size !== all.length ||
        body.order.some((x) => !all.some((a) => Number(a.id) === x))
      )
        fail("Include every item exactly once.");
      for (const [sort, record] of body.order.entries())
        await repo.select(
          "UPDATE dbo.ServiceItems SET SortOrder=:sort WHERE ServiceItemId=:record AND ServiceId=:id",
          { sort, record, id },
          tx,
        );
    } else {
      if (!body.item) fail("Provide an item.");
      const i = body.item,
        values = {
          ItemName: i.name,
          Description: i.description,
          Quantity: i.quantity,
          Unit: i.unit,
          UnitPrice: i.price,
          IsIncluded: i.included ? 1 : 0,
        };
      if (itemId)
        await repo.update(
          { table: "ServiceItems", id: "ServiceItemId" },
          itemId,
          values,
          tx,
        );
      else {
        const [count] = await repo.select(
          "SELECT COUNT(*) AS total FROM dbo.ServiceItems WHERE ServiceId=:id",
          { id },
          tx,
        );
        if (count.total >= 100) fail("Limit of 100 items per service.");
        await repo.insert(
          { table: "ServiceItems", id: "ServiceItemId" },
          { ...values, ServiceId: id, SortOrder: count.total },
          tx,
        );
      }
    }
    await repo.update(
      { table: "Services", id: "ServiceId" },
      id,
      {
        UpdatedAt: new Date(),
        ...(row.ApprovalStatus === "Approved"
          ? { ApprovalStatus: "Draft", IsActive: 0 }
          : {}),
      },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_ITEMS_UPDATED",
      "Services",
      id,
      null,
      { itemId, deleted: del },
      tx,
    );
    return {
      message: "Items saved. Changes to approved services require approval.",
    };
  });
}
export async function packageMutation(
  serviceId,
  packageId,
  input,
  ctx,
  action = "save",
) {
  serviceScope(ctx);
  const envelope = z
    .object({ expectedUpdatedAt: z.iso.datetime().optional() })
    .passthrough()
    .parse(input);
  return repo.transaction(async (tx) => {
    const old = packageId
      ? await owned("packages", packageId, serviceScope(ctx).id, tx)
      : null;
    if (old) {
      serviceId = old.ServiceId;
      if (!envelope.expectedUpdatedAt)
        fail("Refresh before changing this package.", 409);
      assertVersion(old, envelope.expectedUpdatedAt);
    }
    const row = await parent(serviceId, ctx, tx);
    if (!actionsFor(row).edit)
      fail("Packages cannot be changed during review or suspension.", 409);
    if (action === "delete") {
      const [used] = await repo.select(
        "SELECT TOP(1) PackageId FROM dbo.BookingItems WHERE PackageId=:packageId UNION ALL SELECT PackageId FROM dbo.QuotationItems WHERE PackageId=:packageId UNION ALL SELECT PackageId FROM dbo.QuotationRequests WHERE PackageId=:packageId",
        { packageId },
        tx,
      );
      if (used)
        fail(
          "This package has booking or quotation history. Deactivate it instead.",
          409,
        );
      await repo.select(
        "DELETE FROM dbo.Wishlists WHERE PackageId=:packageId; DELETE FROM dbo.PackageItems WHERE PackageId=:packageId; DELETE FROM dbo.ServicePackages WHERE PackageId=:packageId",
        { packageId },
        tx,
      );
    } else if (action === "duplicate") {
      const next = randomUUID();
      await repo.select(
        "INSERT INTO dbo.ServicePackages(PackageId,ServiceId,PackageName,Description,Price,DiscountPercentage,MinimumGuests,MaximumGuests,DurationMinutes,IsFeatured,IsActive,DetailsJson) SELECT :next,ServiceId,LEFT(PackageName,190)+' (copy)',Description,Price,DiscountPercentage,MinimumGuests,MaximumGuests,DurationMinutes,IsFeatured,0,DetailsJson FROM dbo.ServicePackages WHERE PackageId=:packageId; INSERT INTO dbo.PackageItems(PackageId,ItemName,Description,Quantity,Unit,SortOrder) SELECT :next,ItemName,Description,Quantity,Unit,SortOrder FROM dbo.PackageItems WHERE PackageId=:packageId",
        { next, packageId },
        tx,
      );
      packageId = next;
    } else {
      const { terms = "", optionalItems = "", images = [], ...core } = input;
      const extra = z
        .object({
          terms: z.string().max(5000),
          optionalItems: z.string().max(5000),
          images: z.array(z.guid()).max(30),
        })
        .strict()
        .parse({ terms, optionalItems, images });
      const body = packageInput.parse({ ...core, serviceId });
      for (const image of images) {
        const [match] = await repo.select(
          "SELECT MediaId FROM dbo.Media WHERE EntityType='Service' AND EntityId=:serviceId AND MediaId=:image",
          { serviceId, image },
          tx,
        );
        if (!match) fail("Package images must belong to the service.");
      }
      const values = {
        ServiceId: serviceId,
        PackageName: body.name,
        Description: body.description,
        Price: body.price,
        DiscountPercentage: body.discount,
        MinimumGuests: body.minimumGuests ?? null,
        MaximumGuests: body.maximumGuests ?? null,
        DurationMinutes: body.duration ?? null,
        IsFeatured: body.featured ? 1 : 0,
        IsActive: body.active ? 1 : 0,
        DetailsJson: JSON.stringify(extra),
        UpdatedAt: new Date(),
      };
      packageId = old?.PackageId || randomUUID();
      if (old)
        await repo.update(
          { table: "ServicePackages", id: "PackageId" },
          packageId,
          values,
          tx,
        );
      else
        await repo.insert(
          { table: "ServicePackages", id: "PackageId" },
          { ...values, PackageId: packageId },
          tx,
        );
      await repo.select(
        "DELETE FROM dbo.PackageItems WHERE PackageId=:packageId",
        { packageId },
        tx,
      );
      for (const [sort, i] of body.items.entries())
        await repo.insert(
          { table: "PackageItems", id: "PackageItemId" },
          {
            PackageId: packageId,
            ItemName: i.name,
            Description: i.description,
            Quantity: i.quantity ?? 1,
            Unit: i.unit,
            SortOrder: sort,
          },
          tx,
        );
    }
    await repo.update(
      { table: "Services", id: "ServiceId" },
      serviceId,
      {
        UpdatedAt: new Date(),
        ...(row.ApprovalStatus === "Approved"
          ? { ApprovalStatus: "Draft", IsActive: 0 }
          : {}),
      },
      tx,
    );
    await audit(
      ctx,
      "SERVICE_PACKAGE_CHANGED",
      "ServicePackages",
      packageId,
      null,
      { action },
      tx,
    );
    return {
      id: packageId,
      message: "Package saved. Approved services require re-approval.",
    };
  });
}
