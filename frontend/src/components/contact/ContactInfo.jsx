import { Mail, Phone, MapPin, Clock3, ArrowUpRight } from "lucide-react";
export default function ContactInfo({ company }) {
  const placeholder = company.contactIsPlaceholder;
  return (
    <>
      <div className="mp-contact-info grid grid-cols-[repeat(4,_1fr)] gap-[15px] mb-[55px] [&.mp-contact-info_article]:py-[23px] [&.mp-contact-info_article]:px-[21px] [&.mp-contact-info_article]:bg-[#fffaf5] [&.mp-contact-info_article]:border [&.mp-contact-info_article]:border-[#e6d9ce] [&.mp-contact-info_article]:rounded-[5px] [&.mp-contact-info_article]:min-w-0 [&.mp-contact-info_svg]:text-[#9e6d68] [&.mp-contact-info_h3]:font-[inherit] [&.mp-contact-info_h3]:font-medium [&.mp-contact-info_h3]:text-[12px] [&.mp-contact-info_h3]:mt-[13px] [&.mp-contact-info_h3]:mx-0 [&.mp-contact-info_h3]:mb-[7px] [&.mp-contact-info_p]:text-[11px] [&.mp-contact-info_p]:leading-[1.8] [&.mp-contact-info_p]:wrap-anywhere [&.mp-contact-info_a]:text-[11px] [&.mp-contact-info_a]:leading-[1.8] [&.mp-contact-info_a]:wrap-anywhere [&.mp-contact-info_a]:inline-flex [&.mp-contact-info_a]:items-center [&.mp-contact-info_a]:gap-[4px] [&.mp-contact-info_a]:text-[#8c414e] [&.mp-contact-info_small]:block [&.mp-contact-info_small]:text-[8px] [&.mp-contact-info_small]:mt-[10px] [&.mp-contact-info_small]:text-[#a78a79] [@media(width<=1100px)]:[&.mp-contact-info_article]:py-[20px] [@media(width<=1100px)]:[&.mp-contact-info_article]:px-[14px] [@media(width<=767px)]:grid-cols-[1fr_1fr] [@media(width<=767px)]:gap-[10px] [@media(width<=767px)]:mb-[35px] [@media(width<=767px)]:[&.mp-contact-info_article]:py-[20px] [@media(width<=767px)]:[&.mp-contact-info_article]:px-[14px] [@media(width<=767px)]:[&.mp-contact-info_p]:text-[11px] [@media(width<=767px)]:[&.mp-contact-info_a]:text-[11px] [@media(width<=767px)]:[&.mp-contact-info_small]:text-[8px] [@media(width<=360px)]:grid-cols-[1fr]">
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
