import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {
  getCalendarAppointments,
  cancelAppointment,
  markAppointmentDone,
  getPendingSpecialRequests,
  subscribeCalendarAppointments,
  subscribePendingSpecialRequests,
} from "../../../data/appointmentApi";
import {listEmployees, getStore} from "../../../data/store/storeApi";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";
import type {SavedAppointment} from "../../../domain/models/BookingAppointment";
import type {Employee} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const UNASSIGNED_ID = "__unassigned__";
const SPECIAL_ID = "__special__";

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function StoreCalendarPage() {
  const {user, profile} = useAuth();
  const storeId =
    profile?.role === "storeadmin"
      ? ((profile as {storeId?: string}).storeId ?? getActiveStoreId() ?? user?.uid ?? "")
      : (user?.uid ?? "");

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [pendingSpecial, setPendingSpecial] = useState<SavedAppointment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [doneTarget, setDoneTarget] = useState<SavedAppointment | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<SavedAppointment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dateStr = toIso(selectedDate);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    // Use allSettled so one failing query (e.g. pendingSpecial) doesn't
    // hide the rest of the calendar — the Special Requests column should
    // always render so admins can see it even when nothing is pending.
    const [empsRes, aptsRes, specialsRes, storeRes] = await Promise.allSettled([
      listEmployees(storeId),
      getCalendarAppointments(storeId, dateStr),
      getPendingSpecialRequests(storeId),
      getStore(storeId),
    ]);
    if (empsRes.status === "fulfilled") setEmployees(empsRes.value);
    else console.error("[StoreCalendar] employees load failed:", empsRes.reason);
    if (aptsRes.status === "fulfilled") setAppointments(aptsRes.value);
    else console.error("[StoreCalendar] appointments load failed:", aptsRes.reason);
    if (specialsRes.status === "fulfilled") {
      setPendingSpecial(specialsRes.value);
    } else {
      console.error(
        "[StoreCalendar] pending special requests load failed:",
        specialsRes.reason,
      );
      setPendingSpecial([]);
    }
    if (storeRes.status === "fulfilled" && storeRes.value) {
      setStoreName(storeRes.value.businessName);
    }
    if (
      empsRes.status === "rejected" &&
      aptsRes.status === "rejected"
    ) {
      setError("Failed to load calendar. Please try again.");
    }
    setLoading(false);
  }, [storeId, dateStr]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!storeId) return;

    const unsubscribeAppointments = subscribeCalendarAppointments(
      storeId,
      dateStr,
      (next) => {
        setAppointments(next);
        setLoading(false);
      },
      (err) => {
        console.error("[StoreCalendar] appointments listener failed:", err);
        setError("Failed to keep calendar updated. Please refresh.");
        setLoading(false);
      }
    );

    const unsubscribeSpecial = subscribePendingSpecialRequests(
      storeId,
      (next) => setPendingSpecial(next),
      (err) => {
        console.error("[StoreCalendar] pending special requests listener failed:", err);
        setPendingSpecial([]);
      }
    );

    return () => {
      unsubscribeAppointments();
      unsubscribeSpecial();
    };
  }, [storeId, dateStr]);

  function prevDay() { setSelectedDate((d) => addDays(d, -1)); }
  function nextDay() { setSelectedDate((d) => addDays(d, 1)); }
  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  }

  async function handleCancel(apt: SavedAppointment) {
    if (
      !window.confirm(
        `Cancel appointment for "${apt.serviceTitle}" at ${formatAmPm(apt.timeSlot)}?`
      )
    )
      return;
    setCancellingId(apt.id);
    try {
      await cancelAppointment(storeId, apt.id, apt.customerUserId);
      setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
    } catch {
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

  async function confirmDone() {
    if (!doneTarget) return;
    setDoneId(doneTarget.id);
    try {
      await markAppointmentDone(storeId, doneTarget.id, doneTarget.customerUserId);
      setAppointments((prev) => prev.filter((a) => a.id !== doneTarget.id));
      setToast(`Marked ${doneTarget.serviceTitle} as done.`);
      setDoneTarget(null);
    } catch {
      alert("Failed to mark this appointment as done. Please try again.");
    } finally {
      setDoneId(null);
    }
  }

  async function handleMarkPaid(apt: SavedAppointment) {
    if (
      !window.confirm(
        `Confirm payment has been made for "${apt.serviceTitle}" at ${formatAmPm(apt.timeSlot)}?`
      )
    )
      return;
    setPaidId(apt.id);
    try {
      await FunctionsClient.markAppointmentPaid(storeId, apt.id);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === apt.id ? {...a, paymentStatus: "paid"} : a
        )
      );
      setToast(`Marked ${apt.serviceTitle} as paid.`);
    } catch {
      alert("Failed to mark this appointment as paid. Please try again.");
    } finally {
      setPaidId(null);
    }
  }

  async function approveSpecial(apt: SavedAppointment) {
    setActingId(apt.id);
    try {
      await FunctionsClient.approveSpecialRequest(storeId, apt.id);
      setToast(`Approved ${apt.serviceTitle} for ${apt.timeSlot}.`);
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to approve.";
      alert(msg);
    } finally {
      setActingId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Please enter a reason so the customer knows why.");
      return;
    }
    setActingId(rejectTarget.id);
    setRejectError(null);
    try {
      const result = await FunctionsClient.rejectSpecialRequest(
        storeId,
        rejectTarget.id,
        reason,
      );
      setToast(
        result.emailDelivered ?
          "Rejection sent and customer emailed." :
          result.hasEmail ?
            "Rejected, but the email failed to send." :
            "Rejected (no customer email on file).",
      );
      setRejectTarget(null);
      setRejectReason("");
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reject.";
      setRejectError(msg);
    } finally {
      setActingId(null);
    }
  }

  // Columns: Special Requests first, then Unassigned, then each employee
  const columns: Array<{id: string; label: string}> = [
    {id: SPECIAL_ID, label: "Special Requests"},
    {id: UNASSIGNED_ID, label: "Unassigned / Any"},
    ...employees.map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}`.trim(),
    })),
  ];

  function aptsForColumn(colId: string): SavedAppointment[] {
    if (colId === SPECIAL_ID) return pendingSpecial;
    return appointments
      .filter((a) => {
        if (a.isSpecialRequest && a.approvalStatus !== "approved") return false;
        if (colId === UNASSIGNED_ID) return !a.employeeId || a.employeeId === "";
        return a.employeeId === colId;
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }

  function customerLabel(apt: SavedAppointment): string {
    if (apt.customerName) return apt.customerName;
    return apt.customerUserId ? `User #${apt.customerUserId.slice(0, 6)}` : "Walk-in";
  }

  const isToday = toIso(selectedDate) === toIso(new Date());

  return (
    <>
      <AppBar title="Store Calendar" backTo="/store-admin" />
      <div className="page-bg">
        <main style={{padding: "1.25rem 1rem", maxWidth: "100%"}}>

          {/* Day navigation */}
          <div className="cal-toolbar">
            <button className="cal-nav-btn" onClick={prevDay} aria-label="Previous day">
              ◀
            </button>
            <div style={{flex: 1, textAlign: "center"}}>
              <span className="cal-week-label">{formatDayLabel(selectedDate)}</span>
              {!isToday && (
                <button
                  onClick={goToday}
                  style={{
                    marginLeft: "0.75rem",
                    fontSize: "0.75rem",
                    padding: "0.15rem 0.6rem",
                    borderRadius: "999px",
                    border: "1px solid var(--color-primary)",
                    background: "transparent",
                    color: "var(--color-primary)",
                    cursor: "pointer",
                  }}
                >
                  Today
                </button>
              )}
            </div>
            <button className="cal-nav-btn" onClick={nextDay} aria-label="Next day">
              ▶
            </button>
          </div>

          {/* Action row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0.75rem 0",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            {storeName && (
              <p className="nnc-label" style={{margin: 0}}>
                {storeName}
              </p>
            )}
            <Link
              to={`/customer/booking/${storeId}/service`}
              className="btn btn--primary"
              style={{borderRadius: "999px", fontWeight: 700}}
            >
              + Schedule New Appointment
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <p className="loading-text">Loading calendar…</p>
          ) : error ? (
            <p style={{color: "var(--color-error, #dc2626)", textAlign: "center"}}>{error}</p>
          ) : (
            <div className="cal-scroll-area">
              <div className="cal-grid">
                {columns.map((col) => {
                  const colApts = aptsForColumn(col.id);
                  const isSpecialCol = col.id === SPECIAL_ID;
                  return (
                    <div
                      key={col.id}
                      className="cal-col"
                      style={
                        isSpecialCol ?
                          {borderLeft: "3px solid #7c3aed"} :
                          undefined
                      }
                    >
                      <div
                        className="cal-col__header"
                        style={
                          isSpecialCol ?
                            {background: "#ede9fe", color: "#5b21b6"} :
                            undefined
                        }
                      >
                        {isSpecialCol ? "✨ " : ""}
                        {col.label}
                        {isSpecialCol && colApts.length > 0 && (
                          <span style={{
                            marginLeft: "0.4rem",
                            fontSize: "0.75rem",
                            background: "#7c3aed",
                            color: "#fff",
                            padding: "0.05rem 0.5rem",
                            borderRadius: "999px",
                          }}>
                            {colApts.length}
                          </span>
                        )}
                      </div>
                      <div className="cal-col__body">
                        {colApts.length === 0 ? (
                          <p className="cal-empty">
                            {isSpecialCol ?
                              "No pending requests" :
                              "No appointments"}
                          </p>
                        ) : (
                          colApts.map((apt) => (
                            <div
                              key={apt.id}
                              className="apt-block"
                              style={
                                isSpecialCol ?
                                  {borderLeft: "3px solid #7c3aed"} :
                                  undefined
                              }
                            >
                              {isSpecialCol && (
                                <p style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: "#7c3aed",
                                  margin: "0 0 0.2rem",
                                }}>
                                  📅 {formatDateLabel(apt.date)}
                                </p>
                              )}
                              <p className="apt-block__time">
                                {formatAmPm(apt.timeSlot)}
                                {apt.durationMinutes > 0 && ` · ${apt.durationMinutes} min`}
                              </p>
                              <p className="apt-block__service">{apt.serviceTitle}</p>
                              {apt.paymentStatus === "paid" && (
                                <p
                                  style={{
                                    display: "inline-block",
                                    margin: "0 0 0.3rem",
                                    padding: "0.12rem 0.5rem",
                                    borderRadius: "999px",
                                    background: "#dcfce7",
                                    color: "#166534",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  Paid
                                </p>
                              )}
                              <p className="apt-block__customer">
                                👤 {customerLabel(apt)}
                                {apt.customerPhone && ` · ${apt.customerPhone}`}
                              </p>
                              {apt.partyName && (
                                <p
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "var(--color-text-muted)",
                                    margin: "0 0 0.3rem",
                                  }}
                                >
                                  🎉 Party: {apt.partyName}
                                </p>
                              )}
                              {isSpecialCol ? (
                                <div style={{display: "flex", gap: "0.4rem"}}>
                                  <button
                                    className="btn btn--sm"
                                    style={{
                                      background: "#16a34a",
                                      color: "#fff",
                                      flex: 1,
                                    }}
                                    disabled={actingId === apt.id}
                                    onClick={() => approveSpecial(apt)}
                                  >
                                    {actingId === apt.id ? "…" : "Approve"}
                                  </button>
                                  <button
                                    className="btn btn--sm"
                                    style={{
                                      background: "#dc2626",
                                      color: "#fff",
                                      flex: 1,
                                    }}
                                    disabled={actingId === apt.id}
                                    onClick={() => {
                                      setRejectTarget(apt);
                                      setRejectReason("");
                                      setRejectError(null);
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div style={{display: "flex", gap: "0.4rem"}}>
                                  {apt.paymentStatus !== "paid" && (
                                    <button
                                      className="btn btn--sm"
                                      style={{
                                        background: "#111827",
                                        color: "#fff",
                                        flex: 1,
                                      }}
                                      disabled={
                                        paidId === apt.id ||
                                        doneId === apt.id ||
                                        cancellingId === apt.id
                                      }
                                      onClick={() => handleMarkPaid(apt)}
                                    >
                                      {paidId === apt.id ? "Saving…" : "Paid"}
                                    </button>
                                  )}
                                  <button
                                    className="btn btn--sm"
                                    style={{
                                      background: "#16a34a",
                                      color: "#fff",
                                      flex: 1,
                                    }}
                                    disabled={doneId === apt.id || cancellingId === apt.id}
                                    onClick={() => setDoneTarget(apt)}
                                  >
                                    {doneId === apt.id ? "Saving…" : "Done"}
                                  </button>
                                  <button
                                    className="apt-block__cancel"
                                    style={{flex: 1}}
                                    disabled={cancellingId === apt.id || doneId === apt.id}
                                    onClick={() => handleCancel(apt)}
                                  >
                                    {cancellingId === apt.id ? "Cancelling…" : "Cancel"}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {doneTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div className="nnc-card" style={{width: "100%", maxWidth: 460, padding: "1.5rem"}}>
            <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
              Mark Appointment Done?
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-text-muted)", lineHeight: 1.5}}>
              Please confirm that <strong>{customerLabel(doneTarget)}</strong> has completed{" "}
              <strong>{doneTarget.serviceTitle}</strong> at{" "}
              <strong>{formatAmPm(doneTarget.timeSlot)}</strong>.
            </p>
            <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
              <button
                type="button"
                className="btn btn--outline btn--full"
                onClick={() => setDoneTarget(null)}
                disabled={doneId === doneTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn--primary-full"
                style={{background: "#16a34a"}}
                onClick={confirmDone}
                disabled={doneId === doneTarget.id}
              >
                {doneId === doneTarget.id ? "Saving…" : "Yes, mark done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div className="nnc-card" style={{width: "100%", maxWidth: 460, padding: "1.5rem"}}>
            <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
              Reject Special Request
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
              Tell <strong>{customerLabel(rejectTarget)}</strong> why their{" "}
              {formatAmPm(rejectTarget.timeSlot)} request on{" "}
              {formatDateLabel(rejectTarget.date)} can't be accommodated.
              They'll receive an email with this message.
            </p>
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. We're fully booked at that hour. Could you try 2pm instead?"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={actingId === rejectTarget.id}
              style={{resize: "vertical"}}
            />
            {rejectError && (
              <div className="error-message" style={{marginTop: "0.5rem"}}>
                {rejectError}
              </div>
            )}
            <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
              <button
                type="button"
                className="btn btn--outline btn--full"
                onClick={() => setRejectTarget(null)}
                disabled={actingId === rejectTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn--primary-full"
                style={{background: "#dc2626"}}
                onClick={submitReject}
                disabled={actingId === rejectTarget.id}
              >
                {actingId === rejectTarget.id ? "Sending…" : "Send rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            bottom: "1.25rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f2937",
            color: "#fff",
            padding: "0.6rem 1rem",
            borderRadius: "999px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            zIndex: 999,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
