import { useEffect, useRef } from "react";
import { useCommunicationSocket } from "../communication/useCommunicationSocket";

export function useOrderUpdates(refresh, orderId) {
  const socket = useCommunicationSocket();
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  useEffect(() => {
    let pending;
    const update = event => {
      if (orderId && event?.id && event.id.toLowerCase() !== orderId.toLowerCase()) return;
      clearTimeout(pending);
      pending = setTimeout(() => callback.current(), 120);
    };
    const reconcile = () => { if (!document.hidden) update(); };
    socket?.on("order_updated", update);
    socket?.on("connect", reconcile);
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    const timer = window.setInterval(reconcile, 20000);
    return () => {
      clearTimeout(pending); window.clearInterval(timer);
      socket?.off("order_updated", update); socket?.off("connect", reconcile);
      window.removeEventListener("focus", reconcile); window.removeEventListener("online", reconcile);
    };
  }, [socket, orderId]);
}
