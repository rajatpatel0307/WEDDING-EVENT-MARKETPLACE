import { vendorClasses } from "../styles";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCheck,
  Download,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Empty,
  ErrorView,
  Heading,
  Loading,
  useVendorData,
} from "../components/WorkspaceUI";
import {
  download,
  readFile,
  save,
  timestamp,
  vendorRequest,
} from "../services/workspace.api";
export default function VendorMessagesPage() {
  const [params, setParams] = useSearchParams(),
    { notify, reload } = useAuth(),
    [version, setVersion] = useState(0),
    list = useVendorData("/conversations", version);
  const [query, setQuery] = useState(""),
    [messages, setMessages] = useState([]),
    [hasMore, setHasMore] = useState(false),
    [text, setText] = useState(""),
    [attachment, setAttachment] = useState(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const end = useRef(null),
    selected = params.get("conversation") || list.data?.[0]?.id;
  const conversation = list.data?.find((c) => c.id === selected);
  useEffect(() => {
    if (!params.get("conversation") && list.data?.[0])
      setParams({ conversation: list.data[0].id }, { replace: true });
  }, [params, list.data, setParams]);
  useEffect(() => {
    const abort = new AbortController();
    const interval = setInterval(() => {
      if (document.hidden) return;
      vendorRequest("/conversations", { signal: abort.signal })
        .then(list.setData)
        .catch(() => {});
    }, 10000);
    return () => {
      clearInterval(interval);
      abort.abort();
    };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const abort = new AbortController();
    setLoading(true);
    setMessages([]);
    setAttachment(null);
    setText("");
    setError("");
    vendorRequest(`/conversations/${selected}/messages`, {
      signal: abort.signal,
    })
      .then(async (value) => {
        setMessages(value.messages);
        setHasMore(value.hasMore);
        await save(`/conversations/${selected}/read`, "PATCH", {});
        list.setData((old) =>
          old?.map((row) =>
            row.id === selected ? { ...row, unread: 0 } : row,
          ),
        );
        reload().catch(() => {});
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const abort = new AbortController();
    const interval = setInterval(() => {
      if (document.hidden) return;
      vendorRequest(`/conversations/${selected}/messages`, {
        signal: abort.signal,
      })
        .then((value) => {
          setMessages((old) => {
            const merged = new Map(old.map((message) => [message.id, message]));
            value.messages.forEach((message) =>
              merged.set(message.id, message),
            );
            return [...merged.values()];
          });
          if (
            value.messages.some((message) => !message.mine && !message.isRead)
          )
            save(`/conversations/${selected}/read`, "PATCH", {})
              .then(() => {
                list.setData((old) =>
                  old?.map((row) =>
                    row.id === selected ? { ...row, unread: 0 } : row,
                  ),
                );
                reload().catch(() => {});
              })
              .catch(() => {});
        })
        .catch(() => {});
    }, 10000);
    return () => {
      clearInterval(interval);
      abort.abort();
    };
  }, [selected, hasMore]);
  useEffect(() => {
    const container = end.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [selected, messages.at(-1)?.id]);
  async function loadEarlier() {
    if (!messages[0]) return;
    try {
      const result = await vendorRequest(
        `/conversations/${selected}/messages?${new URLSearchParams({ before: messages[0].createdAt, beforeId: messages[0].id })}`,
      );
      setMessages((old) => [...result.messages, ...old]);
      setHasMore(result.hasMore);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <Heading
        title="Messages"
        description="Good conversations are the beginning of beautiful celebrations."
      />
      <div className="
        grid grid-cols-[295px_minmax(0,_1fr)] [border-top:1px_solid_#e1ead7] [border-right:1px_solid_#e1ead7]
        [border-bottom:1px_solid_#e1ead7] [border-left:1px_solid_#e1ead7] rounded-[10px] [background:white]
        min-h-[570px] h-[calc(100dvh_-_238px)] max-h-[850px] overflow-hidden
        vendor-compact:grid-cols-[260px_minmax(0,_1fr)] vendor-tablet:grid-cols-[215px_minmax(0,_1fr)]
        vendor-mobile:grid-cols-[1fr] vendor-mobile:h-[auto] vendor-mobile:min-h-[700px]
        vendor-mobile:max-h-[none]
      ">
        <aside className="
          [border-right:1px_solid_#e7eedf] min-w-[0] overflow-y-auto [&_>_header]:flex
          [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:[padding:22px_19px_15px]
          [&_h2]:text-[12px] [&_h2]:text-[#829e69] [&_>_header_>_span]:text-[8px]
          [&_>_header_>_span]:text-[#b3c39e] [&_>_header_>_span]:[background:#f2f7e9]
          [&_>_header_>_span]:[padding:2px_6px] [&_>_header_>_span]:rounded-[4px] [&_>_button]:flex
          [&_>_button]:w-[100%] [&_>_button]:items-start [&_>_button]:gap-[10px]
          [&_>_button]:[padding:16px_17px] [&_>_button]:[border-top:1px_solid_#f1f5e9]
          [&_>_button]:[border-right:0] [&_>_button]:[border-bottom:0] [&_>_button]:[border-left:0]
          [&_>_button]:[background:white] [&_>_button]:text-left [&_>_button.selected]:[background:#f1f7e9]
          [&_>_button.selected]:[border-left:2px_solid_#99b87b] [&_>_button.selected]:pl-[15px]
          [&_>_button_>_div]:[flex:1] [&_>_button_>_div]:min-w-[0] [&_strong]:flex [&_strong]:justify-between
          [&_strong]:gap-[9px] [&_strong]:text-[10px] [&_strong]:text-[#91ac78] [&_strong]:font-medium
          [&_time]:text-[6px] [&_time]:text-[#bdcbae] [&_time]:font-normal [&_time]:whitespace-nowrap
          [&_p]:text-[9px] [&_p]:text-[#aebf98] [&_p]:whitespace-nowrap [&_p]:text-ellipsis
          [&_p]:overflow-hidden [&_p]:[margin:3px_0] [&_small]:text-[#c0ccac] [&_small]:text-[7px]
          [&_em]:not-italic [&_em]:[background:#a8c48b] [&_em]:text-[white] [&_em]:[padding:1px_5px]
          [&_em]:rounded-[4px] [&_em]:text-[8px] vendor-mobile:max-h-[230px] vendor-mobile:[border-right:0]
          vendor-mobile:[border-bottom:1px_solid_#e6efdb] vendor-mobile:[&_>_button]:[padding:12px_17px]
          vendor-mobile:[&_>_header]:[padding:15px_17px_10px]
        ">
          <header>
            <h2>Conversations</h2>
            <span>{list.data?.length || 0}</span>
          </header>
          <label className="
            flex items-center gap-[7px] [margin:0_17px_17px] [border-top:1px_solid_#e7efd9]
            [border-right:1px_solid_#e7efd9] [border-bottom:1px_solid_#e7efd9] [border-left:1px_solid_#e7efd9]
            rounded-[6px] [padding:0_8px] text-[#b4c89b] [&_input]:[padding:8px_0] [&_input]:[border-top:0]
            [&_input]:[border-right:0] [&_input]:[border-bottom:0] [&_input]:[border-left:0]
            [&_input]:[outline:0] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[9px]
            vendor-mobile:mb-[10px]
          ">
            <Search size={15} />
            <input
              placeholder="Find a customer…"
              aria-label="Search conversations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {list.error ? (
            <ErrorView error={list.error} retry={list.retry} />
          ) : list.loading && !list.data ? (
            <Loading />
          ) : !list.data?.length ? (
            <Empty
              title="No conversations yet"
              text="Use Message customer on a booking request to start a conversation."
            />
          ) : (
            list.data
              .filter((c) =>
                c.customer.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  disabled={busy || uploading}
                  className={selected === c.id ? "selected" : ""}
                  key={c.id}
                  onClick={() => setParams({ conversation: c.id })}
                >
                  <span className="
                    w-[33px] min-w-[33px] h-[33px] [border-top:1px_solid_#e3edda] [border-right:1px_solid_#e3edda]
                    [border-bottom:1px_solid_#e3edda] [border-left:1px_solid_#e3edda] [background:#f1f6e8] rounded-[50%]
                    grid place-items-center text-[#aac091] text-[12px]
                  ">{c.customer[0]}</span>
                  <div>
                    <strong>
                      {c.customer}
                      <time>{timestamp(c.updatedAt)}</time>
                    </strong>
                    <p>{c.lastMessage || c.event || "Start a conversation"}</p>
                    <small>{c.event || c.booking || "Event enquiry"}</small>
                  </div>
                  {c.unread > 0 && <em>{c.unread}</em>}
                </button>
              ))
          )}
        </aside>
        <section className="
          [&_h2]:text-[12px] [&_h2]:text-[#829e69] flex flex-col min-w-[0] min-h-[0] [&_>_header]:flex
          [&_>_header]:items-center [&_>_header]:gap-[11px] [&_>_header]:[padding:18px_23px]
          [&_>_header]:[border-bottom:1px_solid_#e8f0df] [&_>_header_>_div]:[flex:1]
          [&_>_header_>_svg]:text-[#c0cfae] [&_header_p]:text-[8px] [&_header_p]:text-[#adbf96]
          [&_header_p]:mt-[3px] [&_>_.vw-form-error]:[margin:5px_15px] [&_>_.vw-form-error]:text-[9px]!
          vendor-mobile:h-[550px] vendor-mobile:[&_>_header]:[padding:14px_17px]
        ">
          {!selected ? (
            <Empty
              title="A little conversation goes a long way"
              text="Choose a customer conversation to view messages or share a file."
            />
          ) : (
            <>
              <header>
                <span className="
                  w-[33px] min-w-[33px] h-[33px] [border-top:1px_solid_#e3edda] [border-right:1px_solid_#e3edda]
                  [border-bottom:1px_solid_#e3edda] [border-left:1px_solid_#e3edda] [background:#f1f6e8] rounded-[50%]
                  grid place-items-center text-[#aac091] text-[12px]
                ">
                  {conversation?.customer?.[0] || "C"}
                </span>
                <div>
                  <h2>{conversation?.customer || "Customer conversation"}</h2>
                  <p>
                    {conversation?.event ||
                      conversation?.booking ||
                      "Your event enquiry"}
                  </p>
                </div>
                <MessageSquare size={18} />
              </header>
              <div className="[flex:1] min-h-[0] overflow-y-auto [background:#fcfdf8] p-[23px] flex flex-col gap-[15px] vendor-mobile:p-[16px]" aria-live="polite">
                {hasMore && (
                  <button className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                  " onClick={loadEarlier}>
                    Load earlier messages
                  </button>
                )}
                {loading ? (
                  <Loading />
                ) : messages.length ? (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={vendorClasses(`vw-chat-bubble ${message.mine ? "mine" : ""}`)}
                    >
                      {message.text && <p>{message.text}</p>}
                      {!!message.hasAttachment && (
                        <button
                          className="
                            flex items-center gap-[7px] [border-top:1px_solid_#dfebd2] [border-right:1px_solid_#dfebd2]
                            [border-bottom:1px_solid_#dfebd2] [border-left:1px_solid_#dfebd2] [background:#f8fcef]
                            [padding:9px_11px] rounded-[5px] text-[9px] text-[#9bb780] max-w-[100%] [overflow-wrap:anywhere]
                          "
                          onClick={async () => {
                            try {
                              download(
                                await vendorRequest(
                                  `/conversations/${selected}/messages/${message.id}/attachment`,
                                  { download: true },
                                ),
                                message.attachmentName || "attachment",
                              );
                            } catch (e) {
                              notify(e.message);
                            }
                          }}
                        >
                          <Paperclip size={14} />
                          {message.attachmentName || "Attachment"}
                          <Download size={13} />
                        </button>
                      )}
                      <small>
                        {timestamp(message.createdAt)}
                        {message.mine && (
                          <CheckCheck
                            size={12}
                            className={message.isRead ? "read" : ""}
                          />
                        )}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="text-center m-[auto] text-[#b5c7a1]! text-[11px]!">
                    Say hello and start planning something special.
                  </p>
                )}
                <div ref={end} />
              </div>
              {error && (
                <p className="
                  vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
                  [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
                  rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
                " role="alert">
                  {error}
                </p>
              )}
              {attachment && (
                <div className="flex items-center gap-[7px] [padding:9px_21px] [background:#f7fbf0] text-[#abc192] text-[10px] [&_.vw-icon]:ml-[auto]">
                  <Paperclip size={14} />
                  {attachment.name}
                  <button
                    className="
                      vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                      [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                      [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                      [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                    "
                    aria-label="Remove attachment"
                    onClick={() => setAttachment(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <form
                className="
                  flex items-center gap-[11px] [padding:15px_20px_5px] [border-top:1px_solid_#eaf1df]
                  [&_textarea]:[flex:1] [&_textarea]:resize-none [&_textarea]:min-w-[0] [&_textarea]:text-[11px]
                  [&_textarea]:[border-top:0] [&_textarea]:[border-right:0] [&_textarea]:[border-bottom:0]
                  [&_textarea]:[border-left:0] [&_textarea]:[outline:0] [&_textarea]:[padding:8px_0]
                  [&_textarea]:max-h-[150px] vendor-mobile:[padding:12px_14px_5px] vendor-mobile:gap-[6px]
                  vendor-mobile:[&_>_button_>_span]:hidden
                "
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim() && !attachment) return;
                  setBusy(true);
                  setError("");
                  try {
                    await save(`/conversations/${selected}/messages`, "POST", {
                      text,
                      ...(attachment
                        ? { attachmentToken: attachment.token }
                        : {}),
                    });
                    setText("");
                    setAttachment(null);
                    const result = await vendorRequest(
                      `/conversations/${selected}/messages`,
                    );
                    setMessages(result.messages);
                    setHasMore(result.hasMore);
                    setVersion((v) => v + 1);
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label
                  className="
                    vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                    [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                    [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                    [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146] relative overflow-hidden cursor-pointer
                    [&_input]:absolute [&_input]:[inset:0] [&_input]:opacity-[0] [&_input]:w-[100%] [&_input]:h-[100%]
                    [&_input]:cursor-pointer
                  "
                  title="Attach a PDF or image"
                >
                  <Paperclip size={19} />
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={uploading || busy}
                    onChange={async (e) => {
                      const input = e.target,
                        file = input.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      setError("");
                      try {
                        if (
                          ![
                            "application/pdf",
                            "image/png",
                            "image/jpeg",
                          ].includes(file.type)
                        )
                          throw new Error(
                            "Attach a PDF, PNG or JPEG file under 5 MB.",
                          );
                        const result = await save(
                          `/conversations/${selected}/attachments`,
                          "POST",
                          { name: file.name, base64: await readFile(file) },
                        );
                        setAttachment(result);
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setUploading(false);
                        input.value = "";
                      }
                    }}
                  />
                </label>
                <textarea
                  aria-label="Message"
                  rows={1}
                  maxLength={5000}
                  placeholder={
                    uploading
                      ? "Uploading attachment…"
                      : "Write a thoughtful message…"
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    vw-primary
                  "
                  disabled={busy || uploading || (!text.trim() && !attachment)}
                >
                  <Send size={16} />
                  <span>{busy ? "Sending…" : "Send"}</span>
                </button>
              </form>
              <p className="text-center text-[7px]! text-[#c2d0b1]! [margin:0_0_11px]">
                Private attachments · PDF, PNG or JPEG · Up to 5 MB
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
