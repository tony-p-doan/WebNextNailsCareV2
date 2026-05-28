import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {getEmployee, updateEmployee, listServices} from "../../../data/store/storeApi";
import type {Service} from "../../../domain/models/Store";
import {serviceIsComplete} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";

export function EditEmployeePage() {
  const {employeeId} = useParams<{employeeId: string}>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const storeId = getActiveStoreId();

  useEffect(() => {
    if (!storeId || !employeeId) return;
    getEmployee(storeId, employeeId).then((emp) => {
      if (emp) {
        setFirstName(emp.firstName);
        setLastName(emp.lastName);
        setAccountEmail(emp.accountEmail ?? "");
        setSelectedIds(new Set(emp.serviceIds));
      }
    });
    listServices(storeId).then(setServices);
  }, [storeId, employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !employeeId) return;
    setLoading(true);
    try {
      await updateEmployee(storeId, employeeId, firstName.trim(), lastName.trim(), [...selectedIds], accountEmail);
      navigate("/store-admin/employees", {replace: true});
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteEmployee() {
    if (!storeId || !employeeId || !accountEmail.trim()) return;
    setInviteLoading(true);
    setMessage("");
    try {
      await updateEmployee(storeId, employeeId, firstName.trim(), lastName.trim(), [...selectedIds], accountEmail);
      const result = await FunctionsClient.inviteEmployee(storeId, employeeId, accountEmail);
      setMessage(result.status === "invited" ? "Employee registration email sent." : "Employee access email sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not invite employee.");
    } finally {
      setInviteLoading(false);
    }
  }

  function toggleService(id: string, enabled: boolean) {
    if (!enabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <AppBar title="Edit Employee" backTo="/store-admin/employees" />
      <div className="page-bg">
        <main className="container" style={{maxWidth: "480px", paddingTop: "1.5rem"}}>
          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="accountEmail">Account Email</label>
                <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "end"}}>
                  <input
                    id="accountEmail"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="employee@example.com"
                  />
                  <button
                    type="button"
                    className="btn btn--outline"
                    disabled={inviteLoading || !firstName.trim() || !lastName.trim() || !accountEmail.trim()}
                    onClick={handleInviteEmployee}
                    style={{whiteSpace: "nowrap", minHeight: 44}}
                  >
                    {inviteLoading ? "Inviting..." : "Invite Employee"}
                  </button>
                </div>
              </div>
              {message && <p className={message.includes("Could not") ? "error-message" : "success-message"}>{message}</p>}
              {services.length > 0 && (
                <div style={{marginTop: "1rem"}}>
                  <p className="nnc-label" style={{marginBottom: "0.75rem"}}>Services This Employee Offers</p>
                  {services.map((svc) => {
                    const enabled = serviceIsComplete(svc);
                    return (
                      <label
                        key={svc.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.6rem",
                          marginBottom: "0.6rem", cursor: enabled ? "pointer" : "not-allowed",
                          opacity: enabled ? 1 : 0.5,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(svc.id)}
                          onChange={() => toggleService(svc.id, enabled)}
                          disabled={!enabled}
                          style={{width: 18, height: 18, accentColor: "var(--color-primary)"}}
                        />
                        <span style={{fontSize: "0.95rem"}}>
                          {svc.icon} {svc.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <button type="submit" className="btn--primary-full" disabled={loading} style={{marginTop: "1.25rem"}}>
                {loading ? "Saving…" : "Update Employee"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
