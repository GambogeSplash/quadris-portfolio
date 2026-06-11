"use client";

import { useEffect, useState } from "react";

interface TrackerSection {
  id: string;
  label: string;
}

// Right-side section tracker: highlights the section in view, click to jump.
export function PageTracker({ sections }: { sections: TrackerSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // A band around the upper third of the viewport decides the active section.
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav className="cs-tracker" aria-label="Sections">
      {sections.map((s) => (
        <button
          key={s.id}
          className={active === s.id ? "is-active" : ""}
          onClick={() =>
            document
              .getElementById(s.id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

// Fade-up reveal for case study media as it scrolls into view.
export function MediaReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      ".cs-media, .cs-media-row",
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of targets) {
      el.classList.add("cs-reveal");
      // Anything already on screen at mount reveals immediately, no animation.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("is-revealed", "no-transition");
      } else {
        io.observe(el);
      }
    }
    return () => io.disconnect();
  }, []);
  return null;
}
