// Explicit live test: a synthetic image only, in a unique managed folder; always cleaned up.
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sequelize } from "../src/config/database.js";
import {
  prepareImage,
  storeImage,
  retrieveImage,
  destroyImage,
} from "../src/modules/media/media.storage.js";
import * as db from "../src/modules/media/media.repository.js";
if (!process.argv.includes("--live")) {
  console.log(
    "Pass --live to test a disposable image against the configured Cloudinary account.",
  );
  await sequelize.close();
} else {
  const id = randomUUID(),
    publicId = `wedding-marketplace/admin/general/${id}`;
  const row = {
    PublicId: publicId,
    ResourceType: "image",
    DeliveryType: "authenticated",
  };
  let attempted = false;
  try {
    if (
      ![
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ].every((key) => process.env[key])
    )
      throw new Error("Cloudinary is not configured.");
    const source = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#52744c" },
    })
      .png()
      .toBuffer();
    const file = await prepareImage(
      source.toString("base64"),
      "synthetic-verification.png",
      "image/png",
    );
    attempted = true;
    const asset = await storeImage(file, publicId);
    row.VariantsJson = JSON.stringify(asset.eager);
    const unsigned = await fetch(
      `https://res.cloudinary.com/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/authenticated/${publicId}.webp`,
      { signal: AbortSignal.timeout(30000) },
    );
    if (unsigned.ok)
      throw new Error("Unsigned private image unexpectedly accessible.");
    for (const variant of ["thumb", "card", "gallery", "original"]) {
      const delivered = await retrieveImage(row, variant),
        meta = await sharp(delivered.bytes).metadata();
      if (meta.format !== "webp" || !meta.width || !meta.height)
        throw new Error("Invalid delivered image.");
      console.log(
        `${variant} authenticated delivery passed (${meta.width} x ${meta.height}).`,
      );
    }
    console.log(
      "Live Cloudinary upload, unsigned-access denial, and all delivery variants passed.",
    );
  } catch (error) {
    console.error("Live Cloudinary verification failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (attempted)
      try {
        await destroyImage(row);
        console.log("Disposable verification asset removed.");
      } catch {
        process.exitCode = 1;
        try {
          const [admin] = await db.select(
            "SELECT TOP(1) u.UserId FROM dbo.Users u WHERE EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1) ORDER BY u.UserId",
          );
          if (!admin) throw new Error("No admin identity available.");
          await db.insert(
            { table: "Media", id: "MediaId" },
            {
              MediaId: id,
              EntityType: "Admin",
              EntityId: admin.UserId,
              MediaType: "Image",
              MediaCategory: "Admin",
              Purpose: "General",
              MediaUrl: "",
              PublicId: publicId,
              StorageKey: `cloudinary:image:authenticated:${publicId}`,
              ResourceType: "image",
              DeliveryType: "authenticated",
              OwnerId: admin.UserId,
              UploadedBy: admin.UserId,
              FileName: "Disposable storage verification",
              UploadStatus: "Failed",
              ModerationStatus: "Hidden",
              DeletedAt: new Date(),
              CleanupStatus: "Failed",
              NextCleanupAt: new Date(),
              ErrorMessage:
                "Disposable live verification asset cleanup needs retry.",
            },
          );
          console.error(
            "Verification cleanup failed; a private cleanup record was queued.",
          );
        } catch {
          console.error(
            `Verification cleanup needs operator attention for managed asset ${publicId}.`,
          );
        }
      }
    await sequelize.close();
  }
}
