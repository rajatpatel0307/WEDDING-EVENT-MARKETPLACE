// Refresh after each completed request, so slow connections never create
// overlapping polls. Focus and reconnect events catch up immediately.
export function startChatPolling(task, {
  interval = 2000,
  immediate = true,
  onError = () => {},
  page = document,
  host = window,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  const controller = new AbortController();
  let timer, running = false, queued = false;

  const schedule = (delay = interval) => {
    if (!controller.signal.aborted && !page.hidden)
      timer = setTimer(refresh, delay);
  };
  async function refresh() {
    clearTimer(timer);
    if (controller.signal.aborted || page.hidden) return;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      await task(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally {
      running = false;
      schedule(queued ? 0 : interval);
      queued = false;
    }
  }

  host.addEventListener("focus", refresh);
  host.addEventListener("online", refresh);
  page.addEventListener("visibilitychange", refresh);
  if (immediate) refresh();
  else schedule();

  return () => {
    controller.abort();
    clearTimer(timer);
    host.removeEventListener("focus", refresh);
    host.removeEventListener("online", refresh);
    page.removeEventListener("visibilitychange", refresh);
  };
}

export function mergeChatMessages(previous, incoming) {
  const messages = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) {
    const existing = messages.get(message.id);
    messages.set(message.id, {
      ...existing,
      ...message,
      isRead: !!(existing?.isRead || message.isRead),
    });
  }
  return [...messages.values()].sort((a, b) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    String(a.id).localeCompare(String(b.id)),
  );
}
