import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
export default function ContactFAQ() {
  return (
    <section className="mp-section mp-faq">
      <SectionHeader
        eyebrow="A FEW THINGS YOU MIGHT BE WONDERING"
        title="Good questions. Thoughtful answers."
      />
      <div>
        {[
          [
            "How do I book a vendor?",
            <>
              Start by exploring a vendor’s profile and the services they offer.
              Booking tools are being prepared; a listing or contact inquiry
              does not confirm a booking.{" "}
              <Link to="/vendors">Explore vendors</Link>.
            </>,
          ],
          [
            "How can I become a vendor?",
            <>
              Create a vendor account, verify your email, and submit your
              business details and supporting documents. Dashboard access
              follows administrative approval.{" "}
              <Link to="/auth/signup?role=vendor">Start your application</Link>.
            </>,
          ],
          [
            "How can I cancel a booking?",
            <>
              Check the conditions you agreed with your vendor and keep a record
              of your request. Our marketplace cancellation and refund policies
              have not yet been finalized. Use the contact form for questions
              about your situation.
            </>,
          ],
          [
            "How do payments work?",
            <>
              Online checkout is not currently live. Before any future payment,
              review the quoted total, payment schedule and published
              cancellation and refund terms. Never send payment passwords or
              one-time codes through this form.
            </>,
          ],
          [
            "How can I contact a vendor?",
            <>
              Explore their profile to understand their work. Vendor messaging
              is being prepared. You can send our team an inquiry if you need
              help finding the right information.
            </>,
          ],
          [
            "What happens after a booking request?",
            <>
              Once booking requests are enabled, a request will need the
              vendor’s acceptance and confirmation of the agreed service
              details. Until that workflow launches, inquiries remain support
              messages, not booking confirmations.
            </>,
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <Plus size={17} />
            </summary>
            <div>{answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
