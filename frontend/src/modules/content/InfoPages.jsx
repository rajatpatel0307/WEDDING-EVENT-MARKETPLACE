import { State, Pagination } from "./ContentState";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Printer,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useContent,
  contentSave,
  button,
  primary,
  input,
  panel,
  privacyTypes,
  date,
} from "./api";
import AboutView from "./AboutView";
import ContactView, { ContactForm } from "./ContactView";

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
export { AboutView };
export function AboutPage() {
  const state = useContent("/cms/about-us");
  return (
    <main id="main-content" className="min-w-0 bg-[#fcfaf6] leading-relaxed text-[#523e42]">
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
export { ContactView, ContactForm };
export function ContactPage() {
  const state = useContent("/cms/contact");
  return (
    <main id="main-content" className="min-w-0 bg-[#fcfaf6] leading-relaxed text-[#523e42]">
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
    <div className="info-site text-[#4b4840] bg-[#fcfaf6] [font-family:inherit] leading-[1.75] min-w-0 [&_h1]:text-[length:clamp(34px,5vw,64px)] [&_h1]:leading-[1.15] [&_h1]:tracking-[-1.6px] [&_h1]:font-medium [&_h1]:text-[#654a4c] [&_h1]:mt-[12px] [&_h1]:mx-0 [&_h1]:mb-[22px] [&_h2]:text-[length:clamp(24px,3vw,35px)] [&_h2]:leading-[1.3] [&_h2]:text-[#654a4c] [&_h2]:mb-[18px] [&_h2]:font-medium [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:mb-[10px] print:bg-white print:text-black print:[&_h1]:text-[30px] print:[&_h1]:tracking-normal print:[&_h2]:text-[22px]">
      <header className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0">
        <p className="info-kicker [&&]:text-[10px] [&&]:tracking-[3px] [&&]:uppercase [&&]:text-[#8c7762]">THE DETAILS THAT MATTER</p>
        <h1>{c.title}</h1>
        <div className="mb-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#85786b]">
          <span>Version {page.version}</span>
          <span>Last updated: {date(page.publishedAt || page.updatedAt)}</span>
          <span>Effective: {date(page.effectiveDate)}</span>
          <button
            className="info-print-hide print:[&&]:hidden inline-flex items-center gap-2 underline"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            Print
          </button>
        </div>
        <p className="info-intro [&&]:text-[17px] [&&]:leading-[1.9] [&&]:text-[#7c776c] [&&]:max-w-[700px] info-body [&&]:whitespace-pre-line [&&]:wrap-anywhere">{c.introduction}</p>
      </header>
      <div className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0 info-legal [&&]:grid [&&]:grid-cols-[240px_minmax(0,1fr)] [&&]:gap-[60px] [&&]:items-start max-[760.001px]:[&&]:grid-cols-[1fr] max-[760.001px]:[&&]:gap-[24px] print:[&&]:block !pt-0">
        <nav
          className="info-toc [&&]:sticky [&&]:top-[110px] [&&]:max-h-[75vh] [&&]:overflow-auto [&&]:text-[12px] [&&_a]:block [&&_a]:py-[7px] [&&_a]:px-0 [&&_a]:text-[#817565] max-[760.001px]:[&&]:static max-[760.001px]:[&&]:max-h-[260px] max-[760.001px]:[&&]:border-b max-[760.001px]:[&&]:border-b-[#e6dfd5] max-[760.001px]:[&&]:pb-[20px] info-print-hide print:[&&]:hidden"
          aria-label="Document table of contents"
        >
          <p className="info-kicker [&&]:text-[10px] [&&]:tracking-[3px] [&&]:uppercase [&&]:text-[#8c7762] mb-3">ON THIS PAGE</p>
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
        <article className="info-document [&&]:max-w-[760px] [&&_section]:scroll-mt-[120px] [&&_section]:pt-[10px] [&&_section]:px-0 [&&_section]:pb-[28px] [&&_section_h2]:text-[25px] [&&_p]:text-[15px] print:[&&]:max-w-none print:[&&_section]:break-inside-avoid">
          {c.sections.map((s, i) => (
            <section key={s.id} id={`document-${s.id}`} tabIndex={-1}>
              <h2>
                {i + 1}. {s.title}
              </h2>
              <p className="info-body [&&]:whitespace-pre-line [&&]:wrap-anywhere">{s.body}</p>
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
    <main id="main-content" className="info-site text-[#4b4840] bg-[#fcfaf6] [font-family:inherit] leading-[1.75] min-w-0 [&_h1]:text-[length:clamp(34px,5vw,64px)] [&_h1]:leading-[1.15] [&_h1]:tracking-[-1.6px] [&_h1]:font-medium [&_h1]:text-[#654a4c] [&_h1]:mt-[12px] [&_h1]:mx-0 [&_h1]:mb-[22px] [&_h2]:text-[length:clamp(24px,3vw,35px)] [&_h2]:leading-[1.3] [&_h2]:text-[#654a4c] [&_h2]:mb-[18px] [&_h2]:font-medium [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:mb-[10px] print:bg-white print:text-black print:[&_h1]:text-[30px] print:[&_h1]:tracking-normal print:[&_h2]:text-[22px]">
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
        <section className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0">
          <h1>
            {documentKey === "terms" ? "Terms & Conditions" : "Privacy Policy"}
          </h1>
          <State state={state} />
        </section>
      ) : (
        <section className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0">
          <ShieldCheck className="text-[#94836b]" />
          <h1>
            {documentKey === "terms" ? "Terms & Conditions" : "Privacy Policy"}
          </h1>
          <p className="info-intro [&&]:text-[17px] [&&]:leading-[1.9] [&&]:text-[#7c776c] [&&]:max-w-[700px]">
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
        <section className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0 info-print-hide print:[&&]:hidden" id="privacy-requests">
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
          <p className="info-body [&&]:whitespace-pre-line [&&]:wrap-anywhere text-sm">{r.description}</p>
          {r.response && (
            <div className="mt-4 rounded-xl bg-[#f2f4eb] p-4">
              <strong className="text-sm">Response from the team</strong>
              <p className="info-body [&&]:whitespace-pre-line [&&]:wrap-anywhere text-sm">{r.response}</p>
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
    <main className="info-site text-[#4b4840] bg-[#fcfaf6] [font-family:inherit] leading-[1.75] min-w-0 [&_h1]:text-[length:clamp(34px,5vw,64px)] [&_h1]:leading-[1.15] [&_h1]:tracking-[-1.6px] [&_h1]:font-medium [&_h1]:text-[#654a4c] [&_h1]:mt-[12px] [&_h1]:mx-0 [&_h1]:mb-[22px] [&_h2]:text-[length:clamp(24px,3vw,35px)] [&_h2]:leading-[1.3] [&_h2]:text-[#654a4c] [&_h2]:mb-[18px] [&_h2]:font-medium [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:mb-[10px] print:bg-white print:text-black print:[&_h1]:text-[30px] print:[&_h1]:tracking-normal print:[&_h2]:text-[22px]">
      <div className="info-wrap [&&]:w-[min(1180px,calc(100%_-_40px))] [&&]:mx-auto [&&]:my-0 [&&]:py-[64px] [&&]:px-0 max-[760.001px]:[&&]:w-[calc(100%_-_32px)] max-[760.001px]:[&&]:py-[36px] print:[&&]:w-full print:[&&]:p-0">
        <PrivacyCenter />
      </div>
    </main>
  );
}
