import {useEffect, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {AuthService} from "../../../core/auth/AuthService";
import {isAddressTaken} from "../../../data/store/storeApi";
import {
  FunctionsClient,
  InvitePreview,
} from "../../../data/functions/FunctionsClient";

export function StoreAdminRegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");
  const isInviteFlow = Boolean(inviteToken);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteLoading, setInviteLoading] = useState(isInviteFlow);
  const [inviteError, setInviteError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    businessName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setInviteLoading(true);
      setInviteError("");
      const preview = await FunctionsClient.previewStoreAdminInvite(inviteToken);
      if (cancelled) return;
      if (!preview) {
        setInvitePreview(null);
        setInviteError("This invitation link is invalid or expired.");
        setInviteLoading(false);
        return;
      }
      setInvitePreview(preview);
      setForm((prev) => ({...prev, email: preview.email}));
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
    const formatted = field === "phoneNumber" ? formatPhone(value) : value;
    setForm((prev) => ({...prev, [field]: formatted}));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim()) { setError("First name is required."); return; }
    if (!form.lastName.trim()) { setError("Last name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!form.phoneNumber.trim()) { setError("Phone number is required."); return; }
    if (!form.password) { setError("Password is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

    if (isInviteFlow) {
      if (inviteLoading) {
        setError("Please wait while we verify the invitation.");
        return;
      }
      if (!inviteToken || !invitePreview) {
        setError(inviteError || "This invitation link is invalid or expired.");
        return;
      }

      setLoading(true);
      try {
        await AuthService.signUpInvitedStoreAdmin({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: invitePreview.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          password: form.password,
        });
        await FunctionsClient.acceptStoreAdminInvite(inviteToken);
        navigate("/store-admin", {replace: true});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!form.businessName.trim()) { setError("Business name is required."); return; }
    if (!form.address.trim()) { setError("Address is required."); return; }
    if (!form.city.trim()) { setError("City is required."); return; }
    if (!form.state.trim()) { setError("State is required."); return; }
    if (!form.zip.trim()) { setError("ZIP code is required."); return; }

    setLoading(true);
    try {
      // Check for duplicate address before creating account
      const taken = await isAddressTaken(form.address, form.city, form.state, form.zip);
      if (taken) {
        setError("A salon at this address is already registered. Please use a different address.");
        setLoading(false);
        return;
      }

      await AuthService.signUpStoreAdmin({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        businessName: form.businessName.trim(),
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
                style={{background: "linear-gradient(135deg,#6ee7b7,#10b981)", flexShrink: 0}}
              >
                {isInviteFlow ? "🔑" : "🏬"}
              </div>
              <div>
                <h2 style={{margin: 0, fontSize: "1.25rem", color: "var(--color-text)"}}>
                  {isInviteFlow ? "Create Admin Account" : "List Your Salon"}
                </h2>
                <p style={{margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)"}}>
                  {isInviteFlow ? "Accept your store admin invite" : "Register as a store admin"}
                </p>
              </div>
            </div>
            {isInviteFlow && inviteLoading && (
              <p style={{margin: "0 0 1rem", color: "var(--color-text-muted)", fontSize: "0.9rem"}}>
                Loading invitation...
              </p>
            )}
            {isInviteFlow && inviteError && !inviteLoading && (
              <p className="error-message" style={{wordBreak: "break-word", whiteSpace: "normal"}}>
                {inviteError}
              </p>
            )}
            {invitePreview && (
              <div
                style={{
                  background: "#ecfdf5",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem 0.85rem",
                  marginBottom: "1rem",
                  border: "1px solid #a7f3d0",
                }}
              >
                <p style={{margin: 0, fontWeight: 700, color: "#065f46", fontSize: "0.9rem"}}>
                  You've been invited
                </p>
                <p style={{margin: "0.25rem 0 0", color: "#047857", fontSize: "0.82rem"}}>
                  Create an account with this email to become an admin for{" "}
                  {invitePreview.storeName || "this store"}.
                </p>
              </div>
            )}
            <p className="nnc-label">{isInviteFlow ? "Admin Information" : "Owner Information"}</p>
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
              {!isInviteFlow && (
                <>
                  <div style={{marginTop: "0.25rem"}}>
                    <p className="nnc-label">Business Information</p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessName">Business name *</label>
                    <input
                      id="businessName" type="text" autoComplete="organization"
                      value={form.businessName} onChange={(e) => update("businessName", e.target.value)} required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address">Street address *</label>
                    <input
                      id="address" type="text" autoComplete="street-address"
                      value={form.address} onChange={(e) => update("address", e.target.value)} required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    <input
                      id="city" type="text" autoComplete="address-level2"
                      value={form.city} onChange={(e) => update("city", e.target.value)} required
                    />
                  </div>
                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem"}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label htmlFor="state">State *</label>
                      <input
                        id="state" type="text" autoComplete="address-level1"
                        value={form.state} onChange={(e) => update("state", e.target.value)} required
                        placeholder="TX"
                      />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label htmlFor="zip">ZIP *</label>
                      <input
                        id="zip" type="text" autoComplete="postal-code"
                        value={form.zip} onChange={(e) => update("zip", e.target.value)} required
                        placeholder="78701"
                      />
                    </div>
                  </div>
                </>
              )}
              <div style={{marginTop: "1rem"}}>
                <p className="nnc-label">Account Credentials</p>
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email" type="email" autoComplete="email"
                  value={form.email} onChange={(e) => update("email", e.target.value)} required
                  disabled={isInviteFlow}
                  style={isInviteFlow ? {opacity: 0.7} : undefined}
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
                {loading ? "Registering..." : isInviteFlow ? "Register Admin" : "Register salon"}
              </button>
            </form>
            <p style={{marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)", textAlign: "center"}}>
              <Link to="/customer" style={{color: "var(--color-primary)", fontWeight: 600}}>← Back to home</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
