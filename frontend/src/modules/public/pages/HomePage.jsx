import { useQuery } from "@apollo/client/react";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Tag } from "lucide-react";
import { HOME } from "../../../services/public";
import { useSelectedLocation } from "../../marketplace/location-selection";
import PageMeta from "../../../components/common/PageMeta";
import Hero from "../../../components/home/Hero";
import ServiceCategories from "../../../components/home/ServiceCategories";
import { HomeSectionHeader, HomeListingGrid } from "../../../components/home/HomeSection";
import MarketplaceCard from "../../../components/common/MarketplaceCard";
import CollectionState from "../../../components/common/CollectionState";
import HowItWorks from "../../../components/home/HowItWorks";
import WhyChooseUs from "../../../components/home/WhyChooseUs";
import HomeCTA from "../../../components/home/HomeCTA";
const HomeCollections = lazy(
  () => import("../../../components/home/HomeCollections"),
);
export default function HomePage() {
  const city = useSelectedLocation();
  const { data, loading, refetch } = useQuery(HOME, {
    variables: { city: city || null },
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });
  const retry = () => {
    void refetch().catch(() => {});
  };
  return (
    <main id="main-content" className="mp-page bg-[#faf8f5] text-[#443a3c] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_p]:text-[#807174] [&_h1]:text-[clamp(40px,_4.5vw,_66px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.9px] [&_h1_em]:font-normal [&_h1_em]:text-[#8c414e] [&_h2_em]:font-normal [&_h2_em]:text-[#8c414e] [&_h2]:text-[clamp(28px,_3vw,_39px)] [&_h2]:leading-[1.2] [&_h2]:tracking-[-1px] [&_h3]:text-[17px] [&_h3]:font-[Georgia,serif] [&_h3]:font-normal [&_h3]:leading-[1.4] [&_h3]:tracking-[-0.25px] [&_button]:[font:inherit] [&_.mn-button]:text-[12px] [&_.mn-button]:min-h-[44px] [&_.mn-text-link]:text-[12px] [@media(width<=767px)]:[&_h1]:text-[40px] [@media(width<=767px)]:[&_h2]:text-[29px] [@media(width<=767px)]:[&_p]:text-[12px] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto!">
      <PageMeta
        title="Your wedding, beautifully brought together"
        description="Discover wedding venues, professionals and services with MarryNest. Find the people and places for your perfect celebration."
      />
      <Hero />
      <div className="mp-brand-strip flex items-center justify-center gap-[28px] pt-[34px] px-[5%] pb-[10px] text-[11px] font-[Georgia,serif] italic text-[#967b73] [&.mp-brand-strip_i]:w-[3px] [&.mp-brand-strip_i]:h-[3px] [&.mp-brand-strip_i]:bg-[#b99d91] [&.mp-brand-strip_i]:rounded-full [@media(width<=767px)]:pt-[5px] [@media(width<=767px)]:px-[6%] [@media(width<=767px)]:pb-[15px] [@media(width<=767px)]:gap-[12px] [@media(width<=767px)]:text-[9px] [@media(width<=767px)]:leading-[1.7] [@media(width<=767px)]:flex-wrap [@media(width<=767px)]:[&.mp-brand-strip_i]:hidden">
        <span>Thoughtfully chosen.</span>
        <i />
        <span>Beautifully connected.</span>
        <i />
        <span>Wholeheartedly celebrated.</span>
      </div>
      <ServiceCategories
        items={data?.popularServices}
        loading={loading}
        retry={retry}
        visual
      />
      <section className="mx-auto max-w-[1320px] border-t border-[#e8dfd8] px-[6%] py-14 sm:px-[5%] lg:py-20">
        <HomeSectionHeader
          eyebrow="EVERY LOVE STORY DESERVES A BEAUTIFUL SETTING"
          title={<>Somewhere special. <em>Something unforgettable.</em></>}
          description="An intimate garden, a grand ballroom, a little magic under the stars. Find a place that feels like your story."
          link="/venues"
          linkText="Discover venues"
        />
        {data?.featuredVenues?.length ? (
          <HomeListingGrid>
            {data.featuredVenues.map((item) => (
              <MarketplaceCard key={item.id} item={item} kind="venues" />
            ))}
          </HomeListingGrid>
        ) : (
          <CollectionState
            loading={loading}
            failed={!data?.featuredVenues}
            retry={retry}
            empty="Beautiful spaces are on their way."
          />
        )}
      </section>
      <Suspense fallback={<CollectionState loading />}>
        <HomeCollections
          data={data}
          loading={loading}
          retry={retry}
          part="vendors"
        />
      </Suspense>
      <HowItWorks />
      <Suspense fallback={<CollectionState loading />}>
        <HomeCollections
          data={data}
          loading={loading}
          retry={retry}
          part="packages"
        />
      </Suspense>
      <WhyChooseUs />
      <Suspense fallback={<CollectionState loading />}>
        <HomeCollections
          data={data}
          loading={loading}
          retry={retry}
          part="testimonials"
        />
      </Suspense>
      {data?.activeOffers?.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-[6%] pt-14 sm:px-[5%] lg:pt-20">
          <HomeSectionHeader
            eyebrow="A LITTLE MORE TO CELEBRATE"
            title={<>A lovely day. <em>A little extra delight.</em></>}
            description="Explore current offers from our wedding community."
            link="/offers"
            linkText="View all offers"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.activeOffers.map((offer) => (
              <article key={offer.id} className="flex flex-col items-start gap-4 rounded-2xl border border-[#e0cfc0] bg-[#f3e9de] p-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fffdfa] px-3 py-2 text-[10px] font-semibold tracking-wider text-rose-brand">
                  <Tag size={13} aria-hidden="true" />
                  {offer.discountType === "Percentage"
                    ? `${offer.discountValue}% OFF`
                    : "SPECIAL OFFER"}
                </span>
                <h3 className="text-[24px]!">{offer.name}</h3>
                <p>{offer.description}</p>
                <small className="mt-auto text-[10px] text-[#887164]">Offer ends {offer.endDate}</small>
                <Link to="/offers" className="inline-flex min-h-11 items-center gap-3 text-xs font-medium text-rose-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-brand">
                  Explore offers <ArrowUpRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
      <HomeCTA />
    </main>
  );
}
