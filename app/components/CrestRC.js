// Same two-ring frame as <Crest />, with the Ralf's Chops scissors + RC mark
// (public/images/crest-rc.png, transparent PNG) in place of the italic "R".
// Rings follow `currentColor`, so keep passing text-gold-500 like with <Crest />.
export default function CrestRC({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" role="img" aria-label="Ralf's Chops">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <image href="/images/crest-rc.png" x="15" y="15" width="34" height="34" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
