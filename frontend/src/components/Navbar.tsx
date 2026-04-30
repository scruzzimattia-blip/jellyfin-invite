import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-white">
          Jellyfin Invite
        </Link>
        <nav className="flex items-center gap-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `text-sm font-medium transition ${
                isActive ? "text-purple-200" : "text-slate-400 hover:text-white"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/invitations"
            className={({ isActive }) =>
              `text-sm font-medium transition ${
                isActive ? "text-purple-200" : "text-slate-400 hover:text-white"
              }`
            }
          >
            Einladungen
          </NavLink>
          <span className="text-sm text-slate-300">{user?.username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-purple-400 hover:text-white"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
