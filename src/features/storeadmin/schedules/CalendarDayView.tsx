import React, {useCallback, useEffect, useRef, useState} from "react";

const MIN_MINUTES = 6 * 60;
const MAX_MINUTES = 23 * 60; // 6AM to 11PM
const SLOT_MINUTES = 30;
const SLOT_COUNT = (MAX_MINUTES - MIN_MINUTES) / SLOT_MINUTES;
const COLUMN_HEIGHT_PX = 400 * 3;
const LABEL_SLOTS = Array.from(
  { length: (23 - 6) * 2 + 1 },
  (_, i) => ({ hour: 6 + Math.floor(i / 2), isHalf: i % 2 === 1 })
);
const HANDLE_HEIGHT = 14;
const EDGE_SCROLL_THRESHOLD = 48;
const EDGE_SCROLL_SPEED = 8;
const SCROLL_ARROW_ROW_HEIGHT = 28;
const SCROLL_JUMP_PX = 80;
const LABEL_COLUMN_WIDTH = 48;
const LABEL_COLUMN_GAP = 8;

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

function yToMinutes(y: number): number {
  const slot = Math.floor((y / COLUMN_HEIGHT_PX) * SLOT_COUNT);
  const clamped = Math.max(0, Math.min(slot, SLOT_COUNT));
  return MIN_MINUTES + clamped * SLOT_MINUTES;
}

function minutesToY(min: number): number {
  const slot = (min - MIN_MINUTES) / SLOT_MINUTES;
  return (slot / SLOT_COUNT) * COLUMN_HEIGHT_PX;
}

export interface PersonalSlot {
  start: string;
  end: string;
}

const PRIMARY_BLUE = "#1976D2";

interface CalendarDayViewProps {
  employeeName?: string;
  workStart: string | null;
  workEnd: string | null;
  personalSlots: PersonalSlot[];
  addedOrder: Array<"work" | "personal">;
  onWorkChange: (start: string | null, end: string | null, isDragStart: boolean) => void;
  onPersonalAdd: (start: string, end: string, isDragStart: boolean) => void;
  onPersonalSlotResize?: (index: number, start: string, end: string) => void;
  onClear: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onSave: () => void;
  saving: boolean;
}

type Mode = "work" | "personal";
type HandleDrag = { kind: "work"; edge: "top" | "bottom" } | { kind: "personal"; index: number; edge: "top" | "bottom" };

const WORK_COLOR = "#c8e6c9";
const PERSONAL_COLOR = "#ffe0b2";
const LABEL_COLOR = "#2e7d32";

export function CalendarDayView({
  employeeName,
  workStart,
  workEnd,
  personalSlots,
  addedOrder,
  onWorkChange,
  onPersonalAdd,
  onPersonalSlotResize,
  onClear,
  onCopy,
  onPaste,
  canPaste,
  onSave,
  saving,
}: CalendarDayViewProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("work");
  const [dragging, setDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [handleDrag, setHandleDrag] = useState<HandleDrag | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const edgeScrollRef = useRef<number | null>(null);
  /** When dragging a handle, we keep the opposite edge fixed using these values (set at drag start). */
  const fixedEdgeRef = useRef<{ startMin: number | null; endMin: number | null }>({ startMin: null, endMin: null });
  const capturedPointerIdRef = useRef<number | null>(null);

  const workStartMin = workStart != null ? hhmmToMinutes(workStart) : null;
  const workEndMin = workEnd != null ? hhmmToMinutes(workEnd) : null;

  const getYInColumn = useCallback((clientY: number): number => {
    const scrollEl = scrollRef.current;
    const col = columnRef.current;
    if (!scrollEl || !col) return 0;
    const scrollRect = scrollEl.getBoundingClientRect();
    const yVisible = clientY - scrollRect.top;
    const yInColumn = scrollEl.scrollTop + yVisible;
    return Math.max(0, Math.min(COLUMN_HEIGHT_PX, yInColumn));
  }, []);

  const getYFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    const el = columnRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return e.clientY - rect.top;
  }, []);

  const triggerEdgeScroll = useCallback((clientY: number) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    if (clientY < rect.top + EDGE_SCROLL_THRESHOLD) {
      scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop - EDGE_SCROLL_SPEED);
    } else if (clientY > rect.bottom - EDGE_SCROLL_THRESHOLD) {
      scrollEl.scrollTop = Math.min(scrollEl.scrollHeight - rect.height, scrollEl.scrollTop + EDGE_SCROLL_SPEED);
    }
  }, []);

  useEffect(() => {
    if (!handleDrag) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    let rafId: number;
    const tick = () => {
      if (edgeScrollRef.current != null) {
        scrollEl.scrollTop += edgeScrollRef.current;
        scrollEl.scrollTop = Math.max(0, Math.min(scrollEl.scrollHeight - scrollEl.clientHeight, scrollEl.scrollTop));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [handleDrag]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (handleDrag) {
        const y = getYInColumn(e.clientY);
        const min = yToMinutes(y);
        const rect = scrollRef.current?.getBoundingClientRect();
        if (rect) {
          if (e.clientY < rect.top + EDGE_SCROLL_THRESHOLD) edgeScrollRef.current = -EDGE_SCROLL_SPEED;
          else if (e.clientY > rect.bottom - EDGE_SCROLL_THRESHOLD) edgeScrollRef.current = EDGE_SCROLL_SPEED;
          else edgeScrollRef.current = null;
        }
        if (handleDrag.kind === "work") {
          const fixed = fixedEdgeRef.current;
          if (handleDrag.edge === "top") {
            const anchorEnd = fixed.endMin;
            if (anchorEnd == null) return;
            const newStart = Math.max(MIN_MINUTES, Math.min(min, anchorEnd - SLOT_MINUTES));
            onWorkChange(minutesToHHmm(newStart), minutesToHHmm(anchorEnd), false);
          } else {
            const anchorStart = fixed.startMin;
            if (anchorStart == null) return;
            const newEnd = Math.min(MAX_MINUTES, Math.max(min + SLOT_MINUTES, anchorStart + SLOT_MINUTES));
            onWorkChange(minutesToHHmm(anchorStart), minutesToHHmm(newEnd), false);
          }
        } else {
          const slot = personalSlots[handleDrag.index];
          if (!slot || !onPersonalSlotResize) return;
          const fixed = fixedEdgeRef.current;
          if (handleDrag.edge === "top") {
            const anchorEnd = fixed.endMin;
            if (anchorEnd == null) return;
            const newStart = Math.max(MIN_MINUTES, Math.min(min, anchorEnd - SLOT_MINUTES));
            onPersonalSlotResize(handleDrag.index, minutesToHHmm(newStart), minutesToHHmm(anchorEnd));
          } else {
            const anchorStart = fixed.startMin;
            if (anchorStart == null) return;
            const newEnd = Math.min(MAX_MINUTES, Math.max(min + SLOT_MINUTES, anchorStart + SLOT_MINUTES));
            onPersonalSlotResize(handleDrag.index, minutesToHHmm(anchorStart), minutesToHHmm(newEnd));
          }
        }
        return;
      }
      if (!dragging) return;
      const y = getYFromEvent(e);
      const startMin = yToMinutes(Math.min(dragStartY, y));
      const endMin = yToMinutes(Math.max(dragStartY, y)) + SLOT_MINUTES;
      const start = minutesToHHmm(Math.min(startMin, endMin - SLOT_MINUTES));
      const end = minutesToHHmm(Math.min(endMin, MAX_MINUTES + SLOT_MINUTES));
      if (mode === "work") onWorkChange(start, end, false);
      else onPersonalAdd(start, end, false);
    },
    [
      handleDrag,
      dragging,
      dragStartY,
      getYInColumn,
      getYFromEvent,
      mode,
      workStartMin,
      workEndMin,
      personalSlots,
      onWorkChange,
      onPersonalAdd,
      onPersonalSlotResize,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (capturedPointerIdRef.current != null && scrollRef.current) {
      scrollRef.current.releasePointerCapture(capturedPointerIdRef.current);
      capturedPointerIdRef.current = null;
    }
    setDragging(false);
    setHandleDrag(null);
    edgeScrollRef.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const y = getYFromEvent(e);
      setDragStartY(y);
      setDragging(true);
      const min = yToMinutes(y);
      const start = minutesToHHmm(min);
      const end = minutesToHHmm(min + SLOT_MINUTES);
      if (mode === "work") onWorkChange(start, end, true);
      else onPersonalAdd(start, end, true);
    },
    [getYFromEvent, mode, onWorkChange, onPersonalAdd]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // When dragging a handle, capture pointer on the scroll element so we get all pointermove events
  // even when the cursor leaves the small handle (otherwise the drag stops after one 30-min step).
  useEffect(() => {
    if (!handleDrag || !scrollRef.current) return;
    const el = scrollRef.current;
    const onPointerMove = (e: PointerEvent) => {
      const y = getYInColumn(e.clientY);
      const min = yToMinutes(y);
      const rect = scrollRef.current?.getBoundingClientRect();
      if (rect) {
        if (e.clientY < rect.top + EDGE_SCROLL_THRESHOLD) edgeScrollRef.current = -EDGE_SCROLL_SPEED;
        else if (e.clientY > rect.bottom - EDGE_SCROLL_THRESHOLD) edgeScrollRef.current = EDGE_SCROLL_SPEED;
        else edgeScrollRef.current = null;
      }
      if (handleDrag.kind === "work") {
        const fixed = fixedEdgeRef.current;
        if (handleDrag.edge === "top") {
          const anchorEnd = fixed.endMin;
          if (anchorEnd == null) return;
          const newStart = Math.max(MIN_MINUTES, Math.min(min, anchorEnd - SLOT_MINUTES));
          onWorkChange(minutesToHHmm(newStart), minutesToHHmm(anchorEnd), false);
        } else {
          const anchorStart = fixed.startMin;
          if (anchorStart == null) return;
          const newEnd = Math.min(MAX_MINUTES, Math.max(min + SLOT_MINUTES, anchorStart + SLOT_MINUTES));
          onWorkChange(minutesToHHmm(anchorStart), minutesToHHmm(newEnd), false);
        }
      } else {
        const slot = personalSlots[handleDrag.index];
        if (!slot || !onPersonalSlotResize) return;
        const fixed = fixedEdgeRef.current;
        if (handleDrag.edge === "top") {
          const anchorEnd = fixed.endMin;
          if (anchorEnd == null) return;
          const newStart = Math.max(MIN_MINUTES, Math.min(min, anchorEnd - SLOT_MINUTES));
          onPersonalSlotResize(handleDrag.index, minutesToHHmm(newStart), minutesToHHmm(anchorEnd));
        } else {
          const anchorStart = fixed.startMin;
          if (anchorStart == null) return;
          const newEnd = Math.min(MAX_MINUTES, Math.max(min + SLOT_MINUTES, anchorStart + SLOT_MINUTES));
          onPersonalSlotResize(handleDrag.index, minutesToHHmm(anchorStart), minutesToHHmm(newEnd));
        }
      }
    };
    const onPointerUp = () => {
      if (capturedPointerIdRef.current != null) {
        el.releasePointerCapture(capturedPointerIdRef.current);
        capturedPointerIdRef.current = null;
      }
      setHandleDrag(null);
      edgeScrollRef.current = null;
    };
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [handleDrag, getYInColumn, personalSlots, onWorkChange, onPersonalSlotResize]);

  const scrollUp = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -SCROLL_JUMP_PX, behavior: "smooth" });
    }
  }, []);
  const scrollDown = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: SCROLL_JUMP_PX, behavior: "smooth" });
    }
  }, []);

  const canClear = addedOrder.length > 0;

  const renderHandle = (edge: "top" | "bottom", onStart: (e: React.PointerEvent) => void) => (
    <div
      role="slider"
      aria-label={edge === "top" ? "Drag to adjust start time" : "Drag to adjust end time"}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (scrollRef.current) {
          scrollRef.current.setPointerCapture(e.pointerId);
          capturedPointerIdRef.current = e.pointerId;
        }
        onStart(e);
      }}
      style={{
        position: "absolute",
        left: "50%",
        ...(edge === "top" ? { top: 0, transform: "translate(-50%, 0)" } : { bottom: 0, transform: "translate(-50%, 0)" }),
        width: 24,
        height: HANDLE_HEIGHT,
        minHeight: HANDLE_HEIGHT,
        cursor: "ns-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.25)",
        borderRadius: 4,
        fontSize: 10,
        color: "#fff",
        pointerEvents: "auto",
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {edge === "top" ? "▲" : "▼"}
    </div>
  );

  return (
    <div style={{ padding: "0.5rem 0", marginBottom: "1rem" }}>
      {/* Mode selector: segmented Work / Personal — when Work selected, Personal is blue text on white */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.375rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: `1px solid ${PRIMARY_BLUE}`,
            borderRadius: 8,
            overflow: "hidden",
            background: mode === "work" ? PRIMARY_BLUE : "transparent",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("work")}
            style={{
              padding: "0.25rem 1rem",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
              background: mode === "work" ? PRIMARY_BLUE : "transparent",
              color: mode === "work" ? "#fff" : PRIMARY_BLUE,
              borderRadius: 6,
            }}
          >
            Work
          </button>
          <button
            type="button"
            onClick={() => setMode("personal")}
            style={{
              padding: "0.25rem 1rem",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
              background: mode === "personal" ? PRIMARY_BLUE : "#fff",
              color: mode === "personal" ? "#fff" : PRIMARY_BLUE,
              borderRadius: 6,
            }}
          >
            Personal
          </button>
        </div>
      </div>
      {/* Copy, Paste, Clear — outlined */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onCopy}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "0.25rem 0.5rem",
            fontSize: "0.8125rem",
            border: `1px solid ${PRIMARY_BLUE}`,
            background: "transparent",
            color: PRIMARY_BLUE,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={onPaste}
          disabled={!canPaste}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "0.25rem 0.5rem",
            fontSize: "0.8125rem",
            border: `1px solid ${PRIMARY_BLUE}`,
            background: "transparent",
            color: PRIMARY_BLUE,
            borderRadius: 8,
            cursor: canPaste ? "pointer" : "not-allowed",
            opacity: canPaste ? 1 : 0.6,
          }}
        >
          Paste
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "0.25rem 0.5rem",
            fontSize: "0.8125rem",
            border: `1px solid ${PRIMARY_BLUE}`,
            background: "transparent",
            color: PRIMARY_BLUE,
            borderRadius: 8,
            cursor: canClear ? "pointer" : "not-allowed",
            opacity: canClear ? 1 : 0.6,
          }}
        >
          Clear
        </button>
      </div>
      {/* Save Schedule — full width, primary */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          width: "100%",
          padding: "0.5rem",
          fontSize: "0.875rem",
          border: "none",
          background: PRIMARY_BLUE,
          color: "#fff",
          borderRadius: 8,
          cursor: saving ? "wait" : "pointer",
          marginBottom: "0.5rem",
        }}
      >
        {saving ? "Saving…" : "Save Schedule"}
      </button>
      {/* Today's Schedule card */}
      <div
        className="card"
        style={{
          padding: "0.625rem 1rem",
          marginBottom: "0.5rem",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          background: "#fff",
        }}
      >
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: PRIMARY_BLUE, marginBottom: "0.25rem" }}>
          Today&apos;s Schedule{employeeName ? ` - ${employeeName}` : ""}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>
          Work: {workStart ?? "—"} – {workEnd ?? "—"}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>
          Personal Blocks: {personalSlots.length > 0 ? personalSlots.map((s) => `${s.start}–${s.end}`).join(", ") : "—"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        {/* Up arrow: outside scroll, left-aligned with time column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: SCROLL_ARROW_ROW_HEIGHT,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: LABEL_COLUMN_WIDTH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={scrollUp}
              aria-label="Scroll calendar up"
              style={{
                width: 24,
                height: 24,
                padding: 0,
                fontSize: "0.75rem",
                lineHeight: 1,
                cursor: "pointer",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                background: "var(--color-surface)",
                color: LABEL_COLOR,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {"▲"}
            </button>
          </div>
          <div style={{ width: LABEL_COLUMN_GAP, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }} />
        </div>
        {/* Scroll window: only labels + calendar column (fixed height so down arrow stays visible) */}
        <div
          ref={scrollRef}
          style={{ height: 360, overflowY: "auto", overflowX: "hidden", flexShrink: 0 }}
          onMouseMove={(e) => setPointerY(getYInColumn(e.clientY))}
          onMouseLeave={() => setPointerY(null)}
          onTouchStart={(e) => {
            if (e.touches[0]) setPointerY(getYInColumn(e.touches[0].clientY));
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) setPointerY(getYInColumn(e.touches[0].clientY));
          }}
          onTouchEnd={() => setPointerY(null)}
          onTouchCancel={() => setPointerY(null)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 0,
              position: "relative",
              minHeight: COLUMN_HEIGHT_PX,
            }}
          >
            <div
              style={{
                width: LABEL_COLUMN_WIDTH,
                flexShrink: 0,
                height: COLUMN_HEIGHT_PX,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingTop: 2,
                paddingBottom: 2,
                fontSize: "0.75rem",
                color: LABEL_COLOR,
              }}
            >
              {LABEL_SLOTS.map(({ hour, isHalf }, idx) => (
                <span key={idx}>
                  {hour}:{isHalf ? "30" : "00"}
                </span>
              ))}
            </div>
            <div style={{ width: LABEL_COLUMN_GAP, flexShrink: 0 }} />
            <div
              ref={columnRef}
            role="application"
            aria-label="Day column: drag to set time"
            onMouseDown={handleMouseDown}
            style={{
              flex: 1,
              height: COLUMN_HEIGHT_PX,
              minWidth: 80,
              background: "var(--color-surface)",
              borderRadius: 8,
              position: "relative",
              cursor: "crosshair",
              overflow: "hidden",
            }}
          >
            {/* Work block: drawn first (z 2) so Personal blocks (z 3) show on top */}
            {workStartMin != null && workEndMin != null && workEndMin > workStartMin && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: minutesToY(workStartMin),
                  height: minutesToY(workEndMin) - minutesToY(workStartMin),
                  background: WORK_COLOR,
                  borderRadius: 4,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            )}
            {workStartMin != null && workEndMin != null && workEndMin > workStartMin && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: minutesToY(workStartMin),
                  height: minutesToY(workEndMin) - minutesToY(workStartMin),
                  pointerEvents: mode === "work" ? "auto" : "none",
                  zIndex: 6,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {renderHandle("top", () => {
                  fixedEdgeRef.current = { startMin: null, endMin: workEndMin ?? null };
                  setHandleDrag({ kind: "work", edge: "top" });
                })}
                {renderHandle("bottom", () => {
                  fixedEdgeRef.current = { startMin: workStartMin ?? null, endMin: null };
                  setHandleDrag({ kind: "work", edge: "bottom" });
                })}
              </div>
            )}
            {personalSlots.map((slot, i) => {
              const startMin = hhmmToMinutes(slot.start);
              const endMin = hhmmToMinutes(slot.end);
              if (startMin == null || endMin == null || endMin <= startMin) return null;
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: minutesToY(startMin),
                      height: minutesToY(endMin) - minutesToY(startMin),
                      background: PERSONAL_COLOR,
                      borderRadius: 4,
                      pointerEvents: "none",
                      zIndex: 3,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: minutesToY(startMin),
                      height: Math.max(minutesToY(endMin) - minutesToY(startMin), HANDLE_HEIGHT * 2 + 4),
                      minHeight: HANDLE_HEIGHT * 2 + 4,
                      pointerEvents: "auto",
                      zIndex: 5,
                      overflow: "visible",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    {renderHandle("top", () => {
                      fixedEdgeRef.current = { startMin: null, endMin: endMin };
                      setHandleDrag({ kind: "personal", index: i, edge: "top" });
                    })}
                    {renderHandle("bottom", () => {
                      fixedEdgeRef.current = { startMin: startMin, endMin: null };
                      setHandleDrag({ kind: "personal", index: i, edge: "bottom" });
                    })}
                  </div>
                </React.Fragment>
              );
            })}
            {Array.from({ length: 23 - 6 + 1 }, (_, i) => 6 + i).slice(1).map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: minutesToY(h * 60),
                  height: 1,
                  background: "rgba(0,0,0,0.08)",
                  pointerEvents: "none",
                }}
              />
            ))}
          </div>
          {pointerY != null && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: pointerY,
                height: 0,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: "100%",
                  borderTop: "2px solid rgba(46,125,50,0.9)",
                }}
              />
            </div>
          )}
          </div>
        </div>
        {/* Down arrow: outside scroll, left-aligned with time column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: SCROLL_ARROW_ROW_HEIGHT,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: LABEL_COLUMN_WIDTH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={scrollDown}
              aria-label="Scroll calendar down"
              style={{
                width: 24,
                height: 24,
                padding: 0,
                fontSize: "0.75rem",
                lineHeight: 1,
                cursor: "pointer",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                background: "var(--color-surface)",
                color: LABEL_COLOR,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {"▼"}
            </button>
          </div>
          <div style={{ width: LABEL_COLUMN_GAP, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }} />
        </div>
      </div>
    </div>
  );
}
