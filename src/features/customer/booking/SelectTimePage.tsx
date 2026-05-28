import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {getAvailableTimeSlots, getService, getStore} from "../../../data/store/storeApi";
import {useBooking} from "./BookingContext";

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"});
}

const DEMO_REWARDS_POINTS = 30;

/** Generate every 30-min slot from 9:00 AM to 5:30 PM for demo stores. */
function demoSlots(): string[] {
  const slots: string[] = [];
  for (let t = 9 * 60; t <= 17 * 60 + 30; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function SelectTimePage() {
  const {storeId = "", serviceId = "", date = ""} = useParams<{
    storeId: string; serviceId: string; date: string;
  }>();
  const navigate = useNavigate();
  const {selectedStore, setSelectedStore, addAppointment} = useBooking();
  const isDemo = selectedStore?.isDemoStore ?? false;

  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSpecialDialog, setShowSpecialDialog] = useState(false);
  const [specialTime, setSpecialTime] = useState("12:00");
  const [submittingSpecial, setSubmittingSpecial] = useState(false);
  const [specialError, setSpecialError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setSlots(demoSlots());
      setLoading(false);
      return;
    }
    if (!storeId || !serviceId || !date) return;
    getAvailableTimeSlots(storeId, serviceId, date).then((s) => {
      setSlots(s);
      setLoading(false);
    });
  }, [storeId, serviceId, date, isDemo]);

  function handleSelect(slot: string) {
    navigate(`/customer/booking/${storeId}/service/${serviceId}/date/${date}/time/${slot}/provider`);
  }

  async function handleSpecialConfirm() {
    if (!specialTime) {
      setSpecialError("Please choose a time.");
      return;
    }
    setSubmittingSpecial(true);
    setSpecialError(null);
    try {
      const storePromise = selectedStore ?
        Promise.resolve(selectedStore) :
        getStore(storeId);
      const [store, service] = await Promise.all([
        storePromise,
        getService(storeId, serviceId),
      ]);
      if (!store || !service) {
        throw new Error("Couldn't load store or service details.");
      }
      if (!selectedStore) setSelectedStore(store);
      addAppointment({
        storeId,
        storeName: store.businessName,
        serviceId,
        serviceTitle: service.title,
        serviceIcon: service.icon,
        date,
        timeSlot: specialTime,
        durationMinutes: service.durationMinutes ?? 60,
        employeeId: null,
        employeeName: "Any Provider",
        priceCents: service.priceCents ?? 0,
        originalPriceCents: service.priceCents ?? 0,
        rewardsPoints: isDemo ?
          DEMO_REWARDS_POINTS :
          (service.rewardsPoints ?? 0),
        partyName: null,
        isSpecialRequest: true,
      });
      setShowSpecialDialog(false);
      navigate("/customer/booking/summary");
    } catch (e: unknown) {
      setSpecialError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmittingSpecial(false);
    }
  }

  return (
    <>
      <AppBar title="Select a Time" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 560}}>
          {date && (
            <div className="nnc-card" style={{display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem"}}>
              <div className="icon-circle" style={{background: "linear-gradient(135deg,#6ee7f7,#3b82f6)"}}>📅</div>
              <div>
                <p className="nnc-label" style={{margin: 0}}>Selected Date</p>
                <p style={{margin: 0, fontWeight: 600, fontSize: "0.95rem"}}>{formatDate(date)}</p>
              </div>
            </div>
          )}
          {isDemo && (
            <div className="info-message" style={{margin: "0.5rem 0"}}>
              ✨ <strong>Demo Store</strong> — all time slots are available.
            </div>
          )}
          <p className="nnc-label" style={{marginTop: "0.25rem"}}>Available Times</p>
          {loading ? (
            <p className="loading-text">Loading available times…</p>
          ) : slots.length === 0 ? (
            <div className="nnc-card" style={{textAlign: "center", padding: "2rem"}}>
              <p style={{fontSize: "1.5rem", margin: "0 0 0.5rem"}}>😔</p>
              <p style={{margin: 0, color: "var(--color-text-muted)"}}>No times available for this date.</p>
              <button
                className="btn btn--primary"
                style={{marginTop: "1rem"}}
                onClick={() => {
                  setSpecialError(null);
                  setShowSpecialDialog(true);
                }}
              >
                ✨ Special Request
              </button>
              <button className="btn btn--outline" style={{marginTop: "0.5rem", marginLeft: "0.5rem"}} onClick={() => navigate(-1)}>
                Choose another date
              </button>
              <p style={{marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--color-text-muted)"}}>
                A Special Request asks the salon to fit you in at a time outside their normal availability.
              </p>
            </div>
          ) : (
            <div className="time-grid">
              {slots.map((slot) => (
                <button
                  key={slot}
                  className="time-slot"
                  onClick={() => handleSelect(slot)}
                >
                  {formatAmPm(slot)}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {showSpecialDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}>
          <div className="nnc-card" style={{width: "100%", maxWidth: 420, padding: "1.5rem"}}>
            <h3 style={{margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700}}>
              ✨ Special Request
            </h3>
            <p style={{margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
              Pick any time on <strong>{formatDate(date)}</strong>. The salon will review and approve or decline.
              Your provider will be set to <strong>Any Provider</strong>.
            </p>
            <div className="form-group">
              <label className="nnc-label">Requested time</label>
              <input
                type="time"
                className="form-input"
                value={specialTime}
                onChange={(e) => setSpecialTime(e.target.value)}
                disabled={submittingSpecial}
              />
            </div>
            {specialError && (
              <div className="error-message" style={{marginBottom: "0.5rem"}}>
                {specialError}
              </div>
            )}
            <div style={{display: "flex", gap: "0.75rem", marginTop: "0.5rem"}}>
              <button
                type="button"
                className="btn btn--outline btn--full"
                onClick={() => setShowSpecialDialog(false)}
                disabled={submittingSpecial}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn--primary-full"
                onClick={handleSpecialConfirm}
                disabled={submittingSpecial}
              >
                {submittingSpecial ? "Loading…" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
