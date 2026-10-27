import { useState } from "react";
import { gql } from "@apollo/client";
import { ArrowRight, Mail } from "lucide-react";
import { client } from "../../services/apollo";
const SUBSCRIBE = gql`
  mutation SubscribeNewsletter($email: String!) {
    subscribeNewsletter(email: $email) {
      success
      message
    }
  }
`;
export default function Newsletter() {
  const [email, setEmail] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setError(false);
    try {
      const { data } = await client.mutate({
        mutation: SUBSCRIBE,
        variables: { email: email.trim() },
      });
      if (!data.subscribeNewsletter.success)
        throw Error(data.subscribeNewsletter.message);
      setStatus("Subscribed successfully. A little inspiration is on its way.");
      setEmail("");
    } catch {
      setError(true);
      setStatus(
        "We couldn’t save your subscription. Please try again shortly.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mn-newsletter">
      <div className="mn-newsletter-title">
        <span className="mn-mail-icon">
          <Mail size={23} strokeWidth={1.3} />
        </span>
        <div>
          <h3>A little inspiration in your inbox.</h3>
          <p>Wedding ideas, lovely finds and offers worth opening.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <div className="mn-newsletter-field">
          <input
            id="newsletter-email"
            type="email"
            required
            maxLength={320}
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button disabled={busy} type="submit">
            {busy ? "Joining…" : "Join the list"} <ArrowRight size={16} />
          </button>
        </div>
        <small>
          By subscribing, you agree to our{" "}
          <a href="/privacy-policy">Privacy Policy</a>. Unsubscribe anytime.
        </small>
        {status && (
          <p
            className={error ? "mn-newsletter-error" : ""}
            role={error ? "alert" : "status"}
          >
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
