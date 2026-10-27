import { gql } from "@apollo/client";
export const COMPANY = gql`
  query PublicCompany {
    publicCompany {
      name
      legalName
      contactIsPlaceholder
      email
      phone
      address
      supportHours
      mapUrl
      directionsUrl
    }
  }
`;
export const CATEGORIES = gql`
  query PublicCategories {
    popularServices {
      id
      name
      description
      icon
      image
    }
  }
`;
export const OFFERS = gql`
  query PublicOffers {
    activeOffers {
      id
      name
      description
      discountType
      discountValue
      endDate
    }
  }
`;
export const TERMS = gql`
  query PublicTerms {
    publicCompany {
      name
      terms {
        published
        lastUpdated
        sections {
          id
          title
          paragraphs
        }
      }
    }
  }
`;
const card =
  "id name description category location image rating reviewCount startingPrice pricingType capacity verified featured vendorId vendorName";
export const HOME = gql`query HomePage {
  popularServices { id name description icon image }
  featuredVenues(limit: 3) { ${card} }
  featuredVendors(limit: 6) { ${card} }
  featuredPackages(limit: 3) { id name description price image location vendorName items }
  testimonials { id customerName location rating review weddingDate }
  activeOffers { id name description discountType discountValue endDate }
}`;
export const STATS = gql`
  query MarketplaceStatistics {
    marketplaceStatistics {
      verifiedVendors
      services
      successfulBookings
      cities
    }
  }
`;
export const VENUES = gql`query PublicVenues($city: String, $q: String, $id: ID) { featuredVenues(city: $city, q: $q, id: $id, limit: 24) { ${card} } }`;
export const VENDORS = gql`query PublicVendors($category: String, $city: String, $q: String, $id: ID) { featuredVendors(category: $category, city: $city, q: $q, id: $id, limit: 24) { ${card} } }`;
export const PACKAGES = gql`
  query PublicPackages($city: String, $q: String, $id: ID) {
    featuredPackages(city: $city, q: $q, id: $id, limit: 24) {
      id
      name
      description
      price
      image
      location
      vendorName
      items
    }
  }
`;
export const SEARCH = gql`query SearchMarketplace($city: String, $q: String) {
  featuredVenues(city: $city, q: $q, limit: 24) { ${card} }
  featuredVendors(city: $city, q: $q, limit: 24) { ${card} }
  featuredPackages(city: $city, q: $q, limit: 24) { id name description price image location vendorName items }
}`;
export const CONTACT = gql`
  mutation SubmitContactMessage($input: ContactMessageInput!) {
    submitContactMessage(input: $input) {
      success
      message
      reference
    }
  }
`;
export function safeImage(value) {
  if (!value) return null;
  if (/^\/(?!\/)/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
export const money = (value) =>
  value === null || value === undefined
    ? "Request a quote"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
