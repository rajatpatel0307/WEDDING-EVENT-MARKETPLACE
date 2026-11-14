import { Heart, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children, wide = false, centered = false, compact = false }) {
  if (centered) {
    return (
      <div
        className={`auth-shell relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12 ${compact ? "auth-compact [&.auth-compact]:py-6 max-[480.001px]:[&.auth-compact]:py-4 [&_.auth-main]:max-w-[520px] [&_.auth-main]:px-9 [&_.auth-main]:py-6 [&_.auth-main]:text-[#30262a] max-[480.001px]:[&_.auth-main]:px-5 max-[480.001px]:[&_.auth-main]:py-[22px] [&_.form-content_h2]:text-[30px] max-[480.001px]:[&_.form-content_h2]:text-[28px] [&_.form-eyebrow]:mb-[6px] [&_.form-intro]:mt-2 [&_.form-intro]:mr-0 [&_.form-intro]:mb-4 [&_.form-intro]:ml-0 [&_.role-picker]:mb-4 [&_.role-picker_button]:px-[10px] [&_.role-picker_button]:py-2 [&_.field]:mb-3 [&_.field>span]:mb-1 [&_.field_input]:min-h-[38px] [&_.field_input]:px-[10px] [&_.field_input]:py-[7px] [&_.password-hint]:mt-[-3px] [&_.password-hint]:mr-0 [&_.password-hint]:mb-3 [&_.password-hint]:ml-0 [&_.agreements]:mt-2 [&_.agreements]:mr-0 [&_.agreements]:mb-[14px] [&_.agreements]:ml-0 [&_.agreements]:gap-[6px] [&_.step-actions]:mt-3 [&_.primary-button]:min-h-10 [&_.primary-button]:py-2 [&_.signup-prompt]:mt-[14px] [&_.form-trust]:mt-4 [&_.auth-main_:is(.form-intro,.session-note,.form-trust,.or-divider,.password-hint,.agreements,.signup-prompt,.field,.field_small,.role-picker_small,.vendor-invite_p,.resend-line,.otp-fieldset_legend)]:text-[#403238] [&_.auth-main_.form-eyebrow]:text-[#682b39] [&_.auth-main_.text-link]:text-[#682b39] [&_.auth-main_.back-link]:text-[#682b39] [&_.auth-main_.resend-line_button]:text-[#682b39] [&_.auth-main_.signup-prompt_a]:text-[#682b39] [&_.auth-main_.agreements_a]:text-[#682b39] [&_.auth-main_.vendor-invite>a]:text-[#682b39] [&_.auth-main_.field_input::placeholder]:text-[#74646a] [&_.auth-main_.field_input::placeholder]:opacity-100 [&_.auth-main_.password-toggle]:text-[#59424b] [&_.auth-main_.role-picker_button]:text-[#59424b] [&_.auth-main_.role-picker_button.selected]:text-[#682b39] [&_.form-icon]:mb-4 [&_.otp-fieldset]:my-4 [&_.otp-inputs_input]:h-11 [&_.otp-inputs_input]:text-[20px] [&_.resend-line]:mt-4 [&_.back-link]:mt-4" : ""}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 bg-[linear-gradient(rgba(45,35,26,0.18),rgba(45,35,26,0.28)),url('/images/wedding-garden-1024.webp')] bg-cover bg-center bg-no-repeat blur-[8px]"

        />
        <main
          id="main-content"
          className="auth-main w-full max-w-[560px] rounded-[20px] border border-white/70 bg-white/50 px-6 py-8 shadow-[0_20px_80px_#24181035] sm:px-12 sm:py-10"
        >
          <section className="form-panel min-w-0">
            <div className="form-content mx-auto w-full max-w-[440px] animate-appear [&_h2]:text-[37px] [&_h2]:leading-[1.2] [&_h2]:text-[#453438] max-[480px]:[&_h2]:text-[32px]">
              {children}
            </div>
            <div className="form-trust mt-7 flex items-center justify-center gap-[6px] text-center text-[9px] text-[#aa9b9f]">
              <ShieldCheck size={14} className="shrink-0" /> Your information is private and protected
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-shell [padding:0_30px] max-[1150.001px]:[padding:0_22px] max-[850.001px]:[padding:0_18px] max-[480.001px]:[padding:0_12px]">
      <main id="main-content" className={`auth-main grid grid-cols-[1fr_1fr] max-w-[1312px] [margin:4px_auto_0] min-h-[704px] bg-white [border:1px_solid_#eee8e4] rounded-[12px] overflow-hidden [box-shadow:0_8px_45px_#56373c05] min-[1500px]:mt-[30px] min-[1500px]:min-h-[740px] max-[1150.001px]:grid-cols-[0.9fr_1.1fr] max-[850.001px]:grid-cols-[1fr] max-[850.001px]:max-w-[580px] max-[850.001px]:min-h-0 ${wide ? "wide [&.wide]:grid-cols-[0.85fr_1.15fr] [&.wide_.brand-story]:[padding:42px_36px] [&.wide_.story-copy_h1]:text-[36px] [&.wide_.story-copy_h1_em]:text-[32px] [&.wide_.form-panel]:[padding:37px_52px] max-[1150.001px]:[&.wide]:grid-cols-[0.9fr_1.1fr] max-[1150.001px]:[&.wide_.brand-story]:[padding:35px_30px] max-[1150.001px]:[&.wide_.story-copy_h1]:text-[33px] max-[1150.001px]:[&.wide_.story-copy_h1_em]:text-[29px] max-[1150.001px]:[&.wide_.form-panel]:[padding:40px_34px] max-[850.001px]:[&.wide]:grid-cols-[1fr] max-[850.001px]:[&.wide]:max-w-[580px] max-[850.001px]:[&.wide_.form-panel]:[padding:42px_50px_28px] max-[480.001px]:[&.wide_.form-panel]:[padding:32px_23px_25px]" : ""}`}>
        <aside className="brand-story relative overflow-hidden [background:linear-gradient(135deg,_#f0e2dd,_#f6ebe3_65%,_#e7d5ce)] [padding:49px_48px_38px] flex flex-col justify-between min-h-[704px] min-[1500px]:min-h-[740px] max-[1150.001px]:[padding:35px_30px] max-[850.001px]:hidden">
          <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">
            <span /> YOUR FOREVER STARTS HERE
          </span>
          <div className="story-copy relative z-[1] pb-[40px] [&_h1]:text-[43px] [&_h1]:leading-[1.26] [&_h1]:[color:#553a3d] [&_h1]:tracking-[-1.6px] [&_h1]:whitespace-nowrap [&_h1_em]:font-normal [&_h1_em]:[color:#96716a] [&_h1_em]:text-[39px] [&_>_p]:text-[13px] [&_>_p]:leading-[1.9] [&_>_p]:mt-[25px] [&_>_p]:[color:#8a7471] max-[1150.001px]:[&_h1]:text-[33px] max-[1150.001px]:[&_h1_em]:text-[29px]">
            <span className="ornament text-[57px] [font-family:Georgia,_serif] [color:#a17169] font-normal block leading-[1] mb-[28px]">✧</span>
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
            <div className="story-divider h-[1px] [background:#b99b8f70] w-[48px] [margin:32px_0_25px]" />
            <div className="story-note flex gap-[13px] [color:#9c706a] text-[11px] leading-[1.9] [&_strong]:font-medium [&_strong]:[color:#715652]">
              <Heart size={22} strokeWidth={1.3} />
              <span>
                Thoughtfully planned.
                <br />
                <strong>Wholeheartedly celebrated.</strong>
              </span>
            </div>
          </div>
          <div className="story-bottom relative z-[1] flex flex-col gap-[8px] text-[10px] [color:#947d76] [&_>_div]:flex [&_>_div]:gap-[8px] [&_>_div]:items-center [&_>_span]:pl-[25px] [&_>_span]:text-[9px] [&_>_span]:[color:#ad9288]">
            <div>
              <ShieldCheck size={17} /> A trusted space for your next chapter
            </div>
            <span>Made for moments that matter.</span>
          </div>
          <div className="story-rings absolute w-[400px] h-[400px] [border:1px_solid_#b98d7930] rounded-full right-[-205px] bottom-[-160px] [&::before]:[content:''] [&::before]:absolute [&::before]:[border:1px_solid_#b98d7925] [&::before]:inset-[25px] [&::before]:rounded-full [&::after]:[content:''] [&::after]:absolute [&::after]:[border:1px_solid_#b98d7925] [&::after]:inset-[50px] [&::after]:rounded-full" aria-hidden="true" />
        </aside>
        <section className="form-panel [padding:51px_68px_30px] flex flex-col justify-center min-w-0 max-[1150.001px]:[padding:40px_34px] max-[850.001px]:[padding:42px_50px_28px] max-[480.001px]:[padding:32px_23px_25px]">
          <div className={`form-content max-w-[400px] w-full m-auto animate-appear [&_h2]:text-[37px] [&_h2]:leading-[1.2] [&_h2]:[color:#453438] max-[850.001px]:max-w-[460px] max-[850.001px]:[&_h2]:text-[34px] max-[480.001px]:[&_h2]:text-[32px] max-[480.001px]:[&_.field_input]:text-[12px] max-[480.001px]:[&_.field_input]:pl-[10px] ${wide ? "form-wide [&.form-wide]:max-w-[490px] [&.form-wide_h2]:text-[33px] max-[850.001px]:[&.form-wide]:max-w-[460px] max-[850.001px]:[&.form-wide_h2]:text-[34px] max-[480.001px]:[&.form-wide_h2]:text-[32px]" : ""}`}>
            {children}
          </div>
          <div className="form-trust flex items-center justify-center gap-[6px] [color:#aa9b9f] text-[9px] mt-[34px]">
            <ShieldCheck size={14} /> Your information is private and protected
          </div>
        </section>
      </main>
    </div>
  );
}
