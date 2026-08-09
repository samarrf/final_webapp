import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }

  function active({ isActive }) {
    return isActive ? "nav-link active" : "nav-link";
  }

  const displayRole =
    user?.role === "landlord"
      ? "Landlord"
      : user?.role === "tenant"
        ? "Tenant"
        : "";

  return (
    <header className="header">
      <NavLink to="/" className="brand">
        HomeEase
      </NavLink>

      <nav className="topnav" aria-label="Main navigation">
        <NavLink to="/" end className={active}>
          Listings
        </NavLink>

        {user?.role === "landlord" && (
          <NavLink to="/dashboard" className={active}>
            Dashboard
          </NavLink>
        )}

        {user?.role === "tenant" && (
          <NavLink to="/portal" className={active}>
            Tenant Portal
          </NavLink>
        )}

        {!user && (
          <NavLink to="/login" className={active}>
            Login
          </NavLink>
        )}
      </nav>

      <div className="header-actions">
        {user ? (
          <>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{displayRole}</span>
              </div>

            <button
              type="button"
              className="logout-button"
              onClick={signOut}
            >
              Logout
            </button>
          </>
        ) : (
          <span className="guest-label">Guest</span>
        )}
      </div>
    </header>
  );
}