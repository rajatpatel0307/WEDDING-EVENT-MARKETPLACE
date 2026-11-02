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
      className="mn-profile [&_.mn-panel_>_button]:flex [&_.mn-panel_>_button]:items-center [&_.mn-panel_>_button]:justify-between [&_.mn-panel_>_button]:gap-[10px] [&_.mn-panel_>_button]:w-full [&_.mn-panel_>_button]:py-[10px] [&_.mn-panel_>_button]:px-[12px] [&_.mn-panel_>_button]:rounded-[4px] [&_.mn-panel_>_button]:text-[12px] [&_.mn-panel_>_button:hover]:bg-[#f6eeeb] max-[768px]:[&_.mn-panel]:min-w-[210px]"
      label={
        <>
          <span className="mn-avatar rounded-full bg-[#efe0de] w-[30px] h-[30px] grid place-items-center text-[#8c414e] font-[Georgia,serif] text-[16px] max-[768px]:w-[28px] max-[768px]:h-[28px]">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              user.firstName?.[0]
            )}
          </span>
          <span className="mn-profile-name max-[768px]:hidden">{user.firstName}</span>
          <ChevronDown size={12} />
        </>
      }
    >
      <div className="mn-profile-summary py-[9px] px-[12px] border-b border-b-[#ece4df] mb-[5px] [&_>_*]:block [&_small]:text-[#8f7d7e]">
        <strong>
          {user.firstName} {user.lastName}
        </strong>
        <small>{user.role} account</small>
      </div>
      {profileFor(user).map(([name, path]) => (
        <Link key={name} to={path} onClick={() => setOpen(null)}>
          {name}
          {name === "Messages" && user.unreadMessageCount > 0 && (
            <span className="mn-count bg-[#8c414e] text-white py-0 px-[5px] rounded-[10px] text-[9px] min-w-[16px] text-center">{user.unreadMessageCount}</span>
          )}
          {name === "Notifications" && user.unreadNotificationCount > 0 && (
            <span className="mn-count bg-[#8c414e] text-white py-0 px-[5px] rounded-[10px] text-[9px] min-w-[16px] text-center">{user.unreadNotificationCount}</span>
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
