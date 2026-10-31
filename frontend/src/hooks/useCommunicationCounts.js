import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { startChatPolling } from "../services/chat-sync";

export function useCommunicationCounts(request) {
  const { user, setUser } = useAuth();
  const owner = user?.id;
  useEffect(() => {
    if (!owner) return;
    return startChatPolling(async signal => {
      const counts = await request("/communications/counts", { signal, cache: "no-store" });
      if (signal.aborted) return;
      setUser(previous => {
        if (previous?.id !== owner) return previous;
        const keys = ["wishlistCount", "unreadMessageCount", "unreadNotificationCount"];
        if (keys.every(key => previous[key] === counts[key])) return previous;
        return { ...previous, ...Object.fromEntries(keys.map(key => [key, counts[key]])) };
      });
    }, { interval: 5000, events: ["focus", "online", "chat:read"] });
  }, [owner, request, setUser]);
}
