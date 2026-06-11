"use client";

/*
 * DOM behaviors ported from system.studio's bundle: media fade-in, in-view video
 * playback, and the desktop horizontal rail (vertical scroll -> sideways travel,
 * wheel takeover, pointer drag) with the WebGL curtain on top.
 */
import { useEffect } from "react";
import { mountCurtain, applyRailTransform } from "./curtain";

const FADE = ["transition-opacity", "duration-300", "ease-out"];

// Reveal media that loads after mount with a 300ms fade; anything already decoded
// (cache hits) appears instantly so a warm load doesn't flicker.
function setupMediaReveal(root: HTMLElement) {
  const cleanups: Array<() => void> = [];

  for (const img of root.querySelectorAll<HTMLImageElement>("picture img")) {
    if (!img.classList.contains("opacity-0")) continue;
    const reveal = (fade: boolean) => {
      if (fade) img.classList.add(...FADE);
      img.classList.remove("opacity-0");
    };
    if (img.complete && img.naturalWidth > 0) {
      reveal(false);
      continue;
    }
    let settled = false;
    const raf = requestAnimationFrame(() => {
      if (settled) return;
      if (img.complete && img.naturalWidth > 0) {
        settled = true;
        reveal(false);
      }
    });
    const onLoad = () => {
      if (!settled) {
        settled = true;
        reveal(true);
      }
    };
    img.addEventListener("load", onLoad, { once: true });
    cleanups.push(() => {
      cancelAnimationFrame(raf);
      img.removeEventListener("load", onLoad);
    });
  }

  for (const video of root.querySelectorAll<HTMLVideoElement>("video")) {
    const reveal = (fade: boolean) => {
      if (fade) video.classList.add(...FADE);
      video.classList.remove("opacity-0");
    };
    if (video.classList.contains("opacity-0")) {
      if (video.readyState >= 3) {
        reveal(false);
      } else {
        const onCanPlay = () => reveal(true);
        video.addEventListener("canplay", onCanPlay, { once: true });
        cleanups.push(() => video.removeEventListener("canplay", onCanPlay));
      }
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(video);
    cleanups.push(() => io.disconnect());
  }

  return () => cleanups.forEach((fn) => fn());
}

const TRACK_ACTIVE = ["md:cursor-grab", "md:select-none", "md:will-change-transform"];
const WRAPPER_INACTIVE = ["md:overflow-x-auto", "md:scrollbar-hide"];

// Desktop rail: the section grows to the track's width so native vertical scroll
// drives the strip sideways 1:1. Wheel and drag both feed the same scroll position.
function setupRail(section: HTMLElement, track: HTMLElement) {
  const wrapper = track.parentElement as HTMLElement;
  wrapper.classList.remove(...WRAPPER_INACTIVE);
  track.classList.add(...TRACK_ACTIVE);

  // Trailing spacer closes the gap after the last tile (matches the hydrated DOM).
  const spacer = document.createElement("div");
  spacer.className = "shrink-0 -ml-2 h-[var(--bh)] w-2";
  spacer.setAttribute("aria-hidden", "true");
  track.appendChild(spacer);

  const setHeight = () => {
    const travel = Math.max(track.scrollWidth - window.innerWidth, 0);
    section.style.height = `${travel + window.innerHeight}px`;
  };
  const onScroll = () => applyRailTransform(section, track);
  const onResize = () => {
    setHeight();
    onScroll();
  };
  setHeight();
  onScroll();
  window.addEventListener("resize", onResize, { passive: true });
  const ro = new ResizeObserver(onResize);
  ro.observe(track);

  const normalizeDelta = (e: WheelEvent) => {
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      dx *= 16;
      dy *= 16;
    } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      dx *= window.innerHeight;
      dy *= window.innerHeight;
    }
    return { dx, dy };
  };
  const onWheel = (e: WheelEvent) => {
    const { dx, dy } = normalizeDelta(e);
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      window.scrollBy(0, dx);
      return;
    }
    if (dy) {
      e.preventDefault();
      window.scrollBy(0, dy);
    }
  };

  let down = false;
  let dragging = false;
  let startX = 0;
  let lastX = 0;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    down = true;
    dragging = false;
    startX = e.clientX;
    lastX = e.clientX;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!down) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < 4) return;
      dragging = true;
      document.body.style.cursor = "grabbing";
    }
    e.preventDefault();
    window.scrollBy(0, lastX - e.clientX);
    lastX = e.clientX;
  };
  const onPointerUp = () => {
    down = false;
    dragging = false;
    document.body.style.cursor = "";
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  track.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  const unmountCurtain = mountCurtain(section, track);

  return () => {
    unmountCurtain();
    ro.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", onWheel);
    track.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "";
    section.style.height = "";
    track.style.transform = "";
    spacer.remove();
    track.classList.remove(...TRACK_ACTIVE);
    wrapper.classList.add(...WRAPPER_INACTIVE);
  };
}

export default function Interactions() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const cleanupReveal = setupMediaReveal(main);

    const section = main.querySelector<HTMLElement>("article > section");
    const track = section?.querySelector<HTMLElement>(
      ":scope > div > div > div",
    );

    let cleanupRail: (() => void) | null = null;
    const md = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const active = md.matches && !reduced.matches;
      if (active && !cleanupRail && section && track) {
        cleanupRail = setupRail(section, track);
      } else if (!active && cleanupRail) {
        cleanupRail();
        cleanupRail = null;
      }
    };
    sync();
    md.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    return () => {
      md.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      cleanupRail?.();
      cleanupReveal();
    };
  }, []);

  return null;
}
