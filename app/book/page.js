"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../components/Nav";
import { safeFetchJson } from "../../lib/safeFetch";

const MAX_TOTAL_QTY = 5;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n) {
  return n.toString().padStart(2, "0");
}
function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function BookingPage() {
  const [step, setStep] = useState(1);

  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [scheduleDays, setScheduleDays] = useState([]);

  const [location, setLocation] = useState(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [date, setDate] = useState(null);
  const [cart, setCart] = useState({}); // serviceId -> qty
  const [availability, setAvailability] = useState({ startTimes: [], slotsNeeded: 0 });
  const [startTime, setStartTime] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    safeFetchJson("/api/locations", { expectArray: true, onSuccess: setLocations, onError: setError });
    safeFetchJson("/api/services", { expectArray: true, onSuccess: setServices, onError: setError });
    const savedPhone = typeof window !== "undefined" ? localStorage.getItem("bookralf_phone") : null;
    if (savedPhone) setForm((f) => ({ ...f, phone: savedPhone }));
  }, []);

  useEffect(() => {
    if (!location) return;
    safeFetchJson(`/api/schedule?locationId=${location.id}`, {
      expectArray: true,
      onSuccess: setScheduleDays,
      onError: setError,
    });
  }, [location]);

  const availableDateSet = useMemo(() => new Set(scheduleDays.map((d) => d.date)), [scheduleDays]);

  const totalQty = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([serviceId, qty]) => {
          const svc = services.find((s) => s.id === serviceId);
          return { serviceId, qty, svc };
        }),
    [cart, services]
  );
  const totalPrice = cartItems.reduce((sum, i) => sum + i.svc.price * i.qty, 0);
  const totalDuration = cartItems.reduce((sum, i) => sum + i.svc.durationMin * i.qty, 0);
  const totalSlots = Math.ceil(totalDuration / 30) || 0;

  useEffect(() => {
    if (step !== 4 || !location || !date || totalDuration === 0) return;
    safeFetchJson(`/api/availability?locationId=${location.id}&date=${date}&durationMin=${totalDuration}`, {
      onSuccess: (data) => {
        setAvailability({ startTimes: [], slotsNeeded: 0, ...data });
        setStartTime(null);
      },
      onError: (msg) => {
        setError(msg);
        setAvailability({ startTimes: [], slotsNeeded: 0 });
      },
    });
  }, [step, location, date, totalDuration]);

  function addQty(serviceId, delta) {
    setCart((c) => {
      const current = c[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (delta > 0 && totalQty >= MAX_TOTAL_QTY) return c;
      return { ...c, [serviceId]: next };
    });
  }

  async function submitBooking() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          date,
          startTime,
          items: cartItems.map((i) => ({ serviceId: i.serviceId, quantity: i.qty })),
          customerName: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (typeof window !== "undefined") localStorage.setItem("bookralf_phone", form.phone);
      setResult(data);
      setShowConfirm(false);
    } catch (e) {
      setError(e.message);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setLocation(null);
    setDate(null);
    setCart({});
    setStartTime(null);
    setResult(null);
    setError("");
  }

  if (result) {
    return (
      <>
        <Nav variant="customer" />
        <main className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gold-500/10 flex items-center justify-center text-2xl text-gold-400 mb-4">
            ⏳
          </div>
          <h1 className="text-2xl font-semibold mb-2">Booking Requested!</h1>
          <p className="text-gray-400 mb-6">Your booking is pending confirmation. We'll notify you once it's confirmed.</p>
          <div className="text-left bg-ink-800 border border-ink-700 rounded-xl p-4 space-y-2 mb-6">
            <Row label="Area" value={result.location.name} />
            <Row label="Date" value={formatDateLabel(result.date)} />
            <Row label="Time" value={formatTime12h(result.startTime)} />
            <Row
              label="Service(s)"
              value={result.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ")}
            />
            <Row label="Address" value={result.address} />
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={resetWizard} className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold px-5 py-3 rounded-xl">
              Book Another
            </button>
            <a href="/my-bookings" className="border border-ink-600 px-5 py-3 rounded-xl text-gray-200">
              View My Bookings
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav variant="customer" />
      <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Book an Appointment</h1>
        <p className="text-gray-400 mb-4">Choose your area, date, and time — we'll come to you.</p>

        <StepIndicator step={step} />

        {step > 1 && (
          <button className="text-gray-400 mb-3" onClick={() => setStep((s) => s - 1)}>
            ‹ Back
          </button>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 md:grid-cols-2">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  setLocation(loc);
                  setStep(2);
                }}
                className="text-left bg-ink-800 border border-ink-700 rounded-xl p-4 hover:border-gold-500 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-ink-700 flex items-center justify-center mb-3">📍</div>
                <div className="font-semibold">{loc.name}</div>
                <div className="text-sm text-gray-400">{loc.description}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && location && (
          <div>
            <div className="flex items-center gap-2 text-gold-400 mb-3">
              📍 <span>{location.name}</span>
            </div>
            <Calendar
              monthCursor={monthCursor}
              setMonthCursor={setMonthCursor}
              availableDateSet={availableDateSet}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setStep(3);
              }}
            />
            {availableDateSet.size === 0 && (
              <p className="text-sm text-gray-500 mt-3">No open days scheduled for this area yet.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-1 text-sm">
              {location.name} · {formatDateLabel(date)}
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Tap a service to add it. You can book up to {MAX_TOTAL_QTY} services per appointment.
            </p>
            <div className="space-y-3 mb-4">
              {services.map((svc) => {
                const qty = cart[svc.id] || 0;
                return (
                  <div
                    key={svc.id}
                    className={`bg-ink-800 border rounded-xl p-4 ${qty > 0 ? "border-gold-500" : "border-ink-700"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            qty > 0 ? "bg-gold-500 text-ink-950" : "bg-ink-700 text-gray-300"
                          }`}
                        >
                          ✂
                        </div>
                        <div>
                          <div className="font-semibold">{svc.name}</div>
                          <div className="text-sm text-gray-400">{svc.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{svc.durationMin} min</div>
                        </div>
                      </div>
                      <div className="text-gold-400 font-medium">${svc.price}</div>
                    </div>
                    <div className="flex justify-end mt-3">
                      {qty === 0 ? (
                        <button
                          onClick={() => addQty(svc.id, 1)}
                          disabled={totalQty >= MAX_TOTAL_QTY}
                          className="text-gold-400 disabled:text-gray-600 text-sm font-medium"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={() => addQty(svc.id, -1)} className="w-7 h-7 rounded-full border border-ink-600 text-gray-200">
                            −
                          </button>
                          <span className="w-4 text-center">{qty}</span>
                          <button
                            onClick={() => addQty(svc.id, 1)}
                            disabled={totalQty >= MAX_TOTAL_QTY}
                            className="w-7 h-7 rounded-full border border-ink-600 text-gray-200 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {cartItems.length > 0 && (
              <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 mb-4">
                <div className="font-semibold mb-2">
                  Your Services ({totalQty}/{MAX_TOTAL_QTY})
                </div>
                {cartItems.map((i) => (
                  <div key={i.serviceId} className="flex justify-between text-sm py-1">
                    <span>
                      {i.svc.name}
                      {i.qty > 1 ? ` x${i.qty}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      ${i.svc.price * i.qty}
                      <button onClick={() => setCart((c) => ({ ...c, [i.serviceId]: 0 }))} className="text-gray-500">
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-ink-700 mt-2 pt-2 text-sm">
                  <span className="font-semibold">Total: ${totalPrice.toFixed(2)}</span>
                  <span className="text-gray-400">
                    ⏱ {totalDuration} min · {totalSlots} slot{totalSlots !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={cartItems.length === 0}
              onClick={() => setStep(4)}
              className="w-full bg-gold-500 disabled:bg-ink-700 disabled:text-gray-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl"
            >
              Continue to Time Selection
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="bg-ink-800 rounded-lg px-4 py-2 text-sm text-gray-300 mb-4">
              {location.name} · {formatDateLabel(date)} · {cartItems.length} service{cartItems.length !== 1 ? "s" : ""} ({totalSlots} slots)
            </div>
            <p className="text-gray-400 text-sm mb-3">Available start times (each slot is 30 min):</p>
            {availability.startTimes.length === 0 ? (
              <div className="bg-amber-900/20 border border-gold-600/40 text-gold-300 rounded-lg px-4 py-3 text-sm">
                No start times fit your selected services on this day. Try fewer services or a different date.
              </div>
            ) : (
              <>
                <div className="bg-amber-900/20 border border-gold-600/40 text-gold-300 rounded-lg px-4 py-3 text-sm mb-4">
                  Your booking needs {availability.slotsNeeded} consecutive slot{availability.slotsNeeded !== 1 ? "s" : ""} ({totalDuration}{" "}
                  min total). Available start times are shown below.
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {availability.startTimes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setStartTime(t)}
                      className={`py-3 rounded-lg border text-sm font-medium ${
                        startTime === t ? "bg-gold-500 text-ink-950 border-gold-500" : "border-ink-600 text-gray-200"
                      }`}
                    >
                      {formatTime12h(t)}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!startTime}
                  onClick={() => setStep(5)}
                  className="w-full bg-gold-500 disabled:bg-ink-700 disabled:text-gray-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl"
                >
                  Continue to Your Details
                </button>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="bg-ink-800 rounded-lg px-4 py-2 text-sm text-gold-300 mb-4">
              {location.name} · {formatDateLabel(date)} ·{" "}
              {formatTime12h(startTime)} – {formatTime12h(availability.startTimes ? computeEnd(startTime, availability.slotsNeeded) : "")}
            </div>

            <label className="block mb-3">
              <span className="block text-sm text-gray-300 mb-1">Your name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </label>
            <label className="block mb-3">
              <span className="block text-sm text-gray-300 mb-1">Phone number</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(123) 456-7890" />
            </label>
            <label className="block mb-3">
              <span className="block text-sm text-gray-300 mb-1">Email (for booking updates)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-sm text-gray-300 mb-1">Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
            </label>

            <button
              disabled={!form.name || !form.phone || !form.email || !form.address}
              onClick={() => setShowConfirm(true)}
              className="w-full bg-gold-500 disabled:bg-ink-700 disabled:text-gray-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl"
            >
              Review Booking
            </button>
          </div>
        )}
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-40 px-4">
          <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-xl font-semibold">Confirm Your Booking</h2>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400">
                ✕
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Please review your booking details before confirming.</p>
            <div className="space-y-3 mb-6 text-sm">
              <Row label="Area" value={location.name} />
              <Row label="Date" value={formatDateLabel(date)} />
              <Row label="Time" value={`${formatTime12h(startTime)} – ${formatTime12h(computeEnd(startTime, availability.slotsNeeded))}`} />
              <Row
                label={`Services (${cartItems.length})`}
                value={cartItems.map((i) => (i.qty > 1 ? `${i.svc.name} x${i.qty}` : i.svc.name)).join(", ")}
              />
              <Row label="Name" value={form.name} />
              <Row label="Phone" value={form.phone} />
              <Row label="Address" value={form.address} />
            </div>
            <button
              disabled={submitting}
              onClick={submitBooking}
              className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl mb-2 disabled:opacity-60"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
            <button onClick={() => setShowConfirm(false)} className="w-full border border-ink-600 text-gray-300 py-3 rounded-xl">
              Back
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function computeEnd(startTime, slots) {
  if (!startTime || !slots) return startTime;
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + slots * 30;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2, 3, 4, 5].map((n, idx) => (
        <div key={n} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border ${
              n < step
                ? "bg-gold-500/20 border-gold-500 text-gold-400"
                : n === step
                ? "bg-gold-500 border-gold-500 text-ink-950"
                : "border-ink-600 text-gray-500"
            }`}
          >
            {n < step ? "✓" : n}
          </div>
          {idx < 4 && <div className={`w-6 md:w-10 h-px ${n < step ? "bg-gold-500" : "bg-ink-700"}`} />}
        </div>
      ))}
    </div>
  );
}

function Calendar({ monthCursor, setMonthCursor, availableDateSet, selected, onSelect }) {
  const { y, m } = monthCursor;
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="text-gray-300 px-2">
          ‹
        </button>
        <div className="font-semibold">{monthLabel}</div>
        <button onClick={() => setMonthCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="text-gray-300 px-2">
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
          const enabled = availableDateSet.has(dateStr) && dateStr >= todayStr;
          const isSelected = selected === dateStr;
          return (
            <button
              key={i}
              disabled={!enabled}
              onClick={() => onSelect(dateStr)}
              className={`aspect-square rounded-lg text-sm ${
                isSelected
                  ? "bg-gold-500 text-ink-950 font-semibold"
                  : enabled
                  ? "bg-gold-500/10 text-gold-300 hover:bg-gold-500/20"
                  : "text-gray-700"
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
