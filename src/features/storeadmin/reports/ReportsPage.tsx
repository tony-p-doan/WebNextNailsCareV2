import {useEffect, useMemo, useState} from "react";
import {AppBar} from "../../../core/ui/AppBar";
import {getAppointmentsForRange} from "../../../data/appointmentApi";
import type {SavedAppointment} from "../../../domain/models/BookingAppointment";
import {getActiveStoreId} from "../storeAdminContext";

type ReportView = "day" | "week" | "month" | "year";
type Breakdown = "service" | "employee";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function dateString(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function todayString() { return dateString(new Date()); }
function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function cents(c: number) { return `$${(c / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; }

function rangeFor(view: ReportView, anchor: string, month: string, year: number) {
  if (view === "day") return {start: anchor, end: anchor};
  if (view === "week") {
    const d = parseDate(anchor);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {start: dateString(start), end: dateString(end)};
  }
  if (view === "month") {
    const [y, m] = month.split("-").map(Number);
    return {start: `${y}-${pad(m)}-01`, end: dateString(new Date(y, m, 0))};
  }
  return {start: `${year}-01-01`, end: `${year}-12-31`};
}

function groupAppointments(appointments: SavedAppointment[], breakdown: Breakdown) {
  const map = new Map<string, {label: string; total: number; count: number}>();
  appointments.forEach((apt) => {
    const label = breakdown === "service" ? apt.serviceTitle || "Service" : apt.employeeName || "Any Provider";
    const current = map.get(label) ?? {label, total: 0, count: 0};
    current.total += apt.priceCents;
    current.count += 1;
    map.set(label, current);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function ReportsPage() {
  const storeId = getActiveStoreId();
  const [view, setView] = useState<ReportView>("day");
  const [breakdown, setBreakdown] = useState<Breakdown>("service");
  const [anchorDate, setAnchorDate] = useState(todayString());
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear());
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => rangeFor(view, anchorDate, month, year), [view, anchorDate, month, year]);
  const rows = useMemo(() => groupAppointments(appointments, breakdown), [appointments, breakdown]);
  const total = appointments.reduce((sum, apt) => sum + apt.priceCents, 0);
  const max = Math.max(...rows.map((row) => row.total), 1);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    getAppointmentsForRange(storeId, range.start, range.end)
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, [storeId, range.start, range.end]);

  return (
    <>
      <AppBar title="Reports" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container reports-page">
          <section className="nnc-card reports-hero">
            <div>
              <p className="nnc-label">Sales Report</p>
              <h1>{cents(total)}</h1>
              <p>{appointments.length} appointment{appointments.length === 1 ? "" : "s"} · {range.start} to {range.end}</p>
            </div>
            <div className="reports-controls">
              <div className="segmented">
                {(["day", "week", "month", "year"] as ReportView[]).map((v) => (
                  <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
                ))}
              </div>
              <div className="segmented">
                <button className={breakdown === "service" ? "active" : ""} onClick={() => setBreakdown("service")}>Service Type</button>
                <button className={breakdown === "employee" ? "active" : ""} onClick={() => setBreakdown("employee")}>Employee</button>
              </div>
            </div>
          </section>

          <section className="nnc-card reports-picker">
            {(view === "day" || view === "week") && (
              <label>{view === "day" ? "Report Day" : "Tap Any Day In Week"}
                <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
              </label>
            )}
            {view === "month" && (
              <>
                <label>Year
                  <input type="number" value={Number(month.slice(0, 4))} onChange={(e) => setMonth(`${e.target.value}-${month.slice(5, 7)}`)} />
                </label>
                <div className="month-grid">
                  {MONTHS.map((m, idx) => {
                    const value = `${month.slice(0, 4)}-${pad(idx + 1)}`;
                    return <button key={m} className={month === value ? "active" : ""} onClick={() => setMonth(value)}>{m}</button>;
                  })}
                </div>
              </>
            )}
            {view === "year" && (
              <label>Report Year
                <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} />
              </label>
            )}
          </section>

          <section className="reports-grid">
            <div className="nnc-card reports-chart">
              <h2>Sales Graph</h2>
              {loading ? <p className="loading-text">Loading...</p> : rows.length === 0 ? <p className="empty-text">No sales for this period.</p> : rows.map((row) => (
                <div key={row.label} className="bar-row">
                  <span>{row.label}</span>
                  <div><i style={{width: `${Math.max(5, (row.total / max) * 100)}%`}} /></div>
                  <strong>{cents(row.total)}</strong>
                </div>
              ))}
            </div>
            <div className="nnc-card reports-table">
              <h2>{breakdown === "service" ? "By Service Type" : "By Employee"}</h2>
              {rows.map((row) => (
                <div key={row.label} className="report-line">
                  <span>{row.label}<small>{row.count} appointment{row.count === 1 ? "" : "s"}</small></span>
                  <b>{cents(row.total)}</b>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
