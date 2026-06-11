import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "../work/[slug]/case-study.css";

export const metadata: Metadata = {
  title: "Contact, Quadri Agboulaje",
  description: "Get in touch with Quadri Agboulaje.",
};

export default function Contact() {
  return (
    <div className="cs-page">
      <SiteHeader context="Contact" />
      <main className="cs-body">
        <section className="cs-title">
          <h1>Contact</h1>
          <p className="cs-intro">
            [One welcoming line about what kinds of conversations are wanted:
            roles, collaborations, coffee.]
          </p>
        </section>

        <section className="cs-section">
          <h2>Email</h2>
          <p>[hello@example.com, swap in the real address]</p>
        </section>

        <section className="cs-section">
          <h2>Elsewhere</h2>
          <p>[LinkedIn, X, Read.cv, Dribbble: keep only the ones kept current.]</p>
        </section>

        <footer className="cs-footer">
          <p>Quadri Agboulaje</p>
        </footer>
      </main>
    </div>
  );
}
