import { useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Send } from "lucide-react";
import { CONTACT } from "../../services/public";
export const contactCategories = [
  ["GENERAL", "General Inquiry"],
  ["BOOKING", "Booking Support"],
  ["VENDOR", "Vendor Support"],
  ["PAYMENT", "Payment Issue"],
  ["CANCELLATION", "Cancellation"],
  ["TECHNICAL", "Technical Issue"],
  ["PARTNERSHIP", "Partnership"],
  ["OTHER", "Other"],
];
const defaults = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  category: "GENERAL",
  message: "",
  consent: false,
};
export function validateContact(values) {
  const errors = {};
  for (const key of ["firstName", "lastName"])
    if (!values[key]?.trim() || values[key].trim().length > 100)
      errors[key] = "Enter a name between 1 and 100 characters.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
    values.email.trim().length > 320
  )
    errors.email = "Enter a valid email address.";
  if (values.phone.trim() && !/^\+?[1-9]\d{7,14}$/.test(values.phone.trim()))
    errors.phone = "Use 8–15 digits with an optional + country code.";
  if (values.subject.trim().length < 3 || values.subject.trim().length > 200)
    errors.subject = "Use between 3 and 200 characters.";
  if (!contactCategories.some(([value]) => value === values.category))
    errors.category = "Choose an inquiry category.";
  if (values.message.trim().length < 20 || values.message.trim().length > 5000)
    errors.message = "Write between 20 and 5,000 characters.";
  if (!values.consent)
    errors.consent = "Please consent to processing this inquiry.";
  return errors;
}
export default function ContactForm() {
  const [values, setValues] = useState(defaults),
    [errors, setErrors] = useState({}),
    [failure, setFailure] = useState(""),
    [result, setResult] = useState(null);
  const [submit, { loading }] = useMutation(CONTACT);
  const formRef = useRef(null),
    statusRef = useRef(null),
    inFlight = useRef(false);
  function change(e) {
    const { name, value, checked, type } = e.target;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
    setErrors((v) => ({ ...v, [name]: undefined }));
  }
  async function send(e) {
    e.preventDefault();
    if (inFlight.current) return;
    const next = validateContact(values);
    setErrors(next);
    setFailure("");
    if (Object.keys(next).length) {
      formRef.current?.elements.namedItem(Object.keys(next)[0])?.focus();
      return;
    }
    inFlight.current = true;
    try {
      const { data } = await submit({ variables: { input: values } });
      if (!data?.submitContactMessage.success) throw Error("Unable to send");
      setResult(data.submitContactMessage);
      setValues(defaults);
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch (error) {
      const fieldErrors = error.errors?.find((e) => e.extensions?.fields)
        ?.extensions.fields;
      if (fieldErrors) setErrors(fieldErrors);
      setFailure(
        error.errors?.some((e) => e.extensions?.code === "RATE_LIMITED")
          ? "You’ve sent several inquiries. Please try again later."
          : "We couldn’t save your message. Your entries are still here; please try again.",
      );
      requestAnimationFrame(() => statusRef.current?.focus());
    } finally {
      inFlight.current = false;
    }
  }
  function field(
    name,
    label,
    {
      type = "text",
      maxLength = 100,
      required = true,
      autoComplete = name,
      ...props
    } = {},
  ) {
    return (
      <div className="mp-form-field flex flex-col gap-[8px] min-w-0 [&.mp-form-field_label]:text-[11px] [&.mp-form-field_label]:font-medium [&.mp-form-field_label_>_span]:text-[#ae6d6d] [&.mp-form-field_input]:border [&.mp-form-field_input]:border-[#ddcfc6] [&.mp-form-field_input]:bg-[#fffdfa] [&.mp-form-field_input]:py-[12px] [&.mp-form-field_input]:px-[13px] [&.mp-form-field_input]:rounded-[4px] [&.mp-form-field_input]:w-full [&.mp-form-field_input]:min-w-0 [&.mp-form-field_input]:text-[12px] [&.mp-form-field_input]:text-[#5d4c4f] [&.mp-form-field_input]:min-h-[45px] [&.mp-form-field_select]:border [&.mp-form-field_select]:border-[#ddcfc6] [&.mp-form-field_select]:bg-[#fffdfa] [&.mp-form-field_select]:py-[12px] [&.mp-form-field_select]:px-[13px] [&.mp-form-field_select]:rounded-[4px] [&.mp-form-field_select]:w-full [&.mp-form-field_select]:min-w-0 [&.mp-form-field_select]:text-[12px] [&.mp-form-field_select]:text-[#5d4c4f] [&.mp-form-field_select]:min-h-[45px] [&.mp-form-field_textarea]:border [&.mp-form-field_textarea]:border-[#ddcfc6] [&.mp-form-field_textarea]:bg-[#fffdfa] [&.mp-form-field_textarea]:py-[12px] [&.mp-form-field_textarea]:px-[13px] [&.mp-form-field_textarea]:rounded-[4px] [&.mp-form-field_textarea]:w-full [&.mp-form-field_textarea]:min-w-0 [&.mp-form-field_textarea]:text-[12px] [&.mp-form-field_textarea]:text-[#5d4c4f] [&.mp-form-field_textarea]:min-h-[160px] [&.mp-form-field_textarea]:resize-y [&.mp-form-field_input::placeholder]:text-[#aa9790] [&.mp-form-field_input::placeholder]:text-[11px] [&.mp-form-field_textarea::placeholder]:text-[#aa9790] [&.mp-form-field_textarea::placeholder]:text-[11px] [&.mp-form-field_input[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_input[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_select[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_select[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_textarea[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_textarea[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_>_small]:flex [&.mp-form-field_>_small]:justify-between [&.mp-form-field_>_small]:gap-[10px] [&.mp-form-field_>_small]:text-[9px] [&.mp-form-field_>_small]:text-[#a18a7e] [@media(width<=767px)]:gap-[7px] [@media(width<=767px)]:[&.mp-form-field_label]:text-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_input]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_select]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_select]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_select]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_textarea]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_textarea]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_textarea]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_input::placeholder]:text-[10px] [@media(width<=767px)]:[&.mp-form-field_>_small]:text-[8px]">
        <label htmlFor={`contact-${name}`}>
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
        <input
          id={`contact-${name}`}
          name={name}
          value={values[name]}
          onChange={change}
          type={type}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `error-${name}` : undefined}
          {...props}
        />
        {errors[name] && (
          <span className="mp-field-error text-[10px] text-[#a13745] block" id={`error-${name}`}>
            {errors[name]}
          </span>
        )}
      </div>
    );
  }
  return (
    <section className="mp-contact-form-section [&.mp-contact-form-section_h2]:mt-[15px] [&.mp-contact-form-section_h2]:mx-0 [&.mp-contact-form-section_h2]:mb-[12px] [&.mp-contact-form-section_>_p]:text-[11px] [&.mp-contact-form-section_>_p]:max-w-[510px] [&.mp-contact-form-section_form]:mt-[27px] [@media(width<=767px)]:[&.mp-contact-form-section_h2]:text-[33px]">
      <span className="mn-kicker text-[9px] font-semibold tracking-[2px] text-[#9a6964] inline-flex items-center gap-[9px] max-[768px]:text-[8px] max-[768px]:tracking-[1.5px]">LET’S TALK ABOUT YOUR PLANS</span>
      <h2>Send a little hello.</h2>
      <p>
        Tell us what’s on your mind. Please keep passwords, payment details and
        identity documents out of your message.
      </p>
      {result ? (
        <div
          className="mp-contact-success flex flex-col items-start gap-[20px] bg-[#f0f1e5] p-[30px] border border-[#c9c9ad] rounded-[4px] mt-[25px] text-[#7e835d] [&.mp-contact-success_h3]:text-[27px] [&.mp-contact-success_h3]:m-0 [&.mp-contact-success_strong]:text-[10px] [&.mp-contact-success_strong]:font-medium [&.mp-contact-success_strong]:wrap-anywhere [&.mp-contact-success_p]:text-[12px]"
          ref={statusRef}
          tabIndex={-1}
          role="status"
        >
          <CheckCircle2 size={30} strokeWidth={1.3} />
          <h3>Message received.</h3>
          <p>{result.message}</p>
          <strong>Reference: {result.reference}</strong>
          <button
            className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)] mn-button-outline [&.mn-button-outline]:text-[#81424c]! [&.mn-button-outline]:bg-transparent [&.mn-button-outline]:border-[#c4a5a2] [&.mn-button-outline:hover]:bg-[#e8d9d3]"
            onClick={() => setResult(null)}
          >
            Send another message <ArrowUpRight size={14} />
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={send} noValidate>
          <div className="mp-form-grid grid grid-cols-[1fr_1fr] gap-[20px] [@media(width<=767px)]:gap-y-[17px] [@media(width<=767px)]:gap-x-[12px] [@media(width<=360px)]:grid-cols-[1fr]">
            {field("firstName", "First name", { autoComplete: "given-name" })}
            {field("lastName", "Last name", { autoComplete: "family-name" })}
            {field("email", "Email address", {
              type: "email",
              autoComplete: "email",
              maxLength: 320,
            })}
            {field("phone", "Phone (optional)", {
              type: "tel",
              autoComplete: "tel",
              required: false,
              maxLength: 20,
              placeholder: "Include your country code",
            })}
            {field("subject", "Subject", {
              maxLength: 200,
              autoComplete: "off",
            })}
            <div className="mp-form-field flex flex-col gap-[8px] min-w-0 [&.mp-form-field_label]:text-[11px] [&.mp-form-field_label]:font-medium [&.mp-form-field_label_>_span]:text-[#ae6d6d] [&.mp-form-field_input]:border [&.mp-form-field_input]:border-[#ddcfc6] [&.mp-form-field_input]:bg-[#fffdfa] [&.mp-form-field_input]:py-[12px] [&.mp-form-field_input]:px-[13px] [&.mp-form-field_input]:rounded-[4px] [&.mp-form-field_input]:w-full [&.mp-form-field_input]:min-w-0 [&.mp-form-field_input]:text-[12px] [&.mp-form-field_input]:text-[#5d4c4f] [&.mp-form-field_input]:min-h-[45px] [&.mp-form-field_select]:border [&.mp-form-field_select]:border-[#ddcfc6] [&.mp-form-field_select]:bg-[#fffdfa] [&.mp-form-field_select]:py-[12px] [&.mp-form-field_select]:px-[13px] [&.mp-form-field_select]:rounded-[4px] [&.mp-form-field_select]:w-full [&.mp-form-field_select]:min-w-0 [&.mp-form-field_select]:text-[12px] [&.mp-form-field_select]:text-[#5d4c4f] [&.mp-form-field_select]:min-h-[45px] [&.mp-form-field_textarea]:border [&.mp-form-field_textarea]:border-[#ddcfc6] [&.mp-form-field_textarea]:bg-[#fffdfa] [&.mp-form-field_textarea]:py-[12px] [&.mp-form-field_textarea]:px-[13px] [&.mp-form-field_textarea]:rounded-[4px] [&.mp-form-field_textarea]:w-full [&.mp-form-field_textarea]:min-w-0 [&.mp-form-field_textarea]:text-[12px] [&.mp-form-field_textarea]:text-[#5d4c4f] [&.mp-form-field_textarea]:min-h-[160px] [&.mp-form-field_textarea]:resize-y [&.mp-form-field_input::placeholder]:text-[#aa9790] [&.mp-form-field_input::placeholder]:text-[11px] [&.mp-form-field_textarea::placeholder]:text-[#aa9790] [&.mp-form-field_textarea::placeholder]:text-[11px] [&.mp-form-field_input[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_input[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_select[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_select[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_textarea[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_textarea[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_>_small]:flex [&.mp-form-field_>_small]:justify-between [&.mp-form-field_>_small]:gap-[10px] [&.mp-form-field_>_small]:text-[9px] [&.mp-form-field_>_small]:text-[#a18a7e] [@media(width<=767px)]:gap-[7px] [@media(width<=767px)]:[&.mp-form-field_label]:text-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_input]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_select]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_select]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_select]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_textarea]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_textarea]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_textarea]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_input::placeholder]:text-[10px] [@media(width<=767px)]:[&.mp-form-field_>_small]:text-[8px]">
              <label htmlFor="contact-category">
                Category <span aria-hidden="true">*</span>
              </label>
              <select
                id="contact-category"
                name="category"
                value={values.category}
                onChange={change}
                aria-invalid={!!errors.category}
                aria-describedby={
                  errors.category ? "error-category" : undefined
                }
              >
                {contactCategories.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="mp-field-error text-[10px] text-[#a13745] block" id="error-category">
                  {errors.category}
                </span>
              )}
            </div>
            <div className="mp-form-field flex flex-col gap-[8px] min-w-0 [&.mp-form-field_label]:text-[11px] [&.mp-form-field_label]:font-medium [&.mp-form-field_label_>_span]:text-[#ae6d6d] [&.mp-form-field_input]:border [&.mp-form-field_input]:border-[#ddcfc6] [&.mp-form-field_input]:bg-[#fffdfa] [&.mp-form-field_input]:py-[12px] [&.mp-form-field_input]:px-[13px] [&.mp-form-field_input]:rounded-[4px] [&.mp-form-field_input]:w-full [&.mp-form-field_input]:min-w-0 [&.mp-form-field_input]:text-[12px] [&.mp-form-field_input]:text-[#5d4c4f] [&.mp-form-field_input]:min-h-[45px] [&.mp-form-field_select]:border [&.mp-form-field_select]:border-[#ddcfc6] [&.mp-form-field_select]:bg-[#fffdfa] [&.mp-form-field_select]:py-[12px] [&.mp-form-field_select]:px-[13px] [&.mp-form-field_select]:rounded-[4px] [&.mp-form-field_select]:w-full [&.mp-form-field_select]:min-w-0 [&.mp-form-field_select]:text-[12px] [&.mp-form-field_select]:text-[#5d4c4f] [&.mp-form-field_select]:min-h-[45px] [&.mp-form-field_textarea]:border [&.mp-form-field_textarea]:border-[#ddcfc6] [&.mp-form-field_textarea]:bg-[#fffdfa] [&.mp-form-field_textarea]:py-[12px] [&.mp-form-field_textarea]:px-[13px] [&.mp-form-field_textarea]:rounded-[4px] [&.mp-form-field_textarea]:w-full [&.mp-form-field_textarea]:min-w-0 [&.mp-form-field_textarea]:text-[12px] [&.mp-form-field_textarea]:text-[#5d4c4f] [&.mp-form-field_textarea]:min-h-[160px] [&.mp-form-field_textarea]:resize-y [&.mp-form-field_input::placeholder]:text-[#aa9790] [&.mp-form-field_input::placeholder]:text-[11px] [&.mp-form-field_textarea::placeholder]:text-[#aa9790] [&.mp-form-field_textarea::placeholder]:text-[11px] [&.mp-form-field_input[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_input[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_select[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_select[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_textarea[aria-invalid='true']]:border-[#a94350] [&.mp-form-field_textarea[aria-invalid='true']]:bg-[#fff7f6] [&.mp-form-field_>_small]:flex [&.mp-form-field_>_small]:justify-between [&.mp-form-field_>_small]:gap-[10px] [&.mp-form-field_>_small]:text-[9px] [&.mp-form-field_>_small]:text-[#a18a7e] [@media(width<=767px)]:gap-[7px] [@media(width<=767px)]:[&.mp-form-field_label]:text-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_input]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_input]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_select]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_select]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_select]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_textarea]:text-[13px] [@media(width<=767px)]:[&.mp-form-field_textarea]:py-[11px] [@media(width<=767px)]:[&.mp-form-field_textarea]:px-[10px] [@media(width<=767px)]:[&.mp-form-field_input::placeholder]:text-[10px] [@media(width<=767px)]:[&.mp-form-field_>_small]:text-[8px] mp-form-wide col-span-full">
              <label htmlFor="contact-message">
                Your message <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                value={values.message}
                minLength={20}
                maxLength={5000}
                onChange={change}
                required
                aria-invalid={!!errors.message}
                aria-describedby={`message-hint${errors.message ? " error-message" : ""}`}
                placeholder="A few details help us point you in the right direction…"
              />
              <small id="message-hint">
                20–5,000 characters{" "}
                <span>
                  {values.message.length.toLocaleString("en-IN")} / 5,000
                </span>
              </small>
              {errors.message && (
                <span className="mp-field-error text-[10px] text-[#a13745] block" id="error-message">
                  {errors.message}
                </span>
              )}
            </div>
          </div>
          <label className="mp-consent flex items-start gap-[10px] my-[23px] mx-0 text-[10px] leading-[1.8] text-[#8b7871] [&.mp-consent_input]:accent-[#8c414e] [&.mp-consent_input]:mt-[3px] [&.mp-consent_input]:mx-0 [&.mp-consent_input]:mb-0 [&.mp-consent_input]:w-[15px] [&.mp-consent_input]:h-[15px] [&.mp-consent_input]:shrink-0 [&.mp-consent_a]:text-[#8c414e] [&.mp-consent_a]:underline [&.mp-consent_a]:underline-offset-[2px] [@media(width<=767px)]:text-[10px]">
            <input
              name="consent"
              type="checkbox"
              checked={values.consent}
              onChange={change}
              required
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "error-consent" : undefined}
            />
            <span>
              I agree to the processing of my information to respond to this
              inquiry, as described in the{" "}
              <Link to="/privacy-policy">Privacy Policy</Link>.
            </span>
          </label>
          {errors.consent && (
            <span id="error-consent" className="mp-field-error text-[10px] text-[#a13745] block">
              {errors.consent}
            </span>
          )}
          {failure && (
            <div
              role="alert"
              tabIndex={-1}
              ref={statusRef}
              className="mp-form-failure py-[12px] px-[15px] border border-[#d4a29d] bg-[#f9eae4] text-[#9a3f49] my-[20px] mx-0 rounded-[4px] text-[11px]"
            >
              {failure}
            </div>
          )}
          <button className="mn-button bg-[#8c414e] text-white! inline-flex items-center justify-center gap-[19px] border border-[#8c414e] py-[12px] px-[19px] rounded-[5px] text-[12px] font-medium whitespace-nowrap hover:bg-[#74333f] hover:border-[#74333f] hover:transform-[translateY(-1px)]" type="submit" disabled={loading}>
            {loading ? "Sending your message…" : "Send message"}{" "}
            <Send size={15} />
          </button>
          <span className="mp-required-note inline-block text-[9px] text-[#ac8c7e] ml-[15px]">* Required fields</span>
        </form>
      )}
    </section>
  );
}
