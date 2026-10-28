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
    <div className="account-shell">
      <main id="main-content" className="account-main">
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
      <div className="status-card">
        <div className={`status-icon ${pending ? "" : "negative"}`}>
          {pending ? <Clock3 size={30} /> : <CircleX size={30} />}
        </div>
        <span className="eyebrow">YOUR VENDOR JOURNEY</span>
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
            <div className="review-timeline">
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
          <div className="info-box">
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
        <div className="status-actions">
          <Link className="text-link" to="/vendor/services">
            Prepare service drafts <ArrowRight size={15} />
          </Link>
          <button className="primary-button" onClick={check} disabled={busy}>
            <RefreshCw size={16} className={busy ? "spin" : ""} />{" "}
            {busy ? "Checking…" : "Check status"}
          </button>
          <Link className="text-link" to="/contact">
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
      <span className="eyebrow">
        {user.role === "Admin"
          ? "ADMINISTRATION"
          : user.role === "Vendor"
            ? "YOUR BUSINESS, BEAUTIFULLY CONNECTED"
            : "YOUR CELEBRATION STARTS HERE"}
      </span>
      <h1>Welcome{user.firstName ? `, ${user.firstName}` : ""}.</h1>
      <p className="dashboard-intro">
        {user.role === "Admin"
          ? "A trusted marketplace begins with thoughtful review."
          : user.role === "Vendor"
            ? `${user.vendor.businessName} is approved. Your vendor space is ready.`
            : "A special place for your plans, your people and your next chapter."}
      </p>
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <ShieldCheck size={28} />
          <h2>Your account is verified.</h2>
          <p>Your email is verified and your account is active.</p>
          <Link className="text-link" to="/auth/change-password">
            Manage your password <ArrowRight size={15} />
          </Link>
        </div>
        {user.role === "Admin" ? (
          <Link className="dashboard-card card-link" to="/admin/vendors">
            <Store size={28} />
            <h2>Vendor applications</h2>
            <p>Review businesses, documents and verification status.</p>
            <span className="text-link">
              Review vendors <ArrowRight size={15} />
            </span>
          </Link>
        ) : (
          <div className="dashboard-card">
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
