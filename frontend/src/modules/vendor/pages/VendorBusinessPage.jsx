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
          <div className="
            flex items-center flex-col gap-[19px] p-[30px] text-center [&_>_span]:grid
            [&_>_span]:place-items-center [&_>_span]:w-[88px] [&_>_span]:h-[88px] [&_>_span]:[background:#edf5e4]
            [&_>_span]:text-[#92ad73] [&_>_span]:rounded-[50%] [&_>_h2]:text-[22px]
            [&_>_h2]:[font-family:Georgia,_serif] [&_>_h2]:font-normal [&_>_h2]:text-[#8fa578]
            [&_>_p]:max-w-[490px] [&_>_p]:text-[11px] [&_>_p]:leading-[1.9] [&_.vw-details]:w-[100%]
            [&_.vw-details]:text-left [&_.vw-details]:[border-top:1px_solid_#e4eed7] [&_.vw-details]:pt-[22px]
          ">
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
            <div className="
              flex justify-center gap-[34px] flex-wrap [padding:10px_0_18px] [&_>_div]:flex [&_>_div]:items-center
              [&_>_div]:gap-[8px] [&_>_div]:text-[#9bb780] [&_strong]:text-[9px] [&_strong]:font-medium
            ">
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
            <dl className="
              vw-details grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[23px] m-[0] [&_>_div]:min-w-[0]
              [&_dt]:text-[#a0b18d] [&_dt]:uppercase [&_dt]:text-[8px] [&_dt]:tracking-[0.6px]
              [&_dt]:[margin:0_0_5px] [&_dd]:text-[#7d9668] [&_dd]:text-[11px] [&_dd]:[overflow-wrap:anywhere]
              [&_dd]:whitespace-pre-wrap [&_dd]:m-[0] vendor-mobile:gap-[20px] vendor-phone:grid-cols-[1fr]
            ">
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
            {v.remarks && <p className="
              [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
              [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
              rounded-[6px] text-[10px]! leading-[1.8]
            ">{v.remarks}</p>}
            <Link className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            " to="/vendor/documents">
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
          <Link to="/vendor/business/profile" className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            vw-primary
          ">
            Edit business profile
          </Link>
        </Heading>
        <Panel title={v.businessName} action={<Badge>{v.status}</Badge>}>
          <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
            <p className="whitespace-pre-wrap leading-[1.9] text-[#9aa98b]!">{v.description}</p>
            <dl className="
              vw-details grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[23px] m-[0] [&_>_div]:min-w-[0]
              [&_dt]:text-[#a0b18d] [&_dt]:uppercase [&_dt]:text-[8px] [&_dt]:tracking-[0.6px]
              [&_dt]:[margin:0_0_5px] [&_dd]:text-[#7d9668] [&_dd]:text-[11px] [&_dd]:[overflow-wrap:anywhere]
              [&_dd]:whitespace-pre-wrap [&_dd]:m-[0] vendor-mobile:gap-[20px] vendor-phone:grid-cols-[1fr]
            ">
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
            <div className="flex flex-wrap gap-[7px] [&_span]:text-[9px] [&_span]:[padding:4px_8px] [&_span]:rounded-[4px] [&_span]:text-[#93a77d] [&_span]:[background:#f0f5e8]">
              {categories.map((c) => (
                <span key={c.id}>{c.name}</span>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Business locations">
          <div className="
            grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[20px] [padding:0_23px_23px]
            [&_article]:[border-top:1px_solid_#e2ecd6] [&_article]:[border-right:1px_solid_#e2ecd6]
            [&_article]:[border-bottom:1px_solid_#e2ecd6] [&_article]:[border-left:1px_solid_#e2ecd6]
            [&_article]:rounded-[8px] [&_article]:p-[22px] [&_svg]:text-[#9bb183] [&_svg]:mb-[12px]
            [&_h3]:text-[13px] [&_h3]:text-[#7c9567] [&_p]:[margin:9px_0_15px] [&_p]:text-[10px]
            [&_p]:leading-[1.8] vendor-tablet:grid-cols-[repeat(2,_minmax(0,_1fr))] vendor-phone:grid-cols-[1fr]
          ">
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
        className="
          min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
          [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
          [&_>_.vw-panel_+_.vw-panel]:mt-[22px]
        "
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
        <div className="
          grid grid-cols-[minmax(0,_1fr)_330px] gap-[22px] [align-items:start] [&_>_div]:grid
          [&_>_div]:gap-[22px] [&_>_div]:min-w-[0] [&_>_aside]:grid [&_>_aside]:gap-[22px]
          [&_>_aside]:min-w-[0] vendor-compact:grid-cols-[minmax(0,_1fr)_270px] vendor-compact:gap-[18px]
          vendor-tablet:grid-cols-[1fr] vendor-tablet:[&_>_aside]:grid-cols-[1fr_1fr]
          vendor-tablet:[&_>_aside]:[align-items:start] vendor-mobile:[&_>_aside]:grid-cols-[1fr]
        ">
          <Panel title="Business information">
            <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
              {error && (
                <p className="
                  vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
                  [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
                  rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
                " role="alert">
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
              <div className="flex flex-wrap gap-[7px] [&_span]:text-[9px] [&_span]:[padding:4px_8px] [&_span]:rounded-[4px] [&_span]:text-[#93a77d] [&_span]:[background:#f0f5e8]">
                {categories.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
            </div>
          </Panel>
          <aside>
            <Panel title="Business logo">
              <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
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
              <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
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
        <div className="
          flex items-center justify-between gap-[20px] mt-[23px] [padding:18px_0] [&_>_p]:flex
          [&_>_p]:items-center [&_>_p]:gap-[7px] [&_>_p]:text-[9px] [&_>_p]:text-[#a0b28e] [&_>_div]:flex
          [&_>_div]:items-center [&_>_div]:gap-[9px] vendor-mobile:items-start vendor-mobile:flex-col
          vendor-mobile:[&_>_div]:[align-self:flex-end] vendor-phone:[&_>_p]:text-[8px]
        ">
          <p>
            Contact information is used for customer enquiries and business
            communication.
          </p>
          <button className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            vw-primary
          " disabled={busy || uploading}>
            {busy ? "Saving…" : "Save business profile"}
          </button>
        </div>
      </form>
    </>
  );
}
