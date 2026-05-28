import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {AuthService} from "../../../core/auth/AuthService";

export function CustomerRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function update(field: keyof typeof form, value: string) {
    const formatted = field === "phoneNumber" ? formatPhone(value) : value;
    setForm((prev) => ({...prev, [field]: formatted}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Explicit required-field validation
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    if (!form.lastName.trim()) { setError("Last name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!form.phoneNumber.trim()) { setError("Phone number is required."); return; }
    if (!form.password) { setError("Password is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      await AuthService.signUpCustomer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
      });
      navigate("/customer", {replace: true});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppBar title="Next Nails Care" backTo="/customer" />
      <div className="page-bg" style={{overflowX: "hidden"}}>
        <main className="container" style={{paddingTop: "2rem", maxWidth: 480, width: "100%"}}>
          <div className="form-card" style={{width: "100%", boxSizing: "border-box"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem"}}>
              <div
                className="icon-circle"
                style={{background: "linear-gradient(135deg,#6ee7f7,#3b82f6)", flexShrink: 0}}
              >
                🙋
              </div>
              <div>
                <h2 style={{margin: 0, fontSize: "1.25rem", color: "var(--color-text)"}}>Create Account</h2>
                <p style={{margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)"}}>Join Next Nails Care</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="firstName">First name *</label>
                <input
                  id="firstName" type="text" autoComplete="given-name"
                  value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name *</label>
                <input
                  id="lastName" type="text" autoComplete="family-name"
                  value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email" type="email" autoComplete="email"
                  value={form.email} onChange={(e) => update("email", e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone number *</label>
                <input
                  id="phoneNumber" type="tel" autoComplete="tel"
                  value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password" type="password" autoComplete="new-password"
                  value={form.password} onChange={(e) => update("password", e.target.value)}
                  required minLength={6} placeholder="Min 6 characters"
                />
              </div>
              {error && (
                <p className="error-message" style={{wordBreak: "break-word", whiteSpace: "normal"}}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="btn--primary-full"
                disabled={loading}
                style={{marginTop: "0.75rem"}}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
            <p style={{marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)", textAlign: "center"}}>
              Already have an account?{" "}
              <Link to="/login" style={{color: "var(--color-primary)", fontWeight: 600}}>Log in</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
