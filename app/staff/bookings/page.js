"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

// What the page shows is a "bucket", not the raw status. Staff decline and
// staff cancel both read as "Staff cancelled". A booking the customer
// cancelled themselves (cancelledBy === "client") reads "Client cancelled".
// Older cancellations that predate the cancelledBy field count as staff.
const STATUS_STYLES = {
  pending: { bg: "bg-gold-500/20", border: "border-gold-500", text: "text-gold-300" },
  confirmed: { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-300" },
  completed: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-300" },
  staff_cancelled: { bg: "bg-red-500/15", border: "border-red-600", text: "text-red-300" },
  client_cancelled: { bg: "bg-orange-500/15", border: "border-orange-500", text: "text-orange-300" },
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  staff_cancelled: "Staff cancelled",
  client_cancelled: "Client cancelled",
};

const STATUS_FILTERS = ["pending", "confirmed", "completed", "staff_cancelled", "client_cancelled"];

function bucketOf(b) {
  if (b.status === "declined") return "staff_cancelled";
  if (b.status === "cancelled") return b.cancelledBy === "client" ? "client_cancelled" : "staff_cancelled";
  return b.status;
}

// Grid covers 7am-9pm by default (and stretches if a booking falls outside).
// Phones use a shorter scale so a whole day or week fits on screen.
const DEFAULT_START_MIN = 7 * 60;
const DEFAULT_END_MIN = 21 * 60;

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
  const endLabel = sameMonth
    ? String(end.getDate())
    : end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

function shortHour(m) {
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h >= 12 ? "p" : "a"}`;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]); // empty = show everything
  const [view, setView] = useState("week"); // "week" | "day"
  const [dayDate, setDayDate] = useState(() => new Date());
  const isMobile = useIsMobile();
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    safeFetchJson("/api/bookings", { expectArray: true, onSuccess: setBookings, onError: setError });
  }
  useEffect(load, []);

  const todayStr = toDateStr(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const days = view === "day" ? [dayDate] : weekDays;
  const dayStrs = days.map(toDateStr);
  const dayKey = dayStrs.join(",");

  const filtered = useMemo(
    () => (activeFilters.length === 0 ? bookings : bookings.filter((b) => activeFilters.includes(bucketOf(b)))),
    [bookings, activeFilters]
  );
  const byDay = useMemo(() => {
    const map = {};
    for (const d of dayKey.split(",")) map[d] = [];
    for (const b of filtered) {
      if (map[b.date]) map[b.date].push(b);
    }
    return map;
  }, [filtered, dayKey]);

  // Grid range + scale
  const visible = Object.values(byDay).flat();
  const minStart = visible.reduce((m, b) => Math.min(m, minutesFromMidnight(b.startTime)), DEFAULT_START_MIN);
  const maxEnd = visible.reduce((m, b) => Math.max(m, minutesFromMidnight(b.endTime)), DEFAULT_END_MIN);
  const gridStart = Math.floor(minStart / 60) * 60;
  const gridEnd = Math.ceil(maxEnd / 60) * 60;
  const pxPerMin = isMobile ? (view === "day" ? 0.8 : 0.6) : 1.15;
  const GRID_PAD = 10; // breathing room so the first/last hour labels aren't clipped
  const gridHeight = (gridEnd - gridStart) * pxPerMin + GRID_PAD * 2;
  const hourLabels = [];
  for (let m = gridStart; m <= gridEnd; m += 60) hourLabels.push(m);
  const compact = isMobile && view === "week";
  const gridCols = `${isMobile ? 34 : 56}px repeat(${days.length}, minmax(0, 1fr))`;

  function toggleFilter(f) {
    setActiveFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }
  function switchView(next) {
    if (next === view) return;
    if (next === "day") {
      const t = new Date();
      setDayDate(t >= weekStart && t < addDays(weekStart, 7) ? t : weekStart);
    } else {
      setWeekStart(startOfWeek(dayDate));
    }
    setView(next);
  }
  function step(dir) {
    if (view === "day") setDayDate(addDays(dayDate, dir));
    else setWeekStart(addDays(weekStart, dir * 7));
  }
  function goToday() {
    setDayDate(new Date());
    setWeekStart(startOfWeek(new Date()));
  }

  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [invoiceMsg, setInvoiceMsg] = useState("");

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

  async function sendInvoice(id) {
    setInvoiceBusy(true);
    setInvoiceMsg("");
    const res = await fetch(`/api/bookings/${id}/invoice`, { method: "POST" });
    const data = await res.json();
    setInvoiceBusy(false);
    if (!res.ok) {
      setInvoiceMsg(data.error || "Could not send the invoice.");
      return;
    }
    setInvoiceMsg(`Invoice ${data.booking.invoiceNumber} sent to ${data.booking.email}.`);
    setSelected(data.booking);
    load();
  }

  async function toggleInvoicePaid(id, paid) {
    setToggleBusy(true);
    const res = await fetch(`/api/bookings/${id}/invoice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    const data = await res.json();
    setToggleBusy(false);
    if (res.ok) {
      setSelected(data);
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
            <button onClick={() => step(-1)} aria-label="Previous" className="w-8 h-8 rounded-lg border border-ink-600 text-gray-300">
              ‹
            </button>
            <button onClick={goToday} className="px-3 h-8 rounded-lg border border-ink-600 text-gray-300 text-sm">
              Today
            </button>
            <button onClick={() => step(1)} aria-label="Next" className="w-8 h-8 rounded-lg border border-ink-600 text-gray-300">
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-gray-400">
            {view === "day"
              ? dayDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
              : weekRangeLabel(weekStart)}
          </p>
          <div className="flex rounded-lg border border-ink-600 overflow-hidden text-sm shrink-0">
            {["day", "week"].map((v) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`px-3 py-1 capitalize ${view === v ? "bg-gold-500 text-ink-950 font-semibold" : "text-gray-400"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveFilters([])}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              activeFilters.length === 0 ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
            }`}
          >
            All
          </button>
          {STATUS_FILTERS.map((f) => {
            const on = activeFilters.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                aria-pressed={on}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  on ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
                }`}
              >
                {STATUS_LABELS[f]}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto border border-ink-700 rounded-xl">
          <div className={view === "week" ? "md:min-w-[860px]" : ""}>
            {/* Day header row */}
            <div className="grid sticky top-0 z-10 bg-ink-900" style={{ gridTemplateColumns: gridCols }}>
              <div className="border-b border-r border-ink-700" />
              {days.map((d) => {
                const dStr = toDateStr(d);
                const isToday = dStr === todayStr;
                return (
                  <button
                    key={dStr}
                    onClick={() => {
                      if (view === "week") {
                        setDayDate(d);
                        setView("day");
                      }
                    }}
                    disabled={view === "day"}
                    className="border-b border-ink-700 px-0.5 md:px-2 py-2 text-center"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                      {d.toLocaleDateString(undefined, { weekday: compact ? "narrow" : "short" })}
                    </div>
                    <div
                      className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs md:text-sm mt-0.5 ${
                        isToday ? "bg-gold-500 text-ink-950 font-semibold" : "text-gray-200"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
              {/* Hour label column */}
              <div className="relative border-r border-ink-700" style={{ height: gridHeight }}>
                {hourLabels.map((m) => (
                  <div
                    key={m}
                    className="absolute -translate-y-1/2 text-[10px] text-gray-500 pr-1 md:pr-2 w-full text-right"
                    style={{ top: (m - gridStart) * pxPerMin + GRID_PAD }}
                  >
                    {isMobile ? shortHour(m) : formatTime12h(`${pad(Math.floor(m / 60))}:00`)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dayStrs.map((dStr) => (
                <div key={dStr} className="relative border-r border-ink-700 last:border-r-0" style={{ height: gridHeight }}>
                  {hourLabels.map((m) => (
                    <div key={m} className="absolute w-full border-t border-ink-800" style={{ top: (m - gridStart) * pxPerMin + GRID_PAD }} />
                  ))}
                  {(byDay[dStr] || []).map((b) => {
                    const start = minutesFromMidnight(b.startTime);
                    const end = minutesFromMidnight(b.endTime);
                    const top = Math.max(0, (start - gridStart) * pxPerMin) + GRID_PAD;
                    const height = Math.max(compact ? 16 : 24, (end - start) * pxPerMin);
                    const bucket = bucketOf(b);
                    const style = STATUS_STYLES[bucket] || STATUS_STYLES.pending;
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelected(b);
                          setInvoiceMsg("");
                        }}
                        title={`${b.customerName} · ${STATUS_LABELS[bucket]}`}
                        className={`absolute left-0.5 right-0.5 rounded-md border-l-4 ${compact ? "px-0.5 py-0" : "px-1.5 py-0.5"} text-left overflow-hidden ${style.bg} ${style.border} ${style.text} hover:brightness-110 transition`}
                        style={{ top, height }}
                      >
                        {compact ? (
                          <div className="text-[9px] leading-tight font-semibold truncate">
                            {b.customerName.split(" ")[0]}
                          </div>
                        ) : (
                          <>
                            <div className="text-[11px] font-semibold truncate">{formatTime12h(b.startTime)}</div>
                            <div className="text-[11px] truncate">{b.customerName}</div>
                            <div className="text-[10px] truncate opacity-80">{b.location.name}</div>
                            {view === "day" && (
                              <div className="text-[10px] truncate opacity-80">
                                {b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {compact && <p className="text-[11px] text-gray-500 mt-2">Tap a day to open it, or a booking for details.</p>}
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
                className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[bucketOf(selected)]?.bg} ${STATUS_STYLES[bucketOf(selected)]?.border} ${STATUS_STYLES[bucketOf(selected)]?.text}`}
              >
                {STATUS_LABELS[bucketOf(selected)]}
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

            {(selected.status === "confirmed" || selected.status === "completed") && (
              <div className="mt-5 pt-5 border-t border-ink-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm">
                    {selected.invoiceNumber ? (
                      <>
                        <span className="text-gray-300 font-medium">{selected.invoiceNumber}</span>
                        <span className="text-gray-500"> · sent {formatDateLabel(selected.invoicedAt.slice(0, 10))}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">No invoice sent yet</span>
                    )}
                  </div>
                  <button
                    disabled={toggleBusy}
                    onClick={() => toggleInvoicePaid(selected.id, !selected.invoicePaid)}
                    className={`text-xs px-2 py-1 rounded-full border font-medium disabled:opacity-60 ${
                      selected.invoicePaid
                        ? "text-emerald-400 border-emerald-700 bg-emerald-500/10"
                        : "text-amber-400 border-amber-700 bg-amber-500/10"
                    }`}
                  >
                    {selected.invoicePaid ? "Paid" : "Unpaid"} — tap to toggle
                  </button>
                </div>

                <button
                  disabled={invoiceBusy}
                  onClick={() => sendInvoice(selected.id)}
                  className="w-full text-gold-400 border border-gold-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {invoiceBusy ? "Sending…" : selected.invoiceNumber ? "Resend Invoice" : "Send Invoice"}
                </button>

                {invoiceMsg && <p className="text-xs text-gray-400 mt-2">{invoiceMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
