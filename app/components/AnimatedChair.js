"use client";

import { useEffect, useRef, useState } from "react";

// A hand-drawn line-art barber chair that turns to face the viewer the
// first time it scrolls into view. Pure CSS 3D transform on a flat SVG —
// no video/model asset, matches the crest & hero mark's stroke style.
export default function AnimatedChair({ className = "" }) {
  const ref = useRef(null);
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTurned(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ perspective: "900px" }}>
      <svg
        viewBox="0 0 200 260"
        className="w-full h-full text-gold-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transformStyle: "preserve-3d",
          transform: turned ? "rotateY(0deg)" : "rotateY(-58deg)",
          transformOrigin: "50% 60%",
          transition: "transform 1.7s cubic-bezier(0.16, 1, 0.3, 1)",
          opacity: turned ? 1 : 0.5,
          transitionProperty: "transform, opacity",
        }}
        aria-hidden="true"
      >
        {/* base + pedestal */}
        <ellipse cx="100" cy="250" rx="46" ry="7" opacity="0.55" />
        <line x1="100" y1="245" x2="100" y2="205" />
        {/* seat */}
        <rect x="55" y="188" width="90" height="24" rx="10" />
        {/* armrests */}
        <rect x="26" y="182" width="36" height="13" rx="6.5" />
        <rect x="138" y="182" width="36" height="13" rx="6.5" />
        <line x1="32" y1="195" x2="32" y2="212" />
        <line x1="168" y1="195" x2="168" y2="212" />
        {/* backrest, reclined slightly */}
        <rect x="62" y="66" width="76" height="128" rx="20" transform="rotate(-5 100 130)" />
        {/* headrest */}
        <rect x="74" y="36" width="52" height="34" rx="14" transform="rotate(-5 100 130)" />
      </svg>
    </div>
  );
}
