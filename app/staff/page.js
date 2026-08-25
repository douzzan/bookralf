"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";
import { safeFetchJson } from "../../lib/safeFetch";

export default function StaffDashboard() {
  const [pending, setPending] = useState(null);
  const [todayCount, setTodayCount] = useState(null);
  const [upcomingTotal, setUpcomingTotal] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    safeFetchJson("/api/bookings?status=pending", {
      expectArray: true,
      onSuccess: (data) => setPending(data.length),
      onError: setError,
    });

    safeFetchJson("/api/bookings", {
      expectArray: true,
      onSuccess: (all) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        setTodayCount(all.filter((b) => b.date === todayStr && ["pending", "confirmed"].includes(b.status)).length);
        setUpcomingTotal(all.filter((b) => b.date >= todayStr && ["pending", "confirmed"].includes(b.status)).length);
      },
      onError: setError,
    });
  }, []);

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-md md:max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mb-4">Overview of your bookings and schedule.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <StatCard icon="🕐" iconBg="bg-gold-500/15 text-gold-400" label="Pending Requests" value={pending} />
          <StatCard icon="📅" iconBg="bg-blue-500/15 text-blue-400" label="Today's Bookings" value={todayCount} />
          <StatCard icon="✓" iconBg="bg-emerald-500/15 text-emerald-400" label="Upcoming Total" value={upcomingTotal} />
        </div>

        <div className="space-y-3">
          <NavCard href="/staff/schedule" icon="📍" label="Manage Schedule" />
          <NavCard href="/staff/pending" icon="🕐" label="Review Pending" />
          <NavCard href="/staff/bookings" icon="📋" label="All Bookings" />
          <NavCard href="/staff/notifications" icon="🔔" label="Notifications" />
        </div>
      </main>
    </>
  );
}

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-6 ${iconBg}`}>{icon}</div>
      <div className="text-3xl font-bold">{value === null ? "—" : value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function NavCard({ href, icon, label }) {
  return (
    <Link href={href} className="flex items-center justify-between bg-ink-800 border border-ink-700 rounded-xl px-4 py-4 hover:border-gold-500">
      <span className="flex items-center gap-3 font-semibold">
        <span className="text-gold-400">{icon}</span> {label}
      </span>
      <span className="text-gray-500">→</span>
    </Link>
  );
}
