import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  customerRequest,
  save,
  money,
} from "../customer/services/workspace.api";
import { offerState } from "./offer-state";
import "./commerce.css";
export function OfferPrices({ item }) {
  const s = offerState(item);
  if (!s.type) return null;
  return (
    <div className="commerce-price">
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
    <div className="commerce-offer-actions cm-actions">
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
