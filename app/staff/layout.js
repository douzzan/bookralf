"use client";

import { useEffect, useState } from "react";

export default function StaffLayout({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const ok = typeof window !== "undefined" && sessionStorage.getItem("bookralf_staff_ok") === "1";
    setUnlocked(ok);
    setChecked(true);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (input === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      sessionStorage.setItem("bookralf_staff_ok", "1");
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  }

  if (!checked) return null;

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="bg-ink-800 border border-ink-700 rounded-xl p-6 w-full max-w-sm">
          <div className="text-gold-400 text-lg font-semibold mb-1">✂ Book Ralf — Staff</div>
          <p className="text-gray-400 text-sm mb-4">Enter the admin password to continue.</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            className="mb-3"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button className="w-full bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold py-3 rounded-xl">Enter</button>
        </form>
      </main>
    );
  }

  return children;
}
