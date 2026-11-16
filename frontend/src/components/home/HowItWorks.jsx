import {
  Search,
  Layers,
  CalendarCheck,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  [
    "Discover your favourites",
    "Find venues and wedding professionals that feel right for your celebration.",
    Search,
  ],
  [
    "Compare the details",
    "Explore services, starting prices, reviews and packages, all in one place.",
    Layers,
  ],
  [
    "Make a plan together",
    "Discuss your dates and requirements with your vendor. Booking tools are coming soon.",
    CalendarCheck,
  ],
  [
    "Enjoy every moment",
    "Bring your people together and make memories that stay with you.",
    Heart,
  ],
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="planning-heading"
      className="relative overflow-hidden border-y border-[#e8dcd2] bg-[#f1e8df]"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full border border-[#dfcbbd]/60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-44 -left-32 size-96 rounded-full border border-[#dfcbbd]/60"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1320px] px-[6%] py-14 sm:px-[5%] lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <span className="text-[10px] font-semibold tracking-[2px] text-rose-brand">
            LESS OVERWHELM. MORE BUTTERFLIES.
          </span>
          <h2 id="planning-heading" className="mt-4 font-serif">
            A beautiful day.
            <br />
            <em>A simpler way to get there.</em>
          </h2>
          <p className="mt-4">
            One thoughtful step at a time, from your first idea to the
            celebration you imagine.
          </p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-5">
          {steps.map(([title, copy, Icon], i) => (
            <li
              key={title}
              className="group relative rounded-2xl border border-white/80 bg-[#fffdfa]/80 p-6 transition-colors hover:bg-white"
            >
              <div className="mb-7 flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-full bg-[#f1e5df] text-rose-brand">
                  <Icon size={21} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <span
                  className="font-serif text-3xl italic text-[#cfb6a5]"
                  aria-hidden="true"
                >
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-[20px]!">{title}</h3>
              <p className="mt-3 text-xs!">{copy}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Link
            to="/vendors"
            className="inline-flex min-h-11 items-center gap-3 border-b border-rose-brand/30 text-xs font-medium text-rose-brand transition-colors hover:border-rose-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand"
          >
            Find your first favourite{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
