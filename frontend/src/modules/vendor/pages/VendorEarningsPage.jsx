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
  const finance = useVendorData('/earnings');
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
      <div className="
        grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[13px]
        vendor-wide:grid-cols-[repeat(5,_minmax(0,_1fr))]
        vendor-wide:[&_>_:nth-last-child(-n_+_4)]:col-[auto] vendor-mobile:gap-[10px]
        vendor-phone:grid-cols-[repeat(2,_minmax(0,_1fr))] vendor-phone:[&_>_:last-child]:col-[1/-1]
      ">
        {[
          ["gross", "Gross earnings"],
          ["commission", "Platform commission"],
          ["tax", "Tax deductions"],
          ["net", "Net earnings"],
          ["paid", "Paid payouts"],
          ["pending", "Pending payouts"],
        ].map(([key, label]) => (
          <div className="
            [background:white] [border-top:1px_solid_#e4eadf] [border-right:1px_solid_#e4eadf]
            [border-bottom:1px_solid_#e4eadf] [border-left:1px_solid_#e4eadf] rounded-[9px] [padding:17px_20px]
            min-w-[0] [transition:transform_0.2s,_border-color_0.2s] [&:hover]:[border-color:#adc29b]
            [&:hover]:[transform:translateY(-2px)] [&_>_div]:flex [&_>_div]:justify-between
            [&_>_div]:items-center [&_>_div]:gap-[10px] [&_>_div]:text-[#a0b18e] [&_>_div_>_span]:text-[10px]
            [&_>_div_>_span]:text-[#6c815d] [&_>_strong]:block [&_>_strong]:text-[28px]
            [&_>_strong]:tracking-[-0.8px] [&_>_strong]:font-semibold [&_>_strong]:text-[#476440]
            [&_>_strong]:leading-[1.3] [&_>_strong]:[margin:11px_0_7px] [&_>_strong]:[overflow-wrap:anywhere]
            [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-between [&_>_small]:text-[8px]
            [&_>_small]:text-[#adb79f] [&_>_small]:gap-[6px] vendor-mobile:p-[14px]
            vendor-mobile:[&_>_strong]:text-[24px] vendor-mobile:[&_>_small]:text-[7px]
            vendor-mobile:[&_>_div_>_span]:text-[9px]
          " key={key}>
            <div>
              <span>{label}</span>
              <Wallet size={17} />
            </div>
            <strong>{money(revenue[key])}</strong>
            <small>Recorded payout ledger · INR</small>
          </div>
        ))}
      </div>
      <p className="
        [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
        [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
        rounded-[6px] text-[10px]! leading-[1.8]
      ">
        Customer collections: {money(revenue.collected)}. Successful payments
        can differ from recognized payout earnings.
      </p>
      {finance.error?<ErrorView error={finance.error} retry={finance.retry}/>:!finance.data?<Loading/>:<div className="
        grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[13px]
        vendor-wide:grid-cols-[repeat(5,_minmax(0,_1fr))]
        vendor-wide:[&_>_:nth-last-child(-n_+_4)]:col-[auto] vendor-mobile:gap-[10px]
        vendor-phone:grid-cols-[repeat(2,_minmax(0,_1fr))] vendor-phone:[&_>_:last-child]:col-[1/-1]
      ">{[['captured','Verified collections'],['refunded','Refund adjustments'],['available','Approved available earnings'],['held','Earnings on hold'],['processing','Payouts in processing'],['failed','Failed payouts']].map(([key,label])=><article className="
        [background:white] [border-top:1px_solid_#e4eadf] [border-right:1px_solid_#e4eadf]
        [border-bottom:1px_solid_#e4eadf] [border-left:1px_solid_#e4eadf] rounded-[9px] [padding:17px_20px]
        min-w-[0] [transition:transform_0.2s,_border-color_0.2s] [&:hover]:[border-color:#adc29b]
        [&:hover]:[transform:translateY(-2px)] [&_>_div]:flex [&_>_div]:justify-between
        [&_>_div]:items-center [&_>_div]:gap-[10px] [&_>_div]:text-[#a0b18e] [&_>_div_>_span]:text-[10px]
        [&_>_div_>_span]:text-[#6c815d] [&_>_strong]:block [&_>_strong]:text-[28px]
        [&_>_strong]:tracking-[-0.8px] [&_>_strong]:font-semibold [&_>_strong]:text-[#476440]
        [&_>_strong]:leading-[1.3] [&_>_strong]:[margin:11px_0_7px] [&_>_strong]:[overflow-wrap:anywhere]
        [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-between [&_>_small]:text-[8px]
        [&_>_small]:text-[#adb79f] [&_>_small]:gap-[6px] vendor-mobile:p-[14px]
        vendor-mobile:[&_>_strong]:text-[24px] vendor-mobile:[&_>_small]:text-[7px]
        vendor-mobile:[&_>_div_>_span]:text-[9px]
      " key={key}><span>{label}</span><strong>{key==='failed'?finance.data[key]:money(finance.data[key])}</strong></article>)}</div>}
      <VendorResourcesPage section="revenue" title="Earnings ledger" embedded />
    </>
  );
}
