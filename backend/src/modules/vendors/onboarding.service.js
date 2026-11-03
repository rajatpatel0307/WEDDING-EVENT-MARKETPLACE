import { z } from "zod";
import { requireRole } from "../../middleware/auth.middleware.js";
import { business } from "../auth/auth.validation.js";
import { repo, fail, audit, assertVersion } from "./workspace.common.js";
import { uploadAsset } from "../media/cloudinary.service.js";
import { downloadDocument } from "./documents.service.js";

const text = (max) => z.string().trim().max(max).default("");
export const draftInput = z
  .object({
    businessName: text(200),
    businessDescription: text(5000),
    businessEmail: text(320),
    businessPhone: text(20),
    gst: text(50),
    pan: text(20),
    categories: z.array(z.string().trim().min(1).max(150)).max(100).default([]),
    location: z
      .object({
        address: text(300),
        city: text(100),
        state: text(100),
        country: text(100),
        postalCode: text(20),
        latitude: z.number().min(-90).max(90).nullable().default(null),
        longitude: z.number().min(-180).max(180).nullable().default(null),
      })
      .strict(),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();

const scope = (ctx) => {
  const user = requireRole(ctx, "VENDOR");
  if (!user.vendor?.id) fail("Vendor profile required.", 403);
  return { user, id: user.vendor.id };
};
export const canEdit = (row) =>
  row.VerificationStatus === "Rejected" ||
  (row.VerificationStatus === "Pending" && row.ProfileDraftJson != null);
async function vendor(id, tx, lock = false) {
  const [row] = await repo.select(
    `SELECT * FROM dbo.Vendors ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE VendorId=:id`,
    { id },
    tx,
  );
  if (!row) fail("Vendor profile not found.", 404);
  return row;
}
const editable = (row) => {
  if (!canEdit(row))
    fail(
      "This profile cannot be changed during review, approval or suspension.",
      409,
    );
};
const documents = (id, tx) =>
  repo.select(
    "SELECT VendorDocumentId AS id,DocumentType AS type,DocumentNumber AS number,VerificationStatus AS status,RejectionReason AS reason FROM dbo.VendorDocuments WHERE VendorId=:id ORDER BY CreatedAt,VendorDocumentId",
    { id },
    tx,
  );
export async function profile(ctx) {
  const { id } = scope(ctx),
    row = await vendor(id);
  const categories = await repo.select(
    "SELECT CategoryName AS name FROM dbo.Categories WHERE IsActive=1 ORDER BY CategoryName",
  );
  const selected = await repo.select(
    "SELECT c.CategoryName AS name FROM dbo.VendorCategories vc JOIN dbo.Categories c ON c.CategoryId=vc.CategoryId WHERE vc.VendorId=:id ORDER BY vc.IsPrimary DESC,c.CategoryId",
    { id },
  );
  const [location] = await repo.select(
    "SELECT TOP(1) AddressLine1 AS address,City AS city,State AS state,Country AS country,PostalCode AS postalCode,Latitude AS latitude,Longitude AS longitude FROM dbo.VendorLocations WHERE VendorId=:id ORDER BY IsPrimary DESC,CreatedAt",
    { id },
  );
  return {
    cycle: row.VerificationCycle,
    verifiedAt: row.VerifiedAt,
    history: await repo.select(
      "SELECT HistoryId AS id,CycleNumber AS cycle,ToStatus AS status,Reason AS reason,CreatedAt AS createdAt FROM dbo.VendorVerificationHistory WHERE VendorId=:id ORDER BY CreatedAt DESC,HistoryId DESC",
      { id },
    ),
    status: row.VerificationStatus,
    reason: row.VerificationRemarks,
    incomplete: row.ProfileDraftJson != null,
    editable: canEdit(row),
    updatedAt: row.UpdatedAt,
    categories: categories.map((c) => c.name),
    documents: await documents(id),
    fields:
      row.ProfileDraftJson != null
        ? JSON.parse(row.ProfileDraftJson)
        : {
            businessName: row.BusinessName || "",
            businessDescription: row.BusinessDescription || "",
            businessEmail: row.ContactEmail || "",
            businessPhone: row.ContactPhone || "",
            gst: row.GSTNumber || "",
            pan: row.PANNumber || "",
            categories: selected.map((c) => c.name),
            location: location
              ? {
                  ...location,
                  latitude:
                    location.latitude == null
                      ? null
                      : Number(location.latitude),
                  longitude:
                    location.longitude == null
                      ? null
                      : Number(location.longitude),
                }
              : {},
          },
  };
}
export function validateSubmission(fields, docs) {
  const body = business.omit({ documents: true }).parse(fields);
  if (docs.some((d) => d.status === "Rejected"))
    fail("Replace or remove rejected documents before submitting.");
  const missing = ["PAN", "Identity Proof", "Address Proof"].filter(
    (type) =>
      !docs.some((doc) => doc.type === type && doc.status !== "Rejected"),
  );
  if (missing.length)
    fail(`Upload required verification documents: ${missing.join(", ")}.`);
  return body;
}
export async function saveProfile(input, ctx, submit = false) {
  const { id } = scope(ctx),
    parsed = draftInput.parse(input);
  return repo.transaction(async (tx) => {
    const row = await vendor(id, tx, true);
    editable(row);
    assertVersion(row, parsed.expectedUpdatedAt);
    const { expectedUpdatedAt, ...fields } = parsed;
    if (!submit) {
      await repo.update(
        { table: "Vendors", id: "VendorId" },
        id,
        { ProfileDraftJson: JSON.stringify(fields), UpdatedAt: new Date() },
        tx,
      );
      return { message: "Profile progress saved. You can continue later." };
    }
    const body = validateSubmission(fields, await documents(id, tx));
    const names = [...new Set(body.categories)];
    const selected = await repo.select(
      "SELECT CategoryId AS id FROM dbo.Categories WHERE IsActive=1 AND CategoryName IN (:names)",
      { names },
      tx,
    );
    if (selected.length !== names.length)
      fail("A selected service category is unavailable.");
    await repo.update(
      { table: "Vendors", id: "VendorId" },
      id,
      {
        BusinessName: body.businessName,
        BusinessDescription: body.businessDescription,
        ContactEmail: body.businessEmail,
        ContactPhone: body.businessPhone,
        GSTNumber: fields.gst || null,
        PANNumber: fields.pan || null,
        ProfileDraftJson: null,
        VerificationStatus: "Pending",
        IsActive: 0,
        VerificationRemarks: null,
        VerifiedAt: null,
        VerifiedBy: null,
        VerificationCycle:
          Number(row.VerificationCycle || 1) +
          (row.VerificationStatus === "Rejected" ? 1 : 0),
        UpdatedAt: new Date(),
      },
      tx,
    );
    await repo.select(
      "DELETE FROM dbo.VendorCategories WHERE VendorId=:id",
      { id },
      tx,
    );
    for (const [i, category] of selected.entries())
      await repo.insert(
        { table: "VendorCategories", id: "VendorCategoryId" },
        { VendorId: id, CategoryId: category.id, IsPrimary: i === 0 ? 1 : 0 },
        tx,
      );
    const [location] = await repo.select(
      "SELECT TOP(1) VendorLocationId AS id FROM dbo.VendorLocations WHERE VendorId=:id ORDER BY IsPrimary DESC,CreatedAt",
      { id },
      tx,
    );
    const values = {
      VendorId: id,
      AddressLine1: body.location.address,
      City: body.location.city,
      State: body.location.state,
      Country: body.location.country,
      PostalCode: body.location.postalCode,
      Latitude: body.location.latitude,
      Longitude: body.location.longitude,
      UpdatedAt: new Date(),
    };
    if (location)
      await repo.update(
        { table: "VendorLocations", id: "VendorLocationId" },
        location.id,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "VendorLocations", id: "VendorLocationId" },
        { ...values, IsPrimary: 1, IsActive: 1 },
        tx,
      );
    await audit(
      ctx,
      "PROFILE_SUBMITTED",
      "Vendors",
      id,
      { status: row.VerificationStatus },
      { status: "Pending" },
      tx,
    );
    return {
      message:
        "Profile submitted successfully. Pending Approval — awaiting admin verification.",
    };
  });
}
export async function upload(input, ctx) {
  const { id } = scope(ctx);
  const body = z
    .object({
      type: business.shape.documents.element.shape.type,
      number: text(100),
      base64: z
        .string()
        .min(1)
        .max(7 * 1024 * 1024),
    })
    .strict()
    .parse(input);
  editable(await vendor(id));
  if ((await documents(id)).length >= 6) fail("Upload up to six documents.");
  const asset = await uploadAsset(body.base64);
  return repo.transaction(async (tx) => {
    editable(await vendor(id, tx, true));
    if ((await documents(id, tx)).length >= 6)
      fail("Upload up to six documents.");
    await repo.insert(
      { table: "VendorDocuments", id: "VendorDocumentId" },
      {
        VendorId: id,
        DocumentType: body.type,
        DocumentNumber: body.number || null,
        DocumentUrl: asset.key,
        VerificationStatus: "Pending",
      },
      tx,
    );
    await audit(
      ctx,
      "DOCUMENT_UPLOADED",
      "Vendors",
      id,
      null,
      { type: body.type },
      tx,
    );
    return { message: "Document saved securely." };
  });
}
export async function document(id, ctx, remove = false) {
  z.guid().parse(id);
  const { id: vendorId } = scope(ctx);
  return repo.transaction(async (tx) => {
    const row = await vendor(vendorId, tx, remove);
    const [doc] = await repo.select(
      "SELECT * FROM dbo.VendorDocuments WHERE VendorDocumentId=:id AND VendorId=:vendorId",
      { id, vendorId },
      tx,
    );
    if (!doc) fail("Document not found.", 404);
    if (remove) {
      editable(row);
      await repo.select(
        "DELETE FROM dbo.VendorDocuments WHERE VendorDocumentId=:id AND VendorId=:vendorId",
        { id, vendorId },
        tx,
      );
      await audit(
        ctx,
        "DOCUMENT_REMOVED",
        "VendorDocuments",
        id,
        { type: doc.DocumentType },
        null,
        tx,
      );
      return { message: "Document removed. You can upload a replacement." };
    }
    await audit(ctx, "DOCUMENT_VIEWED", "VendorDocuments", id, null, null, tx);
    return downloadDocument({ key: doc.DocumentUrl });
  });
}
