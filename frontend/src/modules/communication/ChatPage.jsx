import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  BellOff,
  Check,
  CheckCheck,
  FileText,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { communicationRequest } from "./api";
import { useCommunicationSocket } from "./useCommunicationSocket";
import { readFile, download } from "../customer/services/workspace.api";
import { mergeChatMessages } from "../../services/chat-sync";
import "./communication.css";
const date = (v) =>
  new Date(v).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const time = (v) =>
  new Date(v).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
export default function ChatPage({ role }) {
  const socket = useCommunicationSocket(),
    [params, setParams] = useSearchParams(),
    selected = params.get("conversation")?.toLowerCase();
  const request = useCallback(
    (path, options) => communicationRequest(role, path, options),
    [role],
  );
  const [rows, setRows] = useState([]),
    [listMore, setListMore] = useState(false),
    [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [archived, setArchived] = useState(false),
    [unread, setUnread] = useState(false);
  const [messages, setMessages] = useState([]),
    [details, setDetails] = useState(null),
    [more, setMore] = useState(false),
    [text, setText] = useState(""),
    [attachment, setAttachment] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [listLoading, setListLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [failed, setFailed] = useState(null),
    [online, setOnline] = useState(false),
    [typing, setTyping] = useState(false),
    [connected, setConnected] = useState(false),
    [retry, setRetry] = useState(0);
  const active = useRef(selected),
    scroll = useRef(),
    stick = useRef(true),
    typingTimer = useRef(),
    lastTyped = useRef(0),
    draft = useRef(),
    cursor = useRef(null),
    loadingOlder = useRef(false),
    listGeneration = useRef(0),
    messageGeneration = useRef(0);
  active.current = selected;
  const conversation =
    rows.find((c) => c.id.toLowerCase() === selected?.toLowerCase()) ||
    (details?.id === selected ? details : null);
  useEffect(() => {
    let live = true;
    if (selected)
      request(`/conversations/${selected}`)
        .then((r) => {
          if (live) setDetails(r);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [selected, request, retry]);
  const loadList = useCallback(async () => {
    const generation = ++listGeneration.current;
    try {
      const r = await request(
        `/conversations?${new URLSearchParams({ q, page, archived: archived ? "1" : "0", unread: unread ? "1" : "0" })}`,
      );
      if (generation !== listGeneration.current) return;
      setRows(r.rows);
      setListMore(r.hasMore);
    } catch (e) {
      if (generation === listGeneration.current) setError(e.message);
    } finally {
      if (generation === listGeneration.current) setListLoading(false);
    }
  }, [request, q, page, archived, unread]);
  const loadMessages = useCallback(async () => {
    if (!selected) return;
    const generation = ++messageGeneration.current;
    try {
      const r = await request(`/conversations/${selected}/messages`);
      if (
        active.current !== selected ||
        generation !== messageGeneration.current
      )
        return;
      setMessages((old) => mergeChatMessages(old, r.messages));
      setMore((old) => (loadingOlder.current ? old : r.hasMore));
      if (!loadingOlder.current) cursor.current = r.nextCursor;
      setLoading(false);
      if (r.messages.some((m) => !m.mine && m.status === "Sent"))
        await request(`/conversations/${selected}/delivered`, {
          method: "PATCH",
          data: {},
        });
      if (
        !document.hidden &&
        active.current === selected &&
        (!r.messages.length || r.messages.some((m) => !m.mine && !m.isRead))
      ) {
        await request(`/conversations/${selected}/read`, {
          method: "PATCH",
          data: {},
        });
        window.dispatchEvent(new Event("chat:read"));
      }
    } catch (e) {
      if (active.current === selected) {
        setError(e.message);
        setLoading(false);
      }
    }
  }, [request, selected]);
  useEffect(() => {
    setListLoading(true);
    const t = setTimeout(loadList, 200);
    return () => {
      clearTimeout(t);
      listGeneration.current++;
    };
  }, [loadList, retry]);
  useEffect(() => {
    messageGeneration.current++;
    setMessages([]);
    setText("");
    setAttachment(null);
    setFailed(null);
    setBusy(false);
    setUploading(false);
    setError("");
    setOnline(false);
    setTyping(false);
    setLoading(!!selected);
    stick.current = true;
    loadingOlder.current = false;
    cursor.current = null;
    draft.current = null;
    loadMessages();
    return () => {
      messageGeneration.current++;
      clearTimeout(typingTimer.current);
    };
  }, [selected, loadMessages, retry]);
  useEffect(() => {
    if (!socket) return;
    const join = () => {
      setConnected(true);
      loadList();
      loadMessages();
      if (selected)
        socket
          .timeout(10000)
          .emit("join_conversation", { conversationId: selected }, (err, r) => {
            if (!err && r?.ok && active.current === selected)
              setOnline(r.data.online);
          });
    };
    let refreshTimer,
      refreshMessages = false;
    const update = (p) => {
      refreshMessages ||= p.conversationId === selected;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadList();
        if (refreshMessages) loadMessages();
        refreshMessages = false;
      }, 100);
    };
    const onTyping = (p) => {
      if (p.conversationId === selected) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3500);
      }
    };
    const stop = (p) => {
      if (p.conversationId === selected) setTyping(false);
    };
    const onOnline = (p) => {
      if (p.userId?.toLowerCase() === conversation?.peerId?.toLowerCase())
        setOnline(true);
    };
    const onOffline = (p) => {
      if (p.userId?.toLowerCase() === conversation?.peerId?.toLowerCase())
        setOnline(false);
    };
    const disconnect = () => {
      setConnected(false);
      setOnline(false);
      setTyping(false);
    };
    socket.on("connect", join);
    socket.on("disconnect", disconnect);
    const events = [
      "receive_message",
      "message_read",
      "message_delivered",
      "message_deleted",
      "conversation_created",
      "conversation_updated",
    ];
    events.forEach((e) => socket.on(e, update));
    socket.on("typing_start", onTyping);
    socket.on("typing_stop", stop);
    socket.on("user_online", onOnline);
    socket.on("user_offline", onOffline);
    if (socket.connected) join();
    const reconcile = () => {
      if (!document.hidden) {
        loadList();
        loadMessages();
      }
    };
    const timer = setInterval(reconcile, 30000);
    document.addEventListener("visibilitychange", reconcile);
    return () => {
      clearInterval(timer);
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", reconcile);
      socket.off("connect", join);
      socket.off("disconnect", disconnect);
      events.forEach((e) => socket.off(e, update));
      socket.off("typing_start", onTyping);
      socket.off("typing_stop", stop);
      socket.off("user_online", onOnline);
      socket.off("user_offline", onOffline);
      if (selected && socket.connected) {
        socket.emit("typing_stop", { conversationId: selected });
        socket.emit("leave_conversation", { conversationId: selected });
      }
    };
  }, [socket, selected, loadList, loadMessages, conversation?.peerId]);
  useEffect(() => {
    if (stick.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages]);
  async function state(input) {
    try {
      await request(
        `/conversations/${selected}/${"isMuted" in input ? "mute" : input.isArchived ? "archive" : "restore"}`,
        { method: "PATCH", data: input },
      );
      loadList();
      const summary = await request(`/conversations/${selected}`);
      if (active.current === selected) setDetails(summary);
    } catch (e) {
      setError(e.message);
    }
  }
  async function send(payload) {
    const id = selected;
    setBusy(true);
    setError("");
    try {
      await request(`/conversations/${id}/messages`, {
        method: "POST",
        data: payload,
      });
      if (active.current === id) {
        setFailed(null);
        setText("");
        setAttachment(null);
        draft.current = null;
        stick.current = true;
        await loadMessages();
      }
      loadList();
    } catch (e) {
      if (active.current === id) {
        setFailed(payload);
        setError(e.message);
      }
    } finally {
      if (active.current === id) setBusy(false);
    }
  }
  async function earlier() {
    if (!cursor.current) return;
    const id = selected,
      container = scroll.current,
      height = container?.scrollHeight || 0;
    loadingOlder.current = true;
    try {
      const r = await request(
        `/conversations/${id}/messages?${new URLSearchParams(cursor.current)}`,
      );
      if (active.current !== id) return;
      cursor.current = r.nextCursor;
      stick.current = false;
      setMessages((old) => mergeChatMessages(old, r.messages));
      setMore(r.hasMore);
      requestAnimationFrame(() => {
        if (container) container.scrollTop += container.scrollHeight - height;
      });
    } catch (e) {
      setError(e.message);
    }
  }
  async function openFile(m, preview = false) {
    try {
      const blob = await request(
        `/conversations/${selected}/messages/${m.id}/file`,
        { responseType: "blob" },
      );
      if (preview) {
        const url = URL.createObjectURL(blob);
        setPreview({ url, name: m.attachmentName });
      } else download(blob, m.attachmentName || "attachment");
    } catch (e) {
      setError(e.message);
    }
  }
  const [preview, setPreview] = useState(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  return (
    <div className="comm-root">
      <div className="comm-title">
        <div>
          <p>YOUR PLANNING SPACE</p>
          <h1>Messages</h1>
          <span>Every beautiful event begins with a conversation.</span>
        </div>
        <span className="comm-connection">
          {connected
            ? "Live updates connected"
            : "Reconnecting · messages remain saved"}
        </span>
      </div>
      {error && (
        <div className="comm-error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              setRetry((v) => v + 1);
            }}
          >
            Reload
          </button>
        </div>
      )}
      <div className={`comm-chat ${selected ? "comm-selected" : ""}`}>
        <aside className="comm-conversations">
          <h2>Your conversations</h2>
          <label className="comm-search">
            <Search size={17} />
            <input
              aria-label="Search conversations"
              placeholder="Find a conversation"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="comm-filters">
            <button
              aria-pressed={!archived}
              onClick={() => {
                setArchived(false);
                setPage(1);
              }}
            >
              Inbox
            </button>
            <button
              aria-pressed={archived}
              onClick={() => {
                setArchived(true);
                setPage(1);
              }}
            >
              Archived
            </button>
            <label>
              <input
                type="checkbox"
                checked={unread}
                onChange={(e) => {
                  setUnread(e.target.checked);
                  setPage(1);
                }}
              />{" "}
              Unread
            </label>
          </div>
          <div className="comm-thread-list">
            {listLoading ? (
              <p role="status">Loading conversations…</p>
            ) : rows.length ? (
              rows.map((c) => (
                <button
                  className={`comm-thread ${c.id === selected ? "active" : ""}`}
                  key={c.id}
                  onClick={() => setParams({ conversation: c.id })}
                  disabled={busy || uploading}
                >
                  {c.image ? (
                    <img src={c.image} alt="" />
                  ) : (
                    <span className="comm-avatar">{c.customer?.[0]}</span>
                  )}
                  <span>
                    <strong>{c.customer}</strong>
                    <small>
                      {c.lastMessage || c.event || "Start a conversation"}
                    </small>
                    <time>{date(c.updatedAt)}</time>
                  </span>
                  {c.unread > 0 && <em>{c.unread}</em>}
                </button>
              ))
            ) : (
              <div className="comm-empty">
                <MessageCircle />
                <h3>No conversations here</h3>
                <p>
                  Open a vendor, service, booking or quotation to start planning
                  together.
                </p>
              </div>
            )}
          </div>
          <div className="comm-pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>{page}</span>
            <button disabled={!listMore} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </aside>
        <section className="comm-window">
          {!selected ? (
            <div className="comm-empty">
              <MessageCircle size={42} />
              <h2>Let’s plan something special</h2>
              <p>
                Choose a conversation to share ideas, details and inspiration.
              </p>
            </div>
          ) : (
            <>
              <header className="comm-chat-header">
                <button
                  aria-label="Back to conversations"
                  disabled={busy || uploading}
                  onClick={() => setParams({})}
                >
                  <ArrowLeft size={19} />
                </button>
                {conversation?.image ? (
                  <img
                    className="comm-avatar"
                    src={conversation.image}
                    alt=""
                  />
                ) : (
                  <span className="comm-avatar">
                    {conversation?.customer?.[0] || "C"}
                  </span>
                )}
                <div>
                  <h2>{conversation?.customer || "Private conversation"}</h2>
                  <small>
                    <i className={online ? "online" : ""} />
                    {online ? "Online" : "Offline"} ·{" "}
                    {conversation?.event ||
                      conversation?.booking ||
                      "Event enquiry"}
                  </small>
                  <nav>
                    {conversation?.requestId && (
                      <Link
                        to={`/${role.toLowerCase()}/requests/${conversation.requestId}`}
                      >
                        View request
                      </Link>
                    )}
                    {conversation?.bookingId && (
                      <Link
                        to={`/${role.toLowerCase()}/bookings/${conversation.bookingId}`}
                      >
                        View booking
                      </Link>
                    )}
                    {conversation?.quotationId && (
                      <Link
                        to={`/${role.toLowerCase()}/quotations/${conversation.quotationId}`}
                      >
                        View quotation
                      </Link>
                    )}
                    {conversation?.serviceId && (
                      <Link
                        to={`/${role.toLowerCase()}/services/${conversation.serviceId}`}
                      >
                        View service
                      </Link>
                    )}
                    {role === "Customer" && conversation?.vendorId && (
                      <Link to={`/customer/vendors/${conversation.vendorId}`}>
                        Vendor profile
                      </Link>
                    )}
                  </nav>
                </div>
                <button
                  aria-label={
                    archived ? "Restore conversation" : "Archive conversation"
                  }
                  title={archived ? "Restore" : "Archive"}
                  onClick={() => state({ isArchived: !archived })}
                >
                  <Archive size={18} />
                </button>
                <button
                  aria-label={
                    conversation?.isMuted
                      ? "Unmute conversation"
                      : "Mute conversation"
                  }
                  title={conversation?.isMuted ? "Unmute" : "Mute"}
                  aria-pressed={!!conversation?.isMuted}
                  onClick={() => state({ isMuted: !conversation?.isMuted })}
                >
                  <BellOff size={18} />
                </button>
              </header>
              <div
                className="comm-message-scroll"
                ref={scroll}
                onScroll={(e) => {
                  stick.current =
                    e.currentTarget.scrollHeight -
                      e.currentTarget.scrollTop -
                      e.currentTarget.clientHeight <
                    90;
                }}
              >
                {more && (
                  <button className="comm-older" onClick={earlier}>
                    Load earlier messages
                  </button>
                )}
                {loading ? (
                  <p role="status">Loading messages…</p>
                ) : !messages.length ? (
                  <div className="comm-empty">
                    <h3>A warm hello goes a long way</h3>
                    <p>Share your first idea below.</p>
                  </div>
                ) : (
                  messages.map((m, index) => (
                    <Fragment key={m.id}>
                      {(index === 0 ||
                        date(messages[index - 1].createdAt) !==
                          date(m.createdAt)) && (
                        <div className="comm-date">{date(m.createdAt)}</div>
                      )}
                      <article
                        className={`comm-bubble ${m.mine ? "mine" : ""}`}
                      >
                        <p>{m.deletedAt ? "Message deleted" : m.text}</p>
                        {!!m.hasAttachment && (
                          <div className="comm-file">
                            <button onClick={() => openFile(m)}>
                              <FileText size={16} />
                              {m.attachmentName || "Attachment"}
                            </button>
                            {m.attachmentMime?.startsWith("image/") && (
                              <button onClick={() => openFile(m, true)}>
                                Preview image
                              </button>
                            )}
                          </div>
                        )}
                        <footer>
                          <time dateTime={m.createdAt}>
                            {time(m.createdAt)}
                          </time>
                          {m.mine && (
                            <span title={m.status}>
                              {m.status === "Read" ? (
                                <CheckCheck size={14} className="comm-read" />
                              ) : m.status === "Delivered" ? (
                                <CheckCheck size={14} />
                              ) : (
                                <Check size={14} />
                              )}{" "}
                              {m.status}
                            </span>
                          )}
                          {m.mine &&
                            !m.deletedAt &&
                            Date.now() - new Date(m.createdAt).getTime() <
                              900000 && (
                              <button
                                aria-label="Delete message"
                                onClick={async () => {
                                  try {
                                    await request(`/messages/${m.id}`, {
                                      method: "DELETE",
                                    });
                                    loadMessages();
                                  } catch (e) {
                                    setError(e.message);
                                  }
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                        </footer>
                      </article>
                    </Fragment>
                  ))
                )}
              </div>
              <div className="comm-typing" role="status">
                {typing ? "Typing…" : " "}
              </div>
              {failed && (
                <div className="comm-error">
                  Failed to confirm delivery. Your draft is preserved.{" "}
                  <button disabled={busy} onClick={() => send(failed)}>
                    Retry safely
                  </button>
                </div>
              )}
              {attachment && (
                <div className="comm-staged">
                  <Paperclip size={14} />
                  {attachment.name}
                  <button
                    aria-label="Remove attachment"
                    disabled={busy}
                    onClick={() => setAttachment(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                className="comm-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim() && !attachment) return;
                  const fingerprint = JSON.stringify([text, attachment?.token]);
                  if (draft.current?.fingerprint !== fingerprint)
                    draft.current = { fingerprint, key: crypto.randomUUID() };
                  send({
                    text,
                    ...(attachment
                      ? { attachmentToken: attachment.token }
                      : {}),
                    clientMessageId: draft.current.key,
                  });
                }}
              >
                <label className="comm-attach" title="Attach PDF, PNG or JPEG">
                  <Paperclip size={21} />
                  <input
                    aria-label="Attach a file"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={busy || uploading}
                    onChange={async (e) => {
                      const f = e.target.files?.[0],
                        id = selected;
                      e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      try {
                        const r = await request(
                          `/conversations/${id}/attachments`,
                          {
                            method: "POST",
                            data: { name: f.name, base64: await readFile(f) },
                          },
                        );
                        if (active.current === id) setAttachment(r);
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        if (active.current === id) setUploading(false);
                      }
                    }}
                  />
                </label>
                <textarea
                  aria-label="Message"
                  placeholder={
                    uploading ? "Uploading attachment…" : "Write a message…"
                  }
                  rows={2}
                  maxLength={5000}
                  value={text}
                  disabled={busy}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFailed(null);
                    if (
                      socket?.connected &&
                      Date.now() - lastTyped.current > 1500
                    ) {
                      socket.emit("typing_start", { conversationId: selected });
                      lastTyped.current = Date.now();
                    }
                  }}
                  onBlur={() =>
                    socket?.connected &&
                    socket.emit("typing_stop", { conversationId: selected })
                  }
                />
                <button
                  className="comm-send"
                  disabled={busy || uploading || (!text.trim() && !attachment)}
                >
                  <Send size={18} />
                  <span>{busy ? "Sending…" : "Send"}</span>
                </button>
              </form>
              <p className="comm-note">
                Private attachments · PDF, PNG or JPEG · Up to 5 MB
              </p>
            </>
          )}
        </section>
      </div>
      {preview && (
        <div
          className="comm-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreview(null)}
        >
          <button
            aria-label="Close image preview"
            onClick={() => setPreview(null)}
          >
            <X />
          </button>
          <img src={preview.url} alt={preview.name} />
        </div>
      )}
    </div>
  );
}
