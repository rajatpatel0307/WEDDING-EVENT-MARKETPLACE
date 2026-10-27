import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { profileFor } from "./navigation";
import Popover from "./Popover";
export default function ProfileDropdown({ open, setOpen }) {
  const { user, logout, notify } = useAuth(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function signout() {
    setBusy(true);
    try {
      await logout();
      setOpen(null);
      navigate("/");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Popover
      name="profile"
      open={open}
      setOpen={setOpen}
      className="mn-profile"
      label={
        <>
          <span className="mn-avatar">{user.firstName?.[0]}</span>
          <span className="mn-profile-name">{user.firstName}</span>
          <ChevronDown size={12} />
        </>
      }
    >
      <div className="mn-profile-summary">
        <strong>
          {user.firstName} {user.lastName}
        </strong>
        <small>{user.role} account</small>
      </div>
      {profileFor(user).map(([name, path]) => (
        <Link key={name} to={path} onClick={() => setOpen(null)}>
          {name}
          {name === "Messages" && user.unreadMessageCount > 0 && (
            <span className="mn-count">{user.unreadMessageCount}</span>
          )}
          {name === "Notifications" && user.unreadNotificationCount > 0 && (
            <span className="mn-count">{user.unreadNotificationCount}</span>
          )}
        </Link>
      ))}
      <button disabled={busy} onClick={signout}>
        <LogOut size={15} />
        {busy ? "Signing out…" : "Logout"}
      </button>
    </Popover>
  );
}
