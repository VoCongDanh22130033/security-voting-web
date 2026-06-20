import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (iso: string) => void;
  required?: boolean;
  style?: React.CSSProperties;
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseISO(iso: string) {
  if (!iso) return { date: "", h: 0, m: 0 };
  const [d, t] = iso.split("T");
  const [hh, mm] = (t || "00:00").split(":");
  return { date: d, h: Number(hh), m: Number(mm) };
}

function displayValue(iso: string) {
  if (!iso) return "";
  const { date, h, m } = parseISO(iso);
  if (!date) return "";
  const [y, mo, d] = date.split("-");
  return `${d}/${mo}/${y} ${pad(h)}:${pad(m)}`;
}

// Simple calendar grid
function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Mon=0
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

const DateTimePicker24h: React.FC<Props> = ({ value, onChange, required, style }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = parseISO(value);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed.date ? Number(parsed.date.split("-")[0]) : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.date ? Number(parsed.date.split("-")[1]) - 1 : now.getMonth());

  // Pending selections (not yet confirmed)
  const [pendingDate, setPendingDate] = useState(parsed.date || "");
  const [pendingH, setPendingH] = useState(parsed.h);
  const [pendingM, setPendingM] = useState(parsed.m);

  // Sync pending when value changes externally
  useEffect(() => {
    const p = parseISO(value);
    setPendingDate(p.date);
    setPendingH(p.h);
    setPendingM(p.m);
    if (p.date) {
      setViewYear(Number(p.date.split("-")[0]));
      setViewMonth(Number(p.date.split("-")[1]) - 1);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const confirm = () => {
    if (pendingDate) {
      onChange(`${pendingDate}T${pad(pendingH)}:${pad(pendingM)}`);
    }
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const d = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    setPendingDate(d);
  };

  const cells = buildCalendar(viewYear, viewMonth);
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1, ...style }}>
      {/* Input display */}
      <input
        readOnly
        required={required}
        value={displayValue(value)}
        placeholder="dd/MM/yyyy HH:mm"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "8px 10px", border: `1.5px solid ${open ? "#2563eb" : "#d1d5db"}`,
          borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer",
          boxSizing: "border-box", outline: "none",
        }}
      />

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: 16, minWidth: 300,
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={prevMonth} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} style={navBtn}>›</button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = iso === pendingDate;
              const isToday = iso === todayStr;
              return (
                <button
                  key={i} type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    padding: "7px 0", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
                    fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected ? "#2563eb" : isToday ? "#eff6ff" : "transparent",
                    color: isSelected ? "#fff" : isToday ? "#2563eb" : "#0f172a",
                  }}
                >{day}</button>
              );
            })}
          </div>

          {/* Time row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "10px 0 6px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Giờ:</span>
            <input
              type="number" min={0} max={23} value={pad(pendingH)}
              onChange={e => setPendingH(Math.min(23, Math.max(0, Number(e.target.value))))}
              onFocus={e => e.target.select()}
              style={timeInput}
            />
            <span style={{ fontWeight: 700, color: "#64748b" }}>:</span>
            <input
              type="number" min={0} max={59} value={pad(pendingM)}
              onChange={e => setPendingM(Math.min(59, Math.max(0, Number(e.target.value))))}
              onFocus={e => e.target.select()}
              style={timeInput}
            />
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={confirm}
            style={{
              width: "100%", marginTop: 10, padding: "10px",
              background: "linear-gradient(135deg,#6366f1,#2563eb)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            ✔ Xác nhận
          </button>
        </div>
      )}
    </div>
  );
};

const navBtn: React.CSSProperties = {
  background: "#f1f5f9", border: "none", borderRadius: 6,
  width: 28, height: 28, fontSize: 18, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", color: "#475569",
};

const timeInput: React.CSSProperties = {
  width: 52, padding: "6px 8px", border: "1.5px solid #d1d5db",
  borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: "center", outline: "none",
};

export default DateTimePicker24h;
