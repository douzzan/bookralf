"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

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

export default function PendingRequestsPage() {
  const [pending, setPending] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    safeFetchJson("/api/bookings?status=pending", { expectArray: true, onSuccess: setPending, onError: setError });
  }
  useEffect(load, []);

  async function act(id, status) {
    setBusyId(id);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, actor: "admin" }),
    });
    setBusyId(null);
    load();
  }

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Pending Requests</h1>
        <p className="text-gray-400 mb-4">Accept or decline incoming booking requests.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {pending.length === 0 && !error ? (
          <div className="text-center text-gray-500 py-16">
            <div className="text-4xl mb-3">🕐</div>
            No pending requests. All caught up!
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="bg-ink-800 border border-ink-700 rounded-xl p-4">
                <div className="font-semibold mb-1">👤 {b.customerName}</div>
                <div className="text-sm text-gray-300 mb-1">
                  📅 {formatDateLabel(b.date)} · 🕐 {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                </div>
                <div className="text-sm text-gray-300 mb-1">
                  ✂ {b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")} &nbsp; 📍{" "}
                  {b.location.name}
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  📍 {b.address} &nbsp; ☎ {b.phone}
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, "confirmed")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === b.id}
                    onClick={() => act(b.id, "declined")}
                    className="flex-1 bg-red-900/40 border border-red-700 text-red-300 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
