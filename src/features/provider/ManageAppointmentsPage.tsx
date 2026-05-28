import {useEffect, useState} from "react";
import {AppBar} from "../../core/ui/AppBar";
import {useAuth} from "../../core/auth/AuthContext";
import {FunctionsClient} from "../../data/functions/FunctionsClient";
import {getUpcomingAppointmentsForEmployee} from "../../data/appointmentApi";
import {getEmployeeStoresForUser} from "../../data/store/storeApi";
import type {SavedAppointment} from "../../domain/models/BookingAppointment";
import type {Employee, Store} from "../../domain/models/Store";

function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

export function ManageAppointmentsPage() {
  const {user} = useAuth();
  const [assignment, setAssignment] = useState<{store: Store; employee: Employee} | null>(null);
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    const assignments = await getEmployeeStoresForUser(user.uid);
    const first = assignments[0] ?? null;
    setAssignment(first);
    if (first) {
      setAppointments(await getUpcomingAppointmentsForEmployee(first.store.id, first.employee.id));
    }
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [user]);

  async function cancel(apt: SavedAppointment) {
    const ok = window.confirm(
      `Cancel appointment for ${apt.customerName || "this customer"} for ${apt.serviceTitle} at ${formatTime(apt.timeSlot)}?`
    );
    if (!ok) return;
    setCancellingId(apt.id);
    setMessage("");
    try {
      await FunctionsClient.cancelEmployeeAppointment(apt.storeId, apt.id);
      setAppointments((prev) => prev.filter((item) => item.id !== apt.id));
      setMessage("Appointment cancelled and the customer was notified.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  }

  async function markPaid(apt: SavedAppointment) {
    const ok = window.confirm(
      `Confirm payment has been made for ${apt.customerName || "this customer"} for ${apt.serviceTitle} at ${formatTime(apt.timeSlot)}?`
    );
    if (!ok) return;
    setPaidId(apt.id);
    setMessage("");
    try {
      await FunctionsClient.markAppointmentPaid(apt.storeId, apt.id);
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === apt.id ? {...item, paymentStatus: "paid"} : item
        )
      );
      setMessage("Appointment payment marked as paid.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not mark appointment paid.");
    } finally {
      setPaidId(null);
    }
  }

  return (
    <>
      <AppBar title="Manage Appointments" backTo="/provider" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 720}}>
          {assignment && (
            <p className="nnc-label">
              {assignment.store.businessName} · {assignment.employee.firstName} {assignment.employee.lastName}
            </p>
          )}
          {message && <p className={message.includes("Could") ? "error-message" : "success-message"}>{message}</p>}
          {loading ? (
            <p className="loading-text">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="nnc-card" style={{padding: "1rem"}}>
              <p style={{margin: 0, color: "var(--color-text-muted)"}}>No upcoming appointments assigned to you.</p>
            </div>
          ) : (
            <div style={{display: "grid", gap: "0.75rem"}}>
              {appointments.map((apt) => (
                <div key={apt.id} className="nnc-card" style={{padding: "1rem"}}>
                  <div style={{display: "flex", justifyContent: "space-between", gap: "1rem"}}>
                    <div>
                      <h3 style={{margin: 0, fontSize: "1rem"}}>{apt.customerName || "Customer"}</h3>
                      <p style={{margin: "0.35rem 0 0", color: "var(--color-text-muted)"}}>
                        {apt.serviceTitle} · {apt.date} at {formatTime(apt.timeSlot)}
                      </p>
                      {apt.paymentStatus === "paid" && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "0.45rem",
                            padding: "0.15rem 0.55rem",
                            borderRadius: "999px",
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          Paid
                        </span>
                      )}
                      {apt.partyName && (
                        <p style={{margin: "0.25rem 0 0", color: "var(--color-text-muted)", fontSize: "0.85rem"}}>
                          Party: {apt.partyName}
                        </p>
                      )}
                    </div>
                    <div style={{display: "flex", gap: "0.5rem", alignSelf: "center"}}>
                      {apt.paymentStatus !== "paid" && (
                        <button
                          className="btn btn--primary"
                          onClick={() => markPaid(apt)}
                          disabled={paidId === apt.id || cancellingId === apt.id}
                        >
                          {paidId === apt.id ? "Saving..." : "Paid"}
                        </button>
                      )}
                      <button
                        className="btn btn--outline"
                        onClick={() => cancel(apt)}
                        disabled={cancellingId === apt.id || paidId === apt.id}
                      >
                        {cancellingId === apt.id ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
