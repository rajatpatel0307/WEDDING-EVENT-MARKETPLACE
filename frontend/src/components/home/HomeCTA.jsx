import { Link } from "react-router-dom";
import { ArrowUpRight, Flower2 } from "lucide-react";
export default function HomeCTA({ about = false }) {
  return (
    <section className="mp-final-cta py-[65px] px-[5%] text-center bg-[#faf8f5] [&.mp-final-cta_>_svg]:text-[#ba9786] [&.mp-final-cta_>_svg]:block [&.mp-final-cta_>_svg]:mt-0 [&.mp-final-cta_>_svg]:mx-auto [&.mp-final-cta_>_svg]:mb-[25px] [&.mp-final-cta_h2]:my-[17px] [&.mp-final-cta_h2]:mx-0 [&.mp-final-cta_>_p]:text-[12px] [&.mp-final-cta_>_div]:flex [&.mp-final-cta_>_div]:justify-center [&.mp-final-cta_>_div]:gap-[12px] [&.mp-final-cta_>_div]:my-[24px] [&.mp-final-cta_>_div]:mx-0 [&.mp-final-cta_p.mp-vendor-invite]:text-[10px] [&.mp-final-cta_p.mp-vendor-invite]:mt-[23px] [@media(width<=767px)]:py-[42px] [@media(width<=767px)]:px-[6%] [@media(width<=767px)]:[&.mp-final-cta_>_svg]:w-[65px] [@media(width<=767px)]:[&.mp-final-cta_>_svg]:h-[65px] [@media(width<=767px)]:[&.mp-final-cta_.mn-button]:text-[11px] [@media(width<=767px)]:[&.mp-final-cta_.mn-button]:py-[12px] [@media(width<=767px)]:[&.mp-final-cta_.mn-button]:px-[15px] [@media(width<=767px)]:[&.mp-final-cta_.mn-button]:gap-[10px] [@media(width<=767px)]:[&.mp-final-cta_p.mp-vendor-invite]:text-[10px] [@media(width<=360px)]:[&.mp-final-cta_>_div]:flex-col">
      <Flower2 size={85} strokeWidth={0.7} aria-hidden="true" />
      <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">A BEAUTIFUL BEGINNING AWAITS</span>
      <h2>
        {about
          ? "Ready to start planning?"
          : "Your perfect wedding starts here."}
      </h2>
      <p>
        Find the right people, places and services
        <br />
        to make your celebration unforgettable.
      </p>
      <div>
        <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/vendors">
          Explore vendors <ArrowUpRight size={16} />
        </Link>
        <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)] mn-button-outline [&.mn-button-outline]:text-[#81424c]! [&.mn-button-outline]:bg-transparent [&.mn-button-outline]:border-[#c4a5a2] [&.mn-button-outline:hover]:bg-[#e8d9d3]" to="/venues">
          Find a venue <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="mp-vendor-invite [&.mp-vendor-invite_a]:inline-flex [&.mp-vendor-invite_a]:items-center [&.mp-vendor-invite_a]:gap-[4px] [&.mp-vendor-invite_a]:text-[#8c414e] [&.mp-vendor-invite_a]:ml-[6px] [@media(width<=767px)]:[&.mp-vendor-invite_a]:mt-[8px] [@media(width<=767px)]:[&.mp-vendor-invite_a]:mx-0 [@media(width<=767px)]:[&.mp-vendor-invite_a]:mb-0">
        Are you a wedding professional?{" "}
        <Link to="/auth/signup?role=vendor">
          Become a vendor <ArrowUpRight size={13} />
        </Link>
      </p>
    </section>
  );
}
