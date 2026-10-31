import test from "node:test";
import assert from "node:assert/strict";
import { mergeChatMessages, startChatPolling } from "../src/services/chat-sync.js";

const settle = () => new Promise(resolve => setImmediate(resolve));
function environment() {
  const host = new EventTarget(), page = new EventTarget(), timers = new Map();
  let nextId = 0;
  page.hidden = false;
  return {
    host, page, timers,
    options: {
      host, page,
      setTimer(callback, delay) { timers.set(++nextId, { callback, delay }); return nextId; },
      clearTimer(id) { timers.delete(id); },
    },
    async tick() {
      const [id, { callback }] = timers.entries().next().value;
      timers.delete(id);
      await callback();
    },
  };
}
const message = (id, createdAt, extra = {}) => ({ id, createdAt, text: id, isRead: false, ...extra });

test("new incoming messages appear on the next automatic poll without a reload", async () => {
  const env = environment();
  const first = message("a", "2026-10-31T10:00:00Z");
  const reply = message("b", "2026-10-31T10:00:01Z");
  let calls = 0, messages = [];
  const stop = startChatPolling(async () => {
    messages = mergeChatMessages(messages, ++calls === 1 ? [first] : [first, reply]);
  }, env.options);
  await settle();
  assert.equal(calls, 1);
  assert.equal([...env.timers.values()][0].delay, 2000);
  await env.tick();
  assert.deepEqual(messages.map(m => m.id), ["a", "b"]);
  await env.tick();
  assert.equal(messages.length, 2);
  stop();
});

test("polling resumes immediately on focus, reconnect and a visible tab, and pauses while hidden", async () => {
  const env = environment();
  let calls = 0;
  const stop = startChatPolling(async () => { calls++; }, {
    ...env.options, interval: 5000, immediate: false,
  });
  assert.equal(calls, 0);
  env.host.dispatchEvent(new Event("focus"));
  await settle();
  assert.equal(calls, 1);
  env.host.dispatchEvent(new Event("online"));
  await settle();
  assert.equal(calls, 2);
  env.page.hidden = true;
  env.page.dispatchEvent(new Event("visibilitychange"));
  env.host.dispatchEvent(new Event("focus"));
  assert.equal(env.timers.size, 0);
  assert.equal(calls, 2);
  env.page.hidden = false;
  env.page.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.equal(calls, 3);
  stop();
  env.host.dispatchEvent(new Event("focus"));
  env.host.dispatchEvent(new Event("online"));
  env.page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(calls, 3);
  assert.equal(env.timers.size, 0);
});

test("slow message requests never overlap even when multiple wake events arrive", async () => {
  const env = environment();
  let calls = 0, release;
  const stop = startChatPolling(async () => {
    calls++;
    await new Promise(resolve => { release = resolve; });
  }, env.options);
  env.host.dispatchEvent(new Event("focus"));
  env.host.dispatchEvent(new Event("online"));
  assert.equal(calls, 1);
  assert.equal(env.timers.size, 0);
  release();
  await settle();
  assert.equal([...env.timers.values()][0].delay, 0);
  const next = env.tick();
  assert.equal(calls, 2);
  release();
  await next;
  stop();
});

test("leaving a conversation aborts its pending request and prevents late updates", async () => {
  const env = environment();
  let signal, release, updates = 0;
  const stop = startChatPolling(async currentSignal => {
    signal = currentSignal;
    await new Promise(resolve => { release = resolve; });
    if (!signal.aborted) updates++;
  }, env.options);
  stop();
  assert.equal(signal.aborted, true);
  release();
  await settle();
  assert.equal(updates, 0);
  assert.equal(env.timers.size, 0);
});

test("a temporary network failure retries automatically and recovers", async () => {
  const env = environment(), errors = [];
  let calls = 0;
  const stop = startChatPolling(async () => {
    if (++calls === 1) throw new Error("Offline");
  }, { ...env.options, onError: error => errors.push(error.message) });
  await settle();
  assert.deepEqual(errors, ["Offline"]);
  await env.tick();
  assert.equal(calls, 2);
  assert.equal(env.timers.size, 1);
  stop();
});

test("live updates retain earlier history, order new messages, and preserve read receipts", () => {
  const history = message("old", "2026-10-30T09:00:00Z");
  const recent = message("recent", "2026-10-31T10:00:00Z", { isRead: true });
  const reply = message("reply", "2026-10-31T10:00:01Z");
  const merged = mergeChatMessages([recent, history], [reply, { ...recent, isRead: false }]);
  assert.deepEqual(merged.map(m => m.id), ["old", "recent", "reply"]);
  assert.equal(merged[1].isRead, true);
  assert.equal(mergeChatMessages(merged, [{ ...reply, isRead: true }])[2].isRead, true);
});
