import { NavLink } from "react-router-dom";
import { CreditCard, LayoutDashboard, ClipboardCheck, Landmark, RotateCcw, Wallet, ReceiptText } from "lucide-react";
import { paymentNavigation } from "../navigation";

const icons = { payments: CreditCard, "payment-overview": LayoutDashboard, "refund-requests": ClipboardCheck, "payment-reconciliation": Landmark, refunds: RotateCcw, payouts: Wallet, commission: ReceiptText };

export default function PaymentTabs() {
  return <nav className="flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-[#e0e9e3] bg-white px-3 py-1 shadow-sm shadow-[#254c3810]" aria-label="Payment pages">
    {paymentNavigation.map(([path, label]) => {
      const Icon = icons[path];
      return <NavLink key={path} end to={`/admin/${path}`}
        className={({ isActive }) => `flex min-h-11 shrink-0 items-center justify-center gap-2 border-b-2 px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b60] ${isActive ? "border-[#176b60] font-semibold text-[#176b60]" : "border-transparent text-[#7b8e81] hover:border-[#c4d7cc] hover:text-[#176b60]"}`}>
        <Icon size={14} strokeWidth={1.7} aria-hidden="true" />{label}
      </NavLink>;
    })}
  </nav>;
}
