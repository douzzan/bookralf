"use client";

import Link from "next/link";
import { useState } from "react";
import Crest from "./Crest";

const CUSTOMER_LINKS = [
  { href: "/book", label: "Book an Appointment" },
  { href: "/my-bookings", label: "My Bookings" },
];

const STAFF_LINKS = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/schedule", label: "Schedule Manager" },
  { href: "/staff/pending", label: "Pending Requests" },
  { href: "/staff/bookings", label: "All Bookings" },
  { href: "/staff/notifications", label: "Notifications" },
];

export default function Nav({ variant = "customer" }) {
  const [open, setOpen] = useState(false);
  const links = variant === "staff" ? STAFF_LINKS : CUSTOMER_LINKS;
  const homeHref = variant === "staff" ? "/staff" : "/";

  return (
    <header className="border-b border-ink-700 bg-ink-950 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-3 text-lg font-fraunces italic text-gold-400">
          <Crest className="w-8 h-8 text-gold-500" />
          Book Ralf
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-gray-300 hover:text-gold-400">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-200"
          aria-label="Open menu"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-ink-700 px-4 py-2 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-3 text-gray-200 border-b border-ink-800 last:border-none"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
