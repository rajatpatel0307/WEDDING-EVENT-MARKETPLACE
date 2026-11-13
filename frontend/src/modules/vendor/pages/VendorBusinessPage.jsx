import { lazy, Suspense, useEffect, useState } from "react";
import {
  Building2,
  FileCheck2,
  Info,
  LoaderCircle,
  Mail,
  Save,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  ErrorView,
  Loading,
  Modal,
  useVendorData,
} from "../components/WorkspaceUI";
import { save } from "../services/workspace.api";
import BusinessProfileView from "../components/BusinessProfileView";
import RegisteredLocationField from "../../../components/common/RegisteredLocationField";

const AccountProfileEditor = lazy(() => import("./VendorProfilePage"));
const LocationsEditor = lazy(() => import("./BusinessLocations"));
const BrandImagesEditor = lazy(() => import("../../media/MediaLibrary"));
const DocumentsEditor = lazy(() => import("./VendorResourcesPage"));
const editorTabs = [
  ["business", "Business details"],
  ["account", "Owner & account"],
  ["images", "Logo & images"],
  ["locations", "Locations"],
  ["documents", "Documents"],
];

const profileValues = (vendor, categories = []) => ({
  name: vendor.businessName || "",
  description: vendor.description || "",
  email: vendor.businessEmail || vendor.email || "",
  phone: vendor.businessPhone || vendor.phone || "",
  gst: vendor.gst || "",
  pan: vendor.pan || "",
  categoryIds: categories.map((category) => Number(category.id)),
  adminLocationId: vendor.adminLocationId || "",
  expectedUpdatedAt: vendor.updatedAt,
});

function ProfileSection({ id, icon: Icon, title, description, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#dfe6dc] bg-white shadow-[0_3px_16px_#233c2b03]"
    >
      <header className="flex items-center gap-3 border-b border-[#edf0e9] px-6 py-5 max-sm:px-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0f4ec] text-[#55734b]">
          <Icon size={19} strokeWidth={1.6} />
        </span>
        <div>
          <h2 className="m-0! font-sans! text-[15px]! font-semibold! tracking-[-0.2px] text-[#2e4439]!">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#738072]">
            {description}
          </p>
        </div>
      </header>
      <div className="grid gap-5 p-6 max-sm:p-4">{children}</div>
    </section>
  );
}

function ProfileField({ label, optional, hint, children }) {
  return (
    <label className="grid min-w-0 content-start gap-2 text-[13px] font-medium text-[#40533f]">
      <span>
        {label}
        {optional && (
          <span className="ml-1.5 text-[11px] font-normal text-[#7b8575]">
            (optional)
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] font-normal leading-relaxed text-[#74816e]">
          {hint}
        </span>
      )}
    </label>
  );
}

export default function VendorBusinessPage() {
  const resource = useVendorData("/business"),
    { notify, reload } = useAuth();
  const [values, setValues] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [editing, setEditing] = useState(false),
    [editorTab, setEditorTab] = useState("business"),
    [visitedTabs, setVisitedTabs] = useState(["business"]),
    [childBusy, setChildBusy] = useState(false);
  useEffect(() => {
    if (!resource.data) return;
    setValues(profileValues(resource.data.vendor, resource.data.categories));
  }, [resource.data]);
  if (resource.error)
    return <ErrorView error={resource.error} retry={resource.retry} />;
  if (!resource.data || !values) return <Loading />;
  const { vendor: v, categories } = resource.data,
    update = (key, value) => {
      setSaved(false);
      setValues((old) => ({ ...old, [key]: value }));
    };
  const original = profileValues(v, categories);
  const hasChanges = JSON.stringify(values) !== JSON.stringify(original);
  const categoryOptions = resource.data.availableCategories || categories;
  const openEditor = (section = "business") => {
    setValues(profileValues(v, categories));
    setError("");
    setSaved(false);
    setEditorTab(section);
    setVisitedTabs(["business", section]);
    setEditing(true);
  };
  const closeEditor = () => {
    if (busy || childBusy) return;
    setEditing(false);
    setValues(profileValues(v, categories));
    setError("");
    resource.retry();
    reload().catch(() => {});
  };
  return (
    <div className="min-w-0 text-[#40533f] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#638650]">
      <BusinessProfileView
        data={resource.data}
        onEdit={openEditor}
        disabled={resource.loading || busy}
        saved={saved}
      />
      {editing && (
        <Modal
          title="Edit vendor profile"
          close={closeEditor}
          busy={busy || childBusy}
          wide
        >
          <div className="border-b border-[#e3e9dc] px-5 pt-3">
            <p className="mb-3 text-xs leading-relaxed text-[#78866e]">
              Choose a section to edit. Save each section using its own save or
              upload button.
            </p>
            <div
              role="group"
              aria-label="Profile sections"
              className="flex flex-wrap gap-2 pb-3"
            >
              {editorTabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={editorTab === key}
                  disabled={busy || childBusy}
                  onClick={() => {
                    setEditorTab(key);
                    setVisitedTabs((tabs) =>
                      tabs.includes(key) ? tabs : [...tabs, key],
                    );
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${editorTab === key ? "border-[#385b3d] bg-[#385b3d] text-white" : "border-[#dfe6d8] bg-white text-[#66795a] hover:bg-[#f1f5eb]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div hidden={editorTab !== "business"}>
            <form
              className="p-5 max-sm:p-3 min-w-0 [&_input]:min-h-11 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dbe3d5] [&_input]:bg-[#fcfdfb] [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-[13px] [&_input]:font-normal [&_input]:text-[#354c38] [&_input]:transition-colors [&_input::placeholder]:text-[#a0aa96] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#dbe3d5] [&_textarea]:bg-[#fcfdfb] [&_textarea]:px-3.5 [&_textarea]:py-3 [&_textarea]:text-[13px] [&_textarea]:font-normal [&_textarea]:leading-relaxed [&_textarea]:text-[#354c38] [&_textarea::placeholder]:text-[#a0aa96] [&_input:focus]:border-[#829e6b] [&_input:focus]:bg-white [&_input:focus]:outline-2 [&_input:focus]:outline-[#e2ebd9] [&_textarea:focus]:border-[#829e6b] [&_textarea:focus]:bg-white [&_textarea:focus]:outline-2 [&_textarea:focus]:outline-[#e2ebd9]"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy || !hasChanges || resource.loading) return;
                setBusy(true);
                setError("");
                setSaved(false);
                try {
                  const { adminLocationId, categoryIds, ...details } = values;
                  const result = await save("/business", "PUT", {
                    ...details,
                    ...(adminLocationId ? { adminLocationId } : {}),
                    ...(JSON.stringify(categoryIds) !==
                    JSON.stringify(original.categoryIds)
                      ? { categoryIds }
                      : {}),
                  });
                  notify(result.message);
                  setSaved(true);
                  setEditing(false);
                  resource.retry();
                  await reload().catch(() => {});
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {error && (
                <p
                  className="mb-5 flex items-start gap-2 rounded-xl border border-[#edd7cc] bg-[#fff7f2] p-4 text-xs leading-relaxed text-[#a15e45]"
                  role="alert"
                >
                  <Info size={16} className="shrink-0" />
                  {error}
                </p>
              )}

              <p className="mb-5 text-xs leading-relaxed text-[#78866e]">
                Update your business information below. Your changes will appear
                on your profile after saving.
              </p>
              <fieldset
                disabled={busy}
                className="m-0 grid min-w-0 gap-5 border-0 p-0 disabled:opacity-70"
              >
                <legend className="sr-only">Edit your business profile</legend>
                <ProfileSection
                  id="edit-business-information"
                  icon={Building2}
                  title="Business information"
                  description="Introduce the name and story behind your celebrations."
                >
                  <ProfileField label="Business name">
                    <input
                      autoFocus
                      name="businessName"
                      autoComplete="organization"
                      required
                      minLength={2}
                      maxLength={200}
                      placeholder="Your business name"
                      value={values.name}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </ProfileField>
                  <ProfileField
                    label="Business description"
                    hint="Share what you do, your experience, and what makes your service special."
                  >
                    <textarea
                      name="description"
                      rows={4}
                      minLength={10}
                      maxLength={10000}
                      required
                      placeholder="Tell couples a little about your business..."
                      value={values.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                    />
                    <span className="text-right text-[10px] font-normal text-[#89957e]">
                      {values.description.length.toLocaleString()} / 10,000
                    </span>
                  </ProfileField>
                </ProfileSection>

                <ProfileSection
                  id="edit-contact-information"
                  icon={Mail}
                  title="Contact information"
                  description="Help customers take the first step towards working with you."
                >
                  <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                    <ProfileField label="Contact email">
                      <input
                        name="email"
                        autoComplete="email"
                        type="email"
                        required
                        maxLength={320}
                        placeholder="hello@yourbusiness.com"
                        value={values.email}
                        onChange={(event) =>
                          update("email", event.target.value)
                        }
                      />
                    </ProfileField>
                    <ProfileField label="Contact phone">
                      <input
                        name="phone"
                        autoComplete="tel"
                        type="tel"
                        required
                        pattern="\+?[1-9][0-9]{7,14}"
                        maxLength={20}
                        placeholder="e.g. +919876543210"
                        title="Enter 8 to 15 digits, optionally starting with +"
                        value={values.phone}
                        onChange={(event) =>
                          update("phone", event.target.value)
                        }
                      />
                    </ProfileField>
                  </div>
                  <p className="flex items-start gap-2 rounded-lg bg-[#f5f7f1] px-3 py-2.5 text-[11px] leading-relaxed text-[#6c7e60]">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    Used for customer enquiries and business communication.
                  </p>
                </ProfileSection>

                <ProfileSection
                  id="edit-business-registration"
                  icon={FileCheck2}
                  title="Business registration"
                  description="Keep your business records accurate and up to date."
                >
                  <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                    <ProfileField label="GST number" optional>
                      <input
                        name="gst"
                        maxLength={50}
                        placeholder="Enter your GST number"
                        value={values.gst}
                        onChange={(event) => update("gst", event.target.value)}
                      />
                    </ProfileField>
                    <ProfileField label="PAN number" optional>
                      <input
                        name="pan"
                        maxLength={20}
                        placeholder="Enter your PAN number"
                        value={values.pan}
                        onChange={(event) => update("pan", event.target.value)}
                      />
                    </ProfileField>
                  </div>
                  <RegisteredLocationField
                    value={values.adminLocationId}
                    onChange={(value) => update("adminLocationId", value)}
                    disabled={busy}
                  />
                </ProfileSection>
                <ProfileSection
                  id="edit-business-categories"
                  icon={Building2}
                  title="Service categories"
                  description="Choose the categories your business offers and set your primary category."
                >
                  <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    {categoryOptions.map((category) => {
                      const id = Number(category.id);
                      const selected = values.categoryIds.includes(id);
                      const used = Number(category.serviceCount || 0) > 0;
                      const inactive =
                        category.active === false || category.active === 0;
                      return (
                        <label
                          key={id}
                          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${selected ? "border-[#baceaa] bg-[#f2f7eb] text-[#48623a]" : "border-[#e1e8da] text-[#7c8970]"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={used || (inactive && !selected)}
                            onChange={(event) =>
                              update(
                                "categoryIds",
                                event.target.checked
                                  ? [...values.categoryIds, id]
                                  : values.categoryIds.filter(
                                      (value) => value !== id,
                                    ),
                              )
                            }
                            className="mt-0.5 min-h-0! size-4! shrink-0 accent-[#5f7e49]"
                          />
                          <span>
                            {category.name}
                            {used && (
                              <span className="block text-[10px] font-normal text-[#869577]">
                                Used by {category.serviceCount} service(s)
                              </span>
                            )}
                            {inactive && (
                              <span className="block text-[10px]">
                                Currently inactive
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {!values.categoryIds.length && (
                    <p role="alert" className="text-xs text-[#a15e45]">
                      Select at least one service category.
                    </p>
                  )}
                  <ProfileField label="Primary category">
                    <select
                      required
                      value={values.categoryIds[0] || ""}
                      onChange={(event) => {
                        const primary = Number(event.target.value);
                        update("categoryIds", [
                          primary,
                          ...values.categoryIds.filter((id) => id !== primary),
                        ]);
                      }}
                      className="min-h-11 w-full rounded-lg border border-[#dbe3d5] bg-[#fcfdfb] px-3.5 py-2.5 text-[13px] font-normal text-[#354c38]"
                    >
                      <option value="">Select a primary category</option>
                      {categoryOptions
                        .filter((category) =>
                          values.categoryIds.includes(Number(category.id)),
                        )
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </ProfileField>
                  <p className="text-[11px] text-[#7b896f]">
                    To remove a category used by your services, move those
                    services to another category first.
                  </p>
                </ProfileSection>
              </fieldset>
              <footer className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e9dc] bg-white/95 px-5 py-4 backdrop-blur-md max-sm:-mx-3 max-sm:-mb-3 max-sm:px-3">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[11px] text-[#7b896f]"
                >
                  {busy
                    ? "Saving your profile..."
                    : hasChanges
                      ? "You have unsaved changes"
                      : "Make your changes, then save."}
                </p>
                <div className="flex items-center gap-3 max-sm:ml-auto">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeEditor}
                    className="rounded-lg border border-[#dce4d5] px-4 py-2.5 text-xs text-[#617456] hover:bg-[#f3f6ee] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !hasChanges || resource.loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#385b3d] bg-[#385b3d] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#2c4a31] disabled:opacity-50"
                  >
                    {busy ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {busy ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </footer>
            </form>
          </div>
          {visitedTabs.includes("account") && (
            <div hidden={editorTab !== "account"} className="p-5">
              <Suspense fallback={<Loading />}>
                <AccountProfileEditor onBusyChange={setChildBusy} />
              </Suspense>
            </div>
          )}
          {visitedTabs.includes("images") && (
            <div hidden={editorTab !== "images"} className="p-5">
              <Suspense fallback={<Loading />}>
                <BrandImagesEditor
                  role="Vendor"
                  fixedTarget={{ entityType: "Vendor", entityId: v.id }}
                  embedded
                />
              </Suspense>
            </div>
          )}
          {visitedTabs.includes("locations") && (
            <div hidden={editorTab !== "locations"} className="p-5">
              <Suspense fallback={<Loading />}>
                <LocationsEditor />
              </Suspense>
            </div>
          )}
          {visitedTabs.includes("documents") && (
            <div hidden={editorTab !== "documents"} className="p-5">
              <Suspense fallback={<Loading />}>
                <DocumentsEditor section="documents" />
              </Suspense>
            </div>
          )}
          {editorTab !== "business" && (
            <footer className="sticky bottom-0 border-t border-[#e3e9dc] bg-white/95 px-5 py-4 text-right backdrop-blur-md">
              <button
                type="button"
                disabled={childBusy}
                onClick={closeEditor}
                className="rounded-lg border border-[#dce4d5] px-4 py-2.5 text-xs text-[#617456] hover:bg-[#f3f6ee] disabled:opacity-50"
              >
                Done
              </button>
            </footer>
          )}
        </Modal>
      )}
    </div>
  );
}
