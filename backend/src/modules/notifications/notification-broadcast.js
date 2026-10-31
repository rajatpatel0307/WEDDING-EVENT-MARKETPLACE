import { afterCommit, emitUser } from "../messaging/realtime-bus.js";
// Bridge existing transactional notification writers into the same realtime
// inbox without creating a second record or changing their lifecycle guards.
export function publishInsertedNotifications(rows, tx) {
  const users = new Set(
    (rows || []).map((r) => r.notificationUserId).filter(Boolean),
  );
  if (!users.size) return;
  afterCommit(tx, () => {
    for (const id of users) {
      emitUser(id, "new_notification", {});
      emitUser(id, "notification_count_updated", {});
    }
  });
}
