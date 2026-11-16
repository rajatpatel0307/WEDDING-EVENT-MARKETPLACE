import {
  ShieldCheck,
  BadgeIndianRupee,
  Flower2,
  Headphones,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import celebration from "../../assets/service-categories/decoration.webp";

const benefits = [
  [
    "People you can feel good about",
    "Explore approved professionals and the reviews on their listings.",
    ShieldCheck,
  ],
  [
    "A clearer picture of the price",
    "Compare listed starting prices, then ask your vendor exactly what's included.",
    BadgeIndianRupee,
  ],
  [
    "Every detail, brought together",
    "From the venue to the finishing touches, discover your team in one marketplace.",
    Flower2,
  ],
  [
    "A little help along the way",
    "Have a question? Send our team an inquiry when you need a helping hand.",
    Headphones,
  ],
];

export default function WhyChooseUs() {
  return (
    <section
      aria-labelledby="why-marrynest-heading"
      className="mx-auto grid max-w-[1320px] items-center gap-10 px-[6%] py-14 sm:px-[5%] lg:grid-cols-[0.95fr_1fr] lg:gap-16 lg:py-20"
    >
      <div className="relative pb-6 pr-6 sm:pb-8 sm:pr-8">
        <div
          className="absolute bottom-0 right-0 h-[85%] w-[85%] rounded-[24px] border border-[#dcc9bc] bg-[#eee3d9]"
          aria-hidden="true"
        />
        <img
          src={celebration}
          alt="Flowers and golden lights framing a wedding celebration"
          width="900"
          height="680"
          loading="lazy"
          decoding="async"
          className="relative aspect-[1.05] w-full rounded-[20px] object-cover"
        />
        <div className="absolute bottom-10 left-5 right-11 flex items-center gap-3 rounded-xl border border-white/70 bg-[#fffdfa]/95 p-4 shadow-lg sm:bottom-12 sm:left-7 sm:right-auto sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf0e7] text-[#657455]">
            <Check size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <span className="block font-serif text-lg">
              Your day, your way.
            </span>
            <span className="text-[10px] text-[#807174]">
              Thoughtfully brought together.
            </span>
          </div>
        </div>
      </div>
      <div>
        <span className="inline-flex items-center gap-3 text-[10px] font-semibold tracking-[2px] text-rose-brand">
          <span className="h-px w-7 bg-rose-brand/40" aria-hidden="true" />
          THE MARRYNEST DIFFERENCE
        </span>
        <h2 id="why-marrynest-heading" className="mt-4 font-serif">
          More joy in the journey.
          <br />
          <em>More you in every detail.</em>
        </h2>
        <p className="mt-4 max-w-lg">
          Because planning your wedding should feel as special as the day
          itself. Make considered choices, with a little more clarity and a
          little less stress.
        </p>
        <div className="mt-7 space-y-5">
          {benefits.map(([title, copy, Icon]) => (
            <article key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e5d8cf] bg-[#f5eee7] text-[#956555]">
                <Icon size={20} strokeWidth={1.4} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-sans! text-[13px]! font-medium! tracking-normal!">
                  {title}
                </h3>
                <p className="mt-1 text-xs!">{copy}</p>
              </div>
            </article>
          ))}
        </div>
        <Link
          to="/about"
          className="mt-7 inline-flex min-h-11 items-center gap-3 text-xs font-medium text-rose-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand"
        >
          A little more about us <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
