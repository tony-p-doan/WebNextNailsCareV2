import {useEffect, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {AppBar} from "../../core/ui/AppBar";
import {AuthService} from "../../core/auth/AuthService";
import {FunctionsClient, type EmployeeInvitePreview} from "../../data/functions/FunctionsClient";

export function EmployeeRegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? "";
  const [preview, setPreview] = useState<EmployeeInvitePreview | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  useEffect(() => {
    if (!inviteToken) {
      setError("This employee registration link is missing an invite token.");
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const next = await FunctionsClient.previewEmployeeInvite(inviteToken);
      if (cancelled) return;
      if (!next) {
        setError("This employee invitation link is invalid or expired.");
        setInviteLoading(false);
        return;
      }
      setPreview(next);
      setForm((prev) => ({...prev, email: next.email}));
      setInviteLoading(false);
    })();
    return () => { cancelled = true; };
  }, [inviteToken]);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({...prev, [field]: field === "phoneNumber" ? formatPhone(value) : value}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!preview) { setError("This employee invitation link is invalid or expired."); return; }
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    if (!form.lastName.trim()) { setError("Last name is required."); return; }
    if (!form.phoneNumber.trim()) { setError("Phone number is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await AuthService.signUpEmployee({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: preview.email,
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
      });
      await FunctionsClient.acceptEmployeeInvite(inviteToken);
      navigate("/provider", {replace: true});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppBar title="Next Nails Care" backTo="/login" />
      <div className="page-bg" style={{overflowX: "hidden"}}>
        <main className="container" style={{paddingTop: "2rem", maxWidth: 480, width: "100%"}}>
          <div className="form-card" style={{width: "100%", boxSizing: "border-box"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem"}}>
              <div className="icon-circle" style={{background: "linear-gradient(135deg,#a78bfa,#7c3aed)", flexShrink: 0}}>
                👤
              </div>
              <div>
                <h2 style={{margin: 0, fontSize: "1.25rem", color: "var(--color-text)"}}>Create Employee Account</h2>
                <p style={{margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)"}}>
                  {preview ? `Join ${preview.storeName || "this store"}` : "Accept your employee invite"}
                </p>
              </div>
            </div>
            {inviteLoading && <p className="loading-text">Loading invitation...</p>}
            {preview && (
              <div style={{background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius-sm)", padding: "0.75rem", marginBottom: "1rem"}}>
                <p style={{margin: 0, fontWeight: 700, color: "#3730a3"}}>Employee invitation</p>
                <p style={{margin: "0.25rem 0 0", color: "#4338ca", fontSize: "0.85rem"}}>
                  Register with {preview.email} to work with {preview.storeName || "this store"}.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="firstName">First name *</label>
                <input id="firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name *</label>
                <input id="lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input id="email" type="email" value={form.email} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone number *</label>
                <input id="phoneNumber" type="tel" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} />
              </div>
              {error && <p className="error-message">{error}</p>}
              <button type="submit" className="btn--primary-full" disabled={loading || inviteLoading || !preview}>
                {loading ? "Creating account..." : "Create employee account"}
              </button>
            </form>
            <p style={{marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)", textAlign: "center"}}>
              Already have an account? <Link to="/login" style={{color: "var(--color-primary)", fontWeight: 600}}>Log in</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
