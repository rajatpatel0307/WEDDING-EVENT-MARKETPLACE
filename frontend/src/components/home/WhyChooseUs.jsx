import {
  ShieldCheck,
  BadgeIndianRupee,
  CalendarHeart,
  Flower2,
  Star,
  CreditCard,
  NotebookPen,
  Headphones,
} from "lucide-react";
import SectionHeader from "../common/SectionHeader";
export default function WhyChooseUs() {
  return (
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-why grid grid-cols-[1fr_1.45fr] gap-[80px] border-t border-t-[#e6dcd4] [&.mp-why_>_div:first-child_h2]:my-[18px] [&.mp-why_>_div:first-child_h2]:mx-0 [&.mp-why_>_div:first-child_>_p]:max-w-[310px] [&.mp-why_>_div:first-child_>_p]:text-[12px] [@media(width<=1100px)]:gap-[40px] [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[35px] [@media(width<=767px)]:[&.mp-why_>_div:first-child_>_p]:max-w-full">
      <div>
        <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">THOUGHTFUL BY DESIGN</span>
        <h2>
          Everything you need.
          <br />
          <em>A little less stress.</em>
        </h2>
        <p>
          More space for the moments that matter, with the information you need
          to make considered choices.
        </p>
        <span className="mp-handwritten block font-[Georgia,serif] italic text-[#9f7667] mt-[28px] text-[15px] [@media(width<=767px)]:mt-[20px]">Let’s make it a day to remember.</span>
      </div>
      <div className="mp-benefit-grid grid grid-cols-[1fr_1fr] gap-y-[30px] gap-x-[35px] [&.mp-benefit-grid_article_>_svg]:text-[#9e786b] [&.mp-benefit-grid_h3]:font-[inherit] [&.mp-benefit-grid_h3]:text-[12px] [&.mp-benefit-grid_h3]:font-medium [&.mp-benefit-grid_h3]:mt-[10px] [&.mp-benefit-grid_h3]:mx-0 [&.mp-benefit-grid_h3]:mb-[7px] [&.mp-benefit-grid_p]:text-[10px] [&.mp-benefit-grid_p]:leading-[1.8] [@media(width<=767px)]:gap-[25px] [@media(width<=767px)]:[&.mp-benefit-grid_h3]:text-[12px] [@media(width<=767px)]:[&.mp-benefit-grid_p]:text-[11px]">
        {[
          [
            "Verified vendors",
            "Approved businesses, with a review process before dashboard access.",
            ShieldCheck,
          ],
          [
            "Clear pricing",
            "See listed starting prices and ask vendors what’s included.",
            BadgeIndianRupee,
          ],
          [
            "Booking, made clearer",
            "Booking tools are being prepared. Discovery is your first step.",
            CalendarHeart,
          ],
          [
            "Every little detail",
            "Find services across the wedding and event ecosystem.",
            Flower2,
          ],
          [
            "Real experiences",
            "Published, verified reviews from completed bookings.",
            Star,
          ],
          [
            "Payment clarity",
            "Review payment and refund policies before committing; checkout is not live yet.",
            CreditCard,
          ],
          [
            "Plans in one place",
            "Discover your wedding team from one marketplace.",
            NotebookPen,
          ],
          [
            "A helping hand",
            "Send our team an inquiry when you need support.",
            Headphones,
          ],
        ].map(([title, copy, Icon]) => (
          <article key={title}>
            <Icon size={22} strokeWidth={1.3} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
