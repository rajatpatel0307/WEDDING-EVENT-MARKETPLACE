import { State, Pagination } from "./ContentState";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  Send,
  X,
} from "lucide-react";
import {
  useContent,
  contentSave,
  button,
  primary,
  input,
  panel,
  labels,
  types,
  privacyTypes,
  date,
} from "./api";
import { AboutView, ContactView, LegalView } from "./InfoPages";
import "./content.css";
const titles = {
  "about-us": "About Us",
  contact: "Contact Us",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
};
function Dialog({ title, close, children }) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      className="cms-dialog cms-workspace"
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="mb-5 flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className={button}
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={16} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
  ...props
}) {
  return (
    <label className="block min-w-0 text-sm">
      {label}
      {area ? (
        <textarea
          className={`${input} mt-1`}
          rows={4}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      ) : (
        <input
          className={`${input} mt-1`}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  );
}
function Lines({ title, values, onChange }) {
  return (
    <fieldset className={`${panel} space-y-3`}>
      <legend className="font-semibold">{title}</legend>
      {values.map((value, index) => (
        <div className="flex gap-2" key={index}>
          <input
            className={input}
            value={value}
            aria-label={`${title} ${index + 1}`}
            onChange={(e) =>
              onChange(values.map((s, i) => (i === index ? e.target.value : s)))
            }
          />
          <button
            className={button}
            type="button"
            aria-label={`Remove ${title} ${index + 1}`}
            onClick={() => onChange(values.filter((_, i) => i !== index))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={button}
        onClick={() => onChange([...values, ""])}
      >
        <Plus size={14} />
        Add item
      </button>
    </fieldset>
  );
}
function Sections({ title, values, onChange, legal = false }) {
  const move = (index, by) => {
    const copy = [...values];
    [copy[index], copy[index + by]] = [copy[index + by], copy[index]];
    onChange(copy);
  };
  return (
    <section className={`${panel} space-y-4`}>
      <h2 className="font-semibold">{title}</h2>
      {values.map((section, index) => (
        <details
          key={section.id}
          className="rounded-lg border border-[#e3e3d9] p-4"
        >
          <summary className="cursor-pointer text-sm">
            {index + 1}. {section.title || "New section"}
          </summary>
          <div className="mt-4 grid gap-3">
            <Field
              label="Section heading"
              value={section.title}
              maxLength={200}
              onChange={(value) =>
                onChange(
                  values.map((s, i) =>
                    i === index ? { ...s, title: value } : s,
                  ),
                )
              }
            />
            <Field
              label={legal ? "Reviewed legal wording" : "Section text"}
              value={section.body}
              area
              maxLength={10000}
              onChange={(value) =>
                onChange(
                  values.map((s, i) =>
                    i === index ? { ...s, body: value } : s,
                  ),
                )
              }
            />
            <div className="flex gap-2">
              <button
                className={button}
                type="button"
                disabled={index === 0}
                aria-label="Move section up"
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className={button}
                type="button"
                disabled={index === values.length - 1}
                aria-label="Move section down"
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={14} />
              </button>
              {!legal && (
                <button
                  className={button}
                  type="button"
                  onClick={() => onChange(values.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>
          </div>
        </details>
      ))}
      {!legal && (
        <button
          className={button}
          type="button"
          onClick={() =>
            onChange([
              ...values,
              {
                id: `section-${crypto.randomUUID().slice(0, 12)}`,
                title: "New section",
                body: "",
              },
            ])
          }
        >
          <Plus size={14} />
          Add section
        </button>
      )}
    </section>
  );
}
function ContentEditor({ version, onSaved, onDirty }) {
  const [content, setContent] = useState(() =>
      structuredClone(version.content),
    ),
    [effectiveDate, setEffectiveDate] = useState(
      version.effectiveDate ? String(version.effectiveDate).slice(0, 10) : "",
    ),
    [required, setRequired] = useState(version.requiresAcceptance),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    media = useContent(
      "/admin/media?category=Admin&status=Approved&uploadStatus=Ready&pageSize=60",
    );
  const change = (field, value) => {
    setContent((c) => ({ ...c, [field]: value }));
    onDirty(true);
  };
  const contact = (key, value) => {
    setContent((c) => ({ ...c, contact: { ...c.contact, [key]: value } }));
    onDirty(true);
  };
  const legal = ["terms", "privacy"].includes(version.pageKey),
    about = version.pageKey === "about-us";
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await contentSave(`/admin/cms/pages/${version.id}`, "PUT", {
            expectedRevision: version.revision,
            content,
            requiresAcceptance: required,
            effectiveDate: effectiveDate || null,
          });
          onDirty(false);
          onSaved();
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className={`${panel} grid gap-4 sm:grid-cols-2`}>
        <Field
          label="Page heading"
          value={content.title}
          onChange={(v) => change("title", v)}
          maxLength={200}
          required
        />
        <Field
          label="SEO title"
          value={content.metaTitle}
          onChange={(v) => change("metaTitle", v)}
          maxLength={200}
          required
        />
        <Field
          label="Introduction"
          value={content.introduction}
          onChange={(v) => change("introduction", v)}
          area
          maxLength={2000}
        />
        <Field
          label="Search description"
          value={content.metaDescription}
          onChange={(v) => change("metaDescription", v)}
          area
          maxLength={320}
        />
      </section>
      {legal ? (
        <section className={panel}>
          <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            Complete every outline section with wording reviewed by a qualified
            legal professional. Drafts are private. This editor does not provide
            legal approval.
          </p>
          <Field
            label="Effective date"
            type="date"
            value={effectiveDate}
            onChange={(v) => {
              setEffectiveDate(v);
              onDirty(true);
            }}
          />
          <label className="mt-4 flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => {
                setRequired(e.target.checked);
                onDirty(true);
              }}
            />
            The approved policy requires explicit acceptance of this version
          </label>
        </section>
      ) : null}
      {(about || !legal) && (
        <section className={`${panel} grid gap-4 sm:grid-cols-2`}>
          <label className="text-sm">
            Page image
            <select
              className={`${input} mt-1`}
              value={content.heroMediaId || ""}
              onChange={(e) => change("heroMediaId", e.target.value || null)}
            >
              <option value="">Use existing page visual</option>
              {media.data?.rows.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.fileName}
                </option>
              ))}
            </select>
            <Link
              className="mt-2 inline-block text-xs underline"
              to="/admin/media"
            >
              Upload/manage platform images
            </Link>
          </label>
          <Field
            label="Image description"
            value={content.imageAlt}
            onChange={(v) => change("imageAlt", v)}
            maxLength={300}
          />
        </section>
      )}
      <Sections
        title={legal ? "Legal sections" : "Page sections"}
        values={content.sections}
        legal={legal}
        onChange={(v) => change("sections", v)}
      />
      {about && (
        <>
          <Sections
            title="Platform benefits"
            values={content.benefits}
            onChange={(v) => change("benefits", v)}
          />
          <Lines
            title="How it works"
            values={content.steps}
            onChange={(v) => change("steps", v)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Lines
              title="Customer benefits"
              values={content.customerBenefits}
              onChange={(v) => change("customerBenefits", v)}
            />
            <Lines
              title="Vendor benefits"
              values={content.vendorBenefits}
              onChange={(v) => change("vendorBenefits", v)}
            />
          </div>
          <section className={`${panel} space-y-4`}>
            <h2 className="font-semibold">Calls to action</h2>
            {content.ctas.map((cta, i) => (
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" key={i}>
                <Field
                  label="Button label"
                  value={cta.label}
                  onChange={(v) =>
                    change(
                      "ctas",
                      content.ctas.map((c, n) =>
                        n === i ? { ...c, label: v } : c,
                      ),
                    )
                  }
                />
                <Field
                  label="Marketplace link"
                  value={cta.href}
                  onChange={(v) =>
                    change(
                      "ctas",
                      content.ctas.map((c, n) =>
                        n === i ? { ...c, href: v } : c,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    change(
                      "ctas",
                      content.ctas.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={button}
              onClick={() =>
                change("ctas", [
                  ...content.ctas,
                  { label: "Explore services", href: "/services" },
                ])
              }
            >
              Add button
            </button>
          </section>
          <CategoryEditor
            values={content.categoryOverrides}
            onChange={(v) => change("categoryOverrides", v)}
            images={media.data?.rows || []}
          />
        </>
      )}
      {version.pageKey === "contact" && (
        <>
          <section className={`${panel} grid gap-4 sm:grid-cols-2`}>
            <h2 className="font-semibold sm:col-span-2">
              Published contact information
            </h2>
            {[
              ["companyName", "Platform/company name"],
              ["supportEmail", "Support email"],
              ["phone", "Contact number"],
              ["address", "Business address"],
              ["workingHours", "Working hours"],
              ["mapUrl", "Verified Google Maps link"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={content.contact[key]}
                onChange={(v) => contact(key, v)}
                type={key === "supportEmail" ? "email" : "text"}
              />
            ))}
            {[
              ["addressVerified", "I have verified this business address"],
              ["formEnabled", "Enable the contact form"],
              ["phoneRequired", "Require a phone number"],
              [
                "acknowledgementEnabled",
                "Queue acknowledgement emails when SMTP is configured",
              ],
            ].map(([key, label]) => (
              <label className="flex items-start gap-3 text-sm" key={key}>
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={content.contact[key]}
                  onChange={(e) => contact(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </section>
          <section className={`${panel} space-y-3`}>
            <h2 className="font-semibold">Social links</h2>
            {content.contact.socialLinks.map((s, i) => (
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" key={i}>
                <Field
                  label="Label"
                  value={s.label}
                  onChange={(v) =>
                    contact(
                      "socialLinks",
                      content.contact.socialLinks.map((s, n) =>
                        n === i ? { ...s, label: v } : s,
                      ),
                    )
                  }
                />
                <Field
                  label="HTTPS URL"
                  value={s.url}
                  onChange={(v) =>
                    contact(
                      "socialLinks",
                      content.contact.socialLinks.map((s, n) =>
                        n === i ? { ...s, url: v } : s,
                      ),
                    )
                  }
                />
                <button
                  className={button}
                  type="button"
                  onClick={() =>
                    contact(
                      "socialLinks",
                      content.contact.socialLinks.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={button}
              onClick={() =>
                contact("socialLinks", [
                  ...content.contact.socialLinks,
                  { label: "", url: "" },
                ])
              }
            >
              Add social link
            </button>
            <p className="text-xs text-[#78806e]">
              Attachments are disabled. Internal inquiry notes are never shown
              on this page.
            </p>
          </section>
          <Sections
            title="Frequently asked questions"
            values={content.faqs}
            onChange={(v) => change("faqs", v)}
          />
        </>
      )}
      {error && (
        <p
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <button className={primary} disabled={busy}>
        <Save size={16} />
        {busy ? "Saving…" : "Save private draft"}
      </button>
    </form>
  );
}
function CategoryEditor({ values, onChange, images }) {
  const catalogue = useContent("/cms/about-us");
  return (
    <section className={`${panel} space-y-4`}>
      <h2 className="font-semibold">Category descriptions and images</h2>
      <p className="text-sm text-[#78806e]">
        Category names come from the live catalogue. These overrides affect the
        About page only.
      </p>
      {catalogue.data?.categories.map((c) => {
        const value = values.find((v) => v.categoryId === c.id) || {
            categoryId: c.id,
            description: "",
            mediaId: null,
          },
          set = (patch) =>
            onChange([
              ...values.filter((v) => v.categoryId !== c.id),
              { ...value, ...patch },
            ]);
        return (
          <details
            key={c.id}
            className="rounded-lg border border-[#e3e3d9] p-4"
          >
            <summary>{c.name}</summary>
            <div className="mt-3 space-y-3">
              <Field
                label="Description override"
                value={value.description}
                area
                onChange={(v) => set({ description: v })}
              />
              <label className="text-sm">
                Category image
                <select
                  className={`${input} mt-1`}
                  value={value.mediaId || ""}
                  onChange={(e) => set({ mediaId: e.target.value || null })}
                >
                  <option value="">Use category icon</option>
                  {images.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.fileName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        );
      })}
    </section>
  );
}
export default function AdminContent() {
  const [version, setVersion] = useState(0),
    [pageKey, setPageKey] = useState("about-us"),
    [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(null),
    [publishing, setPublishing] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    pages = useContent("/admin/cms/pages", version);
  const versions = pages.data?.filter((v) => v.pageKey === pageKey) || [],
    id =
      selected ||
      versions.find((v) => v.status === "Draft")?.id ||
      versions[0]?.id,
    detail = useContent(id ? `/admin/cms/pages/${id}` : null, version),
    row = detail.data;
  const refresh = () => {
    setVersion((v) => v + 1);
    setDirty(false);
  };
  async function create(sourceId) {
    setBusy(true);
    try {
      const d = await contentSave("/admin/cms/pages", "POST", {
        pageKey,
        ...(sourceId ? { sourceId } : {}),
      });
      setSelected(d.id);
      refresh();
      setNotice("Private draft is ready.");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="cms-workspace space-y-5">
      <header>
        <p className="text-xs tracking-widest text-[#829179]">
          ADMIN / CONTENT MANAGEMENT
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          The words behind your marketplace
        </h1>
        <p className="mt-3 text-sm text-[#78806e]">
          Edit privately, preview, and publish a new version. Published
          documents are never overwritten.
        </p>
      </header>
      {notice && (
        <p className="rounded-lg bg-[#edf4e7] p-4 text-sm" role="status">
          {notice}
        </p>
      )}
      <nav className="flex flex-wrap gap-2" aria-label="Content pages">
        {Object.entries(titles).map(([key, label]) => (
          <button
            key={key}
            className={key === pageKey ? primary : button}
            onClick={() => {
              setPageKey(key);
              setSelected("");
              setDirty(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <State state={pages} />
      <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr]">
        <aside className={`${panel} space-y-4`}>
          <h2 className="font-semibold">Version history</h2>
          <button className={button} disabled={busy} onClick={() => create()}>
            <Plus size={14} />
            Open/create draft
          </button>
          {versions.map((v) => (
            <button
              className={`${button} w-full !justify-start text-left`}
              key={v.id}
              onClick={() => {
                setSelected(v.id);
                setDirty(false);
              }}
            >
              <span>
                Version {v.version}
                <small className="block text-[11px] text-[#78806e]">
                  {v.status} · {date(v.publishedAt || v.updatedAt)}
                </small>
              </span>
            </button>
          ))}
        </aside>
        <section className="space-y-5">
          <State state={detail} />
          {row && (
            <>
              <div
                className={`${panel} flex flex-wrap items-center justify-between gap-3`}
              >
                <div>
                  <h2 className="font-semibold">
                    {titles[row.pageKey]} · Version {row.version}
                  </h2>
                  <p className="text-xs text-[#78806e]">
                    {row.status} · Last updated {date(row.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={dirty}
                    onClick={() => setPreview(row)}
                  >
                    <Eye size={14} />
                    Preview saved version
                  </button>
                  {row.status === "Draft" ? (
                    <button
                      className={primary}
                      disabled={dirty || busy}
                      onClick={() => {
                        setReviewed(false);
                        setPublishing(true);
                      }}
                    >
                      Publish
                    </button>
                  ) : (
                    <button className={button} onClick={() => create(row.id)}>
                      Copy to a new draft
                    </button>
                  )}
                  {row.status === "Draft" && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await contentSave(
                            `/admin/cms/pages/${row.id}/archive`,
                            "POST",
                          );
                          setSelected("");
                          refresh();
                        } catch (err) {
                          setNotice(err.message);
                        }
                      }}
                    >
                      Archive draft
                    </button>
                  )}
                </div>
              </div>
              {dirty && (
                <p className="text-xs text-amber-800">
                  Save your changes before previewing or publishing.
                </p>
              )}
              {row.status === "Draft" ? (
                <ContentEditor
                  key={`${row.id}:${row.revision}`}
                  version={row}
                  onDirty={setDirty}
                  onSaved={() => {
                    setNotice("Draft saved.");
                    refresh();
                  }}
                />
              ) : (
                <div className={panel}>
                  <p className="mb-4 text-sm">
                    This version is immutable. Copy it into a draft to make
                    changes.
                  </p>
                  <h2 className="font-semibold">Publication history</h2>
                  {row.history.map((h, i) => (
                    <details
                      className="border-t border-[#e5e4db] py-3 text-sm"
                      key={i}
                    >
                      <summary>
                        {date(h.CreatedAt)} · {h.ActionType}
                      </summary>
                      <pre className="mt-2 text-xs">{h.NewValue}</pre>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {preview && (
        <Dialog
          title={`${titles[preview.pageKey]} — ${preview.status.toLowerCase()} preview`}
          close={() => setPreview(null)}
        >
          <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm">
            Preview only. Unpublished content is visible here to administrators.
          </p>
          {preview.pageKey === "about-us" ? (
            <PreviewAbout page={preview} />
          ) : preview.pageKey === "contact" ? (
            <ContactView page={{ ...preview, mapsEnabled: false }} preview />
          ) : (
            <LegalView page={preview} />
          )}
        </Dialog>
      )}
      {publishing && row && (
        <Dialog
          title={`Publish version ${row.version}?`}
          close={() => {
            if (!busy) setPublishing(false);
          }}
        >
          <p className="mb-5 text-sm">
            The current published version will be archived and preserved. Only
            this new version will be displayed publicly.
          </p>
          {["terms", "privacy"].includes(row.pageKey) && (
            <label className="mb-5 flex items-start gap-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I confirm that a qualified legal professional reviewed and
              approved this exact wording and effective date.
            </label>
          )}
          <button
            className={primary}
            disabled={
              busy || (["terms", "privacy"].includes(row.pageKey) && !reviewed)
            }
            onClick={async () => {
              setBusy(true);
              try {
                await contentSave(
                  `/admin/cms/pages/${row.id}/publish`,
                  "POST",
                  { expectedRevision: row.revision, legalReviewed: reviewed },
                );
                setPublishing(false);
                setNotice("Version published; previous versions preserved.");
                refresh();
              } catch (err) {
                setNotice(err.message);
                setPublishing(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Publishing…" : "Confirm publication"}
          </button>
        </Dialog>
      )}
    </main>
  );
}
function PreviewAbout({ page }) {
  const catalogue = useContent("/cms/about-us");
  return (
    <AboutView
      page={{ ...page, categories: catalogue.data?.categories || [] }}
    />
  );
}
export function ContactManagement() {
  const [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [filters, setFilters] = useState({
      q: "",
      status: "",
      category: "",
      from: "",
      to: "",
    }),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  const params = new URLSearchParams({ page: String(page) });
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const list = useContent(`/admin/contact-inquiries?${params}`, version);
  return (
    <main className="cms-workspace space-y-5">
      <header>
        <p className="text-xs tracking-widest text-[#829179]">
          ADMIN / CONTACT MANAGEMENT
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Every inquiry, followed through.
        </h1>
      </header>
      {notice && (
        <p role="status" className="rounded-lg bg-[#edf4e7] p-4 text-sm">
          {notice}
        </p>
      )}
      <section className={`${panel} grid gap-4 sm:grid-cols-2 lg:grid-cols-5`}>
        <Field
          label="Search name, email, reference or subject"
          value={filters.q}
          onChange={(q) => {
            setFilters((f) => ({ ...f, q }));
            setPage(1);
          }}
        />
        {[
          ["status", "Status", labels],
          ["category", "Inquiry type", types],
        ].map(([key, label, values]) => (
          <label className="text-sm" key={key}>
            {label}
            <select
              className={`${input} mt-1`}
              value={filters[key]}
              onChange={(e) => {
                setFilters((f) => ({ ...f, [key]: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">All</option>
              {Object.entries(values).map(([value, title]) => (
                <option value={value} key={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        ))}
        {["from", "to"].map((key) => (
          <Field
            key={key}
            type="date"
            label={key === "from" ? "From" : "Through"}
            value={filters[key]}
            onChange={(value) => {
              setFilters((f) => ({ ...f, [key]: value }));
              setPage(1);
            }}
          />
        ))}
      </section>
      <State state={list} />
      <div className={`${panel} overflow-auto`}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Reference / subject",
                "Customer",
                "Type / status",
                "Assigned",
                "Submitted",
                "",
              ].map((h, i) => (
                <th className="border-b border-[#e5e4db] p-3" key={i}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.data?.rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-[#e5e4db] p-3">
                  <strong>{r.subject}</strong>
                  <small className="block text-[10px]">{r.reference}</small>
                </td>
                <td className="border-b border-[#e5e4db] p-3">
                  {r.name}
                  <small className="block">{r.email}</small>
                </td>
                <td className="border-b border-[#e5e4db] p-3">
                  {types[r.category]}
                  <small className="block">{labels[r.status]}</small>
                </td>
                <td className="border-b border-[#e5e4db] p-3">
                  {r.assignee || "Unassigned"}
                </td>
                <td className="border-b border-[#e5e4db] p-3">
                  {date(r.createdAt)}
                </td>
                <td className="border-b border-[#e5e4db] p-3">
                  <button className={button} onClick={() => setSelected(r.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.data?.rows.length === 0 && (
          <p className="py-8 text-center text-sm">
            No inquiries match these filters.
          </p>
        )}
      </div>
      <Pagination data={list.data} page={page} setPage={setPage} />
      {selected && (
        <InquiryDetails
          id={selected}
          close={() => setSelected(null)}
          changed={() => setVersion((v) => v + 1)}
          notice={setNotice}
        />
      )}
    </main>
  );
}
function InquiryDetails({ id, close, changed, notice }) {
  const [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    detail = useContent(`/admin/contact-inquiries/${id}`, version),
    staff = useContent("/admin/contact-inquiries/staff"),
    row = detail.data,
    replyKey = useRef(crypto.randomUUID());
  async function act(action, body) {
    setBusy(true);
    setError("");
    try {
      const r = await contentSave(
        `/admin/contact-inquiries/${id}/${action}`,
        ["status", "assign"].includes(action) ? "PATCH" : "POST",
        body,
      );
      setVersion((v) => v + 1);
      changed();
      notice(r.message);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Inquiry details" close={close}>
      <State state={detail} />
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {row && (
        <div className="space-y-5">
          <div className={panel}>
            <h2 className="text-lg font-semibold">{row.Subject}</h2>
            <p className="mt-2 text-xs">
              {row.ReferenceNumber} · {types[row.Category]} ·{" "}
              {labels[row.Status]}
            </p>
            <p className="my-4 text-sm">
              {row.FullName} · {row.Email}
              {row.Phone ? ` · ${row.Phone}` : ""}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {row.Message}
            </p>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              act("status", Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            <label className="text-sm">
              Status
              <select
                className={`${input} mt-1`}
                name="status"
                defaultValue={row.Status}
              >
                {Object.entries(labels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Reason
              <input
                className={`${input} mt-1`}
                name="reason"
                maxLength={2000}
              />
            </label>
            <button className={`${button} self-end`} disabled={busy}>
              Update status
            </button>
          </form>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const assignedTo =
                new FormData(e.currentTarget).get("assignedTo") || null;
              act("assign", { assignedTo });
            }}
          >
            <label className="min-w-52 text-sm">
              Assign to support administrator
              <select
                className={`${input} mt-1`}
                name="assignedTo"
                defaultValue={row.AssignedTo || ""}
              >
                <option value="">Unassigned</option>
                {staff.data?.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className={button} disabled={busy}>
              Save assignment
            </button>
          </form>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                note = new FormData(form).get("note");
              if (await act("notes", { note })) form.reset();
            }}
          >
            <FieldArea
              label="Internal note — administrators only"
              name="note"
              required
              minLength={2}
              maxLength={5000}
            />
            <button className={button} disabled={busy}>
              Add internal note
            </button>
          </form>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                body = new FormData(form).get("body");
              if (await act("reply", { body, requestKey: replyKey.current })) {
                replyKey.current = crypto.randomUUID();
                form.reset();
              }
            }}
          >
            <FieldArea
              label={`Email reply to ${row.Email}`}
              name="body"
              required
              minLength={5}
              maxLength={10000}
            />
            <p className="text-xs text-[#78806e]">
              Replies use configured SMTP. Delivery status is recorded below;
              internal notes are not sent.
            </p>
            <button className={primary} disabled={busy}>
              <Send size={14} />
              Queue email reply
            </button>
          </form>
          <h2 className="text-lg font-semibold">Inquiry history</h2>
          {row.events.map((e) => (
            <article
              className="rounded-lg border border-[#e5e4db] p-4"
              key={e.EventId}
            >
              <strong className="text-sm">
                {e.EventType}
                {e.NewStatus ? ` · ${labels[e.NewStatus]}` : ""}
                {e.DeliveryStatus ? ` · ${e.DeliveryStatus}` : ""}
              </strong>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {e.Body}
              </p>
              {e.ErrorMessage && (
                <p className="mt-2 text-xs text-amber-800">{e.ErrorMessage}</p>
              )}
              <p className="mt-2 text-xs text-[#78806e]">
                {date(e.CreatedAt)} · {e.administrator || "System"}
              </p>
            </article>
          ))}
        </div>
      )}
    </Dialog>
  );
}
function FieldArea({ label, ...props }) {
  return (
    <label className="block text-sm">
      {label}
      <textarea className={`${input} mt-1`} rows={4} {...props} />
    </label>
  );
}
export function PrivacyManagement() {
  const [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [row, setRow] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    state = useContent(`/admin/privacy-requests?page=${page}`, version),
    staff = useContent("/admin/contact-inquiries/staff");
  return (
    <main className="cms-workspace space-y-5">
      <header>
        <p className="text-xs tracking-widest text-[#829179]">
          ADMIN / PRIVACY REQUESTS
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Handle information requests with care.
        </h1>
        <p className="mt-3 text-sm text-[#78806e]">
          Review each request and applicable retention requirements. Updating a
          request does not automatically delete customer, booking or financial
          records.
        </p>
      </header>
      {notice && (
        <p role="status" className="rounded-lg bg-[#edf4e7] p-4 text-sm">
          {notice}
        </p>
      )}
      <State state={state} />
      {state.data?.rows.map((r) => (
        <article
          className={`${panel} flex flex-wrap justify-between gap-4`}
          key={r.id}
        >
          <div>
            <h2 className="font-semibold">{privacyTypes[r.type]}</h2>
            <p className="my-2 text-xs">
              {r.email} · {labels[r.status]} · {date(r.createdAt)}
            </p>
            <p className="whitespace-pre-wrap text-sm">{r.description}</p>
            {r.response && (
              <p className="mt-3 whitespace-pre-wrap text-sm">
                Response: {r.response}
              </p>
            )}
          </div>
          <button className={`${button} self-start`} onClick={() => setRow(r)}>
            Review request
          </button>
        </article>
      ))}
      {state.data?.rows.length === 0 && (
        <p className={panel}>No privacy requests have been submitted.</p>
      )}
      <Pagination data={state.data} page={page} setPage={setPage} />
      {row && (
        <Dialog title="Review privacy request" close={() => setRow(null)}>
          <p className="mb-4 whitespace-pre-wrap text-sm">{row.description}</p>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                const r = await contentSave(
                  `/admin/privacy-requests/${row.id}/status`,
                  "PATCH",
                  {
                    status: f.get("status"),
                    response: f.get("response"),
                    assignedTo: f.get("assignedTo") || null,
                  },
                );
                setNotice(r.message);
                setRow(null);
                setVersion((v) => v + 1);
              } catch (err) {
                setNotice(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-sm">
              Status
              <select
                className={`${input} mt-1`}
                name="status"
                defaultValue={row.status}
              >
                {Object.entries(labels)
                  .filter(([k]) => k !== "Spam")
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Assigned administrator
              <select
                className={`${input} mt-1`}
                name="assignedTo"
                defaultValue={row.assignedTo || ""}
              >
                <option value="">Unassigned</option>
                {staff.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <FieldArea
              label="Response visible to the requesting customer"
              name="response"
              defaultValue={row.response || ""}
              maxLength={5000}
            />
            <button className={primary} disabled={busy}>
              {busy ? "Saving…" : "Save review response"}
            </button>
          </form>
        </Dialog>
      )}
    </main>
  );
}
