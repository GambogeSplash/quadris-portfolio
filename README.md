# Quadri's Portfolio

Portfolio scaffold built on Next.js 16. The first case study is a faithful rebuild of [System Studio's Patch case study](https://system.studio/work/patch), including the desktop horizontal rail and the WebGL edge-warp layer, ported to React with a standalone implementation in `app/work/patch/`.

Design, photography, video, and typefaces in the Patch case study are the work and property of [System](https://system.studio) and are included here as reference material for study. Replace them with your own work before publishing this as a portfolio.

## Stack

- Next.js 16, React 19
- Compiled stylesheet served from `public/assets` (Tailwind v4 output)
- WebGL curtain layer via [ogl](https://github.com/oframe/ogl)

## Structure

- `app/work/patch/content.tsx` — case study markup
- `app/work/patch/interactions.tsx` — rail scroller, drag, wheel, media reveal
- `app/work/patch/curtain.ts` — WebGL edge-warp and chromatic aberration layer

## Run

```bash
npm install
npm run dev
```
