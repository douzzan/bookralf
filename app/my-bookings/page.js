"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { safeFetchJson } from "../../lib/safeFetch";

const STATUS_STYLES = {
  pending: "text-gold-400 border-gold-500/50 bg-gold-500/10",
  confirmed: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
  declined: "text-red-400 border-red-500/50 bg-red-500/10",
  cancelled: "text-red-400 border-red-500/50 bg-red-500/10",
  completed: "text-blue-400 border-blue-500/50 bg-blue-500/10",
};
const STATUS_LABEL = {
  pending: "⏳ Pending",
  confirmed: "✓ Confirmed",
  declined: "⊗ Declined",
  cancelled: "⊗ Cancelled",
  completed: "✓ Completed",
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

export default function MyBookingsPage() {
  const [phone, setPhone] = useState("");
  const [lookedUp, setLookedUp] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bookralf_phone") : null;
    if (saved) {
      setPhone(saved);
      load(saved);
    }
  }, []);

  function load(p) {
    safeFetchJson(`/api/bookings?phone=${encodeURIComponent(p)}`, {
      expectArray: true,
      onSuccess: (data) => {
        setBookings(data);
        setLookedUp(true);
      },
      onError: (msg) => {
        setError(msg);
        setLookedUp(true);
      },
    });
    safeFetchJson(`/api/notifications?phone=${encodeURIComponent(p)}`, {
      expectArray: true,
      onSuccess: setNotifications,
      onError: setError,
    });
  }

  function handleLookup(e) {
    e.preventDefault();
    if (!phone) return;
    localStorage.setItem("bookralf_phone", phone);
    load(phone);
  }

  async function cancelBooking(id) {
    if (!confirm("Cancel this booking?")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", actor: "customer" }),
    });
    load(phone);
  }

  const sortByDateTime = (arr) =>
    arr.slice().sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const upcoming = sortByDateTime(bookings.filter((b) => ["pending", "confirmed"].includes(b.status)));
  const history = sortByDateTime(bookings.filter((b) => ["declined", "cancelled", "completed"].includes(b.status)));
  const list = tab === "upcoming" ? upcoming : history;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Nav variant="customer" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">My Bookings</h1>
        <p className="text-gray-400 mb-4">View and manage your appointments.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {!lookedUp && (
          <form onSubmit={handleLookup} className="bg-ink-800 border border-ink-700 rounded-xl p-4 mb-6">
            <label className="block mb-3">
              <span className="block text-sm text-gray-300 mb-1">Enter the phone number you booked with</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(123) 456-7890" />
            </label>
            <button className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl">
              Find My Bookings
            </button>
          </form>
        )}

        {lookedUp && (
          <>
            {unreadCount > 0 && (
              <div className="bg-gold-500/10 border border-gold-500/40 text-gold-300 rounded-lg px-4 py-3 mb-4 text-sm">
                🔔 You have {unreadCount} new update{unreadCount !== 1 ? "s" : ""} on your bookings.
              </div>
            )}

            <div className="flex gap-6 border-b border-ink-700 mb-4">
              <button
                onClick={() => setTab("upcoming")}
                className={`pb-2 text-sm font-medium ${tab === "upcoming" ? "text-gold-400 border-b-2 border-gold-400" : "text-gray-400"}`}
              >
                Upcoming ({upcoming.length})
              </button>
              <button
                onClick={() => setTab("history")}
                className={`pb-2 text-sm font-medium ${tab === "history" ? "text-gold-400 border-b-2 border-gold-400" : "text-gray-400"}`}
              >
                History ({history.length})
              </button>
            </div>

            <div className="space-y-3">
              {list.length === 0 && <p className="text-gray-500 text-sm">Nothing here yet.</p>}
              {list.map((b) => (
                <div key={b.id} className="bg-ink-800 border border-ink-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-300">
                      📅 {formatDateLabel(b.date)} &nbsp;·&nbsp; 🕐 {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                  </div>
                  <div className="text-sm text-gray-200 mb-1">
                    ✂ {b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")} &nbsp;
                    <span className="text-gray-400">📍 {b.location.name}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">📍 {b.address}</div>
                  {["pending", "confirmed"].includes(b.status) && (
                    <button onClick={() => cancelBooking(b.id)} className="text-red-400 border border-red-800 rounded-lg px-4 py-2 text-sm">
                      Cancel Booking
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setLookedUp(false);
              }}
              className="text-gray-500 text-sm mt-6 underline"
            >
              Look up a different number
            </button>
          </>
        )}
      </main>
    </>
  );
}
