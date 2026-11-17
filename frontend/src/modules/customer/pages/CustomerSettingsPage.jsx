import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, KeyRound, LockKeyhole, Mail,
  MapPin, Pencil, Phone, ShieldCheck, UserRound,
} from "lucide-react";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52]";
const action = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none ${focus}`;
const card = "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-sm";

export default function CustomerSettingsPage({ user }) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-7 text-sm text-slate-700 [&_svg]:shrink-0">
      <header>
        <p className="text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p>
        <h1 className="mt-2 font-serif text-[38px] font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">Account settings<span className="text-[#b58c69]">.</span></h1>
        <p className="mt-2 text-sm text-slate-500">Keep your account secure and your details up to date.</p>
      </header>

      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
        <section className={card} aria-labelledby="account-security-title">
          <header className="flex items-center gap-4 border-b border-[#e5ecdf] bg-[#f6f9f2] p-5 sm:p-6">
            <span className="grid size-12 place-items-center rounded-2xl border border-[#dbe6d4] bg-white text-[#5a7953]"><ShieldCheck size={25} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><h2 id="account-security-title" className="text-lg font-semibold tracking-tight text-[#37463d]">Account security</h2><p className="mt-1 text-xs text-[#74806b]">Manage your sign-in password.</p></div>
          </header>
          <div className="flex flex-1 items-start p-5 sm:p-6">
            <div className="flex w-full items-start gap-3 rounded-xl border border-[#e7e9e0] bg-[#fcfcf9] p-4 sm:p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-[#eef2e7] text-[#7c8d65]"><KeyRound size={17} strokeWidth={1.7} aria-hidden="true" /></span>
              <div><h3 className="text-sm font-semibold text-[#37463d]">Password</h3><p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">Use a strong, unique password to keep your planning space safe.</p></div>
            </div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4 sm:px-6">
            <span className="inline-flex items-center gap-2 text-[11px] text-slate-500"><LockKeyhole size={14} aria-hidden="true" />Sign-in details</span>
            <Link to="/auth/change-password" className={`${action} w-full border-[#873f52] bg-[#873f52] text-white shadow-sm hover:bg-[#723247] sm:w-auto`}>Change password<ArrowRight size={15} aria-hidden="true" /></Link>
          </footer>
        </section>

        <section className={card} aria-labelledby="account-contact-title">
          <header className="flex items-center gap-4 border-b border-[#ece2e6] bg-[#fbf6f8] p-5 sm:p-6">
            <span className="grid size-12 place-items-center rounded-2xl border border-[#eadce1] bg-white text-[#986778]"><UserRound size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><h2 id="account-contact-title" className="text-lg font-semibold tracking-tight text-[#49363e]">Profile &amp; contact details</h2><p className="mt-1 text-xs text-[#8e7781]">Your personal and contact information.</p></div>
          </header>
          <dl className="flex-1 space-y-5 p-5 sm:p-6">
            {[
              ["Full name", fullName, UserRound],
              ["Email address", user?.email, Mail],
              ["Phone number", user?.phone, Phone],
            ].map(([label, value, Icon]) => <div key={label} className="flex min-w-0 items-start gap-3"><Icon size={16} className="mt-0.5 text-[#ac939b]" aria-hidden="true" /><div className="min-w-0"><dt className="text-[11px] text-slate-500">{label}</dt><dd className={`mt-1 break-all text-sm ${value ? "font-medium text-[#37463d]" : "text-slate-400"}`}>{value || "Not added"}</dd></div></div>)}
          </dl>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4 sm:px-6">
            <Link to="/customer/addresses" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-medium text-[#873f52] hover:underline ${focus}`}><MapPin size={15} aria-hidden="true" />Manage addresses<ArrowUpRight size={13} aria-hidden="true" /></Link>
            <Link to="/customer/profile" className={`${action} w-full border-[#e3d5d8] bg-white text-[#873f52] hover:border-[#c6a6b0] hover:bg-[#faf3f5] sm:w-auto`}><Pencil size={14} aria-hidden="true" />Edit profile</Link>
          </footer>
        </section>
      </div>
    </div>
  );
}
