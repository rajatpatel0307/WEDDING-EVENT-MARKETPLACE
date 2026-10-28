import { Wallet } from "lucide-react";
import {
  ErrorView,
  Heading,
  Loading,
  useVendorData,
} from "../components/WorkspaceUI";
import { money } from "../services/workspace.api";
import VendorResourcesPage from "./VendorResourcesPage";
export default function VendorEarningsPage() {
  const resource = useVendorData("/business");
  if (resource.error)
    return <ErrorView error={resource.error} retry={resource.retry} />;
  if (!resource.data) return <Loading />;
  const revenue = resource.data.revenue;
  return (
    <>
      <Heading
        title="Your earnings"
        description="A clear view of recognized earnings, deductions and payouts."
      />
      <div className="vw-kpi-grid">
        {[
          ["gross", "Gross earnings"],
          ["commission", "Platform commission"],
          ["tax", "Tax deductions"],
          ["net", "Net earnings"],
          ["paid", "Paid payouts"],
          ["pending", "Pending payouts"],
        ].map(([key, label]) => (
          <div className="vw-kpi" key={key}>
            <div>
              <span>{label}</span>
              <Wallet size={17} />
            </div>
            <strong>{money(revenue[key])}</strong>
            <small>Recorded payout ledger · INR</small>
          </div>
        ))}
      </div>
      <p className="vw-form-note">
        Customer collections: {money(revenue.collected)}. Successful payments
        can differ from recognized payout earnings.
      </p>
      <VendorResourcesPage section="revenue" title="Earnings ledger" embedded />
    </>
  );
}
