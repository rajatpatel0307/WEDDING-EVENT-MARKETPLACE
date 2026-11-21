import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, CheckCircle2, ChevronDown, Clock, HeartHandshake,
  LoaderCircle, Mail, MapPin, MessageCircle, Phone, Plus, Send, ShieldCheck,
} from "lucide-react";
import { contentSave, types } from "./api";

const wrap = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.22em] text-[#96745d]";
const heading = "font-serif text-[30px] font-normal leading-[1.2] tracking-[-0.8px] text-[#523e42] sm:text-[36px]";
const label = "block min-w-0 text-[12px] font-medium text-[#665458]";
const field = "mt-2 block min-h-12 w-full min-w-0 rounded-lg border border-[#e2d9cf] bg-[#fcfaf7] px-4 py-3 text-[13px] font-normal leading-relaxed text-[#523e42] transition-colors placeholder:text-[#a29890] hover:border-[#baa69d] focus:border-[#995f67] focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-[#995f67]/30 user-invalid:border-[#b34f4f]";
const primary = "inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#804653] px-6 py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#683541] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#804653] disabled:cursor-wait disabled:opacity-60";

function Required() {
  return <span aria-hidden="true" className="ml-1 text-[#a3636b]">*</span>;
}

export function ContactForm({ settings }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const key = useRef(crypto.randomUUID());
  const form = useRef(null);
  const success = useRef(null);

  if (!settings.formEnabled) {
    return (
      <section className="rounded-2xl border border-[#e7ded3] bg-white p-7 sm:p-9">
        <MessageCircle size={28} strokeWidth={1.3} className="mb-5 text-[#a0816c]" aria-hidden="true" />
        <h2 className={heading}>Get in touch.</h2>
        <p className="mt-4 text-[14px] leading-relaxed text-[#7c7470]">
          The contact form is currently unavailable. Use the published contact
          information to reach the team.
        </p>
      </section>
    );
  }

  return (
    <section id="inquiry-form" aria-labelledby="inquiry-title" className="scroll-mt-28 rounded-2xl border border-[#e7ded3] bg-white p-6 shadow-[0_8px_40px_-28px_#74513c44] sm:p-9 lg:p-10">
      <div className="mb-7 border-b border-[#eee5dc] pb-7">
        <p className={eyebrow}>A conversation starts here</p>
        <h2 id="inquiry-title" className={`${heading} mt-3`}>Tell us how we can help.</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#85776f]">
          Share a few details and we’ll take it from there.
          <span className="mt-2 block text-[11px] text-[#99867c]">Fields marked <span className="text-[#a3636b]">*</span> are required.</span>
        </p>
      </div>

      {result ? (
        <div ref={success} tabIndex={-1} role="status" className="rounded-xl border border-[#dce4d4] bg-[#f0f4eb] p-6 sm:p-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-[#e1ead8] text-[#6f855c]"><CheckCircle2 size={26} strokeWidth={1.5} aria-hidden="true" /></span>
          <h3 className="mb-3 font-serif text-[27px] font-normal text-[#536448]">Your inquiry is saved.</h3>
          <p className="text-[13px] leading-relaxed text-[#6d7863]">Keep this reference for follow-up.</p>
          <p className="mt-5 rounded-lg border border-[#dce4d4] bg-white/70 p-4 text-[12px] text-[#6d7863]">Reference: <strong className="mt-1 block break-all font-mono text-[14px] text-[#536448]">{result.reference}</strong></p>
          <button
            type="button"
            className={`${primary} mt-6`}
            onClick={() => {
              key.current = crypto.randomUUID();
              setResult(null);
            }}
          >
            Send another inquiry <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <form
          ref={form}
          className="space-y-5"
          aria-busy={busy}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const f = new FormData(e.currentTarget);
            const body = Object.fromEntries(f);
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
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              Full name <Required />
              <input className={field} name="fullName" autoComplete="name" placeholder="Your full name" required minLength={2} maxLength={200} />
            </label>
            <label className={label}>
              Email address <Required />
              <input className={field} name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={320} />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              Phone {settings.phoneRequired ? <Required /> : <span className="ml-1 font-normal text-[#9a8d84]">(optional)</span>}
              <input className={field} name="phone" type="tel" autoComplete="tel" placeholder="Your phone number" required={settings.phoneRequired} pattern="\+?[1-9][0-9]{7,14}" maxLength={20} />
            </label>
            <label className={label}>
              Inquiry type <Required />
              <span className="relative block">
                <select className={`${field} appearance-none pr-10`} name="category" required>
                  {Object.entries(types).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#9b8275]" aria-hidden="true" />
              </span>
            </label>
          </div>
          <label className={label}>
            Subject <Required />
            <input className={field} name="subject" placeholder="What would you like to talk about?" required minLength={3} maxLength={200} />
          </label>
          <label className={label}>
            Message <Required />
            <textarea className={`${field} min-h-36 resize-y`} name="message" placeholder="Tell us a little more. If this is about a booking, include your reference number." required minLength={20} maxLength={5000} rows={5} aria-describedby="contact-message-help" />
            <span id="contact-message-help" className="mt-2 block text-[11px] font-normal leading-relaxed text-[#9a8d84]">
              Please avoid sending passwords, payment card information or identity documents.
            </span>
          </label>
          <div hidden aria-hidden="true">
            <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <label className="flex items-start gap-3 rounded-lg bg-[#faf7f2] p-4 text-[12px] leading-relaxed text-[#88766e]">
            <input className="mt-0.5 size-4 shrink-0 accent-[#804653]" type="checkbox" name="consent" required />
            <span>I agree to the use of this information to handle my inquiry. <Link className="text-[#804653] underline underline-offset-2 hover:text-[#683541]" to="/privacy-policy">Privacy policy</Link></span>
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eee5dc] pt-6">
            <span className="inline-flex items-center gap-2 text-[11px] text-[#8b8e7c]"><ShieldCheck size={15} strokeWidth={1.5} aria-hidden="true" />Your details, handled with care.</span>
            <button type="submit" className={`${primary} w-full sm:w-auto`} disabled={busy}>
              {busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              {busy ? "Saving your inquiry…" : "Send inquiry"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function ContactView({ page, preview = false }) {
  const c = page.content;
  const info = c.contact;
  const socialLinks = info.socialLinks.filter((s) => /^https:\/\//.test(s.url));
  const contacts = [
    { Icon: Mail, title: "Email us", value: info.supportEmail, href: info.supportEmail ? `mailto:${info.supportEmail}` : null },
    { Icon: Phone, title: "Give us a call", value: info.phone, href: info.phone ? `tel:${info.phone}` : null },
    { Icon: MapPin, title: "Find us", value: info.address },
    { Icon: Clock, title: "Working hours", value: info.workingHours },
  ];

  return (
    <div className="min-w-0 bg-[#fcfaf6] leading-relaxed text-[#523e42]">
      <header className="relative isolate overflow-hidden border-b border-[#ebe2d8] bg-linear-to-br from-[#fcfaf6] via-[#f8f2ec] to-[#f3e9e2]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-40 -z-10 size-[440px] rounded-full border border-[#decfc2]/60" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -bottom-64 -z-10 size-[460px] rounded-full border border-[#decfc2]/60" />
        <div className={`${wrap} py-10 text-center sm:py-14`}>
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#e3d6c9] bg-[#fffdf9]/80 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#947058]">
            <MessageCircle size={13} strokeWidth={1.5} aria-hidden="true" />Here to help
          </div>
          <h1 className="mx-auto max-w-[800px] wrap-anywhere font-serif text-[38px] leading-[1.12] tracking-[-1.5px] text-[#63474d] sm:text-[50px] lg:text-[56px]">{c.title}</h1>
          <p className="mx-auto mt-5 max-w-[600px] whitespace-pre-line wrap-anywhere text-[14px] leading-[1.85] text-[#8b7c73] sm:text-[15px]">{c.introduction}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-[#8c7f70]">
            <span className="inline-flex items-center gap-2"><HeartHandshake size={14} strokeWidth={1.5} aria-hidden="true" />A little guidance, every step of the way</span>
          </div>
        </div>
      </header>

      <div className={`${wrap} pt-8 pb-14 sm:pt-10 sm:pb-20`}>
        <section aria-label="Contact information" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {contacts.map(({ Icon, title, value, href }) => (
            <div key={title} className="flex min-w-0 items-start gap-4 rounded-xl border border-[#e7ded3] bg-white px-5 py-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f6f0e8] text-[#a38668]"><Icon size={19} strokeWidth={1.4} aria-hidden="true" /></span>
              <div className="min-w-0 pt-0.5">
                <h2 className="font-sans text-[13px] font-semibold tracking-normal text-[#665458]">{title}</h2>
                {value ? href
                  ? <a href={href} className="mt-2 inline-block break-all text-[12px] leading-relaxed text-[#8a5a63] underline decoration-[#c8adb0] underline-offset-4 hover:text-[#683541]">{value}</a>
                  : <p className="mt-2 whitespace-pre-line wrap-anywhere text-[12px] leading-relaxed text-[#8b7d71]">{value}</p>
                  : <p className="mt-2 text-[11px] text-[#a09488]">Not published yet</p>}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-7 grid items-start gap-6 lg:mt-9 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-8">
          {preview ? (
            <section className="rounded-2xl border border-[#e7ded3] bg-white p-7 sm:p-9">
              <p className={eyebrow}>A conversation starts here</p>
              <h2 className={`${heading} mt-3`}>Inquiry form</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-[#7c7470]">Preview only. Form submissions are disabled in the content preview.</p>
            </section>
          ) : <ContactForm settings={info} />}

          <aside aria-label="Inquiry guidance" className="min-w-0 space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-[#70404c] p-7 sm:p-8">
              <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-28 size-64 rounded-full border border-white/10" />
              <span className="relative mb-7 flex size-12 items-center justify-center rounded-full border border-[#d4aca7]/30 text-[#dfbdad]"><HeartHandshake size={25} strokeWidth={1.2} aria-hidden="true" /></span>
              <p className="relative text-[9px] font-medium uppercase tracking-[0.24em] text-[#dfbeb6]">{info.companyName}</p>
              <h2 className="relative mt-4 font-serif text-[31px] font-normal leading-[1.2] tracking-[-0.6px] text-[#fff8ef]">A little guidance.<br /><span className="italic text-[#e7c5bb]">A clearer next step.</span></h2>
              <p className="relative mt-5 text-[13px] leading-[1.85] text-[#e3ced0]">For a booking inquiry, include the reference number so the team can locate the relevant record.</p>
              <ol className="relative mt-7 space-y-5 border-t border-white/15 pt-6">
                {[
                  ["Choose a topic", "Pick the inquiry type that best fits your question."],
                  ["Share the details", "Include your booking reference or event requirements."],
                  ["Keep your reference", "Save the inquiry number shown after you submit."],
                ].map(([title, description], i) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#d4aca7]/35 font-serif text-[12px] italic text-[#e7c5bb]">{i + 1}</span>
                    <div><h3 className="mb-1 text-[12px] font-medium text-[#fff4ec]">{title}</h3><p className="text-[11px] leading-relaxed text-[#cfaeb3]">{description}</p></div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-[#dfe2d5] bg-[#f0f1e8] p-6 sm:p-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a8e72]">A little inspiration</p>
              <h3 className="mt-3 mb-3 font-serif text-[24px] font-normal leading-tight tracking-[-0.5px] text-[#626b55]">Still finding your perfect fit?</h3>
              <p className="text-[12px] leading-relaxed text-[#858873]">Discover the venues and professionals who can bring your celebration together.</p>
              <Link to="/services" className="mt-5 inline-flex items-center gap-3 rounded-md py-1 text-[12px] font-medium text-[#66734f] hover:text-[#465536] hover:underline">Explore services <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>

            {socialLinks.length > 0 && (
              <div className="rounded-2xl border border-[#e7ded3] bg-white p-6 sm:p-7">
                <p className={eyebrow}>Stay connected</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e6dcd3] px-3 py-2 text-[11px] text-[#8a5a63] hover:border-[#b48a8c] hover:bg-[#fbf5f2]">{s.label}<ArrowUpRight size={13} aria-hidden="true" /></a>)}
                </div>
              </div>
            )}

            {page.mapsEnabled && info.addressVerified && info.mapUrl && info.address && (
              <div className="rounded-2xl border border-[#e7ded3] bg-[#f7f1e8] p-6 sm:p-7">
                <MapPin size={23} strokeWidth={1.3} className="mb-4 text-[#a38668]" aria-hidden="true" />
                <p className={eyebrow}>Find your way to us</p>
                <p className="mt-3 whitespace-pre-line wrap-anywhere text-[13px] leading-relaxed text-[#8b7d71]">{info.address}</p>
                <a href={info.mapUrl} target="_blank" rel="noreferrer noopener" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#ddcfbf] bg-white/70 px-4 py-2 text-[11px] text-[#8a5a63] hover:bg-white">View verified location <ArrowUpRight size={13} aria-hidden="true" /></a>
              </div>
            )}
          </aside>
        </div>
      </div>

      {c.faqs.length > 0 && (
        <section aria-labelledby="faq-title" className="border-t border-[#e8dfd3] bg-[#f5f0e8] py-14 sm:py-18">
          <div className={`${wrap} grid gap-8 lg:grid-cols-[1fr_1.65fr] lg:gap-16`}>
            <div>
              <p className={eyebrow}>A few helpful answers</p>
              <h2 id="faq-title" className={`${heading} mt-4`}>A little clarity,<br /><span className="italic text-[#995f67]">before you ask.</span></h2>
              <p className="mt-5 max-w-[300px] text-[13px] leading-[1.85] text-[#8b7d71]">Start with the questions we hear about planning, bookings, and working with MarryNest.</p>
            </div>
            <div className="space-y-3">
              {c.faqs.map((faq) => (
                <details key={faq.id} className="group overflow-hidden rounded-xl border border-[#e5dbcf] bg-[#fffdf9] open:border-[#ceb9af]">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[14px] font-medium text-[#6a5355] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#995f67] sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 wrap-anywhere">{faq.title}</span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f4ede6] text-[#a0806b] transition-colors group-open:bg-[#efe1db]"><Plus size={15} strokeWidth={1.5} className="transition-transform group-open:rotate-45" aria-hidden="true" /></span>
                  </summary>
                  <p className="mx-5 border-t border-[#eee5db] pt-4 pb-5 whitespace-pre-line wrap-anywhere text-[13px] leading-[1.85] text-[#88786e] sm:mx-6">{faq.body}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
