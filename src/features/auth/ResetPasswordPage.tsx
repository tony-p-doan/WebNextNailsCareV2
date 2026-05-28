import {useEffect, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {AppBar} from "../../core/ui/AppBar";
import {AuthService} from "../../core/auth/AuthService";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode") ?? "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(oobCode));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setLoading(false);
      setError("Password reset link is missing a reset code.");
      return;
    }
    AuthService.verifyPasswordResetCode(oobCode)
      .then(setEmail)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "This password reset link is invalid or expired.");
      })
      .finally(() => setLoading(false));
  }, [oobCode]);

  useEffect(() => {
    if (!oobCode) return;
    const isNativeCandidate = /Android|iPhone|iPad|Macintosh/i.test(navigator.userAgent);
    if (!isNativeCandidate) return;
    const code = encodeURIComponent(oobCode);
    const mode = encodeURIComponent(searchParams.get("mode") ?? "resetPassword");
    window.setTimeout(() => {
      window.location.href = `nextnailscare://reset-password?mode=${mode}&oobCode=${code}`;
    }, 300);
  }, [oobCode, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await AuthService.confirmPasswordReset(oobCode, newPassword);
      setMessage("Password updated. You can now sign in with your new password.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppBar title="Reset Password" backTo="/login" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "2rem", maxWidth: 480}}>
          <div className="form-card">
            <h2 style={{margin: "0 0 0.5rem", fontSize: "1.25rem"}}>Create a new password</h2>
            {email && (
              <p style={{margin: "0 0 1rem", color: "var(--color-text-muted)", fontSize: "0.9rem"}}>
                Resetting password for <strong>{email}</strong>
              </p>
            )}
            {loading ? (
              <p className="loading-text">Checking reset link…</p>
            ) : message ? (
              <>
                <p className="success-message">{message}</p>
                <Link to="/login" className="btn btn--primary btn--full" style={{marginTop: "1rem"}}>
                  Back to Login
                </Link>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button
                  type="submit"
                  className="btn--primary-full"
                  disabled={saving || !oobCode}
                  style={{marginTop: "0.75rem"}}
                >
                  {saving ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
