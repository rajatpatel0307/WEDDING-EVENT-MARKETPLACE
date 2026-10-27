export const typeDefs = `#graphql
  type User { id: ID!, firstName: String!, lastName: String, email: String!, phone: String, profilePhotoUrl: String, role: String!, accountStatus: String!, vendor: Vendor, wishlistCount: Int!, unreadNotificationCount: Int!, unreadMessageCount: Int! }
  type Category { id: ID!, name: String! }
  type Location { id: ID!, address: String!, city: String!, state: String!, country: String!, postalCode: String, latitude: Float, longitude: Float }
  type Document { id: ID!, type: String! }
  type Vendor { id: ID!, businessName: String!, businessDescription: String, businessEmail: String, businessPhone: String, verificationStatus: String!, rejectionReason: String, createdAt: String!, user: User, categories: [Category!]!, locations: [Location!]!, documents: [Document!]! }
  type AuthResponse { success: Boolean!, message: String!, user: User, resetToken: String }
  type UploadedDocument { uploadToken: String!, name: String! }
  type UploadedPhoto { uploadToken: String!, url: String! }
  input UploadPhotoInput { email: String, base64: String! }
  type DownloadedDocument { name: String!, mimeType: String!, base64: String! }
  input CustomerInput { profilePhotoToken: String, firstName: String!, lastName: String!, email: String!, phone: String!, password: String!, confirmPassword: String!, terms: Boolean!, privacy: Boolean! }
  input LocationInput { address: String!, city: String!, state: String!, country: String!, postalCode: String!, latitude: Float, longitude: Float }
  input DocumentInput { type: String!, uploadToken: String! }
  input VendorInput { profilePhotoToken: String, firstName: String!, lastName: String!, email: String!, phone: String!, password: String!, confirmPassword: String!, terms: Boolean!, privacy: Boolean!, businessName: String!, businessDescription: String!, businessEmail: String!, businessPhone: String!, categories: [String!]!, location: LocationInput!, documents: [DocumentInput!]! }
  input LoginInput { identifier: String!, password: String! }
  input EmailOtpInput { email: String!, code: String! }
  input EmailInput { email: String! }
  input ForgotPasswordInput { identifier: String! }
  input ResetOtpInput { identifier: String!, code: String! }
  input ResetPasswordInput { resetToken: String!, password: String!, confirmPassword: String! }
  input ChangePasswordInput { currentPassword: String!, password: String!, confirmPassword: String! }
  input UploadDocumentInput { email: String!, name: String!, base64: String! }
  input ReviewVendorInput { id: ID!, status: String!, reason: String }
  type Query { me: User, serviceCategories: [String!]!, adminVendors(offset: Int): [Vendor!]!, vendorWorkspace: Vendor!, adminDocument(id: ID!): DownloadedDocument! }
  type NewsletterResponse { success: Boolean!, message: String! }
  type Mutation {
    subscribeNewsletter(email: String!): NewsletterResponse!
    registerCustomer(input: CustomerInput!): AuthResponse!
    registerVendor(input: VendorInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!
    logout: AuthResponse!
    verifyEmailOtp(input: EmailOtpInput!): AuthResponse!
    resendEmailOtp(input: EmailInput!): AuthResponse!
    forgotPassword(input: ForgotPasswordInput!): AuthResponse!
    verifyResetOtp(input: ResetOtpInput!): AuthResponse!
    resetPassword(input: ResetPasswordInput!): AuthResponse!
    changePassword(input: ChangePasswordInput!): AuthResponse!
    refreshToken: AuthResponse!
    uploadProfilePhoto(input: UploadPhotoInput!): UploadedPhoto!
    updateProfilePhoto(uploadToken: String!): AuthResponse!
    uploadVendorDocument(input: UploadDocumentInput!): UploadedDocument!
    reviewVendor(input: ReviewVendorInput!): Vendor!
  }
`;
