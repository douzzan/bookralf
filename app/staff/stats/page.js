"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import LineChart from "../../components/LineChart";
import { safeFetchJson } from "../../../lib/safeFetch";

const RANGES = [
  { key: "week", label: "Last 7 Days" },
  { key: "month", label: "Last 30 Days" },
  { key: "year", label: "Last Year" },
  { key: "all", label: "All Time" },
];

export default function StatsPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    safeFetchJson(`/api/stats?range=${range}`, { onSuccess: setData, onError: setError });
  }, [range]);

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Stats</h1>
        <p className="text-gray-400 mb-4">Revenue and activity from completed appointments.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-sm px-4 py-2 rounded-full border ${
                range === r.key ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {!data && !error && <p className="text-gray-500 text-sm">Loading…</p>}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <StatCard label="Total Revenue" value={`$${data.totalRevenue.toFixed(2)}`} />
              <StatCard label="Completed Bookings" value={data.completedCount} />
              <StatCard label="Average per Booking" value={`$${data.avgPerBooking.toFixed(2)}`} />
            </div>

            <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 md:p-6 mb-6">
              <h2 className="font-semibold mb-4">Revenue Over Time</h2>
              <LineChart data={data.series} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Breakdown title="By Service" rows={data.byService} />
              <Breakdown title="By Location" rows={data.byLocation} />
            </div>
          </>
        )}
      </main>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-4">
      <div className="text-3xl font-bold text-gold-400">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function Breakdown({ title, rows }) {
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 md:p-6">
      <h2 className="font-semibold mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No data for this range yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-200">{r.name}</span>
                <span className="text-gray-400">
                  ${r.revenue.toFixed(2)} · {r.count}x
                </span>
              </div>
              <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
                <div className="h-full bg-gold-500 rounded-full" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
