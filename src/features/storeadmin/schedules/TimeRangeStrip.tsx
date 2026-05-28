import React, {useCallback, useEffect, useRef, useState} from "react";

const MIN_MINUTES = 6 * 60; // 6:00
const MAX_MINUTES = 22 * 60; // 22:00
const SLOT_MINUTES = 30;
const SLOT_COUNT = (MAX_MINUTES - MIN_MINUTES) / SLOT_MINUTES;

function minutesToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm: string | null): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm.trim())) return null;
  const [h, m] = hhmm.trim().split(":").map(Number);
  const min = h * 60 + m;
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, min));
}

interface TimeRangeStripProps {
  label: string;
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
  color: string;
}

export function TimeRangeStrip({label, start, end, onChange, color}: TimeRangeStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | "body" | null>(null);
  const [dragStartSlot, setDragStartSlot] = useState(0);

  const startMin = start != null ? hhmmToMinutes(start) : null;
  const endMin = end != null ? hhmmToMinutes(end) : null;
  const hasRange = startMin != null && endMin != null;
  const startSlot = startMin != null ? Math.floor((startMin - MIN_MINUTES) / SLOT_MINUTES) : 0;
  const endSlot = endMin != null ? Math.ceil((endMin - MIN_MINUTES) / SLOT_MINUTES) : 0;
  const lowSlot = hasRange ? Math.max(0, Math.min(startSlot, endSlot)) : 0;
  const highSlot = hasRange ? Math.min(SLOT_COUNT, Math.max(startSlot, endSlot)) : 0;

  const getSlotFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const el = stripRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const slot = Math.floor(pct * SLOT_COUNT);
      return Math.max(0, Math.min(slot, SLOT_COUNT - 1));
    },
    []
  );

  const slotToMinutes = (slot: number) => MIN_MINUTES + slot * SLOT_MINUTES;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const slot = getSlotFromEvent(e);
      setDragStartSlot(slot);
      setDragging("body");
    },
    [getSlotFromEvent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging === null) return;
      const slot = getSlotFromEvent(e);
      const a = Math.min(dragStartSlot, slot);
      const b = Math.max(dragStartSlot, slot);
      const startM = slotToMinutes(a);
      const endM = slotToMinutes(Math.min(b + 1, SLOT_COUNT));
      onChange(minutesToHHmm(startM), minutesToHHmm(endM));
    },
    [dragging, dragStartSlot, getSlotFromEvent, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging === null) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div style={{marginBottom: "1.25rem"}}>
      <div style={{display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.875rem"}}>
        <span style={{fontWeight: 600}}>{label}</span>
        <span style={{color: "var(--color-text-muted)"}}>
          {start ?? "—"} – {end ?? "—"}
        </span>
      </div>
      <div
        ref={stripRef}
        role="slider"
        aria-label={`${label} time range`}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        style={{
          height: 40,
          background: "var(--color-surface)",
          borderRadius: 8,
          position: "relative",
          cursor: "crosshair",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${(lowSlot / SLOT_COUNT) * 100}%`,
            width: `${((highSlot - lowSlot) / SLOT_COUNT) * 100}%`,
            top: 0,
            bottom: 0,
            background: color,
            borderRadius: 6,
            pointerEvents: "none",
          }}
        />
        {/* time ticks */}
        {Array.from({length: SLOT_COUNT + 1}, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i / SLOT_COUNT) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: i % 2 === 0 ? "rgba(0,0,0,0.08)" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
