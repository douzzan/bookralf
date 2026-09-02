"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

const STATUS_STYLES = {
  pending: { bg: "bg-gold-500/20", border: "border-gold-500", text: "text-gold-300" },
  confirmed: { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-300" },
  declined: { bg: "bg-red-500/15", border: "border-red-600", text: "text-red-300" },
  cancelled: { bg: "bg-red-500/15", border: "border-red-600", text: "text-red-300" },
  completed: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-300" },
};

const STATUS_FILTERS = ["all", "pending", "confirmed", "declined", "cancelled", "completed"];

// Grid covers 7am–9pm at ~1.15px per minute — wide enough for any
// realistic schedule, tall enough to read comfortably.
const GRID_START_MIN = 7 * 60;
const GRID_END_MIN = 21 * 60;
const PX_PER_MIN = 1.15;
const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;

function pad(n) {
  return n.toString().padStart(2, "0");
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}
function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function minutesFromMidnight(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function weekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(
    undefined,
    sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }
  );
  return `${startLabel} – ${endLabel}`;
}

const HOUR_LABELS = [];
for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) {
  HOUR_LABELS.push(m);
}

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    safeFetchJson("/api/bookings", { expectArray: true, onSuccess: setBookings, onError: setError });
  }
  useEffect(load, []);

  const todayStr = toDateStr(new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayStrs = days.map(toDateStr);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const byDay = useMemo(() => {
    const map = {};
    for (const d of dayStrs) map[d] = [];
    for (const b of filtered) {
      if (map[b.date]) map[b.date].push(b);
    }
    return map;
  }, [filtered, dayStrs]);

  async function setStatus(id, status) {
    setBusy(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, actor: "admin" }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(null);
      load();
    }
  }

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl md:text-3xl font-bold">All Bookings</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="w-8 h-8 rounded-lg border border-ink-600 text-gray-300">
              ‹
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 h-8 rounded-lg border border-ink-600 text-gray-300 text-sm">
              Today
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="w-8 h-8 rounded-lg border border-ink-600 text-gray-300">
              ›
            </button>
          </div>
        </div>
        <p className="text-gray-400 mb-4">{weekRangeLabel(weekStart)}</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
                filter === f ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto border border-ink-700 rounded-xl">
          <div className="min-w-[860px]">
            {/* Day header row */}
            <div className="grid sticky top-0 z-10 bg-ink-900" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="border-b border-r border-ink-700" />
              {days.map((d) => {
                const dStr = toDateStr(d);
                const isToday = dStr === todayStr;
                return (
                  <div key={dStr} className="border-b border-ink-700 px-2 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm mt-0.5 ${
                        isToday ? "bg-gold-500 text-ink-950 font-semibold" : "text-gray-200"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              {/* Hour label column */}
              <div className="relative border-r border-ink-700" style={{ height: GRID_HEIGHT }}>
                {HOUR_LABELS.map((m) => (
                  <div
                    key={m}
                    className="absolute -translate-y-1/2 text-[10px] text-gray-500 pr-2 w-full text-right"
                    style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }}
                  >
                    {formatTime12h(`${pad(Math.floor(m / 60))}:00`)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dayStrs.map((dStr) => (
                <div key={dStr} className="relative border-r border-ink-700 last:border-r-0" style={{ height: GRID_HEIGHT }}>
                  {HOUR_LABELS.map((m) => (
                    <div key={m} className="absolute w-full border-t border-ink-800" style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }} />
                  ))}
                  {(byDay[dStr] || []).map((b) => {
                    const start = minutesFromMidnight(b.startTime);
                    const end = minutesFromMidnight(b.endTime);
                    const top = Math.max(0, (start - GRID_START_MIN) * PX_PER_MIN);
                    const height = Math.max(24, (end - start) * PX_PER_MIN);
                    const style = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b)}
                        className={`absolute left-0.5 right-0.5 rounded-md border-l-4 px-1.5 py-0.5 text-left overflow-hidden ${style.bg} ${style.border} ${style.text} hover:brightness-110 transition`}
                        style={{ top, height }}
                      >
                        <div className="text-[11px] font-semibold truncate">{formatTime12h(b.startTime)}</div>
                        <div className="text-[11px] truncate">{b.customerName}</div>
                        <div className="text-[10px] truncate opacity-80">{b.location.name}</div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-40 px-4" onClick={() => setSelected(null)}>
          <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-1">
              <div className="font-semibold text-lg">👤 {selected.customerName}</div>
              <button onClick={() => setSelected(null)} className="text-gray-400">
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-xs px-2 py-1 rounded-full border capitalize ${STATUS_STYLES[selected.status]?.bg} ${STATUS_STYLES[selected.status]?.border} ${STATUS_STYLES[selected.status]?.text}`}
              >
                {selected.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-300 mb-6">
              <div>
                📅 {formatDateLabel(selected.date)} · 🕐 {formatTime12h(selected.startTime)} – {formatTime12h(selected.endTime)}
              </div>
              <div>
                📍 {selected.location.name} — {selected.address}
              </div>
              <div>☎ {selected.phone}</div>
              <div>
                ✂ {selected.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")}
              </div>
              <div className="font-semibold text-paper">${selected.totalPrice.toFixed(2)}</div>
            </div>

            {selected.status === "pending" && (
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => setStatus(selected.id, "confirmed")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  disabled={busy}
                  onClick={() => setStatus(selected.id, "declined")}
                  className="flex-1 bg-red-900/40 border border-red-700 text-red-300 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            )}
            {selected.status === "confirmed" && (
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => setStatus(selected.id, "completed")}
                  className="flex-1 text-blue-400 border border-blue-800 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                >
                  Mark Completed
                </button>
                <button
                  disabled={busy}
                  onClick={() => setStatus(selected.id, "cancelled")}
                  className="flex-1 text-red-400 border border-red-800 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
