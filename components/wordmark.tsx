import type { CSSProperties } from "react";

// "Quadri" set per-letter so the variable weight wave can ripple through it
// on hover (see .q-wordmark in app/signature.css). ABC Camera is variable
// 100 to 900, which is what makes the swell possible.
export function Wordmark() {
  return (
    <span className="q-wordmark">
      {[..."Quadri"].map((ch, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  );
}
