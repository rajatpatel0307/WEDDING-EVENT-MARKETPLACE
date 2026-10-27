import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";
export const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql",
    credentials: "include",
    headers: { "Apollo-Require-Preflight": "true" },
  }),
  cache: new InMemoryCache(),
  defaultOptions: { query: { fetchPolicy: "cache-first" } },
});
export const userFields =
  "id firstName lastName email phone profilePhotoUrl role accountStatus vendor { id businessName active verificationStatus rejectionReason }";
export const ME = gql(
  `query Me { me { ${userFields} wishlistCount unreadNotificationCount unreadMessageCount } }`,
);
const inputs = {
  registerCustomer: "CustomerInput",
  registerVendor: "VendorInput",
  login: "LoginInput",
  verifyEmailOtp: "EmailOtpInput",
  resendEmailOtp: "EmailInput",
  forgotPassword: "ForgotPasswordInput",
  verifyResetOtp: "ResetOtpInput",
  resetPassword: "ResetPasswordInput",
  changePassword: "ChangePasswordInput",
  uploadProfilePhoto: "UploadPhotoInput",
  uploadVendorDocument: "UploadDocumentInput",
  reviewVendor: "ReviewVendorInput",
};
export async function mutate(name, input) {
  const fields =
    name === "uploadProfilePhoto"
      ? "uploadToken url"
      : name === "uploadVendorDocument"
        ? "uploadToken name"
        : name === "reviewVendor"
          ? "id verificationStatus rejectionReason"
          : `success message resetToken user { ${userFields} }`;
  const result = await client.mutate({
    mutation: gql(
      `mutation ${name} ${inputs[name] ? `($input: ${inputs[name]}!)` : ""} { ${name}${inputs[name] ? "(input:$input)" : ""} { ${fields} } }`,
    ),
    variables: inputs[name] ? { input } : undefined,
  });
  return result.data[name];
}
