import { useState } from "react";
import SectionHeader from "../common/SectionHeader";
import CollectionState from "../common/CollectionState";
import MarketplaceCard from "../common/MarketplaceCard";
import PackageCard from "../common/PackageCard";
import Testimonials from "./Testimonials";
import { useQuery } from "@apollo/client/react";
import { VENDORS } from "../../services/public";
const tabs = [
  ["All", null],
  ["Catering", "Catering & Food"],
  ["Decoration", "Decoration"],
  ["Photography", "Photography & Videography"],
  ["DJ", "DJ & Entertainment"],
  ["Makeup", "Makeup & Beauty"],
  ["Mehndi", "Mehndi"],
];
function TopVendors({ items, loading, retry }) {
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
    <section className="mp-section">
      <SectionHeader
        eyebrow="GOOD PEOPLE. UNFORGETTABLE CELEBRATIONS."
        title="Meet your wedding dream team."
        description="Explore approved professionals, ranked by their listed rating and review count."
        link="/vendors"
        linkText="All vendors"
      />
      <div
        className="mp-filter-tabs"
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
        <div className="mp-listing-grid">
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
    <section className="mp-section">
      <SectionHeader
        eyebrow="BEAUTIFUL THINGS, BROUGHT TOGETHER"
        title="Complete wedding packages."
        description="Explore the packages our vendors have put together. Check each one for inclusions and exclusions."
        link="/packages"
        linkText="All packages"
      />
      {data?.featuredPackages?.length ? (
        <div className="mp-listing-grid">
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
