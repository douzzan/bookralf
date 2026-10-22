"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "../../components/Nav";
import { safeFetchJson } from "../../../lib/safeFetch";

const TABS = [
  { key: "about", label: "About Ralf" },
  { key: "steps", label: "How it works" },
  { key: "faqs", label: "FAQ" },
  { key: "news", label: "Announcements" },
];

const PLACEHOLDER_RE = /\[RALF/i;
const needsInput = (...texts) => texts.some((t) => PLACEHOLDER_RE.test(t || ""));

function todayToronto() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
}
function prettyDate(s) {
  if (!s) return "";
  return new Date(s + "T12:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

async function api(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error((data && data.error) || "Something went wrong. Please try again.");
  return data;
}

export default function SiteContentPage() {
  const [tab, setTab] = useState("about");
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");

  function load() {
    safeFetchJson("/api/about?all=true", { onSuccess: setContent, onError: setError });
  }
  useEffect(load, []);

  const empty =
    content && !content.about && content.steps.length === 0 && content.faqs.length === 0 && content.announcements.length === 0;

  async function loadStarter() {
    try {
      await api("/api/about/starter", "POST");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <Nav variant="staff" />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold">Site Content</h1>
        <p className="text-gray-400 mb-4">
          Edit what customers see on the{" "}
          <a href="/about" target="_blank" rel="noopener noreferrer" className="text-gold-400 underline">
            About page
          </a>{" "}
          — your intro and photo, how it works, FAQs and announcements.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        {empty && (
          <div className="bg-ink-800 border border-gold-600/40 rounded-xl p-4 mb-4">
            <div className="font-semibold mb-1">Start from a draft?</div>
            <p className="text-sm text-gray-400 mb-3">
              We can fill the page with example text you can edit, hide or delete. Items marked “Needs your input” start
              hidden until you finish them.
            </p>
            <button onClick={loadStarter} className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm">
              Load starter content
            </button>
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-ink-700 mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
                tab === t.key ? "border-gold-500 text-gold-400 font-medium" : "border-transparent text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!content && !error && <p className="text-gray-500 text-sm">Loading…</p>}

        {content && tab === "about" && <AboutTab about={content.about} reload={load} setError={setError} />}
        {content && tab === "steps" && <StepsTab items={content.steps} reload={load} setError={setError} />}
        {content && tab === "faqs" && <FaqsTab items={content.faqs} reload={load} setError={setError} />}
        {content && tab === "news" && <NewsTab items={content.announcements} reload={load} setError={setError} />}
      </main>
    </>
  );
}

/* ---------------------------------------------------------------- shared */

function Modal({ title, onCancel, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-40 px-4" onClick={onCancel}>
      <div
        className={`bg-ink-900 border border-ink-700 rounded-2xl w-full ${wide ? "max-w-lg" : "max-w-md"} p-6 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onCancel} className="text-gray-400" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveButton({ busy, disabled, onClick, children = "Save" }) {
  return (
    <button
      disabled={busy || disabled}
      onClick={onClick}
      className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl disabled:opacity-60"
    >
      {busy ? "Saving..." : children}
    </button>
  );
}

function Chip({ children, tone = "gold" }) {
  const cls =
    tone === "gold"
      ? "border-gold-600/50 text-gold-400"
      : tone === "red"
      ? "border-red-800 text-red-300"
      : "border-ink-600 text-gray-400";
  return <span className={`text-[11px] border rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}

function MoveButtons({ index, count, onMove }) {
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        aria-label="Move up"
        className="w-7 h-7 rounded border border-ink-600 text-gray-300 disabled:opacity-30 leading-none"
      >
        ▲
      </button>
      <button
        onClick={() => onMove(index, 1)}
        disabled={index === count - 1}
        aria-label="Move down"
        className="w-7 h-7 rounded border border-ink-600 text-gray-300 disabled:opacity-30 leading-none"
      >
        ▼
      </button>
    </div>
  );
}

function Preview({ text }) {
  return <p className="text-sm text-gray-400 whitespace-pre-line line-clamp-3">{text}</p>;
}

/* ------------------------------------------------------------ About tab */

// Shrinks the chosen photo in the browser so uploads are small and fast.
function resizeToDataUrl(file, maxSide = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#110c08";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file doesn't look like an image."));
    };
    img.src = url;
  });
}

function AboutTab({ about, reload, setError }) {
  const [heading, setHeading] = useState(about?.heading || "About Ralf");
  const [intro, setIntro] = useState(about?.intro || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("/api/about", "PUT", { heading, intro });
      setSaved(true);
      reload();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const dataUrl = await resizeToDataUrl(file);
      await api("/api/about/photo", "PUT", { dataUrl });
      reload();
    } catch (err) {
      setError(err.message);
    }
    setPhotoBusy(false);
  }

  async function removePhoto() {
    if (!confirm("Remove your photo? The About page will show text only.")) return;
    setPhotoBusy(true);
    try {
      await api("/api/about/photo", "DELETE");
      reload();
    } catch (err) {
      setError(err.message);
    }
    setPhotoBusy(false);
  }

  return (
    <div>
      <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 mb-5">
        <div className="font-semibold mb-1">Your photo <span className="text-xs text-gray-500 font-normal">(optional)</span></div>
        <p className="text-sm text-gray-400 mb-3">
          Add a photo of yourself to show beside your intro. Skip it and the page works fine with text only.
        </p>
        <div className="flex items-center gap-4">
          {about?.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/about/photo?v=${about.photoVersion}`}
              alt="Your photo"
              className="w-24 h-24 rounded-xl object-cover border border-ink-600"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl border border-dashed border-ink-600 flex items-center justify-center text-xs text-gray-500 text-center px-2">
              No photo
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <button
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-xl disabled:opacity-60"
            >
              {photoBusy ? "Working..." : about?.hasPhoto ? "Replace photo" : "Upload photo"}
            </button>
            {about?.hasPhoto && (
              <button disabled={photoBusy} onClick={removePhoto} className="text-sm text-red-400 underline">
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Heading</span>
        <input value={heading} maxLength={80} onChange={(e) => setHeading(e.target.value)} />
      </label>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Intro</span>
        <textarea rows={9} value={intro} onChange={(e) => setIntro(e.target.value)} />
        <span className="block text-xs text-gray-500 mt-1">Press Enter twice to start a new paragraph.</span>
      </label>
      {needsInput(intro) && <p className="text-xs text-gold-400 mb-3">Some text in [RALF: …] still needs your input.</p>}
      <SaveButton busy={busy} onClick={save}>
        Save intro
      </SaveButton>
      {saved && <p className="text-sm text-green-400 mt-2 text-center">Saved ✓</p>}
    </div>
  );
}

/* ------------------------------------------------- generic list editor */

function useReorder(items, type, reload, setError) {
  return async function move(index, delta) {
    const next = items.map((i) => i.id);
    const j = index + delta;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await api("/api/about/reorder", "POST", { type, ids: next });
      reload();
    } catch (e) {
      setError(e.message);
    }
  };
}

function StepsTab({ items, reload, setError }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const move = useReorder(items, "steps", reload, setError);

  async function save(form) {
    setBusy(true);
    setError("");
    try {
      const body = { title: form.title, description: form.description, active: !!form.active };
      await api(form.id ? `/api/process-steps/${form.id}` : "/api/process-steps", form.id ? "PATCH" : "POST", body);
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  async function remove(id) {
    if (!confirm("Delete this step?")) return;
    try {
      await api(`/api/process-steps/${id}`, "DELETE");
      reload();
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggle(it) {
    try {
      await api(`/api/process-steps/${it.id}`, "PATCH", { active: !it.active });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Steps</h2>
        <button onClick={() => setEditing({ title: "", description: "", active: true })} className="text-gold-400 text-sm font-medium">
          + Add Step
        </button>
      </div>
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={s.id} className={`bg-ink-800 border border-ink-700 rounded-xl p-4 flex gap-3 ${s.active ? "" : "opacity-50"}`}>
            <MoveButtons index={i} count={items.length} onMove={move} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-950 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="font-semibold">{s.title}</span>
                {!s.active && <Chip tone="grey">Hidden</Chip>}
                {needsInput(s.title, s.description) && <Chip>Needs your input</Chip>}
              </div>
              <Preview text={s.description} />
              <div className="flex gap-4 mt-3">
                <button onClick={() => setEditing(s)} className="text-sm text-gray-300 underline">Edit</button>
                <button onClick={() => toggle(s)} className="text-sm text-gray-300 underline">{s.active ? "Hide" : "Show"}</button>
                <button onClick={() => remove(s.id)} className="text-sm text-red-400 underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 text-sm">No steps yet.</p>}
      </div>

      {editing && (
        <StepModal initial={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function StepModal({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  return (
    <Modal title={initial.id ? "Edit Step" : "Add Step"} onCancel={onCancel} wide>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Title</span>
        <input value={form.title} maxLength={140} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Description</span>
        <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-300 mb-5">
        <input type="checkbox" className="w-auto" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Visible to customers
      </label>
      <SaveButton busy={busy} disabled={!form.title.trim()} onClick={() => onSave(form)} />
    </Modal>
  );
}

function FaqsTab({ items, reload, setError }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const move = useReorder(items, "faqs", reload, setError);

  async function save(form) {
    setBusy(true);
    setError("");
    try {
      const body = { question: form.question, answer: form.answer, active: !!form.active };
      await api(form.id ? `/api/faqs/${form.id}` : "/api/faqs", form.id ? "PATCH" : "POST", body);
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  async function remove(id) {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await api(`/api/faqs/${id}`, "DELETE");
      reload();
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggle(it) {
    try {
      await api(`/api/faqs/${it.id}`, "PATCH", { active: !it.active });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Frequently asked questions</h2>
        <button onClick={() => setEditing({ question: "", answer: "", active: true })} className="text-gold-400 text-sm font-medium">
          + Add FAQ
        </button>
      </div>
      <div className="space-y-3">
        {items.map((f, i) => {
          const flagged = needsInput(f.question, f.answer);
          return (
            <div key={f.id} className={`bg-ink-800 border rounded-xl p-4 flex gap-3 ${flagged ? "border-gold-600/50" : "border-ink-700"} ${f.active ? "" : "opacity-60"}`}>
              <MoveButtons index={i} count={items.length} onMove={move} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold">{f.question}</span>
                  {!f.active && <Chip tone="grey">Hidden</Chip>}
                  {flagged && <Chip>Needs your input</Chip>}
                </div>
                <Preview text={f.answer} />
                <div className="flex gap-4 mt-3">
                  <button onClick={() => setEditing(f)} className="text-sm text-gray-300 underline">Edit</button>
                  <button onClick={() => toggle(f)} className="text-sm text-gray-300 underline">{f.active ? "Hide" : "Show"}</button>
                  <button onClick={() => remove(f.id)} className="text-sm text-red-400 underline">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-gray-500 text-sm">No FAQs yet.</p>}
      </div>

      {editing && <FaqModal initial={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function FaqModal({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const stillDraft = needsInput(form.question, form.answer);
  return (
    <Modal title={initial.id ? "Edit FAQ" : "Add FAQ"} onCancel={onCancel} wide>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Question</span>
        <input value={form.question} maxLength={240} onChange={(e) => setForm({ ...form, question: e.target.value })} />
      </label>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Answer</span>
        <textarea rows={6} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
        <input type="checkbox" className="w-auto" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Visible to customers
      </label>
      {stillDraft && (
        <p className="text-xs text-gold-400 mb-3">
          This still contains a [RALF: …] note. Replace it with your own wording before making it visible.
        </p>
      )}
      <div className="mt-4">
        <SaveButton busy={busy} disabled={!form.question.trim()} onClick={() => onSave(form)} />
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------- Announcements */

function NewsTab({ items, reload, setError }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const today = todayToronto();

  async function save(form) {
    setBusy(true);
    setError("");
    try {
      const body = {
        title: form.title,
        body: form.body,
        postedOn: form.postedOn,
        published: !!form.published,
        pinned: !!form.pinned,
        showUntil: form.showUntil || "",
      };
      await api(form.id ? `/api/announcements/${form.id}` : "/api/announcements", form.id ? "PATCH" : "POST", body);
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  async function remove(id) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api(`/api/announcements/${id}`, "DELETE");
      reload();
    } catch (e) {
      setError(e.message);
    }
  }
  async function patch(it, data) {
    try {
      await api(`/api/announcements/${it.id}`, "PATCH", data);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h2 className="font-semibold">Announcements</h2>
        <button
          onClick={() => setEditing({ title: "", body: "", postedOn: today, published: true, pinned: false, showUntil: "" })}
          className="text-gold-400 text-sm font-medium"
        >
          + New Announcement
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Published announcements appear on the About page. Pin one to also show it as a banner at the top of the home and
        booking pages (the newest pinned one is used).
      </p>
      <div className="space-y-3">
        {items.map((a) => {
          const expired = a.showUntil && a.showUntil < today;
          const live = a.published && !expired;
          return (
            <div key={a.id} className={`bg-ink-800 border border-ink-700 rounded-xl p-4 ${live ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold">{a.title}</span>
                {a.pinned && <Chip>📌 Pinned</Chip>}
                {!a.published && <Chip tone="grey">Draft</Chip>}
                {expired && <Chip tone="red">Expired</Chip>}
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {prettyDate(a.postedOn)}
                {a.showUntil ? ` · shown until ${prettyDate(a.showUntil)}` : ""}
              </div>
              <Preview text={a.body} />
              <div className="flex flex-wrap gap-4 mt-3">
                <button onClick={() => setEditing({ ...a, showUntil: a.showUntil || "" })} className="text-sm text-gray-300 underline">Edit</button>
                <button onClick={() => patch(a, { published: !a.published })} className="text-sm text-gray-300 underline">
                  {a.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => patch(a, { pinned: !a.pinned })} className="text-sm text-gray-300 underline">
                  {a.pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={() => remove(a.id)} className="text-sm text-red-400 underline">Delete</button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-gray-500 text-sm">No announcements yet.</p>}
      </div>

      {editing && <NewsModal initial={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function NewsModal({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  return (
    <Modal title={initial.id ? "Edit Announcement" : "New Announcement"} onCancel={onCancel} wide>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Title</span>
        <input value={form.title} maxLength={140} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="block mb-3">
        <span className="block text-sm text-gray-300 mb-1">Message</span>
        <textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label>
          <span className="block text-sm text-gray-300 mb-1">Date</span>
          <input type="date" value={form.postedOn} onChange={(e) => setForm({ ...form, postedOn: e.target.value })} />
        </label>
        <label>
          <span className="block text-sm text-gray-300 mb-1">Show until (optional)</span>
          <input type="date" value={form.showUntil} onChange={(e) => setForm({ ...form, showUntil: e.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
        <input type="checkbox" className="w-auto" checked={!!form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        Published (visible to customers)
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-300 mb-5">
        <input type="checkbox" className="w-auto" checked={!!form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
        Pin — also show as a banner on the home and booking pages
      </label>
      <SaveButton busy={busy} disabled={!form.title.trim()} onClick={() => onSave(form)} />
    </Modal>
  );
}
