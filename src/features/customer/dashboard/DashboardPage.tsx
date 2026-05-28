import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useAuth} from "../../../core/auth/AuthContext";

const REWARDS_PATH = "/customer/rewards";
import {
  getCustomerUpcomingAppointments,
  getUpcomingAppointments,
  cancelAppointment,
  dismissRejectedSpecialRequest,
} from "../../../data/appointmentApi";
import {getOrCreateStore, getStoresForAdmin} from "../../../data/store/storeApi";
import type {SavedAppointment} from "../../../domain/models/BookingAppointment";
import {setActiveStoreId} from "../../storeadmin/storeAdminContext";
import {FunctionsClient} from "../../../data/functions/FunctionsClient";

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"});
}

/* ─── Hero section (logged-out) ─────────────────────────────────────────── */
function HeroSection() {
  return (
    <div className="nnc-hero">
      <div className="nnc-hero__text">
        <p className="nnc-hero__eyebrow">✨ Nail salon booking</p>
        <h1 className="nnc-hero__headline">
          Your Next Nail<br />Appointment Awaits
        </h1>
        <p className="nnc-hero__sub">
          Earn reward points toward free or discounted services! Make an appointment today to earn points.
        </p>
        <Link to="/customer/search" className="btn btn--primary btn--lg nnc-hero__cta">
          Book an Appointment
        </Link>
      </div>
      <div className="nnc-hero__visual" aria-hidden>
        <div className="nnc-hero__orb nnc-hero__orb--1" />
        <div className="nnc-hero__orb nnc-hero__orb--2" />
        <div className="nnc-hero__orb nnc-hero__orb--3" />
        <span className="nnc-hero__nail">💅</span>
      </div>
    </div>
  );
}

/* ─── Appointment card ───────────────────────────────────────────────────── */
function AptCard({
  apt,
  onCancel,
  onDismiss,
}: {
  apt: SavedAppointment;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.storeAddress || apt.storeName)}`;
  const isPending =
    apt.isSpecialRequest === true && apt.approvalStatus === "pending";
  const isRejected =
    apt.isSpecialRequest === true && apt.approvalStatus === "rejected";
  const accentColor = isRejected ?
    "linear-gradient(180deg,#ef4444,#b91c1c)" :
    isPending ?
      "linear-gradient(180deg,#f59e0b,#d97706)" :
      undefined;
  return (
    <div className="nnc-apt-card">
      <div
        className="nnc-apt-card__accent"
        style={accentColor ? {background: accentColor} : undefined}
      />
      <div className="nnc-apt-card__body">
        <div className="nnc-apt-card__top">
          <div>
            <p className="nnc-apt-card__store">{apt.storeName}</p>
            {apt.storeAddress && (
              <p className="nnc-apt-card__service" style={{fontSize: "0.8rem"}}>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                   style={{color: "var(--color-primary)", textDecoration: "none"}}>
                  📍 {apt.storeAddress}
                </a>
              </p>
            )}
            <p className="nnc-apt-card__service">💅 {apt.serviceTitle}</p>
          </div>
          {isRejected ? (
            <button className="nnc-apt-card__cancel" onClick={onDismiss}>Dismiss</button>
          ) : (
            <button className="nnc-apt-card__cancel" onClick={onCancel}>Cancel</button>
          )}
        </div>
        {(isPending || isRejected) && (
          <div style={{marginTop: "0.4rem"}}>
            <span
              className="nnc-apt-card__badge"
              style={{
                background: isRejected ? "#fee2e2" : "#fef3c7",
                color: isRejected ? "#b91c1c" : "#92400e",
                fontWeight: 700,
              }}
            >
              {isRejected ? "✖ Rejected" : "⏳ Pending Approval"}
            </span>
            {isRejected && apt.rejectionReason && (
              <p
                className="nnc-apt-card__service"
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.82rem",
                  background: "#fef2f2",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  color: "#7f1d1d",
                  whiteSpace: "pre-wrap",
                }}
              >
                <strong>Reason:</strong> {apt.rejectionReason}
              </p>
            )}
          </div>
        )}
        <div className="nnc-apt-card__meta-row">
          <span className="nnc-apt-card__badge">📅 {formatDate(apt.date)}</span>
          <span className="nnc-apt-card__badge">🕐 {formatAmPm(apt.timeSlot)}</span>
          {apt.durationMinutes > 0 && <span className="nnc-apt-card__badge">⏱ {apt.durationMinutes} min</span>}
          <span className="nnc-apt-card__badge">👤 {apt.employeeName}</span>
          {apt.partyName && <span className="nnc-apt-card__badge">🙋 {apt.partyName}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Action card ────────────────────────────────────────────────────────── */
interface ActionCardProps {
  to: string;
  icon: string;
  gradient: string;
  title: string;
  sub: string;
  featured?: boolean;
}

function ActionCard({to, icon, gradient, title, sub, featured}: ActionCardProps) {
  return (
    <Link to={to} className={`nnc-action-card${featured ? " nnc-action-card--featured" : ""}`}>
      <div className="nnc-action-card__icon-wrap" style={{background: gradient}}>
        <span className="nnc-action-card__icon">{icon}</span>
      </div>
      <div className="nnc-action-card__text">
        <p className="nnc-action-card__title">{title}</p>
        <p className="nnc-action-card__sub">{sub}</p>
      </div>
      <span className="nnc-action-card__arrow">›</span>
    </Link>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
export function DashboardPage() {
  const {user, profile, loading, signOut} = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [aptsLoading, setAptsLoading] = useState(false);
  const [aptsError, setAptsError] = useState<string | null>(null);
  const [hasStoreAdminAccess, setHasStoreAdminAccess] = useState(false);
  const [memberTier, setMemberTier] = useState<"gold" | "platinum">("gold");

  const isStoreAdmin = profile?.role === "storeadmin" || hasStoreAdminAccess;
  const isCustomer = profile?.role === "customer";
  const firstName = profile && "firstName" in profile ? profile.firstName.trim() : null;
  const userPoints = isCustomer ? ((profile as {rewardsPoints?: number}).rewardsPoints ?? 0) : 0;

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    setAptsLoading(true);
    setAptsError(null);
    (async () => {
      try {
        if (isStoreAdmin && "businessName" in profile) {
          const store = await getOrCreateStore(user.uid, profile.businessName, profile.address);
          const apts = await getUpcomingAppointments(store.id, store.businessName);
          if (!cancelled) setAppointments(apts.slice(0, 5));
        } else if (isCustomer) {
          const apts = await getCustomerUpcomingAppointments(user.uid);
          if (!cancelled) setAppointments(apts.slice(0, 5));
        } else {
          if (!cancelled) setAppointments([]);
        }
      } catch (err) {
        console.error("Failed to load dashboard appointments", err);
        if (!cancelled) {
          setAppointments([]);
          setAptsError(
            err instanceof Error ? err.message : "Couldn't load appointments."
          );
        }
      } finally {
        // CRITICAL: always clear the loading flag on *every* exit path so
        // the dashboard never hangs on "Loading appointments…" when the
        // Firestore query rejects (e.g. missing composite index).
        if (!cancelled) setAptsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile, isStoreAdmin, isCustomer]);

  useEffect(() => {
    if (!user) {
      setHasStoreAdminAccess(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const stores = await getStoresForAdmin(user.uid);
      if (cancelled) return;
      setHasStoreAdminAccess(stores.length > 0);
      const primary = stores.find((s) => s.id === user.uid) ?? stores[0];
      if (primary) setActiveStoreId(primary.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isCustomer) {
      setMemberTier("gold");
      return;
    }
    let cancelled = false;
    FunctionsClient.getCustomerRewardsProgram()
      .then((program) => {
        if (!cancelled) {
          setMemberTier(program.stores.some((s) => s.tier === "platinum") ? "platinum" : "gold");
        }
      })
      .catch(() => {
        if (!cancelled) setMemberTier("gold");
      });
    return () => { cancelled = true; };
  }, [user, isCustomer]);

  async function handleCancel(apt: SavedAppointment) {
    if (!confirm("Cancel this appointment?")) return;
    await cancelAppointment(apt.storeId, apt.id, apt.customerUserId);
    setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
  }

  async function handleDismiss(apt: SavedAppointment) {
    if (!user) return;
    await dismissRejectedSpecialRequest(user.uid, apt.id);
    setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
  }

  return (
    <div className="nnc-dashboard">
      {/* ── Top nav ── */}
      <header className="nnc-nav">
        <Link to="/customer" className="nnc-nav__brand">
          <span className="nnc-nav__logo">✨</span>
          <span className="nnc-nav__name">Next Nails Care</span>
        </Link>
        <div className="nnc-nav__actions">
          {user ? (
            <>
              {firstName && <span className="nnc-nav__greeting">Hi, {firstName}</span>}
              <Link to="/customer/account" className="nnc-nav__btn nnc-nav__btn--ghost">
                👤 Account
              </Link>
              <button
                className="nnc-nav__btn nnc-nav__btn--ghost"
                onClick={async () => { await signOut(); navigate("/customer"); }}
              >
                Log out
              </button>
            </>
          ) : !loading ? (
            <Link to="/login" className="nnc-nav__btn nnc-nav__btn--solid">Log in</Link>
          ) : null}
        </div>
      </header>

      {/* ── Hero (logged-out only) ── */}
      {!user && !loading && <HeroSection />}

      {/* ── Logged-in welcome ── */}
      {user && (
        <div className="nnc-welcome">
          <div className="nnc-welcome__inner">
            <div className="nnc-welcome__left">
              <h2 className="nnc-welcome__title">
                {firstName ? `Welcome back, ${firstName}! 👋` : "Welcome back! 👋"}
              </h2>
              {isCustomer && (
                <p className="nnc-welcome__points">
                  <span className="nnc-welcome__points-icon">⭐</span>
                  {userPoints} rewards points
                </p>
              )}
              {isCustomer && (
                <Link
                  to="/customer/member-info"
                  className={`nnc-member-banner nnc-member-banner--${memberTier}`}
                >
                  <span>{memberTier === "platinum" ? "🏆 Platinum Member" : "🥇 Gold Member"}</span>
                  <span className="nnc-member-banner__info" aria-label="Membership information">ⓘ</span>
                </Link>
              )}
            </div>
            {isCustomer && (
              <Link to="/customer/rewards" className="nnc-welcome__rewards-link">
                View rewards →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="nnc-main">
        {/* Upcoming appointments */}
        {user && (aptsLoading || aptsError || appointments.length > 0) && (
          <section className="nnc-section">
            <h3 className="nnc-section__title">
              {isStoreAdmin ? "Upcoming Appointments" : "My Appointments"}
            </h3>
            {aptsLoading ? (
              <p className="loading-text">Loading appointments…</p>
            ) : aptsError ? (
              <p className="loading-text" style={{color: "#b91c1c"}}>
                Couldn&apos;t load appointments. {aptsError}
              </p>
            ) : (
              <div className="nnc-apts-grid">
                {appointments.map((apt) => (
                  <AptCard
                    key={apt.id}
                    apt={apt}
                    onCancel={() => handleCancel(apt)}
                    onDismiss={() => handleDismiss(apt)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Action cards */}
        <section className="nnc-section">
          <h3 className="nnc-section__title">
            {user ? "What would you like to do?" : "Get started"}
          </h3>
          <div className="nnc-actions-grid">
            {isStoreAdmin && (
              <ActionCard
                to="/store-admin"
                icon="🏪"
                gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
                title="Manage Store"
                sub="Employees, schedules, services, and rewards."
                featured
              />
            )}
            <ActionCard
              to="/customer/search"
              icon="💅"
              gradient="linear-gradient(135deg,#f9a8d4,#ec4899)"
              title="Make an Appointment"
              sub="Search for a nail salon and book your visit."
              featured={!user}
            />
            <ActionCard
              to="/customer/book-by-provider"
              icon="👤"
              gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
              title="Book by Provider"
              sub="Choose a salon, provider, service, date, and time."
            />
            <ActionCard
              to="/customer/book-by-ai"
              icon="🤖"
              gradient="linear-gradient(135deg,#93c5fd,#6366f1)"
              title="Book by AI"
              sub="Talk with Swabi to build your appointment."
            />
            <ActionCard
              to={user ? REWARDS_PATH : `/login?redirect=${encodeURIComponent(REWARDS_PATH)}`}
              icon="⭐"
              gradient="linear-gradient(135deg,#fcd34d,#f59e0b)"
              title="Rewards Program"
              sub="Browse store loyalty programs and redeem points."
            />
            {!user && (
              <ActionCard
                to="/customer/register"
                icon="🙋"
                gradient="linear-gradient(135deg,#6ee7f7,#3b82f6)"
                title="Create Customer Account"
                sub="Sign up to earn rewards and manage bookings."
              />
            )}
            {!isCustomer && (
              <ActionCard
                to="/store-admin/register"
                icon="🏬"
                gradient="linear-gradient(135deg,#6ee7b7,#10b981)"
                title="List Your Nail Salon"
                sub="Register your business to reach more customers."
              />
            )}
          </div>
        </section>

        {/* Footer tagline (logged-out) */}
        {!user && !loading && (
          <p className="nnc-tagline">Trusted by salons and customers everywhere</p>
        )}
      </main>
    </div>
  );
}
