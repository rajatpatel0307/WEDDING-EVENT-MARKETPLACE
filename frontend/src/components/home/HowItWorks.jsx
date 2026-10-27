import { Search, Layers, CalendarCheck, Heart } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
export default function HowItWorks() {
  return (
    <section className="mp-how">
      <div className="mp-section">
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
              <div className="mp-step-top">
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
