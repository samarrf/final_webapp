import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function Login() {
  const [type, setType] = useState("landlord");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();


  async function loginUser(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const user = await login(email, password, type);
      navigate(user.role === "landlord" ? "/dashboard" : "/portal");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="card login-card">
        <div className="login-heading">
          <h1>Log in</h1>
          <p>Enter your account information to continue.</p>
        </div>

        <form onSubmit={loginUser}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="role">Log in as</label>
            <select
              id="role"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="landlord">Landlord</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>

          {message && (
            <p className="login-error" role="alert">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

      </div>
    </main>
  );
}