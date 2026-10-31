import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import { mutate } from "../../services/apollo";
import { communicationOrigin } from "./api";
let shared,
  owner,
  refs = 0;
export function useCommunicationSocket() {
  const { user } = useAuth(),
    [socket, setSocket] = useState(null);
  useEffect(() => {
    if (!user?.id) return;
    if (shared && owner !== user.id) {
      shared.disconnect();
      shared = null;
      refs = 0;
    }
    if (!shared) {
      owner = user.id;
      shared = io(communicationOrigin, {
        withCredentials: true,
        autoConnect: false,
      });
      const current = shared;
      let refreshing = false,
        lastRefresh = 0;
      const refresh = async () => {
        if (refreshing || Date.now() - lastRefresh < 10000) return;
        refreshing = true;
        lastRefresh = Date.now();
        try {
          await mutate("refreshToken");
          if (shared === current && refs) current.connect();
        } catch {
          /* REST surfaces session errors. */
        } finally {
          refreshing = false;
        }
      };
      current.on("connect_error", refresh);
      current.on("disconnect", (reason) => {
        if (reason === "io server disconnect") refresh();
      });
    }
    const current = shared;
    refs++;
    setSocket(current);
    current.connect();
    return () => {
      if (shared === current && --refs === 0) {
        current.disconnect();
        shared = null;
        owner = null;
      }
    };
  }, [user?.id]);
  return socket;
}
