"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeFetchJson } from "../../../../lib/safeFetch";

function formatGeneratedOn() {
  return new Date().toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

// useSearchParams() requires a Suspense boundary in the App Router, or
// `next build` fails — same class of issue as the earlier
// "Dynamic server usage" error on an API route.
export default function RevenueReportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-500">Loading…</p>}>
      <ReportContent />
    </Suspense>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get("period") === "year" ? "year" : "month";
  const value = searchParams.get("value");

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value) return;
    safeFetchJson(`/api/stats/report?period=${period}&value=${value}`, { onSuccess: setData, onError: setError });
  }, [period, value]);

  if (!value) {
    return <p className="p-8 text-center text-gray-600">Missing report period. Go back to Stats and try again.</p>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Screen-only controls — hidden on print via the .no-print class below */}
      <div className="no-print sticky top-0 bg-gray-100 border-b border-gray-300 px-6 py-3 flex justify-between items-center">
        <a href="/staff/stats" className="text-sm text-gray-600 hover:text-gray-900">
          ‹ Back to Stats
        </a>
        <button
          onClick={() => window.print()}
          className="bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-5 py-2 rounded-lg"
        >
          🖨 Print / Save as PDF
        </button>
      </div>

      {error && <p className="p-8 text-center text-red-600">{error}</p>}
      {!data && !error && <p className="p-8 text-center text-gray-500">Loading report…</p>}

      {data && (
        <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
            <div>
              <div className="text-2xl font-serif italic">Book Ralf</div>
              <div className="text-sm text-gray-500">House-Call Barbering</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">Revenue Report</div>
              <div className="text-sm text-gray-500">{data.label}</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-8">Generated {formatGeneratedOn()}</p>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <SummaryBox label="Total Revenue" value={`$${data.totalRevenue.toFixed(2)}`} />
            <SummaryBox label="Completed Bookings" value={data.completedCount} />
            <SummaryBox label="Average per Booking" value={`$${data.avgPerBooking.toFixed(2)}`} />
          </div>

          {/* Performance summary */}
          <div className="mb-8 break-inside-avoid">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Performance Summary</h3>
            {data.comparison ? (
              <ul className="text-sm space-y-1">
                <ReportChangeLine label="Revenue" change={data.comparison.revenueChange} previousLabel={data.comparison.previousLabel} />
                <ReportChangeLine
                  label="Appointments"
                  change={data.comparison.appointmentsChange}
                  previousLabel={data.comparison.previousLabel}
                />
                <ReportChangeLine
                  label="Average transaction"
                  change={data.comparison.avgTransactionChange}
                  previousLabel={data.comparison.previousLabel}
                />
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No previous period available for comparison.</p>
            )}
          </div>

          {/* Client insights */}
          <div className="grid grid-cols-4 gap-4 mb-10 break-inside-avoid">
            <SummaryBox label="New Clients" value={data.clientMetrics.newClients} />
            <SummaryBox label="Returning Clients" value={data.clientMetrics.returningClients} />
            <SummaryBox label="Avg Bookings / Client" value={data.clientMetrics.avgBookingsPerClient.toFixed(1)} />
            <SummaryBox
              label="Retention Rate"
              value={data.clientMetrics.retentionRate === null ? "N/A" : `${data.clientMetrics.retentionRate.toFixed(1)}%`}
            />
          </div>

          {/* By service / by location */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <ReportTable title="By Service" rows={data.byService} />
            <ReportTable title="By Location" rows={data.byLocation} />
          </div>

          {/* Sub-period breakdown */}
          <div className="mb-10">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
              {data.period === "year" ? "Monthly Breakdown" : "Daily Breakdown"}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {data.subPeriods.map((s, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1.5">{s.label}</td>
                    <td className="py-1.5 text-right font-medium">${s.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Itemized transactions */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Transactions</h3>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No completed bookings in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-900 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Customer</th>
                    <th className="py-1.5 pr-2">Service(s)</th>
                    <th className="py-1.5 pr-2">Location</th>
                    <th className="py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t, i) => (
                    <tr key={i} className="border-b border-gray-200 break-inside-avoid">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{t.date}</td>
                      <td className="py-1.5 pr-2">{t.customerName}</td>
                      <td className="py-1.5 pr-2">{t.services}</td>
                      <td className="py-1.5 pr-2">{t.location}</td>
                      <td className="py-1.5 text-right font-medium">${t.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900 font-semibold">
                    <td colSpan={4} className="py-2">
                      Total
                    </td>
                    <td className="py-2 text-right">${data.totalRevenue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.6in;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="border border-gray-300 rounded-lg p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ReportChangeLine({ label, change, previousLabel }) {
  if (change === null) {
    return (
      <li className="text-gray-500">
        {label}: not enough data from the {previousLabel} to compare.
      </li>
    );
  }
  const up = change >= 0;
  return (
    <li>
      <span className="font-semibold">
        {label} {up ? "increased" : "decreased"} {Math.abs(change).toFixed(1)}%
      </span>{" "}
      <span className="text-gray-500">compared with the {previousLabel}.</span>
    </li>
  );
}

function ReportTable({ title, rows }) {
  return (
    <div>
      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-gray-200">
                <td className="py-1.5">
                  {r.name} <span className="text-gray-400">x{r.count}</span>
                </td>
                <td className="py-1.5 text-right font-medium">${r.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
