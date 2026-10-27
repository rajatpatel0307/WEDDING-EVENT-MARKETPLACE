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
    <section className="mp-section mp-why">
      <div>
        <span className="mn-kicker">THOUGHTFUL BY DESIGN</span>
        <h2>
          Everything you need.
          <br />
          <em>A little less stress.</em>
        </h2>
        <p>
          More space for the moments that matter, with the information you need
          to make considered choices.
        </p>
        <span className="mp-handwritten">Let’s make it a day to remember.</span>
      </div>
      <div className="mp-benefit-grid">
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
