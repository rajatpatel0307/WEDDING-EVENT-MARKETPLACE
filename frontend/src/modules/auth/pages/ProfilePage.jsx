import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gql } from "@apollo/client";
import { ArrowUpRight, Camera, CircleCheck, LoaderCircle, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import PhotoUpload from "../../../components/common/PhotoUpload";
import { client, userFields } from "../../../services/apollo";

export default function ProfilePage() {
  const { user, setUser, notify } = useAuth();
  const [busy, setBusy] = useState(false);
  async function save({ uploadToken }) {
    const { data } = await client.mutate({
      mutation: gql(
        `mutation UpdateProfilePhoto($uploadToken: String!) { updateProfilePhoto(uploadToken: $uploadToken) { success message user { ${userFields} } } }`,
      ),
      variables: { uploadToken },
    });
    setUser((current) => ({ ...current, ...data.updateProfilePhoto.user }));
    notify(data.updateProfilePhoto.message);
  }
  return <ProfileContent user={user} busy={busy} onUploaded={save} onBusy={setBusy} />;
}

function ProfileAvatar({ url, name }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative mx-auto -mt-[54px] mb-[14px] grid size-[108px] place-items-center overflow-hidden rounded-full border-[5px] border-white bg-[#edf3ed] text-[#456957] shadow-[0_4px_18px_#24483d12]">
      {url && !failed ? <img className="size-full rounded-full object-cover" src={url} alt={`${name}'s profile`} onError={() => setFailed(true)} /> : <span className="grid size-full place-items-center rounded-full text-[38px] font-medium tracking-[-1.5px]" aria-label={`${name}'s profile`}>{initials || <UserRound size={40} strokeWidth={1.4} />}</span>}
    </div>
  );
}

export function ProfileContent({ user, busy = false, onUploaded, onBusy }) {
  const uploadRoot = useRef(null);
  if (!user) return <div className="mx-auto w-full max-w-[1040px]"><p className="py-[28px] text-[13px] text-[#63796f]" role="status">Loading your profile...</p></div>;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "My account";
  const role = user.role === "Admin" ? "Administrator" : user.role || "Member";
  const active = user.accountStatus === "Active";
  const fields = [
    ["First name", user.firstName, UserRound],
    ["Last name", user.lastName, UserRound],
    ["Email address", user.email, Mail],
    ["Phone number", user.phone, Phone],
  ];
  return (
    <div className="mx-auto w-full max-w-[1100px] text-[#2b493c]" aria-busy={busy}>
      <header className="mb-[22px] flex items-end justify-between gap-[20px]">
        <div>
          <p className="m-0 mb-[8px] flex items-center gap-[9px] text-[10px] font-semibold tracking-[2px] text-[#92764f] uppercase"><span className="size-[5px] rounded-full bg-[#b89a67]" aria-hidden="true" />Your MarryNest account</p>
          <h1 className="m-0 mb-[8px] text-[32px] leading-[1.15] font-semibold tracking-[-1px] text-[#263f35] max-[650px]:text-[28px]">My profile</h1>
          <p className="m-0 text-[14px] leading-[1.7] text-[#6b7e73]">Your personal details, profile photo and account security.</p>
        </div>
        <span className="mb-[3px] grid size-[50px] shrink-0 place-items-center rounded-[16px] border border-[#dce6dc] bg-white text-[#598471] shadow-[0_3px_12px_#24483d04] max-[650px]:hidden" aria-hidden="true"><UserRound size={24} strokeWidth={1.4} /></span>
      </header>
      <div className="grid grid-cols-[310px_minmax(0,1fr)] items-stretch gap-[24px] max-[900px]:grid-cols-[260px_minmax(0,1fr)] max-[900px]:gap-[18px] max-[760px]:grid-cols-1">
        <aside className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#dfe8df] bg-white text-center shadow-[0_8px_28px_#24483d06]" aria-label="Profile photo">
          <div className="relative h-[88px] shrink-0 overflow-hidden bg-linear-to-br from-[#d9e9df] via-[#e7efe3] to-[#f2eddd]" aria-hidden="true"><span className="absolute -top-[65px] -right-[36px] size-[180px] rounded-full border border-white/50" /><span className="absolute -top-[95px] -right-[66px] size-[240px] rounded-full border border-white/35" /></div>
          <div className="relative px-[24px] pb-[20px] max-[900px]:px-[20px]">
          <ProfileAvatar key={user.profilePhotoUrl || user.id} url={user.profilePhotoUrl} name={fullName} />
          <h2 className="m-0 mb-[10px] text-[25px] leading-[1.3] font-semibold tracking-[-0.7px] text-[#29483a] [overflow-wrap:anywhere]">{fullName}</h2>
          <span className="inline-flex items-center gap-[6px] rounded-full border border-[#e4e8dc] bg-[#f5f6ef] px-[12px] py-[4px] text-[11px] font-medium text-[#6d7958]"><UserRound size={12} aria-hidden="true" />{role}</span>
          <p className="mt-[10px] mb-[18px] text-[13px] leading-[1.7] text-[#687e70] [overflow-wrap:anywhere]">{user.email}</p>
          <div className="[&_.profile-photo-upload>img]:hidden [&_.profile-photo-upload_.field>span]:hidden [&_.profile-photo-upload_input[type=file]]:hidden [&_.profile-photo-upload_.field]:mt-[12px] [&_.profile-photo-upload_.field]:mb-0 [&_.profile-photo-upload_small]:m-0 [&_.profile-photo-upload_small]:block [&_.profile-photo-upload_small]:text-[11px] [&_.profile-photo-upload_small]:leading-[1.8] [&_.profile-photo-upload_small]:font-normal [&_.profile-photo-upload_small]:text-[#70816a] [&_.profile-photo-upload_.error-box]:mt-[14px] [&_.profile-photo-upload_.error-box]:mb-0 [&_.profile-photo-upload_.error-box]:text-left [&_.profile-photo-upload_.error-box]:text-[13px]" ref={uploadRoot}>
            <button type="button" className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[10px] border border-[#176b60] bg-[#176b60] px-[18px] py-[11px] text-[13px] font-medium text-white shadow-[0_3px_8px_#176b6014] transition-colors duration-200 hover:bg-[#11594f] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#88ad91] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={() => uploadRoot.current?.querySelector('input[type="file"]')?.click()}>
              {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
              {busy ? "Uploading photo..." : user.profilePhotoUrl ? "Change photo" : "Upload photo"}
            </button>
            <PhotoUpload url={user.profilePhotoUrl} onUploaded={onUploaded} onBusy={onBusy} />
          </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-[12px] border-t border-[#edf1ea] bg-[#fafbf8] px-[24px] py-[12px]">
            <span className="text-[11px] font-medium text-[#71816e]">Account status</span>
            <span className={`inline-flex items-center gap-[6px] rounded-full border px-[10px] py-[5px] text-[11px] font-medium ${active ? "border-[#d4e8d8] bg-[#eaf5ed] text-[#34754c]" : "border-[#e8e8db] bg-[#f8f7ee] text-[#897547]"}`}>{active && <CircleCheck size={13} aria-hidden="true" />}{user.accountStatus || "Not provided"}</span>
          </div>
        </aside>
        <div className="grid min-w-0 gap-[16px]">
          <section className="min-w-0 overflow-hidden rounded-[20px] border border-[#dfe8df] bg-white shadow-[0_8px_28px_#24483d06]" aria-labelledby="profile-details-heading">
            <header className="flex items-center gap-[13px] px-[20px] pt-[18px]">
              <span className="grid size-[42px] shrink-0 place-items-center rounded-[12px] border border-[#e0e9dc] bg-[#f2f6ee] text-[#65865a]" aria-hidden="true"><UserRound size={20} strokeWidth={1.6} /></span>
              <div><h2 className="m-0 text-[18px] leading-[1.5] font-semibold tracking-[-0.3px] text-[#2e4b3c]" id="profile-details-heading">Personal information</h2><p className="mt-[3px] mb-0 text-[12px] leading-[1.6] text-[#75826f]">The details associated with your account.</p></div>
            </header>
            <dl className="m-0 grid grid-cols-2 gap-[12px] p-[20px] max-[480px]:grid-cols-1">
              {fields.map(([label, value, Icon]) => (
                <div className="min-w-0 rounded-[12px] border border-[#e9eee5] bg-[#f9fbf7] p-[12px] transition-colors hover:border-[#d1dfce]" key={label}>
                  <dt className="mb-[6px] flex items-center gap-[7px] text-[10px] font-medium tracking-[0.6px] text-[#73826b] uppercase"><Icon className="shrink-0 text-[#8b9e7f]" size={14} strokeWidth={1.6} aria-hidden="true" />{label}</dt>
                  <dd className="m-0 text-[14px] leading-[1.6] font-medium text-[#365345] [overflow-wrap:anywhere]">{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 flex items-start gap-[8px] border-t border-[#edf1e9] px-[20px] py-[12px] text-[11px] leading-[1.7] text-[#7b8775]"><Mail className="mt-[2px] shrink-0" size={13} aria-hidden="true" />Your contact details help you receive account updates.</p>
          </section>
          <section className="relative isolate grid grid-cols-[44px_minmax(0,1fr)] gap-x-[14px] gap-y-[12px] overflow-hidden rounded-[20px] border border-[#245d4e] bg-linear-to-br from-[#214f42] to-[#176b60] p-[20px] text-white shadow-[0_8px_24px_#24483d10] min-[1200px]:grid-cols-[44px_minmax(0,1fr)_auto]" aria-labelledby="profile-security-heading">
            <span className="pointer-events-none absolute -top-[56px] -right-[55px] -z-10 size-[190px] rounded-full border border-white/10" aria-hidden="true" />
            <span className="grid size-[44px] place-items-center rounded-[13px] border border-white/15 bg-white/5 text-[#d3e6d6]" aria-hidden="true"><ShieldCheck size={25} strokeWidth={1.5} /></span>
            <div><h2 className="m-0 text-[18px]! leading-[1.6] font-semibold tracking-[-0.2px] text-white!" id="profile-security-heading">Account security</h2><p className="mt-[4px] mb-0 max-w-[330px] text-[14px]! leading-[1.8] text-[#e1efe7]!">Manage your password to keep your account protected.</p></div>
            <Link className="col-start-2 inline-flex min-h-[40px] items-center justify-self-start gap-[9px] rounded-[9px] border border-white/20 bg-white/10 px-[13px] py-[9px] text-[13px] font-semibold text-white! no-underline transition-colors duration-200 hover:bg-white/20 hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#d7e9d3] min-[1200px]:col-start-3 min-[1200px]:row-start-1 min-[1200px]:self-center" to={user.role === "Admin" ? "/admin/change-password" : "/auth/change-password"}><LockKeyhole size={13} aria-hidden="true" />Manage account security <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </section>
        </div>
      </div>
    </div>
  );
}
