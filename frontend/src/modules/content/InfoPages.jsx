import { State, Pagination } from "./ContentState";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  HeartHandshake,
  Sparkles,
  Mail,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Send,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useContent,
  contentSave,
  button,
  primary,
  input,
  panel,
  types,
  privacyTypes,
  date,
} from "./api";
import { mediaContent } from "../media/api";
import "./content.css";
const routes = {
  "about-us": "/about",
  contact: "/contact",
  terms: "/terms-and-conditions",
  privacy: "/privacy-policy",
};
export function ContentMeta({ pageKey, page, noindex = false }) {
  const location = useLocation();
  useEffect(() => {
    const previousTitle = document.title,
      description = document.querySelector('meta[name="description"]'),
      oldDescription = description?.getAttribute("content");
    document.title = `${page?.content.metaTitle || { terms: "Terms & Conditions", privacy: "Privacy Policy", contact: "Contact us", "about-us": "About us" }[pageKey]} | MarryNest`;
    description?.setAttribute(
      "content",
      page?.content.metaDescription ||
        "Information about MarryNest wedding and event marketplace.",
    );
    const saved = [];
    for (const [selector, tag, attribute, value] of [
      [
        'link[rel="canonical"]',
        "link",
        "href",
        new URL(routes[pageKey], window.location.origin).href,
      ],
      [
        'meta[name="robots"]',
        "meta",
        "content",
        noindex ? "noindex, nofollow" : "index, follow",
      ],
    ]) {
      let el = document.querySelector(selector),
        created = !el;
      if (!el) {
        el = document.createElement(tag);
        el.setAttribute(
          tag === "link" ? "rel" : "name",
          tag === "link" ? "canonical" : "robots",
        );
        document.head.append(el);
      }
      const old = el.getAttribute(attribute);
      el.setAttribute(attribute, value);
      saved.push({ el, created, attribute, old });
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      document.title = previousTitle;
      if (oldDescription !== null && description)
        description.setAttribute("content", oldDescription);
      for (const { el, created, attribute, old } of saved)
        if (created) el.remove();
        else if (old === null) el.removeAttribute(attribute);
        else el.setAttribute(attribute, old);
    };
  }, [pageKey, page, noindex, location.pathname]);
  return null;
}
function CTAs({ ctas = [] }) {
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      {ctas
        .filter((c) =>
          /^\/(services|vendors|packages|contact|about|auth\/signup|privacy-policy|terms-and-conditions)(?:\?|\/|$)/.test(
            c.href,
          ),
        )
        .map((cta, i) => (
          <Link
            key={`${cta.href}:${i}`}
            className={i ? button : primary}
            to={cta.href}
          >
            {cta.label}
            <ArrowUpRight size={15} />
          </Link>
        ))}
    </div>
  );
}
export function AboutView({ page }) {
  const c = page.content;
  return (
    <div className="info-site">
      <section className="info-wrap info-hero info-reveal">
        <div>
          <p className="info-kicker">OUR PURPOSE, YOUR CELEBRATION</p>
          <h1>{c.title}</h1>
          <p className="info-intro info-body">{c.introduction}</p>
          <CTAs ctas={c.ctas} />
        </div>
        <img
          src={
            c.heroMediaId
              ? mediaContent(c.heroMediaId)
              : "/images/wedding-garden-1024.webp"
          }
          alt={c.imageAlt}
          fetchPriority="high"
        />
      </section>
      <section className="info-wrap">
        <div className="grid gap-8 md:grid-cols-3">
          {c.sections.map((s) => (
            <article key={s.id} className="info-feature">
              <HeartHandshake
                className="mb-5 text-[#9b8468]"
                strokeWidth={1.3}
              />
              <h2>{s.title}</h2>
              <p className="info-body text-sm text-[#7b786e]">{s.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="info-wrap">
        <p className="info-kicker">SERVICES FOR EVERY DETAIL</p>
        <h2 className="mt-3">Find the people who bring it together.</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.categories?.map((category) => {
            const override = c.categoryOverrides.find(
              (o) => o.categoryId === category.id,
            );
            return (
              <Link
                className="info-feature block transition-transform hover:-translate-y-1"
                to={`/services?category=${category.id}`}
                key={category.id}
              >
                {override?.mediaId ? (
                  <img
                    className="mb-4 h-36 w-full rounded-lg object-cover"
                    src={mediaContent(override.mediaId, "card")}
                    alt={category.name}
                    loading="lazy"
                  />
                ) : (
                  <Sparkles className="mb-4 text-[#9b8468]" size={24} />
                )}
                <h3>{category.name}</h3>
                <p className="text-sm text-[#7b786e]">
                  {override?.description || category.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs text-[#795258]">
                  Explore services
                  <ArrowUpRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="info-wrap">
        <h2>Why plan with us?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {c.benefits.map((b) => (
            <article key={b.id} className="info-feature">
              <h3>{b.title}</h3>
              <p className="info-body text-sm text-[#7b786e]">{b.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="info-wrap">
        <h2>From the first idea to the final detail.</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.steps.map((s, i) => (
            <li className="info-feature" key={i}>
              <span className="mb-3 block text-3xl text-[#bfa888]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>
      <section className="info-wrap grid gap-6 md:grid-cols-2">
        {[
          ["For customers", c.customerBenefits],
          ["For vendors", c.vendorBenefits],
        ].map(([title, list]) => (
          <div className="info-feature" key={title}>
            <h2>{title}</h2>
            <ul className="space-y-3">
              {list.map((s, i) => (
                <li className="flex gap-3 text-sm" key={i}>
                  <CheckCircle2
                    size={17}
                    className="mt-1 shrink-0 text-[#829576]"
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="info-wrap text-center">
        <h2>Your next chapter starts with a conversation.</h2>
        <div className="flex justify-center">
          <CTAs ctas={c.ctas} />
        </div>
      </section>
    </div>
  );
}
export function AboutPage() {
  const state = useContent("/cms/about-us");
  return (
    <main id="main-content" className="info-site">
      <ContentMeta
        pageKey="about-us"
        page={state.data}
        noindex={!!state.error}
      />
      <State state={state} />
      {state.data && <AboutView page={state.data} />}
    </main>
  );
}
export function ContactForm({ settings }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null),
    key = useRef(crypto.randomUUID()),
    form = useRef(null),
    success = useRef(null);
  if (!settings.formEnabled)
    return (
      <p className={panel}>
        The contact form is currently unavailable. Use the published contact
        information to reach the team.
      </p>
    );
  return (
    <section className={panel}>
      <h2>Tell us how we can help.</h2>
      {result ? (
        <div
          ref={success}
          tabIndex={-1}
          role="status"
          className="rounded-xl bg-[#eef4e8] p-6"
        >
          <CheckCircle2 className="mb-3 text-[#6f8b5e]" />
          <h3>Your inquiry is saved.</h3>
          <p className="text-sm">
            Reference: <strong className="break-all">{result.reference}</strong>
          </p>
          <p className="mt-3 text-sm">Keep this reference for follow-up.</p>
          <button
            className={`${button} mt-4`}
            onClick={() => {
              key.current = crypto.randomUUID();
              setResult(null);
            }}
          >
            Send another inquiry
          </button>
        </div>
      ) : (
        <form
          ref={form}
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const f = new FormData(e.currentTarget),
              body = Object.fromEntries(f);
            body.consent = f.get("consent") === "on";
            setBusy(true);
            setError("");
            try {
              const saved = await contentSave("/contact", "POST", {
                ...body,
                requestKey: key.current,
              });
              setResult(saved);
              requestAnimationFrame(() => success.current?.focus());
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Full name
            <input
              className={`${input} mt-1`}
              name="fullName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={200}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Email address
              <input
                className={`${input} mt-1`}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
              />
            </label>
            <label className="block text-sm">
              Phone {settings.phoneRequired ? "" : "(optional)"}
              <input
                className={`${input} mt-1`}
                name="phone"
                type="tel"
                autoComplete="tel"
                required={settings.phoneRequired}
                pattern="\+?[1-9][0-9]{7,14}"
                maxLength={20}
              />
            </label>
          </div>
          <label className="block text-sm">
            Subject
            <input
              className={`${input} mt-1`}
              name="subject"
              required
              minLength={3}
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            Inquiry type
            <select className={`${input} mt-1`} name="category" required>
              {Object.entries(types).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Message
            <textarea
              className={`${input} mt-1`}
              name="message"
              required
              minLength={20}
              maxLength={5000}
              rows={6}
            />
            <span className="text-xs text-[#7b786e]">
              Please avoid sending passwords, payment card information or
              identity documents.
            </span>
          </label>
          <div hidden aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input className="mt-1" type="checkbox" name="consent" required />
            <span>
              I agree to the use of this information to handle my inquiry.{" "}
              <Link className="underline" to="/privacy-policy">
                Privacy policy
              </Link>
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <button className={primary} disabled={busy}>
            <Send size={15} />
            {busy ? "Saving your inquiry…" : "Send inquiry"}
          </button>
        </form>
      )}
    </section>
  );
}
export function ContactView({ page, preview = false }) {
  const c = page.content,
    info = c.contact;
  return (
    <div className="info-site">
      <header className="info-wrap max-w-4xl text-center">
        <p className="info-kicker">HERE TO HELP</p>
        <h1>{c.title}</h1>
        <p className="info-intro mx-auto info-body">{c.introduction}</p>
      </header>
      <section className="info-wrap !pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              Mail,
              "Email",
              info.supportEmail,
              info.supportEmail ? `mailto:${info.supportEmail}` : null,
            ],
            [
              Phone,
              "Phone",
              info.phone,
              info.phone ? `tel:${info.phone}` : null,
            ],
            [MapPin, "Business address", info.address, null],
            [Clock, "Working hours", info.workingHours, null],
          ].map(([Icon, title, value, href]) => (
            <div className={panel} key={title}>
              <Icon className="mb-3 text-[#a68b6c]" size={24} />
              <h3>{title}</h3>
              {value ? (
                href ? (
                  <a className="break-all text-sm underline" href={href}>
                    {value}
                  </a>
                ) : (
                  <p className="info-body text-sm">{value}</p>
                )
              ) : (
                <p className="text-sm text-[#8a8375]">Not published yet</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
          {preview ? (
            <div className={panel}>
              <h2>Inquiry form</h2>
              <p>
                Preview only. Form submissions are disabled in the content
                preview.
              </p>
            </div>
          ) : (
            <ContactForm settings={info} />
          )}
          <aside className={`${panel} space-y-6`}>
            <p className="info-kicker">{info.companyName}</p>
            <h2>A little guidance. A clearer next step.</h2>
            <p className="text-sm text-[#7b786e]">
              For a booking or quotation inquiry, include the reference number
              so the team can locate the relevant record.
            </p>
            <div className="flex flex-wrap gap-3">
              {info.socialLinks
                .filter((s) => /^https:\/\//.test(s.url))
                .map((s) => (
                  <a
                    className={button}
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {s.label}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
            </div>
            {page.mapsEnabled &&
              info.addressVerified &&
              info.mapUrl &&
              info.address && (
                <div className="rounded-xl bg-[#f4f0e7] p-5">
                  <MapPin className="mb-2" />
                  <p className="mb-3 text-sm">{info.address}</p>
                  <a
                    className={button}
                    href={info.mapUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    View verified location
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              )}
          </aside>
        </div>
      </section>
      <section className="info-wrap">
        <h2>Helpful answers</h2>
        <div className="space-y-3">
          {c.faqs.map((f) => (
            <details className={panel} key={f.id}>
              <summary className="cursor-pointer font-medium">
                {f.title}
              </summary>
              <p className="info-body mt-4 text-sm">{f.body}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
export function ContactPage() {
  const state = useContent("/cms/contact");
  return (
    <main id="main-content" className="info-site">
      <ContentMeta
        pageKey="contact"
        page={state.data}
        noindex={!!state.error}
      />
      <State state={state} />
      {state.data && <ContactView page={state.data} />}
    </main>
  );
}
export function LegalView({ page }) {
  const c = page.content;
  return (
    <div className="info-site">
      <header className="info-wrap">
        <p className="info-kicker">THE DETAILS THAT MATTER</p>
        <h1>{c.title}</h1>
        <div className="mb-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#85786b]">
          <span>Version {page.version}</span>
          <span>Last updated: {date(page.publishedAt || page.updatedAt)}</span>
          <span>Effective: {date(page.effectiveDate)}</span>
          <button
            className="info-print-hide inline-flex items-center gap-2 underline"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            Print
          </button>
        </div>
        <p className="info-intro info-body">{c.introduction}</p>
      </header>
      <div className="info-wrap info-legal !pt-0">
        <nav
          className="info-toc info-print-hide"
          aria-label="Document table of contents"
        >
          <p className="info-kicker mb-3">ON THIS PAGE</p>
          {c.sections.map((s, i) => (
            <a
              key={s.id}
              href={`#document-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(`document-${s.id}`);
                el?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                });
                el?.focus({ preventScroll: true });
              }}
            >
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
        <article className="info-document">
          {c.sections.map((s, i) => (
            <section key={s.id} id={`document-${s.id}`} tabIndex={-1}>
              <h2>
                {i + 1}. {s.title}
              </h2>
              <p className="info-body">{s.body}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
export function LegalPage({ documentKey = "privacy" }) {
  const state = useContent(`/cms/${documentKey}`);
  return (
    <main id="main-content" className="info-site">
      <ContentMeta
        pageKey={documentKey}
        page={state.data}
        noindex={!state.data}
      />
      {state.loading ? (
        <State state={state} />
      ) : state.data ? (
        <LegalView page={state.data} />
      ) : state.status && state.status !== 404 ? (
        <section className="info-wrap">
          <h1>
            {documentKey === "terms" ? "Terms & Conditions" : "Privacy Policy"}
          </h1>
          <State state={state} />
        </section>
      ) : (
        <section className="info-wrap">
          <ShieldCheck className="text-[#94836b]" />
          <h1>
            {documentKey === "terms" ? "Terms & Conditions" : "Privacy Policy"}
          </h1>
          <p className="info-intro">
            The platform owner has not published this document yet.
          </p>
          <p className="mt-5 max-w-2xl text-sm text-[#817769]">
            Legal wording is published after administrator approval and
            professional review.
          </p>
          <Link className={`${button} mt-7`} to="/contact">
            Contact the team
          </Link>
        </section>
      )}
      {documentKey === "privacy" && (
        <section className="info-wrap info-print-hide" id="privacy-requests">
          <PrivacyCenter />
        </section>
      )}
    </main>
  );
}
export function PrivacyCenter() {
  const { user } = useAuth(),
    [version, setVersion] = useState(0),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    requestKey = useRef(crypto.randomUUID()),
    requests = useContent(
      user ? `/privacy-requests/my-requests?page=${page}` : null,
      `${user?.id}:${version}`,
    ),
    legal = useContent(
      user ? "/legal/acceptance-status" : null,
      `${user?.id}:${version}`,
    );
  if (!user)
    return (
      <div className={panel}>
        <h2>Privacy requests</h2>
        <p className="mb-5 text-sm">
          Sign in to submit and track a request about your information.
        </p>
        <Link className={primary} to="/auth/login">
          Sign in
        </Link>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className={panel}>
        <h2>Your legal and privacy center</h2>
        <p className="mb-5 text-sm text-[#7b786e]">
          Read published documents before accepting them. Submitting a privacy
          request does not automatically delete account, booking or payment
          records.
        </p>
        <State state={legal} />
        {legal.data?.current.map((document) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece5db] py-4"
            key={document.id}
          >
            <div>
              <Link className="underline" to={routes[document.type]}>
                {document.type === "terms"
                  ? "Terms & Conditions"
                  : "Privacy Policy"}{" "}
                · Version {document.version}
              </Link>
              <p className="text-xs text-[#7b786e]">
                {document.accepted
                  ? "Accepted"
                  : document.needsAcceptance
                    ? "Your explicit acceptance is required"
                    : "Acceptance is optional"}
              </p>
            </div>
            {!document.accepted && (
              <button
                className={button}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await contentSave("/legal/accept", "POST", {
                      explicit: true,
                      versionIds: [document.id],
                    });
                    setMessage("Your acceptance was recorded.");
                    setVersion((v) => v + 1);
                  } catch (err) {
                    setMessage(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                I have read and accept this version
              </button>
            )}
          </div>
        ))}
        {legal.data?.current.length === 0 && (
          <p className="text-sm">
            No published legal versions are currently available for acceptance.
          </p>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm">
            Your acceptance history
          </summary>
          {legal.data?.history.map((h) => (
            <p className="py-2 text-xs" key={h.id}>
              {h.type} · Version {h.version} · {date(h.acceptedAt)}
            </p>
          ))}
        </details>
      </div>
      {message && (
        <p className="rounded-xl bg-[#eef4e8] p-4 text-sm" role="status">
          {message}
        </p>
      )}
      <form
        className={`${panel} space-y-4`}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            body = Object.fromEntries(new FormData(form));
          setBusy(true);
          try {
            const r = await contentSave("/privacy-requests", "POST", {
              ...body,
              requestKey: requestKey.current,
              explicit: true,
            });
            setMessage(r.message);
            requestKey.current = crypto.randomUUID();
            form.reset();
            setVersion((v) => v + 1);
          } catch (err) {
            setMessage(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Request help with your information</h2>
        <label className="block text-sm">
          Request type
          <select name="requestType" className={`${input} mt-1`}>
            {Object.entries(privacyTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Tell us what you need
          <textarea
            name="description"
            className={`${input} mt-1`}
            rows={4}
            minLength={20}
            maxLength={5000}
            required
          />
        </label>
        <button className={primary} disabled={busy}>
          {busy ? "Saving…" : "Submit request for review"}
        </button>
      </form>
      <State state={requests} />
      {requests.data?.rows.map((r) => (
        <article className={panel} key={r.id}>
          <h3>{privacyTypes[r.type]}</h3>
          <p className="my-2 text-xs text-[#7b786e]">
            {r.status} · {date(r.createdAt)}
          </p>
          <p className="info-body text-sm">{r.description}</p>
          {r.response && (
            <div className="mt-4 rounded-xl bg-[#f2f4eb] p-4">
              <strong className="text-sm">Response from the team</strong>
              <p className="info-body text-sm">{r.response}</p>
            </div>
          )}
        </article>
      ))}
      <Pagination data={requests.data} page={page} setPage={setPage} />
    </div>
  );
}
export function LegalCenterPage() {
  return (
    <main className="info-site">
      <div className="info-wrap">
        <PrivacyCenter />
      </div>
    </main>
  );
}
