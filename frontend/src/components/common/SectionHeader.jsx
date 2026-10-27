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
    <div className="mp-section-heading">
      <div>
        <span className="mn-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {link && (
        <Link className="mn-text-link" to={link}>
          {linkText} <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
