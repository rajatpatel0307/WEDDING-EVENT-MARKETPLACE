let server;
export const setRealtimeServer = (value) => {
  server = value;
};
export const userRoom = (id) => `user:${id.toLowerCase()}`;
export const conversationRoom = (id) => `conversation:${id.toLowerCase()}`;
export function emitUser(id, event, payload) {
  server?.to(userRoom(id)).emit(event, payload);
}
export function emitConversation(id, event, payload) {
  server?.to(conversationRoom(id)).emit(event, payload);
}
export function afterCommit(tx, fn) {
  // A realtime failure must never turn a committed write into an API failure.
  const safe = () => {
    try {
      fn();
    } catch {
      /* REST reconciliation recovers missed events. */
    }
  };
  if (tx) tx.afterCommit(safe);
  else safe();
}
