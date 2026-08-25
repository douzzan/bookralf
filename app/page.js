"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "./components/Nav";
import Reveal from "./components/Reveal";
import HeroMark from "./components/HeroMark";
import ParallaxImage from "./components/ParallaxImage";
import Crest from "./components/Crest";
import { safeFetchJson } from "../lib/safeFetch";

const FEATURES = [
  {
    title: "Precision Cuts",
    blurb: "Clipper and scissor work, tailored to your face shape — every visit.",
    icon: (
      <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="10" r="4" />
        <circle cx="12" cy="30" r="4" />
        <line x1="15" y1="12.5" x2="34" y2="28" />
        <line x1="15" y1="27.5" x2="34" y2="12" />
      </svg>
    ),
  },
  {
    title: "Hot Towel Finish",
    blurb: "A warm-towel close and neck cleanup to send you off sharp.",
    icon: (
      <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M10 26c0-6 4-9 10-9s10 3 10 9" />
        <rect x="8" y="26" width="24" height="6" rx="1.5" />
        <path d="M14 12c1-2 0-3-1-4M20 10c1-2 0-3-1-4M26 12c1-2 0-3-1-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Your Own Space",
    blurb: "One chair, set up wherever suits you — kitchen, garage, backyard.",
    icon: (
      <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 34V16l12-9 12 9v18" />
        <path d="M16 34V22h8v12" />
      </svg>
    ),
  },
];

const TRUST = [
  { title: "Sanitized Kit, Every Visit", blurb: "Tools cleaned and cased between every single appointment." },
  { title: "On-Time, By Design", blurb: "One booking per window — no overlap, no rushing your cut." },
  { title: "Confirmed Before We Arrive", blurb: "You get a notification the moment your booking is confirmed." },
];

export default function LandingPage() {
  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    safeFetchJson("/api/locations", { expectArray: true, onSuccess: setLocations, onError: console.error });
    safeFetchJson("/api/services", { expectArray: true, onSuccess: setServices, onError: console.error });
  }, []);

  return (
    <>
      <div className="grain-overlay" />
      <Nav variant="customer" />

      <p className="hidden lg:block fixed left-3 top-1/2 -translate-y-1/2 -rotate-90 origin-left font-inter text-[10px] tracking-[0.4em] text-paper/25 uppercase z-20 pointer-events-none">
        House-Call Barbering — Est. 2019
      </p>

      <main className="bg-near-black text-paper relative isolate overflow-hidden">
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-28 text-center">
          {/* hero.jpg background photo, darkened by the gradient layer above it
              so the headline stays readable regardless of the photo's exposure */}
          <div
            className="absolute inset-0 -z-30 kenburns bg-cover bg-center"
            style={{ backgroundImage: "url('/images/hero.jpg')" }}
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-near-black/60 via-near-black/85 to-near-black" />

          <HeroMark className="hidden md:block absolute top-[-6rem] right-[-8rem] w-[38rem] h-[38rem] text-gold-500 -z-10" />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full -z-10 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(207,155,66,0.14), transparent 70%)" }}
          />

          <Reveal className="flex justify-center mb-6">
            <Crest className="w-14 h-14 text-gold-500" />
          </Reveal>

          <Reveal delay={80}>
            <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-6">
              Private House-Call Barbering
            </p>
          </Reveal>

          <Reveal delay={140}>
            <h1 className="font-fraunces italic font-medium text-[12vw] leading-[0.95] md:text-7xl lg:text-8xl md:leading-[0.95] mb-8 [text-shadow:0_2px_40px_rgba(0,0,0,0.6)]">
              More than
              <br />a haircut.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="font-fraunces text-lg md:text-xl text-paper/70 max-w-xl mx-auto mb-10 leading-relaxed">
              Ralf brings a full barbershop setup to your door — precision cuts, hot towel
              finish, no waiting room. One chair, one client, one hour set aside for you.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/book"
                className="bg-gold-500 hover:bg-gold-600 text-near-black font-inter font-semibold text-sm tracking-wide px-8 py-4 rounded-sm transition shadow-[0_8px_30px_rgba(207,155,66,0.25)] hover:shadow-[0_8px_36px_rgba(207,155,66,0.4)] hover:-translate-y-0.5"
              >
                Book Your Visit
              </Link>
              <a
                href="#menu"
                className="border border-gold-500/50 hover:border-gold-400 text-paper font-inter font-semibold text-sm tracking-wide px-8 py-4 rounded-sm transition"
              >
                View Prices
              </a>
            </div>
          </Reveal>
        </section>

        <div className="divider-fade" />

        {/* ---------- THE RALF STANDARD (feature cards) ---------- */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <Reveal className="text-center mb-14">
            <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-3">What to Expect</p>
            <h2 className="font-fraunces italic text-3xl md:text-5xl">The Ralf Standard</h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <div className="h-full border border-hairline rounded-lg px-6 py-8 text-center hover:border-gold-500/60 transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-full border border-gold-500/40 flex items-center justify-center text-gold-400 mb-5">
                    {f.icon}
                  </div>
                  <div className="font-fraunces text-lg mb-2">{f.title}</div>
                  <p className="font-inter text-sm text-paper/50 leading-relaxed">{f.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- TESTIMONIAL / MANIFESTO (directly below What to Expect) ---------- */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-20 bg-cover"
            style={{ backgroundImage: "url('/images/testimonial.jpg')", backgroundPosition: "center 30%" }}
          />
          <div className="absolute inset-0 -z-10 bg-near-black/78" />
          <div className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center relative">
            <span
              aria-hidden
              className="absolute -top-6 left-1/2 -translate-x-1/2 font-fraunces italic text-gold-500/20 text-[9rem] leading-none select-none"
            >
              &ldquo;
            </span>
            <Reveal>
              <p className="relative font-fraunces text-2xl md:text-3xl leading-snug text-paper/90 mb-4">
                Every visit is one chair, one client, one hour set aside — sharpened tools and full
                attention, in the room where you already feel most yourself.
              </p>
              <p className="font-inter text-xs tracking-[0.2em] text-gold-400 uppercase">— The Book Ralf Standard</p>
            </Reveal>
          </div>
        </section>

        <div className="divider-fade" />

        {/* ---------- PHOTO BAND (optional — hides itself if band.jpg is missing) ---------- */}
        <Reveal as="section">
          <ParallaxImage src="/images/band.jpg" alt="" className="h-[40vh] md:h-[50vh]">
            <div className="absolute inset-0 bg-near-black/35" />
          </ParallaxImage>
        </Reveal>

        <div className="divider-fade" />

        {/* ---------- TRUST BADGES ---------- */}
        <section className="bg-charcoal">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
            <Reveal className="text-center mb-14">
              <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-3">Why Ralf</p>
              <h2 className="font-fraunces italic text-3xl md:text-5xl">Booked with confidence</h2>
            </Reveal>
            <div className="grid sm:grid-cols-3 gap-5">
              {TRUST.map((t, i) => (
                <Reveal key={t.title} delay={i * 90}>
                  <div className="h-full text-center px-4">
                    <div className="w-11 h-11 mx-auto rounded-full bg-gold-500 text-near-black flex items-center justify-center mb-5">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="font-fraunces text-lg mb-2">{t.title}</div>
                    <p className="font-inter text-sm text-paper/50 leading-relaxed">{t.blurb}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="divider-fade" />

        {/* ---------- TOOLS BANNER (thin strip above the price list) ---------- */}
        <Reveal
          className="h-24 md:h-32 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/tools-banner.jpg')" }}
        />

        {/* ---------- MENU / PRICE LIST ---------- */}
        <section id="menu" className="max-w-3xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <Reveal className="text-center">
            <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-3">Price List</p>
            <h2 className="font-fraunces italic text-3xl md:text-5xl mb-14">What&rsquo;s on the chair</h2>
          </Reveal>

          <div className="space-y-1">
            {(services.length ? services : []).map((s, i) => (
              <Reveal key={s.id} delay={i * 60}>
                <div className="group -mx-3 px-3 py-3 rounded-md border-l-2 border-transparent hover:border-gold-500 hover:bg-white/[0.03] transition-all">
                  <div className="flex items-baseline gap-3">
                    <span className="font-fraunces text-lg md:text-xl whitespace-nowrap transition-transform group-hover:translate-x-0.5">
                      {s.name}
                    </span>
                    <span className="flex-1 border-b border-dotted border-paper/25 translate-y-[-4px]" />
                    <span className="font-inter text-lg md:text-xl tabular-nums text-gold-400">${s.price}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-inter text-xs text-paper/40">{s.description}</span>
                    <span className="font-inter text-xs text-paper/40">{s.durationMin} min</span>
                  </div>
                </div>
              </Reveal>
            ))}
            {services.length === 0 && <p className="text-paper/40 font-inter text-sm text-center">Loading…</p>}
          </div>
        </section>

        <div className="divider-fade" />

        {/* ---------- COVERAGE (last, after tools + price list) ---------- */}
        <section id="coverage" className="max-w-4xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
          <Reveal>
            <p className="font-inter text-xs tracking-[0.3em] text-gold-400 uppercase mb-3">Coverage</p>
            <h2 className="font-fraunces italic text-3xl md:text-5xl mb-12">Where we visit</h2>
          </Reveal>
          <div className="flex flex-wrap justify-center gap-4">
            {(locations.length ? locations : [{ id: 1, name: "…" }]).map((l, i) => (
              <Reveal key={l.id} delay={i * 70}>
                <div className="border border-gold-500/40 rounded-full px-6 py-3 font-fraunces text-lg text-paper/90 hover:border-gold-400 hover:text-gold-300 transition-colors">
                  {l.name}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="text-center mt-16">
            <Link
              href="/book"
              className="inline-block bg-gold-500 hover:bg-gold-600 text-near-black font-inter font-semibold text-sm tracking-wide px-8 py-4 rounded-sm transition shadow-[0_8px_30px_rgba(207,155,66,0.25)] hover:shadow-[0_8px_36px_rgba(207,155,66,0.4)] hover:-translate-y-0.5"
            >
              Book Your Visit
            </Link>
          </Reveal>
        </section>

        <div className="divider-fade" />

        {/* ---------- FOOTER ---------- */}
        <footer className="max-w-5xl mx-auto px-6 md:px-10 py-14 flex flex-col items-center text-center gap-4">
          <Crest className="w-10 h-10 text-gold-500" />
          <p className="font-fraunces italic text-lg text-paper/80">Book Ralf</p>
          <p className="font-inter text-xs tracking-widest text-paper/40 uppercase">
            {locations.map((l) => l.name).join(" · ") || "Thornhill · Clanton · South · Others"}
          </p>
          <p className="font-inter text-[11px] text-paper/25 mt-4">© {new Date().getFullYear()} Book Ralf</p>
        </footer>
      </main>
    </>
  );
}
