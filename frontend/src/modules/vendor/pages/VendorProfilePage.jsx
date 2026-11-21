import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { gql } from "@apollo/client";
import { BriefcaseBusiness, Camera, CircleCheck, LoaderCircle, LockKeyhole, Mail, Save, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { client, mutate, userFields } from "../../../services/apollo";
import { ErrorView, Image, Loading, useVendorData } from "../components/WorkspaceUI";
import { save } from "../services/workspace.api";

const profileValues = (profile) => ({
  firstName: profile.firstName || "",
  lastName: profile.lastName || "",
  phone: profile.phone || "",
});

export default function VendorProfilePage({ onBusyChange }) {
  const { user, setUser, reload, notify } = useAuth();
  const resource = useVendorData("/profile");
  const headingId = useId();
  const photoHintId = useId();
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = saving || uploading;

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    // Refresh the concurrency version after uploads without discarding typed edits.
    if (resource.data) setValues((current) => current || profileValues(resource.data));
  }, [resource.data]);

  async function photo({ uploadToken }) {
    const { data } = await client.mutate({
      mutation: gql(
        `mutation UpdateProfilePhoto($uploadToken: String!) { updateProfilePhoto(uploadToken: $uploadToken) { success message user { ${userFields} } } }`,
      ),
      variables: { uploadToken },
    });
    setUser((current) => ({ ...current, ...data.updateProfilePhoto.user }));
    notify(data.updateProfilePhoto.message);
    resource.retry();
  }

  async function uploadPhoto(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || busy) return;
    setPhotoError("");
    if (!file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Choose a PNG or JPEG photo up to 5 MB.");
      input.value = "";
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read this photo."));
        reader.onabort = () => reject(new Error("Photo upload cancelled."));
        reader.readAsDataURL(file);
      });
      const result = await mutate("uploadProfilePhoto", { base64 });
      await photo(result);
    } catch (err) {
      setPhotoError(err.message || "Unable to upload your photo. Please try again.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  if (resource.error) return <ErrorView error={resource.error} retry={resource.retry} />;
  if (!values || !resource.data) return <Loading />;

  const original = profileValues(resource.data);
  const hasChanges = Object.keys(original).some((key) => values[key] !== original[key]);
  const fullName = [resource.data.firstName, resource.data.lastName].filter(Boolean).join(" ") || "Your account";

  function change(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !hasChanges || resource.loading) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = { ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim() };
      const result = await save("/profile", "PUT", {
        ...next,
        expectedUpdatedAt: resource.data.updatedAt,
      });
      setValues(next);
      await reload();
      resource.retry();
      setSuccess(result.message);
      notify(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] min-w-0 space-y-6 font-sans text-[13px] leading-[1.6] text-[#3e5438] [&_:is(button,_a,_input):focus-visible]:outline-2 [&_:is(button,_a,_input):focus-visible]:outline-[#7d9a66] [&_:is(button,_a,_input):focus-visible]:outline-offset-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[9px] font-semibold uppercase tracking-[.2em] text-[#879577]">YOUR BUSINESS, BEAUTIFULLY CONNECTED</p>
          <h1 className="m-0 mt-2 font-serif text-[27px] font-normal leading-tight tracking-[-.6px] text-[#304735] vendor-mobile:text-[24px]">Account profile<span className="text-[#b09374]">.</span></h1>
          <p className="m-0 mt-2 text-[12px] leading-relaxed text-[#7c8971]">Your profile, your details, your next chapter.</p>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-5 min-[1100px]:grid-cols-[280px_minmax(0,1fr)] min-[1400px]:grid-cols-[310px_minmax(0,1fr)] min-[1400px]:gap-6">
        <aside aria-label="Your profile photo and account" className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7d7] bg-white shadow-[0_3px_16px_#263c2803]">
          <div className="h-24 border-b border-[#e4e9db] bg-linear-to-br from-[#e3ebd6] via-[#eff3e7] to-[#f5f0e3]">
            <p className="m-0 px-6 pt-5 text-[9px] font-medium uppercase tracking-[.2em] text-[#85966f]">A little more you</p>
          </div>
          <div className="px-5 pb-6 sm:px-6">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <Image src={user.profilePhotoUrl} alt={fullName} className="relative grid size-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#e5edd9] object-cover shadow-[0_3px_12px_#394b2912]" />
              {user.accountStatus === "Active" && <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-[#dfe8d4] bg-[#f1f6e9] px-2.5 py-1 text-[9px] font-medium text-[#738c58]"><ShieldCheck size={12} aria-hidden="true" />Verified</span>}
            </div>
            <h2 className="m-0 mt-4 break-words font-serif text-[25px] font-normal leading-tight text-[#3b5235]">{fullName}</h2>
            <p className="m-0 mt-2 break-all text-[11px] leading-relaxed text-[#839173]">{resource.data.email}</p>
            <p className="m-0 mt-2 text-[9px] font-medium uppercase tracking-[.16em] text-[#98a48b]">MarryNest business owner</p>

            <div className="mt-6 min-w-0 border-t border-[#e9ede2] pt-5" aria-busy={uploading}>
              <p className="m-0 mb-4 flex items-center gap-2 text-[12px] font-medium text-[#526a44]"><Camera size={15} className="text-[#8c9d78]" aria-hidden="true" />Make it feel like you</p>
              <label className="grid min-w-0 gap-2 text-[12px] font-medium text-[#637654]">
                <span>Profile photo <span className="text-[10px] font-normal text-[#98a28d]">(optional)</span></span>
                <input type="file" name="profilePhoto" accept="image/png,image/jpeg" disabled={busy} onChange={uploadPhoto} aria-describedby={photoHintId}
                  className="block min-h-12 w-full min-w-0 cursor-pointer rounded-xl border border-[#dce5d2] bg-[#f8faf5] p-2 text-[10px] font-normal text-[#76856c] transition-colors file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#e6eddc] file:px-2.5 file:py-2 file:text-[10px] file:font-medium file:text-[#4c6740] hover:border-[#b4c4a4] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none" />
              </label>
              <p id={photoHintId} className="m-0 mt-3 text-[10px] leading-relaxed text-[#879478]">PNG or JPEG, up to 5 MB. Your profile photo is public.</p>
              <p className="m-0 mt-3 flex items-center gap-1.5 text-[10px] leading-relaxed text-[#8f9c7e]" aria-live="polite">{uploading && <LoaderCircle size={12} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{uploading ? "Uploading your photo..." : "Your photo is saved automatically when you upload it."}</p>
              {photoError && <p role="alert" className="m-0 mt-3 rounded-lg border border-[#edc9c9] bg-[#fff5f3] px-3 py-2 text-[11px] leading-relaxed text-[#ab5b56]">{photoError}</p>}
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#edf0e7] bg-[#fcfdf9] px-5 py-4 text-[11px] sm:px-6">
            <Link className="inline-flex items-center gap-2 text-[#7d8d6f] no-underline transition-colors hover:text-[#4d6d3c]" to="/auth/change-password"><Settings2 size={13} aria-hidden="true" />Manage account security</Link>
            <Link className="inline-flex items-center gap-2 text-[#7d8d6f] no-underline transition-colors hover:text-[#4d6d3c]" to={user?.vendor?.verificationStatus === "Approved" && user.vendor.active ? "/vendor/business/profile" : "/vendor/verification"}><BriefcaseBusiness size={13} aria-hidden="true" />{user?.vendor?.verificationStatus === "Approved" && user.vendor.active ? "View business profile" : "Continue business verification"}</Link>
          </div>
        </aside>

        <section aria-labelledby={headingId} className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7d7] bg-white shadow-[0_3px_16px_#263c2803]">
          <header className="flex items-start gap-3 border-b border-[#eaf0e2] p-5 sm:px-7 sm:py-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f4e9] text-[#8ca373]" aria-hidden="true"><UserRound size={20} strokeWidth={1.6} /></span>
            <div>
              <h2 id={headingId} className="m-0 font-serif text-[24px] font-normal leading-tight tracking-[-.3px] text-[#3b5334] max-sm:text-[21px]">Personal information</h2>
              <p className="m-0 mt-1.5 text-[11px] leading-relaxed text-[#869478]">A few details to make your business space your own.</p>
            </div>
          </header>
          <form onSubmit={submit}>
            <div className="p-5 sm:p-7">
              <p className="m-0 mb-4 text-[10px] text-[#98a18e]"><span className="text-[#a08065]" aria-hidden="true">*</span> Required field</p>
              <fieldset className="m-0 grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 border-0 p-0 sm:grid-cols-2" disabled={busy}>
                <legend className="sr-only">Edit personal information</legend>
                {[
                  ["firstName", "First name", 100, "text", "given-name", "Your first name"],
                  ["lastName", "Last name", 100, "text", "family-name", "Your last name"],
                  ["phone", "Phone number", 20, "tel", "tel", "Your phone number"],
                ].map(([key, label, maxLength, type, autoComplete, placeholder]) => (
                  <label className="grid min-w-0 content-start gap-2 text-[12px] font-medium text-[#53684a]" key={key}>
                    <span>{label}{key === "firstName" ? <span className="ml-0.5 text-[#a08065]" aria-hidden="true">*</span> : <span className="ml-1 text-[10px] font-normal text-[#9aa58c]">Optional</span>}</span>
                    <input className="block min-h-12 w-full min-w-0 rounded-xl border border-[#dce5d5] bg-white px-4 py-3 text-[13px] font-normal text-[#3f5537] transition-[border-color,box-shadow] duration-150 placeholder:text-[#a1ac95] hover:border-[#b4c4a4] focus-visible:border-[#7d9a66] focus-visible:ring-4 focus-visible:ring-[#7d9a66]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7f1] disabled:text-[#7c8970] motion-reduce:transition-none" name={key} value={values[key]} maxLength={maxLength} type={type}
                      autoComplete={autoComplete} placeholder={placeholder} required={key === "firstName"}
                      onChange={(event) => change(key, event.target.value)} />
                  </label>
                ))}
              </fieldset>

              <div className="mt-6 border-t border-[#ecf0e5] pt-6">
                <label className="grid min-w-0 content-start gap-2 text-[12px] font-medium text-[#53684a]">
                  <span className="flex flex-wrap items-center justify-between gap-2"><span>Email address</span><span className="inline-flex items-center gap-1 text-[10px] font-normal text-[#8ba374]">{user.accountStatus === "Active" ? <><ShieldCheck size={12} aria-hidden="true" />Verified email</> : <><LockKeyhole size={11} aria-hidden="true" />Sign-in email</>}</span></span>
                  <span className="relative block min-w-0">
                    <Mail size={16} className="pointer-events-none absolute top-4 left-4 text-[#a1ae92]" aria-hidden="true" />
                    <input className="block min-h-12 w-full min-w-0 cursor-not-allowed rounded-xl border border-[#dce5d5] bg-[#f5f7f1] py-3 pl-11 pr-10 text-[13px] font-normal text-[#7c8970]" type="email" autoComplete="email" value={resource.data.email} disabled readOnly />
                    <LockKeyhole size={13} className="pointer-events-none absolute top-[18px] right-4 text-[#a7b19a]" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-normal leading-relaxed text-[#96a087]">This email is linked to your account and cannot be edited here.</span>
                </label>
              </div>
              {error && <p role="alert" className="m-0 mt-5 rounded-xl border border-[#edc9c9] bg-[#fff5f3] px-4 py-3 text-[12px] leading-relaxed text-[#ab5b56]">{error}</p>}
              {success && <p role="status" className="m-0 mt-5 flex items-start gap-2 rounded-xl border border-[#d0e3cd] bg-[#eff8ee] px-4 py-3 text-[12px] leading-relaxed text-[#51753f]"><CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{success}</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eaf0e2] bg-[#fbfcf9] px-5 py-5 sm:px-7">
              <p className="m-0 flex items-center gap-2 text-[10px] text-[#8e9c7c]" aria-live="polite"><ShieldCheck size={15} className="shrink-0 text-[#9bae88]" aria-hidden="true" />{hasChanges ? "You have unsaved changes." : "Keep your contact details up to date."}</p>
              <div className="ml-auto flex gap-2 max-[520px]:ml-0 max-[520px]:w-full">
                {hasChanges && <button type="button" disabled={busy || resource.loading} onClick={() => { setValues(original); setError(""); setSuccess(""); }} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#dfe6d6] bg-white px-4 py-3 text-[12px] font-medium text-[#7a8b68] transition-colors hover:bg-[#f3f6ed] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">Reset</button>}
                <button type="submit" disabled={busy || !hasChanges || resource.loading} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#46683a] bg-[#46683a] px-5 py-3 text-[12px] font-semibold text-white shadow-sm transition-colors enabled:hover:border-[#335528] enabled:hover:bg-[#335528] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none max-[520px]:flex-1">
                  {saving ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </footer>
          </form>
        </section>
      </div>
      <p className="m-0 flex items-center justify-center gap-2 pt-1 text-center text-[10px] text-[#9ba68d]"><Camera size={13} aria-hidden="true" />A familiar face behind every celebration.</p>
    </div>
  );
}
