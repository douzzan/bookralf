"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

const STATUS_STYLES = {
  pending: "text-gold-400 border-gold-500/50 bg-gold-500/10",
  confirmed: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
  declined: "text-red-400 border-red-500/50 bg-red-500/10",
  cancelled: "text-red-400 border-red-500/50 bg-red-500/10",
  completed: "text-blue-400 border-blue-500/50 bg-blue-500/10",
};

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

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    safeFetchJson("/api/bookings", { expectArray: true, onSuccess: setBookings, onError: setError });
  }
  useEffect(load, []);

  async function setStatus(id, status) {
    setBusyId(id);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, actor: "admin" }),
    });
    setBusyId(null);
    load();
  }

  const filtered = (filter === "all" ? bookings : bookings.filter((b) => b.status === filter))
    .slice()
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">All Bookings</h1>
        <p className="text-gray-400 mb-4">Every booking, past and upcoming.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-4 max-w-xs">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="bg-ink-800 border border-ink-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold">👤 {b.customerName}</div>
                <span className={`text-xs px-2 py-1 rounded-full border capitalize ${STATUS_STYLES[b.status]}`}>{b.status}</span>
              </div>
              <div className="text-sm text-gray-300 mb-1">
                📅 {formatDateLabel(b.date)} · 🕐 {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
              </div>
              <div className="text-sm text-gray-300 mb-1">
                ✂ {b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")} &nbsp; 📍{" "}
                {b.location.name}
              </div>
              <div className="text-sm text-gray-500 mb-3">📍 {b.address}</div>
              {b.status === "confirmed" && (
                <div className="flex gap-3">
                  <button
                    disabled={busyId === b.id}
                    onClick={() => setStatus(b.id, "completed")}
                    className="text-blue-400 border border-blue-800 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                  >
                    Mark Completed
                  </button>
                  <button
                    disabled={busyId === b.id}
                    onClick={() => setStatus(b.id, "cancelled")}
                    className="text-red-400 border border-red-800 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-sm">No bookings match this filter.</p>}
        </div>
      </main>
    </>
  );
}
