import {useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {useBooking} from "./BookingContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function SelectDatePage() {
  const {storeId = "", serviceId = ""} = useParams<{storeId: string; serviceId: string}>();
  const navigate = useNavigate();
  const {selectedStore} = useBooking();
  const isDemo = selectedStore?.isDemoStore ?? false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleSelect(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    // Demo store: allow any date; regular store: block past dates
    if (!isDemo && date < today) return;
    const str = toDateString(viewYear, viewMonth, day);
    setSelected(str);
  }

  function handleContinue() {
    if (!selected) return;
    navigate(`/customer/booking/${storeId}/service/${serviceId}/date/${selected}/time`);
  }

  const cells: Array<{day: number | null}> = [];
  for (let i = 0; i < firstDay; i++) cells.push({day: null});
  for (let d = 1; d <= daysInMonth; d++) cells.push({day: d});

  return (
    <>
      <AppBar title="Select a Date" backHistory />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 480}}>
          {isDemo && (
            <div className="info-message" style={{marginBottom: "1rem"}}>
              ✨ <strong>Demo Store</strong> — any date is available.
            </div>
          )}
          <div className="card">
            <div className="calendar">
              <div className="calendar__header">
                <button className="btn btn--sm btn--outline" onClick={prevMonth}>‹</button>
                <span className="calendar__month">{MONTHS[viewMonth]} {viewYear}</span>
                <button className="btn btn--sm btn--outline" onClick={nextMonth}>›</button>
              </div>
              <div className="calendar__grid">
                {DAYS.map((d) => (
                  <div key={d} className="calendar__day-label">{d}</div>
                ))}
                {cells.map((cell, i) => {
                  if (!cell.day) return <div key={i} className="calendar__day calendar__day--empty" />;
                  const d = new Date(viewYear, viewMonth, cell.day);
                  const isPast = !isDemo && d < today;
                  const str = toDateString(viewYear, viewMonth, cell.day);
                  const isToday = str === toDateString(today.getFullYear(), today.getMonth(), today.getDate());
                  const isSelected = str === selected;
                  return (
                    <button
                      key={i}
                      className={[
                        "calendar__day",
                        isSelected ? "calendar__day--selected" : "",
                        isToday && !isSelected ? "calendar__day--today" : "",
                      ].join(" ")}
                      disabled={isPast}
                      onClick={() => handleSelect(cell.day!)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div style={{marginTop: "1.25rem"}}>
                <button className="btn btn--primary btn--full" onClick={handleContinue}>
                  Continue with {selected}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
