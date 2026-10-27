export const publicTypeDefs = `#graphql
  type PublicService { id: ID!, name: String!, description: String, icon: String, image: String }
  type MarketplaceCard {
    id: ID!, name: String!, description: String, category: String, location: String,
    image: String, rating: Float, reviewCount: Int, startingPrice: Float, pricingType: String,
    capacity: Int, verified: Boolean!, featured: Boolean!, vendorId: ID, vendorName: String
  }
  type PublicPackage { id: ID!, name: String!, description: String, price: Float!, image: String, location: String, vendorName: String!, items: [String!]! }
  type PublicTestimonial { id: ID!, customerName: String!, location: String, rating: Int!, review: String!, weddingDate: String! }
  type PublicOffer { id: ID!, name: String!, description: String, discountType: String!, discountValue: Float!, endDate: String! }
  type MarketplaceStatistics { verifiedVendors: Int!, services: Int!, successfulBookings: Int!, cities: Int! }
  type TermsSection { id: ID!, title: String!, paragraphs: [String!]! }
  type PublicTerms { published: Boolean!, lastUpdated: String, sections: [TermsSection!]! }
  type PublicCompany { contactIsPlaceholder: Boolean!, name: String!, legalName: String, email: String, phone: String, address: String, supportHours: String, mapUrl: String, directionsUrl: String, terms: PublicTerms! }
  input ContactMessageInput { firstName: String!, lastName: String!, email: String!, phone: String, subject: String!, category: String!, message: String!, consent: Boolean! }
  type ContactMessageResult { success: Boolean!, message: String!, reference: ID! }
  extend type Query {
    popularServices: [PublicService!]
    featuredVenues(city: String, q: String, id: ID, limit: Int): [MarketplaceCard!]
    featuredVendors(category: String, city: String, q: String, id: ID, limit: Int): [MarketplaceCard!]
    featuredPackages(city: String, q: String, id: ID, limit: Int): [PublicPackage!]
    testimonials: [PublicTestimonial!]
    activeOffers: [PublicOffer!]
    marketplaceStatistics: MarketplaceStatistics
    publicCompany: PublicCompany!
  }
  extend type Mutation { submitContactMessage(input: ContactMessageInput!): ContactMessageResult! }
`;
