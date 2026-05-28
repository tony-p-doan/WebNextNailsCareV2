import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useAuth} from "../../../core/auth/AuthContext";
import {getCustomerUpcomingAppointments, cancelAppointment, getCustomerCompletedAppointments} from "../../../data/appointmentApi";
import {submitProviderRating} from "../../../data/providerRatingsApi";
import type {SavedAppointment} from "../../../domain/models/BookingAppointment";
import type {CustomerProfile} from "../../../domain/models/UserProfile";

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  return new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatMemberSince(creationTime: string | undefined): string {
  if (!creationTime) return "—";
  return new Date(creationTime).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

export function AccountPage() {
  const {user, profile, loading} = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<SavedAppointment[]>([]);
  const [aptsLoading, setAptsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, {rating: number; comment: string; privateFeedback: string}>>({});

  const isCustomer = profile?.role === "customer";
  const cp = isCustomer ? (profile as CustomerProfile) : null;
  const rewardsPoints = cp?.rewardsPoints ?? 0;

  useEffect(() => {
    if (!loading && !user) { navigate("/login", {replace: true}); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !isCustomer) return;
    setAptsLoading(true);
    Promise.all([
      getCustomerUpcomingAppointments(user.uid),
      getCustomerCompletedAppointments(user.uid),
    ])
      .then(([upcoming, completed]) => {
        setAppointments(upcoming);
        setCompletedAppointments(completed.slice(0, 5));
      })
      .catch(() => setAppointments([]))
      .finally(() => setAptsLoading(false));
  }, [user, isCustomer]);

  async function handleCancel(apt: SavedAppointment) {
    if (!confirm("Cancel this appointment?")) return;
    setCancellingId(apt.id);
    try {
      await cancelAppointment(apt.storeId, apt.id, apt.customerUserId);
      setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
    } finally {
      setCancellingId(null);
    }
  }

  async function handleRate(apt: SavedAppointment) {
    const draft = ratingDrafts[apt.id] ?? {rating: 5, comment: "", privateFeedback: ""};
    await submitProviderRating({
      storeId: apt.storeId,
      appointmentId: apt.id,
      rating: draft.rating,
      comment: draft.comment,
      privateFeedback: draft.privateFeedback,
      tags: [],
      isPublic: true,
    });
    alert("Rating submitted.");
  }

  if (loading) return <div className="page-bg"><p className="loading-text" style={{paddingTop: "4rem"}}>Loading…</p></div>;
  if (!user || !profile) return null;

  const firstName = "firstName" in profile ? profile.firstName : "";
  const lastName = "lastName" in profile ? profile.lastName : "";

  return (
    <>
      <AppBar title="My Account" backTo="/customer" />
      <div className="page-bg">
        <main className="container" style={{maxWidth: 560, paddingTop: "1.5rem", paddingBottom: "3rem"}}>

          {/* Avatar + name */}
          <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "1.75rem"}}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.75rem", fontWeight: 700, color: "#fff",
            }}>
              {initials(firstName, lastName)}
            </div>
            <h2 style={{margin: 0, fontSize: "1.3rem", color: "var(--color-text)", fontWeight: 700}}>
              {firstName} {lastName}
            </h2>
            {isCustomer && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                background: "var(--color-primary-bg)", color: "var(--color-primary)",
                borderRadius: "999px", padding: "0.2rem 0.85rem",
                fontSize: "0.82rem", fontWeight: 600,
              }}>
                ⭐ {rewardsPoints} rewards points
              </span>
            )}
          </div>

          {/* Profile details card */}
          <div className="form-card" style={{marginBottom: "1.5rem"}}>
            <p className="nnc-label" style={{marginBottom: "0.75rem"}}>Profile</p>
            <div style={{display: "flex", flexDirection: "column", gap: "0.85rem"}}>
              <ProfileRow label="First Name" value={firstName || "—"} />
              <ProfileRow label="Last Name" value={lastName || "—"} />
              <ProfileRow label="Email" value={user.email ?? "—"} />
              <ProfileRow label="Member Since" value={formatMemberSince(user.metadata.creationTime)} />
              {isCustomer && <ProfileRow label="Rewards Points" value={String(rewardsPoints)} />}
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="form-card">
            <p className="nnc-label" style={{marginBottom: "0.75rem"}}>Upcoming Appointments</p>
            {aptsLoading ? (
              <p className="loading-text">Loading appointments…</p>
            ) : appointments.length === 0 ? (
              <p style={{color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0}}>
                No upcoming appointments.
              </p>
            ) : (
              <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
                {appointments.map((apt) => (
                  <div key={apt.id} className="nnc-apt-card">
                    <div className="nnc-apt-card__accent" />
                    <div className="nnc-apt-card__body">
                      <div className="nnc-apt-card__top">
                        <div>
                          <p className="nnc-apt-card__store">{apt.storeName}</p>
                          <p className="nnc-apt-card__service">💅 {apt.serviceTitle}</p>
                        </div>
                        <button
                          className="nnc-apt-card__cancel"
                          disabled={cancellingId === apt.id}
                          onClick={() => handleCancel(apt)}
                        >
                          {cancellingId === apt.id ? "…" : "Cancel"}
                        </button>
                      </div>
                      <div className="nnc-apt-card__meta-row">
                        <span className="nnc-apt-card__badge">📅 {formatDate(apt.date)}</span>
                        <span className="nnc-apt-card__badge">🕐 {formatAmPm(apt.timeSlot)}</span>
                        {apt.durationMinutes > 0 && (
                          <span className="nnc-apt-card__badge">⏱ {apt.durationMinutes} min</span>
                        )}
                        <span className="nnc-apt-card__badge">👤 {apt.employeeName}</span>
                        {apt.partyName && (
                          <span className="nnc-apt-card__badge">🙋 {apt.partyName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-card" style={{marginTop: "1.5rem"}}>
            <p className="nnc-label" style={{marginBottom: "0.75rem"}}>Rate Completed Appointments</p>
            {completedAppointments.length === 0 ? (
              <p style={{color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0}}>
                No completed appointments to rate yet.
              </p>
            ) : completedAppointments.map((apt) => {
              const draft = ratingDrafts[apt.id] ?? {rating: 5, comment: "", privateFeedback: ""};
              return (
                <div key={apt.id} className="nnc-apt-card" style={{marginBottom: "0.75rem"}}>
                  <div className="nnc-apt-card__accent" />
                  <div className="nnc-apt-card__body">
                    <p className="nnc-apt-card__store">{apt.storeName}</p>
                    <p className="nnc-apt-card__service">👤 {apt.employeeName} · {apt.serviceTitle}</p>
                    <label className="form-field">
                      <span>Rating</span>
                      <select
                        value={draft.rating}
                        onChange={(e) => setRatingDrafts((prev) => ({...prev, [apt.id]: {...draft, rating: Number(e.target.value)}}))}
                      >
                        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Public comment</span>
                      <textarea value={draft.comment} onChange={(e) => setRatingDrafts((prev) => ({...prev, [apt.id]: {...draft, comment: e.target.value}}))} />
                    </label>
                    <label className="form-field">
                      <span>Private feedback to salon</span>
                      <textarea value={draft.privateFeedback} onChange={(e) => setRatingDrafts((prev) => ({...prev, [apt.id]: {...draft, privateFeedback: e.target.value}}))} />
                    </label>
                    <button className="btn btn--primary btn--sm" onClick={() => handleRate(apt)}>Submit Rating</button>
                  </div>
                </div>
              );
            })}
          </div>

        </main>
      </div>
    </>
  );
}

function ProfileRow({label, value}: {label: string; value: string}) {
  return (
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem"}}>
      <span style={{fontSize: "0.82rem", color: "var(--color-text-muted)", fontWeight: 600, flexShrink: 0}}>
        {label}
      </span>
      <span style={{fontSize: "0.92rem", color: "var(--color-text)", fontWeight: 500, textAlign: "right", wordBreak: "break-word"}}>
        {value}
      </span>
    </div>
  );
}
