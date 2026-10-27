import { useQuery } from "@apollo/client/react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowUpRight, MapPin, Check } from "lucide-react";
import {
  VENUES,
  VENDORS,
  PACKAGES,
  SEARCH,
  CATEGORIES,
  OFFERS,
  safeImage,
  money,
} from "../../../services/public";
import { cities } from "../../../components/layout/navigation";
import PageMeta from "../../../components/common/PageMeta";
import CollectionState from "../../../components/common/CollectionState";
import MarketplaceCard from "../../../components/common/MarketplaceCard";
import PackageCard from "../../../components/common/PackageCard";
import ServiceCategories from "../../../components/home/ServiceCategories";
import SectionHeader from "../../../components/common/SectionHeader";
const titles = {
  venues: "A place for your forever.",
  vendors: "Meet your wedding dream team.",
  packages: "Beautiful things, brought together.",
  search: "Find your perfect match.",
  services: "Every detail. Beautifully covered.",
  offers: "A little more to celebrate.",
};
export default function MarketplaceListingsPage() {
  const { pathname } = useLocation(),
    [params, setParams] = useSearchParams(),
    { id } = useParams(),
    kind = pathname.split("/")[1];
  const category = params.get("category") || null,
    city = params.get("city") || null,
    q = params.get("q") || null;
  const query =
    kind === "venues"
      ? VENUES
      : kind === "packages"
        ? PACKAGES
        : kind === "search"
          ? SEARCH
          : kind === "offers"
            ? OFFERS
            : kind === "services" && !category
              ? CATEGORIES
              : VENDORS;
  const invalidId =
    id && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  const { data, loading, refetch } = useQuery(query, {
    variables: { category, city, q, id },
    errorPolicy: "all",
    fetchPolicy: "cache-first",
    skip: !!invalidId,
  });
  const retry = () => {
    void refetch().catch(() => {});
  };
  function filter(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    if (category) fields.category = category;
    setParams(
      Object.fromEntries(Object.entries(fields).filter(([, value]) => value)),
    );
  }
  const records =
    kind === "venues"
      ? data?.featuredVenues
      : kind === "packages"
        ? data?.featuredPackages
        : data?.featuredVendors;
  const record = records?.[0],
    image = safeImage(record?.image);
  if (id)
    return (
      <main id="main-content" className="mp-page">
        <PageMeta
          title={record?.name || "Listing details"}
          description="Explore wedding marketplace listing details, pricing and service information."
        />
        <div className="mp-detail">
          <Link to={`/${kind}`} className="mn-text-link">
            ← Back to {kind}
          </Link>
          {record ? (
            <>
              <h1>{record.name}</h1>
              {record.location && (
                <p className="flex items-center gap-2">
                  <MapPin size={15} />
                  {record.location}
                </p>
              )}
              {image && (
                <img src={image} alt={record.name} width="1100" height="600" />
              )}
              <p className="mp-detail-description">
                {record.description ||
                  "Contact support to ask about the details of this listing."}
              </p>
              <strong className="mp-price">
                {money(
                  kind === "packages" ? record.price : record.startingPrice,
                )}
              </strong>
              {record.items && (
                <ul className="mp-detail-items">
                  {record.items.map((name, i) => (
                    <li key={i}>
                      <Check size={15} />
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              {record.capacity != null && (
                <p>Capacity: up to {record.capacity} guests</p>
              )}
              {record.reviewCount > 0 && (
                <p>
                  Vendor rating: {Number(record.rating).toFixed(1)} / 5 ·{" "}
                  {record.reviewCount} reviews
                </p>
              )}
              <p className="my-5">
                Availability, final inclusions and prices must be confirmed.
                Booking and checkout are not live yet.
              </p>
              <Link className="mn-button" to="/contact">
                Ask our team <ArrowUpRight size={15} />
              </Link>
            </>
          ) : (
            <CollectionState
              loading={loading}
              failed={!invalidId && !records}
              retry={invalidId ? undefined : retry}
              empty="This listing is not available."
            />
          )}
        </div>
      </main>
    );
  return (
    <main id="main-content" className="mp-page">
      <PageMeta
        title={
          kind === "search"
            ? "Search"
            : kind.charAt(0).toUpperCase() + kind.slice(1)
        }
        description="Explore wedding venues, approved vendors and packages on MarryNest."
      />
      <header className="mp-section pb-0">
        <span className="mn-kicker">YOUR CELEBRATION STARTS HERE</span>
        <h1 className="mt-5">{category || titles[kind]}</h1>
        <p className="mt-5">
          {q
            ? `Results for “${q}”${city ? ` in ${city}` : ""}.`
            : "Discover the people, places and thoughtful details behind your day."}
        </p>
        <form className="mp-listing-search" onSubmit={filter}>
          <input
            key={q || ""}
            aria-label="Search listings"
            type="search"
            name="q"
            defaultValue={q || ""}
            placeholder="Search venues, vendors, services…"
            maxLength={200}
          />
          <select
            key={city || ""}
            aria-label="Filter by city"
            name="city"
            defaultValue={city || ""}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="mn-button" type="submit">
            Search
          </button>
        </form>
      </header>
      {kind === "services" && !category ? (
        <ServiceCategories
          items={data?.popularServices}
          loading={loading}
          retry={retry}
        />
      ) : kind === "offers" ? (
        <section className="mp-section">
          {data?.activeOffers?.length ? (
            <div className="mp-offer-grid">
              {data.activeOffers.map((offer) => (
                <article key={offer.id}>
                  <span className="mn-kicker">
                    {offer.discountType === "Percentage"
                      ? `${offer.discountValue}% OFF`
                      : money(offer.discountValue) + " OFF"}
                  </span>
                  <h3>{offer.name}</h3>
                  <p>{offer.description}</p>
                  <small>Ends {offer.endDate}</small>
                  <Link to="/contact" className="mn-text-link">
                    Ask about this offer <ArrowUpRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <CollectionState
              loading={loading}
              failed={!data?.activeOffers}
              retry={retry}
              empty="No active offers at the moment."
            />
          )}
        </section>
      ) : kind === "search" ? (
        <>
          {[
            ["Venues", data?.featuredVenues, "venues"],
            ["Vendors", data?.featuredVendors, "vendors"],
            ["Packages", data?.featuredPackages, "packages"],
          ].map(([name, items, type]) => (
            <section key={name} className="mp-section">
              <SectionHeader title={name} eyebrow="EXPLORE YOUR MATCHES" />
              {items?.length ? (
                <div className="mp-listing-grid">
                  {items.map((item) =>
                    type === "packages" ? (
                      <PackageCard item={item} key={item.id} />
                    ) : (
                      <MarketplaceCard item={item} kind={type} key={item.id} />
                    ),
                  )}
                </div>
              ) : (
                <CollectionState
                  loading={loading}
                  failed={!items}
                  retry={retry}
                  empty={`No matching ${name.toLowerCase()} yet.`}
                />
              )}
            </section>
          ))}
        </>
      ) : (
        <section className="mp-section">
          {records?.length ? (
            <>
              <p className="mb-5">
                {kind === "packages"
                  ? "Featured packages, with inclusions provided by the vendor."
                  : "Approved vendors and services, ranked by stored rating and review count."}
              </p>
              <div className="mp-listing-grid">
                {records.map((item) =>
                  kind === "packages" ? (
                    <PackageCard item={item} key={item.id} />
                  ) : (
                    <MarketplaceCard
                      item={item}
                      kind={kind === "venues" ? "venues" : "vendors"}
                      key={item.id}
                    />
                  ),
                )}
              </div>
            </>
          ) : (
            <CollectionState
              loading={loading}
              failed={!records}
              retry={retry}
              empty="No matching listings yet."
            />
          )}
        </section>
      )}
    </main>
  );
}
