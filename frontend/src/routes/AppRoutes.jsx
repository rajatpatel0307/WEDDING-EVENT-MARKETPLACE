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
const VendorBookingDetails = lazy(
  () => import("../modules/vendor/pages/VendorBookingsPage"),
);
const BookingsManagementPage = lazy(
  () => import("../modules/admin/pages/BookingsManagementPage"),
);
const BookingDetailsPage = lazy(
  () => import("../modules/admin/pages/BookingDetailsPage"),
);
const ServicesManagementPage = lazy(
  () => import("../modules/admin/pages/ServicesManagementPage"),
);
const ServiceManagementDetails = lazy(
  () => import("../modules/admin/pages/ServiceManagementDetails"),
);
const AdminServiceEditor = lazy(
  () => import("../modules/admin/pages/AdminServiceEditor"),
);
const ServiceApprovalPage = lazy(
  () => import("../modules/admin/pages/ServiceApprovalPage"),
);
const CustomerLayout = lazy(() => import("../modules/customer/CustomerLayout"));
const CustomerDashboardPage = lazy(
  () => import("../modules/customer/pages/CustomerDashboard"),
);
const CustomerDiscovery = lazy(
  () => import("../modules/customer/pages/CustomerDiscovery"),
);
const CustomerServiceDetails = lazy(() =>
  import("../modules/customer/pages/CustomerDiscovery").then((m) => ({
    default: m.CustomerServiceDetails,
  })),
);
const CustomerEvents = lazy(
  () => import("../modules/customer/pages/CustomerEvents"),
);
const CustomerEventDetails = lazy(() =>
  import("../modules/customer/pages/CustomerEvents").then((m) => ({
    default: m.CustomerEventDetails,
  })),
);
const CustomerRecords = lazy(
  () => import("../modules/customer/pages/CustomerRecords"),
);
const CustomerRecordDetails = lazy(() =>
  import("../modules/customer/pages/CustomerRecords").then((m) => ({
    default: m.CustomerRecordDetails,
  })),
);
const CustomerProfile = lazy(() =>
  import("../modules/customer/pages/CustomerRecords").then((m) => ({
    default: m.CustomerProfile,
  })),
);
const CustomerMessages = lazy(
  () => import("../modules/customer/pages/CustomerMessagesPage"),
);
const VendorLayout = lazy(
  () => import("../modules/vendor/layouts/VendorLayout"),
);
const VendorDashboardPage = lazy(
  () => import("../modules/vendor/pages/VendorDashboard"),
);
const VendorResourcesPage = lazy(
  () => import("../modules/vendor/pages/VendorResourcesPage"),
);
const VendorBusinessPage = lazy(
  () => import("../modules/vendor/pages/VendorBusinessPage"),
);
const VendorCalendarPage = lazy(
  () => import("../modules/vendor/pages/VendorCalendarPage"),
);
const VendorMessagesPage = lazy(
  () => import("../modules/vendor/pages/VendorMessagesPage"),
);
const VendorEarningsPage = lazy(
  () => import("../modules/vendor/pages/VendorEarningsPage"),
);
const ServiceForm = lazy(
  () => import("../modules/vendor/service-management/ServiceEditor"),
);
const VendorServiceList = lazy(
  () => import("../modules/vendor/service-management/ServiceList"),
);
const VendorServiceDetails = lazy(
  () => import("../modules/vendor/service-management/ServiceDetails"),
);
const VendorPackageRoute = lazy(
  () => import("../modules/vendor/service-management/PackageRoute"),
);
const VendorServicePackages = lazy(
  () => import("../modules/vendor/service-management/ServicePackages"),
);
const VendorServiceAvailability = lazy(
  () => import("../modules/vendor/service-management/ServiceAvailability"),
);
const QuotationForm = lazy(() =>
  import("../modules/vendor/components/WorkspaceForms").then((m) => ({
    default: m.QuotationForm,
  })),
);
const AdminInbox = lazy(() => import("../modules/admin/pages/AdminInbox"));
const FinancialDetails = lazy(
  () => import("../modules/admin/pages/FinancialDetails"),
);
const AdminLayout = lazy(() => import("../modules/admin/AdminLayout"));
const AdminDashboard = lazy(
  () => import("../modules/admin/pages/AdminDashboard"),
);
const VendorApprovalPage = lazy(
  () => import("../modules/admin/pages/VendorApprovalPage"),
);
const VendorDetailsPage = lazy(
  () => import("../modules/admin/pages/VendorDetailsPage"),
);
const CustomerDetailsPage = lazy(
  () => import("../modules/admin/pages/CustomerDetailsPage"),
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
    <main
      id="main-content"
      className="legal-page max-w-[780px] [margin:60px_auto] [padding:0_25px_60px] [&_>_.eyebrow]:mt-[30px] [&_h1]:text-[42px] [&_h1]:[margin:15px_0_25px] [&_h2]:text-[27px] [&_h2]:[margin:30px_0_12px] [&_p]:text-[14px] [&_p]:leading-[1.9] max-[480.001px]:mt-[25px]"
    >
      <Link
        className="back-link inline-flex gap-[8px] items-center [color:#8d6a72] text-[12px] mt-[25px]"
        to="/auth/signup"
      >
        ← Back to registration
      </Link>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">
        MARRYNEST
      </span>
      <h1>{privacy ? "Privacy Policy" : "Terms & Conditions"}</h1>
      <div className="info-box [border:1px_solid_#eaddd2] [background:#fcf8f2] rounded-[7px] [padding:15px] text-[12px] [color:#96785c] [margin:18px_0] [&_p]:mt-[6px]">
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
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">
        YOUR MARRYNEST ACCOUNT
      </span>
      <h1>{name || "Page not found"}</h1>
      <p className="dashboard-intro mt-[12px] text-[14px]">
        {name
          ? "This workspace is being prepared. Your account is ready; live marketplace tools will appear here as they become available."
          : "This page is not available."}
      </p>
      <Link
        className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline"
        to="/auth/change-password"
      >
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
          <Route
            path="/customer"
            element={
              <Suspense
                fallback={
                  <div role="status" className="p-8">
                    Loading your planning space...
                  </div>
                }
              >
                <CustomerLayout />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboardPage />} />
            <Route path="profile" element={<CustomerProfile />} />
            <Route path="settings" element={<CustomerProfile settings />} />
            <Route path="events" element={<CustomerEvents />} />
            <Route path="events/:id" element={<CustomerEventDetails />} />
            <Route path="discover" element={<CustomerDiscovery />} />
            <Route
              path="bookings"
              element={
                <Suspense
                  fallback={<div role="status">Loading bookings...</div>}
                >
                  <BookingsManagementPage />
                </Suspense>
              }
            />
            <Route
              path="bookings/:bookingId"
              element={
                <Suspense
                  fallback={<div role="status">Loading booking...</div>}
                >
                  <BookingDetailsPage />
                </Suspense>
              }
            />
            <Route
              path="services"
              element={<Navigate to="/customer/discover" replace />}
            />
            <Route path="services/:id" element={<CustomerServiceDetails />} />
            <Route
              path="vendors/:id"
              element={<CustomerServiceDetails vendor />}
            />
            <Route path="bookings/:id" element={<CustomerRecordDetails />} />
            <Route
              path="quotations/:id"
              element={<CustomerRecordDetails quote />}
            />
            <Route path="messages" element={<CustomerMessages />} />
            {[
              "bookings",
              "quotations",
              "requests",
              "wishlist",
              "payments",
              "reviews",
              "addresses",
              "notifications",
            ].map((section) => (
              <Route
                key={section}
                path={section}
                element={<CustomerRecords section={section} />}
              />
            ))}
            <Route
              path="*"
              element={<Navigate to="/customer/dashboard" replace />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute role="Vendor" />}>
          <Route path="/vendor/profile" element={<ProfilePage />} />
          <Route path="/vendor/inactive" element={<VendorStatusPage />} />
          <Route path="/vendor/pending" element={<VendorStatusPage />} />
          <Route path="/vendor/rejected" element={<VendorStatusPage />} />
          <Route path="/vendor/suspended" element={<VendorStatusPage />} />
          <Route element={<VendorApprovalRoute />}>
            <Route
              path="/vendor"
              element={
                <Suspense
                  fallback={
                    <div role="status" className="p-8">
                      Loading vendor workspace...
                    </div>
                  }
                >
                  <VendorLayout />
                </Suspense>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<VendorDashboardPage />} />
              <Route
                path="analytics"
                element={<VendorDashboardPage analyticsOnly />}
              />
              <Route path="business/profile" element={<VendorBusinessPage />} />
              <Route path="settings" element={<VendorBusinessPage />} />
              <Route
                path="business/details"
                element={<VendorBusinessPage mode="details" />}
              />
              <Route
                path="verification"
                element={<VendorBusinessPage mode="verification" />}
              />
              <Route path="services/new" element={<ServiceForm />} />
              <Route path="services/add" element={<ServiceForm />} />
              <Route path="services" element={<VendorServiceList />} />
              <Route path="services/:id/edit" element={<ServiceForm />} />
              <Route path="services/:id" element={<VendorServiceDetails />} />
              <Route
                path="services/:id/packages"
                element={<VendorServicePackages />}
              />
              <Route
                path="services/:id/availability"
                element={<VendorServiceAvailability />}
              />
              <Route path="packages/new" element={<VendorPackageRoute />} />
              <Route path="packages/add" element={<VendorPackageRoute />} />
              <Route
                path="packages/:id/edit"
                element={<VendorPackageRoute />}
              />
              <Route
                path="requests"
                element={<VendorResourcesPage section="requests" />}
              />
              <Route path="quotations/new" element={<QuotationForm />} />
              <Route path="quotations/:id/edit" element={<QuotationForm />} />
              <Route path="calendar" element={<VendorCalendarPage />} />
              <Route
                path="availability"
                element={<Navigate to="/vendor/calendar" replace />}
              />
              <Route
                path="availability/blocked"
                element={<VendorCalendarPage filter="blocked" />}
              />
              <Route
                path="availability/available"
                element={<VendorCalendarPage filter="available" />}
              />
              <Route path="messages" element={<VendorMessagesPage />} />
              <Route path="earnings" element={<VendorEarningsPage />} />
              {[
                "packages",
                "items",
                "locations",
                "documents",
                "customers",
                "payouts",
                "transactions",
                "reviews",
                "offers",
                "coupons",
                "notifications",
              ].map((section) => (
                <Route
                  key={section}
                  path={section}
                  element={
                    <VendorResourcesPage
                      key={section}
                      section={section}
                      title={
                        section === "services"
                          ? "My services"
                          : section === "items"
                            ? "Service items"
                            : section === "packages"
                              ? "Service packages"
                              : undefined
                      }
                    />
                  }
                />
              ))}
              <Route
                path="bookings"
                element={<Navigate to="/vendor/bookings/requests" replace />}
              />
              <Route
                path="bookings/:id"
                element={
                  <Suspense
                    fallback={<div role="status">Loading booking…</div>}
                  >
                    <VendorBookingDetails />
                  </Suspense>
                }
              />
              {[
                "requests",
                "upcoming",
                "active",
                "completed",
                "cancelled",
                "cancellations",
                "reschedules",
              ].map((filter) => (
                <Route
                  key={filter}
                  path={`bookings/${filter}`}
                  element={
                    <VendorResourcesPage
                      key={`bookings-${filter}`}
                      section="bookings"
                      filter={filter}
                      title={`${filter === "requests" ? "Booking requests" : filter[0].toUpperCase() + filter.slice(1) + " bookings"}`}
                    />
                  }
                />
              ))}
              <Route
                path="quotations"
                element={<Navigate to="/vendor/quotations/sent" replace />}
              />
              {["drafts", "sent", "accepted", "rejected"].map((filter) => (
                <Route
                  key={filter}
                  path={`quotations/${filter}`}
                  element={
                    <VendorResourcesPage
                      key={`quotes-${filter}`}
                      section="quotations"
                      filter={filter}
                      title={`${filter[0].toUpperCase() + filter.slice(1)} quotations`}
                    />
                  }
                />
              ))}
              <Route
                path="*"
                element={
                  <div className="vw-empty">
                    <h1>Page not found</h1>
                    <Link to="/vendor/dashboard">Return to dashboard</Link>
                  </div>
                }
              />
            </Route>
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
            <Route path="finance/:kind/:id" element={<FinancialDetails />} />
            <Route path="notifications" element={<AdminInbox />} />
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
              path="services"
              element={
                <Suspense
                  fallback={<div role="status">Loading services...</div>}
                >
                  <ServicesManagementPage />
                </Suspense>
              }
            />
            <Route
              path="services/new"
              element={
                <Suspense
                  fallback={<div role="status">Loading service editor...</div>}
                >
                  <AdminServiceEditor />
                </Suspense>
              }
            />
            <Route
              path="services/:serviceId/edit"
              element={
                <Suspense
                  fallback={<div role="status">Loading service editor...</div>}
                >
                  <AdminServiceEditor />
                </Suspense>
              }
            />
            <Route
              path="services/:serviceId"
              element={
                <Suspense
                  fallback={<div role="status">Loading service...</div>}
                >
                  <ServiceManagementDetails />
                </Suspense>
              }
            />
            <Route
              path="service-items"
              element={
                <Suspense fallback={<div role="status">Loading items...</div>}>
                  <ServicesManagementPage kind="items" />
                </Suspense>
              }
            />
            <Route
              path="service-packages"
              element={
                <Suspense
                  fallback={<div role="status">Loading packages...</div>}
                >
                  <ServicesManagementPage kind="packages" />
                </Suspense>
              }
            />
            <Route
              path="services/pending"
              element={
                <Suspense
                  fallback={<div role="status">Loading service queue...</div>}
                >
                  <ServiceApprovalPage />
                </Suspense>
              }
            />
            <Route
              path="services/:serviceId/review"
              element={
                <Suspense
                  fallback={<div role="status">Loading service review...</div>}
                >
                  <ServiceApprovalPage review />
                </Suspense>
              }
            />
            <Route
              path="applications"
              element={<Navigate to="/admin/vendors/pending" replace />}
            />
            <Route
              path="vendors/pending"
              element={
                <Suspense
                  fallback={
                    <div className="ad-panel" role="status">
                      Loading vendor approval queue...
                    </div>
                  }
                >
                  <VendorApprovalPage />
                </Suspense>
              }
            />
            <Route
              path="vendors/:id"
              element={
                <Suspense
                  fallback={
                    <div className="ad-panel" role="status">
                      Loading vendor details...
                    </div>
                  }
                >
                  <VendorDetailsPage />
                </Suspense>
              }
            />
            <Route
              path="customers/:id"
              element={
                <Suspense
                  fallback={
                    <div className="ad-panel" role="status">
                      Loading customer details...
                    </div>
                  }
                >
                  <CustomerDetailsPage />
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
          <main
            id="main-content"
            className="legal-page max-w-[780px] [margin:60px_auto] [padding:0_25px_60px] [&_>_.eyebrow]:mt-[30px] [&_h1]:text-[42px] [&_h1]:[margin:15px_0_25px] [&_h2]:text-[27px] [&_h2]:[margin:30px_0_12px] [&_p]:text-[14px] [&_p]:leading-[1.9] max-[480.001px]:mt-[25px]"
          >
            <h1>This page isn't here.</h1>
            <Link to="/auth/login">Return to sign in</Link>
          </main>
        }
      />
    </Routes>
  );
}
