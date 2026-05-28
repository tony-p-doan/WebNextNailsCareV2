import {useEffect, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useBooking} from "./BookingContext";
import {useAuth} from "../../../core/auth/AuthContext";
import {saveAppointments, validateAppointmentsAvailability} from "../../../data/appointmentApi";
import {createGuestCustomer} from "../../../data/guestCustomerApi";
import {listRewards} from "../../../data/rewardsApi";
import {AuthService} from "../../../core/auth/AuthService";
import type {BookingAppointment} from "../../../domain/models/BookingAppointment";
import {fullAddress} from "../../../domain/models/Store";
import type {RewardRule} from "../../../domain/models/RewardRule";

/* ─── Tax table (matches mobile apps) ─────────────────────────────── */
function getTaxRate(stateCode: string): number {
  const s = stateCode.trim().toUpperCase().slice(0, 2);
  const rates: Record<string, number> = {
    CA: 0.0725, NY: 0.04, TX: 0.0625, FL: 0.06, WA: 0.065,
    IL: 0.0625, OH: 0.0625, NJ: 0.06625, PA: 0.06, GA: 0.06,
    KY: 0.06, WV: 0.06, ID: 0.06, IA: 0.06, MD: 0.06, MO: 0.06,
    NC: 0.03, MI: 0.06, MN: 0.06, WI: 0.06, AR: 0.06,
    KS: 0.06, NE: 0.06, AZ: 0.056, MA: 0.0625, VA: 0.0625,
    NV: 0.0685, CO: 0.029, TN: 0.07, IN: 0.07, CT: 0.0635,
    SC: 0.06, AL: 0.06, OK: 0.06, UT: 0.06, LA: 0.0445,
    OR: 0, NH: 0, MT: 0, AK: 0, DE: 0, NM: 0.05125, HI: 0.04,
  };
  return rates[s] ?? 0.06;
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  return `${mo}-${d}-${y}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function partyKey(name: string | null): string {
  return name?.trim() || "__primary__";
}

/* ─── Reward eligibility ───────────────────────────────────────────── */
function rewardForApt(
  apt: BookingAppointment,
  rewards: RewardRule[],
  userPoints: number
): RewardRule | null {
  if (apt.priceCents === 0) return null;
  return (
    rewards.find(
      (r) =>
        r.serviceId === apt.serviceId &&
        userPoints >= r.pointsRequired &&
        apt.priceCents > 0
    ) ?? null
  );
}

/* ─── Guest Customer Modal (store admin walk-in booking) ─────────── */
interface GuestModalProps {
  onConfirm: (firstName: string, lastName: string, phone: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function GuestCustomerModal({onConfirm, onCancel, saving}: GuestModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;
    onConfirm(firstName.trim(), lastName.trim(), phone.trim());
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem",
    }}>
      <div className="nnc-card" style={{width: "100%", maxWidth: 420, padding: "1.5rem"}}>
        <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
          👤 Walk-in Customer Info
        </h3>
        <p style={{margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
          Enter the customer's details to save with this appointment.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="nnc-label">First Name</label>
            <input
              ref={firstRef}
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
            />
          </div>
          <div className="form-group">
            <label className="nnc-label">Last Name</label>
            <input
              className="form-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
          <div className="form-group">
            <label className="nnc-label">Phone Number</label>
            <input
              className="form-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              required
            />
          </div>
          <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
            <button
              type="button"
              className="btn btn--outline btn--full"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn--primary-full"
              disabled={saving || !firstName.trim() || !lastName.trim() || !phone.trim()}
            >
              {saving ? "Saving…" : "Save Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BookingSummaryPage() {
  const {appointments, selectedStore, removeAppointmentAt, applyRewardAt, clearCart, beginChainedBooking} = useBooking();
  const {user, profile} = useAuth();
  const navigate = useNavigate();

  const [rewards, setRewards] = useState<RewardRule[]>([]);
  const [storeRewardsPoints, setStoreRewardsPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPartyDialog, setShowPartyDialog] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");

  const isCustomer = profile?.role === "customer";
  const isStoreAdmin = profile?.role === "storeadmin";
  const userPoints = isCustomer ? storeRewardsPoints : 0;
  const userName =
    profile
      ? ("firstName" in profile
          ? (profile.firstName.trim() || "Guest")
          : "Guest")
      : "Guest";

  useEffect(() => {
    if (!selectedStore) return;
    listRewards(selectedStore.id).then(setRewards);
  }, [selectedStore]);

  useEffect(() => {
    if (!user || !selectedStore || !isCustomer) {
      setStoreRewardsPoints(0);
      return;
    }
    AuthService.getCustomerStoreRewardsPoints(user.uid, selectedStore.id)
      .then(setStoreRewardsPoints)
      .catch(() => setStoreRewardsPoints(0));
  }, [user, selectedStore, isCustomer]);

  const stateCode = selectedStore?.state ?? "";
  const taxRate = getTaxRate(stateCode);
  const subtotalCents = appointments.reduce((s, a) => s + a.priceCents, 0);
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;
  const totalPoints = appointments.reduce((s, a) => s + a.rewardsPoints, 0);

  async function doSave(guestInfo?: {customerName: string; customerPhone: string}) {
    if (!user) { navigate("/login"); return; }
    setSaving(true);
    setSaveError(null);
    setConflictMsg(null);
    try {
      const conflicts = await validateAppointmentsAvailability(appointments);
      if (conflicts.length > 0) {
        const first = appointments[conflicts[0]];
        setConflictMsg(
          `"${first.serviceTitle}" on ${first.date} at ${formatAmPm(first.timeSlot)} is no longer available.`
        );
        setSaving(false);
        return;
      }
      // For logged-in customers include their name/phone so it's visible in the store calendar
      const effectiveInfo: {customerName: string; customerPhone: string} | undefined =
        guestInfo ??
        (profile && "firstName" in profile
          ? {
              customerName: `${profile.firstName} ${profile.lastName}`.trim(),
              customerPhone: profile.phoneNumber ?? "",
            }
          : undefined);
      const addr = selectedStore ? fullAddress(selectedStore) : undefined;
      await saveAppointments(appointments, user.uid, effectiveInfo, addr || undefined);
      if (isCustomer && selectedStore && totalPoints > 0) {
        await AuthService.addCustomerStoreRewardsPoints(user.uid, selectedStore.id, totalPoints);
      }
      clearCart();
      // Store admins go to the calendar after booking
      if (isStoreAdmin) {
        navigate("/store-admin/calendar", {replace: true});
      } else {
        navigate("/customer", {replace: true});
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save appointments.");
    }
    setSaving(false);
  }

  function handleSave() {
    if (isStoreAdmin) {
      // Store admin flow: collect walk-in customer info first
      setShowGuestModal(true);
    } else {
      doSave();
    }
  }

  function nextTimeForParty(targetPartyName: string | null, newParty: boolean): {date: string; timeSlot: string} | null {
    if (appointments.length === 0) return null;
    const primaryFirst = [...appointments]
      .filter((apt) => partyKey(apt.partyName) === "__primary__")
      .sort((a, b) => toMinutes(a.timeSlot) - toMinutes(b.timeSlot))[0] ?? appointments[0];
    if (newParty) {
      return {date: primaryFirst.date, timeSlot: toHHMM(toMinutes(primaryFirst.timeSlot) + primaryFirst.durationMinutes)};
    }
    const targetKey = partyKey(targetPartyName);
    const last = [...appointments]
      .filter((apt) => partyKey(apt.partyName) === targetKey)
      .sort((a, b) => toMinutes(b.timeSlot) - toMinutes(a.timeSlot))[0];
    if (!last) {
      return {date: primaryFirst.date, timeSlot: toHHMM(toMinutes(primaryFirst.timeSlot) + primaryFirst.durationMinutes)};
    }
    return {date: last.date, timeSlot: toHHMM(toMinutes(last.timeSlot) + last.durationMinutes)};
  }

  function startAddServiceForParty(targetPartyName: string | null, newParty: boolean) {
    if (!selectedStore) return;
    const next = nextTimeForParty(targetPartyName, newParty);
    if (!next) return;
    beginChainedBooking(targetPartyName, next.date, next.timeSlot);
    navigate(`/customer/booking/${selectedStore.id}/service`);
  }

  async function handleGuestConfirm(firstName: string, lastName: string, phone: string) {
    if (!user || !selectedStore) return;
    const guestId = await (async () => {
      try {
        const guest = await createGuestCustomer({firstName, lastName, phone, storeId: selectedStore.id});
        return guest.id;
      } catch {
        return user.uid;
      }
    })();
    setShowGuestModal(false);
    await doSave({customerName: `${firstName} ${lastName}`, customerPhone: phone});
    void guestId; // guestId stored in Firestore guestCustomers; customerUserId already set to it via saveAppointments
  }

  if (appointments.length === 0) {
    return (
      <>
        <AppBar title="Appointment Summary" backTo="/customer/search" />
        <div className="page-bg">
          <main className="container" style={{paddingTop: "2rem", maxWidth: 640, textAlign: "center"}}>
            <p style={{fontSize: "1.5rem"}}>🛒</p>
            <p style={{color: "var(--color-text-muted)"}}>Your cart is empty.</p>
            <Link to="/customer/search" className="btn btn--primary" style={{marginTop: "1rem"}}>
              Book an Appointment
            </Link>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      {showGuestModal && (
        <GuestCustomerModal
          saving={saving}
          onConfirm={handleGuestConfirm}
          onCancel={() => setShowGuestModal(false)}
        />
      )}
      {showPartyDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div className="nnc-card" style={{width: "100%", maxWidth: 420, padding: "1.5rem"}}>
            <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
              Add Another Party
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
              Enter the name for the next person in this booking.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newPartyName.trim();
                if (!trimmed) return;
                setShowPartyDialog(false);
                setNewPartyName("");
                startAddServiceForParty(trimmed, true);
              }}
            >
              <div className="form-group">
                <label className="nnc-label">Party Name</label>
                <input
                  className="form-input"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                  required
                />
              </div>
              <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
                <button
                  type="button"
                  className="btn btn--outline btn--full"
                  onClick={() => {
                    setShowPartyDialog(false);
                    setNewPartyName("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn--primary-full"
                  disabled={!newPartyName.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AppBar title="Appointment Summary" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          {/* Appointment cards */}
          {appointments.map((apt, i) => {
            const offer = rewardForApt(apt, rewards, userPoints);
            return (
              <div key={i} className="apt-card">
                <div className="apt-card__header">
                  <div>
                    <p className="apt-card__store">{apt.serviceIcon} {apt.serviceTitle}</p>
                    <p className="apt-card__meta">{apt.storeName}</p>
                    <p className="apt-card__meta">
                      📅 {formatDateDisplay(apt.date)} at {formatAmPm(apt.timeSlot)}
                      {apt.durationMinutes > 0 && ` (${apt.durationMinutes} min)`}
                    </p>
                    {apt.isSpecialRequest && (
                      <p className="apt-card__meta" style={{color: "#7c3aed", fontWeight: 600}}>
                        ✨ Special Request — pending salon approval
                      </p>
                    )}
                    <p className="apt-card__meta">👤 Provider: {apt.employeeName}</p>
                    <p className="apt-card__meta">
                      🙋 {apt.partyName ?? userName}
                    </p>
                    {apt.priceCents === 0 ? (
                      <p className="apt-card__meta" style={{color: "var(--color-success)", fontWeight: 600}}>
                        $0.00 (reward applied)
                      </p>
                    ) : (
                      <p className="apt-card__meta">{formatCurrency(apt.priceCents)}</p>
                    )}
                  </div>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => removeAppointmentAt(i)}
                  >
                    Delete
                  </button>
                </div>
                {offer && apt.priceCents > 0 && (
                  <div className="reward-offer">
                    <p style={{margin: "0 0 0.25rem", fontWeight: 600, fontSize: "0.85rem"}}>
                      🎁 Reward offer: {offer.rewardName}
                    </p>
                    <p style={{margin: "0 0 0.35rem", fontSize: "0.82rem", color: "var(--color-text-muted)"}}>
                      {offer.rewardDescription} — {offer.pointsRequired} points
                    </p>
                    <button
                      className="btn btn--sm"
                      style={{background: "var(--color-success)", color: "#fff"}}
                      onClick={() => applyRewardAt(i)}
                    >
                      Apply reward
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Rewards redemption section */}
          {!isStoreAdmin && (
            <div className="rewards-section">
              <h3 className="rewards-section__title">🏆 Rewards redemption</h3>
              {!user ? (
                <p style={{fontSize: "0.9rem", color: "var(--color-text-muted)"}}>
                  <Link to="/login" style={{color: "var(--color-primary)"}}>Sign in</Link> with a
                  customer account to use your rewards points and apply store offers.
                </p>
              ) : !isCustomer ? (
                <p style={{fontSize: "0.9rem", color: "var(--color-text-muted)"}}>
                  Rewards redemption is only available for customer accounts.
                </p>
              ) : (
                <>
                  <p style={{fontSize: "0.9rem", margin: "0 0 0.5rem"}}>
                    Your balance: <strong style={{color: "var(--color-primary)"}}>{userPoints} points</strong>
                  </p>
                  {appointments.every((apt) => !rewardForApt(apt, rewards, userPoints)) && (
                    <p style={{fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
                      No redeemable rewards for these appointments with your current balance.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Store admin note */}
          {isStoreAdmin && (
            <div className="info-message" style={{marginBottom: "1rem"}}>
              👤 After clicking Save, you'll be asked for the customer's name and phone number.
            </div>
          )}

          {/* Totals */}
          <div className="totals-card" style={{marginBottom: "1rem"}}>
            <div className="totals-row">
              <span>Subtotal</span><span>{formatCurrency(subtotalCents)}</span>
            </div>
            <div className="totals-row">
              <span>Rewards points earned</span><span>{totalPoints} pts</span>
            </div>
            <div className="totals-row">
              <span>Tax {stateCode ? `(${stateCode})` : ""}</span>
              <span>{formatCurrency(taxCents)}</span>
            </div>
            <div className="totals-row totals-row--total">
              <span>Total</span><span>{formatCurrency(totalCents)}</span>
            </div>
          </div>

          {conflictMsg && (
            <div className="error-message" style={{marginBottom: "0.75rem"}}>
              ⚠️ {conflictMsg}
            </div>
          )}
          {saveError && (
            <div className="error-message" style={{marginBottom: "0.75rem"}}>
              {saveError}
            </div>
          )}

          {/* Actions */}
          <button
            className="btn btn--primary btn--full btn--lg"
            onClick={handleSave}
            disabled={saving || appointments.length === 0}
            style={{marginBottom: "0.75rem"}}
          >
            {saving ? "Saving…" : isStoreAdmin ? "Save Appointment" : "Save Appointments"}
          </button>

          <button
            type="button"
            className="btn btn--outline btn--full btn--lg"
            onClick={() => startAddServiceForParty(null, false)}
            disabled={!selectedStore}
            style={{marginBottom: "0.75rem"}}
          >
            Add Another Service
          </button>
          <button
            type="button"
            className="btn btn--outline btn--full btn--lg"
            onClick={() => setShowPartyDialog(true)}
            disabled={!selectedStore}
          >
            Add Another Party
          </button>
        </main>
      </div>
    </>
  );
}
