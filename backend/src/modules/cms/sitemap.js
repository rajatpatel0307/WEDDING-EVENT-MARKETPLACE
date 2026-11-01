import * as db from "../admin/admin.repository.js";
const paths = {
  "about-us": "/about",
  contact: "/contact",
  terms: "/terms-and-conditions",
  privacy: "/privacy-policy",
};
const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export async function sitemap(req, res, next) {
  try {
    const base = new URL(
      process.env.PUBLIC_SITE_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:5173",
    );
    if (!["http:", "https:"].includes(base.protocol))
      throw new Error("Invalid public origin");
    const rows = await db.select(
      "SELECT PageKey,PublishedAt FROM dbo.CMSPageVersions WHERE Status='Published'",
    );
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=60")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map((r) => `<url><loc>${xml(new URL(paths[r.PageKey], base.origin).href)}</loc><lastmod>${new Date(r.PublishedAt).toISOString()}</lastmod></url>`).join("")}</urlset>`,
      );
  } catch (e) {
    next(e);
  }
}
