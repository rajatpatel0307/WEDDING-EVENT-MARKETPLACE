import {
  layoutUserResolvers,
  subscribeNewsletter,
} from "../layout.resolvers.js";
import * as auth from "../../modules/auth/auth.service.js";
import { categories } from "../../modules/auth/auth.validation.js";
import {
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import {
  listVendors,
  reviewVendor,
} from "../../modules/admin/vendors.service.js";
import { VendorDocument } from "../../models/index.js";
import {
  uploadDocument,
  downloadDocument,
} from "../../modules/vendors/documents.service.js";
import { fail, audit } from "../../modules/auth/security.service.js";
export const resolvers = {
  User: layoutUserResolvers,
  Query: {
    me: (_, args, ctx) => auth.publicUser(ctx.auth?.user),
    serviceCategories: () => categories,
    adminVendors: (_, args, ctx) => listVendors(ctx, args.offset),
    vendorWorkspace: (_, args, ctx) => requireApprovedVendor(ctx).vendor,
    adminDocument: async (_, args, ctx) => {
      const user = requireRole(ctx, "ADMIN");
      const doc = await VendorDocument.findByPk(args.id);
      if (!doc) fail("Document not found.");
      await audit("DOCUMENT_VIEWED", ctx, user.id, doc.id);
      return downloadDocument(doc);
    },
  },
  Vendor: {
    createdAt: (v) => v.createdAt.toISOString(),
    user: (v, _, ctx) => {
      requireRole(ctx, "ADMIN");
      return auth.publicUser(v.user);
    },
    categories: async (v, _, ctx) => {
      if (ctx.auth?.user.vendor?.id !== v.id) requireRole(ctx, "ADMIN");
      return v.categories || v.getCategories();
    },
    locations: async (v, _, ctx) => {
      if (ctx.auth?.user.vendor?.id !== v.id) requireRole(ctx, "ADMIN");
      return v.locations || v.getLocations();
    },
    documents: async (v, _, ctx) => {
      if (ctx.auth?.user.vendor?.id !== v.id) requireRole(ctx, "ADMIN");
      return v.documents || v.getDocuments();
    },
  },
  Mutation: {
    subscribeNewsletter,
    registerCustomer: (_, a, c) => auth.register(a.input, "CUSTOMER", c),
    registerVendor: (_, a, c) => auth.register(a.input, "VENDOR", c),
    ...Object.fromEntries(
      [
        "login",
        "verifyEmailOtp",
        "resendEmailOtp",
        "forgotPassword",
        "verifyResetOtp",
        "resetPassword",
        "changePassword",
      ].map((name) => [name, (_, a, c) => auth[name](a.input, c)]),
    ),
    logout: (_, a, c) => auth.logout(c),
    refreshToken: (_, a, c) => auth.refreshToken(c),
    uploadVendorDocument: (_, a, c) => uploadDocument(a.input, c),
    reviewVendor: (_, a, c) => reviewVendor(a.input, c),
  },
};
