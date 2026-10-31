import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useWishlist } from "../services/wishlist";
export default function WishlistButton({
  type = "Service",
  id,
  className = "cw-button",
}) {
  const { user, notify, reload } = useAuth(),
    wish = useWishlist(),
    navigate = useNavigate(),
    location = useLocation(),
    [busy, setBusy] = useState(false),
    resumed = useRef(false);
  const saved = !!wish.find(type, id),
    key = `wishlist-intent:${type}:${id}`;
  async function toggle() {
    if (!user) {
      sessionStorage.setItem(key, "save");
      navigate(
        `/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    if (user.role !== "Customer") {
      notify("Sign in as a customer to save favorites.");
      return;
    }
    setBusy(true);
    try {
      const result = await wish.toggle(type, id);
      notify(result.message);
      await reload();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      user?.role !== "Customer" ||
      wish.loading ||
      wish.owner !== user.id ||
      resumed.current ||
      !sessionStorage.getItem(key)
    )
      return;
    resumed.current = true;
    sessionStorage.removeItem(key);
    if (!saved) toggle();
  }, [user?.id, wish.owner, wish.loading, saved, key]);
  return (
    <button
      type="button"
      className={className}
      disabled={busy || (user?.role === "Customer" && wish.loading)}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove saved ${type.toLowerCase()}`
          : `Save ${type.toLowerCase()}`
      }
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save to wishlist"}
    </button>
  );
}
