import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Pencil, Save, Tags, LoaderCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { categoryImages } from "../../../components/home/categoryImages";
import { adminRequest, date } from "../api";
import { useAdminData } from "../services-management.api";
import { Badge, ErrorState, Skeleton } from "../components/AdminTable";
import CategoryImageUpload from "../components/CategoryImageUpload";
import "./category-details.css";

export default function CategoryManagementPage({
  create = false,
  edit = false,
}) {
  const { id } = useParams();
  const state = useAdminData(create ? null : `/categories/${id}`, edit ? "edit" : "view");
  return (
    <main className="category-page">
      <Link className="category-back" to="/admin/categories">
        <ArrowLeft size={16} /> All categories
      </Link>
      {!create && state.loading ? (
        <Skeleton />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.retry} />
      ) : create || state.data ? (
        create || edit ? (
          <CategoryEditor
            key={`${id || "new"}:${state.data?.updatedAt || ""}`}
            category={state.data}
          />
        ) : (
          <CategoryDetails category={state.data} reload={state.retry} />
        )
      ) : null}
    </main>
  );
}

function CategoryEditor({ category }) {
  const navigate = useNavigate();
  const { notify } = useAuth();
  const [busy, setBusy] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [error, setError] = useState("");
  const [sell, setSell] = useState(!!category?.sellEnabled);
  const [book, setBook] = useState(category ? !!category.bookEnabled : true);
  const back = category
    ? `/admin/categories/${category.id}`
    : "/admin/categories";
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...fields,
      name: fields.name.trim(),
      code: fields.code.trim(),
      sortOrder: Number(fields.sortOrder),
      sellEnabled: sell,
      bookEnabled: book,
      ...(fields.removeImage
        ? { removeImage: fields.removeImage === "true" }
        : {}),
      ...(category?.updatedAt ? { expectedUpdatedAt: category.updatedAt } : {}),
    };
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(
        category ? `/categories/${category.id}` : "/categories",
        {
          method: category ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      notify(result.message || "Category saved.");
      const savedId = result.id || category?.id;
      navigate(savedId ? `/admin/categories/${savedId}` : "/admin/categories", {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="category-heading">
        <div>
          <p className="category-eyebrow">MARKETPLACE MANAGEMENT</p>
          <h1>{category ? "Edit category" : "Create category"}</h1>
          <p>
            Manage category information, imagery and product service options.
          </p>
        </div>
        <Tags size={27} />
      </header>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="category-form-layout">
          <section className="category-panel">
            <h2>Category information</h2>
            <div className="category-field-grid">
              <label>
                Category name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={150}
                  defaultValue={category?.name || ""}
                />
              </label>
              <label>
                Category code
                <input
                  name="code"
                  required
                  minLength={2}
                  maxLength={50}
                  pattern={"[A-Za-z0-9_\\-]+"}
                  readOnly={/^AUTH_SERVICE_\d+$/.test(category?.code || "")}
                  defaultValue={category?.code || ""}
                />
                <small>
                  Use letters, numbers, hyphens or underscores. Built-in
                  category codes are fixed.
                </small>
              </label>
              <label>
                Icon name
                <input
                  name="icon"
                  maxLength={100}
                  defaultValue={category?.icon || ""}
                />
              </label>
              <label>
                Display order
                <input
                  name="sortOrder"
                  type="number"
                  required
                  min={0}
                  max={100000}
                  step={1}
                  defaultValue={category?.sortOrder ?? 0}
                />
              </label>
              <label className="category-full-width">
                Description
                <textarea
                  name="description"
                  rows={5}
                  maxLength={500}
                  defaultValue={category?.description || ""}
                />
              </label>
            </div>
          </section>
          <aside className="category-panel">
            <h2>Category image</h2>
            <CategoryImageUpload
              image={category?.image}
              onReadingChange={setReadingImage}
            />
          </aside>
          <section className="category-panel category-full-width">
            <h2>Product Service Options</h2>
            <p>Choose the services vendors can offer in this category.</p>
            <div className="category-service-options">
              <label>
                Enable Sell (Buy Online)
                <select
                  value={String(sell)}
                  onChange={(e) => setSell(e.target.value === "true")}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label>
                Enable Book (Reservation)
                <select
                  value={String(book)}
                  onChange={(e) => setBook(e.target.value === "true")}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <div className="category-permission-summary">
                <strong>
                  {sell && book
                    ? "Sell & Book Both"
                    : sell
                      ? "Sell Only"
                      : book
                        ? "Book Only"
                        : "Services disabled"}
                </strong>
                <p>
                  {sell && book
                    ? "Vendors can choose Sell, Book or Both."
                    : sell || book
                      ? "Vendors can only offer the enabled service."
                      : "Vendors cannot offer either service in this category."}
                </p>
              </div>
            </div>
          </section>
        </fieldset>
        {error && (
          <p role="alert" className="category-error">
            {error}
          </p>
        )}
        <footer className="category-form-actions">
          <Link className="category-button" to={back}>
            Cancel
          </Link>
          <button
            className="category-button category-primary"
            disabled={busy || readingImage}
            type="submit"
          >
            {busy || readingImage ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {busy
              ? "Saving..."
              : readingImage
                ? "Reading image..."
                : "Save category"}
          </button>
        </footer>
      </form>
    </>
  );
}

function CategoryDetails({ category, reload }) {
  const [params, setParams] = useSearchParams();
  const { notify } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = params.get("action");
  const changingStatus =
    ["Active", "Inactive"].includes(action) && action !== category.status;
  const image =
    category.image ||
    categoryImages[category.name] ||
    categoryImages["Venue & Location"];
  async function changeStatus(event) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note");
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(`/categories/${category.id}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action, expectedStatus: category.status, note }),
      });
      notify(result.message || "Category status updated.");
      setParams({}, { replace: true });
      reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="category-heading">
        <div>
          <p className="category-eyebrow">CATEGORY DETAILS</p>
          <h1>{category.name}</h1>
          <p>Review category information and the services vendors can offer.</p>
        </div>
        <Link
          className="category-button category-primary"
          to={`/admin/categories/${category.id}/edit`}
        >
          <Pencil size={16} /> Edit category
        </Link>
      </header>
      <div className="category-form-layout">
        <section className="category-panel">
          <div className="category-panel-heading">
            <h2>Category information</h2>
            <Badge>{category.status}</Badge>
          </div>
          <dl className="category-facts">
            {[
              ["Category code", category.code],
              ["Icon", category.icon || "Not specified"],
              ["Display order", category.sortOrder],
              ["Services using this category", category.usageCount || 0],
              ["Created", date(category.createdAt)],
              ["Last updated", date(category.updatedAt)],
            ].map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3>Description</h3>
          <p className="category-description">
            {category.description || "No description provided."}
          </p>
        </section>
        <aside className="category-panel">
          <h2>Category image</h2>
          {image ? (
            <img
              className="category-cover"
              src={image}
              alt={`${category.name} category`}
            />
          ) : (
            <p>No category image uploaded.</p>
          )}
        </aside>
        <section className="category-panel category-full-width">
          <h2>Product Service Options</h2>
          <dl className="category-facts">
            <div>
              <dt>Sell (Buy Online)</dt>
              <dd>{category.sellEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Book (Reservation)</dt>
              <dd>{category.bookEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt>Sell & Book Both</dt>
              <dd>
                {category.sellEnabled && category.bookEnabled
                  ? "Available"
                  : "Unavailable"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      {changingStatus ? (
        <section className="category-panel category-status-change">
          <h2>Confirm change to {action}</h2>
          <p>
            This category is used by {category.usageCount || 0} services.{" "}
            {action === "Inactive"
              ? "Existing records will be preserved; the category and its services will be hidden from customer discovery."
              : "The category will become available for use."}
          </p>
          <form onSubmit={changeStatus}>
            <label>
              Admin note
              <textarea
                name="note"
                required
                minLength={3}
                maxLength={2000}
                rows={3}
                disabled={busy}
              />
            </label>
            <div className="category-form-actions">
              <button
                type="button"
                className="category-button"
                disabled={busy}
                onClick={() => {
                  setParams({}, { replace: true });
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                className="category-button category-primary"
                disabled={busy}
              >
                {busy ? "Updating..." : `Confirm ${action}`}
              </button>
            </div>
          </form>
          {error && (
            <p role="alert" className="category-error">
              {error}
            </p>
          )}
        </section>
      ) : (
        <footer className="category-form-actions">
          <button
            className="category-button"
            onClick={() => {
              setParams({
                action: category.status === "Active" ? "Inactive" : "Active",
              });
              setError("");
            }}
          >
            {category.status === "Active"
              ? "Deactivate category"
              : "Activate category"}
          </button>
        </footer>
      )}
    </>
  );
}
