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
    <div className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto]
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
    ">
      <Heading
        title="Create Package"
        description="Choose the service this package belongs to."
      />
      <form
        className="
          [padding:20px_25px] flex gap-[12px] items-center [&_select]:[background:white]
          [&_select]:min-h-[39px] [&_select]:[padding:8px_12px]
          [&_select]:[border-top:1px_solid_var(--sm-border)]
          [&_select]:[border-right:1px_solid_var(--sm-border)]
          [&_select]:[border-bottom:1px_solid_var(--sm-border)]
          [&_select]:[border-left:1px_solid_var(--sm-border)] [&_select]:rounded-[7px]
          [&_select]:text-[#667b69] [&_>_select]:max-w-[200px] service-mobile:p-[15px] service-mobile:flex-wrap
          service-mobile:[&_>_select]:[flex:1] service-mobile:[&_>_select]:max-w-[none]
        "
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
        <button className="
          vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
          [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
          rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
          font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
          [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
          [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
          [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
          [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
        " type="submit">
          Search
        </button>
      </form>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[20px] service-tablet:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:grid-cols-[1fr]">
            {state.data.rows.map((service) => (
              <article className="
                p-[25px] [background:#fff] [border-top:1px_solid_var(--sm-border)]
                [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
                [border-left:1px_solid_var(--sm-border)] rounded-[12px] [&_>_.vw-badge]:[float:right]
                [&_h2]:text-[19px] [&_h2]:mt-[20px] [&_p]:min-h-[40px] [&_>_.sm-row-actions]:mt-[20px]
                [&_>_.sm-row-actions]:pt-[20px] [&_>_.sm-row-actions]:[border-top:1px_solid_var(--sm-border)]
              " key={service.id}>
                <h2>{service.name}</h2>
                <p>
                  {service.category} · {service.status}
                </p>
                <button
                  className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                  "
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
                <Link className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                " to="/vendor/services/add">
                  Add a service
                </Link>
              }
            />
          )}
          <div className="
            [padding:19px_25px] flex gap-[10px] items-center text-[11px] text-[#8b9985] [&_>_span]:[flex:1]
            [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_select]:p-[5px]
            [&_.vw-button]:text-[11px] [&_.vw-button]:[padding:6px_12px] service-mobile:p-[15px]
            service-mobile:flex-wrap service-mobile:[&_>_span]:[flex-basis:100%]
            service-mobile:[&_label]:mr-[auto]
          ">
            <button
              className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              "
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
              className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              "
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
