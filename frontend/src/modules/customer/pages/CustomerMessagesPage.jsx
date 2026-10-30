import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
  useCustomerData,
} from "../components/WorkspaceUI";
import {
  download,
  readFile,
  save,
  timestamp,
  customerRequest,
} from "../services/workspace.api";
export default function CustomerMessagesPage() {
  const [params, setParams] = useSearchParams(),
    { notify, reload } = useAuth(),
    [version, setVersion] = useState(0),
    list = useCustomerData("/conversations", version);
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
      customerRequest("/conversations", { signal: abort.signal })
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
    customerRequest(`/conversations/${selected}/messages`, {
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
      customerRequest(`/conversations/${selected}/messages`, {
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
      const result = await customerRequest(
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
      <div className="cw-messages">
        <aside className="cw-conversations">
          <header>
            <h2>Conversations</h2>
            <span>{list.data?.length || 0}</span>
          </header>
          <label className="cw-conversation-search">
            <Search size={15} />
            <input
              placeholder="Find a vendor…"
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
              text="Use Message vendor on a service or booking to start a conversation."
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
                  <span className="cw-chat-avatar">{c.customer[0]}</span>
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
        <section className="cw-chat">
          {!selected ? (
            <Empty
              title="A little conversation goes a long way"
              text="Choose a vendor conversation to view messages or share a file."
            />
          ) : (
            <>
              <header>
                <span className="cw-chat-avatar">
                  {conversation?.customer?.[0] || "C"}
                </span>
                <div>
                  <h2>{conversation?.customer || "Vendor conversation"}</h2>
                  {conversation?.bookingId ? (
                    <Link to={`/customer/bookings/${conversation.bookingId}`}>
                      View booking
                    </Link>
                  ) : conversation?.eventId ? (
                    <Link to={`/customer/events/${conversation.eventId}`}>
                      View event
                    </Link>
                  ) : null}
                  <p>
                    {conversation?.event ||
                      conversation?.booking ||
                      "Your event enquiry"}
                  </p>
                </div>
                <MessageSquare size={18} />
              </header>
              <div className="cw-chat-scroll" aria-live="polite">
                {hasMore && (
                  <button className="cw-button" onClick={loadEarlier}>
                    Load earlier messages
                  </button>
                )}
                {loading ? (
                  <Loading />
                ) : messages.length ? (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`cw-chat-bubble ${message.mine ? "mine" : ""}`}
                    >
                      {message.text && <p>{message.text}</p>}
                      {!!message.hasAttachment && (
                        <button
                          className="cw-chat-attachment"
                          onClick={async () => {
                            try {
                              download(
                                await customerRequest(
                                  `/conversations/${selected}/messages/${message.id}/file`,
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
                  <p className="cw-chat-intro">
                    Say hello and start planning something special.
                  </p>
                )}
                <div ref={end} />
              </div>
              {error && (
                <p className="cw-form-error" role="alert">
                  {error}
                </p>
              )}
              {attachment && (
                <div className="cw-staged-attachment">
                  <Paperclip size={14} />
                  {attachment.name}
                  <button
                    className="cw-icon"
                    aria-label="Remove attachment"
                    onClick={() => setAttachment(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <form
                className="cw-chat-compose"
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
                    const result = await customerRequest(
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
                  className="cw-icon cw-attach-button"
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
                  className="cw-button cw-primary"
                  disabled={busy || uploading || (!text.trim() && !attachment)}
                >
                  <Send size={16} />
                  <span>{busy ? "Sending…" : "Send"}</span>
                </button>
              </form>
              <p className="cw-chat-file-note">
                Private attachments · PDF, PNG or JPEG · Up to 5 MB
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
