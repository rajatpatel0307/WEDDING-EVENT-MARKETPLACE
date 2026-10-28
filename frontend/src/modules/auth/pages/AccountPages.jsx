import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  Clock3,
  CircleX,
  Store,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useAuth, destination } from "../../../context/AuthContext";
import { client } from "../../../services/apollo";
import { gql } from "@apollo/client";
import { useEffect } from "react";
export function AccountLayout({ children }) {
  return (
    <div className="account-shell min-h-[100dvh] flex flex-col [&_.site-header]:w-full [&_.site-header]:max-w-none [&_.site-header]:[border-bottom:1px_solid_#ece2e5] [&_.site-header]:bg-white max-[850.001px]:[&_.site-header]:[padding:0_25px] max-[480.001px]:[&_.site-header]:[padding:0_18px] max-[480.001px]:[&_.site-header_nav]:gap-[13px]">
      <main id="main-content" className="account-main w-[min(1200px,_100%)] [padding:60px_40px] m-auto flex-1 [&_>_h1]:text-[43px] [&_>_h1]:mt-[15px] [&_>_.back-link]:[margin:0_0_25px] max-[850.001px]:[padding:35px_25px] max-[480.001px]:[&_>_h1]:text-[35px] max-[480.001px]:[padding:30px_18px]">
        {children}
      </main>
    </div>
  );
}
export function VendorStatusPage() {
  const { user, reload, notify } = useAuth(),
    [busy, setBusy] = useState(false);
  const status = user.vendor?.verificationStatus || "Pending";
  if (status === "Approved" && user.vendor.active)
    return <Navigate to="/vendor/dashboard" replace />;
  const pending = ["Pending", "UnderReview"].includes(status);
  const inactive = status === "Approved" && !user.vendor.active;
  async function check() {
    setBusy(true);
    try {
      await reload();
      notify("Your account status is up to date.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountLayout>
      <div className="status-card bg-white [border:1px_solid_#eee1e6] rounded-[14px] max-w-[740px] [padding:54px_60px] text-center [margin:10px_auto] [&_.eyebrow]:justify-center [&_h1]:text-[36px] [&_h1]:leading-[1.25] [&_h1]:[color:#67434f] [&_h1]:[margin:17px_0_20px] [&_p]:text-[13px] [&_p]:leading-[1.9] max-[850.001px]:[padding:40px_30px] max-[850.001px]:[&_h1]:text-[31px] max-[480.001px]:[padding:30px_20px] max-[480.001px]:[&_h1]:text-[28px]">
        <div className={`status-icon w-[70px] h-[70px] grid place-items-center rounded-full [background:#faf2e9] [color:#b68a61] [margin:0_auto_25px] [&.negative]:[background:#f9e9ec] [&.negative]:[color:#b16e7a] ${pending ? "" : "negative"}`}>
          {pending ? <Clock3 size={30} /> : <CircleX size={30} />}
        </div>
        <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">YOUR VENDOR JOURNEY</span>
        <h1>
          {pending
            ? "Registration Submitted Successfully"
            : status === "Rejected"
              ? "Your application needs attention."
              : inactive
                ? "Your vendor account is inactive."
                : "Your vendor account is suspended."}
        </h1>
        <p>
          {pending
            ? "Your vendor account is currently being reviewed by our administration team."
            : "Please review the information from our administration team below."}
        </p>
        {pending ? (
          <>
            <div className="review-timeline flex items-center justify-center gap-[12px] [padding:25px_0] text-[10px] [color:#b19da5] flex-wrap [&_span]:flex [&_span]:items-center [&_span]:gap-[5px] [&_.done]:[color:#7c997b] [&_i]:h-[1px] [&_i]:w-[20px] [&_i]:[background:#e1d3da] max-[480.001px]:gap-[9px] max-[480.001px]:[&_i]:hidden">
              <span className="done">
                <CheckIcon /> Email verified
              </span>
              <i />
              <span>
                <Clock3 size={16} /> Admin review
              </span>
              <i />
              <span>
                <Store size={16} /> Dashboard access
              </span>
            </div>
            <p>
              You will receive access to your Vendor Dashboard after your
              account has been approved.
            </p>
          </>
        ) : (
          <div className="info-box [border:1px_solid_#eaddd2] [background:#fcf8f2] rounded-[7px] [padding:15px] text-[12px] [color:#96785c] [margin:18px_0] [&_p]:mt-[6px]">
            <strong>
              {status === "Rejected"
                ? "Rejection reason"
                : "Account information"}
            </strong>
            <p>
              {user.vendor?.rejectionReason ||
                "Contact our support team for assistance."}
            </p>
          </div>
        )}
        <div className="status-actions flex items-center justify-center gap-[20px] mt-[27px] [&_>_.primary-button]:w-auto [&_>_.text-link]:text-[12px] max-[480.001px]:flex-col max-[480.001px]:[&_>_.primary-button]:w-full">
          <Link className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline" to="/vendor/services">
            Prepare service drafts <ArrowRight size={15} />
          </Link>
          <button className="primary-button [border:1px_solid_#8c414e] [background:#8c414e] text-white min-h-[46px] rounded-[6px] flex items-center justify-center gap-[12px] w-full text-[12px] font-medium [padding:12px_17px] [box-shadow:0_3px_5px_#8c414e0a] [&:hover:not(:disabled)]:[background:#783541] [&:hover:not(:disabled)]:[border-color:#783541] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&_svg:last-child]:ml-[6px]" onClick={check} disabled={busy}>
            <RefreshCw size={16} className={busy ? "spin animate-spin" : ""} />{" "}
            {busy ? "Checking…" : "Check status"}
          </button>
          <Link className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline" to="/contact">
            Contact support
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}
function CheckIcon() {
  return <ShieldCheck size={16} />;
}
export function Dashboard() {
  const { user } = useAuth(),
    [error, setError] = useState("");
  useEffect(() => {
    if (user.role === "Vendor")
      client
        .query({
          query: gql`
            query VendorWorkspace {
              vendorWorkspace {
                id
                businessName
              }
            }
          `,
        })
        .catch((e) => setError(e.message));
  }, [user.role]);
  return (
    <AccountLayout>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">
        {user.role === "Admin"
          ? "ADMINISTRATION"
          : user.role === "Vendor"
            ? "YOUR BUSINESS, BEAUTIFULLY CONNECTED"
            : "YOUR CELEBRATION STARTS HERE"}
      </span>
      <h1>Welcome{user.firstName ? `, ${user.firstName}` : ""}.</h1>
      <p className="dashboard-intro mt-[12px] text-[14px]">
        {user.role === "Admin"
          ? "A trusted marketplace begins with thoughtful review."
          : user.role === "Vendor"
            ? `${user.vendor.businessName} is approved. Your vendor space is ready.`
            : "A special place for your plans, your people and your next chapter."}
      </p>
      {error && (
        <div role="alert" className="error-box [padding:12px_14px] [border:1px_solid_#e8bac2] rounded-[6px] [background:#fff2f3] [color:#a1374a] text-[12px] mb-[20px] [overflow-wrap:anywhere]">
          {error}
        </div>
      )}
      <div className="dashboard-grid grid grid-cols-[1fr_1fr] gap-[25px] mt-[35px] max-[850.001px]:gap-[16px] max-[480.001px]:grid-cols-[1fr]">
        <div className="dashboard-card bg-white [border:1px_solid_#eee1e6] rounded-[10px] [padding:35px] [color:#9a707f] [&_h2]:text-[26px] [&_h2]:[margin:20px_0_12px] [&_h2]:[color:#5e434e] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_.text-link]:mt-[20px] [&_.text-link]:text-[12px] max-[850.001px]:[padding:25px]">
          <ShieldCheck size={28} />
          <h2>Your account is verified.</h2>
          <p>Your email is verified and your account is active.</p>
          <Link className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline" to="/auth/change-password">
            Manage your password <ArrowRight size={15} />
          </Link>
        </div>
        {user.role === "Admin" ? (
          <Link className="dashboard-card bg-white [border:1px_solid_#eee1e6] rounded-[10px] [padding:35px] [color:#9a707f] [&_h2]:text-[26px] [&_h2]:[margin:20px_0_12px] [&_h2]:[color:#5e434e] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_.text-link]:mt-[20px] [&_.text-link]:text-[12px] max-[850.001px]:[padding:25px] card-link [&:hover]:[border-color:#c7a3b2] [&:hover]:[transform:translateY(-2px)]" to="/admin/vendors">
            <Store size={28} />
            <h2>Vendor applications</h2>
            <p>Review businesses, documents and verification status.</p>
            <span className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline">
              Review vendors <ArrowRight size={15} />
            </span>
          </Link>
        ) : (
          <div className="dashboard-card bg-white [border:1px_solid_#eee1e6] rounded-[10px] [padding:35px] [color:#9a707f] [&_h2]:text-[26px] [&_h2]:[margin:20px_0_12px] [&_h2]:[color:#5e434e] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_.text-link]:mt-[20px] [&_.text-link]:text-[12px] max-[850.001px]:[padding:25px]">
            <Heart size={28} />
            <h2>
              {user.role === "Vendor"
                ? "Ready for beautiful celebrations."
                : "Beautiful things take a little planning."}
            </h2>
            <p>
              {user.role === "Vendor"
                ? "Your approved account is ready to connect with the marketplace as business tools are added."
                : "Your customer account is ready. Marketplace planning tools will appear here as they become available."}
            </p>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
