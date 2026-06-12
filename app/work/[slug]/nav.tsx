"use client";

import { useEffect, useState } from "react";
import { mountWarpCurtain } from "./warp-curtain";

// Desktop immersion layer for editorial pages: the rail's lens physics
// rotated vertical. Media flares from the column centerline and disperses as
// it crosses the top/bottom viewport edges. Native scroll stays untouched.
// Alternative signature available in ./resolve-curtain.ts (swap the import).
export function Immersion() {
  useEffect(() => {
    const column = document.querySelector<HTMLElement>(".cs-body");
    if (!column) return;

    let cleanupWarp: (() => void) | null = null;

    const md = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      const active = md.matches && !reduced.matches;
      if (active && !cleanupWarp) {
        cleanupWarp = mountWarpCurtain(column);
      } else if (!active && cleanupWarp) {
        cleanupWarp();
        cleanupWarp = null;
      }
    };
    sync();
    md.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    return () => {
      md.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      cleanupWarp?.();
    };
  }, []);
  return null;
}

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
