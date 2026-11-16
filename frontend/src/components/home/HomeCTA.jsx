import { Link } from "react-router-dom";
import { ArrowUpRight, Flower2 } from "lucide-react";
import venue from "../../assets/service-categories/venue.webp";

export default function HomeCTA({ about = false }) {
  return (
    <section
      aria-labelledby="home-cta-heading"
      className="mx-auto max-w-[1320px] px-[6%] py-14 sm:px-[5%] lg:py-20"
    >
      <div className="grid overflow-hidden rounded-[24px] bg-[#713845] text-[#fff7ee] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden px-7 py-10 sm:p-12 lg:p-14">
          <Flower2
            size={200}
            strokeWidth={0.5}
            className="pointer-events-none absolute -bottom-12 -left-12 text-[#d7afa0]/15"
            aria-hidden="true"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-3 text-[9px] font-medium tracking-[2px] text-[#e3bfac]">
              <Flower2 size={18} strokeWidth={1} aria-hidden="true" />A
              BEAUTIFUL BEGINNING AWAITS
            </span>
            <h2
              id="home-cta-heading"
              className="mt-5 max-w-lg font-serif text-[#fff7ee]"
            >
              {about ? (
                "Ready to start planning?"
              ) : (
                <>
                  Let's make your
                  <br />
                  forever{" "}
                  <span className="font-serif italic text-[#edc7b2]">
                    begin beautifully.
                  </span>
                </>
              )}
            </h2>
            <p className="mt-5 max-w-sm text-[#ecd7d5]!">
              Find the people, the place and the little details that make your
              celebration unmistakably yours.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link
                to="/vendors"
                className="group inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-[#fff7ee] px-6 py-3 text-xs font-medium text-[#713845] transition-colors hover:bg-[#efdbcd] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff7ee]"
              >
                Explore vendors{" "}
                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/venues"
                className="inline-flex min-h-12 items-center justify-center gap-5 rounded-full border border-[#c99b9d] px-6 py-3 text-xs text-[#fff7ee] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff7ee]"
              >
                Find a venue <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="relative min-h-64 lg:min-h-full">
          <img
            src={venue}
            alt="A lakeside wedding venue at golden hour"
            width="900"
            height="680"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#34241b]/60 via-transparent to-transparent" />
          <span className="absolute bottom-7 left-7 right-7 font-serif text-2xl italic leading-snug text-white">
            For the moments
            <br />
            you'll remember forever.
          </span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-[#807174]">
        Are you a wedding professional?
        <Link
          to="/auth/signup?role=vendor"
          className="inline-flex min-h-11 items-center gap-2 font-medium text-rose-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-brand"
        >
          Grow with MarryNest <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
