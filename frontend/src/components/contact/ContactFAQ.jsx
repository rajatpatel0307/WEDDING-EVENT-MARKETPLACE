import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
export default function ContactFAQ() {
  return (
    <section className="mp-section max-w-[1320px] my-0 mx-auto py-[64px] px-[5%] [@media(width<=1100px)]:py-[48px] [@media(width<=1100px)]:px-[5%] [@media(width<=767px)]:py-[38px] [@media(width<=767px)]:px-[6%] mp-faq border-t border-t-[#e4d7cb] grid grid-cols-[1fr_1.3fr] gap-[70px] [&.mp-faq_h2]:max-w-[300px] [&.mp-faq_details]:border-b [&.mp-faq_details]:border-b-[#dfcec2] [&.mp-faq_summary]:flex [&.mp-faq_summary]:items-center [&.mp-faq_summary]:justify-between [&.mp-faq_summary]:gap-[20px] [&.mp-faq_summary]:list-none [&.mp-faq_summary]:cursor-pointer [&.mp-faq_summary]:py-[19px] [&.mp-faq_summary]:px-0 [&.mp-faq_summary]:text-[12px] [&.mp-faq_summary]:text-[#6b5153] [&.mp-faq_summary::-webkit-details-marker]:hidden [&.mp-faq_details[open]_summary_svg]:transform-[rotate(45deg)] [&.mp-faq_details_>_div]:text-[12px] [&.mp-faq_details_>_div]:leading-[1.9] [&.mp-faq_details_>_div]:text-[#907a70] [&.mp-faq_details_>_div]:pt-0 [&.mp-faq_details_>_div]:pr-[25px] [&.mp-faq_details_>_div]:pb-[20px] [&.mp-faq_details_>_div]:pl-0 [&.mp-faq_a]:text-[#8c414e] [&.mp-faq_a]:underline [@media(width<=767px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-0 [@media(width<=767px)]:[&.mp-faq_h2]:max-w-none [@media(width<=767px)]:[&.mp-faq_summary]:text-[12px] [@media(width<=767px)]:[&.mp-faq_summary]:min-h-[56px] [@media(width<=767px)]:[&.mp-faq_details_>_div]:text-[12px]">
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
