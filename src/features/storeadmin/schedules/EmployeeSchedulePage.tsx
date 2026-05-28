import {useEffect, useState, useCallback, useMemo} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {getEmployee, getScheduleDay, setScheduleDay} from "../../../data/store/storeApi";
import type {Employee, ScheduleDay, PersonalSlot} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";

// ── Time utilities ────────────────────────────────────────────────────────────

const MIN_MIN = 6 * 60;   // 06:00
const MAX_MIN = 23 * 60;  // 23:00
const STEP    = 30;

function minsToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function HHMMtoDisplay(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const ALL_TIMES = Array.from(
  {length: (MAX_MIN - MIN_MIN) / STEP + 1},
  (_, i) => minsToHHMM(MIN_MIN + i * STEP)
);

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d); out.setDate(out.getDate() + n); return out;
}
function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}
function weekDatesFor(iso: string): Date[] {
  const start = startOfWeek(parseLocalDate(iso));
  return Array.from({length: 7}, (_, i) => addDays(start, i));
}
function formatDayMonth(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
function formatWeekRange(iso: string): string {
  const days = weekDatesFor(iso);
  const start = days[0]!;
  const end = days[6]!;
  return `${formatDayMonth(start)}/${start.getFullYear()} - ${formatDayMonth(end)}/${end.getFullYear()}`;
}

// ── Copied schedule (module-level singleton like Android) ─────────────────────

let _copied: {workStart: string | null; workEnd: string | null; personalSlots: PersonalSlot[]} | null = null;

// ── Time picker modal ─────────────────────────────────────────────────────────

interface TimePickerProps {
  title: string;
  options: string[];
  onSelect: (t: string) => void;
  onCancel: () => void;
}
function TimePicker({title, options, onSelect, onCancel}: TimePickerProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: 320, maxHeight: "70vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{padding: "16px 20px", borderBottom: "1px solid #eee"}}>
          <p style={{margin: 0, fontWeight: 700, fontSize: "1rem", color: "#1f1f1f"}}>{title}</p>
        </div>
        <div style={{overflowY: "auto", flex: 1}}>
          {options.map((t) => (
            <button
              key={t}
              onClick={() => onSelect(t)}
              style={{
                display: "block", width: "100%", padding: "13px 20px",
                textAlign: "left", border: "none", background: "none",
                fontSize: "0.95rem", color: "#1f1f1f", cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3eeff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {HHMMtoDisplay(t)}
            </button>
          ))}
        </div>
        <div style={{padding: "12px 20px", borderTop: "1px solid #eee"}}>
          <button
            onClick={onCancel}
            style={{
              width: "100%", padding: "10px", borderRadius: 10,
              background: "#7c3aed", color: "#fff", border: "none",
              fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EmployeeSchedulePage() {
  const {employeeId} = useParams<{employeeId: string}>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = dateParam || formatDate(new Date());
  const storeId = getActiveStoreId();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [workStart, setWorkStart] = useState<string | null>(null);
  const [workEnd, setWorkEnd]     = useState<string | null>(null);
  const [personalSlots, setPersonalSlots] = useState<PersonalSlot[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [canPaste, setCanPaste]   = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([date]);
  const weekDates = useMemo(() => weekDatesFor(date), [date]);
  const weekDateStrings = useMemo(() => weekDates.map(formatDate), [weekDates]);

  // Time picker dialog state
  type PickerMode = "work-start" | "work-end" | "personal-start" | "personal-end" | null;
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerEditIdx, setPickerEditIdx] = useState<number | null>(null);
  const [tempStart, setTempStart] = useState<string | null>(null);

  const changeWeek = useCallback((weeks: number) => {
    setSearchParams((prev) => {
      const currentDate = prev.get("date") || date;
      const nextDate = formatDate(addDays(startOfWeek(parseLocalDate(currentDate)), weeks * 7));
      const next = new URLSearchParams(prev);
      next.set("date", nextDate);
      return next;
    });
    setWorkStart(null);
    setWorkEnd(null);
    setPersonalSlots([]);
    setSaved(false);
  }, [date, setSearchParams]);

  useEffect(() => {
    if (!storeId || !employeeId) return;
    getEmployee(storeId, employeeId).then(setEmployee);
  }, [storeId, employeeId]);

  useEffect(() => {
    if (!storeId || !employeeId) return;
    setSelectedDates([date]);
    getScheduleDay(storeId, employeeId, date).then((d) => {
      setWorkStart(d?.workStart ?? null);
      setWorkEnd(d?.workEnd ?? null);
      if (d?.personalSlots && d.personalSlots.length > 0) {
        setPersonalSlots(d.personalSlots);
      } else if (d?.lunchStart && d.lunchEnd) {
        setPersonalSlots([{start: d.lunchStart, end: d.lunchEnd}]);
      } else {
        setPersonalSlots([]);
      }
    });
    setCanPaste(_copied != null);
  }, [storeId, employeeId, date]);

  // ── Time picker logic ────────────────────────────────────────────────────────

  function openWorkTimePicker() {
    setTempStart(workStart);
    setPickerMode("work-start");
  }
  function openPersonalTimePicker(editIdx?: number) {
    setPickerEditIdx(editIdx ?? null);
    setTempStart(editIdx != null ? (personalSlots[editIdx]?.start ?? null) : null);
    setPickerMode("personal-start");
  }
  function closePicker() {
    setPickerMode(null); setTempStart(null); setPickerEditIdx(null);
  }

  function handlePickerSelect(t: string) {
    if (pickerMode === "work-start") {
      setTempStart(t); setPickerMode("work-end");
    } else if (pickerMode === "work-end") {
      setWorkStart(tempStart); setWorkEnd(t); closePicker();
    } else if (pickerMode === "personal-start") {
      setTempStart(t); setPickerMode("personal-end");
    } else if (pickerMode === "personal-end") {
      if (pickerEditIdx != null) {
        setPersonalSlots((prev) => prev.map((s, i) => i === pickerEditIdx ? {start: tempStart!, end: t} : s));
      } else {
        setPersonalSlots((prev) => [...prev, {start: tempStart!, end: t}]);
      }
      closePicker();
    }
  }

  const pickerOptions: string[] = (() => {
    if (pickerMode === "work-end" && tempStart) return ALL_TIMES.filter((t) => t > tempStart);
    if (pickerMode === "personal-end" && tempStart) return ALL_TIMES.filter((t) => t > tempStart);
    return ALL_TIMES;
  })();

  const pickerTitle: string = (() => {
    if (pickerMode === "work-start")     return "Work Time – Start";
    if (pickerMode === "work-end")       return "Work Time – End";
    if (pickerMode === "personal-start") return "Personal Time – Start";
    if (pickerMode === "personal-end")   return "Personal Time – End";
    return "";
  })();

  // ── Copy / Paste / Save ──────────────────────────────────────────────────────

  function handleCopy() {
    _copied = {workStart, workEnd, personalSlots: personalSlots.map((s) => ({...s}))};
    setCanPaste(true);
  }
  function handlePaste() {
    if (!_copied) return;
    setWorkStart(_copied.workStart);
    setWorkEnd(_copied.workEnd);
    setPersonalSlots(_copied.personalSlots.map((s) => ({...s})));
  }

  async function handleSave() {
    if (!storeId || !employeeId) return;
    setSaving(true);
    const firstPersonal = personalSlots[0] ?? null;
    const datesToSave = selectedDates.length > 0 ? selectedDates : [date];
    await Promise.all(datesToSave.map((selectedDate) => {
      const payload: ScheduleDay = {
      employeeId,
      date: selectedDate,
      workStart,
      workEnd,
      lunchStart: firstPersonal?.start ?? null,
      lunchEnd:   firstPersonal?.end   ?? null,
      breakStart: null, breakEnd: null, personalStart: null, personalEnd: null,
      personalSlots: personalSlots.length > 0 ? personalSlots : undefined,
      };
      return setScheduleDay(storeId, payload);
    }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!storeId || !employeeId) return null;

  const PRIMARY = "#7c3aed";
  const SURFACE = "#fff";
  const PAGE_BG = "#f8f5ff";
  const TEXT_PRI = "#1f1f1f";
  const TEXT_SEC = "#6b6b6b";

  return (
    <div style={{minHeight: "100vh", background: PAGE_BG}}>
      {/* Top bar */}
      <header style={{
        background: "linear-gradient(180deg,#2d1b69,#5b21b6)",
        color: "#fff", padding: "0.75rem 1rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <Link to="/store-admin/schedules" style={{color: "#fff", textDecoration: "none", fontWeight: 600}}>
          ← Back
        </Link>
        <span style={{flex: 1, textAlign: "center", fontWeight: 700, fontSize: "1.05rem"}}>
          Employee Schedule
        </span>
      </header>

      <main style={{maxWidth: 480, margin: "0 auto", padding: "1rem 1rem 3rem"}}>

        {/* Week nav */}
        <div style={{
          background: SURFACE, borderRadius: 14, padding: "10px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 16,
        }}>
          <button type="button" onClick={() => changeWeek(-1)} style={navBtnStyle(PRIMARY)}>← Prev</button>
          <span style={{fontWeight: 600, fontSize: "0.85rem", color: TEXT_PRI}}>{formatWeekRange(date)}</span>
          <button type="button" onClick={() => changeWeek(1)} style={navBtnStyle(PRIMARY)}>Next →</button>
        </div>

        {/* Schedule controls card */}
        <div style={{
          background: SURFACE, borderRadius: 16, padding: "1rem 1.25rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.09)", marginBottom: 16,
        }}>
          <p style={{margin: "0 0 0.75rem", fontWeight: 700, fontSize: "1rem", color: PRIMARY}}>
            {employee ? `${employee.firstName} ${employee.lastName}` : "Loading…"}
          </p>

          <div style={weekSelectorStyle}>
            {weekDates.map((weekDate, idx) => {
              const iso = weekDateStrings[idx]!;
              const checked = selectedDates.includes(iso);
              return (
                <label key={iso} style={daySelectStyle(checked, PRIMARY)}>
                  <span style={{fontSize: "0.78rem", fontWeight: 700, color: checked ? PRIMARY : TEXT_PRI}}>
                    {"SMTWRFS"[idx]}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedDates((prev) => e.target.checked
                        ? Array.from(new Set([...prev, iso])).sort()
                        : prev.filter((d) => d !== iso));
                    }}
                    style={{width: 18, height: 18, accentColor: PRIMARY}}
                  />
                  <span style={{fontSize: "0.74rem", color: TEXT_SEC}}>{formatDayMonth(weekDate)}</span>
                </label>
              );
            })}
          </div>

          {/* Work Time */}
          <button onClick={openWorkTimePicker} style={outlinedBtnStyle(PRIMARY)}>🕐  Work Time</button>
          {workStart && workEnd && (
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6}}>
              <span style={{fontSize: "0.875rem", color: TEXT_SEC}}>
                {HHMMtoDisplay(workStart)} – {HHMMtoDisplay(workEnd)}
              </span>
              <button onClick={openWorkTimePicker} style={smallEditStyle(PRIMARY)}>Edit</button>
            </div>
          )}

          <div style={{marginTop: 10}} />

          {/* Personal Time */}
          <button onClick={() => openPersonalTimePicker()} style={outlinedBtnStyle(PRIMARY)}>☕  Personal Time</button>
          {personalSlots.map((slot, idx) => (
            <div key={idx} style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6}}>
              <span style={{fontSize: "0.875rem", color: TEXT_SEC}}>
                {HHMMtoDisplay(slot.start)} – {HHMMtoDisplay(slot.end)}
              </span>
              <div style={{display: "flex", gap: 6}}>
                <button onClick={() => openPersonalTimePicker(idx)} style={smallEditStyle(PRIMARY)}>Edit</button>
                <button
                  onClick={() => setPersonalSlots((p) => p.filter((_, i) => i !== idx))}
                  style={{...smallEditStyle("#d32f2f"), borderColor: "#d32f2f", color: "#d32f2f"}}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Copy / Paste */}
          <div style={{display: "flex", gap: 8, marginTop: 14}}>
            <button onClick={handleCopy} style={halfOutlinedBtnStyle(PRIMARY)}>Copy</button>
            <button onClick={handlePaste} disabled={!canPaste} style={halfOutlinedBtnStyle(PRIMARY, !canPaste)}>Paste</button>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || selectedDates.length === 0}
            style={{
              marginTop: 14, width: "100%", padding: "12px",
              background: saved ? "#2e7d32" : PRIMARY, color: "#fff",
              border: "none", borderRadius: 10, fontWeight: 700,
              fontSize: "0.95rem", cursor: saving || selectedDates.length === 0 ? "default" : "pointer",
              opacity: saving || selectedDates.length === 0 ? 0.7 : 1, transition: "background 0.3s",
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Schedule"}
          </button>
        </div>

        {/* Schedule preview */}
        <div style={{
          background: SURFACE, borderRadius: 14, padding: "0.875rem 1.125rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        }}>
          <p style={{margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.875rem", color: PRIMARY}}>Schedule Preview</p>
          <p style={{margin: "0 0 0.25rem", fontSize: "0.825rem", color: TEXT_SEC}}>
            Work time: {workStart && workEnd ? `${HHMMtoDisplay(workStart)} – ${HHMMtoDisplay(workEnd)}` : "—"}
          </p>
          <p style={{margin: 0, fontSize: "0.825rem", color: TEXT_SEC}}>
            Personal time:{" "}
            {personalSlots.length > 0
              ? personalSlots.map((s) => `${HHMMtoDisplay(s.start)}–${HHMMtoDisplay(s.end)}`).join(", ")
              : "—"}
          </p>
        </div>
      </main>

      {/* Time picker modal */}
      {pickerMode && (
        <TimePicker
          title={pickerTitle}
          options={pickerOptions}
          onSelect={handlePickerSelect}
          onCancel={closePicker}
        />
      )}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function navBtnStyle(color: string): React.CSSProperties {
  return {
    padding: "6px 14px", fontSize: "0.8rem", background: "none",
    color, border: `1px solid ${color}`, borderRadius: 8, cursor: "pointer", fontWeight: 500,
  };
}
function outlinedBtnStyle(color: string): React.CSSProperties {
  return {
    width: "100%", padding: "11px 16px", fontSize: "0.925rem", fontWeight: 500,
    background: "none", color, border: `1.5px solid ${color}`,
    borderRadius: 10, cursor: "pointer", textAlign: "left",
  };
}
function smallEditStyle(color: string): React.CSSProperties {
  return {
    padding: "3px 10px", fontSize: "0.8rem", background: "none",
    color, border: `1px solid ${color}`, borderRadius: 6, cursor: "pointer",
  };
}
function halfOutlinedBtnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    flex: 1, padding: "8px", fontSize: "0.875rem", background: "none",
    color: disabled ? "#aaa" : color,
    border: `1px solid ${disabled ? "#ccc" : color}`,
    borderRadius: 8, cursor: disabled ? "default" : "pointer", fontWeight: 500,
  };
}
const weekSelectorStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 6,
  marginBottom: 14,
};
function daySelectStyle(checked: boolean, color: string): React.CSSProperties {
  return {
    minWidth: 0,
    padding: "7px 2px",
    borderRadius: 10,
    border: `1px solid ${checked ? color : "#e5e7eb"}`,
    background: checked ? "#f3eeff" : "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
  };
}
