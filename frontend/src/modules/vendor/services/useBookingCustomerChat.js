import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vendorRequest } from "./workspace.api";

export default function useBookingCustomerChat() {
  const navigate = useNavigate();
  const [openingBookingId, setOpeningBookingId] = useState(null);
  const [chatError, setChatError] = useState("");
  const pending = useRef(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function openCustomerChat(bookingId) {
    if (!bookingId || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setOpeningBookingId(bookingId);
    setChatError("");
    try {
      const conversation = await vendorRequest("/conversations", {
        method: "POST",
        body: JSON.stringify({ bookingId }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!conversation?.id) throw new Error("Unable to open the customer conversation. Please try again.");
      navigate(`/vendor/messages?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      if (!controller.signal.aborted) setChatError(error.message || "Unable to open the customer conversation. Please try again.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setOpeningBookingId(null);
    }
  }

  return { openCustomerChat, openingBookingId, chatError };
}
