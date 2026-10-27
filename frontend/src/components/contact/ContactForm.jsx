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
      <div className="mp-form-field">
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
          <span className="mp-field-error" id={`error-${name}`}>
            {errors[name]}
          </span>
        )}
      </div>
    );
  }
  return (
    <section className="mp-contact-form-section">
      <span className="mn-kicker">LET’S TALK ABOUT YOUR PLANS</span>
      <h2>Send a little hello.</h2>
      <p>
        Tell us what’s on your mind. Please keep passwords, payment details and
        identity documents out of your message.
      </p>
      {result ? (
        <div
          className="mp-contact-success"
          ref={statusRef}
          tabIndex={-1}
          role="status"
        >
          <CheckCircle2 size={30} strokeWidth={1.3} />
          <h3>Message received.</h3>
          <p>{result.message}</p>
          <strong>Reference: {result.reference}</strong>
          <button
            className="mn-button mn-button-outline"
            onClick={() => setResult(null)}
          >
            Send another message <ArrowUpRight size={14} />
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={send} noValidate>
          <div className="mp-form-grid">
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
            <div className="mp-form-field">
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
                <span className="mp-field-error" id="error-category">
                  {errors.category}
                </span>
              )}
            </div>
            <div className="mp-form-field mp-form-wide">
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
                <span className="mp-field-error" id="error-message">
                  {errors.message}
                </span>
              )}
            </div>
          </div>
          <label className="mp-consent">
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
            <span id="error-consent" className="mp-field-error">
              {errors.consent}
            </span>
          )}
          {failure && (
            <div
              role="alert"
              tabIndex={-1}
              ref={statusRef}
              className="mp-form-failure"
            >
              {failure}
            </div>
          )}
          <button className="mn-button" type="submit" disabled={loading}>
            {loading ? "Sending your message…" : "Send message"}{" "}
            <Send size={15} />
          </button>
          <span className="mp-required-note">* Required fields</span>
        </form>
      )}
    </section>
  );
}
