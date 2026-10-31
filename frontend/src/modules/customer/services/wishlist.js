import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "../../../context/AuthContext";
import { customerRequest, save } from "./workspace.api";
import { createWishlistStore } from "./wishlist-store";
const store = createWishlistStore({
  list: () => customerRequest("/wishlist"),
  add: (body) => save("/wishlist", "POST", body),
  remove: (id) => save(`/wishlist/${id}`, "DELETE", {}),
});
export function useWishlist() {
  const { user } = useAuth(),
    owner = user?.role === "Customer" ? user.id : null;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.activate(owner);
    const focus = () => store.refresh(owner);
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [owner]);
  const rows = state.owner === owner ? state.rows : [];
  return {
    ...state,
    rows,
    find: (type, id) =>
      state.owner === owner ? store.find(type, id) : undefined,
    refresh: () => store.refresh(owner),
    toggle: (type, id) => store.toggle(owner, type, id),
  };
}
