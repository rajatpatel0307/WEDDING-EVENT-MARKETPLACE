import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, X, MapPin } from "lucide-react";
import { navigationFor, profileFor, cities } from "./navigation";
import { useServiceGroups, servicePath } from "./services";
import SearchBar from "./SearchBar";
import Logo from "../common/Logo";
import IconButton from "../common/IconButton";
export default function MobileNavbar({ user, city, setCity, close }) {
  const serviceGroups = useServiceGroups();
  const { logout, notify } = useAuth(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function signout() {
    setBusy(true);
    try {
      await logout();
      close();
      navigate("/");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mn-drawer-content">
      <div className="mn-drawer-top">
        <Logo />
        <IconButton label="Close navigation" onClick={close}>
          <X size={22} />
        </IconButton>
      </div>
      <SearchBar city={city} onSearch={close} />
      <label className="mn-mobile-city">
        <MapPin size={16} />
        <span className="sr-only">Your city</span>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <nav aria-label="Mobile navigation">
        {navigationFor(user).map(([name, path]) =>
          name === "Services" && path === "/services" ? (
            <details key={name}>
              <summary>
                Services <ChevronDown size={16} />
              </summary>
              <Link to="/services" onClick={close}>
                All services
              </Link>
              {serviceGroups.map((g) => (
                <div className="mn-mobile-services" key={g.name}>
                  <h3>{g.name}</h3>
                  {g.items.map(([n]) => (
                    <Link key={n} to={servicePath(n)} onClick={close}>
                      {n}
                    </Link>
                  ))}
                </div>
              ))}
            </details>
          ) : (
            <NavLink key={name} to={path} end onClick={close}>
              {name}
            </NavLink>
          ),
        )}
        <Link to="/about" onClick={close}>
          About us
        </Link>
        <Link to="/contact" onClick={close}>
          Contact us
        </Link>
      </nav>
      <div className="mn-drawer-account">
        {user ? (
          <>
            <strong>
              {user.firstName} · {user.role}
            </strong>
            {profileFor(user).map(([n, p]) => (
              <Link key={n} to={p} onClick={close}>
                {n}
              </Link>
            ))}
            <button
              className="mn-mobile-logout"
              disabled={busy}
              onClick={signout}
            >
              {busy ? "Signing out..." : "Logout"}
            </button>
          </>
        ) : (
          <>
            <p>Your beautiful beginning starts here.</p>
            <Link className="mn-button" to="/auth/signup" onClick={close}>
              Get started
            </Link>
            <Link to="/auth/login" onClick={close}>
              Already a member? Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
