import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Gift } from "lucide-react";
import { money, safeImage } from "../../services/public";
export default function PackageCard({ item }) {
  const image = safeImage(item.image);
  return (
    <article className="mp-package-card border border-[#e6d9cf] rounded-[6px] bg-[#fffdfa] overflow-hidden [&.mp-package-card_>_img]:h-[165px] [&.mp-package-card_>_img]:w-full [&.mp-package-card_>_img]:object-cover">
      {image ? (
        <img
          src={image}
          alt={item.name}
          width="600"
          height="300"
          loading="lazy"
        />
      ) : (
        <div className="mp-package-icon h-[100px] bg-[#f1e6dd] grid place-items-center text-[#a47665]">
          <Gift size={30} strokeWidth={1.2} />
        </div>
      )}
      <div className="mp-package-content p-[26px] [&.mp-package-content_h3]:text-[25px] [&.mp-package-content_h3]:my-[10px] [&.mp-package-content_h3]:mx-0 [&.mp-package-content_>_p]:text-[11px] [&.mp-package-content_>_p]:leading-[1.8] [&.mp-package-content_>_p]:my-[15px] [&.mp-package-content_>_p]:mx-0 [&.mp-package-content_ul]:list-none [&.mp-package-content_ul]:py-[18px] [&.mp-package-content_ul]:px-0 [&.mp-package-content_ul]:border-t [&.mp-package-content_ul]:border-t-[#e8dcd1] [&.mp-package-content_ul]:my-[18px] [&.mp-package-content_ul]:mx-0 [&.mp-package-content_ul]:flex [&.mp-package-content_ul]:flex-col [&.mp-package-content_ul]:gap-[8px] [&.mp-package-content_li]:flex [&.mp-package-content_li]:items-center [&.mp-package-content_li]:gap-[7px] [&.mp-package-content_li]:text-[11px] [&.mp-package-content_li]:text-[#88776e] [&.mp-package-content_li_svg]:text-[#8c6958] [&.mp-package-content_.mn-button]:w-full [@media(width<=767px)]:p-[24px]">
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">{item.vendorName}</span>
        <h3>{item.name}</h3>
        <strong className="mp-price text-[25px] font-[Georgia,serif] font-normal text-[#8c414e]">{money(item.price)}</strong>
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
          className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)] mn-button-outline [&.mn-button-outline]:text-[#81424c]! [&.mn-button-outline]:bg-transparent [&.mn-button-outline]:border-[#c4a5a2] [&.mn-button-outline:hover]:bg-[#e8d9d3]"
          to={`/packages/${item.id}`}
        >
          View package <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
