import { useEffect, useState } from "react";
import { Instagram, Facebook, Youtube, Linkedin } from "../common/SocialIcons";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Heart, ShieldCheck, MapPin } from "lucide-react";
import Logo from "../common/Logo";
import Newsletter from "../common/Newsletter";
import { useServiceGroups, servicePath } from "./services";
const legal = [
  ["Privacy Policy", "/privacy-policy"],
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Cookie Policy", "/cookies"],
  ["Refund Policy", "/refunds"],
];
const footerColumns = (serviceGroups) => [
  [
    "Services",
    serviceGroups
      .flatMap((g) => g.items)
      .slice(0, 9)
      .map(([name]) => [
        name === "Photography & Videography" ? "Photography" : name,
        servicePath(name),
      ]),
  ],
  [
    "Wedding essentials",
    [
      ...serviceGroups
        .flatMap((group) => group.items)
        .slice(9)
        .map(([name]) => [name, servicePath(name)]),
    ],
  ],
  [
    "Company",
    [
      ["About us", "/about"],
      ["Contact us", "/contact"],
      ["Our vendors", "/vendors"],
      ["Careers", "/careers"],
      ["The journal", "/blog"],
      ["Become a vendor", "/auth/signup?role=vendor"],
    ],
  ],
  [
    "Here to help",
    [
      ["Help center", "/help"],
      ["FAQs", "/faq"],
      ["Booking support", "/help/bookings"],
      ["Payment support", "/help/payments"],
      ["Cancellation policy", "/cancellation"],
      ["Terms & Conditions", "/terms-and-conditions"],
      ["Privacy Policy", "/privacy-policy"],
      ["Refund policy", "/refunds"],
    ],
  ],
];
function FooterColumn({ title, items }) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setExpanded(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <details
      className="mn-footer-column [&_summary]:list-none [&_summary]:text-[12px] [&_summary]:font-medium [&_summary]:text-[#f0e4de] [&_summary]:mt-[17px] [&_summary]:mx-0 [&_summary]:mb-[21px] [&_summary]:pointer-events-none [&_summary::-webkit-details-marker]:hidden [&_summary_>_span]:hidden [&_>_div]:flex [&_>_div]:flex-col [&_>_div]:gap-[9px] [&_a]:text-[10px] [&_a]:text-[#bdadad] [&_a]:leading-[1.6] [&_a:hover]:text-white [&_.mn-footer-all]:flex [&_.mn-footer-all]:items-center [&_.mn-footer-all]:gap-[5px] [&_.mn-footer-all]:text-[#dfb2aa] [&_.mn-footer-all]:mt-[5px] max-[768px]:border-b max-[768px]:border-b-[#514149] max-[768px]:[&_summary]:pointer-events-auto max-[768px]:[&_summary]:cursor-pointer max-[768px]:[&_summary]:flex max-[768px]:[&_summary]:items-center max-[768px]:[&_summary]:justify-between max-[768px]:[&_summary]:m-0 max-[768px]:[&_summary]:py-[16px] max-[768px]:[&_summary]:px-0 max-[768px]:[&_summary_>_span]:inline max-[768px]:[&_summary_>_span]:text-[17px] max-[768px]:[&_summary_>_span]:text-[#b59894] max-[768px]:[&[open]_summary_>_span]:transform-[rotate(45deg)] max-[768px]:[&_>_div]:pb-[19px] max-[768px]:[&_>_div]:gap-[12px] max-[768px]:[&_a]:text-[11px]"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        {title}
        <span>+</span>
      </summary>
      <div>
        {items.map(([name, path]) => (
          <Link key={name} to={path}>
            {name}
          </Link>
        ))}
        {title === "Services" && (
          <Link className="mn-footer-all" to="/services">
            View all services <ArrowUpRight size={13} />
          </Link>
        )}
      </div>
    </details>
  );
}
export default function Footer() {
  const columns = footerColumns(useServiceGroups());
  const { pathname } = useLocation();
  return (
    <footer className="mn-footer bg-[#30272b] text-[#e8dcda] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!">
      {!pathname.startsWith("/auth/") && !["/", "/about", "/contact"].includes(pathname) && (
        <section className="mn-footer-cta bg-[#f1e6e1] relative overflow-hidden text-[#49373b] flex justify-between items-center gap-[35px] pt-[38px] pr-[max(6%,_calc((100vw_-_1250px)] pb-[/] pl-[2))] [&_h2]:text-[35px] [&_h2]:leading-[1.3] [&_h2]:my-[9px] [&_h2]:mx-0 [&_p]:text-[12px] [&_p]:text-[#8a6d6d] max-[1180px]:[&_h2]:text-[29px] max-[768px]:py-[32px] max-[768px]:px-[6%] max-[768px]:block max-[768px]:[&_h2]:text-[29px] max-[768px]:[&_h2]:max-w-[300px] max-[768px]:[&_p]:max-w-[300px] max-[768px]:[&_p]:leading-[1.8] max-[768px]:[&_.mn-button]:py-[11px] max-[768px]:[&_.mn-button]:px-[13px] max-[768px]:[&_.mn-button]:text-[10px] max-[768px]:[&_.mn-button]:gap-[8px]">
          <div>
            <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>Big dreams. Beautiful beginnings.</h2>
            <p>
              Find the perfect venue and the people who bring your day to life.
            </p>
          </div>
          <div className="mn-footer-cta-buttons flex gap-[12px] relative z-[1] max-[1180px]:flex-col max-[768px]:flex-row max-[768px]:mt-[23px] max-[768px]:gap-[8px]">
            <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/vendors">
              Explore vendors <ArrowUpRight size={16} />
            </Link>
            <Link
              className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)] mn-button-outline [&.mn-button-outline]:text-[#81424c]! [&.mn-button-outline]:bg-transparent [&.mn-button-outline]:border-[#c4a5a2] [&.mn-button-outline:hover]:bg-[#e8d9d3]"
              to="/auth/signup?role=vendor"
            >
              Become a vendor <ArrowUpRight size={16} />
            </Link>
          </div>
          <Heart
            className="mn-cta-heart absolute right-[30%] top-0 text-[#cbaaa355] transform-[rotate(-25deg)] pointer-events-none max-[768px]:right-[-20px] max-[768px]:top-[10px]"
            size={160}
            strokeWidth={0.4}
            aria-hidden="true"
          />
        </section>
      )}
      <div className="mn-footer-inner max-w-[1440px] m-auto pt-[50px] px-[6%] pb-0 max-[768px]:pt-[26px] max-[768px]:px-[6%] max-[768px]:pb-0">
        <div className="mn-footer-grid grid grid-cols-[1.5fr_repeat(4,_1fr)] gap-[36px] max-[1180px]:grid-cols-[1.25fr_repeat(2,_1fr)] max-[1180px]:gap-y-[25px] max-[1180px]:gap-x-[40px] max-[768px]:flex max-[768px]:flex-col max-[768px]:gap-0">
          <div className="mn-footer-brand [&_.mn-logo_img]:grayscale [&_.mn-logo_img]:invert [&_.mn-logo_img]:brightness-200 [&_.mn-logo_img]:mix-blend-screen [&_.mn-logo_img]:opacity-[0.95] [&_.mn-logo_img]:w-[164px] [&_.mn-logo_img]:h-[68px] [&_.mn-logo_img]:object-left [&_>_p]:text-[11px] [&_>_p]:leading-[1.9] [&_>_p]:text-[#baabaa] [&_>_p]:max-w-[225px] [&_>_p]:my-[15px] [&_>_p]:mx-0 max-[1180px]:row-span-2 max-[768px]:pb-[25px] max-[768px]:[&_>_p]:max-w-[290px]">
            <Logo light />
            <p>
              Everything you need to create a beautiful, memorable wedding — all
              in one place.
            </p>
            <div className="mn-footer-location flex items-start gap-[6px] text-[10px] text-[#ae9694] max-w-[220px]">
              <MapPin size={14} /> Made for celebrations across India.
            </div>
            <div className="mn-socials flex gap-[8px] mt-[23px] [&_a]:border [&_a]:border-[#615056] [&_a]:rounded-full [&_a]:w-[30px] [&_a]:h-[30px] [&_a]:grid [&_a]:place-items-center [&_a]:text-[#d6c3bf] [&_a:hover]:bg-[#65464f] [&_a:hover]:text-white">
              {[
                [Instagram, "Instagram", import.meta.env.VITE_SOCIAL_INSTAGRAM],
                [Facebook, "Facebook", import.meta.env.VITE_SOCIAL_FACEBOOK],
                [Youtube, "YouTube", import.meta.env.VITE_SOCIAL_YOUTUBE],
                [Linkedin, "LinkedIn", import.meta.env.VITE_SOCIAL_LINKEDIN],
              ].map(([Icon, label, href]) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  aria-disabled={!href}
                  title={href ? label : `${label} profile coming soon`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon size={17} strokeWidth={1.5} />
                </a>
              ))}
              <a
                href={import.meta.env.VITE_SOCIAL_PINTEREST}
                aria-label="Pinterest"
                aria-disabled={!import.meta.env.VITE_SOCIAL_PINTEREST}
                title={
                  import.meta.env.VITE_SOCIAL_PINTEREST
                    ? "Pinterest"
                    : "Pinterest profile coming soon"
                }
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.8.2-2.7l1.3-5.5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.3-2 3.3-4.9 0-2.5-1.8-4.2-4.3-4.2-3 0-4.8 2.2-4.8 4.5 0 .9.3 1.9.8 2.4l.2.6-.3 1c0 .2-.2.3-.5.2-1.3-.6-2.1-2.4-2.1-3.9 0-3.2 2.3-6.1 6.7-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.4-5.1 6.4-1 0-2-.6-2.4-1.2l-.7 2.7c-.3 1-.9 2-1.3 2.7A10 10 0 1 0 12 2z" />
                </svg>
              </a>
            </div>
          </div>
          {columns.map(([title, items]) => (
            <FooterColumn key={title} title={title} items={items} />
          ))}
          <div className="mn-mobile-legal hidden max-[768px]:block">
            <FooterColumn title="Legal" items={legal} />
          </div>
        </div>
        <Newsletter />
        <div className="mn-footer-trust flex justify-between gap-[15px] py-[22px] px-0 text-[9px] text-[#bb9f9b] [&_span]:flex [&_span]:items-center [&_span]:gap-[6px] max-[768px]:flex-col max-[768px]:gap-[10px] max-[768px]:text-[9px]">
          <span>
            <ShieldCheck size={15} /> Thoughtful choices. Trusted connections.
          </span>
          <span>
            Made with <Heart size={12} /> for your happily ever after.
          </span>
        </div>
        <div className="mn-footer-bottom border-t border-t-[#514149] flex items-center justify-between gap-[20px] py-[20px] px-0 text-[#ac999a] text-[9px] [&_>_div]:flex [&_>_div]:gap-[20px] [&_a:hover]:text-white max-[768px]:pt-[18px] max-[768px]:px-0 max-[768px]:pb-[24px] max-[768px]:text-[8px] max-[768px]:[&_>_div]:hidden">
          <span>
            © {new Date().getFullYear()} MarryNest Wedding Marketplace. All
            rights reserved.
          </span>
          <div>
            {legal.map(([n, p]) => (
              <Link key={n} to={p}>
                {n}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
