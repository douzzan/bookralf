"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

const ICON = { requested: "🕐", confirmed: "✓", declined: "⊗", cancelled: "⊗" };

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  function load() {
    safeFetchJson("/api/staff-notifications", { expectArray: true, onSuccess: setNotifications, onError: setError });
  }
  useEffect(load, []);

  async function markAllRead() {
    await fetch("/api/staff-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  }

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <div className="flex justify-between items-start mb-1">
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <button onClick={markAllRead} className="text-gold-400 text-sm">
            ✓✓ Mark all read
          </button>
        </div>
        <p className="text-gray-400 mb-4">Booking requests and cancellations.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {notifications.length === 0 && !error && <p className="text-gray-500 text-sm">No notifications yet.</p>}
          {notifications.map((n) => (
            <div key={n.id} className={`bg-ink-800 border rounded-xl p-4 flex gap-3 ${n.read ? "border-ink-700" : "border-gold-600/50"}`}>
              <div className="w-9 h-9 rounded-lg bg-ink-700 flex items-center justify-center shrink-0">{ICON[n.type] || "🔔"}</div>
              <div className="flex-1">
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-gray-400">{n.message}</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-gold-400 mt-2" />}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
