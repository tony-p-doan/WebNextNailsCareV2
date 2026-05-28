import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {getAvailableEmployeesForSlot, getService, getStore, listEmployees} from "../../../data/store/storeApi";
import {useBooking} from "./BookingContext";
import type {Employee, Service} from "../../../domain/models/Store";
import type {Store} from "../../../domain/models/Store";
import {getProviderRatingSummary} from "../../../data/providerRatingsApi";
import type {ProviderRatingSummary} from "../../../domain/models/ProviderRating";

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {month: "short", day: "numeric"});
}

const EMP_GRADIENTS = [
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
];

const DEMO_REWARDS_POINTS = 30;

export function SelectProviderPage() {
  const {storeId = "", serviceId = "", date = "", timeSlot = ""} = useParams<{
    storeId: string; serviceId: string; date: string; timeSlot: string;
  }>();
  const navigate = useNavigate();
  const {
    addAppointment,
    setSelectedStore,
    selectedStore,
    pendingPartyName,
    clearChainedBooking,
  } = useBooking();
  const isDemo = selectedStore?.isDemoStore ?? false;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [ratingSummaries, setRatingSummaries] = useState<Record<string, ProviderRatingSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId || !serviceId || !date || !timeSlot) return;

    const storePromise = selectedStore ? Promise.resolve(selectedStore) : getStore(storeId);
    const employeePromise = isDemo
      ? listEmployees(storeId)
      : getAvailableEmployeesForSlot(storeId, serviceId, date, timeSlot);

    Promise.all([employeePromise, getService(storeId, serviceId), storePromise]).then(
      ([emps, svc, st]) => {
        setEmployees(emps);
        setService(svc);
        if (st) { setStore(st); setSelectedStore(st); }
        Promise.all(emps.map((emp) => getProviderRatingSummary(storeId, emp.id).catch(() => null))).then((summaries) => {
          const next: Record<string, ProviderRatingSummary> = {};
          summaries.forEach((summary) => {
            if (summary) next[summary.providerId] = summary;
          });
          setRatingSummaries(next);
        });
        setLoading(false);
      }
    );
  }, [storeId, serviceId, date, timeSlot, isDemo]);

  function createAppointment(emp: Employee | null, isSpecialRequest = false) {
    if (!service || !store) return;
    addAppointment({
      storeId,
      storeName: store.businessName,
      serviceId,
      serviceTitle: service.title,
      serviceIcon: service.icon,
      date,
      timeSlot,
      durationMinutes: service.durationMinutes ?? 60,
      employeeId: emp?.id ?? null,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Any Provider",
      priceCents: service.priceCents ?? 0,
      originalPriceCents: service.priceCents ?? 0,
      // Demo store always awards 30 points; regular stores use service points
      rewardsPoints: isDemo ? DEMO_REWARDS_POINTS : (service.rewardsPoints ?? 0),
      partyName: pendingPartyName,
      isSpecialRequest,
    });
    clearChainedBooking();
    navigate("/customer/booking/summary");
  }

  function pickProvider(emp: Employee | null) {
    createAppointment(emp, false);
  }

  return (
    <>
      <AppBar title="Select a Provider" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 560}}>
          {date && timeSlot && (
            <div className="nnc-card" style={{display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1rem"}}>
              <div className="icon-circle" style={{background: "linear-gradient(135deg,#f9a8d4,#ec4899)"}}>🕐</div>
              <div>
                <p className="nnc-label" style={{margin: 0}}>Appointment</p>
                <p style={{margin: 0, fontWeight: 600, fontSize: "0.95rem"}}>
                  {formatDate(date)} at {formatAmPm(timeSlot)}
                </p>
              </div>
            </div>
          )}
          {isDemo && (
            <div className="info-message" style={{marginBottom: "0.75rem"}}>
              ✨ <strong>Demo Store</strong> — all providers available. You'll earn <strong>30 reward points</strong>.
            </div>
          )}
          <p className="nnc-label">Choose a Provider</p>
          {loading ? (
            <p className="loading-text">Loading providers…</p>
          ) : (
            <>
              {employees.length === 0 ? (
                <>
                  <p className="empty-text">
                    No providers are available at this time.
                  </p>
                  <button
                    className="btn btn--primary btn--full btn--lg"
                    onClick={() => createAppointment(null, true)}
                  >
                    ✨ Special Request
                  </button>
                </>
              ) : (
                <>
                  <button className="provider-card provider-card--any" onClick={() => pickProvider(null)}>
                    <div className="provider-card__avatar">✨</div>
                    <div>
                      <p className="provider-card__name">Any Provider</p>
                      <p className="provider-card__sub">First available staff member</p>
                    </div>
                    <span className="provider-card__arrow">›</span>
                  </button>
                  {employees.map((emp, idx) => {
                    const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
                    return (
                      <button
                        key={emp.id}
                        className="provider-card"
                        onClick={() => pickProvider(emp)}
                      >
                        <div
                          className="provider-card__avatar"
                          style={{background: EMP_GRADIENTS[idx % EMP_GRADIENTS.length]}}
                        >
                          {initials || "👤"}
                        </div>
                        <div>
                          <p className="provider-card__name">{emp.firstName} {emp.lastName}</p>
                          <p className="provider-card__sub">
                            {ratingSummaries[emp.id]?.ratingCount
                              ? `★ ${ratingSummaries[emp.id].ratingAverage.toFixed(1)} (${ratingSummaries[emp.id].ratingCount})`
                              : "Available"}
                          </p>
                        </div>
                        <span className="provider-card__arrow">›</span>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
