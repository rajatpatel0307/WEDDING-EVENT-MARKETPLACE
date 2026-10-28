import { createContext, useContext, useEffect, useRef, useState } from "react";
import { client, ME, mutate } from "../services/apollo";
const AuthContext = createContext(null);
export { destination } from "../routes/authNavigation";
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
        <div className="toast fixed bottom-[24px] left-[50%] [transform:translateX(-50%)] [background:#473c3f] text-white [padding:15px_20px] rounded-[8px] [box-shadow:0_6px_25px_#0002] z-[100] flex items-center gap-[20px] text-[12px] max-w-[calc(100%_-_32px)] w-[max-content] [&_button]:border-0 [&_button]:bg-transparent [&_button]:[color:#dbc7cc] [&_button]:text-[20px]" role="status">
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
