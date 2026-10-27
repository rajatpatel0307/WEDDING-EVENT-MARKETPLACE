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
      <Link className="back-link" to="/admin/dashboard">
        <ArrowLeft size={15} /> Dashboard
      </Link>
      <span className="eyebrow">TRUST & VERIFICATION</span>
      <h1>Vendor applications.</h1>
      <p className="dashboard-intro">
        Get to know the people behind every celebration.
      </p>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="admin-grid">
        <section className="vendor-list" aria-label="Vendor applications">
          {loading ? (
            <p role="status">Loading applications…</p>
          ) : !vendors.length ? (
            <p>No applications on this page.</p>
          ) : (
            vendors.map((v) => (
              <button
                key={v.id}
                className={`vendor-item ${selected?.id === v.id ? "active" : ""}`}
                onClick={() => {
                  setSelected(v);
                  setReason(v.rejectionReason || "");
                  setError("");
                }}
              >
                <span className="vendor-avatar">{v.businessName[0]}</span>
                <span>
                  <strong>{v.businessName}</strong>
                  <small>
                    {v.user.firstName} {v.user.lastName}
                  </small>
                  <span
                    className={`status-badge ${v.verificationStatus.toLowerCase()}`}
                  >
                    {v.verificationStatus}
                  </span>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          )}
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 25))}
            >
              Previous
            </button>
            <span>Page {Math.floor(offset / 25) + 1}</span>
            <button
              className="secondary-button"
              disabled={vendors.length < 25 || loading}
              onClick={() => setOffset(offset + 25)}
            >
              Next
            </button>
          </div>
        </section>
        <section className="vendor-detail">
          {selected ? (
            <>
              <div className="detail-heading">
                <span className="eyebrow">VENDOR PROFILE</span>
                <h2>{selected.businessName}</h2>
                <span
                  className={`status-badge ${selected.verificationStatus.toLowerCase()}`}
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
              <div className="tags">
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
              <div className="admin-docs">
                {selected.documents.map((d) => (
                  <button
                    key={d.id}
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => download(d.id)}
                  >
                    <FileText size={16} />
                    {d.type} ↓
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Rejection reason / review note</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Required when rejecting. The vendor will see this note."
                />
              </label>
              <div className="review-actions">
                <button
                  className="primary-button"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Approved")}
                >
                  <Check size={17} /> Approve
                </button>
                <button
                  className="danger-button"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Rejected")}
                >
                  <X size={17} /> Reject
                </button>
                <button
                  className="secondary-button"
                  disabled={busy || selected.user.accountStatus !== "Active"}
                  onClick={() => review("Suspended")}
                >
                  <Pause size={17} /> Suspend
                </button>
              </div>
            </>
          ) : (
            <div className="detail-placeholder">
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
