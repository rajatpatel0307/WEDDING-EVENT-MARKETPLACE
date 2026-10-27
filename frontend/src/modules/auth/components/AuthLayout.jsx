import { Heart, ShieldCheck } from "lucide-react";
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="auth-shell">
      <main id="main-content" className={`auth-main ${wide ? "wide" : ""}`}>
        <aside className="brand-story">
          <span className="eyebrow">
            <span /> YOUR FOREVER STARTS HERE
          </span>
          <div className="story-copy">
            <span className="ornament">✧</span>
            <h1>
              A beautiful beginning.
              <br />
              <em>A lifetime of memories.</em>
            </h1>
            <p>
              Find the people, places and little details
              <br className="desktop-break" /> that make your celebration feel
              like you.
            </p>
            <div className="story-divider" />
            <div className="story-note">
              <Heart size={22} strokeWidth={1.3} />
              <span>
                Thoughtfully planned.
                <br />
                <strong>Wholeheartedly celebrated.</strong>
              </span>
            </div>
          </div>
          <div className="story-bottom">
            <div>
              <ShieldCheck size={17} /> A trusted space for your next chapter
            </div>
            <span>Made for moments that matter.</span>
          </div>
          <div className="story-rings" aria-hidden="true" />
        </aside>
        <section className="form-panel">
          <div className={`form-content ${wide ? "form-wide" : ""}`}>
            {children}
          </div>
          <div className="form-trust">
            <ShieldCheck size={14} /> Your information is private and protected
          </div>
        </section>
      </main>
    </div>
  );
}
