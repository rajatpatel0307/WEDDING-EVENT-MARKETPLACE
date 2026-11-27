import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function HomeSectionHeader({
  eyebrow,
  title,
  description,
  link,
  linkText = "Explore all",
}) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end sm:gap-8">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-3 text-[9px] font-semibold tracking-[2px] text-rose-brand sm:text-[10px]">
          <span className="h-px w-7 bg-rose-brand/40" aria-hidden="true" />
          {eyebrow}
        </span>
        <h2 className="mt-4 font-serif">{title}</h2>
        {description && <p className="mt-3 max-w-xl">{description}</p>}
      </div>
      {link && (
        <Link
          to={link}
          className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-4 rounded-full border border-[#d9c5c2] px-5 py-2.5 text-xs font-medium text-rose-brand transition-colors hover:border-rose-brand hover:bg-rose-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand"
        >
          {linkText}
          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

// Keep these refinements on the home page; listing pages reuse the same cards.
export function HomeListingGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&_.mp-listing-card]:flex [&_.mp-listing-card]:h-full [&_.mp-listing-card]:flex-col [&_.mp-listing-card]:rounded-2xl [&_.mp-listing-card]:border-[#e9dfd7] [&_.mp-listing-card]:bg-white [&_.mp-listing-card]:shadow-[0_4px_20px_#56373e04] [&_.mp-listing-image]:aspect-[1.45] [&_.mp-listing-image_img]:h-full [&_.mp-listing-image_img]:w-full [&_.mp-listing-image_img]:object-cover [&_.mp-listing-content]:flex [&_.mp-listing-content]:flex-1 [&_.mp-listing-content]:flex-col [&_.mp-listing-content]:p-5 [&_.mp-listing-content_h3]:my-2 [&_.mp-listing-content_h3]:text-[22px]! [&_.mp-card-location]:flex [&_.mp-card-location]:items-center [&_.mp-card-location]:gap-1.5 [&_.mp-card-location]:text-[11px]! [&_.mp-card-facts]:my-4 [&_.mp-card-facts_>span]:inline-flex [&_.mp-card-facts_>span]:items-center [&_.mp-card-facts_>span]:gap-1 [&_.mp-card-bottom]:mt-auto [&_.mp-card-bottom_>div_>small]:block [&_.mp-card-bottom_>a]:grid [&_.mp-card-bottom_>a]:size-10 [&_.mp-card-bottom_>a]:place-items-center [&_.mp-card-bottom_>a]:rounded-full [&_.mp-card-bottom_>a]:bg-[#f5eeea] [&_.mp-card-bottom_>a]:text-rose-brand [&_.mp-card-bottom_>a:hover]:bg-[#eadbd5] [&_.mp-package-card]:flex [&_.mp-package-card]:h-full [&_.mp-package-card]:flex-col [&_.mp-package-card]:overflow-hidden [&_.mp-package-card]:rounded-2xl [&_.mp-package-card]:bg-white [&_.mp-package-card_>img]:h-[140px]! [&_.mp-package-card_>img]:shrink-0 [&_.mp-package-card_>img]:w-full [&_.mp-package-card_>img]:object-cover [&_.mp-package-content]:flex [&_.mp-package-content]:flex-1 [&_.mp-package-content]:flex-col [&_.mp-package-content]:p-4! [&_.mp-package-content_h3]:my-2! [&_.mp-package-content_h3]:text-[22px]! [&_.mp-package-content_>p]:my-2! [&_.mp-package-content_ul]:my-3! [&_.mp-package-content_ul]:pb-0! [&_.mp-package-content_ul]:space-y-2 [&_.mp-package-content_ul]:border-t [&_.mp-package-content_ul]:border-[#eee5dd] [&_.mp-package-content_ul]:pt-3! [&_.mp-package-content_li]:flex [&_.mp-package-content_li]:items-start [&_.mp-package-content_li]:gap-2 [&_.mp-package-content_li]:text-xs [&_.mp-package-content_li_svg]:mt-0.5 [&_.mp-package-content_li_svg]:shrink-0 [&_.mp-package-content_>a]:mt-auto [&_.mp-package-content_>a]:w-full [&_.mp-package-content_>a]:rounded-full [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-rose-brand">
      {children}
    </div>
  );
}
