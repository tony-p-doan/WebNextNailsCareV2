import {useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {AppBar} from "../../core/ui/AppBar";
import {AuthService} from "../../core/auth/AuthService";
import {useAuth} from "../../core/auth/AuthContext";
import {getStoresForAdmin} from "../../data/store/storeApi";
import {setActiveStoreId} from "../storeadmin/storeAdminContext";

export function LoginPage() {
  const {signIn} = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailOrUsername, setResetEmailOrUsername] = useState("");
  const [resetError, setResetError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(emailOrUsername, password);
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("Sign-in succeeded but no user found.");
      const profile = await AuthService.getProfile(user.uid);
      if (!profile) {
        setError(`No profile found for UID ${user.uid}. Make sure the Firestore users document ID matches this UID.`);
        setLoading(false);
        return;
      }
      const adminStores = await getStoresForAdmin(user.uid);
      const hasStoreAdminAccess = adminStores.length > 0;
      if (hasStoreAdminAccess) {
        const primary = adminStores.find((s) => s.id === user.uid) ?? adminStores[0];
        setActiveStoreId(primary.id);
      }
      let destination = "/customer";
      if (profile.role === "storeadmin" || hasStoreAdminAccess) destination = "/store-admin";
      if (profile.role === "employee") destination = "/provider";
      if (profile.role === "superadmin") destination = "/super-admin";
      if (
        redirectTo &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//") &&
        (
          (profile.role === "customer" && redirectTo.startsWith("/customer")) ||
          ((profile.role === "storeadmin" || hasStoreAdminAccess) && redirectTo.startsWith("/store-admin")) ||
          (profile.role === "employee" && redirectTo.startsWith("/provider")) ||
          (profile.role === "superadmin" && redirectTo.startsWith("/super-admin"))
        )
      ) {
        destination = redirectTo;
      }
      navigate(destination, {replace: true});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    const emailOrUsername = resetEmailOrUsername.trim();
    if (!emailOrUsername) {
      setResetError("Enter your email or username.");
      return;
    }
    setResetLoading(true);
    try {
      await AuthService.sendPasswordReset(emailOrUsername);
      setResetMessage("Password reset email sent. Open the link in your email to set a new password.");
      setShowResetModal(false);
      setResetEmailOrUsername("");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not send password reset email.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <>
      <AppBar title="Next Nails Care" backTo="/customer" />
      {showResetModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div className="nnc-card" style={{width: "100%", maxWidth: 420, padding: "1.5rem"}}>
            <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
              Reset Password
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
              Enter your email or username. We'll check for an account before sending the reset link.
            </p>
            <form onSubmit={handlePasswordReset}>
              <div className="form-group">
                <label htmlFor="resetEmailOrUsername">Email / Username</label>
                <input
                  id="resetEmailOrUsername"
                  type="text"
                  autoComplete="username"
                  value={resetEmailOrUsername}
                  onChange={(e) => {
                    setResetEmailOrUsername(e.target.value);
                    setResetError("");
                  }}
                  autoFocus
                  required
                />
              </div>
              {resetError && <p className="error-message">{resetError}</p>}
              <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
                <button
                  type="button"
                  className="btn btn--outline btn--full"
                  disabled={resetLoading}
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn--primary-full"
                  disabled={resetLoading || !resetEmailOrUsername.trim()}
                >
                  {resetLoading ? "Sending…" : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="page-bg">
        <main className="container" style={{paddingTop: "2rem", maxWidth: 480}}>
          <div className="form-card">
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem"}}>
              <div
                className="icon-circle"
                style={{background: "linear-gradient(135deg,#a78bfa,#7c3aed)"}}
              >
                🔐
              </div>
              <div>
                <h2 style={{margin: 0, fontSize: "1.25rem", color: "var(--color-text)"}}>Log in</h2>
                <p style={{margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)"}}>Welcome back to Next Nails Care</p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="emailOrUsername">Email or Username</label>
                <input
                  id="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="error-message">{error}</p>}
              {resetMessage && <p className="success-message">{resetMessage}</p>}
              <button
                type="submit"
                className="btn--primary-full"
                disabled={loading}
                style={{marginTop: "0.75rem"}}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                className="btn btn--outline btn--full"
                disabled={resetLoading}
                onClick={() => {
                  setResetEmailOrUsername(emailOrUsername);
                  setResetError("");
                  setShowResetModal(true);
                }}
                style={{marginTop: "0.75rem"}}
              >
                Forgot password?
              </button>
            </form>
            <p style={{marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)", textAlign: "center"}}>
              Don't have an account?{" "}
              <Link to="/customer/register" style={{color: "var(--color-primary)", fontWeight: 600}}>Create one</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
