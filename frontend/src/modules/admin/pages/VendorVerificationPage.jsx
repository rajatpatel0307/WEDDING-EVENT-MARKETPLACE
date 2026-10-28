import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { Link } from "react-router-dom";
import {
  Check,
  X,
  Pause,
  FileText,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { client, mutate } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";
import { AccountLayout } from "../../auth/pages/AccountPages";
const QUERY = gql`
  query AdminVendors($offset: Int) {
    adminVendors(offset: $offset) {
      id
      businessName
      businessDescription
      businessEmail
      businessPhone
      createdAt
      verificationStatus
      rejectionReason
      user {
        firstName
        lastName
        email
        phone
        accountStatus
      }
      categories {
        id
        name
      }
      locations {
        id
        address
        city
        state
        country
        postalCode
        latitude
        longitude
      }
      documents {
        id
        type
      }
    }
  }
`;
export default function VendorVerificationPage() {
  const [vendors, setVendors] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [offset, setOffset] = useState(0);
  const { notify } = useAuth();
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await client.query({ query: QUERY, variables: { offset } });
      setVendors(r.data.adminVendors);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    setSelected(null);
  }, [offset]);
  async function review(status) {
    if (status === "Rejected" && !reason.trim()) {
      setError("Enter a rejection reason before rejecting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await mutate("reviewVendor", {
        id: selected.id,
        status,
        reason: reason || null,
      });
      notify(`Vendor ${status.toLowerCase()} successfully.`);
      setSelected(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(id) {
    setBusy(true);
    try {
      const r = await client.query({
        query: gql`
          query AdminDocument($id: ID!) {
            adminDocument(id: $id) {
              name
              mimeType
              base64
            }
          }
        `,
        variables: { id },
        fetchPolicy: "no-cache",
      });
      const d = r.data.adminDocument,
        blob = new Blob(
          [Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0))],
          { type: d.mimeType },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = d.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountLayout>
      <Link className="back-link inline-flex gap-[8px] items-center [color:#8d6a72] text-[12px] mt-[25px]" to="/admin/dashboard">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">TRUST & VERIFICATION</span>
      <h1>Vendor applications.</h1>
      <p className="dashboard-intro mt-[12px] text-[14px]">
        Get to know the people behind every celebration.
      </p>
      {error && (
        <div className="error-box [padding:12px_14px] [border:1px_solid_#e8bac2] rounded-[6px] [background:#fff2f3] [color:#a1374a] text-[12px] mb-[20px] [overflow-wrap:anywhere]" role="alert">
          {error}
        </div>
      )}
      <div className="admin-grid grid grid-cols-[330px_1fr] gap-[25px] mt-[35px] max-[1150.001px]:grid-cols-[290px_1fr] max-[850.001px]:grid-cols-[1fr]">
        <section className="vendor-list bg-white [border:1px_solid_#ebdfe4] rounded-[10px] [padding:20px] min-w-0 max-[850.001px]:max-h-[400px] max-[850.001px]:overflow-y-auto" aria-label="Vendor applications">
          {loading ? (
            <p role="status">Loading applications…</p>
          ) : !vendors.length ? (
            <p>No applications on this page.</p>
          ) : (
            vendors.map((v) => (
              <button
                key={v.id}
                className={`vendor-item [border:1px_solid_transparent] rounded-[7px] w-full flex items-center gap-[12px] text-left [padding:14px_10px] bg-white text-[12px] [color:#755460] mb-[8px] [&.active]:[background:#fcf5f7] [&.active]:[border-color:#ebd2db] [&:hover]:[background:#fcf5f7] [&:hover]:[border-color:#ebd2db] [&_>_span:nth-child(2)]:flex-1 [&_>_span:nth-child(2)]:min-w-0 [&_>_span:nth-child(2)]:[overflow-wrap:anywhere] [&_strong]:block [&_strong]:font-medium [&_small]:block [&_small]:[color:#a9939c] [&_small]:text-[10px] [&_small]:mt-[3px] ${selected?.id === v.id ? "active" : ""}`}
                onClick={() => {
                  setSelected(v);
                  setReason(v.rejectionReason || "");
                  setError("");
                }}
              >
                <span className="vendor-avatar w-[36px] h-[36px] grid place-items-center rounded-[8px] [background:#f2e7eb] [color:#af8696] shrink-0 [font-family:Georgia,_serif] text-[20px]">{v.businessName[0]}</span>
                <span>
                  <strong>{v.businessName}</strong>
                  <small>
                    {v.user.firstName} {v.user.lastName}
                  </small>
                  <span
                    className={`status-badge inline-block [background:#f8f0e4] [border:1px_solid_#eedec4] [color:#a38a58] [padding:2px_8px] rounded-[20px] text-[9px] mt-[7px] [&.approved]:[background:#eef5ee] [&.approved]:[border-color:#d5e6d3] [&.approved]:[color:#66875f] [&.rejected]:[background:#fbebee] [&.rejected]:[border-color:#efd4dc] [&.rejected]:[color:#b26e80] [&.suspended]:[background:#fbebee] [&.suspended]:[border-color:#efd4dc] [&.suspended]:[color:#b26e80] ${v.verificationStatus.toLowerCase()}`}
                  >
                    {v.verificationStatus}
                  </span>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          )}
          <div className="pagination flex items-center justify-between gap-[8px] mt-[20px] [border-top:1px_solid_#eee1e6] pt-[18px] [&_span]:text-[10px] [&_span]:[color:#a98d99] [&_button]:[padding:8px_10px] [&_button]:text-[10px] [&_button]:min-h-[35px]">
            <button
              className="secondary-button [border:1px_solid_#dfd2d6] bg-white [color:#83656f] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [&:hover:not(:disabled)]:[background:#f8f2f3]"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 25))}
            >
              Previous
            </button>
            <span>Page {Math.floor(offset / 25) + 1}</span>
            <button
              className="secondary-button [border:1px_solid_#dfd2d6] bg-white [color:#83656f] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [&:hover:not(:disabled)]:[background:#f8f2f3]"
              disabled={vendors.length < 25 || loading}
              onClick={() => setOffset(offset + 25)}
            >
              Next
            </button>
          </div>
        </section>
        <section className="vendor-detail bg-white [border:1px_solid_#ebdfe4] rounded-[10px] [padding:30px] min-w-0 [&_>_p]:text-[12px] [&_>_p]:[overflow-wrap:anywhere] [&_dl]:grid [&_dl]:grid-cols-[120px_1fr] [&_dl]:text-[11px] [&_dl]:gap-[10px] [&_dl]:[margin:25px_0] [&_dt]:[color:#af96a1] [&_dd]:m-0 [&_dd]:[color:#7c5e6b] [&_dd]:[overflow-wrap:anywhere] [&_h3]:text-[12px] [&_h3]:[margin:24px_0_13px] [&_h3]:[color:#886573] max-[850.001px]:min-h-[350px] max-[480.001px]:[padding:22px] max-[480.001px]:[&_dl]:grid-cols-[95px_1fr]">
          {selected ? (
            <>
              <div className="detail-heading pb-[20px] [border-bottom:1px_solid_#eee1e6] mb-[20px] [&_h2]:text-[29px] [&_h2]:mt-[12px] [&_h2]:[color:#704453]">
                <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">VENDOR PROFILE</span>
                <h2>{selected.businessName}</h2>
                <span
                  className={`status-badge inline-block [background:#f8f0e4] [border:1px_solid_#eedec4] [color:#a38a58] [padding:2px_8px] rounded-[20px] text-[9px] mt-[7px] [&.approved]:[background:#eef5ee] [&.approved]:[border-color:#d5e6d3] [&.approved]:[color:#66875f] [&.rejected]:[background:#fbebee] [&.rejected]:[border-color:#efd4dc] [&.rejected]:[color:#b26e80] [&.suspended]:[background:#fbebee] [&.suspended]:[border-color:#efd4dc] [&.suspended]:[color:#b26e80] ${selected.verificationStatus.toLowerCase()}`}
                >
                  {selected.verificationStatus}
                </span>
              </div>
              <p>{selected.businessDescription}</p>
              <dl>
                <dt>Vendor</dt>
                <dd>
                  {selected.user.firstName} {selected.user.lastName}
                </dd>
                <dt>Account email</dt>
                <dd>{selected.user.email}</dd>
                <dt>Account phone</dt>
                <dd>{selected.user.phone}</dd>
                <dt>Business email</dt>
                <dd>{selected.businessEmail}</dd>
                <dt>Business phone</dt>
                <dd>{selected.businessPhone}</dd>
                <dt>Account status</dt>
                <dd>{selected.user.accountStatus}</dd>
                <dt>Registered</dt>
                <dd>{new Date(selected.createdAt).toLocaleDateString()}</dd>
              </dl>
              <h3>Service categories</h3>
              <div className="tags flex flex-wrap gap-[7px] [&_>_span]:[border:1px_solid_#eedde4] [&_>_span]:[padding:5px_9px] [&_>_span]:rounded-[5px] [&_>_span]:text-[10px] [&_>_span]:[color:#997483]">
                {selected.categories.map((c) => (
                  <span key={c.id}>{c.name}</span>
                ))}
              </div>
              <h3>Locations</h3>
              {selected.locations.map((l) => (
                <p key={l.id}>
                  {l.address}, {l.city}, {l.state}, {l.country} {l.postalCode}
                  {l.latitude != null && (
                    <small>
                      {" "}
                      · {l.latitude}, {l.longitude}
                    </small>
                  )}
                </p>
              ))}
              <h3>Verification documents</h3>
              <div className="admin-docs flex gap-[10px] flex-wrap mb-[25px]">
                {selected.documents.map((d) => (
                  <button
                    key={d.id}
                    className="secondary-button [border:1px_solid_#dfd2d6] bg-white [color:#83656f] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [&:hover:not(:disabled)]:[background:#f8f2f3]"
                    disabled={busy}
                    onClick={() => download(d.id)}
                  >
                    <FileText size={16} />
                    {d.type} ↓
                  </button>
                ))}
              </div>
              <label className="field block mb-[18px] text-[11px] font-medium [color:#55494d] [&_>_span]:block [&_>_span]:mb-[7px] [&_input]:block [&_input]:w-full [&_input]:[border:1px_solid_#e8dfe0] [&_input]:bg-white [&_input]:rounded-[6px] [&_input]:min-h-[45px] [&_input]:[padding:11px_13px] [&_input]:[color:#453438] [&_input]:text-[12px] [&_input]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e8dfe0] [&_textarea]:bg-white [&_textarea]:rounded-[6px] [&_textarea]:min-h-[45px] [&_textarea]:[padding:11px_13px] [&_textarea]:[color:#453438] [&_textarea]:text-[12px] [&_textarea]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:resize-y [&_select]:block [&_select]:w-full [&_select]:[border:1px_solid_#e8dfe0] [&_select]:bg-white [&_select]:rounded-[6px] [&_select]:min-h-[45px] [&_select]:[padding:11px_13px] [&_select]:[color:#453438] [&_select]:text-[12px] [&_select]:[transition:border_0.2s,_box-shadow_0.2s] [&_input::placeholder]:[color:#b3a6aa] [&_textarea::placeholder]:[color:#b3a6aa] [&_input:focus]:[border-color:#ad7b82] [&_input:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_input:focus]:[outline:none] [&_textarea:focus]:[border-color:#ad7b82] [&_textarea:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_textarea:focus]:[outline:none] [&_select:focus]:[border-color:#ad7b82] [&_select:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_select:focus]:[outline:none] [&_small]:block [&_small]:[color:#95868a] [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:font-normal">
                <span>Rejection reason / review note</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Required when rejecting. The vendor will see this note."
                />
              </label>
              <div className="review-actions flex gap-[10px] flex-wrap [&_>_.primary-button]:w-auto max-[480.001px]:gap-[7px] max-[480.001px]:[&_button]:text-[10px] max-[480.001px]:[&_button]:[padding:10px]">
                <button
                  className="primary-button [border:1px_solid_#8c414e] [background:#8c414e] text-white min-h-[46px] rounded-[6px] flex items-center justify-center gap-[12px] w-full text-[12px] font-medium [padding:12px_17px] [box-shadow:0_3px_5px_#8c414e0a] [&:hover:not(:disabled)]:[background:#783541] [&:hover:not(:disabled)]:[border-color:#783541] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&_svg:last-child]:ml-[6px]"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Approved")}
                >
                  <Check size={17} /> Approve
                </button>
                <button
                  className="danger-button [border:1px_solid_#dfd2d6] [background:#fff2f2] [color:#a94c52] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [border-color:#e9c6c6]"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Rejected")}
                >
                  <X size={17} /> Reject
                </button>
                <button
                  className="secondary-button [border:1px_solid_#dfd2d6] bg-white [color:#83656f] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [&:hover:not(:disabled)]:[background:#f8f2f3]"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Suspended")}
                >
                  <Pause size={17} /> Suspend
                </button>
              </div>
            </>
          ) : (
            <div className="detail-placeholder h-full min-h-[350px] flex justify-center items-center text-center flex-col [padding:30px] [color:#b590a0] [&_h2]:text-[28px] [&_h2]:[margin:20px_0_12px] [&_p]:text-[12px] [&_p]:max-w-[320px]">
              <FileText size={38} />
              <h2>Every great partnership starts here.</h2>
              <p>
                Select an application to review the vendor's details and
                documents.
              </p>
            </div>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}
