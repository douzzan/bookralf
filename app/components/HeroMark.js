export default function HeroMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="430" cy="170" r="260" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="430" cy="170" r="210" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="180" y1="60" x2="600" y2="330" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="430" cy="170" r="3" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
