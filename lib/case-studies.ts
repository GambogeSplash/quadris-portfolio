// Case study registry. Each entry drives its /work/[slug] page, the section
// tracker, and the next-case-study footer. Add or edit entries here only.

export interface MediaItem {
  src?: string;
  alt?: string;
  placeholder?: string; // label shown in the artefact slot until real work lands
}

export interface Section {
  id: string;
  label: string; // tracker label
  heading: string;
  body: string;
  media?: MediaItem[];
  caption?: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  oneLiner: string;
  role: string;
  year: string;
  status: string;
  intro: string;
  sections: Section[];
  /** Set when the imagery belongs to someone else and must be replaced. */
  referenceNote?: string;
}

const P = "/work/patch";

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "patch",
    title: "Patch",
    oneLiner: "An app blocker you can hold.",
    role: "Product, identity, app",
    year: "2026",
    status: "Shipped",
    intro:
      "Patch is a small silicone device you tap your phone against to lock distracting apps. This case study walks through the surfaces of the project: the physical product, the identity, the app, and the campaign that carried it outdoors.",
    referenceNote:
      "Reference rebuild. Original design, photography, and film by System (system.studio). Replace this copy and imagery with your own work.",
    sections: [
      {
        id: "overview",
        label: "Overview",
        heading: "Overview",
        body: "A device, a brand, an app, and a campaign that all share one geometry. The project's job was to make focus feel physical instead of feeling like another setting buried in a menu.",
        media: [{ src: `${P}/patch-hero-1440.webp`, alt: "Patch device on a desk" }],
      },
      {
        id: "product",
        label: "Product",
        heading: "Product",
        body: "The object had to be friendly enough to live on a desk or a bedside table and tactile enough that reaching for it became a habit. The scalloped silhouette comes from a grid of circles fused into one form, which gives the device its grip and its personality at the same time.",
        media: [
          { src: `${P}/patch-model-1-960.webp`, alt: "Patch form model, front" },
          { src: `${P}/patch-model-2-960.webp`, alt: "Patch form model, angle" },
        ],
      },
      {
        id: "identity",
        label: "Identity",
        heading: "Identity",
        body: "The mark is constructed from the same circle grid as the device, so the logo and the object explain each other. Black anchors the system; six saturated accent colours keep it from feeling severe and give the app and campaign room to play.",
        media: [
          { src: `${P}/patch-mark-960.webp`, alt: "Patch logo mark" },
          { src: `${P}/patch-typography-960.webp`, alt: "Patch typography specimen" },
        ],
        caption: "Mark construction and the typographic voice of the system.",
      },
      {
        id: "app",
        label: "App",
        heading: "App",
        body: "The app stays out of the way. Lock states, timers, and widgets are built from the same shapes as the hardware, and every screen is reachable in one or two taps, because the entire point of the product is spending less time on the phone.",
        media: [{ src: `${P}/patch-app-1440.webp`, alt: "Patch app interface screens" }],
      },
      {
        id: "campaign",
        label: "Campaign",
        heading: "Campaign",
        body: "Out of home, the message stays plain: focus, made physical. Big type, the device at billboard scale, and nothing else competing for attention.",
        media: [{ src: `${P}/patch-billboard-1-1440.webp`, alt: "Patch billboard" }],
      },
    ],
  },
  {
    slug: "padi",
    title: "Padi",
    oneLiner: "Group savings people actually finish.",
    role: "Product design, research",
    year: "2025",
    status: "Concept, in progress",
    intro:
      "Rotating savings groups run on trust and memory: who has paid, whose turn is next, what happens when someone slips. Padi turns that social contract into a product without flattening the relationships that make it work.",
    sections: [
      {
        id: "context",
        label: "Context",
        heading: "Context",
        body: "Informal savings circles move serious money every month, coordinated through chat threads, screenshots, and one trusted organiser doing unpaid bookkeeping. The failure mode is rarely fraud; it is fatigue. Cycles stall when tracking gets heavy and nobody can see the whole picture.",
        media: [{ placeholder: "Research artefact: diary study or interview synthesis" }],
      },
      {
        id: "approach",
        label: "Approach",
        heading: "Approach",
        body: "The design treats the group, not the individual, as the primary unit. Every screen answers one of three questions: where is the money, whose turn is it, and is anyone falling behind. Reminders go to the group in the group's own tone, never as a debt collector.",
        media: [{ placeholder: "Flow diagram: cycle lifecycle from formation to payout" }],
      },
      {
        id: "decisions",
        label: "Decisions",
        heading: "Design decisions",
        body: "The hardest call was visibility of missed payments. Public shaming kills groups, silence kills trust. The middle path: the organiser sees specifics, members see only an anonymous group health bar, and a slipping member sees a private nudge with a recovery plan.",
        media: [
          { placeholder: "Key screen: group home" },
          { placeholder: "Key screen: turn and payout view" },
        ],
      },
      {
        id: "outcome",
        label: "Outcome",
        heading: "Outcome",
        body: "[Replace with real results: pilot group count, cycle completion rate against the manual baseline, organiser time saved. One strong number beats five soft ones.]",
        media: [{ placeholder: "Outcome artefact: dashboard or testimonial" }],
      },
    ],
  },
  {
    slug: "ledga",
    title: "Ledga",
    oneLiner: "A back office for market merchants.",
    role: "Product design, design systems",
    year: "2025",
    status: "Concept, in progress",
    intro:
      "Merchants who sell across a counter, a phone, and a stall keep their real books in their heads. Ledga is the record-keeping layer that meets them where they already are, built to survive bad connectivity and shared devices.",
    sections: [
      {
        id: "context",
        label: "Context",
        heading: "Context",
        body: "The gap is not ambition, it is tooling. Accounting software assumes a desk, a laptop, and an accountant. A market merchant has a phone, ten-second windows between customers, and records that mix household and business money.",
        media: [{ placeholder: "Field research artefact: merchant counter photo study" }],
      },
      {
        id: "approach",
        label: "Approach",
        heading: "Approach",
        body: "Entry first, structure later. Capturing a sale takes one gesture and works offline; categorisation, reconciliation, and credit records happen in calmer moments. The interface is data-dense on purpose, because merchants read their own numbers fluently when the numbers are theirs.",
        media: [{ placeholder: "Flow: offline-first sale capture" }],
      },
      {
        id: "decisions",
        label: "Decisions",
        heading: "Design decisions",
        body: "Customer credit (the book of who owes what) became the anchor feature rather than an afterthought, because it is the record merchants already guard most carefully. Typography and spacing were tuned for sunlight readability on low-end Android screens.",
        media: [
          { placeholder: "Key screen: day ledger" },
          { placeholder: "Key screen: credit book" },
        ],
      },
      {
        id: "outcome",
        label: "Outcome",
        heading: "Outcome",
        body: "[Replace with real results: daily active recording rate, reconciliation accuracy, retention after the first market week. State the baseline you measured against.]",
        media: [{ placeholder: "Outcome artefact: usage chart or merchant quote" }],
      },
    ],
  },
  {
    slug: "waybill",
    title: "Waybill",
    oneLiner: "Last-mile delivery, designed from the rider's seat.",
    role: "Product design, UX research",
    year: "2024",
    status: "Concept, in progress",
    intro:
      "Most delivery software is designed for the dispatcher and merely endured by the rider. Waybill flips that: a rider-first app where addresses are ambiguous, batteries are precious, and every extra tap costs money.",
    sections: [
      {
        id: "context",
        label: "Context",
        heading: "Context",
        body: "Riders navigate cities where the address system is a suggestion and the real wayfinding is landmarks, phone calls, and local knowledge. The app a rider uses all day was usually designed in an office and tested on flagship phones over fast networks.",
        media: [{ placeholder: "Ride-along research artefact" }],
      },
      {
        id: "approach",
        label: "Approach",
        heading: "Approach",
        body: "Design for the worst hour, not the demo: glove-sized touch targets, a one-glance job card readable at arm's length in traffic, call-first flows because conversation resolves addresses faster than maps, and a battery budget treated as a design constraint.",
        media: [{ placeholder: "Flow: job acceptance to proof of delivery" }],
      },
      {
        id: "decisions",
        label: "Decisions",
        heading: "Design decisions",
        body: "Proof of delivery moved from signature to a photo plus recipient phrase, cutting doorstep time while keeping disputes resolvable. Failed-delivery states got first-class design attention, because the unhappy path is where riders lose the most time and pay.",
        media: [
          { placeholder: "Key screen: active job card" },
          { placeholder: "Key screen: failed delivery flow" },
        ],
      },
      {
        id: "outcome",
        label: "Outcome",
        heading: "Outcome",
        body: "[Replace with real results: median doorstep time, failed-delivery recovery rate, rider satisfaction across a pilot fleet. Numbers from a real pilot, however small, beat projections.]",
        media: [{ placeholder: "Outcome artefact: before and after timing study" }],
      },
    ],
  },
  {
    slug: "stall",
    title: "Stall",
    oneLiner: "From chat to checkout for social sellers.",
    role: "Product design, brand",
    year: "2024",
    status: "Concept, in progress",
    intro:
      "Sellers who built their business inside chat apps lose hours to repeating prices, juggling payment screenshots, and retyping order details. Stall gives them a storefront that takes minutes to make and feels like it belongs to them, not to a template.",
    sections: [
      {
        id: "context",
        label: "Context",
        heading: "Context",
        body: "The catalogue is a camera roll, the checkout is a bank transfer screenshot, and the customer service channel is everything at once. It works, which is exactly why sellers do not switch to tools that ask them to abandon it.",
        media: [{ placeholder: "Research artefact: seller workflow map" }],
      },
      {
        id: "approach",
        label: "Approach",
        heading: "Approach",
        body: "Stall extends the chat workflow instead of replacing it. A storefront is assembled from the photos a seller already has, every product gets a link that drops cleanly into a conversation, and payment confirmation comes back into the thread where the sale actually happens.",
        media: [{ placeholder: "Flow: photo roll to live storefront" }],
      },
      {
        id: "decisions",
        label: "Decisions",
        heading: "Design decisions",
        body: "Personality over polish: sellers pick a voice for their shop, not just a colour, because their regulars buy from them, not from a layout. The editor enforces almost nothing; it nudges with defaults and lets the seller's taste lead.",
        media: [
          { placeholder: "Key screen: storefront editor" },
          { placeholder: "Key screen: in-chat checkout" },
        ],
      },
      {
        id: "outcome",
        label: "Outcome",
        heading: "Outcome",
        body: "[Replace with real results: time to first storefront, order completion rate against the manual baseline, repeat-buyer share. Pick the metric that proves the chat-native bet.]",
        media: [{ placeholder: "Outcome artefact: live storefront example" }],
      },
    ],
  },
];

export function getCaseStudy(slug: string) {
  return CASE_STUDIES.find((c) => c.slug === slug) ?? null;
}

export function nextCaseStudy(slug: string) {
  const i = CASE_STUDIES.findIndex((c) => c.slug === slug);
  if (i === -1 || CASE_STUDIES.length < 2) return null;
  return CASE_STUDIES[(i + 1) % CASE_STUDIES.length];
}
