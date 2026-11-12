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
import { useCustomerLocations, useSelectedLocation, setSelectedLocation } from "../../marketplace/location-selection";
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
  const locations = useCustomerLocations(), selectedLocation = useSelectedLocation();
  const { pathname } = useLocation(),
    [params, setParams] = useSearchParams(),
    { id } = useParams(),
    kind = pathname.split("/")[1];
  const category = params.get("category") || null,
    city = params.get("city") ?? (selectedLocation || null),
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
    fetchPolicy: "network-only",
    skip: !!invalidId,
  });
  const retry = () => {
    void refetch().catch(() => {});
  };
  function filter(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    setSelectedLocation(fields.city || "");
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
      <main id="main-content" className="mp-page bg-[#faf8f5] text-[#443a3c] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_p]:text-[#807174] [&_h1]:text-[clamp(40px,_4.5vw,_66px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.9px] [&_h1_em]:font-normal [&_h1_em]:text-[#8c414e] [&_h2_em]:font-normal [&_h2_em]:text-[#8c414e] [&_h2]:text-[clamp(28px,_3vw,_39px)] [&_h2]:leading-[1.2] [&_h2]:tracking-[-1px] [&_h3]:text-[17px] [&_h3]:font-[Georgia,serif] [&_h3]:font-normal [&_h3]:leading-[1.4] [&_h3]:tracking-[-0.25px] [&_button]:[font:inherit] [&_.mn-button]:text-[12px] [&_.mn-button]:min-h-[44px] [&_.mn-text-link]:text-[12px] [@media(width<=767px)]:[&_h1]:text-[40px] [@media(width<=767px)]:[&_h2]:text-[29px] [@media(width<=767px)]:[&_p]:text-[12px] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto!">
        <PageMeta
          title={record?.name || "Listing details"}
          description="Explore wedding marketplace listing details, pricing and service information."
        />
        <div className="mp-detail max-w-[1100px] m-auto pt-[45px] px-[5%] pb-[70px] [&.mp-detail_>_h1]:my-[25px] [&.mp-detail_>_h1]:mx-0 [&.mp-detail_>_h1]:text-[45px] [&.mp-detail_>_img]:w-full [&.mp-detail_>_img]:h-[390px] [&.mp-detail_>_img]:object-cover [&.mp-detail_>_img]:rounded-[7px] [&.mp-detail_>_img]:my-[20px] [&.mp-detail_>_img]:mx-0 [&.mp-detail_.mp-detail-description]:whitespace-pre-line [&.mp-detail_.mp-detail-description]:my-[20px] [&.mp-detail_.mp-detail-description]:mx-0 [&.mp-detail_.mp-detail-description]:wrap-anywhere [@media(width<=767px)]:pt-[30px] [@media(width<=767px)]:px-[6%] [@media(width<=767px)]:pb-[45px] [@media(width<=767px)]:[&.mp-detail_>_h1]:text-[36px] [@media(width<=767px)]:[&.mp-detail_>_img]:h-[230px]">
          <Link to={`/${kind}`} className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]">
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
              <strong className="mp-price text-[25px] font-[Georgia,serif] font-normal text-[#8c414e]">
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
              <Link className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" to="/contact">
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
    <main id="main-content" className="mp-page bg-[#faf8f5] text-[#443a3c] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_p]:text-[#807174] [&_h1]:text-[clamp(40px,_4.5vw,_66px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.9px] [&_h1_em]:font-normal [&_h1_em]:text-[#8c414e] [&_h2_em]:font-normal [&_h2_em]:text-[#8c414e] [&_h2]:text-[clamp(28px,_3vw,_39px)] [&_h2]:leading-[1.2] [&_h2]:tracking-[-1px] [&_h3]:text-[17px] [&_h3]:font-[Georgia,serif] [&_h3]:font-normal [&_h3]:leading-[1.4] [&_h3]:tracking-[-0.25px] [&_button]:[font:inherit] [&_.mn-button]:text-[12px] [&_.mn-button]:min-h-[44px] [&_.mn-text-link]:text-[12px] [@media(width<=767px)]:[&_h1]:text-[40px] [@media(width<=767px)]:[&_h2]:text-[29px] [@media(width<=767px)]:[&_p]:text-[12px] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto!">
      <PageMeta
        title={
          kind === "search"
            ? "Search"
            : kind.charAt(0).toUpperCase() + kind.slice(1)
        }
        description="Explore wedding venues, approved vendors and packages on MarryNest."
      />
      <header className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] pb-0">
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">YOUR CELEBRATION STARTS HERE</span>
        <h1 className="mt-5">{category || titles[kind]}</h1>
        <p className="mt-5">
          {q
            ? `Results for “${q}”${city ? ` in ${city}` : ""}.`
            : "Discover the people, places and thoughtful details behind your day."}
        </p>
        <form className="mp-listing-search mt-[25px] flex gap-[12px] [&.mp-listing-search_input]:py-[10px] [&.mp-listing-search_input]:px-[14px] [&.mp-listing-search_input]:border [&.mp-listing-search_input]:border-[#dac8bb] [&.mp-listing-search_input]:bg-[#fffdfa] [&.mp-listing-search_input]:rounded-[4px] [&.mp-listing-search_input]:min-w-0 [&.mp-listing-search_input]:flex-1 [&.mp-listing-search_select]:py-[10px] [&.mp-listing-search_select]:px-[14px] [&.mp-listing-search_select]:border [&.mp-listing-search_select]:border-[#dac8bb] [&.mp-listing-search_select]:bg-[#fffdfa] [&.mp-listing-search_select]:rounded-[4px] [&.mp-listing-search_select]:min-w-0 [&.mp-listing-search_select]:flex-1 [&.mp-listing-search_button]:shrink-0 [@media(width<=767px)]:flex-wrap [@media(width<=767px)]:gap-[10px] [@media(width<=767px)]:[&.mp-listing-search_input]:basis-[60%] [@media(width<=767px)]:[&.mp-listing-search_select]:basis-[30%] [@media(width<=767px)]:[&.mp-listing-search_button]:w-full" onSubmit={filter}>
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
            {(locations.data || []).map((c) => (
              <option key={c.id} value={c.id}>{c.city}, {c.state}</option>
            ))}
          </select>
          <button className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" type="submit">
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
        <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
          {data?.activeOffers?.length ? (
            <div className="mp-offer-grid grid grid-cols-[repeat(3,_1fr)] gap-[20px] [&.mp-offer-grid_article]:border [&.mp-offer-grid_article]:border-[#e0cfc0] [&.mp-offer-grid_article]:bg-[#f1e5d6] [&.mp-offer-grid_article]:p-[25px] [&.mp-offer-grid_article]:flex [&.mp-offer-grid_article]:flex-col [&.mp-offer-grid_article]:gap-[10px] [&.mp-offer-grid_h3]:text-[24px] [&.mp-offer-grid_h3]:m-0 [&.mp-offer-grid_small]:text-[10px] [&.mp-offer-grid_small]:text-[#887164] [@media(width<=767px)]:grid-cols-[1fr]">
              {data.activeOffers.map((offer) => (
                <article key={offer.id}>
                  <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">
                    {offer.discountType === "Percentage"
                      ? `${offer.discountValue}% OFF`
                      : money(offer.discountValue) + " OFF"}
                  </span>
                  <h3>{offer.name}</h3>
                  <p>{offer.description}</p>
                  <small>Ends {offer.endDate}</small>
                  <Link to="/contact" className="mn-text-link inline-flex items-center gap-[8px] text-[#8c414e] text-[12px]">
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
            <section key={name} className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
              <SectionHeader title={name} eyebrow="EXPLORE YOUR MATCHES" />
              {items?.length ? (
                <div className="mp-listing-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[23px] [@media(width<=1100px)]:gap-[16px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[20px]">
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
        <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
          {records?.length ? (
            <>
              <p className="mb-5">
                {kind === "packages"
                  ? "Featured packages, with inclusions provided by the vendor."
                  : "Approved vendors and services, ranked by stored rating and review count."}
              </p>
              <div className="mp-listing-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[23px] [@media(width<=1100px)]:gap-[16px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[20px]">
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
