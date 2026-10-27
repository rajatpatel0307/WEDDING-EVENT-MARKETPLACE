import { useQuery } from "@apollo/client/react";
import PageMeta from "../../../components/common/PageMeta";
import { STATS } from "../../../services/public";
import {
  AboutHero,
  OurStory,
  MissionVision,
  WhatWeDo,
  Values,
  Community,
} from "../../../components/about/AboutSections";
import HomeCTA from "../../../components/home/HomeCTA";
export default function AboutPage() {
  const { data, loading, refetch } = useQuery(STATS, {
      errorPolicy: "all",
      fetchPolicy: "cache-first",
    }),
    stats = data?.marketplaceStatistics;
  return (
    <main id="main-content" className="mp-page">
      <PageMeta
        title="About us"
        description="Meet MarryNest: a thoughtfully connected marketplace for couples, wedding venues and wedding professionals."
      />
      <AboutHero />
      <OurStory />
      <MissionVision />
      <WhatWeDo />
      <Values />
      <Community />
      <section
        className="mp-statistics"
        aria-label="Our marketplace in numbers"
      >
        <div className="mp-section">
          <span className="mn-kicker">
            A GROWING COMMUNITY, REAL CONNECTIONS
          </span>
          {stats ? (
            <div className="mp-stats-grid">
              {[
                ["Verified vendors", stats.verifiedVendors],
                ["Service categories", stats.services],
                ["Completed bookings", stats.successfulBookings],
                ["Cities with vendors", stats.cities],
              ].map(([name, count]) => (
                <div key={name}>
                  <strong>{count.toLocaleString("en-IN")}</strong>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mp-stats-unavailable" role="status">
              <p>
                {loading
                  ? "Loading our community numbers…"
                  : "Our community numbers are temporarily unavailable."}
              </p>
              {!loading && (
                <button
                  className="mn-text-link"
                  onClick={() => {
                    void refetch().catch(() => {});
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      <HomeCTA about />
    </main>
  );
}
