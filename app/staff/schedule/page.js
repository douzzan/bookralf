"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
function pad(n) {
  return n.toString().padStart(2, "0");
}
function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// Month-grid calendar that toggles multiple dates on/off, matching the
// "Select Dates (N selected)" picker from the original app.
function MultiDateCalendar({ selectedDates, onToggle }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
          className="text-gray-300 px-2"
        >
          ‹
        </button>
        <div className="font-semibold text-sm">{monthLabel}</div>
        <button
          type="button"
          onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
          className="text-gray-300 px-2"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = toDateStr(y, m, d);
          const disabled = dateStr < todayStr;
          const isSelected = selectedDates.includes(dateStr);
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              onClick={() => onToggle(dateStr)}
              className={`aspect-square rounded-lg text-sm ${
                isSelected
                  ? "bg-gold-500 text-ink-950 font-semibold"
                  : disabled
                  ? "text-gray-700"
                  : "text-gray-200 hover:bg-ink-700"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleManagerPage() {
  const [locations, setLocations] = useState([]);
  const [scheduleDays, setScheduleDays] = useState([]);
  const [mode, setMode] = useState("single"); // "single" | "multiple"
  const [singleDate, setSingleDate] = useState("");
  const [multiDates, setMultiDates] = useState([]);
  const [singleLocationId, setSingleLocationId] = useState("");
  const [multiLocationIds, setMultiLocationIds] = useState([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function loadLocations() {
    safeFetchJson("/api/locations", {
      expectArray: true,
      onSuccess: setLocations,
      onError: setError,
    });
  }
  function loadSchedule() {
    safeFetchJson("/api/schedule", {
      expectArray: true,
      onSuccess: setScheduleDays,
      onError: setError,
    });
  }
  useEffect(() => {
    loadLocations();
    loadSchedule();
  }, []);

  function toggleMultiLocation(id) {
    setMultiLocationIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function toggleMultiDate(dateStr) {
    setMultiDates((dates) =>
      dates.includes(dateStr) ? dates.filter((d) => d !== dateStr) : [...dates, dateStr].sort()
    );
  }

  const dates = mode === "single" ? (singleDate ? [singleDate] : []) : multiDates;
  const locationIds = mode === "single" ? (singleLocationId ? [singleLocationId] : []) : multiLocationIds;
  const combos = dates.length * locationIds.length;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (dates.length === 0 || locationIds.length === 0) {
      setError("Choose at least one date and one area.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, locationIds, startTime, endTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSingleDate("");
      setMultiDates([]);
      setSingleLocationId("");
      setMultiLocationIds([]);
      loadSchedule();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDay(id) {
    if (!confirm("Delete this scheduled day? Any bookings on it will be cancelled and customers notified.")) return;
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      let data = null;
      try {
        data = await res.json();
      } catch {
        // Response had no JSON body (e.g. a server crash) — fall through to the generic error below.
      }
      if (!res.ok || !data) {
        alert((data && data.error) || "Something went wrong deleting that day. Please try again.");
        return;
      }
      loadSchedule();
      if (data.cancelledBookings > 0) {
        alert(`${data.cancelledBookings} booking(s) were cancelled and the customer(s) notified.`);
      }
    } catch (err) {
      alert("Could not reach the server. Please check your connection and try again.");
    }
  }

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Schedule Manager</h1>
        <p className="text-gray-400 mb-4">Assign neighbourhoods to days and set your hours.</p>

        <form onSubmit={submit} className="bg-ink-800 border border-ink-700 rounded-xl p-4 mb-6">
          <div className="text-gold-400 font-semibold mb-3">+ Add Schedule Day</div>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                mode === "single" ? "bg-gold-500 text-ink-950 border-gold-500" : "border-ink-600 text-gray-300"
              }`}
            >
              📅 Single Date
            </button>
            <button
              type="button"
              onClick={() => setMode("multiple")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                mode === "multiple" ? "bg-gold-500 text-ink-950 border-gold-500" : "border-ink-600 text-gray-300"
              }`}
            >
              📅 Multiple Days
            </button>
          </div>

          {mode === "single" ? (
            <>
              <label className="block mb-3">
                <span className="block text-sm text-gray-300 mb-1">Date</span>
                <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
              </label>
              <label className="block mb-3">
                <span className="block text-sm text-gray-300 mb-1">Neighbourhood</span>
                <select value={singleLocationId} onChange={(e) => setSingleLocationId(e.target.value)}>
                  <option value="">Select area</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <div className="mb-3">
                <span className="block text-sm text-gray-300 mb-2">Select Dates ({multiDates.length} selected)</span>
                <MultiDateCalendar selectedDates={multiDates} onToggle={toggleMultiDate} />
              </div>
              {multiDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {multiDates.map((d) => (
                    <span key={d} className="bg-ink-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {formatDateLabel(d)}
                      <button type="button" onClick={() => toggleMultiDate(d)}>
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mb-3">
                <span className="block text-sm text-gray-300 mb-1">Neighbourhood(s)</span>
                <div className="space-y-1">
                  {locations.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-auto"
                        checked={multiLocationIds.includes(l.id)}
                        onChange={() => toggleMultiLocation(l.id)}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label>
              <span className="block text-sm text-gray-300 mb-1">Start Time</span>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTime12h(t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-sm text-gray-300 mb-1">End Time</span>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTime12h(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            disabled={saving}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-ink-950 font-semibold py-3 rounded-xl"
          >
            {saving ? "Adding..." : `Add ${combos > 1 ? `${combos} ` : ""}Schedule Day${combos !== 1 ? "s" : ""}`}
          </button>
        </form>

        <h2 className="font-semibold mb-3">Upcoming Schedule</h2>
        <div className="space-y-3">
          {scheduleDays.length === 0 && <p className="text-gray-500 text-sm">No upcoming scheduled days.</p>}
          {scheduleDays.map((d) => (
            <div key={d.id} className="flex items-center justify-between bg-ink-800 border border-ink-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-ink-700 flex items-center justify-center">📍</span>
                <div>
                  <div className="font-semibold">{d.location.name}</div>
                  <div className="text-sm text-gray-400">
                    {formatDateLabel(d.date)} · {formatTime12h(d.startTime)} – {formatTime12h(d.endTime)}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteDay(d.id)} className="text-gray-400 hover:text-red-400 text-lg">
                🗑
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
