export default function Crest({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontSize="26"
        fill="currentColor"
      >
        R
      </text>
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
