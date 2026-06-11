import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_STUDIES, getCaseStudy, nextCaseStudy } from "@/lib/case-studies";
import { SiteHeader } from "@/components/site-header";
import { PageTracker, MediaReveal } from "./nav";
import "./case-study.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const study = getCaseStudy((await params).slug);
  if (!study) return {};
  return {
    title: `${study.title} Case Study`,
    description: study.oneLiner,
  };
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

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const study = getCaseStudy((await params).slug);
  if (!study) notFound();
  const next = nextCaseStudy(study.slug);
  let heroAssigned = false;

  return (
    <div className="cs-page">
      <SiteHeader context="Case Study" />

      <PageTracker sections={study.sections.map(({ id, label }) => ({ id, label }))} />
      <MediaReveal />

      <main className="cs-body">
        <section className="cs-title" id={study.sections[0]?.id ?? "overview"}>
          <h1>{study.title}</h1>
          <p className="cs-intro">{study.intro}</p>
          <div className="cs-meta">
            <div>
              <span>Role</span>
              <span>{study.role}</span>
            </div>
            <div>
              <span>Year</span>
              <span>{study.year}</span>
            </div>
            <div>
              <span>Status</span>
              <span>{study.status}</span>
            </div>
          </div>
          {study.sections[0]?.media ? (
            <div className={study.sections[0].media.length > 1 ? "cs-media-row" : "cs-media"}>
              {study.sections[0].media.map((m, i) => {
                const isHero = !heroAssigned && (heroAssigned = true);
                return m.src ? (
                  <img
                    key={i}
                    src={m.src}
                    alt={m.alt ?? ""}
                    className={isHero ? "cs-hero" : undefined}
                  />
                ) : (
                  <div key={i} className={`cs-placeholder${isHero ? " cs-hero" : ""}`}>
                    <span>{m.placeholder}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {study.sections.slice(1).map((s) => (
          <section className="cs-section" id={s.id} key={s.id}>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
            {s.media ? (
              <div className={s.media.length > 1 ? "cs-media-row" : "cs-media"}>
                {s.media.map((m, i) =>
                  m.src ? (
                    <img key={i} src={m.src} alt={m.alt ?? ""} />
                  ) : (
                    <div key={i} className="cs-placeholder">
                      <span>{m.placeholder}</span>
                    </div>
                  ),
                )}
              </div>
            ) : null}
            {s.caption ? <p className="cs-caption">{s.caption}</p> : null}
          </section>
        ))}

        {next ? (
          <Link href={`/work/${next.slug}`} className="cs-next">
            <span className="cs-next-label">Next case study</span>
            <span className="cs-next-title">
              {next.title}
              <ArrowRight />
            </span>
          </Link>
        ) : null}

        {study.referenceNote ? (
          <footer className="cs-footer">
            <p>{study.referenceNote}</p>
          </footer>
        ) : (
          <footer className="cs-footer">
            <p>Quadri Agboulaje, {study.year}</p>
          </footer>
        )}
      </main>
    </div>
  );
}
