import { Link } from "react-router-dom";
export default function Logo({ light = false, transparent = false }) {
  return (
    <Link
      to="/"
      aria-label="MarryNest home"
      className={`mn-logo shrink-0 inline-flex items-center [&_img]:w-[144px] [&_img]:h-[58px] [&_img]:object-contain [&_img]:mix-blend-multiply ${light ? "mn-logo-light" : ""}`}
    >
      <img
        src={transparent ? "/images/marrynest-logo-transparent.png" : "/images/marrynest-logo-320.webp"}
        srcSet={transparent ? undefined : "/images/marrynest-logo-320.webp 320w, /images/marrynest-logo-640.webp 640w"}
        sizes="(max-width: 767px) 114px, 164px"
        className={transparent ? "mix-blend-normal!" : undefined}
        alt="MarryNest — Wedding & Event Marketplace"
        width="160"
        height="68"
      />
    </Link>
  );
}
