import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, Save, LoaderCircle } from "lucide-react";
import { resourceTitle, adminNavigation } from "../navigation";
import { adminRequest } from "../api";
import { useAuth } from "../../../context/AuthContext";
import AdminTable, { ErrorState, Skeleton } from "../components/AdminTable";
function Settings() {
  const { notify } = useAuth(),
    [values, setValues] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/settings", { signal: abort.signal })
      .then(setValues)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e);
      });
    return () => abort.abort();
  }, [revision]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      const result = await adminRequest("/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setValues(body);
      notify(result.message);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ad-panel ad-settings">
      <div className="ad-panel-heading">
        <div>
          <h2>General settings</h2>
          <p>Manage your platform’s identity and contact details.</p>
        </div>
        <ShieldCheck size={21} />
      </div>
      {error && (
        <ErrorState
          error={error}
          retry={() => {
            setError(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {!values && !error ? (
        <Skeleton />
      ) : (
        values && (
          <form className="ad-form" onSubmit={submit}>
            <label>
              Platform name
              <input
                name="platformName"
                defaultValue={values.platformName || "MarryNest"}
                required
                maxLength={100}
              />
            </label>
            <label>
              Support email
              <input
                name="supportEmail"
                type="email"
                defaultValue={values.supportEmail || ""}
                placeholder="Your published support address"
                required
                maxLength={320}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                Reporting timezone
                <input name="timezone" value="Asia/Kolkata" readOnly />
              </label>
              <label>
                Reporting currency
                <input name="currency" value="INR" readOnly />
              </label>
            </div>
            <p className="ad-hint">
              All settings changes are saved to the audit log. Payment gateway
              credentials and database configuration are managed securely on the
              server.
            </p>
            <button
              className="ad-button ad-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              Save settings
            </button>
          </form>
        )
      )}
    </section>
  );
}
export default function AdminManagement() {
  const { resource } = useParams(),
    [params] = useSearchParams();
  const valid = adminNavigation
    .flatMap((g) => g.items)
    .some((i) => i[0] === resource);
  return (
    <>
      <div className="ad-page-heading">
        <div>
          <div className="ad-eyebrow">MARKETPLACE MANAGEMENT</div>
          <h1>{resourceTitle(resource)}</h1>
          <p>
            {resource === "applications"
              ? "Review applications and welcome trusted professionals to your marketplace."
              : resource === "settings"
                ? "A considered foundation for your marketplace."
                : "A clear view of your marketplace. Search, review, and manage every detail."}
          </p>
        </div>
        <span className="ad-workspace-tag">
          <ShieldCheck size={14} /> Admin workspace
        </span>
      </div>
      {!valid ? (
        <div className="ad-panel ad-empty">
          This admin page is not available.
        </div>
      ) : resource === "settings" ? (
        <Settings />
      ) : (
        <AdminTable
          key={resource}
          resource={resource}
          initialStatus={params.get("status") || ""}
          initialQuery={params.get("q") || ""}
        />
      )}
    </>
  );
}
