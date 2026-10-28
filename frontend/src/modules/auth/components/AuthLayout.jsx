import { Heart, ShieldCheck } from "lucide-react";
export default function AuthLayout({ children, wide = false }) {
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
