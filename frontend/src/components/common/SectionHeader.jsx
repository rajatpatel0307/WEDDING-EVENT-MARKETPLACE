import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
export default function SectionHeader({
  eyebrow,
  title,
  description,
  link,
  linkText = "Explore all",
}) {
  return (
    <div className="mp-section-heading flex items-end justify-between gap-[24px] mb-[32px] [&.mp-section-heading_h2]:mt-[12px] [&.mp-section-heading_p]:mt-[12px] [&.mp-section-heading_p]:max-w-[580px] [&.mp-section-heading_>_.mn-text-link]:whitespace-nowrap [&.mp-section-heading_>_.mn-text-link]:mb-[7px] [@media(width<=767px)]:items-start [@media(width<=767px)]:gap-[12px] [@media(width<=767px)]:mb-[24px] [@media(width<=767px)]:[&.mp-section-heading_>_.mn-text-link]:text-[10px] [@media(width<=767px)]:[&.mp-section-heading_>_.mn-text-link]:whitespace-normal [@media(width<=767px)]:[&.mp-section-heading_>_.mn-text-link]:min-w-[70px] [@media(width<=767px)]:[&.mp-section-heading_>_.mn-text-link]:mt-[30px] [@media(width<=767px)]:[&.mp-section-heading_h2]:mt-[12px] [@media(width<=767px)]:[&.mp-section-heading_p]:text-[11px]">
      <div>
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]" to={link}>
          {linkText} <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
