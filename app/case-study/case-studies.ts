// Case study registry. Add entries here and the tracker, tiles, and the
// next-case-study footer pick them up automatically.
export interface CaseStudyEntry {
  slug: string;
  title: string;
  href: string;
}

export const CASE_STUDIES: CaseStudyEntry[] = [
  { slug: "patch", title: "Patch", href: "/case-study" },
];

export function nextCaseStudy(slug: string): CaseStudyEntry | null {
  if (CASE_STUDIES.length < 2) return null;
  const i = CASE_STUDIES.findIndex((c) => c.slug === slug);
  return CASE_STUDIES[(i + 1) % CASE_STUDIES.length];
}

export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "product", label: "Product" },
  { id: "identity", label: "Identity" },
  { id: "app", label: "App" },
  { id: "campaign", label: "Campaign" },
];
