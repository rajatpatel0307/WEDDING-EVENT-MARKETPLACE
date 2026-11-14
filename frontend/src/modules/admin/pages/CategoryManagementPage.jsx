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


export default function CategoryManagementPage({
  create = false,
  edit = false,
}) {
  const { id } = useParams();
  const state = useAdminData(create ? null : `/categories/${id}`, edit ? "edit" : "view");
  return (
    <main className="min-w-0 text-[#354e43] [&_label]:flex [&_label]:flex-col [&_label]:gap-[9px] [&_label]:text-[12px] [&_label]:text-[#6c8272] [&_label_small]:text-[11px] [&_label_small]:leading-[1.7] [&_label_small]:text-[#8a9b8d] [&_input:not([type=file])]:box-border [&_input:not([type=file])]:w-full [&_input:not([type=file])]:min-w-0 [&_input:not([type=file])]:rounded-lg [&_input:not([type=file])]:border [&_input:not([type=file])]:border-[#dce5db] [&_input:not([type=file])]:bg-white [&_input:not([type=file])]:px-[13px] [&_input:not([type=file])]:py-[11px] [&_input:not([type=file])]:text-[#354e43] [&_select]:box-border [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dce5db] [&_select]:bg-white [&_select]:px-[13px] [&_select]:py-[11px] [&_select]:text-[#354e43] [&_textarea]:box-border [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#dce5db] [&_textarea]:bg-white [&_textarea]:px-[13px] [&_textarea]:py-[11px] [&_textarea]:text-[#354e43] [&_input[readonly]]:bg-[#f6f8f3]! [&_input[readonly]]:text-[#7c8b7e]! [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-55 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#70a99b]">
      <Link className="mb-6 inline-flex items-center gap-2 text-[12px] text-[#6b8375]" to="/admin/categories">
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
      <header className="mb-7 flex items-center justify-between gap-5 [&_h1]:my-2 [&_h1]:text-[28px] [&_h1]:font-semibold [&_p]:text-[12px] [&_p]:text-[#7b8e80] max-[767px]:flex-col max-[767px]:items-start max-[767px]:[&_h1]:text-[24px]">
        <div>
          <p className="text-[9px]! tracking-[1.5px] text-[#789080]!">MARKETPLACE MANAGEMENT</p>
          <h1>{category ? "Edit category" : "Create category"}</h1>
          <p>
            Manage category information, imagery and product service options.
          </p>
        </div>
        <Tags size={27} />
      </header>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="m-0 grid min-w-0 grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)] gap-6 border-0 p-0 max-[767px]:grid-cols-1">
          <section className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5">
            <h2>Category information</h2>
            <div className="grid grid-cols-2 gap-5 max-[420px]:grid-cols-1">
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
              <label className="col-span-full">
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
          <aside className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5">
            <h2>Category image</h2>
            <CategoryImageUpload
              image={category?.image}
              onReadingChange={setReadingImage}
            />
          </aside>
          <section className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5 col-span-full">
            <h2>Product Service Options</h2>
            <p>Choose the services vendors can offer in this category.</p>
            <div className="mt-5 grid grid-cols-3 gap-6 max-[767px]:grid-cols-1">
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
              <div className="rounded-[10px] border border-[#dfe9dc] bg-[#f5f8f0] p-[17px] text-[13px] [&_p]:mt-2 [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0">
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
          <p role="alert" className="my-5 rounded-lg bg-[#fff1ed] p-[15px] text-[13px]! text-[#a6554a]!">
            {error}
          </p>
        )}
        <footer className="mt-6 flex flex-wrap justify-end gap-3">
          <Link className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline" to={back}>
            Cancel
          </Link>
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline border-[#176b60]! bg-[#176b60]! text-white! hover:bg-[#11594f]! hover:text-white!"
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
      <header className="mb-7 flex items-center justify-between gap-5 [&_h1]:my-2 [&_h1]:text-[28px] [&_h1]:font-semibold [&_p]:text-[12px] [&_p]:text-[#7b8e80] max-[767px]:flex-col max-[767px]:items-start max-[767px]:[&_h1]:text-[24px]">
        <div>
          <p className="text-[9px]! tracking-[1.5px] text-[#789080]!">CATEGORY DETAILS</p>
          <h1>{category.name}</h1>
          <p>Review category information and the services vendors can offer.</p>
        </div>
        <Link
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline border-[#176b60]! bg-[#176b60]! text-white! hover:bg-[#11594f]! hover:text-white!"
          to={`/admin/categories/${category.id}/edit`}
        >
          <Pencil size={16} /> Edit category
        </Link>
      </header>
      <div className="m-0 grid min-w-0 grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)] gap-6 border-0 p-0 max-[767px]:grid-cols-1">
        <section className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2>Category information</h2>
            <Badge>{category.status}</Badge>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-5 [&_dt]:text-[11px] [&_dt]:text-[#8a9b8b] [&_dd]:mt-[7px] [&_dd]:mr-0 [&_dd]:mb-0 [&_dd]:ml-0 [&_dd]:text-[13px] [&_dd]:wrap-anywhere max-[420px]:grid-cols-1">
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
          <p className="whitespace-pre-wrap">
            {category.description || "No description provided."}
          </p>
        </section>
        <aside className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5">
          <h2>Category image</h2>
          {image ? (
            <img
              className="h-60 w-full rounded-[10px] object-cover"
              src={image}
              alt={`${category.name} category`}
            />
          ) : (
            <p>No category image uploaded.</p>
          )}
        </aside>
        <section className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5 col-span-full">
          <h2>Product Service Options</h2>
          <dl className="m-0 grid grid-cols-2 gap-5 [&_dt]:text-[11px] [&_dt]:text-[#8a9b8b] [&_dd]:mt-[7px] [&_dd]:mr-0 [&_dd]:mb-0 [&_dd]:ml-0 [&_dd]:text-[13px] [&_dd]:wrap-anywhere max-[420px]:grid-cols-1">
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
        <section className="min-w-0 rounded-[14px] border border-[#e0e8df] bg-white p-[26px] [&_h2]:mt-0 [&_h2]:mb-5 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-[10px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-[#7a8c7c] max-[767px]:p-5 mt-6">
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
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline"
                disabled={busy}
                onClick={() => {
                  setParams({}, { replace: true });
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline border-[#176b60]! bg-[#176b60]! text-white! hover:bg-[#11594f]! hover:text-white!"
                disabled={busy}
              >
                {busy ? "Updating..." : `Confirm ${action}`}
              </button>
            </div>
          </form>
          {error && (
            <p role="alert" className="my-5 rounded-lg bg-[#fff1ed] p-[15px] text-[13px]! text-[#a6554a]!">
              {error}
            </p>
          )}
        </section>
      ) : (
        <footer className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dbe4dc] bg-white px-[17px] py-[11px] text-[12px] font-normal! text-[#5d7668] no-underline"
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
