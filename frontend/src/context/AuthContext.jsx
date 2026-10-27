import { createContext, useContext, useEffect, useRef, useState } from "react";
import { client, ME, mutate } from "../services/apollo";
const AuthContext = createContext(null);
export function destination(user) {
  if (user?.role === "Admin") return "/admin/dashboard";
  if (
    user?.role === "Vendor" &&
    user.vendor?.verificationStatus === "Approved" &&
    !user.vendor.active
  )
    return "/vendor/inactive";
  if (user?.role === "Vendor")
    return `/vendor/${{ Approved: "dashboard", Rejected: "rejected", Suspended: "suspended" }[user.vendor?.verificationStatus] || "pending"}`;
  return "/customer/dashboard";
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [resetToken, setResetToken] = useState("");
  const refreshing = useRef(null),
    timer = useRef();
  function notify(message) {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 6000);
  }
  async function refresh() {
    if (!refreshing.current)
      refreshing.current = mutate("refreshToken")
        .then((r) => {
          setUser((previous) =>
            previous?.id === r.user?.id ? { ...previous, ...r.user } : r.user,
          );
          return r.user;
        })
        .catch(() => {
          setUser(null);
          return null;
        })
        .finally(() => {
          refreshing.current = null;
        });
    return refreshing.current;
  }
  async function reload() {
    const { data } = await client.query({
      query: ME,
      fetchPolicy: "network-only",
    });
    setUser(data.me);
    return data.me;
  }
  useEffect(() => {
    let live = true;
    client
      .query({ query: ME })
      .then(async ({ data }) => {
        if (!live) return;
        if (data.me) setUser(data.me);
        else await refresh();
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!user?.id || user.wishlistCount !== undefined) return;
    let live = true;
    client
      .query({ query: ME, fetchPolicy: "network-only" })
      .then(({ data }) => {
        if (live && data.me) setUser(data.me);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => refresh(), 8 * 60000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);
  async function logout() {
    await mutate("logout");
    setUser(null);
    await client.clearStore();
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        notify,
        logout,
        reload,
        refresh,
        resetToken,
        setResetToken,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
