import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Sparkles } from "lucide-react";
import CollectionState from "../common/CollectionState";
import MarketplaceCard from "../common/MarketplaceCard";
import PackageCard from "../common/PackageCard";
import Testimonials from "./Testimonials";
import { HomeSectionHeader, HomeListingGrid } from "./HomeSection";
import { VENDORS } from "../../services/public";
import { useSelectedLocation } from "../../modules/marketplace/location-selection";

function TopVendors({ items, loading, retry, categories = [] }) {
  const city = useSelectedLocation();
  const tabs = [
    ["All professionals", null],
    ...categories.slice(0, 6).map((category) => [category.name, category.name]),
  ];
  const [category, setCategory] = useState(null);
  const filtered = useQuery(VENDORS, {
    variables: { category, city: city || null },
    skip: !category,
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });
  const vendors = category ? filtered.data?.featuredVendors : items;
  const pending = category ? filtered.loading : loading;
  return (
    <section className="border-t border-[#eee5dd] bg-[#fffdfa]">
      <div className="mx-auto max-w-[1320px] px-[6%] py-14 sm:px-[5%] lg:py-20">
        <HomeSectionHeader
          eyebrow="THE PEOPLE WHO MAKE IT SPECIAL"
          title={
            <>
              Your vision. <em>Your dream team.</em>
            </>
          }
          description="The creatives, the detail lovers, the memory makers. Meet approved wedding professionals and find your perfect fit."
          link="/vendors"
          linkText="Meet all vendors"
        />
        <div
          className="mb-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter vendors by category"
        >
          {tabs.map(([name, value]) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
              className="min-h-11 cursor-pointer rounded-full border border-[#e4d8cf] bg-transparent px-4 py-2.5 text-[11px]! text-[#7d6863] transition-colors hover:border-rose-brand/50 hover:bg-[#f5eeea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-brand aria-pressed:border-rose-brand aria-pressed:bg-rose-brand aria-pressed:text-white sm:px-5"
            >
              {name}
            </button>
          ))}
        </div>
        {vendors?.length ? (
          <HomeListingGrid>
            {vendors.slice(0, 6).map((item) => (
              <MarketplaceCard key={item.id} item={item} />
            ))}
          </HomeListingGrid>
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
      </div>
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
    <section className="mx-auto max-w-[1320px] px-[6%] py-14 sm:px-[5%] lg:py-20">
      <HomeSectionHeader
        eyebrow="A LITTLE MORE, BEAUTIFULLY TOGETHER"
        title={
          <>
            Big-day plans. <em>Thoughtful packages.</em>
          </>
        }
        description="Discover services brought together by our vendors. Explore the details and find a package that suits your celebration."
        link="/packages"
        linkText="Explore packages"
      />
      {data?.featuredPackages?.length ? (
        <HomeListingGrid>
          {data.featuredPackages.map((item) => (
            <PackageCard key={item.id} item={item} />
          ))}
        </HomeListingGrid>
      ) : (
        <CollectionState
          loading={loading}
          failed={!data?.featuredPackages}
          retry={retry}
          empty="Thoughtful packages are being prepared."
        />
      )}
      <div className="mt-6 flex items-start justify-center gap-2.5 rounded-xl border border-[#e8ddd1] bg-[#f2ebe2] px-5 py-4 text-[11px] leading-relaxed text-[#826b60] sm:items-center">
        <Sparkles
          size={16}
          className="mt-0.5 shrink-0 text-[#a47d58] sm:mt-0"
          aria-hidden="true"
        />
        Every celebration is different. Review each package's inclusions and
        exclusions before choosing.
      </div>
    </section>
  );
}
