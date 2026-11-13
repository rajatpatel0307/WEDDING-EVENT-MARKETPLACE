import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  ImagePlus,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { date } from "../services/workspace.api";

function BrandImage({ src, alt, className, fallback }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  ) : (
    fallback || null
  );
}

function DetailSection({
  id,
  icon: Icon,
  title,
  description,
  action,
  children,
}) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-24 rounded-2xl border border-[#e0e6db] bg-white shadow-[0_4px_24px_#263e2d03]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#eff1eb] px-6 py-5 max-sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e7ecdf] bg-[#f5f7f0] text-[#71865b]">
            <Icon size={18} strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="m-0 font-serif text-[21px] font-normal leading-tight tracking-[-0.4px] text-[#304936]">
              {title}
            </h2>
            {description && (
              <p className="mb-0 mt-1 text-xs leading-relaxed text-[#6b795e]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="p-6 max-sm:p-4">{children}</div>
    </section>
  );
}

function DetailRow({ icon: Icon, label, value, href }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <Icon
          size={17}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 text-[#93a282]"
        />
      )}
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-medium uppercase tracking-[1.1px] text-[#6b795e]">
          {label}
        </dt>
        <dd className="mb-0 ml-0 mt-1.5 break-words text-[13px] leading-relaxed text-[#41553b]">
          {value ? (
            href ? (
              <a
                href={href}
                className="underline decoration-[#c7d3bd] underline-offset-4 transition-colors hover:text-[#7d6333]"
              >
                {value}
              </a>
            ) : (
              value
            )
          ) : (
            <span className="text-[#6b795e]">Not provided</span>
          )}
        </dd>
      </div>
    </div>
  );
}

function StatusPill({ children, positive = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium leading-relaxed ${positive ? "border-[#dce6ce] bg-[#f0f5e8] text-[#5a7541]" : "border-[#e8dfcb] bg-[#faf6eb] text-[#8a7348]"}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${positive ? "bg-[#7d9e5e]" : "bg-[#bca16b]"}`}
      />
      {children}
    </span>
  );
}

function EditAction({ onClick, disabled, children = "Edit" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-[#627d4b] transition-colors hover:bg-[#f1f5e9] hover:text-[#3e5d2e] disabled:opacity-50"
    >
      <Pencil size={12} />
      {children}
    </button>
  );
}

export default function BusinessProfileView({
  data,
  onEdit,
  disabled = false,
  saved = false,
}) {
  const { vendor, categories = [], locations = [], summary = {} } = data;
  const approved = vendor.status === "Approved";
  const active = Boolean(vendor.active);
  const email = vendor.businessEmail || vendor.email;
  const phone = vendor.businessPhone || vendor.phone;
  const primaryLocation =
    locations.find((location) => location.isPrimary) || locations[0];
  const locationLabel =
    vendor.registeredLocation ||
    [primaryLocation?.city, primaryLocation?.state].filter(Boolean).join(", ");
  const initials = ((vendor.businessName || "").trim() || "Your business")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const approvedDocuments = Number(summary.approvedDocuments || 0);
  const documents = Number(summary.documents || 0);
  const businessStatus =
    vendor.status === "UnderReview"
      ? "Under review"
      : vendor.status || "Not recorded";
  const checklist = [
    {
      label: "Business name",
      complete: (vendor.businessName || "").trim().length >= 2,
      section: "business",
    },
    {
      label: "Business story",
      complete: (vendor.description || "").trim().length >= 10,
      section: "business",
    },
    {
      label: "Contact details",
      complete: Boolean(email && phone),
      section: "business",
    },
    {
      label: "Service categories",
      complete: categories.length > 0,
      section: "business",
    },
    {
      label: "Registered location",
      complete: Boolean(vendor.adminLocationId),
      section: "business",
    },
    {
      label: "Published logo",
      complete: Boolean(vendor.logoUrl),
      section: "images",
    },
    {
      label: "Published cover image",
      complete: Boolean(vendor.coverUrl),
      section: "images",
    },
  ];
  const completed = checklist.filter((item) => item.complete).length;
  const progress = Math.round((completed / checklist.length) * 100);

  return (
    <div className="grid min-w-0 gap-6 font-sans text-[#3d5238] [&_a:focus-visible]:rounded-sm [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#73915d]">
      <header className="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex items-center gap-2 text-[10px] font-medium tracking-[1px] text-[#6b795e]"
          >
            <Link
              to="/vendor/dashboard"
              className="transition-colors hover:text-[#45683c]"
            >
              BUSINESS
            </Link>
            <ChevronRight size={11} aria-hidden="true" />
            <span aria-current="page">BUSINESS PROFILE</span>
          </nav>
          <h1 className="m-0 font-serif text-[35px] font-normal leading-tight tracking-[-1.2px] text-[#2b4634] max-sm:text-[30px]">
            Business profile
            <span className="text-[#a7b28a]">.</span>
          </h1>
          <p className="mb-0 mt-2 text-[13px] leading-relaxed text-[#6b795e]">
            Your business, beautifully presented. Every detail in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit("business")}
          disabled={disabled}
          aria-haspopup="dialog"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#365b3e] bg-[#365b3e] px-4 py-3 text-xs font-medium text-white shadow-[0_3px_9px_#365b3e15] transition-colors hover:bg-[#294a31] disabled:opacity-50"
        >
          <Pencil size={14} />
          Edit profile
        </button>
      </header>

      {saved && (
        <p
          role="status"
          className="m-0 flex items-center gap-2 rounded-xl border border-[#dce5d2] bg-[#f0f5e9] px-4 py-3 text-xs text-[#557344]"
        >
          <CheckCircle2 size={16} />
          Your business profile has been updated.
        </p>
      )}

      <section
        aria-label="Business identity"
        className="overflow-hidden rounded-[22px] border border-[#dbe4d3] bg-white shadow-[0_8px_30px_#26432905]"
      >
        <div className="relative isolate overflow-hidden bg-[#2e4c38] px-7 py-8 text-white sm:px-8">
          <BrandImage
            src={vendor.coverUrl}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover opacity-50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-r from-[#223f2f]/95 via-[#294b35]/90 to-[#294b35]/40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-32 size-96 rounded-full border border-[#d1dcb4]/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-16 size-64 rounded-full border border-[#d1dcb4]/15"
          />
          <div className="relative flex items-start justify-between gap-5 max-sm:flex-col">
            <div className="min-w-0">
              <p className="m-0 flex items-center gap-2 text-[9px] font-medium uppercase tracking-[2.5px] text-[#d5ddbe]">
                <Sparkles size={13} strokeWidth={1.4} />
                MarryNest business partner
              </p>
              <h2 className="mb-3 mt-4 break-words font-serif text-[40px] font-normal leading-tight tracking-[-0.8px] text-[#fbfcf5] max-sm:text-[31px]">
                {vendor.businessName || "Your business"}
              </h2>
              {locationLabel && (
                <p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-[#d1dbc7]">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  {locationLabel}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3 max-sm:items-start">
              <span className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] text-[#e2e9d5] sm:inline-flex">
                <ShieldCheck size={14} strokeWidth={1.5} />
                {approved ? "Approved partner" : businessStatus}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                onClick={() => onEdit("images")}
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-[#24412d]/50 px-3 py-2 text-[10px] text-[#edf2e6] transition-colors hover:bg-[#24412d]/80 disabled:opacity-50"
              >
                <ImagePlus size={14} strokeWidth={1.5} />
                Edit brand images
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 px-7 py-5 max-sm:flex-col max-sm:items-start max-sm:gap-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative -mt-10 grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-[5px] border-white bg-[#f4f7ed] shadow-[0_3px_12px_#2d493c12]">
              <BrandImage
                src={vendor.logoUrl}
                alt={`${vendor.businessName || "Business"} logo`}
                className="size-full bg-white object-contain p-1.5"
                fallback={
                  <span className="font-serif text-[24px] text-[#7a925c]">
                    {initials}
                  </span>
                }
              />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[10px] uppercase tracking-[1.3px] text-[#6b795e]">
                A MarryNest business
              </p>
              <p className="mb-0 mt-1 text-xs text-[#67785a]">
                {vendor.createdAt
                  ? `Member since ${date(vendor.createdAt)}`
                  : "Your business identity, all in one place."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill positive={approved}>{businessStatus}</StatusPill>
            <StatusPill positive={active}>
              {active ? "Account active" : "Account inactive"}
            </StatusPill>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-3 border-t border-[#edf0e7] bg-[#fbfcf8] px-5 py-5 max-sm:px-2 sm:py-6">
          {[
            {
              label: "Service categories",
              value: categories.length,
              icon: BriefcaseBusiness,
            },
            {
              label: "Business locations",
              value: locations.length,
              icon: MapPin,
            },
            {
              label: "Services",
              value: Number(summary.services || 0),
              icon: Building2,
            },
          ].map(({ label, value, icon: Icon }, index) => (
            <div
              key={label}
              className={`flex items-center justify-center gap-3 px-3 max-sm:flex-col max-sm:gap-1.5 max-sm:px-1 ${index ? "border-l border-[#e5ebdd]" : ""}`}
            >
              <Icon
                size={19}
                strokeWidth={1.3}
                className="shrink-0 text-[#92a379] max-sm:hidden"
              />
              <div className="max-sm:text-center">
                <dt className="text-[10px] text-[#6b795e] max-sm:text-[9px]">
                  {label}
                </dt>
                <dd className="m-0 font-serif text-[26px] leading-tight text-[#49623b] max-sm:text-[23px]">
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <nav
        aria-label="Business profile sections"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#dfe6d7] px-1 pb-3 text-xs text-[#738365]"
      >
        {[
          ["business-story", "Overview"],
          ["business-contact", "Contact & ownership"],
          ["business-specialities", "Services & specialities"],
          ["business-locations", "Locations"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-md px-1 py-1 transition-colors hover:text-[#375a2c]"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="grid min-w-0 gap-6">
          <DetailSection
            id="business-story"
            icon={Sparkles}
            title="A little about us"
            description="The story behind your celebrations."
            action={
              <EditAction
                onClick={() => onEdit("business")}
                disabled={disabled}
              />
            }
          >
            {vendor.description ? (
              <p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-[1.9] text-[#6d7c60]">
                {vendor.description}
              </p>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dfe6d6] bg-[#fafbf7] p-5">
                <p className="m-0 text-[13px] text-[#859176]">
                  Your story belongs here.
                </p>
                <button
                  type="button"
                  onClick={() => onEdit("business")}
                  disabled={disabled}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#607e48]"
                >
                  Add your business description
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </DetailSection>

          <DetailSection
            id="business-contact"
            icon={UserRound}
            title="People & connections"
            description="The person behind the business. The ways to get in touch."
            action={
              <EditAction
                onClick={() => onEdit("business")}
                disabled={disabled}
              >
                Edit contact
              </EditAction>
            }
          >
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-6 max-sm:grid-cols-1">
              <DetailRow
                icon={UserRound}
                label="Business owner"
                value={vendor.owner}
              />
              <DetailRow
                icon={Building2}
                label="Business name"
                value={vendor.businessName}
              />
              <DetailRow
                icon={Mail}
                label="Contact email"
                value={email}
                href={email ? `mailto:${email}` : undefined}
              />
              <DetailRow
                icon={Phone}
                label="Contact phone"
                value={phone}
                href={phone ? `tel:${phone}` : undefined}
              />
            </dl>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf0e6] pt-3">
              <p className="m-0 text-[11px] text-[#6b795e]">
                Owner name, personal phone, and account photo
              </p>
              <EditAction onClick={() => onEdit("account")} disabled={disabled}>
                Edit owner
              </EditAction>
            </div>
          </DetailSection>

          <DetailSection
            id="business-specialities"
            icon={BriefcaseBusiness}
            title="Services & specialities"
            description="The things your business brings to every celebration."
            action={
              <EditAction
                onClick={() => onEdit("business")}
                disabled={disabled}
              />
            }
          >
            {categories.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${category.isPrimary ? "border-[#ded4b9] bg-[#faf6e9] text-[#8b774b]" : "border-[#e4e9dc] bg-[#f6f8f0] text-[#627450]"}`}
                  >
                    <Check size={12} strokeWidth={1.8} className="shrink-0" />
                    <span>{category.name}</span>
                    {Boolean(category.isPrimary) && (
                      <span className="rounded-sm bg-[#ece2c6] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-[#8b7545]">
                        Primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-xs text-[#6b795e]">
                No service categories added yet.
              </p>
            )}
          </DetailSection>

          <DetailSection
            id="business-locations"
            icon={MapPin}
            title="Find us here"
            description="The places your business calls home."
            action={
              <EditAction
                onClick={() => onEdit("locations")}
                disabled={disabled}
              >
                Manage
              </EditAction>
            }
          >
            {locations.length ? (
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                {locations.map((location) => (
                  <article
                    key={location.id}
                    className="rounded-xl border border-[#e4e9db] bg-[#fcfdf9] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <span className="grid size-9 place-items-center rounded-full bg-[#eff3e5] text-[#8a9f6d]">
                        <MapPin size={17} strokeWidth={1.5} />
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {Boolean(location.isPrimary) && (
                          <StatusPill positive>Primary</StatusPill>
                        )}
                        <StatusPill positive={Boolean(location.active)}>
                          {location.active ? "Active" : "Inactive"}
                        </StatusPill>
                      </div>
                    </div>
                    <h3 className="mb-1 mt-0 font-serif text-[22px] font-normal leading-tight text-[#4a653c]">
                      {location.city || "Business location"}
                    </h3>
                    <p className="m-0 text-[10px] uppercase tracking-[1px] text-[#6b795e]">
                      {[location.state, location.country]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <address className="mt-4 break-words text-xs not-italic leading-[1.9] text-[#627450]">
                      {[location.address, location.line2, location.landmark]
                        .filter(Boolean)
                        .join(", ") || "Street address not provided"}
                      {location.postalCode && (
                        <span className="block">
                          Postal code: {location.postalCode}
                        </span>
                      )}
                    </address>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-[#e0e6d7] bg-[#fafcf6] p-7 text-center">
                <MapPin
                  size={24}
                  strokeWidth={1.3}
                  className="mb-3 text-[#9ba98a]"
                />
                <p className="mb-3 mt-0 text-xs text-[#6b795e]">
                  Add an office, studio, or branch to complete your business
                  details.
                </p>
                <button
                  type="button"
                  onClick={() => onEdit("locations")}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#68844f]"
                >
                  Add a business location
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </DetailSection>
        </div>

        <aside className="grid min-w-0 gap-5 max-[1100px]:grid-cols-2 max-sm:grid-cols-1">
          <section className="rounded-2xl border border-[#e0e6d6] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 font-serif text-[23px] font-normal tracking-[-0.4px] text-[#405b32]">
                Profile completeness
              </h2>
              <span className="text-[21px] font-semibold tracking-tight text-[#718d51]">
                {progress}%
              </span>
            </div>
            <p className="mb-4 mt-2 text-[11px] leading-relaxed text-[#6b795e]">
              {completed === checklist.length
                ? "All the essentials are in place."
                : `${completed} of ${checklist.length} essentials complete. Add the finishing touches.`}
            </p>
            <div
              role="progressbar"
              aria-label="Profile completeness"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-[#e8eedf]"
            >
              <div
                className="h-full rounded-full bg-[#829e60] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="mb-0 mt-5 grid list-none gap-3 p-0">
              {checklist.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(item.section)}
                    className="flex w-full items-center gap-2 text-left text-[11px] text-[#657b50] hover:text-[#3e5f2d] disabled:opacity-50"
                  >
                    {item.complete ? (
                      <CheckCircle2
                        size={15}
                        className="shrink-0 text-[#809a62]"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-[15px] shrink-0 rounded-full border border-dashed border-[#b0bd9c]"
                      />
                    )}
                    <span className="flex-1">{item.label}</span>
                    <span className="sr-only">
                      {item.complete ? "Complete" : "Incomplete"}
                    </span>
                    <ChevronRight
                      size={11}
                      aria-hidden="true"
                      className="text-[#a0ae8d]"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dce5d1] bg-[#f1f5e9] p-6">
            <span className="mb-4 grid size-11 place-items-center rounded-xl border border-[#dce5cd] bg-[#e8efdd] text-[#7c965f]">
              <ShieldCheck size={23} strokeWidth={1.3} />
            </span>
            <p className="mb-1 mt-0 text-[9px] font-medium uppercase tracking-[1.8px] text-[#61734e]">
              Business standing
            </p>
            <h2 className="m-0 font-serif text-[25px] font-normal leading-tight text-[#4e683c]">
              {approved ? "A verified identity." : "Your verification."}
            </h2>
            <p className="mb-5 mt-2 text-xs leading-[1.8] text-[#61734e]">
              {approved
                ? "Your business application has been approved by MarryNest."
                : "Keep your business information and documents up to date for review."}
            </p>
            <dl className="m-0 grid gap-4 border-t border-[#dfe7d3] pt-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-[#61734e]">Verification</dt>
                <dd className="m-0">
                  <StatusPill positive={approved}>{businessStatus}</StatusPill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-[#61734e]">Account</dt>
                <dd className="m-0 text-[11px] font-medium text-[#5c7647]">
                  {active ? "Active" : "Inactive"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-[#61734e]">
                  Documents approved
                </dt>
                <dd className="m-0 text-[11px] font-medium text-[#5c7647]">
                  {approvedDocuments} / {documents}
                </dd>
              </div>
              {vendor.verifiedAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-[#61734e]">Last approved</dt>
                  <dd className="m-0 text-[11px] text-[#5c7647]">
                    {date(vendor.verifiedAt)}
                  </dd>
                </div>
              )}
            </dl>
            <Link
              to="/vendor/verification"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#d6e0c8] bg-white/65 px-3 py-2.5 text-[11px] font-medium text-[#67814f] transition-colors hover:bg-white"
            >
              View verification
              <ArrowRight size={13} />
            </Link>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onEdit("documents")}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-[#61764e] transition-colors hover:bg-[#e5ecda] disabled:opacity-50"
            >
              Manage documents
              <ArrowRight size={13} />
            </button>
          </section>

          <DetailSection
            icon={FileCheck2}
            title="Business credentials"
            action={
              <EditAction
                onClick={() => onEdit("business")}
                disabled={disabled}
              />
            }
          >
            <dl className="m-0 grid gap-5">
              <DetailRow label="GST number" value={vendor.gst} />
              <DetailRow label="PAN number" value={vendor.pan} />
              <div className="border-t border-[#edf0e6] pt-5">
                <DetailRow
                  icon={CalendarDays}
                  label="Registered on"
                  value={vendor.createdAt ? date(vendor.createdAt) : null}
                />
              </div>
              {vendor.registeredLocation && (
                <DetailRow
                  icon={MapPin}
                  label="Registered location"
                  value={vendor.registeredLocation}
                />
              )}
            </dl>
          </DetailSection>

          <section className="min-w-0 rounded-2xl border border-[#e1e6d9] bg-[#f8faf4] p-5">
            <p className="mb-2 mt-0 text-[9px] font-medium uppercase tracking-[1.5px] text-[#6b795e]">
              Your vendor ID
            </p>
            <p className="m-0 break-all font-mono text-[11px] leading-[1.8] text-[#627450]">
              {vendor.id || "Not available"}
            </p>
            <p className="mb-0 mt-3 text-[10px] leading-relaxed text-[#6b795e]">
              Keep this handy when contacting the MarryNest team.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
