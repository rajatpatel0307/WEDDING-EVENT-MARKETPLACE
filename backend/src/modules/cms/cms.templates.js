export const termsTitles = [
  "Introduction",
  "Definitions",
  "Eligibility and Account Registration",
  "User Responsibilities",
  "Customer Responsibilities",
  "Vendor Registration and Responsibilities",
  "Vendor Verification and Approval",
  "Marketplace Services",
  "Service Listings and Packages",
  "Pricing and Quotations",
  "Booking Rules",
  "Booking Confirmation",
  "Payment Terms",
  "Platform Fees and Commission",
  "Cancellation and Rescheduling",
  "Refund Policy",
  "Vendor Payouts",
  "Reviews and Ratings",
  "Communication Between Customers and Vendors",
  "Prohibited Activities",
  "Intellectual Property",
  "Media and Uploaded Content",
  "Privacy and Personal Information",
  "Third-Party Services",
  "Limitation of Liability",
  "Disclaimer",
  "Suspension and Account Termination",
  "Dispute Resolution",
  "Changes to Terms",
  "Contact Information",
];
export const privacyTitles = [
  "Introduction",
  "Scope of the Privacy Policy",
  "Information We Collect",
  "Account Registration Information",
  "Customer Information",
  "Vendor and Business Information",
  "Booking and Event Information",
  "Payment-Related Information",
  "Communication and Messages",
  "Reviews and Uploaded Images",
  "Location Information",
  "Cookies and Similar Technologies",
  "How We Use Information",
  "How We Share Information",
  "Third-Party Services",
  "Payment Gateway Information",
  "Cloudinary and Media Storage",
  "Data Storage and Retention",
  "Data Security",
  "User Privacy Rights",
  "Accessing and Updating Personal Information",
  "Account Deletion Requests",
  "Marketing and Communication Preferences",
  "Children's Privacy",
  "International Data Transfers",
  "Changes to Privacy Policy",
  "Contact and Privacy Requests",
];
export const section = (title, body = "") => ({
  id: title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, ""),
  title,
  body,
});
const base = (title) => ({
  title,
  introduction: "",
  metaTitle: title,
  metaDescription: "",
  heroMediaId: null,
  imageAlt: "Wedding and event planning",
  sections: [],
  benefits: [],
  steps: [],
  customerBenefits: [],
  vendorBenefits: [],
  ctas: [],
  categoryOverrides: [],
  faqs: [],
  contact: {
    companyName: "MarryNest",
    supportEmail: "",
    phone: "",
    address: "",
    workingHours: "",
    socialLinks: [],
    addressVerified: false,
    mapUrl: "",
    formEnabled: true,
    phoneRequired: false,
    acknowledgementEnabled: true,
  },
});
export function template(key) {
  if (key === "terms" || key === "privacy")
    return {
      ...base(key === "terms" ? "Terms & Conditions" : "Privacy Policy"),
      sections: (key === "terms" ? termsTitles : privacyTitles).map((title) =>
        section(title),
      ),
    };
  if (key === "contact")
    return {
      ...base("Let’s talk about your next chapter."),
      introduction:
        "Questions about your account, a service, or an existing booking? Send an inquiry to the team.",
      metaDescription:
        "Contact the MarryNest team about accounts, vendors, services and event planning.",
      faqs: [
        section(
          "How do I request a quotation?",
          "Open a service and choose Request quotation. Sign in to send your event requirements to the vendor.",
        ),
        section(
          "Where can I find my bookings?",
          "Sign in to your customer account and open My Bookings.",
        ),
        section(
          "How can vendors manage their listings?",
          "Approved vendors can manage their services, packages and bookings in the Vendor Dashboard.",
        ),
      ],
    };
  return {
    ...base("A little less searching. A little more celebrating."),
    introduction:
      "MarryNest brings wedding and event services together so customers and vendors can plan the details in one connected marketplace.",
    metaDescription:
      "Discover the purpose of MarryNest, a marketplace connecting customers with wedding and event services.",
    sections: [
      section(
        "Our purpose",
        "Planning an event means coordinating venues, services, dates and budgets. This marketplace brings discovery, quotations, bookings and conversations into one place.",
      ),
      section(
        "Our mission",
        "Our aim is to make wedding and event planning easier to organize, with clearer service information and a direct connection to vendors.",
      ),
      section(
        "Our vision",
        "Our ambition is a trusted place to discover professionals and plan the services that bring a celebration together.",
      ),
    ],
    benefits: [
      section(
        "A world of services",
        "Explore wedding and event service categories in one marketplace.",
      ),
      section(
        "Clearer choices",
        "Compare services and packages and request quotations for your event.",
      ),
      section(
        "Plans in one place",
        "Manage bookings, conversations and reviews through your account.",
      ),
    ],
    steps: [
      "Explore services",
      "Discover vendors",
      "Request quotations",
      "Compare options",
      "Book services",
      "Plan your event",
    ],
    customerBenefits: [
      "Discover vendors",
      "Compare services and packages",
      "Request quotations",
      "Communicate with vendors",
      "Manage bookings",
      "Share verified booking reviews",
    ],
    vendorBenefits: [
      "Create a business profile",
      "List services and packages",
      "Receive quotation requests",
      "Manage bookings",
      "Communicate with customers",
      "Respond to customer reviews",
    ],
    ctas: [
      { label: "Explore services", href: "/services" },
      { label: "Become a vendor", href: "/auth/signup?role=vendor" },
      { label: "Contact us", href: "/contact" },
    ],
  };
}
