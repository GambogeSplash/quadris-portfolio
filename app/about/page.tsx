import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "../work/[slug]/case-study.css";

export const metadata: Metadata = {
  title: "About, Quadri Agboulaje",
  description: "About Quadri Agboulaje, product designer.",
};

export default function About() {
  return (
    <div className="cs-page">
      <SiteHeader context="About" />
      <main className="cs-body">
        <section className="cs-title">
          <h1>About</h1>
          <p className="cs-intro">
            [Two or three sentences in Quadri&apos;s own voice: what he designs,
            the kinds of problems he gravitates toward, and where he works
            from. Plain words beat adjectives here.]
          </p>
          <div className="cs-media">
            <div className="cs-placeholder">
              <span>Portrait or workspace photo</span>
            </div>
          </div>
        </section>

        <section className="cs-section">
          <h2>Experience</h2>
          <p>
            [List roles newest first: company, title, years, one line on what
            he owned. Three to five entries; cut anything that does not help
            the story.]
          </p>
        </section>

        <section className="cs-section">
          <h2>Capabilities</h2>
          <p>
            [Product design, design systems, prototyping, research. Name tools
            only if asked; capabilities carry more weight than software lists.]
          </p>
        </section>

        <section className="cs-section">
          <h2>Now</h2>
          <p>
            [What he is currently building, learning, or open to. This is the
            line that starts conversations; keep it current.]
          </p>
        </section>

        <footer className="cs-footer">
          <p>Quadri Agboulaje</p>
        </footer>
      </main>
    </div>
  );
}
