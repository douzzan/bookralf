"use client";

import { useEffect, useRef, useState } from "react";

// Drifts a background image slightly slower than scroll speed for a
// gentle parallax feel. Pure scroll listener + rAF, no library. Silently
// does nothing if the browser prefers reduced motion.
export default function ParallaxImage({ src, alt = "", className = "", children }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!wrap || !img) return;
        const rect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        // How far the element's center is from the viewport center, as a ratio
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        img.style.transform = `translateY(${progress * 40}px) scale(1.15)`;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scale(1.15)" }}
        onError={(e) => {
          // Image not added yet — hide cleanly instead of showing a broken icon.
          e.currentTarget.parentElement.style.display = "none";
        }}
      />
      {children}
    </div>
  );
}
