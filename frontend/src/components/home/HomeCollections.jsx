import { useState } from "react";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
import MarketplaceCard from "../common/MarketplaceCard";
import PackageCard from "../common/PackageCard";
import Testimonials from "./Testimonials";
import { useQuery } from "@apollo/client/react";
import { VENDORS } from "../../services/public";

function TopVendors({ items, loading, retry, categories = [] }) {
  const tabs = [
    ["All", null],
    ...categories.slice(0, 6).map((category) => [category.name, category.name]),
  ];
  const [category, setCategory] = useState(null);
  const filtered = useQuery(VENDORS, {
    variables: { category },
    skip: !category,
    fetchPolicy: "cache-first",
    errorPolicy: "all",
  });
  const vendors = category ? filtered.data?.featuredVendors : items;
  const pending = category ? filtered.loading : loading;
  return (
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
      <SectionHeader
        eyebrow="GOOD PEOPLE. UNFORGETTABLE CELEBRATIONS."
        title="Meet your wedding dream team."
        description="Explore approved professionals, ranked by their listed rating and review count."
        link="/vendors"
        linkText="All vendors"
      />
      <div
        className="mp-filter-tabs flex gap-[8px] flex-wrap mb-[26px] [&.mp-filter-tabs_button]:border [&.mp-filter-tabs_button]:border-[#e1d6cf] [&.mp-filter-tabs_button]:py-[8px] [&.mp-filter-tabs_button]:px-[17px] [&.mp-filter-tabs_button]:text-[11px] [&.mp-filter-tabs_button]:rounded-[30px] [&.mp-filter-tabs_button]:bg-transparent [&.mp-filter-tabs_button]:text-[#8b7670] [&.mp-filter-tabs_button]:min-h-[38px] [&.mp-filter-tabs_button[aria-pressed='true']]:bg-[#8c414e] [&.mp-filter-tabs_button[aria-pressed='true']]:text-white [&.mp-filter-tabs_button[aria-pressed='true']]:border-[#8c414e] [@media(width<=767px)]:gap-[7px] [@media(width<=767px)]:flex-nowrap [@media(width<=767px)]:overflow-x-auto [@media(width<=767px)]:pb-[6px] [@media(width<=767px)]:[&.mp-filter-tabs_button]:whitespace-nowrap [@media(width<=767px)]:[&.mp-filter-tabs_button]:py-[9px] [@media(width<=767px)]:[&.mp-filter-tabs_button]:px-[15px]"
        role="group"
        aria-label="Filter vendors by category"
      >
        {tabs.map(([name, value]) => (
          <button
            key={name}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {name}
          </button>
        ))}
      </div>
      {vendors?.length ? (
        <div className="mp-listing-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[23px] [@media(width<=1100px)]:gap-[16px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[20px]">
          {vendors.slice(0, 6).map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <CollectionState
          loading={pending}
          failed={!vendors}
          retry={
            category
              ? () => {
                  void filtered.refetch().catch(() => {});
                }
              : retry
          }
          empty="Your dream team is taking shape."
        />
      )}
    </section>
  );
}
export default function HomeCollections({ data, loading, retry, part }) {
  if (part === "vendors")
    return (
      <TopVendors
        items={data?.featuredVendors}
        categories={data?.popularServices}
        loading={loading}
        retry={retry}
      />
    );
  if (part === "testimonials")
    return (
      <Testimonials
        items={data?.testimonials}
        loading={loading}
        retry={retry}
      />
    );
  return (
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
      <SectionHeader
        eyebrow="BEAUTIFUL THINGS, BROUGHT TOGETHER"
        title="Complete wedding packages."
        description="Explore the packages our vendors have put together. Check each one for inclusions and exclusions."
        link="/packages"
        linkText="All packages"
      />
      {data?.featuredPackages?.length ? (
        <div className="mp-listing-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[23px] [@media(width<=1100px)]:gap-[16px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[20px]">
          {data.featuredPackages.map((item) => (
            <PackageCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <CollectionState
          loading={loading}
          failed={!data?.featuredPackages}
          retry={retry}
          empty="Thoughtful packages are being prepared."
        />
      )}
    </section>
  );
}
