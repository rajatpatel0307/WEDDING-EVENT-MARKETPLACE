import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { startChatPolling } from "../services/chat-sync";
import { useCommunicationSocket } from "../modules/communication/useCommunicationSocket";

export function useCommunicationCounts(request) {
  const socket = useCommunicationSocket();
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => window.dispatchEvent(new Event("chat:read")),
        100,
      );
    };
    const events = [
      "receive_message",
      "message_read",
      "message_deleted",
      "conversation_updated",
      "notification_count_updated",
    ];
    events.forEach((e) => socket?.on(e, update));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => socket?.off(e, update));
    };
  }, [socket]);
  const { user, setUser } = useAuth();
  const owner = user?.id;
  useEffect(() => {
    if (!owner) return;
    return startChatPolling(
      async (signal) => {
        const counts = await request("/communications/counts", {
          signal,
          cache: "no-store",
        });
        if (signal.aborted) return;
        setUser((previous) => {
          if (previous?.id !== owner) return previous;
          const keys = [
            "wishlistCount",
            "unreadMessageCount",
            "unreadNotificationCount",
          ];
          if (keys.every((key) => previous[key] === counts[key]))
            return previous;
          return {
            ...previous,
            ...Object.fromEntries(keys.map((key) => [key, counts[key]])),
          };
        });
      },
      { interval: 5000, events: ["focus", "online", "chat:read"] },
    );
  }, [owner, request, setUser]);
}
