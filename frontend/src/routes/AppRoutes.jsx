import VendorAccessPage from "../modules/admin/pages/VendorAccessPage";
import VendorVerificationPage from "../modules/vendor/pages/VendorVerificationPage";
import VendorProfilePage from "../modules/vendor/pages/VendorProfilePage";
import { Routes, Route, Navigate, Link } from "react-router-dom";
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
import { VendorStatusPage } from "../modules/auth/pages/AccountPages";
const AdminContent = lazy(() => import("../modules/content/AdminContent"));
const ContactManagement = lazy(() =>
  import("../modules/content/AdminContent").then((m) => ({
    default: m.ContactManagement,
  })),
);
const PrivacyManagement = lazy(() =>
  import("../modules/content/AdminContent").then((m) => ({
    default: m.PrivacyManagement,
  })),
);
const LegalPage = lazy(() =>
  import("../modules/content/InfoPages").then((m) => ({
    default: m.LegalPage,
  })),
);
const LegalCenterPage = lazy(() =>
  import("../modules/content/InfoPages").then((m) => ({
    default: m.LegalCenterPage,
  })),
);
const MediaLibrary = lazy(() => import("../modules/media/MediaLibrary"));
const ReviewsWorkspace = lazy(() => import("../modules/reviews/Reviews"));
const NotificationCenter = lazy(
  () => import("../modules/communication/Notifications"),
);
const NotificationSettings = lazy(() =>
  import("../modules/communication/Notifications").then((m) => ({
    default: m.NotificationSettings,
  })),
);
const CommunicationOverview = lazy(
  () => import("../modules/communication/CommunicationOverview"),
);
const BusinessLocations = lazy(
  () => import("../modules/vendor/pages/BusinessLocations"),
);
const CustomerWishlist = lazy(
  () => import("../modules/customer/pages/CustomerWishlist"),
);
const VendorBookingDetails = lazy(
  () => import("../modules/vendor/pages/VendorBookingsPage"),
);
const VendorBookingsList = lazy(() => import("../modules/vendor/pages/VendorBookingsList"));
const VendorQuotationsList = lazy(() => import("../modules/vendor/pages/VendorQuotationsList"));
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
const QuotationList = lazy(() =>
  import("../modules/quotations/QuotationPages").then((m) => ({
    default: m.QuotationList,
  })),
);
const QuotationDetails = lazy(() =>
  import("../modules/quotations/QuotationPages").then((m) => ({
    default: m.QuotationDetails,
  })),
);
const QuotationRequestDetails = lazy(() =>
  import("../modules/quotations/QuotationPages").then((m) => ({
    default: m.RequestDetails,
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
const CustomerCheckout = lazy(
  () => import("../modules/customer/pages/CustomerCheckout"),
);
const CustomerRefundHistory = lazy(() =>
  import("../modules/customer/pages/CustomerRefunds").then((m) => ({
    default: m.RefundHistory,
  })),
);
const PaymentManagementPage = lazy(
  () => import("../modules/admin/pages/PaymentManagementPage"),
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

const AdminLayout = lazy(() => import("../modules/admin/layouts/AdminLayout"));

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
  () => import("../modules/marketplace/BrowsePage"),
);
const PublicListingDetails = lazy(
  () => import("../modules/marketplace/DetailPage"),
);
function PublicPage({ children }) {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]" role="status">
          Loading your next chapter?
        </main>
      }
    >
      {children}
    </Suspense>
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
      <Route
        path="/privacy-policy"
        element={
          <Suspense fallback={<div role="status">Loading policy...</div>}>
            <LegalPage documentKey="privacy" />
          </Suspense>
        }
      />
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
      {["services", "venues", "vendors", "packages"].map((path) => (
        <Route
          key={path}
          path={`/${path}/:id`}
          element={
            <PublicPage>
              <PublicListingDetails />
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
            <Route path="refunds" element={<CustomerRefundHistory />} />
            <Route path="events" element={<CustomerEvents />} />
            <Route path="events/:id" element={<CustomerEventDetails />} />
            <Route path="discover" element={<CustomerDiscovery />} />
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
              path="bookings/:id/checkout"
              element={<CustomerCheckout />}
            />
            <Route
              path="bookings/:id/checkout/:result"
              element={<CustomerCheckout />}
            />
            <Route
              path="payments/:id"
              element={<CustomerCheckout transaction />}
            />
            <Route
              path="quotations/:id"
              element={<QuotationDetails role="Customer" />}
            />
            <Route
              path="requests"
              element={<QuotationList role="Customer" requests />}
            />
            <Route
              path="requests/:id"
              element={<QuotationRequestDetails role="Customer" />}
            />
            <Route
              path="quotations"
              element={<QuotationList role="Customer" />}
            />
            <Route path="legal" element={<LegalCenterPage />} />
            <Route path="media" element={<MediaLibrary role="Customer" />} />
            <Route path="messages" element={<CustomerMessages />} />
            <Route
              path="notifications"
              element={<NotificationCenter role="Customer" />}
            />
            <Route
              path="notification-settings"
              element={<NotificationSettings role="Customer" />}
            />
            {["bookings", "wishlist", "payments", "reviews", "addresses"].map(
              (section) => (
                <Route
                  key={section}
                  path={section}
                  element={
                    section === "reviews" ? (
                      <ReviewsWorkspace role="Customer" />
                    ) : section === "wishlist" ? (
                      <CustomerWishlist />
                    ) : (
                      <CustomerRecords section={section} />
                    )
                  }
                />
              ),
            )}
            <Route
              path="*"
              element={<Navigate to="/customer/dashboard" replace />}
            />
          </Route>
        </Route>
        <Route element={<RoleRoute role="Vendor" />}>
          <Route element={<VendorApprovalRoute />}>
            <Route path="/vendor/inactive" element={<VendorStatusPage />} />
            <Route path="/vendor/pending" element={<VendorStatusPage />} />
            <Route path="/vendor/rejected" element={<VendorStatusPage />} />
            <Route path="/vendor/suspended" element={<VendorStatusPage />} />
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
              <Route path="profile" element={<VendorProfilePage />} />
              <Route path="legal" element={<LegalCenterPage />} />
              <Route path="media" element={<MediaLibrary role="Vendor" />} />
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
                element={<VendorVerificationPage />}
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
                element={<VendorQuotationsList category="requests" />}
              />
              <Route
                path="requests/:id"
                element={<QuotationRequestDetails role="Vendor" />}
              />
              <Route
                path="quotations/:id"
                element={<QuotationDetails role="Vendor" />}
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
              <Route
                path="notifications"
                element={<NotificationCenter role="Vendor" />}
              />
              <Route
                path="notification-settings"
                element={<NotificationSettings role="Vendor" />}
              />
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
              ].map((section) => (
                <Route
                  key={section}
                  path={section}
                  element={
                    section === "reviews" ? (
                      <ReviewsWorkspace role="Vendor" />
                    ) : section === "locations" ? (
                      <BusinessLocations />
                    ) : (
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
                    )
                  }
                />
              ))}
              <Route
                path="bookings"
                element={<Navigate to="/vendor/bookings/all" replace />}
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
                "all",
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
                    <VendorBookingsList
                      key={`bookings-${filter}`}
                      filter={filter}
                    />
                  }
                />
              ))}
              <Route
                path="quotations"
                element={<Navigate to="/vendor/quotations/all" replace />}
              />
              {Object.entries({
                all: "",
                drafts: "Draft",
                sent: "Sent",
                accepted: "Accepted",
                rejected: "Rejected",
                expired: "Expired",
                negotiations: "Negotiation",
                converted: "Converted",
              }).map(([path]) => (
                <Route
                  key={path}
                  path={`quotations/${path}`}
                  element={
                    <VendorQuotationsList key={path} category={path} />
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
            <Route
              path="reviews"
              element={
                <Suspense fallback={<div role="status">Loading reviews…</div>}>
                  <ReviewsWorkspace role="Admin" />
                </Suspense>
              }
            />
            <Route
              path="review-reports"
              element={
                <Suspense fallback={<div role="status">Loading reports…</div>}>
                  <ReviewsWorkspace role="Admin" />
                </Suspense>
              }
            />
            <Route
              path="content"
              element={
                <Suspense fallback={<div role="status">Loading...</div>}>
                  <AdminContent />
                </Suspense>
              }
            />
            <Route
              path="contact-inquiries"
              element={
                <Suspense fallback={<div role="status">Loading...</div>}>
                  <ContactManagement />
                </Suspense>
              }
            />
            <Route
              path="privacy-requests"
              element={
                <Suspense fallback={<div role="status">Loading...</div>}>
                  <PrivacyManagement />
                </Suspense>
              }
            />
            <Route
              path="media"
              element={
                <Suspense fallback={<div role="status">Loading media?</div>}>
                  <MediaLibrary role="Admin" />
                </Suspense>
              }
            />
            <Route path="finance/:kind/:id" element={<FinancialDetails />} />
            <Route path="bookings" element={<BookingsManagementPage />} />
            <Route
              path="bookings/:bookingId"
              element={<BookingDetailsPage />}
            />
            <Route
              path="payments"
              element={
                <PaymentManagementPage
                  key="transactions"
                  section="transactions"
                />
              }
            />
            <Route
              path="payment-overview"
              element={<PaymentManagementPage key="overview" />}
            />
            <Route
              path="refund-requests"
              element={
                <PaymentManagementPage key="refunds" section="refunds" />
              }
            />
            <Route
              path="payment-reconciliation"
              element={
                <PaymentManagementPage
                  key="reconciliation"
                  section="reconciliation"
                />
              }
            />
            <Route path="notifications" element={<AdminInbox />} />
            <Route
              path="communication-overview"
              element={<CommunicationOverview />}
            />
            <Route
              path="notification-settings"
              element={<NotificationSettings role="Admin" />}
            />
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
              path="vendor-access"
              element={<VendorAccessPage />}
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
              path="quotations"
              element={
                <Suspense
                  fallback={<div role="status">Loading quotations?</div>}
                >
                  <QuotationList role="Admin" />
                </Suspense>
              }
            />
            <Route
              path="quotations/:id"
              element={
                <Suspense
                  fallback={<div role="status">Loading quotation?</div>}
                >
                  <QuotationDetails role="Admin" />
                </Suspense>
              }
            />
            <Route
              path="quotation-requests"
              element={
                <Suspense fallback={<div role="status">Loading requests?</div>}>
                  <QuotationList role="Admin" requests />
                </Suspense>
              }
            />
            <Route
              path="requests/:id"
              element={
                <Suspense fallback={<div role="status">Loading request?</div>}>
                  <QuotationRequestDetails role="Admin" />
                </Suspense>
              }
            />
            <Route
              path="quotation-requests/:id"
              element={
                <Suspense fallback={<div role="status">Loading request?</div>}>
                  <QuotationRequestDetails role="Admin" />
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
      <Route
        path="/privacy"
        element={<Navigate to="/privacy-policy" replace />}
      />
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
