import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Gift } from "lucide-react";
import { money, safeImage } from "../../services/public";
export default function PackageCard({ item }) {
  const image = safeImage(item.image);
  return (
    <article className="mp-package-card">
      {image ? (
        <img
          src={image}
          alt={item.name}
          width="600"
          height="300"
          loading="lazy"
        />
      ) : (
        <div className="mp-package-icon">
          <Gift size={30} strokeWidth={1.2} />
        </div>
      )}
      <div className="mp-package-content">
        <span className="mn-kicker">{item.vendorName}</span>
        <h3>{item.name}</h3>
        <strong className="mp-price">{money(item.price)}</strong>
        {item.description && <p>{item.description}</p>}
        <ul>
          {item.items.map((name, i) => (
            <li key={`${name}-${i}`}>
              <Check size={14} />
              {name}
            </li>
          ))}
        </ul>
        <Link
          className="mn-button mn-button-outline"
          to={`/packages/${item.id}`}
        >
          View package <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
