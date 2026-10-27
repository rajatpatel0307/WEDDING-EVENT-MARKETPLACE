import { useQuery } from "@apollo/client/react";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { HOME } from "../../../services/public";
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
  const { data, loading, refetch } = useQuery(HOME, {
    fetchPolicy: "cache-first",
    errorPolicy: "all",
  });
  const retry = () => {
    void refetch().catch(() => {});
  };
  return (
    <main id="main-content" className="mp-page">
      <PageMeta
        title="Your wedding, beautifully brought together"
        description="Discover wedding venues, professionals and services with MarryNest. Find the people and places for your perfect celebration."
      />
      <Hero />
      <div className="mp-brand-strip">
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
      />
      <section className="mp-section mp-venues-section">
        <SectionHeader
          eyebrow="SET THE SCENE FOR YOUR STORY"
          title="Beautiful venues for your big day."
          description="From intimate gatherings to grand celebrations, find a place that feels like yours."
          link="/venues"
          linkText="Discover venues"
        />
        {data?.featuredVenues?.length ? (
          <div className="mp-listing-grid">
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
      <ServiceCategories
        items={data?.popularServices}
        loading={loading}
        retry={retry}
        visual
      />
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
        <section className="mp-section">
          <SectionHeader
            eyebrow="A LITTLE MORE TO CELEBRATE"
            title="Lovely offers, while they last."
          />
          <div className="mp-offer-grid">
            {data.activeOffers.map((offer) => (
              <article key={offer.id}>
                <span className="mn-kicker">
                  {offer.discountType === "Percentage"
                    ? `${offer.discountValue}% OFF`
                    : "SPECIAL OFFER"}
                </span>
                <h3>{offer.name}</h3>
                <p>{offer.description}</p>
                <small>Offer ends {offer.endDate}</small>
                <Link to="/offers" className="mn-text-link">
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
