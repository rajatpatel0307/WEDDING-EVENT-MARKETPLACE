import { listQuery } from "./admin.validation.js";
import { getResource } from "./admin.resources.js";
import * as repo from "./admin.repository.js";
import * as service from "./admin.service.js";
import { dashboard } from "./admin.analytics.js";
import { VendorDocument } from "../../models/index.js";
import { downloadDocument } from "../vendors/documents.service.js";
export const overview = async (req, res) =>
  res.json(await dashboard(req.query));
export const list = async (req, res) =>
  res.json(await repo.list(req.params.resource, listQuery.parse(req.query)));
export const review = async (req, res) =>
  res.json(await service.reviewVendor(req.params.id, req.body, req.admin));
export const action = async (req, res) =>
  res.json(
    await service.action(
      req.params.resource,
      req.params.id,
      req.body,
      req.admin,
    ),
  );
export const create = async (req, res) =>
  res
    .status(201)
    .json(await service.save(req.params.resource, null, req.body, req.admin));
export const update = async (req, res) =>
  res.json(
    await service.save(req.params.resource, req.params.id, req.body, req.admin),
  );
export const getSettings = async (req, res) =>
  res.json(await service.settings());
export const putSettings = async (req, res) =>
  res.json(await service.saveSettings(req.body, req.admin));
export const document = async (req, res) => {
  service.validId(getResource("documents"), req.params.id);
  const doc = await VendorDocument.findByPk(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found." });
  const file = await downloadDocument(doc);
  await repo.auditAdmin(
    req.admin,
    "ADMIN_DOCUMENT_VIEWED",
    "VendorDocuments",
    doc.id,
    null,
    null,
  );
  res.set({
    "Content-Type": file.mimeType,
    "Content-Disposition": `attachment; filename="${file.name}"`,
  });
  res.send(Buffer.from(file.base64, "base64"));
};
export const exportRows = async (req, res) => {
  const query = listQuery.parse({ ...req.query, pageSize: 100, page: 1 });
  const first = await repo.list(req.params.resource, query);
  if (first.total > 10000)
    return res.status(422).json({
      message: "Narrow your filters to export at most 10,000 records.",
    });
  const rows = [...first.rows];
  for (let page = 2; rows.length < first.total; page++) {
    const result = await repo.list(req.params.resource, { ...query, page });
    if (!result.rows.length) break;
    rows.push(...result.rows);
  }
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^(\s*[=+@\-]|[\t\r])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const csv = [
    first.columns,
    ...rows.map((row) => first.columns.map((k) => row[k])),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  await repo.auditAdmin(
    req.admin,
    "ADMIN_DATA_EXPORTED",
    getResource(req.params.resource).table,
    "export",
    null,
    { count: rows.length, filters: query },
  );
  res
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${req.params.resource}.csv"`,
    })
    .send("\ufeff" + csv);
};
