import { requireAuth } from "../../middleware/auth.middleware.js";
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export const same = (a, b) =>
  String(a).toLowerCase() === String(b).toLowerCase();
export const isAdmin = (user) =>
  user?.roles?.some((r) => r.code === "ADMIN" && r.active);
export const actor = (ctx) => requireAuth(ctx);
export const maxBytes = () =>
  Math.max(1, Math.min(10, Number(process.env.MEDIA_MAX_MB) || 5)) *
  1024 *
  1024;
export const maxCount = (type) =>
  type === "Review"
    ? 5
    : Math.max(
        1,
        Math.min(100, Number(process.env.MEDIA_MAX_PER_ENTITY) || 30),
      );
export const variants = {
  thumb: "c_limit,w_320,h_240,q_auto,f_webp",
  card: "c_limit,w_720,h_540,q_auto,f_webp",
  gallery: "c_limit,w_1600,h_1600,q_auto,f_webp",
};
export const purposesFor = {
  Vendor: ["Logo", "Cover", "Gallery", "Portfolio", "Office", "Team"],
  Service: ["Cover", "Gallery", "Portfolio"],
  Package: ["Cover", "Gallery", "Portfolio"],
  Review: ["Gallery"],
  Admin: ["Banner", "Category", "Promotion", "General"],
};
export const folderFor = (type, purpose) =>
  `wedding-marketplace/${{ Vendor: "vendors", Service: "services", Package: "packages", Review: "reviews", Admin: "admin" }[type]}/${purpose.toLowerCase()}`;
export const publicMedia = (alias = "m") =>
  `${alias}.ModerationStatus='Approved' AND ${alias}.UploadStatus='Ready' AND ${alias}.DeletedAt IS NULL`;
