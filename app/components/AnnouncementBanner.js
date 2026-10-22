"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Slim banner for the newest pinned announcement. Renders nothing when there
// isn't one, and quietly stays hidden if the request fails.
export default function AnnouncementBanner() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements/banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !data.id) return;
        try {
          if (sessionStorage.getItem(`banner-dismissed-${data.id}`)) return;
        } catch {}
        setItem(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!item) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(`banner-dismissed-${item.id}`, "1");
    } catch {}
    setItem(null);
  }

  return (
    <div className="bg-gold-500 text-ink-950" role="status">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        <span aria-hidden className="shrink-0">📣</span>
        <p className="flex-1 min-w-0 leading-snug">
          <span className="font-semibold">{item.title}</span>{" "}
          <Link href="/about#news" className="underline underline-offset-2 whitespace-nowrap font-medium">
            Read more
          </Link>
        </p>
        <button onClick={dismiss} aria-label="Dismiss announcement" className="shrink-0 px-1 text-lg leading-none">
          ✕
        </button>
      </div>
    </div>
  );
}
