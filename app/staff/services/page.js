"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";
import { getMaxTotalQty } from "../../../lib/bucketDuration";

const EMPTY_SERVICE = { name: "", description: "", price: "", durationMin: "", isBulkHaircut: false, active: true };
const EMPTY_BRACKET = { minCount: "", maxCount: "", flatMinutes: "" };

export default function EditServicesPage() {
  const [services, setServices] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [error, setError] = useState("");
  const [editingService, setEditingService] = useState(null); // null = closed, {} = new, {...} = editing
  const [editingBracket, setEditingBracket] = useState(null);
  const [busy, setBusy] = useState(false);

  function loadServices() {
    safeFetchJson("/api/services?all=true", { expectArray: true, onSuccess: setServices, onError: setError });
  }
  function loadBrackets() {
    safeFetchJson("/api/bulk-haircut-brackets", { expectArray: true, onSuccess: setBrackets, onError: setError });
  }
  useEffect(() => {
    loadServices();
    loadBrackets();
  }, []);

  async function saveService(form, id) {
    setBusy(true);
    setError("");
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      durationMin: Number(form.durationMin),
      isBulkHaircut: !!form.isBulkHaircut,
      active: !!form.active,
    };
    const res = await fetch(id ? `/api/services/${id}` : "/api/services", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save that service.");
      return;
    }
    setEditingService(null);
    loadServices();
  }

  async function deleteService(id) {
    if (!confirm("Delete this service? If it's been used in any booking, it'll be deactivated instead.")) return;
    setBusy(true);
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not delete that service.");
      return;
    }
    if (data.deactivated) alert(data.message);
    loadServices();
  }

  async function saveBracket(form, id) {
    setBusy(true);
    setError("");
    const payload = {
      minCount: Number(form.minCount),
      maxCount: Number(form.maxCount),
      flatMinutes: Number(form.flatMinutes),
    };
    const res = await fetch(id ? `/api/bulk-haircut-brackets/${id}` : "/api/bulk-haircut-brackets", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save that bracket.");
      return;
    }
    setEditingBracket(null);
    loadBrackets();
  }

  async function deleteBracket(id) {
    if (!confirm("Delete this bracket?")) return;
    setBusy(true);
    const res = await fetch(`/api/bulk-haircut-brackets/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) loadBrackets();
  }

  const maxTotalQty = getMaxTotalQty(brackets);

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Edit Services</h1>
        <p className="text-gray-400 mb-4">Manage prices, durations, and the bulk-haircut discount.</p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        {/* Services list */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Services</h2>
          <button
            onClick={() => setEditingService({ ...EMPTY_SERVICE })}
            className="text-gold-400 text-sm font-medium"
          >
            + Add Service
          </button>
        </div>
        <div className="space-y-3 mb-8">
          {services.map((s) => (
            <div
              key={s.id}
              className={`bg-ink-800 border rounded-xl p-4 ${s.active ? "border-ink-700" : "border-ink-700 opacity-50"}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold">
                  {s.name} {!s.active && <span className="text-xs text-gray-500 font-normal">(inactive)</span>}
                </div>
                <div className="text-gold-400 font-medium">${s.price}</div>
              </div>
              <div className="text-sm text-gray-400 mb-1">{s.description}</div>
              <div className="text-xs text-gray-500 mb-3">
                {s.durationMin} min {s.isBulkHaircut && <span className="text-gold-500">· bulk-haircut eligible</span>}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setEditingService(s)} className="text-sm text-gray-300 underline">
                  Edit
                </button>
                <button onClick={() => deleteService(s.id)} className="text-sm text-red-400 underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {services.length === 0 && !error && <p className="text-gray-500 text-sm">No services yet.</p>}
        </div>

        {/* Bulk-haircut brackets */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Bulk-Haircut Brackets</h2>
          <button onClick={() => setEditingBracket({ ...EMPTY_BRACKET })} className="text-gold-400 text-sm font-medium">
            + Add Bracket
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Counts of 1-2 bulk-eligible services always use their own actual durations. A count landing in one of these
          ranges uses the flat time instead, regardless of which eligible services make it up. Current per-booking cap:{" "}
          <span className="text-gold-400 font-medium">{maxTotalQty} services</span> (the highest bracket's max count).
        </p>
        <div className="space-y-2 mb-6">
          {brackets
            .slice()
            .sort((a, b) => a.minCount - b.minCount)
            .map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-ink-800 border border-ink-700 rounded-xl px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold">
                    {b.minCount === b.maxCount ? b.minCount : `${b.minCount}–${b.maxCount}`} services
                  </span>{" "}
                  <span className="text-gray-400">→ {b.flatMinutes} min flat</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setEditingBracket(b)} className="text-sm text-gray-300 underline">
                    Edit
                  </button>
                  <button onClick={() => deleteBracket(b.id)} className="text-sm text-red-400 underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          {brackets.length === 0 && !error && <p className="text-gray-500 text-sm">No brackets configured.</p>}
        </div>
      </main>

      {editingService && (
        <ServiceModal
          initial={editingService}
          busy={busy}
          onCancel={() => setEditingService(null)}
          onSave={(form) => saveService(form, editingService.id)}
        />
      )}
      {editingBracket && (
        <BracketModal
          initial={editingBracket}
          busy={busy}
          onCancel={() => setEditingBracket(null)}
          onSave={(form) => saveBracket(form, editingBracket.id)}
        />
      )}
    </>
  );
}

function ServiceModal({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const isNew = !initial.id;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-40 px-4" onClick={onCancel}>
      <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{isNew ? "Add Service" : "Edit Service"}</h2>
          <button onClick={onCancel} className="text-gray-400">
            ✕
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-sm text-gray-300 mb-1">Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block mb-3">
          <span className="block text-sm text-gray-300 mb-1">Description</span>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label>
            <span className="block text-sm text-gray-300 mb-1">Price ($)</span>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </label>
          <label>
            <span className="block text-sm text-gray-300 mb-1">Duration (min)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
          <input
            type="checkbox"
            className="w-auto"
            checked={!!form.isBulkHaircut}
            onChange={(e) => setForm({ ...form, isBulkHaircut: e.target.checked })}
          />
          Bulk-haircut eligible (shares time discount with Haircut/Child/etc. when several are booked together)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 mb-5">
          <input type="checkbox" className="w-auto" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (visible to customers)
        </label>

        <button
          disabled={busy || !form.name || !form.price || !form.durationMin}
          onClick={() => onSave(form)}
          className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function BracketModal({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const isNew = !initial.id;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-40 px-4" onClick={onCancel}>
      <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{isNew ? "Add Bracket" : "Edit Bracket"}</h2>
          <button onClick={onCancel} className="text-gray-400">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label>
            <span className="block text-sm text-gray-300 mb-1">Min count</span>
            <input type="number" min="3" step="1" value={form.minCount} onChange={(e) => setForm({ ...form, minCount: e.target.value })} />
          </label>
          <label>
            <span className="block text-sm text-gray-300 mb-1">Max count</span>
            <input type="number" min="3" step="1" value={form.maxCount} onChange={(e) => setForm({ ...form, maxCount: e.target.value })} />
          </label>
        </div>
        <label className="block mb-5">
          <span className="block text-sm text-gray-300 mb-1">Flat minutes</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.flatMinutes}
            onChange={(e) => setForm({ ...form, flatMinutes: e.target.value })}
          />
        </label>

        <button
          disabled={busy || !form.minCount || !form.maxCount || !form.flatMinutes}
          onClick={() => onSave(form)}
          className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
