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
    <div className="mn-newsletter flex justify-between gap-[40px] items-start mt-[38px] py-[28px] px-0 border-t border-t-[#514149] border-b border-b-[#514149] [&_h3]:font-[Georgia,serif] [&_h3]:font-normal [&_h3]:text-[21px] [&_h3]:mt-0 [&_h3]:mx-0 [&_h3]:mb-[4px] [&_p]:text-[10px] [&_p]:text-[#baaaa9] [&_form]:w-[44%] [&_form]:max-w-[440px] [&_input]:border-0 [&_input]:bg-transparent [&_input]:min-w-0 [&_input]:flex-1 [&_input]:py-[9px] [&_input]:px-[11px] [&_input]:text-[11px] [&_input]:text-white [&_input::placeholder]:text-[#c2adad] [&_button]:flex [&_button]:items-center [&_button]:gap-[18px] [&_button]:border-0 [&_button]:rounded-[3px] [&_button]:bg-[#e7c7bb] [&_button]:text-[#483136] [&_button]:py-[8px] [&_button]:px-[15px] [&_button]:text-[11px] [&_small]:text-[8px] [&_small]:text-[#ab9797] [&_small]:mt-[7px] [&_small]:block [&_small_a]:underline [&_form_>_p]:mt-[10px] [&_.mn-newsletter-error]:text-[#ffc1ba] max-[768px]:mt-[8px] max-[768px]:py-[28px] max-[768px]:px-0 max-[768px]:flex-col max-[768px]:gap-[22px] max-[768px]:border-t-0 max-[768px]:[&_h3]:text-[21px] max-[768px]:[&_form]:w-full max-[768px]:[&_form]:max-w-none max-[768px]:[&_small]:text-[8px]">
      <div className="mn-newsletter-title flex items-center gap-[16px]">
        <span className="mn-mail-icon w-[44px] h-[44px] rounded-full border border-[#765657] grid place-items-center text-[#d2a59a]">
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
        <div className="mn-newsletter-field flex border border-[#766064] rounded-[5px] p-[4px] bg-[#3a2e33] max-[768px]:[&_input]:py-[9px] max-[768px]:[&_input]:px-[7px]">
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
