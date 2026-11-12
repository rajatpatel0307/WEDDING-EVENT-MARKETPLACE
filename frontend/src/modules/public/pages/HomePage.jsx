import { useQuery } from "@apollo/client/react";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { HOME } from "../../../services/public";
import { useSelectedLocation } from "../../marketplace/location-selection";
import PageMeta from "../../../components/common/PageMeta";
import Hero from "../../../components/home/Hero";
import ServiceCategories from "../../../components/home/ServiceCategories";
import SectionHeader from "../../../components/common/SectionHeader";
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
      <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-venues-section border-t border-t-[#e8dfd8]">
        <SectionHeader
          eyebrow="SET THE SCENE FOR YOUR STORY"
          title="Beautiful venues for your big day."
          description="From intimate gatherings to grand celebrations, find a place that feels like yours."
          link="/venues"
          linkText="Discover venues"
        />
        {data?.featuredVenues?.length ? (
          <div className="mp-listing-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[23px] [@media(width<=1100px)]:gap-[16px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[20px]">
            {data.featuredVenues.map((item) => (
              <MarketplaceCard key={item.id} item={item} kind="venues" />
            ))}
          </div>
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
        <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
          <SectionHeader
            eyebrow="A LITTLE MORE TO CELEBRATE"
            title="Lovely offers, while they last."
          />
          <div className="mp-offer-grid grid grid-cols-[repeat(3,_1fr)] gap-[20px] [&.mp-offer-grid_article]:border [&.mp-offer-grid_article]:border-[#e0cfc0] [&.mp-offer-grid_article]:bg-[#f1e5d6] [&.mp-offer-grid_article]:p-[25px] [&.mp-offer-grid_article]:flex [&.mp-offer-grid_article]:flex-col [&.mp-offer-grid_article]:gap-[10px] [&.mp-offer-grid_h3]:text-[24px] [&.mp-offer-grid_h3]:m-0 [&.mp-offer-grid_small]:text-[10px] [&.mp-offer-grid_small]:text-[#887164] [@media(width<=767px)]:grid-cols-[1fr]">
            {data.activeOffers.map((offer) => (
              <article key={offer.id}>
                <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">
                  {offer.discountType === "Percentage"
                    ? `${offer.discountValue}% OFF`
                    : "SPECIAL OFFER"}
                </span>
                <h3>{offer.name}</h3>
                <p>{offer.description}</p>
                <small>Offer ends {offer.endDate}</small>
                <Link to="/offers" className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]">
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
