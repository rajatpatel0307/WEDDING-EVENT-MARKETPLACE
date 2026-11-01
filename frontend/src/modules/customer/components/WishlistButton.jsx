import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useWishlist } from "../services/wishlist";
export default function WishlistButton({
  type = "Service",
  id,
  className = "cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]",
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
