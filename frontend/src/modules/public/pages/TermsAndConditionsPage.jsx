import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileText, ChevronDown } from "lucide-react";
import { TERMS } from "../../../services/public";
import { publicSite } from "../../../config/site";
import PageMeta from "../../../components/common/PageMeta";
export default function TermsAndConditionsPage() {
  const { data } = useQuery(TERMS, {
      errorPolicy: "all",
      fetchPolicy: "cache-first",
    }),
    terms = data?.publicCompany?.terms || publicSite.terms;
  const [active, setActive] = useState(terms.sections[0]?.id || "");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries.find((e) => e.isIntersecting);
        if (first) setActive(first.target.id.replace("terms-", ""));
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    document
      .querySelectorAll(".mp-terms-article section")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [terms]);
  function go(id) {
    setActive(id);
    document
      .getElementById(`terms-${id}`)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }
  return (
    <main id="main-content" className="mp-page mp-terms-page">
      <PageMeta
        title="Terms & Conditions"
        description="Read the MarryNest marketplace terms, including accounts, vendor verification, bookings, payments and privacy."
      />
      <header className="mp-terms-header">
        <span className="mn-kicker">
          <FileText size={15} /> THE DETAILS THAT MATTER
        </span>
        <h1>Terms & Conditions</h1>
        <p>
          Last updated: <strong>{terms.lastUpdated || "To Be Updated"}</strong>
        </p>
        <p>
          These Terms & Conditions govern your use of the Wedding Marketplace
          platform and services once reviewed, approved and published by the
          operator.
        </p>
        {!terms.published && (
          <div className="mp-legal-notice" role="note">
            <strong>Draft content — awaiting legal review</strong>
            <p>
              This is a professional placeholder structure. Company information,
              commercial policies and legal wording must be finalized by the
              operator and a qualified legal professional before production use.
              It does not establish binding business policies.
            </p>
          </div>
        )}
      </header>
      <div className="mp-terms-layout">
        <aside className="mp-terms-toc">
          <h2>On this page</h2>
          <nav aria-label="Terms table of contents">
            {terms.sections.map((section, i) => (
              <a
                key={section.id}
                href={`#terms-${section.id}`}
                aria-current={active === section.id ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(section.id);
                }}
              >
                {String(i + 1).padStart(2, "0")}
                <span>{section.title}</span>
              </a>
            ))}
          </nav>
        </aside>
        <div className="mp-terms-mobile-toc">
          <label htmlFor="terms-section">Jump to a section</label>
          <div>
            <select
              id="terms-section"
              value={active}
              onChange={(e) => go(e.target.value)}
            >
              {terms.sections.map((section, i) => (
                <option key={section.id} value={section.id}>
                  {i + 1}. {section.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>
        <article className="mp-terms-article">
          {terms.sections.map((section, i) => (
            <section key={section.id} id={`terms-${section.id}`} tabIndex={-1}>
              <h2>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, n) => (
                <p key={n}>{paragraph}</p>
              ))}
              {section.id === "privacy" && (
                <Link className="mn-text-link" to="/privacy-policy">
                  Read the Privacy Policy <ArrowUpRight size={15} />
                </Link>
              )}
              {section.id === "contact" && (
                <Link className="mn-text-link" to="/contact">
                  Contact information and inquiry form{" "}
                  <ArrowUpRight size={15} />
                </Link>
              )}
            </section>
          ))}
          <div className="mp-terms-end">
            <FileText size={20} />
            <p>
              Questions about these terms?{" "}
              <Link to="/contact">
                Contact our team <ArrowUpRight size={13} />
              </Link>
            </p>
            <a href="#main-content">Back to top ↑</a>
          </div>
        </article>
      </div>
    </main>
  );
}
