import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Flower2, Heart, MapPin } from "lucide-react";
import {
  useServiceGroups,
  servicePath,
} from "../../../components/layout/services";
const titles = {
  venues: "A place for your forever.",
  vendors: "Good people. Beautiful celebrations.",
  packages: "Your day, brought together.",
  offers: "A little more to celebrate.",
  about: "Made for beautiful beginnings.",
  contact: "Let’s make something beautiful.",
  careers: "Build beautiful beginnings with us.",
  blog: "The MarryNest journal.",
  help: "A little help, every step of the way.",
  faq: "Your questions, thoughtfully answered.",
  cookies: "Cookie Policy",
  refunds: "Refund Policy",
  cancellation: "Cancellation Policy",
};
export default function MarketplacePage() {
  const serviceGroups = useServiceGroups();
  const { pathname } = useLocation(),
    [params] = useSearchParams();
  const page = pathname.split("/")[1],
    home = pathname === "/",
    services = page === "services",
    search = page === "search";
  return (
    <main id="main-content" className="mn-marketplace bg-[#faf8f5] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!">
      <section className="mn-page-intro relative overflow-hidden max-w-[1440px] m-auto pt-[74px] px-[8%] pb-[70px] [&_h1]:text-[clamp(40px,_4.9vw,_68px)] [&_h1]:leading-[1.13] [&_h1]:tracking-[-2px] [&_h1]:my-[23px] [&_h1]:mx-0 [&_h1_em]:text-[#8c414e] [&_h1_em]:font-normal [&_>_p]:max-w-[490px] [&_>_p]:leading-[1.9] [&_>_p]:text-[14px] max-[768px]:py-[44px] max-[768px]:px-[6%] max-[768px]:[&_h1]:text-[43px] max-[768px]:[&_h1]:tracking-[-1.5px] max-[768px]:[&_h1]:my-[20px] max-[768px]:[&_h1]:mx-0 max-[768px]:[&_>_p]:text-[12px] max-[768px]:[&_>_p]:max-w-[330px]">
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">
          <span className="mn-tiny-flower text-[20px] font-normal">✳</span> THE WEDDING & EVENT
          MARKETPLACE
        </span>
        <h1>
          {home ? (
            <>
              Your kind of love.
              <br />
              <em>Your kind of celebration.</em>
            </>
          ) : services ? (
            <>
              Every detail.
              <br />
              <em>Beautifully covered.</em>
            </>
          ) : search ? (
            "Find your perfect match."
          ) : (
            titles[page] || "Your celebration starts here."
          )}
        </h1>
        <p>
          {home
            ? "The places, people and little details that make your big day feel like you. Discover your wedding, thoughtfully brought together."
            : services
              ? "From the first invitation to the last dance. Find the people who make it all possible."
              : search
                ? `Searching for “${params.get("q") || ""}”${params.get("city") ? ` in ${params.get("city")}` : ""}.`
                : "A thoughtful space for your plans, your people and your next chapter."}
        </p>
        {home && (
          <div className="mn-hero-actions flex items-center gap-[25px] mt-[28px] max-[768px]:items-start max-[768px]:flex-col max-[768px]:gap-[20px]">
            <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/services">
              Explore wedding services <ArrowUpRight size={16} />
            </Link>
            <Link className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]" to="/auth/signup?role=vendor">
              Are you a wedding professional? <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <div className="mn-intro-flower absolute right-[13%] top-[95px] text-[#b687793f] transform-[rotate(-20deg)] pointer-events-none after:content-[''] after:absolute after:border after:border-[#c1a08d44] after:w-[280px] after:h-[350px] after:rounded-[50%_50%_0_0] after:top-[-60px] after:left-[-35px] after:transform-[rotate(20deg)] max-[1180px]:right-[8%] max-[768px]:hidden" aria-hidden="true">
          <Flower2 size={210} strokeWidth={0.45} />
        </div>
      </section>
      {home || services || search ? (
        <section className="mn-services-section max-w-[1440px] m-auto pt-[45px] px-[8%] pb-[70px] border-t border-t-[#e8dfd7] max-[768px]:pt-[33px] max-[768px]:px-[6%] max-[768px]:pb-[45px]">
          <div className="mn-section-heading flex items-center justify-between gap-[20px] mb-[30px] [&_h2]:text-[32px] [&_h2]:mt-[8px] max-[768px]:items-start max-[768px]:[&_h2]:text-[26px] max-[768px]:[&_>_.mn-text-link]:text-[10px] max-[768px]:[&_>_.mn-text-link]:whitespace-nowrap max-[768px]:[&_>_.mn-text-link]:mt-[27px]">
            <div>
              <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">A CELEBRATION, UNIQUELY YOURS</span>
              <h2>
                {params.get("category") || "What’s on your wedding list?"}
              </h2>
            </div>
            <Link to="/services" className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]">
              All services <ArrowUpRight size={15} />
            </Link>
          </div>
          {search && (
            <p className="mb-6">
              Browse matching service categories below. Live venue, vendor and
              package listings are not available yet.
            </p>
          )}
          <div className="mn-service-cards grid grid-cols-[repeat(4,_1fr)] gap-[15px] max-[1180px]:grid-cols-[repeat(3,_1fr)] max-[768px]:grid-cols-[repeat(2,_1fr)] max-[768px]:gap-[10px]">
            {serviceGroups
              .flatMap((g) => g.items)
              .filter(
                ([n, d]) =>
                  (!params.get("category") || n === params.get("category")) &&
                  (!search ||
                    `${n} ${d}`
                      .toLowerCase()
                      .includes((params.get("q") || "").toLowerCase())),
              )
              .map(([name, description, Icon]) => (
                <Link
                  to={servicePath(name)}
                  key={name}
                  className="mn-service-card relative bg-[#fffdfa] border border-[#e8dfd7] pt-[25px] px-[22px] pb-[29px] rounded-[6px] transition-[box-shadow,border-color] duration-200 ease-[ease] min-w-0 hover:border-[#bc8e8d] hover:shadow-[0_6px_22px_#6c3a4110] [&_>_svg]:text-[#8c414e] [&_h3]:font-[Georgia,serif] [&_h3]:text-[17px] [&_h3]:font-normal [&_h3]:mt-[18px] [&_h3]:mx-0 [&_h3]:mb-[7px] [&_h3]:leading-[1.4] [&_p]:text-[11px] [&_p]:leading-[1.7] [&_p]:pr-[10px] max-[768px]:py-[20px] max-[768px]:px-[16px] max-[768px]:[&_h3]:text-[16px] max-[768px]:[&_p]:text-[10px]"
                >
                  <Icon size={26} strokeWidth={1.25} />
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <ArrowUpRight className="mn-card-arrow absolute right-[15px] top-[29px] max-[768px]:right-[12px] max-[768px]:top-[24px] max-[768px]:w-[14px]" size={18} />
                </Link>
              ))}
          </div>
          {search &&
            !serviceGroups
              .flatMap((g) => g.items)
              .some(([n, d]) =>
                `${n} ${d}`
                  .toLowerCase()
                  .includes((params.get("q") || "").toLowerCase()),
              ) && (
              <div className="mn-empty pt-[50px] px-[24px] pb-[80px] text-center flex items-center flex-col gap-[20px] min-h-[280px] [&_h2]:text-[32px] [&_>_p]:max-w-[520px]">
                <MapPin size={25} />
                <h3>No matching services yet.</h3>
                <p>
                  Try “photography”, “food” or “venue”, or explore all services.
                </p>
                <Link className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]" to="/services">
                  Explore services <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
        </section>
      ) : (
        <section className="mn-empty pt-[50px] px-[24px] pb-[80px] text-center flex items-center flex-col gap-[20px] min-h-[280px] [&_h2]:text-[32px] [&_>_p]:max-w-[520px]">
          <Heart size={28} strokeWidth={1.3} />
          <h2>
            {["cookies", "refunds", "cancellation"].includes(page)
              ? "Policy awaiting publication"
              : ["contact", "help", "faq"].includes(page)
                ? "We’re here to help."
                : "Something lovely is taking shape."}
          </h2>
          <p>
            {["cookies", "refunds", "cancellation"].includes(page)
              ? "The marketplace operator has not published this policy yet. Contact support before making a booking."
              : ["contact", "help", "faq"].includes(page)
                ? "For account questions or help with your vendor application, contact our support team."
                : "This part of the marketplace is being prepared. Explore our service categories or create your account to get started."}
          </p>
          {["contact", "help", "faq"].includes(page) && (
            <Link className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]" to="/contact">
              Contact our team <ArrowUpRight size={14} />
            </Link>
          )}
          <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/services">
            Explore services <ArrowUpRight size={15} />
          </Link>
        </section>
      )}
    </main>
  );
}
