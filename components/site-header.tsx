import Link from "next/link";

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7 3L2.5 8L7 13M3 8H13.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Shared header for editorial pages (case studies, about, contact). The home
// rail keeps its own header, which is part of the rail experience.
export function SiteHeader({ context }: { context?: string }) {
  return (
    <header className="cs-header">
      <Link href="/" className="cs-back" aria-label="Back to home">
        <ArrowLeft />
        <span className="cs-wordmark">Quadri</span>
      </Link>
      <nav className="cs-nav">
        {context ? <span className="cs-context">{context}</span> : null}
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </header>
  );
}
