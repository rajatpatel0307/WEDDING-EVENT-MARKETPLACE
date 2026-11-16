import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowUpRight, CheckCircle2, Compass, Heart,
  HeartHandshake, Layers3, Search, Sparkles, Users,
} from "lucide-react";
import { mediaContent } from "../media/api";

const wrap = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.22em] text-[#96745d]";
const heading = "font-serif text-[32px] leading-[1.2] tracking-[-1px] text-[#523e42] sm:text-[40px]";
const copy = "whitespace-pre-line wrap-anywhere text-[15px] leading-[1.85] text-[#7c7470]";
const action = "group inline-flex min-h-12 items-center justify-center gap-3 rounded-lg px-5 py-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8c414e]";

function AboutActions({ ctas = [], light = false }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {ctas.filter((cta) => /^\/(services|vendors|packages|contact|about|auth\/signup|privacy-policy|terms-and-conditions)(?:\?|\/|$)/.test(cta.href)).map((cta, i) => (
        <Link
          key={`${cta.href}:${i}`}
          to={cta.href}
          className={`${action} ${i === 0
            ? light ? "bg-[#fff8ef] text-[#693b46] hover:bg-white hover:text-[#693b46]" : "bg-[#804653] text-white hover:bg-[#683541] hover:text-white"
            : i === 1
              ? light ? "border border-white/30 text-white hover:bg-white/10 hover:text-white" : "border border-[#ded3c8] bg-white/60 text-[#674c50] hover:border-[#a87a80] hover:bg-white"
              : light ? "text-[#f0dfe0] hover:text-white" : "text-[#765b5f] hover:bg-[#f0e7e2]"}`}
        >
          {cta.label}
          <ArrowUpRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      ))}
    </div>
  );
}

export default function AboutView({ page }) {
  const c = page.content;
  const titleParts = c.title.split(/(?<=[.!?])\s+/);
  const sectionIcons = [HeartHandshake, Compass, Sparkles];
  const benefitIcons = [Layers3, Search, Heart];

  return (
    <div className="min-w-0 bg-[#fcfaf6] text-[#523e42]">
      <section aria-labelledby="about-title" className="relative overflow-hidden border-b border-[#e9e1d7] bg-linear-to-br from-[#fcfaf6] via-[#fcfaf6] to-[#f2e9df]">
        <div className={`${wrap} grid items-center gap-12 pt-10 pb-12 sm:pt-14 sm:pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-14 lg:pb-20`}>
          <div className="min-w-0 lg:py-5">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#e5d8cb] bg-[#fffdf9] px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a47e5f]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#947058]">Our purpose, your celebration</span>
            </div>
            <h1 id="about-title" className="max-w-[620px] wrap-anywhere font-serif text-[42px] leading-[1.09] tracking-[-1.8px] text-[#523e42] sm:text-[56px] lg:text-[60px] xl:text-[66px]">
              {titleParts.map((part, i) => (
                <span key={i} className={i ? "block pt-1 font-normal italic text-[#995f67]" : "block"}>{part.trim()}</span>
              ))}
            </h1>
            <p className={`${copy} mt-6 max-w-[490px]`}>{c.introduction}</p>
            <div className="mt-8"><AboutActions ctas={c.ctas} /></div>
            <div className="mt-8 flex items-center gap-3 border-t border-[#e5dcd1] pt-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ecefe5] text-[#718168]"><Heart size={16} strokeWidth={1.5} aria-hidden="true" /></span>
              <p className="text-[12px] leading-relaxed text-[#81776f]">Thoughtfully planned.<br className="sm:hidden" /> <span className="font-serif italic text-[#76555b]">Wholeheartedly celebrated.</span></p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[530px] px-3 pb-6 sm:px-5 lg:px-0">
            <div aria-hidden="true" className="absolute inset-x-0 top-3 bottom-10 rounded-t-[220px] rounded-b-2xl border border-[#cdb9a0] sm:top-4 lg:-right-4 lg:left-4" />
            <figure className="relative overflow-hidden rounded-t-[220px] rounded-b-xl bg-[#e9e2d7] shadow-[0_18px_50px_-25px_#74513c66]">
              <img
                src={c.heroMediaId ? mediaContent(c.heroMediaId) : "/images/wedding-garden-1024.webp"}
                {...(!c.heroMediaId ? { srcSet: "/images/wedding-garden-640.webp 640w, /images/wedding-garden-1024.webp 1024w", sizes: "(min-width: 1024px) 45vw, (min-width: 640px) 530px, 90vw" } : {})}
                alt={c.imageAlt || "An elegant garden wedding with ivory flowers and warm golden light"}
                width="1024"
                height="1024"
                fetchPriority="high"
                className="h-[390px] w-full object-cover object-center sm:h-[500px] lg:h-[550px]"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-[#2e3026]/75 to-transparent" />
              <figcaption className="absolute inset-x-6 bottom-9 text-center sm:inset-x-10">
                <span className="text-[9px] uppercase tracking-[0.26em] text-[#ffecd1]">Beautiful beginnings, together</span>
                <p className="mt-2 font-serif text-[25px] italic leading-tight text-white sm:text-[29px]">For moments that become memories.</p>
              </figcaption>
            </figure>
            <div className="absolute -bottom-1 left-0 flex max-w-[calc(100%_-_16px)] items-center gap-3 rounded-xl border border-[#e9dfd3] bg-[#fffdf9] py-4 pr-6 pl-4 shadow-[0_8px_30px_-15px_#74513c44] sm:-left-5">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#f4e9e6] text-[#995f67]"><Sparkles size={20} strokeWidth={1.3} aria-hidden="true" /></span>
              <div><p className="text-[12px] font-semibold text-[#634b4e]">Every detail. One happy place.</p><p className="mt-0.5 text-[11px] text-[#8a7c73]">Your celebration, brought together.</p></div>
            </div>
          </div>
        </div>
        <a href="#our-story" className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#8b7868] hover:text-[#804653]">Get to know MarryNest <ArrowDown size={13} aria-hidden="true" /></a>
      </section>

      {c.sections.length > 0 && (
        <section id="our-story" aria-labelledby="story-title" className={`${wrap} scroll-mt-28 py-16 sm:py-22`}>
          <div className="mb-10 grid items-end gap-5 lg:grid-cols-2 lg:gap-16">
            <div><p className={eyebrow}>The heart behind MarryNest</p><h2 id="story-title" className={`${heading} mt-4`}>Big celebrations.<br /><span className="italic text-[#995f67]">A thoughtfully simple idea.</span></h2></div>
            <p className={`${copy} max-w-[460px] lg:pb-1`}>Behind every beautiful celebration are people who care. We bring them together, so you can focus on what matters to you.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {c.sections.map((section, i) => {
              const Icon = sectionIcons[i % sectionIcons.length];
              return (
                <article key={section.id} className={`rounded-2xl border p-7 sm:p-8 ${i % 3 === 1 ? "border-[#e2d2cf] bg-[#f3eae6]" : i % 3 === 2 ? "border-[#dfe2d5] bg-[#eff0e7]" : "border-[#e8dfd2] bg-[#f7f2e9]"}`}>
                  <div className="mb-7 flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-full border border-current/10 bg-white/60 text-[#8d675e]"><Icon size={22} strokeWidth={1.3} aria-hidden="true" /></span><span className="font-serif text-[15px] italic text-[#a39583]">0{i + 1}</span></div>
                  <h3 className="mb-3 font-serif text-[25px] font-normal tracking-[-0.5px] text-[#634b4e]">{section.title}</h3>
                  <p className={`${copy} text-[13px]`}>{section.body}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!!page.categories?.length && (
        <section aria-labelledby="categories-title" className="border-y border-[#ebe2d8] bg-[#f6f1e9] py-16 sm:py-20">
          <div className={wrap}>
            <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
              <div><p className={eyebrow}>Services for every detail</p><h2 id="categories-title" className={`${heading} mt-4 max-w-[560px]`}>Find the people who<br className="hidden sm:block" /> bring it all together.</h2></div>
              <Link to="/services" className="inline-flex items-center gap-3 rounded-lg py-3 text-[12px] font-medium text-[#804653] hover:underline">Explore all services <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.categories.map((category, i) => {
                const override = c.categoryOverrides.find((o) => o.categoryId === category.id);
                return (
                  <Link key={category.id} to={`/services?category=${category.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#e7dfd5] bg-[#fffdf9] transition-colors hover:border-[#b48a8c] hover:bg-white">
                    {override?.mediaId && <img className="h-44 w-full object-cover" src={mediaContent(override.mediaId, "card")} alt={category.name} loading="lazy" width="640" height="360" />}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-5 flex items-center justify-between"><Sparkles size={21} strokeWidth={1.3} className="text-[#a08164]" aria-hidden="true" /><span className="text-[10px] tracking-wider text-[#afa190]">{String(i + 1).padStart(2, "0")}</span></div>
                      <h3 className="mb-2 font-serif text-[23px] font-normal tracking-[-0.4px] text-[#634b4e]">{category.name}</h3>
                      <p className={`${copy} grow text-[13px]`}>{override?.description || category.description}</p>
                      <span className="mt-6 flex items-center justify-between border-t border-[#eee5db] pt-4 text-[11px] font-medium text-[#804653]">Explore services <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {c.benefits.length > 0 && (
        <section aria-labelledby="benefits-title" className={`${wrap} py-16 sm:py-22`}>
          <div className="mx-auto mb-12 max-w-[620px] text-center"><p className={eyebrow}>A little less effort. A lot more joy.</p><h2 id="benefits-title" className={`${heading} mt-4`}>Good plans start with<br /><span className="italic text-[#995f67]">a little peace of mind.</span></h2></div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {c.benefits.map((benefit, i) => {
              const Icon = benefitIcons[i % benefitIcons.length];
              return <article key={benefit.id} className="border-t border-[#ded5c9] pt-7"><Icon size={26} strokeWidth={1.3} className="mb-5 text-[#998167]" aria-hidden="true" /><h3 className="mb-3 font-serif text-[24px] font-normal text-[#634b4e]">{benefit.title}</h3><p className={`${copy} text-[13px]`}>{benefit.body}</p></article>;
            })}
          </div>
        </section>
      )}

      {c.steps.length > 0 && (
        <section aria-labelledby="steps-title" className={`${wrap} pb-16 sm:pb-22`}>
          <div className="rounded-2xl border border-[#e4ddd0] bg-[#f1f1e8] p-6 sm:p-10 lg:p-12">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className={eyebrow}>Your journey, made easier</p><h2 id="steps-title" className={`${heading} mt-4 max-w-[560px]`}>From the first idea<br />to the final detail.</h2></div><span className="flex size-12 items-center justify-center rounded-full border border-[#d0d5c1] text-[#768269]"><Compass size={24} strokeWidth={1.2} aria-hidden="true" /></span></div>
            <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {c.steps.map((step, i) => <li key={i} className="flex items-start gap-4 border-t border-[#d9dccb] pt-5"><span className="font-serif text-[28px] italic leading-none text-[#9b9f86]">{String(i + 1).padStart(2, "0")}</span><span className="pt-1 text-[14px] leading-relaxed text-[#5e6555]">{step}</span></li>)}
            </ol>
          </div>
        </section>
      )}

      <section aria-labelledby="community-title" className={`${wrap} pb-16 sm:pb-22`}>
        <div className="mb-9 text-center"><p className={eyebrow}>Two sides. One beautiful celebration.</p><h2 id="community-title" className={`${heading} mt-4`}>Better, together.</h2></div>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { label: "For customers", title: "Your day. Your kind of magic.", list: c.customerBenefits, Icon: Heart, className: "border-[#e9dcd7] bg-[#f7eeea]" },
            { label: "For vendors", title: "Your craft. A new connection.", list: c.vendorBenefits, Icon: Users, className: "border-[#e4ddce] bg-[#f5f1e6]" },
          ].map(({ label, title, list, Icon, className }) => (
            <article key={label} className={`rounded-2xl border p-7 sm:p-10 ${className}`}>
              <Icon size={26} strokeWidth={1.2} className="mb-6 text-[#9a7268]" aria-hidden="true" />
              <p className={eyebrow}>{label}</p><h3 className="mt-3 mb-6 font-serif text-[29px] font-normal leading-tight tracking-[-0.6px] text-[#634b4e]">{title}</h3>
              <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">{list.map((item, i) => <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#7b6c65]"><CheckCircle2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#8a956f]" aria-hidden="true" /><span>{item}</span></li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-cta-title" className="relative overflow-hidden bg-[#70404c] py-14 sm:py-18">
        <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-96 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 -left-32 size-[440px] rounded-full border border-white/10" />
        <div className={`${wrap} relative flex flex-col items-center text-center`}>
          <HeartHandshake size={28} strokeWidth={1.1} className="mb-5 text-[#debdaf]" aria-hidden="true" />
          <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#dfbeb6]">Let’s make something beautiful</p>
          <h2 id="about-cta-title" className="mt-4 max-w-[650px] font-serif text-[34px] leading-[1.2] tracking-[-0.8px] text-[#fff8ef] sm:text-[44px]">Your next chapter starts<br className="hidden sm:block" /> with a conversation.</h2>
          <p className="mt-5 max-w-[440px] text-[14px] leading-relaxed text-[#ead5d5]">Find your people, bring your ideas, and make room for a little more celebrating.</p>
          <div className="mt-8"><AboutActions ctas={c.ctas} light /></div>
        </div>
      </section>
    </div>
  );
}
