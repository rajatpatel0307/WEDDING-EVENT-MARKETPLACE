import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Heading,
  Loading,
  ErrorView,
  Empty,
  useVendorData,
} from "../components/WorkspaceUI";
import ServicePackages from "./ServicePackages";

function EditPackage({ id }) {
  const state = useVendorData(`/packages/${id}`);
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return (
    <ServicePackages
      key={id}
      serviceId={state.data.serviceId}
      initialPackage={state.data}
    />
  );
}

function ChooseService() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const query = new URLSearchParams({
    pageSize: "24",
    page: params.get("page") || "1",
    q: params.get("q") || "",
  });
  const state = useVendorData(`/services?${query}`);
  const selected = params.get("serviceId");
  if (selected)
    return <ServicePackages key={selected} serviceId={selected} create />;
  return (
    <div className="sm-page">
      <Heading
        title="Create Package"
        description="Choose the service this package belongs to."
      />
      <form
        className="sm-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setParams(search ? { q: search } : {});
        }}
      >
        <input
          aria-label="Search your services"
          placeholder="Search your services"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="vw-button" type="submit">
          Search
        </button>
      </form>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <>
          <div className="sm-package-grid">
            {state.data.rows.map((service) => (
              <article className="sm-package" key={service.id}>
                <h2>{service.name}</h2>
                <p>
                  {service.category} · {service.status}
                </p>
                <button
                  className="vw-button"
                  disabled={!service.actions.edit}
                  onClick={() => setParams({ serviceId: service.id })}
                >
                  Create package
                </button>
              </article>
            ))}
          </div>
          {!state.data.rows.length && (
            <Empty
              title="No matching services"
              action={
                <Link className="vw-button" to="/vendor/services/add">
                  Add a service
                </Link>
              }
            />
          )}
          <div className="sm-pagination">
            <button
              className="vw-button"
              disabled={state.data.page <= 1}
              onClick={() =>
                setParams({
                  q: query.get("q"),
                  page: String(state.data.page - 1),
                })
              }
            >
              Previous
            </button>
            <span>Page {state.data.page}</span>
            <button
              className="vw-button"
              disabled={
                state.data.page * state.data.pageSize >= state.data.total
              }
              onClick={() =>
                setParams({
                  q: query.get("q"),
                  page: String(state.data.page + 1),
                })
              }
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PackageRoute() {
  const { id } = useParams();
  return id ? <EditPackage id={id} /> : <ChooseService />;
}
