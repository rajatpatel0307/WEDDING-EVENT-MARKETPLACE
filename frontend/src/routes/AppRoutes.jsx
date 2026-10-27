import { Routes, Route, Navigate, Link, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import GuestRoute from "./GuestRoute";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import VendorApprovalRoute from "./VendorApprovalRoute";
import ProfilePage from "../modules/auth/pages/ProfilePage";
import LoginPage from "../modules/auth/pages/LoginPage";
import RegisterPage from "../modules/auth/pages/RegisterPage";
import ForgotPasswordPage from "../modules/auth/pages/ForgotPasswordPage";
import OtpPage from "../modules/auth/pages/OtpPage";
import ResetPasswordPage from "../modules/auth/pages/ResetPasswordPage";
import {
  Dashboard,
  AccountLayout,
  VendorStatusPage,
} from "../modules/auth/pages/AccountPages";
const AdminLayout = lazy(() => import("../modules/admin/AdminLayout"));
const AdminDashboard = lazy(
  () => import("../modules/admin/pages/AdminDashboard"),
);
const AdminManagement = lazy(
  () => import("../modules/admin/pages/AdminManagement"),
);
import MarketplacePage from "../modules/public/pages/MarketplacePage";
const HomePage = lazy(() => import("../modules/public/pages/HomePage"));
const AboutPage = lazy(() => import("../modules/public/pages/AboutPage"));
const ContactPage = lazy(() => import("../modules/public/pages/ContactPage"));
const TermsPage = lazy(
  () => import("../modules/public/pages/TermsAndConditionsPage"),
);
const MarketplaceListingsPage = lazy(
  () => import("../modules/public/pages/MarketplaceListingsPage"),
);
function PublicPage({ children }) {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="mp-section" role="status">
          Loading your next chapter?
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
function Legal({ privacy = false }) {
  return (
    <main id="main-content" className="legal-page">
      <Link className="back-link" to="/auth/signup">
        ← Back to registration
      </Link>
      <span className="eyebrow">MARRYNEST</span>
      <h1>{privacy ? "Privacy Policy" : "Terms & Conditions"}</h1>
      <div className="info-box">
        Policy preview. The marketplace operator must review and publish its
        approved legal policies before accepting public registrations.
      </div>
      {privacy ? (
        <>
          <h2>Information used for your account</h2>
          <p>
            Registration collects your name, email address, phone number and
            encrypted password credentials. Vendor applications also include
            business details, service categories, locations and verification
            documents.
          </p>
          <h2>Why this information is used</h2>
          <p>
            Account information supports sign-in, email verification, password
            recovery and vendor review. Security events are recorded to help
            protect accounts. Verification documents are restricted to
            authorized administrators.
          </p>
          <h2>Questions and requests</h2>
          <p>
            Contact the marketplace operator for information about retention,
            access, correction and deletion. The operator must publish verified
            contact details, retention periods and applicable rights before
            launch.
          </p>
        </>
      ) : (
        <>
          <h2>Your account</h2>
          <p>
            Provide accurate registration details and protect your password. Do
            not share verification codes. You are responsible for activity
            carried out through your account.
          </p>
          <h2>Vendor review</h2>
          <p>
            Vendor registration does not guarantee approval. Access to vendor
            tools requires email verification and administrative approval.
            Administrators may reject or suspend an application and provide a
            review note.
          </p>
          <h2>Marketplace services</h2>
          <p>
            Booking, payment, cancellation, refund and dispute terms must be
            published by the operator before those features launch. These
            account terms do not define those business policies.
          </p>
        </>
      )}
    </main>
  );
}
function AccountFeaturePage() {
  const { section } = useParams();
  const name = {
    quotations: "Quotations",
    profile: "My profile",
    wishlist: "Wishlist",
    bookings: "Bookings",
    messages: "Messages",
    notifications: "Notifications",
    services: "Services",
    availability: "Availability",
    reviews: "Reviews",
    payments: "Payments",
    reports: "Reports",
    users: "Users",
  }[section];
  return (
    <AccountLayout>
      <span className="eyebrow">YOUR MARRYNEST ACCOUNT</span>
      <h1>{name || "Page not found"}</h1>
      <p className="dashboard-intro">
        {name
          ? "This workspace is being prepared. Your account is ready; live marketplace tools will appear here as they become available."
          : "This page is not available."}
      </p>
      <Link className="text-link" to="/auth/change-password">
        Manage account security
      </Link>
    </AccountLayout>
  );
}
export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicPage>
            <HomePage />
          </PublicPage>
        }
      />
      <Route
        path="/about"
        element={
          <PublicPage>
            <AboutPage />
          </PublicPage>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicPage>
            <ContactPage />
          </PublicPage>
        }
      />
      <Route
        path="/terms-and-conditions"
        element={
          <PublicPage>
            <TermsPage />
          </PublicPage>
        }
      />
      <Route path="/privacy-policy" element={<Legal privacy />} />
      {["services", "venues", "vendors", "packages", "search", "offers"].map(
        (path) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <PublicPage>
                <MarketplaceListingsPage />
              </PublicPage>
            }
          />
        ),
      )}
      {["venues", "vendors", "packages"].map((path) => (
        <Route
          key={path}
          path={`/${path}/:id`}
          element={
            <PublicPage>
              <MarketplaceListingsPage />
            </PublicPage>
          }
        />
      ))}
      {[
        "careers",
        "blog",
        "help",
        "help/bookings",
        "help/payments",
        "faq",
        "cookies",
        "refunds",
        "cancellation",
      ].map((path) => (
        <Route key={path} path={`/${path}`} element={<MarketplacePage />} />
      ))}
      <Route
        path="/wishlist"
        element={<Navigate to="/customer/wishlist" replace />}
      />
      <Route element={<GuestRoute />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<RegisterPage />} />
        <Route path="/auth/verify-email" element={<OtpPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-reset-otp" element={<OtpPage reset />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route
          path="/auth/change-password"
          element={<ResetPasswordPage change />}
        />
        <Route element={<RoleRoute role="Customer" />}>
          <Route path="/customer/profile" element={<ProfilePage />} />
          <Route path="/customer/dashboard" element={<Dashboard />} />
          <Route path="/customer/:section" element={<AccountFeaturePage />} />
        </Route>
        <Route element={<RoleRoute role="Vendor" />}>
          <Route path="/vendor/profile" element={<ProfilePage />} />
          <Route path="/vendor/pending" element={<VendorStatusPage />} />
          <Route path="/vendor/rejected" element={<VendorStatusPage />} />
          <Route path="/vendor/suspended" element={<VendorStatusPage />} />
          <Route element={<VendorApprovalRoute />}>
            <Route path="/vendor/dashboard" element={<Dashboard />} />
            <Route path="/vendor/:section" element={<AccountFeaturePage />} />
          </Route>
        </Route>
        <Route element={<RoleRoute role="Admin" />}>
          <Route
            path="/admin"
            element={
              <Suspense
                fallback={
                  <div className="p-8 animate-pulse" role="status">
                    Loading administration…
                  </div>
                }
              >
                <AdminLayout />
              </Suspense>
            }
          >
            <Route path="profile" element={<ProfilePage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <Suspense
                  fallback={
                    <div
                      className="h-72 animate-pulse rounded-xl bg-white"
                      role="status"
                      aria-label="Loading dashboard"
                    />
                  }
                >
                  <AdminDashboard />
                </Suspense>
              }
            />
            <Route
              path=":resource"
              element={
                <Suspense
                  fallback={
                    <div
                      className="h-72 animate-pulse rounded-xl bg-white"
                      role="status"
                      aria-label="Loading management tools"
                    />
                  }
                >
                  <AdminManagement />
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Route>
      <Route
        path="/terms"
        element={<Navigate to="/terms-and-conditions" replace />}
      />
      <Route path="/privacy" element={<Legal privacy />} />
      <Route
        path="*"
        element={
          <main id="main-content" className="legal-page">
            <h1>This page isn't here.</h1>
            <Link to="/auth/login">Return to sign in</Link>
          </main>
        }
      />
    </Routes>
  );
}
