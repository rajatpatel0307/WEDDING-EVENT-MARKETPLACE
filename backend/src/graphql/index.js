import { typeDefs as authTypeDefs } from "./auth/auth.typeDefs.js";
import { resolvers as authResolvers } from "./auth/auth.resolvers.js";
import { publicTypeDefs } from "./public.typeDefs.js";
import * as publicService from "../modules/public/public.service.js";
import { publicCompany } from "../modules/public/company.service.js";
export const typeDefs = [authTypeDefs, publicTypeDefs];
export const resolvers = {
  ...authResolvers,
  Query: {
    ...authResolvers.Query,
    publicCompany,
    ...Object.fromEntries(
      [
        "popularServices",
        "featuredVenues",
        "featuredVendors",
        "featuredPackages",
        "testimonials",
        "activeOffers",
        "marketplaceStatistics",
      ].map((name) => [name, (_, args) => publicService[name](args)]),
    ),
  },
  Mutation: {
    ...authResolvers.Mutation,
    submitContactMessage: publicService.submitContactMessage,
  },
};
