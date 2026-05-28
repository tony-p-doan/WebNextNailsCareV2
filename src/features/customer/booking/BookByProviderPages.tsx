import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {
  getAvailableTimeSlotsForProvider,
  getEmployee,
  getProviderAvailableDates,
  getService,
  getStore,
  listEmployees,
  listServices,
} from "../../../data/store/storeApi";
import {serviceIsComplete, type Employee, type Service, type Store} from "../../../domain/models/Store";
import {useBooking} from "./BookingContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const EMP_GRADIENTS = [
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
];
const DEMO_REWARDS_POINTS = 30;

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return date.toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"});
}

function providerName(emp: Employee | null): string {
  return emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Provider";
}

export function BookByProviderSelectProviderPage() {
  const {storeId = ""} = useParams<{storeId: string}>();
  const navigate = useNavigate();
  const {selectedStore, setSelectedStore} = useBooking();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [store, setStore] = useState<Store | null>(selectedStore);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listEmployees(storeId), selectedStore ? Promise.resolve(selectedStore) : getStore(storeId)])
      .then(([emps, st]) => {
        setEmployees(emps);
        setStore(st);
        if (st) setSelectedStore(st);
      })
      .finally(() => setLoading(false));
  }, [storeId, selectedStore, setSelectedStore]);

  return (
    <>
      <AppBar title="Select Provider" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 560}}>
          <p className="nnc-label">{store?.businessName ?? "Book by Provider"}</p>
          {loading ? <p className="loading-text">Loading providers…</p> : employees.length === 0 ? (
            <p className="empty-text">No providers are available for this store.</p>
          ) : employees.map((emp, idx) => {
            const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
            return (
              <button
                key={emp.id}
                className="provider-card"
                onClick={() => navigate(`/customer/book-by-provider/${storeId}/provider/${emp.id}/service`)}
              >
                <div className="provider-card__avatar" style={{background: EMP_GRADIENTS[idx % EMP_GRADIENTS.length]}}>
                  {initials || "👤"}
                </div>
                <div>
                  <p className="provider-card__name">{emp.firstName} {emp.lastName}</p>
                  <p className="provider-card__sub">Choose services from this provider</p>
                </div>
                <span className="provider-card__arrow">›</span>
              </button>
            );
          })}
        </main>
      </div>
    </>
  );
}

export function BookByProviderSelectServicePage() {
  const {storeId = "", employeeId = ""} = useParams<{storeId: string; employeeId: string}>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const {selectedStore} = useBooking();

  useEffect(() => {
    Promise.all([getEmployee(storeId, employeeId), listServices(storeId)])
      .then(([emp, all]) => {
        setEmployee(emp);
        setServices(
          all.filter((s) =>
            serviceIsComplete(s) &&
            (selectedStore?.isDemoStore || s.isActive) &&
            (emp?.serviceIds.includes(s.id) ?? false)
          )
        );
      })
      .finally(() => setLoading(false));
  }, [storeId, employeeId, selectedStore?.isDemoStore]);

  return (
    <>
      <AppBar title="Select Service" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 640}}>
          <p className="nnc-label">Services by {providerName(employee)}</p>
          {loading ? <p className="loading-text">Loading services…</p> : services.length === 0 ? (
            <p className="empty-text">This provider does not have active services available.</p>
          ) : services.map((svc, idx) => (
            <button
              key={svc.id}
              className="nnc-list-row"
              onClick={() => navigate(`/customer/book-by-provider/${storeId}/provider/${employeeId}/service/${svc.id}/date`)}
            >
              <div className="icon-circle" style={{background: EMP_GRADIENTS[idx % EMP_GRADIENTS.length]}}>
                {svc.icon || "💅"}
              </div>
              <div className="nnc-list-row__body">
                <p className="nnc-list-row__title">{svc.title}</p>
                <p className="nnc-list-row__sub">
                  {[
                    svc.durationMinutes ? `⏱ ${svc.durationMinutes} min` : null,
                    svc.priceCents != null ? `$${(svc.priceCents / 100).toFixed(2)}` : null,
                    svc.rewardsPoints > 0 ? `⭐ ${svc.rewardsPoints} pts` : null,
                  ].filter(Boolean).join("  ·  ")}
                </p>
              </div>
              <span className="nnc-list-row__arrow">›</span>
            </button>
          ))}
        </main>
      </div>
    </>
  );
}

export function BookByProviderSelectDatePage() {
  const {storeId = "", employeeId = "", serviceId = ""} =
    useParams<{storeId: string; employeeId: string; serviceId: string}>();
  const navigate = useNavigate();
  const {selectedStore} = useBooking();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const isDemo = selectedStore?.isDemoStore ?? false;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthStart = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const hasAvailableInMonth = Object.entries(available).some(([key, yes]) => {
    const [, mo] = key.split("-").map(Number);
    return yes && mo === viewMonth + 1;
  });

  useEffect(() => {
    setLoading(true);
    if (isDemo) {
      const map: Record<string, boolean> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        map[toDateString(viewYear, viewMonth, d)] = date >= today;
      }
      setAvailable(map);
      setLoading(false);
      return;
    }
    getProviderAvailableDates(storeId, employeeId, serviceId, monthStart, daysInMonth)
      .then(setAvailable)
      .finally(() => setLoading(false));
  }, [storeId, employeeId, serviceId, monthStart, daysInMonth, isDemo, today, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelected(null);
  }

  const cells: Array<{day: number | null}> = [];
  for (let i = 0; i < firstDay; i++) cells.push({day: null});
  for (let d = 1; d <= daysInMonth; d++) cells.push({day: d});

  return (
    <>
      <AppBar title="Select Date" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 480}}>
          <div className="card">
            <div className="calendar">
              <div className="calendar__header">
                <button className="btn btn--sm btn--outline" onClick={prevMonth}>‹</button>
                <span className="calendar__month">{MONTHS[viewMonth]} {viewYear}</span>
                <button className="btn btn--sm btn--outline" onClick={nextMonth}>›</button>
              </div>
              {loading && <p className="loading-text">Checking provider availability…</p>}
              <div className="calendar__grid">
                {DAYS.map((d) => <div key={d} className="calendar__day-label">{d}</div>)}
                {cells.map((cell, i) => {
                  if (!cell.day) return <div key={i} className="calendar__day calendar__day--empty" />;
                  const str = toDateString(viewYear, viewMonth, cell.day);
                  const date = new Date(viewYear, viewMonth, cell.day);
                  const disabled = date < today || !available[str];
                  const isSelected = str === selected;
                  return (
                    <button
                      key={i}
                      className={["calendar__day", isSelected ? "calendar__day--selected" : ""].join(" ")}
                      disabled={disabled}
                      onClick={() => setSelected(str)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {!loading && !hasAvailableInMonth && (
              <div className="info-message" style={{marginTop: "1rem"}}>
                No available dates are currently open for this provider in {MONTHS[viewMonth]}. Choose another month or make a Special Request.
              </div>
            )}
            {selected ? (
              <button
                className="btn btn--primary btn--full"
                style={{marginTop: "1.25rem"}}
                onClick={() => navigate(`/customer/book-by-provider/${storeId}/provider/${employeeId}/service/${serviceId}/date/${selected}/time`)}
              >
                Continue with {selected}
              </button>
            ) : (
              !loading && !hasAvailableInMonth && (
                <button
                  className="btn btn--primary btn--full"
                  style={{marginTop: "1rem"}}
                  onClick={() => navigate(`/customer/book-by-provider/${storeId}/provider/${employeeId}/service/${serviceId}/special-request`)}
                >
                  ✨ Special Request
                </button>
              )
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export function BookByProviderSelectTimePage({specialRequest = false}: {specialRequest?: boolean}) {
  const {storeId = "", employeeId = "", serviceId = "", date = ""} =
    useParams<{storeId: string; employeeId: string; serviceId: string; date?: string}>();
  const navigate = useNavigate();
  const {addAppointment, selectedStore, setSelectedStore} = useBooking();
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(date || "");
  const [specialTime, setSpecialTime] = useState("12:00");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [store, setStore] = useState<Store | null>(selectedStore);
  const [loading, setLoading] = useState(!specialRequest);
  const isDemo = selectedStore?.isDemoStore ?? false;

  useEffect(() => {
    Promise.all([
      getEmployee(storeId, employeeId),
      getService(storeId, serviceId),
      selectedStore ? Promise.resolve(selectedStore) : getStore(storeId),
    ]).then(([emp, svc, st]) => {
      setEmployee(emp);
      setService(svc);
      setStore(st);
      if (st) setSelectedStore(st);
    });
  }, [storeId, employeeId, serviceId, selectedStore, setSelectedStore]);

  useEffect(() => {
    if (specialRequest || !selectedDate) return;
    if (isDemo) {
      setSlots(Array.from({length: 18}, (_, i) => {
        const mins = 9 * 60 + i * 30;
        return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      }));
      setLoading(false);
      return;
    }
    setLoading(true);
    getAvailableTimeSlotsForProvider(storeId, employeeId, serviceId, selectedDate)
      .then(setSlots)
      .finally(() => setLoading(false));
  }, [storeId, employeeId, serviceId, selectedDate, specialRequest, isDemo]);

  function continueWith(timeSlot: string, isSpecial = false) {
    if (!service || !store || !employee || !selectedDate) return;
    addAppointment({
      storeId,
      storeName: store.businessName,
      serviceId,
      serviceTitle: service.title,
      serviceIcon: service.icon,
      date: selectedDate,
      timeSlot,
      durationMinutes: service.durationMinutes ?? 60,
      employeeId: employee.id,
      employeeName: providerName(employee),
      priceCents: service.priceCents ?? 0,
      originalPriceCents: service.priceCents ?? 0,
      rewardsPoints: isDemo ? DEMO_REWARDS_POINTS : (service.rewardsPoints ?? 0),
      partyName: null,
      isSpecialRequest: isSpecial,
    });
    navigate("/customer/booking/summary");
  }

  return (
    <>
      <AppBar title={specialRequest ? "Special Request" : "Select Time"} backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 560}}>
          {specialRequest ? (
            <div className="nnc-card" style={{padding: "1.25rem"}}>
              <p className="nnc-label">Requested Date and Time</p>
              <input className="form-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              <input className="form-input" type="time" value={specialTime} onChange={(e) => setSpecialTime(e.target.value)} style={{marginTop: "0.75rem"}} />
              <p style={{fontSize: "0.85rem", color: "var(--color-text-muted)"}}>
                The salon will review this request for {providerName(employee)} and approve or decline it.
              </p>
              <button className="btn btn--primary btn--full" disabled={!selectedDate || !specialTime} onClick={() => continueWith(specialTime, true)}>
                Continue to Appointment Summary
              </button>
            </div>
          ) : (
            <>
              <p className="nnc-label">{selectedDate ? formatDate(selectedDate) : "Available Times"}</p>
              {loading ? <p className="loading-text">Loading available times…</p> : slots.length === 0 ? (
                <div className="nnc-card" style={{textAlign: "center", padding: "2rem"}}>
                  <p className="empty-text">No times are available for this provider on this date.</p>
                  <button className="btn btn--primary" onClick={() => navigate(`/customer/book-by-provider/${storeId}/provider/${employeeId}/service/${serviceId}/special-request`)}>
                    ✨ Special Request
                  </button>
                </div>
              ) : (
                <div className="time-grid">
                  {slots.map((slot) => (
                    <button key={slot} className="time-slot" onClick={() => continueWith(slot)}>
                      {formatAmPm(slot)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
