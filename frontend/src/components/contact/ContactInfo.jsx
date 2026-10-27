import { Mail, Phone, MapPin, Clock3, ArrowUpRight } from "lucide-react";
export default function ContactInfo({ company }) {
  const placeholder = company.contactIsPlaceholder;
  return (
    <>
      <div className="mp-contact-info">
        {[
          [
            "Email us",
            company.email,
            Mail,
            !placeholder && company.email ? `mailto:${company.email}` : null,
          ],
          [
            "Give us a call",
            company.phone,
            Phone,
            !placeholder && company.phone
              ? `tel:${company.phone.replace(/[^+\d]/g, "")}`
              : null,
          ],
          ["Our office", company.address, MapPin, company.mapUrl],
          ["Support hours", company.supportHours, Clock3, null],
        ].map(([name, value, Icon, href]) => (
          <article key={name}>
            <Icon size={22} strokeWidth={1.3} />
            <h3>{name}</h3>
            {href ? (
              <a
                href={href}
                target={name === "Our office" ? "_blank" : undefined}
                rel={name === "Our office" ? "noreferrer" : undefined}
              >
                {value} <ArrowUpRight size={13} />
              </a>
            ) : (
              <p>{value || "To be updated"}</p>
            )}
            {placeholder && <small>Placeholder · to be confirmed</small>}
          </article>
        ))}
      </div>
    </>
  );
}
