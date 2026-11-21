import { State, Pagination } from "./ContentState";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  Send,
  X,
  Archive,
  ChevronDown,
  FileText,
  History,
  Info,
  LayoutTemplate,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  SlidersHorizontal,
  StickyNote,
  UserRound,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Phone,
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

const titles = {
  "about-us": "About Us",
  contact: "Contact Us",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
};
const pageIcons = { "about-us": LayoutTemplate, contact: Mail, terms: Scale, privacy: ShieldCheck };
// Higher specificity keeps editor controls consistent inside the admin shell.
const editorInput = "[&&]:block [&&]:w-full [&&]:min-w-0 [&&]:min-h-11 [&&]:rounded-lg [&&]:border [&&]:border-[#dbe5df] [&&]:bg-[#fbfcfb] [&&]:px-3.5 [&&]:py-3 [&&]:m-0 [&&]:text-[13px] [&&]:font-normal [&&]:leading-relaxed [&&]:text-[#344e45] [&&]:shadow-none [&&]:transition-colors hover:[&&]:border-[#a3bcb0] focus:[&&]:border-[#368777] focus:[&&]:bg-white focus:[&&]:outline-2 focus:[&&]:outline-offset-2 focus:[&&]:outline-[#368777]/25 placeholder:[&&]:text-[#94a39a]";
const editorPanel = "min-w-0 rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_2px_8px_-6px_#234c3825] sm:p-6";
const editorButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#52665b] transition-colors hover:border-[#a7c4b6] hover:bg-[#f2f7f4] hover:text-[#176b60] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#368777]";
const editorPrimary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:border-[#10594f] hover:bg-[#10594f] hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#368777]";
const sectionHeading = "[&&]:font-sans [&&]:text-[14px] [&&]:font-semibold [&&]:tracking-[-0.15px] [&&]:text-[#2d493f]";

function VersionStatus({ status }) {
  const tones = { Draft: "border-[#eadbb6] bg-[#fcf7e9] text-[#9a7527]", Published: "border-[#cce4d8] bg-[#edf7f1] text-[#26775a]", Archived: "border-[#e1e5e3] bg-[#f2f4f3] text-[#7d8881]" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[status] || tones.Archived}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{status}
    </span>
  );
}

function EditorSectionTitle({ title, description, Icon = FileText }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-[#edf1ed] pb-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e1eae3] bg-[#f4f8f5] text-[#4f8371]"><Icon size={17} strokeWidth={1.6} aria-hidden="true" /></span>
      <div className="min-w-0"><h2 className={sectionHeading}>{title}</h2>{description && <p className="[&&]:mt-1 [&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#839187]">{description}</p>}</div>
    </div>
  );
}
function Dialog({ title, close, children, compact = false }) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      className={`cms-dialog cms-workspace [&&]:fixed [&&]:inset-0 ${compact ? "[&&]:w-[min(560px,calc(100%_-_32px))]" : "[&&]:w-[min(1100px,calc(100%_-_32px))]"} [&&]:max-h-[90dvh] [&&]:m-auto [&&]:overflow-auto [&&]:border [&&]:border-[#d9e5dc] [&&]:rounded-2xl [&&]:p-5 sm:[&&]:p-7 [&&]:bg-white [&&]:text-[#3b503d] [&&]:z-[2200] [&&::backdrop]:bg-[#193b2dd0] [&&::backdrop]:backdrop-blur-sm min-w-0 font-sans leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere`}
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-[#e7eee7] pb-5">
        <h2 id={id} className="[&&]:font-sans [&&]:text-[17px] [&&]:font-semibold [&&]:text-[#365d47]">
          {title}
        </h2>
        <button
          type="button"
          className={`${editorButton} !px-2.5`}
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
    <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">
      <span>{label}{props.required && <span className="ml-1 text-[#a27747]" aria-hidden="true">*</span>}</span>
      {area ? (
        <textarea
          className={`${editorInput} [&&]:min-h-28 [&&]:resize-y`}
          rows={4}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      ) : (
        <input
          className={editorInput}
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
    <section className={`${editorPanel} space-y-3`} aria-label={title}>
      <EditorSectionTitle title={title} description="Add a clear, concise description for each item." Icon={LayoutTemplate} />
      {values.map((value, index) => (
        <div className="flex items-center gap-2.5" key={index}>
          <span className="w-5 shrink-0 text-center font-mono text-[10px] text-[#99a69b]">{String(index + 1).padStart(2, "0")}</span>
          <input
            className={editorInput}
            value={value}
            aria-label={`${title} ${index + 1}`}
            onChange={(e) =>
              onChange(values.map((s, i) => (i === index ? e.target.value : s)))
            }
          />
          <button
            className={`${editorButton} shrink-0 !px-3 hover:!border-[#e4bdb7] hover:!bg-[#fff4f1] hover:!text-[#ae6153]`}
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
        className={`${editorButton} !border-dashed`}
        onClick={() => onChange([...values, ""])}
      >
        <Plus size={14} />
        Add item
      </button>
    </section>
  );
}
function Sections({ title, values, onChange, legal = false }) {
  const move = (index, by) => {
    const copy = [...values];
    [copy[index], copy[index + by]] = [copy[index + by], copy[index]];
    onChange(copy);
  };
  return (
    <section className={`${editorPanel} space-y-3`}>
      <EditorSectionTitle title={title} description={legal ? "Review and edit each part of this document. Published versions are preserved." : "Expand a section to edit its heading and content."} />
      {values.length === 0 && <p className="rounded-xl border border-dashed border-[#dfe7e1] bg-[#fafcf9] px-4 py-6 text-center [&&]:text-[12px] [&&]:text-[#839187]">No sections yet. Add a section to start writing.</p>}
      {values.map((section, index) => (
        <details
          key={section.id}
          className="group overflow-hidden rounded-xl border border-[#e0e8e2] bg-[#fbfcfb] open:border-[#accbb9] open:bg-white"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e2e9e1] bg-white font-mono text-[10px] text-[#8d9b8f]">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 wrap-anywhere text-[12px] font-medium text-[#466253]">{section.title || "New section"}</span>
            <span className={`hidden rounded-full px-2 py-0.5 text-[9px] sm:inline-flex ${section.body?.trim() ? "bg-[#edf5ee] text-[#6a8b6c]" : "bg-[#faf2df] text-[#a38b55]"}`}>{section.body?.trim() ? "Has content" : "Needs content"}</span>
            <ChevronDown size={15} className="text-[#8ba393] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mx-4 grid gap-4 border-t border-[#e7eee7] pt-4 pb-5">
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
                className={editorButton}
                type="button"
                disabled={index === 0}
                aria-label="Move section up"
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className={editorButton}
                type="button"
                disabled={index === values.length - 1}
                aria-label="Move section down"
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={14} />
              </button>
              {!legal && (
                <button
                  className={`${editorButton} ml-auto hover:!border-[#e4bdb7] hover:!text-[#ae6153]`}
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
          className={`${editorButton} !border-dashed`}
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
function ContentEditor({ version, onSaved, onDirty, dirty }) {
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
      "/admin/media?category=Admin&uploadStatus=Ready&pageSize=60",
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
      <section className={editorPanel}>
        <EditorSectionTitle title="Page details" description="Set the page heading, introduction, and how this page appears in search." Icon={LayoutTemplate} />
        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>
      </section>
      {legal ? (
        <section className={editorPanel}>
          <EditorSectionTitle title="Policy settings" description="Set the effective date and acceptance requirements for this version." Icon={ShieldCheck} />
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#eee2bc] bg-[#fcf8e9] p-4">
          <Info size={17} className="mt-0.5 shrink-0 text-[#a88c40]" aria-hidden="true" />
          <p className="[&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#93804c]">
            Complete every outline section with wording reviewed by a qualified
            legal professional. Drafts are private. This editor does not provide
            legal approval.
          </p>
          </div>
          <div className="max-w-sm">
          <Field
            label="Effective date"
            type="date"
            value={effectiveDate}
            onChange={(v) => {
              setEffectiveDate(v);
              onDirty(true);
            }}
          />
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-lg border border-[#e4ebe4] bg-[#f8faf7] p-4 text-[12px] leading-relaxed text-[#607464]">
            <input
              className="[&&]:mt-0.5 [&&]:size-4 [&&]:shrink-0 [&&]:p-0 accent-[#176b60]"
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
        <section className={`${editorPanel} grid gap-4 sm:grid-cols-2`}>
          <div className="sm:col-span-2"><EditorSectionTitle title="Page visual" description="Choose an uploaded image and add an accessible description." Icon={LayoutTemplate} /></div>
          <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">
            Page image
            <select
              className={editorInput}
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
              className="mt-1 inline-block text-[11px] text-[#438574] underline underline-offset-2"
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
          <section className={`${editorPanel} space-y-4`}>
            <EditorSectionTitle title="Calls to action" description="Choose the buttons and links visitors see on this page." Icon={LayoutTemplate} />
            {content.ctas.map((cta, i) => (
              <div className="grid items-end gap-3 rounded-xl border border-[#e6ece6] bg-[#fbfcfa] p-4 sm:grid-cols-[1fr_1fr_auto]" key={i}>
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
                  className={editorButton}
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
              className={editorButton}
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
          <section className={`${editorPanel} grid gap-4 sm:grid-cols-2`}>
            <div className="sm:col-span-2"><EditorSectionTitle title="Published contact information" description="These details appear on the public Contact page." Icon={Mail} /></div>
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
              <label className="flex items-start gap-3 rounded-lg border border-[#e4ebe4] bg-[#f8faf7] p-4 text-[12px] leading-relaxed text-[#607464]" key={key}>
                <input
                  className="[&&]:mt-0.5 [&&]:size-4 [&&]:shrink-0 [&&]:p-0 accent-[#176b60]"
                  type="checkbox"
                  checked={content.contact[key]}
                  onChange={(e) => contact(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </section>
          <section className={`${editorPanel} space-y-3`}>
            <EditorSectionTitle title="Social links" description="Add public profiles using their full HTTPS address." Icon={Mail} />
            {content.contact.socialLinks.map((s, i) => (
              <div className="grid items-end gap-3 rounded-xl border border-[#e6ece6] bg-[#fbfcfa] p-4 sm:grid-cols-[1fr_1fr_auto]" key={i}>
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
                  className={editorButton}
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
              className={editorButton}
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
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d6e4d9] bg-white/95 p-4 shadow-[0_4px_28px_-12px_#234c3840] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className={`flex size-9 items-center justify-center rounded-lg ${dirty ? "bg-[#fcf4df] text-[#ad8b38]" : "bg-[#edf5ee] text-[#64876b]"}`}>
            {dirty ? <Save size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
          </span>
          <div><span className="block text-[12px] font-medium text-[#466253]">{dirty ? "You have unsaved changes" : "Private draft"}</span><span className="mt-0.5 block text-[10px] text-[#87968a]">Changes stay private until you publish.</span></div>
        </div>
        <button className={`${editorPrimary} w-full sm:w-auto`} disabled={busy}>
          {busy ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
          {busy ? "Saving…" : "Save private draft"}
        </button>
      </div>
    </form>
  );
}
function CategoryEditor({ values, onChange, images }) {
  const catalogue = useContent("/cms/about-us");
  return (
    <section className={`${editorPanel} space-y-4`}>
      <EditorSectionTitle title="Category descriptions and images" description="Category names come from the live catalogue. These overrides affect the About page only." Icon={LayoutTemplate} />
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
            className="group rounded-xl border border-[#e0e8e2] bg-[#fbfcfb] p-4 open:border-[#accbb9] open:bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-medium text-[#466253] [&::-webkit-details-marker]:hidden">{c.name}<ChevronDown size={15} className="text-[#8ba393] transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="mt-3 space-y-3">
              <Field
                label="Description override"
                value={value.description}
                area
                onChange={(v) => set({ description: v })}
              />
              <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">
                Category image
                <select
                  className={editorInput}
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
    <main className="cms-workspace min-w-0 space-y-5 font-sans leading-relaxed text-[#3b503d] [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere">
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#dfe7e1] bg-linear-to-r from-white to-[#f1f7f1] p-5 sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-xl border border-[#d7e7dc] bg-[#eaf3ec] text-[#47816a] sm:flex"><FileText size={24} strokeWidth={1.5} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="[&&]:mb-2 [&&]:text-[9px] [&&]:font-semibold [&&]:uppercase [&&]:tracking-[0.2em] [&&]:text-[#8a9b89]">Workspace / Content management</p>
            <h1 className="[&&]:m-0 [&&]:font-sans [&&]:text-[23px] [&&]:font-semibold [&&]:leading-tight [&&]:tracking-[-0.6px] [&&]:text-[#294e40] sm:[&&]:text-[27px]">The words behind your marketplace</h1>
            <p className="[&&]:mt-3 [&&]:max-w-[580px] [&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#7e9080]">Edit privately, preview, and publish a new version. Published documents are never overwritten.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e5d7] bg-white/80 px-3 py-2 text-[10px] font-medium text-[#748b72]"><LockKeyhole size={12} aria-hidden="true" />Private drafts · Versioned publishing</span>
      </header>
      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-[#d9e5d1] bg-[#f0f6ea] px-4 py-3" role="status"><Info size={16} className="mt-0.5 text-[#7a956b]" aria-hidden="true" /><p className="[&&]:text-[12px] [&&]:text-[#68815d]">{notice}</p></div>
      )}
      <nav className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#dfe7e1] bg-[#eaf0eb]/60 p-1.5 xl:grid-cols-4" aria-label="Content pages">
        {Object.entries(titles).map(([key, label]) => {
          const Icon = pageIcons[key];
          return (
          <button
            key={key}
            aria-pressed={key === pageKey}
            className={`flex min-h-12 min-w-0 items-center justify-center gap-2.5 rounded-lg border px-3 py-3 text-[12px] font-medium transition-colors sm:px-4 ${key === pageKey ? "border-[#c9ded0] bg-white text-[#176b60] shadow-[0_2px_5px_-3px_#174d3940]" : "border-transparent text-[#849286] hover:bg-white/60 hover:text-[#4d745c]"}`}
            onClick={() => {
              setPageKey(key);
              setSelected("");
              setDirty(false);
            }}
          >
            <Icon size={16} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>
          </button>
          );
        })}
      </nav>
      <State state={pages} />
      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${editorPanel} space-y-4 lg:sticky lg:top-5`} aria-label="Version history">
          <div className="flex items-center justify-between gap-2"><h2 className={`${sectionHeading} flex items-center gap-2`}><History size={16} strokeWidth={1.6} className="text-[#7b9a82]" aria-hidden="true" />Version history</h2><span className="rounded-md border border-[#e1e9df] bg-[#f5f8f2] px-1.5 py-0.5 text-[10px] text-[#8a9b82]">{versions.length}</span></div>
          <button className={`${editorButton} w-full !border-dashed !border-[#b8d2bf] !bg-[#f5faf4] !text-[#5e8b63]`} disabled={busy} onClick={() => create()}>
            <Plus size={14} />
            Open/create draft
          </button>
          {versions.map((v) => (
            <button
              aria-pressed={v.id === id}
              className={`relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${v.id === id ? "border-[#accfb7] bg-[#f0f7ef] ring-1 ring-[#accfb7]/30" : "border-[#e4eae3] bg-white hover:border-[#c4d8c5] hover:bg-[#f9fbf7]"}`}
              key={v.id}
              onClick={() => {
                setSelected(v.id);
                setDirty(false);
              }}
            >
              <FileText size={16} className={`mt-1 ${v.id === id ? "text-[#62956a]" : "text-[#a0aea0]"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[12px] font-medium text-[#49664f]">Version {v.version}</span><VersionStatus status={v.status} /></span>
                <small className="block text-[10px] text-[#8c9b87]">{date(v.publishedAt || v.updatedAt)}</small>
              </span>
            </button>
          ))}
          {!versions.length && !pages.loading && <p className="rounded-lg border border-dashed border-[#e0e7dc] px-3 py-5 text-center [&&]:text-[11px] [&&]:text-[#8a9b82]">No versions yet. Create a private draft to get started.</p>}
          <div className="flex items-start gap-2 border-t border-[#edf1e9] pt-4 text-[10px] leading-relaxed text-[#93a08d]"><LockKeyhole size={12} className="mt-0.5" aria-hidden="true" />Published versions are preserved in history.</div>
        </aside>
        <section className="min-w-0 space-y-5" aria-label={`${titles[pageKey]} editor`}>
          <State state={detail} />
          {row && (
            <>
              <div
                className={`${editorPanel} flex flex-wrap items-center justify-between gap-5`}
              >
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#90a18b]">Page editor</span><VersionStatus status={row.status} /></div>
                  <h2 className={sectionHeading}>
                    {titles[row.pageKey]} <span className="mx-1 font-normal text-[#b1beb0]">/</span> <span className="font-normal text-[#82977c]">Version {row.version}</span>
                  </h2>
                  <p className="[&&]:mt-1 [&&]:text-[10px] [&&]:text-[#91a087]">
                    Last updated {date(row.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={editorButton}
                    disabled={dirty}
                    onClick={() => setPreview(row)}
                  >
                    <Eye size={14} />
                    Preview saved version
                  </button>
                  {row.status === "Draft" ? (
                    <button
                      className={editorPrimary}
                      disabled={dirty || busy}
                      onClick={() => {
                        setReviewed(false);
                        setPublishing(true);
                      }}
                    >
                      <Send size={13} aria-hidden="true" />Publish
                    </button>
                  ) : (
                    <button className={editorButton} onClick={() => create(row.id)}>
                      Copy to a new draft
                    </button>
                  )}
                  {row.status === "Draft" && (
                    <button
                      className={`${editorButton} !border-transparent !px-2 !text-[#9a8977] hover:!bg-[#fcf2ec] hover:!text-[#ad6e54]`}
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
                      <Archive size={14} aria-hidden="true" />Archive draft
                    </button>
                  )}
                </div>
              </div>
              {dirty && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-[#ecdfb8] bg-[#fcf8e9] px-4 py-3 text-[11px] text-[#a18a4d]"><Info size={14} aria-hidden="true" />Save your changes before previewing or publishing.</div>
              )}
              {row.status === "Draft" ? (
                <ContentEditor
                  key={`${row.id}:${row.revision}`}
                  version={row}
                  onDirty={setDirty}
                  dirty={dirty}
                  onSaved={() => {
                    setNotice("Draft saved.");
                    refresh();
                  }}
                />
              ) : (
                <div className={editorPanel}>
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
          compact
          close={() => {
            if (!busy) setPublishing(false);
          }}
        >
          <p className="[&&]:mb-5 [&&]:text-[13px] [&&]:leading-relaxed [&&]:text-[#758b78]">
            The current published version will be archived and preserved. Only
            this new version will be displayed publicly.
          </p>
          {["terms", "privacy"].includes(row.pageKey) && (
            <label className="mb-5 flex items-start gap-3 rounded-xl border border-[#eadfbe] bg-[#fcf8e9] p-4 text-[12px] leading-relaxed text-[#94834e]">
              <input
                className="[&&]:mt-0.5 [&&]:size-4 [&&]:shrink-0 [&&]:p-0 accent-[#176b60]"
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I confirm that a qualified legal professional reviewed and
              approved this exact wording and effective date.
            </label>
          )}
          <button
            className={`${editorPrimary} w-full`}
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
            {busy ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
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
function InquiryStatus({ status }) {
  const tones = {
    New: "border-[#cce3dc] bg-[#edf7f3] text-[#287967]",
    InProgress: "border-[#d5e2ee] bg-[#eff5fb] text-[#527ba2]",
    WaitingForCustomer: "border-[#ecdfbf] bg-[#fbf6e9] text-[#a48743]",
    Resolved: "border-[#d5e6cd] bg-[#f1f7ec] text-[#6c8a54]",
    Closed: "border-[#e0e5e1] bg-[#f3f5f3] text-[#859187]",
    Spam: "border-[#eddbd5] bg-[#fbf1ed] text-[#ab7767]",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${tones[status] || tones.Closed}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{labels[status] || status}</span>;
}

function InquiryInbox({ state, page, onPage, returnTo, filtered, onClear }) {
  const data = state.data;
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const size = data?.pageSize || 20;
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white shadow-[0_2px_8px_-6px_#234c3825]" aria-labelledby="inbox-title" aria-busy={!!state.loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee7] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-[#edf5ee] text-[#628b71]"><Inbox size={18} strokeWidth={1.6} aria-hidden="true" /></span><div><h2 id="inbox-title" className={sectionHeading}>Inquiry inbox</h2><p className="[&&]:mt-0.5 [&&]:text-[11px] [&&]:text-[#849489]">Customer questions, all in one place.</p></div></div>
        {data && <span className="rounded-full border border-[#dce7de] bg-[#f4f8f3] px-3 py-1 text-[10px] font-medium text-[#7a9279]">{total} {total === 1 ? "inquiry" : "inquiries"}{filtered ? " found" : ""}</span>}
      </div>

      {state.error ? (
        <div className="px-6 py-10"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 [&&]:text-[13px] [&&]:text-red-800">{state.error}</p></div>
      ) : (
        <>
          <div className="overflow-x-auto" role="region" aria-label="Contact inquiries table" tabIndex={0}>
            <table className="w-full min-w-[880px] border-collapse text-left text-[12px]">
              <caption className="sr-only">Contact inquiries with customer, status, assignment, and submission date</caption>
              <thead className="border-b border-[#e8eee7] bg-[#f8faf7] text-[9px] font-semibold uppercase tracking-[0.09em] text-[#8a9a87]">
                <tr>{["Reference / subject", "Customer", "Type / status", "Assigned to", "Submitted", "Actions"].map((h) => <th key={h} scope="col" className={`px-5 py-3.5 font-semibold ${h === "Actions" ? "text-right" : ""}`}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {state.loading ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} aria-hidden="true" className="border-b border-[#edf1eb]">{Array.from({ length: 6 }, (_, j) => <td key={j} className="px-5 py-6"><div className={`h-3 rounded bg-[#edf2eb] motion-safe:animate-pulse ${j ? "w-20" : "w-40"}`} /><div className="mt-3 h-2 w-14 rounded bg-[#f4f6f1] motion-safe:animate-pulse" /></td>)}</tr>
                )) : rows.map((r) => (
                  <tr key={r.id} className="group border-b border-[#edf1eb] transition-colors last:border-b-0 hover:bg-[#f8fbf6]">
                    <td className="max-w-[300px] px-5 py-5"><Link to={`/admin/contact-inquiries/${encodeURIComponent(r.id)}`} state={{ from: returnTo }} className="block max-w-full wrap-anywhere text-left text-[12px] font-semibold leading-relaxed text-[#3f6550] hover:text-[#176b60] hover:underline">{r.subject}</Link><span className="mt-1.5 block max-w-[240px] truncate font-mono text-[9px] text-[#96a18e]" title={r.reference}>{r.reference}</span></td>
                    <td className="px-5 py-5"><div className="flex items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e0e8da] bg-[#f0f4eb] text-[10px] font-semibold text-[#859572]" aria-hidden="true">{r.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?"}</span><div className="min-w-0"><span className="block text-[12px] text-[#5b715e]">{r.name}</span><span className="mt-0.5 block max-w-[190px] truncate text-[10px] text-[#8c9a85]" title={r.email}>{r.email}</span></div></div></td>
                    <td className="px-5 py-5"><span className="mb-2 block text-[10px] text-[#7e907c]">{types[r.category] || r.category}</span><InquiryStatus status={r.status} /></td>
                    <td className="px-5 py-5"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] ${r.assignee?.trim() ? "text-[#72846c]" : "text-[#a5af9c]"}`}><UserRound size={13} strokeWidth={1.5} aria-hidden="true" />{r.assignee?.trim() || "Unassigned"}</span></td>
                    <td className="whitespace-nowrap px-5 py-5 text-[11px] text-[#83937b]">{date(r.createdAt)}</td>
                    <td className="px-5 py-5 text-right"><Link to={`/admin/contact-inquiries/${encodeURIComponent(r.id)}`} state={{ from: returnTo }} className={`${editorButton} !min-h-8 !gap-1.5 !px-3 !py-2 !text-[11px]`} aria-label={`Open inquiry: ${r.subject}`}>View<ChevronRight size={13} aria-hidden="true" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.loading ? <p role="status" className="sr-only">Loading inquiries…</p> : rows.length === 0 && data && (
            <div className="flex flex-col items-center px-6 py-14 text-center sm:py-18">
              <span className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-[#dce8d9] bg-[#f2f7ee] text-[#94ab85]"><Inbox size={30} strokeWidth={1.2} aria-hidden="true" /><span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#e1edde]"><Search size={11} aria-hidden="true" /></span></span>
              <h3 className="[&&]:mb-2 [&&]:text-[16px] [&&]:font-semibold [&&]:text-[#5c7857]">{filtered ? "No matching inquiries" : "Your inbox is clear"}</h3>
              <p className="[&&]:max-w-[330px] [&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#8c9a81]">{filtered ? "Try a different search or clear the filters to see all inquiries." : "Messages submitted through your Contact page will appear here."}</p>
              {filtered && <button type="button" className={`${editorButton} mt-5 !text-[11px]`} onClick={onClear}><RefreshCw size={13} aria-hidden="true" />Clear filters</button>}
            </div>
          )}
          {data && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7eee5] bg-[#fcfdfb] px-5 py-4 sm:px-6"><span className="text-[10px] text-[#8a9b83]">{total ? `Showing ${(page - 1) * size + 1}–${Math.min((page - 1) * size + rows.length, total)} of ${total} inquiries` : "0 inquiries"}</span><nav aria-label="Inquiry results pages" className="flex items-center gap-2"><button type="button" className={`${editorButton} !min-h-8 !px-2.5 !py-2`} aria-label="Previous page" disabled={page <= 1 || state.loading} onClick={() => onPage(page - 1)}><ChevronLeft size={13} aria-hidden="true" /></button><span className="px-1 text-[10px] text-[#7f9375]">Page {page} of {pages}</span><button type="button" className={`${editorButton} !min-h-8 !px-2.5 !py-2`} aria-label="Next page" disabled={page >= pages || state.loading} onClick={() => onPage(page + 1)}><ChevronRight size={13} aria-hidden="true" /></button></nav></div>}
        </>
      )}
    </section>
  );
}

export function ContactManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const [version, setVersion] = useState(0);
  const filters = Object.fromEntries(["q", "status", "category", "from", "to"].map((key) => [key, searchParams.get(key) || ""]));
  const params = new URLSearchParams({ page: String(page) });
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const list = useContent(`/admin/contact-inquiries?${params}`, version);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const updateFilter = (key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    }, { replace: true });
  };
  const setPage = (value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value > 1) next.set("page", String(value));
      else next.delete("page");
      return next;
    });
  };
  const clearFilters = () => setSearchParams({}, { replace: true });
  return (
    <main className="cms-workspace min-w-0 space-y-5 font-sans leading-relaxed text-[#3b503d] [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere">
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#dfe7e1] bg-linear-to-r from-white to-[#f1f7f1] p-5 sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-xl border border-[#d7e7dc] bg-[#eaf3ec] text-[#47816a] sm:flex"><MessageSquare size={24} strokeWidth={1.5} aria-hidden="true" /></span>
          <div className="min-w-0"><p className="[&&]:mb-2 [&&]:text-[9px] [&&]:font-semibold [&&]:uppercase [&&]:tracking-[0.2em] [&&]:text-[#8a9b89]">Workspace / Contact inquiries</p><h1 className="[&&]:m-0 [&&]:font-sans [&&]:text-[23px] [&&]:font-semibold [&&]:leading-tight [&&]:tracking-[-0.6px] [&&]:text-[#294e40] sm:[&&]:text-[27px]">Every inquiry, followed through.</h1><p className="[&&]:mt-3 [&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#7e9080]">Review messages, connect customers with your team, and keep every conversation moving.</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><Link to="/contact" className={editorButton}>View contact page<ArrowUpRight size={14} aria-hidden="true" /></Link><button type="button" className={editorButton} disabled={list.loading} onClick={() => setVersion((v) => v + 1)}><RefreshCw size={14} className={list.loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />Refresh</button></div>
      </header>
      <section className={editorPanel} aria-labelledby="inquiry-filters-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ed] pb-4">
          <div className="flex items-center gap-2.5"><SlidersHorizontal size={16} strokeWidth={1.6} className="text-[#7b9a82]" aria-hidden="true" /><h2 id="inquiry-filters-title" className={sectionHeading}>Find an inquiry</h2>{activeFilters > 0 && <span className="rounded-full bg-[#eaf4eb] px-2 py-0.5 text-[9px] font-medium text-[#6a9269]">{activeFilters} active</span>}</div>
          <button type="button" disabled={!activeFilters} onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#78926f] hover:bg-[#f2f7ee] hover:text-[#176b60] disabled:cursor-default disabled:opacity-40"><RefreshCw size={12} aria-hidden="true" />Reset filters</button>
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b] sm:col-span-2 xl:col-span-1">Search inquiries<span className="relative block"><Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 z-1 -translate-y-1/2 text-[#96a68e]" aria-hidden="true" /><input type="search" className={`${editorInput} [&&]:pl-10`} placeholder="Name, email, reference or subject" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} /></span></label>
          {[["status", "Status", labels], ["category", "Inquiry type", types]].map(([key, title, values]) => <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]" key={key}>{title}<select className={editorInput} value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)}><option value="">{key === "status" ? "All statuses" : "All inquiry types"}</option>{Object.entries(values).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></label>)}
          {["from", "to"].map((key) => <Field key={key} type="date" label={key === "from" ? "From date" : "To date"} value={filters[key]} onChange={(value) => updateFilter(key, value)} />)}
        </div>
      </section>
      <InquiryInbox state={list} page={page} onPage={setPage} returnTo={`${location.pathname}${location.search}`} filtered={!!activeFilters} onClear={clearFilters} />
    </main>
  );
}
export function ContactInquiryDetailsPage() {
  const { inquiryId } = useParams();
  const location = useLocation();
  const from = location.state?.from;
  const backTo = typeof from === "string" && /^\/admin\/contact-inquiries(?:\?|$)/.test(from)
    ? from
    : "/admin/contact-inquiries";
  return <InquiryDetails key={inquiryId} id={inquiryId} backTo={backTo} />;
}

function InquiryDetails({ id, backTo }) {
  const [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [pendingAction, setPendingAction] = useState(""),
    [composeMode, setComposeMode] = useState("reply"),
    [copied, setCopied] = useState(false),
    [lastLoadedRow, setLastLoadedRow] = useState(null),
    detail = useContent(`/admin/contact-inquiries/${id}`, version),
    staff = useContent("/admin/contact-inquiries/staff"),
    row = detail.data || lastLoadedRow,
    replyKey = useRef(crypto.randomUUID());
  useEffect(() => {
    if (detail.data) setLastLoadedRow(detail.data);
  }, [detail.data]);
  const events = row?.events || [];
  const assignedName = staff.data?.find((s) => s.id === row?.AssignedTo)?.name
    || (row?.AssignedTo ? "Assigned administrator" : "Unassigned");
  const timestamp = (value) => {
    const parsed = value ? new Date(value) : null;
    return parsed && Number.isFinite(parsed.getTime())
      ? parsed.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "Not recorded";
  };
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(row.ReferenceNumber);
      setCopied(true);
    } catch {
      setError("Unable to copy automatically. Select and copy the reference number below.");
    }
  };
  async function act(action, body) {
    if (busy) return false;
    setBusy(true);
    setPendingAction(action);
    setError("");
    setNotice("");
    try {
      const r = await contentSave(
        `/admin/contact-inquiries/${id}/${action}`,
        ["status", "assign"].includes(action) ? "PATCH" : "POST",
        body,
      );
      setVersion((v) => v + 1);
      setNotice(r.message);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
      setPendingAction("");
    }
  }
  return (
    <main aria-label="Inquiry details" className="cms-workspace min-w-0 space-y-5 font-sans leading-relaxed text-[#344e45]">
      <nav aria-label="Inquiry navigation" className="flex flex-wrap items-center justify-between gap-3">
        <Link to={backTo} className="inline-flex items-center gap-2 rounded-lg py-1.5 text-[12px] font-medium text-[#597766] hover:text-[#176b60]"><ChevronLeft size={15} aria-hidden="true" />Back to inquiries</Link>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#7c8e81]"><LockKeyhole size={12} aria-hidden="true" />Administrator workspace</span>
      </nav>
      <header className="overflow-hidden rounded-2xl border border-[#dbe6df] bg-white shadow-[0_3px_16px_-12px_#234c3830]">
        <div className="flex flex-wrap items-start justify-between gap-5 p-5 sm:p-7">
          <div className="min-w-0 flex-1 basis-[300px]">
            <div className="mb-3 flex flex-wrap items-center gap-2.5"><span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7a9180]">Contact inquiry</span>{row && <><span className="h-3 w-px bg-[#d7e2d9]" /><span className="text-[11px] text-[#688575]">{types[row.Category] || row.Category}</span><InquiryStatus status={row.Status} /></>}</div>
            <h1 className="[&&]:m-0 [&&]:max-w-[880px] [&&]:wrap-anywhere [&&]:font-sans [&&]:text-[24px] [&&]:font-semibold [&&]:leading-[1.25] [&&]:tracking-[-0.7px] [&&]:text-[#294d3e] sm:[&&]:text-[30px]">{row?.Subject || "Inquiry details"}</h1>
            {row?.ReferenceNumber && <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2"><span className="text-[10px] text-[#8a9a8c]">Reference</span><code className="select-all break-all font-mono text-[11px] text-[#667e69]">{row.ReferenceNumber}</code><button type="button" onClick={copyReference} className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e9df] px-2 py-1 text-[10px] text-[#6c8971] hover:bg-[#f1f7ed]" aria-label="Copy inquiry reference">{copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}{copied ? "Copied" : "Copy"}</button><span role="status" className="sr-only">{copied ? "Inquiry reference copied." : ""}</span></div>}
          </div>
          <button type="button" className={editorButton} disabled={busy || detail.loading} onClick={() => setVersion((v) => v + 1)}><RefreshCw size={14} className={detail.loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />Refresh</button>
        </div>
        {row && <dl className="grid border-t border-[#e4ebe3] bg-[#f8faf7] sm:grid-cols-3">
          {[[CalendarDays, "Received", timestamp(row.CreatedAt)], [Clock, "Last updated", timestamp(row.UpdatedAt || row.CreatedAt)], [UserRound, "Assigned to", assignedName]].map(([Icon, label, value]) => <div key={label} className="flex min-w-0 items-center gap-3 border-b border-[#e4ebe3] px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 sm:px-7"><Icon size={17} strokeWidth={1.5} className="text-[#8fa68b]" aria-hidden="true" /><div className="min-w-0"><dt className="text-[9px] font-medium uppercase tracking-[0.09em] text-[#8b9d86]">{label}</dt><dd className="mt-1 wrap-anywhere text-[12px] font-medium text-[#5a7653]">{value}</dd></div></div>)}
        </dl>}
      </header>
      {notice && <div role="status" className="flex items-start gap-3 rounded-xl border border-[#cfe1cf] bg-[#eef7eb] px-4 py-3"><CheckCircle2 size={17} className="mt-0.5 text-[#64945f]" aria-hidden="true" /><p className="[&&]:text-[12px] [&&]:text-[#557f50]">{notice}</p><button type="button" className="ml-auto rounded p-1 text-[#7c9875] hover:bg-[#e0efdb]" aria-label="Dismiss update message" onClick={() => setNotice("")}><X size={13} aria-hidden="true" /></button></div>}
      <State state={row ? { ...detail, loading: false } : detail} />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 [&&]:text-[12px] [&&]:text-red-800">{error}</p>}
      {row && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <section className={editorPanel} aria-labelledby="customer-message-title">
              <div className="mb-5 flex items-center justify-between gap-3"><h2 id="customer-message-title" className={`${sectionHeading} flex items-center gap-2.5`}><MessageSquare size={17} strokeWidth={1.5} className="text-[#689077]" aria-hidden="true" />Customer message</h2><span className="text-[10px] text-[#8c9d87]">{date(row.CreatedAt)}</span></div>
              <div className="mb-5 flex flex-wrap items-center gap-3.5 border-y border-[#edf1e9] py-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#dbe7d3] bg-[#edf4e6] text-[13px] font-semibold text-[#789568]" aria-hidden="true">{row.FullName?.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?"}</span>
                <div className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#4c6b45]">{row.FullName}</span><div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#7d9073]"><span className="inline-flex min-w-0 items-center gap-1.5"><Mail size={12} aria-hidden="true" /><span className="break-all">{row.Email}</span></span>{row.Phone && <span className="inline-flex items-center gap-1.5"><Phone size={12} aria-hidden="true" />{row.Phone}</span>}</div></div>
              </div>
              <div className="rounded-xl border border-[#e8ede3] bg-[#f9fbf6] p-5 sm:p-6"><p className="[&&]:whitespace-pre-wrap [&&]:wrap-anywhere [&&]:text-[14px] [&&]:leading-[1.9] [&&]:text-[#556e4d]">{row.Message}</p></div>
            </section>

            <section className={editorPanel} aria-labelledby="compose-title">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="compose-title" className={sectionHeading}>Continue the conversation</h2><span className="text-[10px] text-[#8b9b85]">Choose who sees your message</span></div>
              <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-[#e1e9dd] bg-[#f1f5ee] p-1" role="group" aria-label="Compose message type">
                <button type="button" aria-pressed={composeMode === "reply"} onClick={() => setComposeMode("reply")} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-[12px] font-medium ${composeMode === "reply" ? "border-[#d3e2d1] bg-white text-[#3c7854] shadow-sm" : "border-transparent text-[#8a9b7f] hover:text-[#527c48]"}`}><Mail size={14} aria-hidden="true" />Customer reply</button>
                <button type="button" aria-pressed={composeMode === "note"} onClick={() => setComposeMode("note")} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-[12px] font-medium ${composeMode === "note" ? "border-[#e4d8b4] bg-[#fffcf3] text-[#9b8146] shadow-sm" : "border-transparent text-[#8a9b7f] hover:text-[#927d48]"}`}><LockKeyhole size={14} aria-hidden="true" />Private team note</button>
              </div>
              <form hidden={composeMode !== "reply"} onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget, body = new FormData(form).get("body");
                if (await act("reply", { body, requestKey: replyKey.current })) {
                  replyKey.current = crypto.randomUUID();
                  form.reset();
                }
              }}>
                <FieldArea label={`Email reply to ${row.Email}`} name="body" placeholder="Write your response to the customer..." required minLength={5} maxLength={10000} aria-describedby="reply-visibility" />
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8eee3] pt-4"><p id="reply-visibility" className="[&&]:flex [&&]:max-w-[310px] [&&]:items-start [&&]:gap-2 [&&]:text-[11px] [&&]:leading-relaxed [&&]:text-[#849478]"><Mail size={13} className="mt-0.5" aria-hidden="true" />Sent to the customer by email. Delivery updates appear in the inquiry history.</p><button className={`${editorPrimary} w-full sm:w-auto`} disabled={busy}>{pendingAction === "reply" ? <LoaderCircle size={14} className="motion-safe:animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}Queue email reply</button></div>
              </form>
              <form hidden={composeMode !== "note"} onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget, note = new FormData(form).get("note");
                if (await act("notes", { note })) form.reset();
              }}>
                <div className="rounded-xl border border-[#ece1c5] bg-[#fffcf3] p-4"><FieldArea label="Internal note (administrators only)" name="note" placeholder="Add context for your team..." required minLength={2} maxLength={5000} aria-describedby="note-visibility" /></div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8eee3] pt-4"><p id="note-visibility" className="[&&]:flex [&&]:items-center [&&]:gap-2 [&&]:text-[11px] [&&]:text-[#9d8b56]"><LockKeyhole size={13} aria-hidden="true" />Visible to administrators. Never emailed to the customer.</p><button className={`${editorButton} w-full sm:w-auto`} disabled={busy}>{pendingAction === "notes" ? <LoaderCircle size={14} className="motion-safe:animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}Add internal note</button></div>
              </form>
            </section>

            <section className={editorPanel} aria-labelledby="inquiry-history-title">
              <div className="mb-6 flex items-center justify-between gap-3"><h2 id="inquiry-history-title" className={`${sectionHeading} flex items-center gap-2.5`}><History size={17} strokeWidth={1.5} className="text-[#76956b]" aria-hidden="true" />Inquiry history</h2><span className="rounded-full border border-[#e0e8da] bg-[#f6f9f2] px-2.5 py-1 text-[10px] text-[#8b9b7e]">{events.length} {events.length === 1 ? "event" : "events"}</span></div>
              <ol className="space-y-0">
                {events.map((event, index) => {
                  const eventTypes = { Note: [StickyNote, "Internal note", "bg-[#fcf6e4] text-[#b19851]"], Reply: [Send, "Email reply", "bg-[#eaf5ee] text-[#648e6a]"], Acknowledgement: [Mail, "Acknowledgement email", "bg-[#eef3f7] text-[#8199af]"], Status: [SlidersHorizontal, "Status updated", "bg-[#edf3f8] text-[#7897ae]"], Assignment: [UserRound, "Assignment updated", "bg-[#f1f3e9] text-[#95a375]"] };
                  const [Icon, title, tone] = eventTypes[event.EventType] || [History, event.EventType, "bg-[#f1f4ed] text-[#8c9c7f]"];
                  const deliveryTone = event.DeliveryStatus === "Failed" ? "border-[#ebd2cb] bg-[#fcf0ec] text-[#ac7060]" : event.DeliveryStatus === "Sent" ? "border-[#d1e5d1] bg-[#eef7eb] text-[#719363]" : "border-[#e4dfcb] bg-[#faf7ec] text-[#a19569]";
                  return <li key={event.EventId} className={`relative flex gap-3.5 ${index < events.length - 1 ? "pb-6" : ""}`}>
                    {index < events.length - 1 && <span className="absolute top-9 bottom-0 left-[16px] w-px bg-[#e2eadd]" aria-hidden="true" />}
                    <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border border-white ${tone}`}><Icon size={14} strokeWidth={1.6} aria-hidden="true" /></span>
                    <article className="min-w-0 flex-1 pt-1"><div className="flex flex-wrap items-center gap-2"><h3 className="[&&]:m-0 [&&]:text-[12px] [&&]:font-semibold [&&]:text-[#617d52]">{title}</h3>{event.NewStatus && <InquiryStatus status={event.NewStatus} />}{event.DeliveryStatus && <span className={`rounded-full border px-2 py-0.5 text-[9px] ${deliveryTone}`}>{event.DeliveryStatus}</span>}</div><span className="mt-1.5 block text-[10px] text-[#90a081]">{event.administrator?.trim() || "System"} / {timestamp(event.CreatedAt)}</span>
                      {event.Body && <p className="[&&]:mt-3 [&&]:rounded-xl [&&]:border [&&]:border-[#e5ebdf] [&&]:bg-[#fafcf7] [&&]:p-4 [&&]:whitespace-pre-wrap [&&]:wrap-anywhere [&&]:text-[12px] [&&]:leading-relaxed [&&]:text-[#748b63]">{event.Body}</p>}
                      {event.ErrorMessage && <p className="[&&]:mt-2 [&&]:rounded-lg [&&]:border [&&]:border-[#ecd8d0] [&&]:bg-[#fdf3ef] [&&]:p-3 [&&]:text-[11px] [&&]:text-[#a56a58]">{event.ErrorMessage}</p>}
                    </article>
                  </li>;
                })}
              </ol>
              {!events.length && <div className="rounded-xl border border-dashed border-[#dee8d5] bg-[#fafcf7] px-5 py-8 text-center"><History size={24} strokeWidth={1.2} className="mx-auto mb-3 text-[#a7b99a]" aria-hidden="true" /><p className="[&&]:text-[12px] [&&]:text-[#839a73]">No activity yet. Replies, notes, and updates will appear here.</p></div>}
            </section>
          </div>

          <aside className="min-w-0 space-y-5" aria-label="Manage inquiry">
            <section className={editorPanel}>
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#e6ece2] pb-4"><SlidersHorizontal size={17} strokeWidth={1.5} className="text-[#709567]" aria-hidden="true" /><h2 className={sectionHeading}>Manage inquiry</h2></div>
              <form onSubmit={(e) => { e.preventDefault(); act("status", Object.fromEntries(new FormData(e.currentTarget))); }}>
                <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">Status<select className={editorInput} name="status" defaultValue={row.Status}>{Object.entries(labels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
                <label className="mt-4 flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">Reason <span className="-mt-1 text-[10px] font-normal text-[#87987e]">Optional context for this change</span><textarea className={`${editorInput} [&&]:min-h-20 [&&]:resize-y`} rows={2} name="reason" placeholder="Add a reason..." maxLength={2000} /></label>
                <button className={`${editorPrimary} mt-5 w-full`} disabled={busy}>{pendingAction === "status" ? <LoaderCircle size={14} className="motion-safe:animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}Update status</button>
              </form>
              <form className="mt-6 border-t border-[#e6ece2] pt-5" onSubmit={(e) => { e.preventDefault(); const assignedTo = new FormData(e.currentTarget).get("assignedTo") || null; act("assign", { assignedTo }); }}>
                <h3 className="[&&]:mb-4 [&&]:flex [&&]:items-center [&&]:gap-2 [&&]:text-[12px] [&&]:font-semibold [&&]:text-[#617e55]"><UserRound size={14} aria-hidden="true" />Team assignment</h3>
                <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">Support administrator<select className={editorInput} name="assignedTo" defaultValue={row.AssignedTo || ""}><option value="">Unassigned</option>{row.AssignedTo && staff.data && !staff.data.some((s) => s.id === row.AssignedTo) && <option value={row.AssignedTo}>Current administrator</option>}{staff.data?.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
                <button className={`${editorButton} mt-4 w-full`} disabled={busy || staff.loading || !!staff.error}>{pendingAction === "assign" ? <LoaderCircle size={14} className="motion-safe:animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}Save assignment</button>
                {staff.error && <p role="alert" className="[&&]:mt-3 [&&]:text-[11px] [&&]:text-[#a76f5c]">Unable to load support administrators. Refresh to try again.</p>}
              </form>
            </section>
            <div className="rounded-xl border border-[#dce6d1] bg-[#f2f7eb] p-5"><div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[#6e8f59]"><ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />Keep your team in the loop</div><p className="[&&]:text-[11px] [&&]:leading-[1.8] [&&]:text-[#809669]">Use a private note for internal context. Customer replies are sent by email, and delivery updates stay in the inquiry history.</p></div>
          </aside>
        </div>
      )}
    </main>
  );
}
function FieldArea({ label, ...props }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-[12px] font-medium text-[#52675b]">
      {label}
      <textarea className={`${editorInput} [&&]:min-h-28 [&&]:resize-y`} rows={4} {...props} />
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
    <main className="cms-workspace text-[#3b503d] leading-[1.6] min-w-0 [font-family:inherit] [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere space-y-5">
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
