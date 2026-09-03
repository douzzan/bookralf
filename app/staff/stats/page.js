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
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());

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

        <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 mb-6">
          <h2 className="font-semibold mb-3">Print Report</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setReportPeriod("month")}
                className={`text-sm px-3 py-2 rounded-lg border ${
                  reportPeriod === "month" ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setReportPeriod("year")}
                className={`text-sm px-3 py-2 rounded-lg border ${
                  reportPeriod === "year" ? "bg-gold-500 border-gold-500 text-ink-950 font-semibold" : "border-ink-600 text-gray-400"
                }`}
              >
                Yearly
              </button>
            </div>

            {reportPeriod === "month" ? (
              <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-auto" />
            ) : (
              <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))} className="w-auto">
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            <a
              href={`/staff/stats/report?period=${reportPeriod}&value=${reportPeriod === "month" ? reportMonth : reportYear}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg"
            >
              🖨 Generate Report
            </a>
          </div>
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
              <h2 className="font-semibold mb-3">Performance Summary</h2>
              {data.comparison ? (
                <div className="space-y-2">
                  <ChangeLine label="Revenue" change={data.comparison.revenueChange} previousLabel={data.comparison.previousLabel} />
                  <ChangeLine
                    label="Appointments"
                    change={data.comparison.appointmentsChange}
                    previousLabel={data.comparison.previousLabel}
                  />
                  <ChangeLine
                    label="Average transaction"
                    change={data.comparison.avgTransactionChange}
                    previousLabel={data.comparison.previousLabel}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Performance comparison isn't available for All Time.</p>
              )}
            </div>

            <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 md:p-6 mb-6">
              <h2 className="font-semibold mb-4">Client Insights</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="New Clients" value={range === "all" ? "N/A" : data.clientMetrics.newClients} />
                <MiniStat label="Returning Clients" value={range === "all" ? "N/A" : data.clientMetrics.returningClients} />
                <MiniStat label="Avg Bookings / Client" value={data.clientMetrics.avgBookingsPerClient.toFixed(1)} />
                <MiniStat
                  label="Retention Rate"
                  value={data.clientMetrics.retentionRate === null ? "N/A" : `${data.clientMetrics.retentionRate.toFixed(1)}%`}
                />
              </div>
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

function ChangeLine({ label, change, previousLabel }) {
  if (change === null) {
    return (
      <div className="text-sm text-gray-500">
        {label}: not enough data from the {previousLabel} to compare.
      </div>
    );
  }
  const up = change >= 0;
  const color = up ? "text-emerald-400" : "text-red-400";
  const arrow = up ? "▲" : "▼";
  return (
    <div className="text-sm">
      <span className={`font-semibold ${color}`}>
        {arrow} {label} {up ? "increased" : "decreased"} {Math.abs(change).toFixed(1)}%
      </span>{" "}
      <span className="text-gray-400">compared with the {previousLabel}.</span>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gold-400">{value}</div>
      <div className="text-gray-400 text-xs">{label}</div>
    </div>
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
