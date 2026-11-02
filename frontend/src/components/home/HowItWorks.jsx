import { Search, Layers, CalendarCheck, Heart } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
export default function HowItWorks() {
  return (
    <section className="mp-how bg-[#f0e6df] border-t border-t-[#e4d6cd] border-b border-b-[#e4d6cd] [&.mp-how_.mp-section-heading]:justify-center [&.mp-how_.mp-section-heading]:text-center [&.mp-how_.mp-section-heading_p]:mt-[14px] [&.mp-how_.mp-section-heading_p]:mx-auto [&.mp-how_.mp-section-heading_p]:mb-0 [&.mp-how_.mp-section-heading_p]:max-w-[540px] [&.mp-how_ol]:p-0 [&.mp-how_ol]:list-none [&.mp-how_ol]:grid [&.mp-how_ol]:grid-cols-[repeat(4,_1fr)] [&.mp-how_ol]:gap-[45px] [&.mp-how_ol]:mt-[40px] [&.mp-how_ol]:mx-0 [&.mp-how_ol]:mb-0 [&.mp-how_h3]:text-[21px] [&.mp-how_h3]:mt-[18px] [&.mp-how_h3]:mx-0 [&.mp-how_h3]:mb-[10px] [&.mp-how_li_p]:text-[11px] [&.mp-how_li_p]:text-[#8c7470] [&.mp-how_li_p]:leading-[1.85] [@media(width<=767px)]:[&.mp-how_.mp-section-heading]:text-left [@media(width<=767px)]:[&.mp-how_ol]:grid-cols-[1fr_1fr] [@media(width<=767px)]:[&.mp-how_ol]:gap-[25px] [@media(width<=767px)]:[&.mp-how_ol]:mt-[28px] [@media(width<=767px)]:[&.mp-how_h3]:text-[21px] [@media(width<=767px)]:[&.mp-how_li_p]:text-[11px]">
      <div className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%]">
        <SectionHeader
          eyebrow="A LITTLE LESS PLANNING. A LOT MORE JOY."
          title="From ‘where do we start?’ to ‘I do’."
          description="Four thoughtful steps towards your celebration. Booking tools will be available as the marketplace launches."
        />
        <ol>
          {[
            [
              "Discover",
              "Find venues and wedding professionals that feel right for you.",
              Search,
            ],
            [
              "Compare",
              "Look through services, prices, reviews and packages.",
              Layers,
            ],
            [
              "Book",
              "When bookings open, send a request and confirm the details with your vendor.",
              CalendarCheck,
            ],
            [
              "Celebrate",
              "Bring your people together. Make memories that stay.",
              Heart,
            ],
          ].map(([title, copy, Icon], i) => (
            <li key={title}>
              <div className="mp-step-top flex justify-between items-center text-[#8c5d5f] border-t border-t-[#cdb6ab] pt-[18px] [&.mp-step-top_>_span]:font-[Georgia,serif] [&.mp-step-top_>_span]:text-[31px] [&.mp-step-top_>_span]:text-[#bb9682] [@media(width<=767px)]:[&.mp-step-top_>_span]:text-[28px]">
                <span>0{i + 1}</span>
                <Icon size={23} strokeWidth={1.3} />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
