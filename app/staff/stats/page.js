"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";
import LineChart from "../../components/LineChart";
import { safeFetchJson } from "../../../lib/safeFetch";

const RANGES = [
  { key: "week", label: "Last 7 Days" },
  { key: "month", label: "Last 30 Days" },
  { key: "year", label: "Last Year" },
  { key: "all", label: "All Time" },
];

// Income fields that can be plotted / totalled. Service income is split by how
// it was paid; tips are separate. "Unspecified" only appears when the range has
// bookings completed before payment methods were recorded.
const FIELDS = [
  { key: "serviceCash", label: "Services – Cash", color: "#cf9b42" },
  { key: "serviceEtransfer", label: "Services – E-transfer", color: "#6ea8d9" },
  { key: "serviceUnspecified", label: "Services – Unspecified", color: "#9c8a6e", optional: true },
  { key: "tipsCash", label: "Tips – Cash", color: "#7bc18a" },
  { key: "tipsEtransfer", label: "Tips – E-transfer", color: "#c58ad9" },
];
const COMBINED_COLOR = "#e6bd6e";

const REPORT_FIELDS = [
  { key: "serviceCash", label: "Services – Cash" },
  { key: "serviceEtransfer", label: "Services – E-transfer" },
  { key: "serviceUnspecified", label: "Services – Unspecified" },
  { key: "tipsCash", label: "Tips – Cash" },
  { key: "tipsEtransfer", label: "Tips – E-transfer" },
];

export default function StatsPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  // Which income to include in the report (services by payment method; tips separate)
  const [reportFields, setReportFields] = useState(REPORT_FIELDS.map((f) => f.key));
  const toggleReportField = (k) =>
    setReportFields((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  // Which income fields are shown on the chart and added up in the totals card.
  // Default = all service income, combined — the same single line as before.
  const [picked, setPicked] = useState(["serviceCash", "serviceEtransfer", "serviceUnspecified"]);
  const [combine, setCombine] = useState(true);

  const fields = useMemo(
    () => FIELDS.filter((f) => !f.optional || (data && data.totals && data.totals[f.key] > 0)),
    [data]
  );
  const activePicked = picked.filter((k) => fields.some((f) => f.key === k));
  function togglePicked(key) {
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  const chart = useMemo(() => {
    if (!data || !data.seriesByField) return null;
    const labels = data.series.map((s) => s.label);
    const chosen = fields.filter((f) => activePicked.includes(f.key));
    if (chosen.length === 0) return { labels, lines: [] };
    if (combine && chosen.length > 1) {
      const values = labels.map((_, i) => chosen.reduce((sum, f) => sum + data.seriesByField[f.key][i].value, 0));
      return { labels, lines: [{ name: "Combined", color: COMBINED_COLOR, values }] };
    }
    return {
      labels,
      lines: chosen.map((f) => ({ name: f.label, color: f.color, values: data.seriesByField[f.key].map((p) => p.value) })),
    };
  }, [data, fields, activePicked.join(","), combine]);
  const selectedTotal = data && data.totals ? activePicked.reduce((sum, k) => sum + (data.totals[k] || 0), 0) : 0;

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
              href={`/staff/stats/report?period=${reportPeriod}&value=${reportPeriod === "month" ? reportMonth : reportYear}&fields=${reportFields.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg"
            >
              🖨 Generate Report
            </a>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">Include in report</div>
            <div className="flex flex-wrap gap-2">
              {REPORT_FIELDS.map((f) => {
                const on = reportFields.includes(f.key);
                return (
                  <label
                    key={f.key}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border cursor-pointer ${
                      on ? "border-gold-500 text-gray-100" : "border-ink-600 text-gray-500"
                    }`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleReportField(f.key)} className="w-auto" />
                    {f.label}
                  </label>
                );
              })}
            </div>
            {reportFields.length === 0 && <p className="text-xs text-red-400 mt-2">Pick at least one to include.</p>}
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
              <h2 className="font-semibold mb-3">Revenue Over Time</h2>
              <FieldPicker
                fields={fields}
                picked={activePicked}
                onToggle={togglePicked}
                combine={combine}
                onCombine={setCombine}
              />
              {chart && chart.lines.length > 0 ? (
                <LineChart labels={chart.labels} lines={chart.lines} />
              ) : (
                <p className="text-gray-500 text-sm text-center py-12">Pick at least one field above to plot.</p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Breakdown title="By Service" rows={data.byService} />
              <Breakdown title="By Location" rows={data.byLocation} />
            </div>

            <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 md:p-6">
              <h2 className="font-semibold mb-1">Totals for Selected Fields</h2>
              <p className="text-gray-500 text-xs mb-3">
                Choose any combination — they are added together for the range selected above. Tips are kept separate from service income.
              </p>
              <FieldPicker fields={fields} picked={activePicked} onToggle={togglePicked} />
              <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <div className="text-3xl font-bold text-gold-400">${selectedTotal.toFixed(2)}</div>
                  <div className="text-gray-400 text-sm">{activePicked.length > 1 ? "Combined total" : "Total"}</div>
                </div>
                <div className="text-sm text-gray-400 space-y-0.5">
                  {fields
                    .filter((f) => activePicked.includes(f.key))
                    .map((f) => (
                      <div key={f.key}>
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: f.color }} />
                        {f.label}: <span className="text-gray-200">${(data.totals[f.key] || 0).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function FieldPicker({ fields, picked, onToggle, combine, onCombine }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {fields.map((f) => {
          const on = picked.includes(f.key);
          return (
            <button
              key={f.key}
              onClick={() => onToggle(f.key)}
              aria-pressed={on}
              className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-2 ${
                on ? "border-gold-500 text-gray-100 bg-gold-500/10" : "border-ink-600 text-gray-500"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: on ? f.color : "transparent", border: `1.5px solid ${f.color}` }} />
              {f.label}
            </button>
          );
        })}
      </div>
      {onCombine && (
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" className="w-auto" checked={combine} onChange={(e) => onCombine(e.target.checked)} />
          Combine selected fields into one line
        </label>
      )}
    </div>
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
