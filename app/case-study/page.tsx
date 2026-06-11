import type { Metadata } from "next";
import Link from "next/link";
import { nextCaseStudy } from "./case-studies";
import { PageTracker, MediaReveal } from "./nav";
import "./case-study.css";

export const metadata: Metadata = {
  title: "Patch — Case Study",
  description: "Process notes behind the Patch rebuild.",
};

const B = "/work/patch";

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

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9 3L13.5 8L9 13M13 8H2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CaseStudy() {
  const next = nextCaseStudy("patch");

  return (
    <div className="cs-page">
      <header className="cs-header">
        <Link href="/" className="cs-back" aria-label="Back to home">
          <ArrowLeft />
          <span>Home</span>
        </Link>
        <span style={{ color: "#969696" }}>Case Study</span>
      </header>

      <PageTracker />
      <MediaReveal />

      <main className="cs-body">
        <section className="cs-title" id="overview">
          <h1>Patch</h1>
          <p className="cs-intro">
            Patch is a small silicone device you tap your phone against to lock
            distracting apps. This case study walks through the surfaces of the
            project: the physical product, the identity, the app, and the
            campaign that carried it outdoors.
          </p>
          <div className="cs-meta">
            <div>
              <span>Role</span>
              <span>Product, identity, app</span>
            </div>
            <div>
              <span>Year</span>
              <span>2026</span>
            </div>
            <div>
              <span>Status</span>
              <span>Shipped</span>
            </div>
          </div>
          <div className="cs-media">
            <img src={`${B}/patch-hero-1440.webp`} alt="Patch device on a desk" />
          </div>
        </section>

        <section className="cs-section" id="product">
          <h2>Product</h2>
          <p>
            The object had to be friendly enough to live on a desk or a bedside
            table and tactile enough that reaching for it became a habit. The
            scalloped silhouette comes from a grid of circles fused into one
            form, which gives the device its grip and its personality at the
            same time.
          </p>
          <div className="cs-media-row">
            <img src={`${B}/patch-model-1-960.webp`} alt="Patch form model, front" />
            <img src={`${B}/patch-model-2-960.webp`} alt="Patch form model, angle" />
          </div>
        </section>

        <section className="cs-section" id="identity">
          <h2>Identity</h2>
          <p>
            The mark is constructed from the same circle grid as the device, so
            the logo and the object explain each other. Black anchors the
            system; six saturated accent colours keep it from feeling severe
            and give the app and campaign room to play.
          </p>
          <div className="cs-media-row">
            <img src={`${B}/patch-mark-960.webp`} alt="Patch logo mark" />
            <img src={`${B}/patch-typography-960.webp`} alt="Patch typography specimen" />
          </div>
          <p className="cs-caption">
            Mark construction and the typographic voice of the system.
          </p>
        </section>

        <section className="cs-section" id="app">
          <h2>App</h2>
          <p>
            The app stays out of the way. Lock states, timers, and widgets are
            built from the same shapes as the hardware, and every screen is
            reachable in one or two taps, because the entire point of the
            product is spending less time on the phone.
          </p>
          <div className="cs-media">
            <img src={`${B}/patch-app-1440.webp`} alt="Patch app interface screens" />
          </div>
        </section>

        <section className="cs-section" id="campaign">
          <h2>Campaign</h2>
          <p>
            Out of home, the message stays plain: focus, made physical. Big
            type, the device at billboard scale, and nothing else competing for
            attention.
          </p>
          <div className="cs-media">
            <img src={`${B}/patch-billboard-1-1440.webp`} alt="Patch billboard" />
          </div>
        </section>

        {next ? (
          <Link href={next.href} className="cs-next">
            <span className="cs-next-label">Next case study</span>
            <span className="cs-next-title">
              {next.title}
              <ArrowRight />
            </span>
          </Link>
        ) : (
          <Link href="/" className="cs-next">
            <span className="cs-next-label">More case studies coming</span>
            <span className="cs-next-title">
              Back to all work
              <ArrowRight />
            </span>
          </Link>
        )}

        <footer className="cs-footer">
          <p>
            Reference rebuild. Original design, photography, and film by{" "}
            <a href="https://system.studio" target="_blank" rel="noreferrer">
              System
            </a>
            . Replace this copy and imagery with your own work.
          </p>
        </footer>
      </main>
    </div>
  );
}
