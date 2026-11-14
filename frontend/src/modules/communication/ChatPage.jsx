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
    <div className="comm-root [&&]:text-[#263e35] [&&]:[font-family:inherit] [&&]:min-w-0 [&&_button]:cursor-pointer [&&_button:disabled]:opacity-45 [&&_button:disabled]:cursor-default [&&_button:focus-visible]:outline-2 [&&_button:focus-visible]:outline-[#72917e] [&&_button:focus-visible]:outline-offset-[3px] [&&_a:focus-visible]:outline-2 [&&_a:focus-visible]:outline-[#72917e] [&&_a:focus-visible]:outline-offset-[3px] [&&_input:focus-visible]:outline-2 [&&_input:focus-visible]:outline-[#72917e] [&&_input:focus-visible]:outline-offset-[3px] [&&_textarea:focus-visible]:outline-2 [&&_textarea:focus-visible]:outline-[#72917e] [&&_textarea:focus-visible]:outline-offset-[3px] [&&_.comm-filters]:flex [&&_.comm-filters]:items-center [&&_.comm-filters]:flex-wrap [&&_.comm-filters]:gap-[12px] [&&_.comm-filters]:py-[12px] [&&_.comm-filters]:px-[16px] [&&_.comm-filters]:text-[12px] [&&_.comm-send]:inline-flex [&&_.comm-send]:items-center [&&_.comm-send]:justify-center [&&_.comm-send]:gap-[9px] [&&_.comm-send]:bg-[#365f4d] [&&_.comm-send]:text-white [&&_.comm-send]:py-[11px] [&&_.comm-send]:px-[18px] [&&_.comm-send]:rounded-[8px] [&&_.comm-send]:text-[12px] max-[640.001px]:[&&_.comm-send]:p-[10px]">
      <div className="comm-title [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-[20px] [&&]:mb-[25px] [&&_p]:text-[10px] [&&_p]:tracking-[2px] [&&_p]:text-[#8a7961] [&&_p]:mb-[8px] [&&_h1]:text-[30px] [&&_h1]:mt-0 [&&_h1]:mx-0 [&&_h1]:mb-[8px] [&&_h1]:font-semibold [&&_span]:text-[13px] [&&_span]:text-[#7b857f] [&&_>_a]:flex [&&_>_a]:items-center [&&_>_a]:gap-[8px] [&&_>_a]:text-[13px] [&&_.comm-connection]:text-[11px] [&&_.comm-connection]:border [&&_.comm-connection]:border-[#e3e8e2] [&&_.comm-connection]:py-[9px] [&&_.comm-connection]:px-[13px] [&&_.comm-connection]:rounded-[25px] [&&_.comm-connection]:bg-white max-[900.001px]:[&&_.comm-connection]:hidden max-[640.001px]:[&&_h1]:text-[25px] max-[640.001px]:[&&]:gap-[10px] max-[640.001px]:[&&_>_a]:text-[11px]">
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
        <div className="comm-error [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:items-center [&&]:bg-[#fff3ef] [&&]:text-[#914d3c] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:text-[12px] [&&]:mb-[12px] [&&_button]:underline" role="alert">
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
      <div className={`comm-chat [&&]:grid [&&]:grid-cols-[310px_minmax(0,_1fr)] [&&]:h-[min(740px,_calc(100dvh_-_220px))] [&&]:min-h-[480px] [&&]:border [&&]:border-[#e3e8e2] [&&]:rounded-[16px] [&&]:overflow-hidden [&&]:bg-white [&&]:shadow-[0_8px_28px_#263e3506] max-[900.001px]:[&&]:grid-cols-[250px_minmax(0,_1fr)] max-[640.001px]:[&&]:flex max-[640.001px]:[&&]:h-[calc(100dvh_-_190px)] max-[640.001px]:[&&]:min-h-[420px] ${selected ? "comm-selected max-[640.001px]:[&&_.comm-conversations]:hidden max-[640.001px]:[&&_.comm-window]:flex" : ""}`}>
        <aside className="comm-conversations [&&]:flex [&&]:flex-col [&&]:border-r [&&]:border-r-[#e3e8e2] [&&]:min-h-0 [&&_h2]:text-[16px] [&&_h2]:font-semibold [&&_h2]:pt-[22px] [&&_h2]:px-[20px] [&&_h2]:pb-[5px] max-[640.001px]:[&&]:w-full max-[640.001px]:[&&]:border-0">
          <h2>Your conversations</h2>
          <label className="comm-search [&&]:flex [&&]:items-center [&&]:gap-[9px] [&&]:my-[12px] [&&]:mx-[16px] [&&]:p-[10px] [&&]:border [&&]:border-[#e3e8e2] [&&]:rounded-[8px] [&&]:text-[#7b857f] [&&_input]:min-w-0 [&&_input]:w-full [&&_input]:border-0 [&&_input]:bg-transparent [&&_input]:text-[12px] [&&_input]:outline-none">
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
          <div className="comm-filters [&&_button]:py-[6px] [&&_button]:px-[10px] [&&_button]:border [&&_button]:border-[#e3e8e2] [&&_button]:rounded-[6px] [&&_button]:bg-white [&&_button[aria-pressed=true]]:bg-[#edf3ee] [&&_button[aria-pressed=true]]:text-[#365f4d] [&&_button[aria-pressed=true]]:border-[#b9cdbf] [&&_label]:flex [&&_label]:gap-[6px] [&&_label]:items-center [&&_select]:border [&&_select]:border-[#e3e8e2] [&&_select]:p-[7px] [&&_select]:rounded-[6px]">
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
          <div className="comm-thread-list [&&]:flex-1 [&&]:overflow-auto">
            {listLoading ? (
              <p role="status">Loading conversations…</p>
            ) : rows.length ? (
              rows.map((c) => (
                <button
                  className={`comm-thread [&&]:flex [&&]:gap-[11px] [&&]:text-left [&&]:w-full [&&]:p-[16px] [&&]:items-center [&&]:border-b [&&]:border-b-[#f0f2ef] [&&]:bg-white [&&.active]:bg-[#f2f6f1] [&&:hover]:bg-[#f2f6f1] [&&_>_img]:w-[39px] [&&_>_img]:h-[39px] [&&_>_img]:object-cover [&&_>_img]:shrink-0 [&&_>_img]:rounded-[50%] [&&_>_img]:bg-[#e8eee5] [&&_>_img]:text-[#587052] [&&_>_img]:inline-flex [&&_>_img]:items-center [&&_>_img]:justify-center [&&_>_img]:text-[16px] [&&_>_span:nth-child(2)]:flex-1 [&&_>_span:nth-child(2)]:min-w-0 [&&_strong]:block [&&_strong]:text-[13px] [&&_strong]:font-semibold [&&_small]:block [&&_small]:overflow-hidden [&&_small]:whitespace-nowrap [&&_small]:text-ellipsis [&&_small]:text-[#849087] [&&_small]:text-[12px] [&&_small]:my-[5px] [&&_small]:mx-0 [&&_time]:text-[10px] [&&_time]:text-[#9ba39d] [&&_em]:bg-[#40674f] [&&_em]:text-white [&&_em]:rounded-[12px] [&&_em]:py-[2px] [&&_em]:px-[6px] [&&_em]:text-[10px] [&&_em]:not-italic ${c.id === selected ? "active" : ""}`}
                  key={c.id}
                  onClick={() => setParams({ conversation: c.id })}
                  disabled={busy || uploading}
                >
                  {c.image ? (
                    <img src={c.image} alt="" />
                  ) : (
                    <span className="comm-avatar [&&]:w-[39px] [&&]:h-[39px] [&&]:object-cover [&&]:shrink-0 [&&]:rounded-[50%] [&&]:bg-[#e8eee5] [&&]:text-[#587052] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:text-[16px]">{c.customer?.[0]}</span>
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
              <div className="comm-empty [&&]:flex [&&]:flex-1 [&&]:flex-col [&&]:items-center [&&]:justify-center [&&]:text-center [&&]:py-[35px] [&&]:px-[25px] [&&]:gap-[12px] [&&]:text-[#879380] [&&_h2]:font-medium [&&_h2]:text-[#53644f] [&&_h2]:text-[18px] [&&_h3]:font-medium [&&_h3]:text-[#53644f] [&&_h3]:text-[18px] [&&_p]:text-[12px] [&&_p]:max-w-[280px] [&&_p]:leading-[1.8]">
                <MessageCircle />
                <h3>No conversations here</h3>
                <p>
                  Open a vendor, service, booking or quotation to start planning
                  together.
                </p>
              </div>
            )}
          </div>
          <div className="comm-pagination [&&]:flex [&&]:justify-between [&&]:items-center [&&]:gap-[10px] [&&]:p-[15px] [&&]:text-[12px] [&&_button]:border [&&_button]:border-[#e3e8e2] [&&_button]:py-[6px] [&&_button]:px-[9px] [&&_button]:rounded-[6px]">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>{page}</span>
            <button disabled={!listMore} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </aside>
        <section className="comm-window [&&]:flex [&&]:flex-col [&&]:min-h-0 [&&]:min-w-0 [&&]:bg-[#fbfcf9] max-[640.001px]:[&&]:hidden max-[640.001px]:[&&]:w-full">
          {!selected ? (
            <div className="comm-empty [&&]:flex [&&]:flex-1 [&&]:flex-col [&&]:items-center [&&]:justify-center [&&]:text-center [&&]:py-[35px] [&&]:px-[25px] [&&]:gap-[12px] [&&]:text-[#879380] [&&_h2]:font-medium [&&_h2]:text-[#53644f] [&&_h2]:text-[18px] [&&_h3]:font-medium [&&_h3]:text-[#53644f] [&&_h3]:text-[18px] [&&_p]:text-[12px] [&&_p]:max-w-[280px] [&&_p]:leading-[1.8]">
              <MessageCircle size={42} />
              <h2>Let’s plan something special</h2>
              <p>
                Choose a conversation to share ideas, details and inspiration.
              </p>
            </div>
          ) : (
            <>
              <header className="comm-chat-header [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:py-[17px] [&&]:px-[20px] [&&]:border-b [&&]:border-b-[#e3e8e2] [&&]:bg-white [&&_>_div]:flex-1 [&&_>_div]:min-w-0 [&&_h2]:text-[15px] [&&_h2]:font-semibold [&&_h2]:wrap-anywhere [&&_small]:flex [&&_small]:items-center [&&_small]:gap-[5px] [&&_small]:text-[11px] [&&_small]:text-[#8a938c] [&&_small]:my-[4px] [&&_small]:mx-0 [&&_i]:w-[6px] [&&_i]:h-[6px] [&&_i]:rounded-[100%] [&&_i]:bg-[#b5bcb6] [&&_i.online]:bg-[#62a875] [&&_nav]:flex [&&_nav]:flex-wrap [&&_nav]:gap-[10px] [&&_nav]:text-[11px] [&&_nav]:underline [&&_>_button]:p-[5px] [&&_>_button]:text-[#718374] max-[900.001px]:[&&]:p-[12px] max-[900.001px]:[&&]:gap-[8px] max-[640.001px]:[&&_.comm-avatar]:hidden">
                <button
                  aria-label="Back to conversations"
                  disabled={busy || uploading}
                  onClick={() => setParams({})}
                >
                  <ArrowLeft size={19} />
                </button>
                {conversation?.image ? (
                  <img
                    className="comm-avatar [&&]:w-[39px] [&&]:h-[39px] [&&]:object-cover [&&]:shrink-0 [&&]:rounded-[50%] [&&]:bg-[#e8eee5] [&&]:text-[#587052] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:text-[16px]"
                    src={conversation.image}
                    alt=""
                  />
                ) : (
                  <span className="comm-avatar [&&]:w-[39px] [&&]:h-[39px] [&&]:object-cover [&&]:shrink-0 [&&]:rounded-[50%] [&&]:bg-[#e8eee5] [&&]:text-[#587052] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:text-[16px]">
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
                className="comm-message-scroll [&&]:flex-1 [&&]:overflow-auto [&&]:p-[24px] [&&]:flex [&&]:flex-col [&&]:items-start [&&]:gap-[8px] [&&]:overscroll-contain max-[900.001px]:[&&]:p-[16px]"
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
                  <button className="comm-older [&&]:self-center [&&]:text-[11px] [&&]:underline [&&]:p-[8px]" onClick={earlier}>
                    Load earlier messages
                  </button>
                )}
                {loading ? (
                  <p role="status">Loading messages…</p>
                ) : !messages.length ? (
                  <div className="comm-empty [&&]:flex [&&]:flex-1 [&&]:flex-col [&&]:items-center [&&]:justify-center [&&]:text-center [&&]:py-[35px] [&&]:px-[25px] [&&]:gap-[12px] [&&]:text-[#879380] [&&_h2]:font-medium [&&_h2]:text-[#53644f] [&&_h2]:text-[18px] [&&_h3]:font-medium [&&_h3]:text-[#53644f] [&&_h3]:text-[18px] [&&_p]:text-[12px] [&&_p]:max-w-[280px] [&&_p]:leading-[1.8]">
                    <h3>A warm hello goes a long way</h3>
                    <p>Share your first idea below.</p>
                  </div>
                ) : (
                  messages.map((m, index) => (
                    <Fragment key={m.id}>
                      {(index === 0 ||
                        date(messages[index - 1].createdAt) !==
                          date(m.createdAt)) && (
                        <div className="comm-date [&&]:self-center [&&]:text-[10px] [&&]:text-[#939b90] [&&]:py-[7px] [&&]:px-[14px] [&&]:bg-[#f0f2eb] [&&]:rounded-[20px] [&&]:my-[8px] [&&]:mx-0">{date(m.createdAt)}</div>
                      )}
                      <article
                        className={`comm-bubble [&&]:max-w-[80%] [&&]:py-[12px] [&&]:px-[14px] [&&]:bg-white [&&]:border [&&]:border-[#e9ede6] [&&]:rounded-[13px_13px_13px_3px] [&&]:shadow-[0_2px_4px_#263e3503] [&&]:wrap-anywhere [&&.mine]:self-end [&&.mine]:bg-[#edf3e7] [&&.mine]:border-[#e1e9da] [&&.mine]:rounded-[13px_13px_3px_13px] [&&_>_p]:text-[13px] [&&_>_p]:leading-[1.7] [&&_>_p]:whitespace-pre-wrap [&&_>_p]:m-0 [&&_footer]:flex [&&_footer]:items-center [&&_footer]:justify-end [&&_footer]:gap-[9px] [&&_footer]:text-[9px] [&&_footer]:text-[#8c9889] [&&_footer]:mt-[7px] [&&_footer_span]:flex [&&_footer_span]:items-center [&&_footer_span]:gap-[3px] max-[900.001px]:[&&]:max-w-[90%] max-[640.001px]:[&&]:max-w-[88%] ${m.mine ? "mine" : ""}`}
                      >
                        <p>{m.deletedAt ? "Message deleted" : m.text}</p>
                        {!!m.hasAttachment && (
                          <div className="comm-file [&&]:flex [&&]:flex-col [&&]:gap-[6px] [&&]:my-[5px] [&&]:mx-0 [&&_button]:flex [&&_button]:gap-[6px] [&&_button]:items-center [&&_button]:text-[12px] [&&_button]:underline [&&_button]:text-left">
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
                                <CheckCheck size={14} className="comm-read [&&]:text-[#2678a5]" />
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
              <div className="comm-typing [&&]:h-[23px] [&&]:py-0 [&&]:px-[22px] [&&]:text-[#849180] [&&]:text-[11px]" role="status">
                {typing ? "Typing…" : " "}
              </div>
              {failed && (
                <div className="comm-error [&&]:flex [&&]:flex-wrap [&&]:gap-[10px] [&&]:items-center [&&]:bg-[#fff3ef] [&&]:text-[#914d3c] [&&]:py-[12px] [&&]:px-[16px] [&&]:rounded-[8px] [&&]:text-[12px] [&&]:mb-[12px] [&&_button]:underline">
                  Failed to confirm delivery. Your draft is preserved.{" "}
                  <button disabled={busy} onClick={() => send(failed)}>
                    Retry safely
                  </button>
                </div>
              )}
              {attachment && (
                <div className="comm-staged [&&]:flex [&&]:gap-[8px] [&&]:items-center [&&]:py-[8px] [&&]:px-[24px] [&&]:text-[12px]">
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
                className="comm-compose [&&]:flex [&&]:items-center [&&]:gap-[12px] [&&]:my-0 [&&]:mx-[18px] [&&]:py-[10px] [&&]:px-[12px] [&&]:bg-white [&&]:border [&&]:border-[#dce5d8] [&&]:rounded-[11px] [&&_textarea]:flex-1 [&&_textarea]:min-w-0 [&&_textarea]:resize-none [&&_textarea]:border-0 [&&_textarea]:[font-family:inherit] [&&_textarea]:text-[13px] [&&_textarea]:outline-none [&&_textarea]:p-[4px] [&&_textarea]:bg-transparent max-[640.001px]:[&&]:my-0 max-[640.001px]:[&&]:mx-[10px] max-[640.001px]:[&&]:gap-[8px]"
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
                <label className="comm-attach [&&]:relative [&&]:text-[#91a085] [&&]:cursor-pointer [&&]:inline-flex [&&_input]:absolute [&&_input]:w-full [&&_input]:h-full [&&_input]:opacity-0 [&&_input]:inset-0 [&&_input]:cursor-pointer" title="Attach PDF, PNG or JPEG">
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
                  className="comm-send max-[640.001px]:[&&_>_span]:hidden"
                  disabled={busy || uploading || (!text.trim() && !attachment)}
                >
                  <Send size={18} />
                  <span>{busy ? "Sending…" : "Send"}</span>
                </button>
              </form>
              <p className="comm-note [&&]:text-[10px] [&&]:text-[#a0a897] [&&]:text-center [&&]:mt-[9px] [&&]:mx-0 [&&]:mb-[14px] max-[640.001px]:[&&]:text-[9px]">
                Private attachments · PDF, PNG or JPEG · Up to 5 MB
              </p>
            </>
          )}
        </section>
      </div>
      {preview && (
        <div
          className="comm-preview [&&]:fixed [&&]:z-[1000] [&&]:inset-0 [&&]:bg-[#13261ee6] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:p-[40px] [&&_img]:max-w-full [&&_img]:max-h-[90dvh] [&&_img]:object-contain [&&_>_button]:absolute [&&_>_button]:right-[20px] [&&_>_button]:top-[20px] [&&_>_button]:text-white"
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
