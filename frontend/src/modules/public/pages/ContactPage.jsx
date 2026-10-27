import { useQuery } from "@apollo/client/react";
import { ArrowUpRight, MapPin, Flower2 } from "lucide-react";
import { COMPANY } from "../../../services/public";
import { publicSite } from "../../../config/site";
import PageMeta from "../../../components/common/PageMeta";
import ContactInfo from "../../../components/contact/ContactInfo";
import ContactForm from "../../../components/contact/ContactForm";
import ContactFAQ from "../../../components/contact/ContactFAQ";
import HomeCTA from "../../../components/home/HomeCTA";
export default function ContactPage() {
  const { data } = useQuery(COMPANY, {
      errorPolicy: "all",
      fetchPolicy: "cache-first",
    }),
    company = data?.publicCompany || publicSite;
  return (
    <main id="main-content" className="mp-page">
      <PageMeta
        title="Contact us"
        description="Questions about wedding services, your account or vendor registration? Get in touch with the MarryNest team."
      />
      <section className="mp-contact-hero">
        <span className="mn-kicker">A HELPING HAND FOR YOUR NEXT CHAPTER</span>
        <h1>
          We’re here <em>to help.</em>
        </h1>
        <p>
          Have a question about vendors, your account or your wedding plans?
          <br />
          Tell us a little about it. We’re listening.
        </p>
        <Flower2 size={120} strokeWidth={0.5} aria-hidden="true" />
      </section>
      <div className="mp-section mp-contact-main">
        <ContactInfo company={company} />
        <div className="mp-contact-grid">
          <ContactForm />
          <aside className="mp-contact-aside">
            <span className="mn-kicker">
              EVERY GOOD PLAN STARTS WITH A CONVERSATION
            </span>
            <h2>
              A little guidance.
              <br />A clearer next step.
            </h2>
            <p>
              Choose the category that best fits your question. For an existing
              account or vendor application, include the relevant reference
              number so we can understand your request.
            </p>
            <div className="mp-map-panel">
              <MapPin size={33} strokeWidth={1} />
              <h3>Find us, when you need us.</h3>
              <p>{company.address}</p>
              {company.contactIsPlaceholder && (
                <small>Placeholder address · location to be confirmed</small>
              )}
              <div>
                {company.mapUrl ? (
                  <>
                    <a
                      className="mn-button mn-button-outline"
                      href={company.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on map <ArrowUpRight size={13} />
                    </a>
                    <a
                      className="mn-text-link"
                      href={company.directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions <ArrowUpRight size={13} />
                    </a>
                  </>
                ) : (
                  <>
                    <button className="mn-button mn-button-outline" disabled>
                      View on map
                    </button>
                    <button className="mn-text-link" disabled>
                      Get directions
                    </button>
                  </>
                )}
              </div>
            </div>
            <span className="mp-contact-privacy">
              Your message is used to handle your inquiry. It won’t be published
              as a review.
            </span>
          </aside>
        </div>
      </div>
      <ContactFAQ />
      <HomeCTA />
    </main>
  );
}
