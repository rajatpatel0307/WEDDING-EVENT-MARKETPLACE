import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Badge,
  ErrorView,
  Field,
  Heading,
  Loading,
  Panel,
  useVendorData,
} from "../components/WorkspaceUI";
import { ImageUpload } from "../components/WorkspaceForms";
import { date, save } from "../services/workspace.api";
export default function VendorBusinessPage({ mode = "profile" }) {
  const resource = useVendorData("/business"),
    { notify, reload } = useAuth();
  const [values, setValues] = useState(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    if (!resource.data) return;
    const v = resource.data.vendor;
    setValues({
      name: v.businessName,
      description: v.description || "",
      email: v.businessEmail || v.email,
      phone: v.businessPhone || v.phone || "",
      gst: v.gst || "",
      pan: v.pan || "",
      expectedUpdatedAt: v.updatedAt,
    });
  }, [resource.data]);
  if (resource.error)
    return <ErrorView error={resource.error} retry={resource.retry} />;
  if (!resource.data || !values) return <Loading />;
  const { vendor: v, categories, locations, summary } = resource.data,
    update = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  if (mode === "verification")
    return (
      <>
        <Heading
          title="Verification status"
          description="Your business identity, reviewed with care."
        />
        <Panel
          title="Your vendor application"
          action={<Badge>{v.status}</Badge>}
        >
          <div className="vw-verification">
            <span>
              <ShieldCheck size={43} strokeWidth={1.3} />
            </span>
            <h2>
              {v.status === "Approved"
                ? "You're a verified MarryNest partner."
                : "Your application is being reviewed."}
            </h2>
            <p>
              Your application is approved. Keep your business information and
              documents up to date.
            </p>
            <div className="vw-verification-steps">
              <div>
                <CheckCircle2 size={18} />
                <strong>Email verified</strong>
              </div>
              <div>
                <FileCheck2 size={18} />
                <strong>
                  {summary.approvedDocuments} / {summary.documents} documents
                  approved
                </strong>
              </div>
              <div>
                <ShieldCheck size={18} />
                <strong>Vendor approved</strong>
              </div>
            </div>
            <dl className="vw-details">
              <div>
                <dt>Verification cycle</dt>
                <dd>{v.cycle}</dd>
              </div>
              <div>
                <dt>Last approved</dt>
                <dd>{v.verifiedAt ? date(v.verifiedAt) : "Not recorded"}</dd>
              </div>
              <div>
                <dt>Vendor ID</dt>
                <dd>{v.id}</dd>
              </div>
              <div>
                <dt>Account status</dt>
                <dd>
                  <Badge>{v.active ? "Active" : "Inactive"}</Badge>
                </dd>
              </div>
            </dl>
            {v.remarks && <p className="vw-form-note">{v.remarks}</p>}
            <Link className="vw-button" to="/vendor/documents">
              Manage documents
            </Link>
          </div>
        </Panel>
      </>
    );
  if (mode === "details")
    return (
      <>
        <Heading
          title="Vendor details"
          description="The business identity behind your celebrations."
        >
          <Link to="/vendor/business/profile" className="vw-button vw-primary">
            Edit business profile
          </Link>
        </Heading>
        <Panel title={v.businessName} action={<Badge>{v.status}</Badge>}>
          <div className="vw-form-body">
            <p className="vw-business-description">{v.description}</p>
            <dl className="vw-details">
              {[
                ["Owner", v.owner],
                ["Email", v.email],
                ["Phone", v.phone],
                ["GST", v.gst],
                ["PAN", v.pan],
                ["Registered", date(v.createdAt)],
                ["Vendor ID", v.id],
                ["Account", v.active ? "Active" : "Inactive"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <div className="vw-category-tags">
              {categories.map((c) => (
                <span key={c.id}>{c.name}</span>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Business locations">
          <div className="vw-location-cards">
            {locations.length ? (
              locations.map((l) => (
                <article key={l.id}>
                  <MapPin size={20} />
                  <h3>{l.city}</h3>
                  <p>
                    {l.address}
                    <br />
                    {l.state}, {l.country} {l.postalCode}
                  </p>
                  <Badge>
                    {l.isPrimary ? "Primary" : l.active ? "Active" : "Inactive"}
                  </Badge>
                </article>
              ))
            ) : (
              <p>No business locations provided.</p>
            )}
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <Heading
        title="Business profile"
        description="Tell your story. Help customers get to know the people behind the magic."
      />
      <form
        className="vw-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await save("/business", "PUT", values);
            notify(result.message);
            resource.retry();
            await reload();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="vw-form-layout">
          <Panel title="Business information">
            <div className="vw-form-body">
              {error && (
                <p className="vw-form-error" role="alert">
                  {error}
                </p>
              )}
              <Field label="Business name">
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field label="Business description">
                <textarea
                  rows={6}
                  minLength={10}
                  maxLength={10000}
                  required
                  value={values.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["email", "Contact email", "email"],
                  ["phone", "Contact phone", "tel"],
                  ["gst", "GST number", "text"],
                  ["pan", "PAN number", "text"],
                ].map(([key, label, type]) => (
                  <Field key={key} label={label}>
                    <input
                      type={type}
                      value={values[key]}
                      required={["email", "phone"].includes(key)}
                      pattern={
                        key === "phone" ? "\\+?[1-9][0-9]{7,14}" : undefined
                      }
                      maxLength={
                        key === "email" ? 320 : key === "gst" ? 50 : 20
                      }
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <div className="vw-category-tags">
                {categories.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
            </div>
          </Panel>
          <aside>
            <Panel title="Business logo">
              <div className="vw-form-body">
                <ImageUpload
                  kind="logo"
                  src={values.logoPreview || v.logoUrl}
                  onBusy={(value) =>
                    setUploading((count) =>
                      Math.max(0, count + (value ? 1 : -1)),
                    )
                  }
                  onUploaded={(image) =>
                    setValues((old) => ({ ...old, logoToken: image.token }))
                  }
                />
              </div>
            </Panel>
            <Panel title="Cover image">
              <div className="vw-form-body">
                <ImageUpload
                  kind="cover"
                  src={v.coverUrl}
                  onBusy={(value) =>
                    setUploading((count) =>
                      Math.max(0, count + (value ? 1 : -1)),
                    )
                  }
                  onUploaded={(image) =>
                    setValues((old) => ({ ...old, coverToken: image.token }))
                  }
                />
              </div>
            </Panel>
          </aside>
        </div>
        <div className="vw-form-footer">
          <p>
            Contact information is used for customer enquiries and business
            communication.
          </p>
          <button className="vw-button vw-primary" disabled={busy || uploading}>
            {busy ? "Saving…" : "Save business profile"}
          </button>
        </div>
      </form>
    </>
  );
}
