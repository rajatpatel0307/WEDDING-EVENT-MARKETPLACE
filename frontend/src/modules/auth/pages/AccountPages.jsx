import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  Store,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
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
  return <Navigate to="/vendor/dashboard" replace />;
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
