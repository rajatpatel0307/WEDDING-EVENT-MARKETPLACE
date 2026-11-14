import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  customerRequest,
  save,
  money,
} from "../customer/services/workspace.api";
import { offerState } from "./offer-state";

export function OfferPrices({ item }) {
  const s = offerState(item);
  if (!s.type) return null;
  return (
    <div className="commerce-price my-3 flex flex-wrap gap-[18px] [&_small]:mb-1 [&_small]:block [&_small]:text-[11px] [&_strong]:text-[17px] [&_p]:my-1 [&_p]:text-[12px]">
      {s.type !== "Book" && (
        <div>
          <small>Selling Price</small>
          <strong>{money(s.sellingPrice)}</strong>
          <p>{s.stock} in stock</p>
        </div>
      )}
      {s.type !== "Sell" && (
        <div>
          <small>Booking Price</small>
          <strong>{money(s.bookingPrice)}</strong>
          <p>
            {item.offer?.book?.mode === "Quantity"
              ? "Quantity reservation"
              : "Per unit / duration"}
          </p>
        </div>
      )}
    </div>
  );
}
export default function OfferActions({ item }) {
  const { user, notify } = useAuth(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    s = offerState(item),
    id = item.serviceId || item.id;
  if (!s.type) return null;
  async function add(buy) {
    const redirect = `/customer/cart?service=${id}`;
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setBusy(true);
    try {
      const current = await customerRequest(`/services/${id}`);
      await save("/cart/items", "PUT", {
        serviceId: id,
        quantity: current.service.offer?.sell?.minimum || 1,
      });
      if (buy) navigate("/customer/cart");
      else notify("Added to your cart.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  const book = `/customer/booking-checkout/${id}`;
  return (
    <div className="commerce-offer-actions my-[14px] flex flex-wrap gap-[10px] [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-[#dde4d7] [&_button]:bg-white [&_button]:px-[15px] [&_button]:py-[10px] [&_button]:text-[12px] [&_button]:text-[#48664e] [&_a]:cursor-pointer [&_a]:rounded-[7px] [&_a]:border [&_a]:border-[#dde4d7] [&_a]:bg-white [&_a]:px-[15px] [&_a]:py-[10px] [&_a]:text-[12px] [&_a]:text-[#48664e] [&_a]:no-underline [&_.cm-primary]:border-[#355d43] [&_.cm-primary]:bg-[#355d43] [&_.cm-primary]:text-white [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#688b70] cm-actions">
      {s.canSell && (
        <>
          <button disabled={busy} onClick={() => add(false)}>
            Add to Cart
          </button>
          <button
            className="cm-primary"
            disabled={busy}
            onClick={() => add(true)}
          >
            Buy Now
          </button>
        </>
      )}
      {s.canBook && (
        <Link
          className="cm-button cm-primary"
          to={user ? book : `/auth/login?redirect=${encodeURIComponent(book)}`}
        >
          Book Now
        </Link>
      )}
      {!s.canSell && !s.canBook && (
        <span role="status">Currently unavailable</span>
      )}
    </div>
  );
}
