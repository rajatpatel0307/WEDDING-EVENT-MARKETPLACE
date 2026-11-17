import ChatPage from "../../communication/ChatPage";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarHeart, Heart, MessageCircle, Paperclip, Sparkles } from "lucide-react";

const messageStyles = [
  "min-w-0 [&_.comm-root]:text-[#405044]!",
  // The two-pane conversation workspace.
  "[&_.comm-chat]:h-[min(760px,calc(100dvh-240px))]! [&_.comm-chat]:min-h-[540px]! [&_.comm-chat]:rounded-[24px]! [&_.comm-chat]:border-[#e6e0d5]! [&_.comm-chat]:shadow-[0_12px_40px_#4c422607]!",
  "md:[&_.comm-chat]:grid-cols-[300px_minmax(0,1fr)]! xl:[&_.comm-chat]:grid-cols-[340px_minmax(0,1fr)]! max-sm:[&_.comm-chat]:h-[calc(100dvh-220px)]! max-sm:[&_.comm-chat]:min-h-[440px]!",
  "[&_.comm-conversations]:border-r-[#ece6dc]! [&_.comm-conversations]:bg-white",
  "[&_.comm-conversations>h2]:px-5! [&_.comm-conversations>h2]:pt-6! [&_.comm-conversations>h2]:pb-1! [&_.comm-conversations>h2]:font-serif [&_.comm-conversations>h2]:text-[23px]! [&_.comm-conversations>h2]:font-normal! [&_.comm-conversations>h2]:tracking-[-0.4px] [&_.comm-conversations>h2]:text-[#40513e]",
  "[&_.comm-search]:mx-5! [&_.comm-search]:my-4! [&_.comm-search]:min-h-11 [&_.comm-search]:gap-2.5! [&_.comm-search]:rounded-xl! [&_.comm-search]:border-[#e8e1d5]! [&_.comm-search]:bg-[#fcfaf6] [&_.comm-search]:px-3.5! [&_.comm-search]:text-[#b3a07c]! [&_.comm-search]:transition [&_.comm-search]:focus-within:border-[#c1a878]! [&_.comm-search]:focus-within:ring-4 [&_.comm-search]:focus-within:ring-[#b79c6a]/10",
  "[&_.comm-search_input]:text-[12px]! [&_.comm-search_input]:text-[#58624f] [&_.comm-search_input]:placeholder:text-[#aaa291] [&_.comm-search_input]:outline-none!",
  "[&_.comm-filters]:gap-1.5! [&_.comm-filters]:px-5! [&_.comm-filters]:pt-0! [&_.comm-filters]:pb-4! [&_.comm-filters]:text-[10px]! [&_.comm-filters]:border-b [&_.comm-filters]:border-[#f0eade]",
  "[&_.comm-filters>button]:min-h-9 [&_.comm-filters>button]:rounded-lg! [&_.comm-filters>button]:border-transparent! [&_.comm-filters>button]:bg-transparent! [&_.comm-filters>button]:px-3! [&_.comm-filters>button]:text-[11px]! [&_.comm-filters>button]:text-[#9a907e]! [&_.comm-filters>button]:transition",
  "[&_.comm-filters>button[aria-pressed=true]]:border-[#ddd0b7]! [&_.comm-filters>button[aria-pressed=true]]:bg-[#f5f0e5]! [&_.comm-filters>button[aria-pressed=true]]:text-[#8f764d]! [&_.comm-filters>button:hover]:bg-[#faf7ef]!",
  "[&_.comm-filters>label]:ml-auto [&_.comm-filters>label]:text-[10px] [&_.comm-filters>label]:text-[#9c917d] [&_.comm-filters_input]:size-3 [&_.comm-filters_input]:accent-[#a58b5b]",
  // Conversation rows keep their existing actions and unread counters.
  "[&_.comm-thread-list]:min-h-0 [&_.comm-thread-list]:px-2.5 [&_.comm-thread-list]:py-2 [&_.comm-thread-list]:[scrollbar-width:thin] [&_.comm-thread-list]:[scrollbar-color:#dfd5c2_transparent]",
  "[&_.comm-thread-list>p]:p-5 [&_.comm-thread-list>p]:text-xs [&_.comm-thread-list>p]:text-[#a19680]",
  "[&_.comm-thread]:relative [&_.comm-thread]:my-1 [&_.comm-thread]:gap-3! [&_.comm-thread]:rounded-xl [&_.comm-thread]:border-0! [&_.comm-thread]:p-3.5! [&_.comm-thread]:transition [&_.comm-thread:hover]:bg-[#faf7f0]! [&_.comm-thread.active]:bg-[#f5f0e5]! [&_.comm-thread.active]:shadow-[inset_3px_0_0_#b2996c]",
  "[&_.comm-thread>img]:size-11! [&_.comm-thread>img]:border-2 [&_.comm-thread>img]:border-white [&_.comm-thread>img]:shadow-sm [&_.comm-thread>.comm-avatar]:size-11! [&_.comm-thread>.comm-avatar]:border-2 [&_.comm-thread>.comm-avatar]:border-white [&_.comm-thread>.comm-avatar]:bg-[#f2ecdf]! [&_.comm-thread>.comm-avatar]:font-serif [&_.comm-thread>.comm-avatar]:text-xl! [&_.comm-thread>.comm-avatar]:text-[#a58d63]!",
  "[&_.comm-thread>span:nth-child(2)]:grid [&_.comm-thread>span:nth-child(2)]:grid-cols-[minmax(0,1fr)_auto] [&_.comm-thread>span:nth-child(2)]:gap-x-2 [&_.comm-thread_strong]:col-start-1 [&_.comm-thread_strong]:row-start-1 [&_.comm-thread_strong]:truncate [&_.comm-thread_strong]:text-[12px]! [&_.comm-thread_strong]:font-medium! [&_.comm-thread_strong]:text-[#4c5d46]",
  "[&_.comm-thread_small]:col-span-2 [&_.comm-thread_small]:row-start-2 [&_.comm-thread_small]:my-1.5! [&_.comm-thread_small]:pr-6 [&_.comm-thread_small]:text-[11px]! [&_.comm-thread_small]:text-[#908775]! [&_.comm-thread_time]:col-start-2 [&_.comm-thread_time]:row-start-1 [&_.comm-thread_time]:self-center [&_.comm-thread_time]:text-[8px]! [&_.comm-thread_time]:text-[#b1a48d]!",
  "[&_.comm-thread>em]:absolute [&_.comm-thread>em]:right-3.5 [&_.comm-thread>em]:bottom-5 [&_.comm-thread>em]:flex [&_.comm-thread>em]:min-w-4 [&_.comm-thread>em]:items-center [&_.comm-thread>em]:justify-center [&_.comm-thread>em]:bg-[#9e895f]! [&_.comm-thread>em]:text-[9px]! [&_.comm-thread>em]:text-white!",
  "[&_.comm-pagination]:border-t [&_.comm-pagination]:border-[#eee8dd] [&_.comm-pagination]:bg-[#fffefa] [&_.comm-pagination]:px-5! [&_.comm-pagination]:py-3! [&_.comm-pagination]:text-[10px]! [&_.comm-pagination]:text-[#a59578] [&_.comm-pagination_button]:min-h-8 [&_.comm-pagination_button]:rounded-lg! [&_.comm-pagination_button]:border-[#e8e0d1]! [&_.comm-pagination_button]:bg-white [&_.comm-pagination_button]:text-[10px] [&_.comm-pagination_button]:text-[#8f826b]",
  // Active conversation, message bubbles and composer.
  "[&_.comm-window]:bg-[radial-gradient(#d8cdb533_0.6px,transparent_0.6px)] [&_.comm-window]:bg-size-[18px_18px]",
  "[&_.comm-bubble.mine>p]:text-[#fffaf0]! [&_.comm-bubble.mine_footer]:text-[#c4d1bd]! [&_.comm-bubble.mine_.comm-read]:text-[#d4e4c1]! [&_.comm-bubble.mine_footer>button:hover]:bg-white/10",
  "[&_.comm-bubble.mine_.comm-file]:border-white/15! [&_.comm-bubble.mine_.comm-file]:bg-white/10! [&_.comm-bubble.mine_.comm-file_button]:text-[#f4eddb]!",
  "[&_.comm-chat-header_nav>a]:rounded-full [&_.comm-chat-header_nav>a]:border [&_.comm-chat-header_nav>a]:border-[#e8decb] [&_.comm-chat-header_nav>a]:bg-[#faf7ef] [&_.comm-chat-header_nav>a]:px-2.5 [&_.comm-chat-header_nav>a]:py-1",

  "[&_.comm-window]:bg-[#fbfaf6]! [&_.comm-chat-header]:border-b-[#e9e2d6]! [&_.comm-chat-header]:px-5! [&_.comm-chat-header]:py-4! [&_.comm-chat-header_h2]:font-serif [&_.comm-chat-header_h2]:text-xl! [&_.comm-chat-header_h2]:font-normal! [&_.comm-chat-header_h2]:text-[#3d513b] [&_.comm-chat-header_small]:text-[10px]! [&_.comm-chat-header_small]:text-[#a19681]!",
  "[&_.comm-chat-header_.comm-avatar]:size-10! [&_.comm-chat-header_.comm-avatar]:bg-[#f2ecdf]! [&_.comm-chat-header_.comm-avatar]:text-[#a38b60]! [&_.comm-chat-header_nav]:gap-2! [&_.comm-chat-header_nav]:text-[10px]! [&_.comm-chat-header_nav]:text-[#a68b5c] [&_.comm-chat-header_nav]:no-underline! [&_.comm-chat-header_nav>a]:underline-offset-4 [&_.comm-chat-header_nav>a:hover]:underline",
  "[&_.comm-chat-header>button]:flex [&_.comm-chat-header>button]:size-8 [&_.comm-chat-header>button]:shrink-0 [&_.comm-chat-header>button]:items-center [&_.comm-chat-header>button]:justify-center [&_.comm-chat-header>button]:rounded-lg [&_.comm-chat-header>button]:text-[#aa9979]! [&_.comm-chat-header>button:hover]:bg-[#f7f3e9]",
  "[&_.comm-message-scroll]:gap-3! [&_.comm-message-scroll]:p-5! [&_.comm-message-scroll]:[scrollbar-width:thin] [&_.comm-message-scroll]:[scrollbar-color:#ded4c0_transparent] sm:[&_.comm-message-scroll]:p-7!",
  "[&_.comm-date]:my-3! [&_.comm-date]:border [&_.comm-date]:border-[#e9e0d0] [&_.comm-date]:bg-[#f7f3e9]! [&_.comm-date]:px-3.5! [&_.comm-date]:text-[9px]! [&_.comm-date]:tracking-wide [&_.comm-date]:text-[#aa9572]!",
  "[&_.comm-bubble]:border-[#eae3d7]! [&_.comm-bubble]:bg-white! [&_.comm-bubble]:px-4! [&_.comm-bubble]:py-3! [&_.comm-bubble]:shadow-[0_3px_10px_#4b3d2504]! [&_.comm-bubble>p]:text-[12px]! [&_.comm-bubble>p]:leading-7! [&_.comm-bubble>p]:text-[#5c6352] [&_.comm-bubble.mine]:border-[#365441]! [&_.comm-bubble.mine]:bg-[#365441]! [&_.comm-bubble_footer]:text-[9px]! [&_.comm-bubble_footer]:text-[#a49c89]! [&_.comm-bubble_footer>button]:rounded [&_.comm-bubble_footer>button]:p-1",
  "[&_.comm-file]:rounded-lg [&_.comm-file]:border [&_.comm-file]:border-[#e6ddcc] [&_.comm-file]:bg-[#faf7ee] [&_.comm-file]:p-3 [&_.comm-file_button]:text-[11px]! [&_.comm-file_button]:text-[#a18a5f] [&_.comm-typing]:text-[10px]! [&_.comm-typing]:text-[#a19070]!",
  "[&_.comm-compose]:mx-4! [&_.comm-compose]:rounded-2xl! [&_.comm-compose]:border-[#ded5c3]! [&_.comm-compose]:p-3! [&_.comm-compose]:gap-2.5! [&_.comm-compose]:shadow-[0_4px_20px_#53452d05] [&_.comm-compose]:transition [&_.comm-compose]:focus-within:border-[#b9a171]! [&_.comm-compose]:focus-within:ring-4 [&_.comm-compose]:focus-within:ring-[#b9a171]/10 sm:[&_.comm-compose]:mx-5!",
  "[&_.comm-compose_textarea]:text-[12px]! [&_.comm-compose_textarea]:leading-relaxed [&_.comm-compose_textarea]:text-[#59634e] [&_.comm-compose_textarea]:outline-none! [&_.comm-compose_textarea]:placeholder:text-[#b0a592] [&_.comm-attach]:rounded-lg [&_.comm-attach]:p-2 [&_.comm-attach]:text-[#b09a72]! [&_.comm-attach]:focus-within:ring-2 [&_.comm-attach]:focus-within:ring-[#b09a72]",
  "[&_.comm-send]:min-h-11 [&_.comm-send]:rounded-xl! [&_.comm-send]:bg-[#35523e]! [&_.comm-send]:px-4! [&_.comm-send]:text-[11px]! [&_.comm-send]:font-medium [&_.comm-send]:text-white! [&_.comm-send]:transition [&_.comm-send:hover]:bg-[#263e2e]! [&_.comm-send]:disabled:opacity-40! [&_.comm-send>svg]:size-4",
  "[&_.comm-note]:my-3! [&_.comm-note]:text-[9px]! [&_.comm-note]:text-[#b1a48c]! [&_.comm-staged]:mx-5 [&_.comm-staged]:mb-2 [&_.comm-staged]:rounded-lg [&_.comm-staged]:bg-[#f5efdf] [&_.comm-staged]:px-3! [&_.comm-staged]:text-[11px]! [&_.comm-staged]:text-[#a18a60]",
  "[&_.comm-error]:border [&_.comm-error]:border-[#efd4c9] [&_.comm-error]:bg-[#fff5ef]! [&_.comm-error]:text-[11px]! [&_.comm-error]:text-[#ab725d]!",
  "[&_.comm-thread-list_.comm-empty]:gap-3! [&_.comm-thread-list_.comm-empty]:px-5! [&_.comm-empty_h3]:font-serif [&_.comm-empty_h3]:text-[21px]! [&_.comm-empty_h3]:font-normal! [&_.comm-empty_h3]:text-[#7d806a]! [&_.comm-empty_p]:text-[11px]! [&_.comm-empty_p]:text-[#aa9d85]",
  "motion-reduce:[&_*]:transition-none!",
].join(" ");

function MessagesHeader({ connected }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-5 border-b border-[#e5ded1] pb-6">
      <div>
        <p className="flex items-center gap-2 text-[8px] font-medium uppercase tracking-[0.24em] text-[#a89065]">
          <span className="h-px w-6 bg-[#bca478]" aria-hidden="true" />
          The MarryNest planning room
        </p>
        <h1 className="mt-3 font-serif text-[38px] leading-none tracking-[-1.3px] text-[#2f4737] sm:text-[46px]">Messages<span className="text-[#b49b70]">.</span></h1>
        <p className="mt-3 text-xs leading-relaxed text-[#8f8877]">The little conversations behind your unforgettable day.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="status" aria-live="polite" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e7e0d2] bg-[#fffdf8] px-3.5 py-2 text-[10px] text-[#948973]">
          <span aria-hidden="true" className={"size-1.5 rounded-full " + (connected ? "bg-[#7e9e71] shadow-[0_0_0_3px_#7e9e7110]" : "bg-[#c1a163]")} />
          {connected ? "Live updates connected" : "Reconnecting · messages remain saved"}
        </div>
        <Link to="/customer/discover" className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9ccb3] bg-[#fffdf8] px-3.5 py-2 text-[10px] font-medium text-[#9a8155] transition hover:border-[#b99d6c] hover:bg-[#f5efdf] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b99d6c] motion-reduce:transition-none">
          Explore services<ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

function InboxFooter() {
  return (
    <div className="mx-5 mb-4 mt-2 hidden shrink-0 rounded-xl border border-[#e8dfcc] bg-linear-to-br from-[#faf7ee] to-[#f3efdf] p-3.5 xl:block">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e3d7bd] bg-[#fffcf4] text-[#b49b6c]"><Sparkles size={14} strokeWidth={1.3} aria-hidden="true" /></span>
        <div>
          <p className="font-serif text-[17px] leading-tight text-[#777c60]">Find your people.</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[#aa9b7e]">A great team starts with a hello.</p>
          <Link to="/customer/discover" className="mt-1.5 inline-flex min-h-7 items-center gap-1.5 text-[10px] font-medium text-[#a08755] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b99d6c]">Explore vendors<ArrowUpRight size={11} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}

function ConversationWelcome() {
  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-y-auto bg-linear-to-br from-[#faf8f2] via-[#fcfbf7] to-[#f2eee2] p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3 text-[8px] font-medium uppercase tracking-[0.2em] text-[#b6a586]">
        <span className="inline-flex items-center gap-2"><Heart size={10} strokeWidth={1.4} aria-hidden="true" />Made for your kind of celebration</span>
        <Sparkles size={12} strokeWidth={1.2} className="hidden shrink-0 sm:block" aria-hidden="true" />
      </div>

      <div className="m-auto w-full max-w-[610px] py-6">
        <div className="grid overflow-hidden rounded-2xl border border-[#e4d9c4] bg-[#fffefa] shadow-[0_12px_40px_#70603d09] xl:grid-cols-[minmax(0,1fr)_170px]">
          <div className="px-5 py-6 sm:px-6 sm:py-7 xl:px-7 xl:py-8">
            <div aria-hidden="true" className="mb-5 inline-flex size-12 items-center justify-center rounded-xl border border-[#e9ddc6] bg-[#f8f2e5] text-[#b39a6b]">
              <MessageCircle size={24} strokeWidth={1.2} />
            </div>
            <p className="text-[8px] font-medium uppercase tracking-[0.24em] text-[#b39b70]">An invitation to connect</p>
            <h2 className="mt-3 font-serif text-[28px] leading-[1.15] tracking-[-0.6px] text-[#40523c] sm:text-[30px] xl:text-[32px]">
              Beautiful celebrations<br /><em className="font-normal text-[#a58c61]">begin with a hello.</em>
            </h2>
            <p className="mt-4 max-w-[290px] text-xs leading-7 text-[#9b917c]">Choose a conversation to share your vision, ask the little questions, and bring every detail together.</p>
            <Link to="/customer/discover" className="group mt-5 inline-flex min-h-10 items-center justify-center gap-3 rounded-lg border border-[#3f5940] bg-[#3f5940] px-4 py-2.5 text-[10px] font-medium tracking-wide text-white! transition hover:bg-[#2f442f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b69b6d] motion-reduce:transition-none">
              Find your dream team<ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
          <div aria-hidden="true" className="relative hidden min-h-full overflow-hidden bg-[#8c876f] xl:block">
            <img src="/images/wedding-garden-640.webp" alt="" className="absolute inset-0 size-full object-cover object-[68%_center]" />
            <div className="absolute inset-0 bg-linear-to-t from-[#2e3827]/65 via-transparent to-[#7e785a]/5" />
            <div className="absolute inset-3 rounded-lg border border-white/30" />
            <p className="absolute inset-x-6 bottom-7 font-serif text-[19px] leading-snug italic text-[#fff9e9]">For the moments<br />that matter.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] text-[#b2a286]">
          <span className="inline-flex items-center gap-1.5"><CalendarHeart size={12} strokeWidth={1.3} aria-hidden="true" />Your plans</span>
          <span className="inline-flex items-center gap-1.5"><Paperclip size={12} strokeWidth={1.3} aria-hidden="true" />Shared inspiration</span>
          <span className="inline-flex items-center gap-1.5"><Heart size={12} strokeWidth={1.3} aria-hidden="true" />Every little detail</span>
        </div>
      </div>

      <p className="text-center font-serif text-[12px] italic text-[#bcad91]">A few words today. A lifetime of memories tomorrow.</p>
    </div>
  );
}

export default function CustomerMessagesPage() {
  return (
    <div className={messageStyles}>
      <ChatPage
        role="Customer"
        emptyState={<ConversationWelcome />}
        renderHeader={({ connected }) => <MessagesHeader connected={connected} />}
        inboxFooter={<InboxFooter />}
      />
    </div>
  );
}
