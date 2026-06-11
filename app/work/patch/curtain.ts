/*
 * Edge-warp "curtain" layer, ported from system.studio's bundle (main-B5OmZQKT.js).
 * The rail's media and captions are drawn onto a fixed WebGL canvas; tiles flare
 * vertically and pick up chromatic aberration as they cross the viewport edges.
 * Shaders, constants, and render-loop logic are kept 1:1 with the original.
 */
import {
  Renderer,
  Plane,
  Program,
  Mesh,
  Texture,
  Transform,
  type OGLRenderingContext,
} from "ogl";

const MAX_DPR = 3;
const SNAPSHOT_CONCURRENCY = 4;
const SEGMENTS_X = 48;
const SEGMENTS_Y = 14;
const EDGE_ZONE = 0.1; // fraction of viewport width where the warp lives
const EDGE_POW = 2.6;
const FAN = 0.6;
const CHROMA = 0.02;
const FX_END = 0.012;
const BLEND_START = 2e-4;
const BLEND_END = 3e-4;

const VERTEX = /* glsl */ `
  precision highp float;
  attribute vec2 uv;
  attribute vec3 position;
  uniform vec2 uResolution;
  uniform vec4 uRect;       // left, top, width, height (css px, y-down)
  uniform float uBandCenter; // shared centerline so the whole rail warps as one sheet
  uniform float uFan;
  uniform float uEdgeZone;
  uniform float uEdgePow;
  uniform float uLeftGate;  // 0 when there is no content past the left edge (start)
  uniform float uRightGate; // 0 when there is no content past the right edge (end)
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vUv = uv;
    // uv.y = 0 is the bottom of the plane in ogl; map it to the tile's bottom edge.
    vec2 screen = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;

    // The rail scrolls sideways; flare at the left/right edges, gated at the tails so the very
    // start and end read flat. The whole rail warps around one shared centerline.
    float sx = screen.x / uResolution.x;       // 0..1 across the window
    float dist = min(sx, 1.0 - sx);            // 0 at the edges, 0.5 at the centre
    float edge = pow(smoothstep(uEdgeZone, 0.0, dist), uEdgePow);
    edge *= mix(uLeftGate, uRightGate, step(0.5, sx));
    // Ramp warp with the same curve as the fragment mask so flat DOM and warped GL stay aligned
    // in the seam band — a hard step or clip at zonePx left white gaps or vertical tears.
    float blend = smoothstep(${BLEND_START}, ${BLEND_END}, edge);
    float y = uBandCenter + (screen.y - uBandCenter) * (1.0 + uFan * edge * blend);

    float nx = sx * 2.0 - 1.0;
    float ny = 1.0 - y / uResolution.y * 2.0;
    gl_Position = vec4(nx, ny, 0.0, 1.0);
    vEdge = edge;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uChroma;
  uniform float uFullTile; // whole-tile GL (video, text); else just the seam tails
  uniform vec2 uUvScale;   // object-fit: cover crop
  uniform vec2 uUvOffset;
  uniform vec2 uTileSize;  // tile px size, for rounding full-tile corners
  uniform float uRadius;   // corner radius px (0 = square; matches the DOM's rounded tile)
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vec2 uv = uUvOffset + vUv * uUvScale;
    vec4 base = texture2D(tMap, uv);
    float seam = smoothstep(${BLEND_START}, ${BLEND_END}, vEdge);
    // fx gates glass/chroma to the outer warp — at the DOM handoff seam stays base.rgb so
    // brightness matches (GLASS at seam onset was causing a sudden lighter band).
    float fx = smoothstep(${BLEND_END}, ${FX_END}, vEdge);
    // Widen the R/B split toward the bent edge so it reads as CRT-style dispersion (strongest where
    // the warp is most extreme) rather than a flat offset across the tail.
    float ca = uChroma * fx * (0.4 + vEdge);
    float r = texture2D(tMap, uv + vec2(0.0, ca)).r;
    float b = texture2D(tMap, uv - vec2(0.0, ca)).b;
    float mask = uFullTile > 0.5 ? 1.0 : seam;
    // Round the full-tile (video) corners to match the DOM's rounded tiles. Signed rounded-box
    // distance in unwarped tile pixels, with a soft 1.5px edge.
    if (uRadius > 0.0) {
      vec2 q = abs(vUv * uTileSize - uTileSize * 0.5) - uTileSize * 0.5 + uRadius;
      float d = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
      mask *= 1.0 - smoothstep(0.0, 1.5, d);
    }
    vec3 rgb = mix(base.rgb, vec3(r, base.g, b), fx);
    gl_FragColor = vec4(rgb * base.a, base.a) * mask;
  }
`;

function clamp01Smooth(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Screen-x fraction where the warp blend has fully ramped — DOM images are clipped to here and
// the GL tail takes over. Solved from the shader curve (the original walks n down from EDGE_ZONE
// in 1e-7 steps until smoothstep(BLEND_START, BLEND_END, edge(n)) >= 0.99); precomputed value.
const CLIP_ZONE = 0.0873699;

type SourceKind = "" | "full" | "lqip";

interface Tile {
  node: HTMLElement;
  kind: "media" | "text";
  media: HTMLVideoElement | HTMLImageElement | null;
  isVideo: boolean;
  texture: Texture;
  program: Program;
  mesh: Mesh;
  ready: boolean;
  uploaded: boolean;
  meta: boolean;
  nw: number;
  nh: number;
  posX: number;
  posY: number;
  radius: number;
  srcKind: SourceKind;
}

let fontsReady: Promise<void> | null = null;
function ensureFonts() {
  if (!fontsReady) {
    fontsReady = (document.fonts?.ready ?? Promise.resolve()).then(() => {});
  }
  return fontsReady;
}

async function queue<T>(
  items: T[],
  limit: number,
  worker: (item: T, slot: number) => Promise<void>,
) {
  if (items.length === 0) return;
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async (_, slot) => {
      for (;;) {
        const i = next++;
        if (i >= items.length) break;
        await worker(items[i], slot);
      }
    }),
  );
}

function isSpace(ch: string) {
  return ch === " " || ch === "\t" || ch === "\n";
}

interface LineBox {
  text: string;
  left: number;
  top: number;
  height: number;
}

function pushLine(
  lines: LineBox[],
  node: Node,
  range: Range,
  text: string,
  start: number,
  end: number,
) {
  let a = start;
  let b = end;
  while (a < b && isSpace(text[a])) a++;
  while (b > a && isSpace(text[b - 1])) b--;
  if (a >= b) return;
  range.setStart(node, a);
  range.setEnd(node, b);
  const rect = range.getBoundingClientRect();
  lines.push({ text: text.slice(a, b), left: rect.left, top: rect.top, height: rect.height });
}

// Split a text node into rendered line boxes by walking character rects.
function lineBoxes(node: Node): LineBox[] {
  const text = node.textContent ?? "";
  const range = document.createRange();
  const lines: LineBox[] = [];
  let lineStart = 0;
  let lastTop: number | null = null;
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (lastTop !== null && rect.top - lastTop > 1) {
      pushLine(lines, node, range, text, lineStart, i);
      lineStart = i;
    }
    lastTop = rect.top;
  }
  pushLine(lines, node, range, text, lineStart, text.length);
  return lines;
}

function paintTextNode(
  ctx: CanvasRenderingContext2D,
  node: Node,
  originX: number,
  originY: number,
) {
  if (!(node.textContent ?? "").trim()) return;
  const parent = node.parentElement;
  if (!parent) return;
  const cs = getComputedStyle(parent);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.fillStyle = cs.color;
  const ls = parseFloat(cs.letterSpacing);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    Number.isFinite(ls) ? `${ls}px` : "0px";
  const fontSize = parseFloat(cs.fontSize) || 16;
  const m = ctx.measureText("Hg");
  const ascent = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent || fontSize * 0.2;
  for (const line of lineBoxes(node)) {
    const baseline = line.top + (line.height - ascent - descent) / 2 + ascent;
    ctx.fillText(line.text, line.left - originX, baseline - originY);
  }
}

// Snapshot a caption block into a canvas by repainting its text nodes (cheaper and crisper than
// a foreignObject rasterise, and immune to its font quirks).
async function snapshotText(
  node: HTMLElement,
  width: number,
  height: number,
  dpr: number,
): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  ctx.textBaseline = "alphabetic";
  const rect = node.getBoundingClientRect();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    paintTextNode(ctx, n, rect.left, rect.top);
  }
  return canvas;
}

function mediaOf(anchor: HTMLElement) {
  const video = anchor.querySelector("video");
  return video || (anchor.querySelector("picture img") ?? anchor.querySelector("img"));
}

function currentImageSource(anchor: HTMLElement) {
  const img = anchor.querySelector<HTMLImageElement>("picture img");
  if (img && img.complete && img.naturalWidth > 0) return { el: img, kind: "full" as const };
  const lqip = anchor.querySelector<HTMLImageElement>("[data-curtain-lqip]");
  if (lqip && lqip.complete && lqip.naturalWidth > 0) return { el: lqip, kind: "lqip" as const };
  return null;
}

function objectPositionFraction(token: string | undefined) {
  if (!token) return 0.5;
  if (token.endsWith("%")) return parseFloat(token) / 100;
  if (token === "left" || token === "top") return 0;
  if (token === "right" || token === "bottom") return 1;
  return 0.5;
}

function objectPosition(el: Element): [number, number] {
  const parts = getComputedStyle(el).objectPosition.trim().split(/\s+/);
  return [objectPositionFraction(parts[0]), objectPositionFraction(parts[1])];
}

function setClip(node: HTMLElement, left: number, right: number) {
  const clip = left > 0 || right > 0 ? `inset(0 ${right}px 0 ${left}px)` : "";
  if (node.style.clipPath !== clip) node.style.clipPath = clip;
}

function setHidden(node: HTMLElement, hidden: boolean) {
  const v = hidden ? "hidden" : "";
  if (node.style.visibility !== v) node.style.visibility = v;
}

function resetRail(track: HTMLElement) {
  for (const node of track.querySelectorAll<HTMLElement>(
    "[data-media-anchor], [data-curtain-text]",
  )) {
    setClip(node, 0, 0);
    setHidden(node, false);
    const video = node.querySelector("video");
    if (video) setHidden(video, false);
  }
}

export function applyRailTransform(section: HTMLElement, track: HTMLElement) {
  const max = section.offsetHeight - window.innerHeight;
  const x = Math.min(Math.max(-section.getBoundingClientRect().top, 0), max);
  track.style.transform = `translate3d(${-x}px, 0, 0)`;
}

export function mountCurtain(section: HTMLElement, track: HTMLElement) {
  let renderer: Renderer;
  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
    });
  } catch {
    return () => {};
  }
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const gl: OGLRenderingContext = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100svh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "30";
  canvas.style.display = "none";
  document.body.appendChild(canvas);

  const scene = new Transform();
  const geometry = new Plane(gl, {
    width: 1,
    height: 1,
    widthSegments: SEGMENTS_X,
    heightSegments: SEGMENTS_Y,
  });
  const tiles = new Map<HTMLElement, Tile>();
  const resolution: [number, number] = [0, 0];

  let snapshotRetimer = 0;
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    resolution[0] = window.innerWidth;
    resolution[1] = window.innerHeight;
    clearTimeout(snapshotRetimer);
    snapshotRetimer = window.setTimeout(() => {
      for (const tile of tiles.values()) {
        if (tile.kind === "text") {
          tile.uploaded = false;
          tile.ready = false;
        }
      }
      snapshotAllText();
    }, 150);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });
  ensureFonts();

  const makeTile = (
    node: HTMLElement,
    kind: "media" | "text",
    media: Tile["media"],
  ): Tile => {
    const texture = new Texture(gl, { generateMipmaps: false });
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      transparent: true,
      cullFace: false,
      depthTest: false,
      uniforms: {
        tMap: { value: texture },
        uResolution: { value: resolution },
        uRect: { value: [0, 0, 0, 0] },
        uBandCenter: { value: 0 },
        uFan: { value: FAN },
        uEdgeZone: { value: EDGE_ZONE },
        uEdgePow: { value: EDGE_POW },
        uLeftGate: { value: 0 },
        uRightGate: { value: 0 },
        uChroma: { value: CHROMA },
        uFullTile: { value: 0 },
        uUvScale: { value: [1, 1] },
        uUvOffset: { value: [0, 0] },
        uTileSize: { value: [0, 0] },
        uRadius: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.frustumCulled = false;
    mesh.setParent(scene);
    return {
      node,
      kind,
      media,
      isVideo: media?.tagName === "VIDEO",
      texture,
      program,
      mesh,
      ready: false,
      uploaded: false,
      meta: false,
      nw: 1,
      nh: 1,
      posX: 0.5,
      posY: 0.5,
      radius: 0,
      srcKind: "",
    };
  };

  const adoptImage = (tile: Tile, image: HTMLCanvasElement | HTMLImageElement) => {
    tile.texture.image = image;
    tile.texture.needsUpdate = true;
    tile.nw = image.width;
    tile.nh = image.height;
    tile.meta = true;
    tile.ready = true;
  };

  const snapshotAllText = () => {
    const nodes = [...track.querySelectorAll<HTMLElement>("[data-curtain-text]")];
    const pending: Tile[] = [];
    for (const node of nodes) {
      let tile = tiles.get(node);
      if (!tile) {
        tile = makeTile(node, "text", null);
        tiles.set(node, tile);
      }
      if (!(tile.ready || tile.uploaded)) pending.push(tile);
    }
    queue(pending, SNAPSHOT_CONCURRENCY, async (tile) => {
      const rect = tile.node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        tile.uploaded = false;
        return;
      }
      tile.uploaded = true;
      try {
        const shot = await snapshotText(tile.node, rect.width, rect.height, dpr);
        if (shot.width === 0 || shot.height === 0) throw new Error("empty snapshot");
        adoptImage(tile, shot);
      } catch {
        tile.uploaded = false;
      }
    });
  };
  snapshotAllText();

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    applyRailTransform(section, track);
    if (document.hidden) {
      if (canvas.style.display !== "none") canvas.style.display = "none";
      resetRail(track);
      return;
    }
    if (canvas.style.display === "none") canvas.style.display = "block";

    const vw = resolution[0];
    const trackRect = track.getBoundingClientRect();
    const bandCenter = trackRect.top + trackRect.height / 2;
    const trackRight = trackRect.left + track.scrollWidth;
    const edgePx = Math.max(EDGE_ZONE * vw, 1);
    const leftGate = clamp01Smooth(-trackRect.left / edgePx);
    const rightGate = clamp01Smooth((trackRight - vw) / edgePx);
    const zonePx = EDGE_ZONE * vw;

    const seen = new Set<HTMLElement>();
    const targets: Array<[HTMLElement, "media" | "text"]> = [];
    for (const node of track.querySelectorAll<HTMLElement>("[data-media-anchor]")) {
      targets.push([node, "media"]);
    }
    for (const node of track.querySelectorAll<HTMLElement>("[data-curtain-text]")) {
      targets.push([node, "text"]);
    }

    for (const [node, kind] of targets) {
      const media = kind === "media" ? (mediaOf(node) as Tile["media"]) : null;
      if (kind === "media" && !media) continue;
      seen.add(node);
      let tile = tiles.get(node);
      if (!tile) {
        tile = makeTile(node, kind, media);
        tiles.set(node, tile);
      }

      if (kind === "media" && tile.isVideo) {
        if (media) tile.media = media;
        const video = tile.media as HTMLVideoElement | null;
        if (video && !tile.ready && video.readyState >= 2 && video.videoWidth > 0) {
          tile.ready = true;
        }
        if (tile.ready && !tile.meta && video) {
          const [w, h] = [video.videoWidth, video.videoHeight];
          if (w > 0 && h > 0) {
            tile.nw = w;
            tile.nh = h;
            [tile.posX, tile.posY] = objectPosition(video);
            tile.radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
            tile.meta = true;
          }
        }
      } else if (kind === "media") {
        const source = currentImageSource(node);
        if (source && tile.srcKind !== source.kind) {
          tile.media = source.el;
          tile.texture.image = source.el;
          tile.texture.needsUpdate = true;
          tile.srcKind = source.kind;
          tile.nw = source.el.naturalWidth;
          tile.nh = source.el.naturalHeight;
          [tile.posX, tile.posY] = objectPosition(source.el);
          tile.ready = true;
        }
      } else if (!tile.uploaded) {
        // text tile not yet snapshotted; the queue will pick it up on the next sweep
      }

      const rect = node.getBoundingClientRect();
      const onScreen =
        rect.right > 0 && rect.left < vw && rect.bottom > 0 && rect.top < resolution[1];
      const nearLeft = rect.left < zonePx && leftGate > 0.001;
      const nearRight = rect.right > vw - zonePx && rightGate > 0.001;
      const nearEdge = nearLeft || nearRight;
      const visible = tile.ready && onScreen && (tile.isVideo || nearEdge);
      const fullTile = visible && (tile.isVideo || tile.kind === "text");

      tile.mesh.visible = visible;
      if (tile.isVideo && tile.media) setHidden(tile.media, visible);
      if (tile.kind === "text") setHidden(node, visible);

      if (visible && !fullTile) {
        // Image tile: clip the DOM copy where the GL tail takes over so the two halves seam.
        const clipPx = CLIP_ZONE * vw;
        const clipLeft = nearLeft ? Math.max(0, (clipPx - rect.left) * leftGate) : 0;
        const clipRight = nearRight ? Math.max(0, (rect.right - (vw - clipPx)) * rightGate) : 0;
        setClip(node, clipLeft, clipRight);
      } else {
        setClip(node, 0, 0);
      }
      if (!visible) continue;

      if (tile.isVideo && tile.media) {
        tile.texture.image = tile.media as HTMLVideoElement;
        tile.texture.needsUpdate = true;
        tile.uploaded = true;
      }

      const u = tile.program.uniforms;
      const r = u.uRect.value as number[];
      r[0] = snap(rect.left);
      r[1] = snap(rect.top);
      r[2] = snap(rect.width);
      r[3] = snap(rect.height);
      u.uBandCenter.value = bandCenter;
      u.uLeftGate.value = leftGate;
      u.uRightGate.value = rightGate;
      u.uFullTile.value = fullTile ? 1 : 0;
      const size = u.uTileSize.value as number[];
      size[0] = rect.width;
      size[1] = rect.height;
      u.uRadius.value = tile.isVideo ? tile.radius : 0;
      const scale = u.uUvScale.value as number[];
      const offset = u.uUvOffset.value as number[];
      if (tile.kind === "text") {
        scale[0] = 1;
        scale[1] = 1;
        offset[0] = 0;
        offset[1] = 0;
      } else {
        // object-fit: cover crop in uv space
        const tileAspect = rect.width / rect.height;
        const mediaAspect = tile.nw / tile.nh;
        let sx = 1;
        let sy = 1;
        if (mediaAspect > tileAspect) sx = tileAspect / mediaAspect;
        else sy = mediaAspect / tileAspect;
        scale[0] = sx;
        scale[1] = sy;
        offset[0] = (1 - sx) * tile.posX;
        offset[1] = (1 - sy) * tile.posY;
      }
    }

    for (const [node, tile] of tiles) {
      if (seen.has(node)) continue;
      if (tile.isVideo && tile.media) setHidden(tile.media, false);
      if (tile.kind === "text") setHidden(node, false);
      setClip(node, 0, 0);
      tile.mesh.setParent(null);
      tiles.delete(node);
    }

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(snapshotRetimer);
    window.removeEventListener("resize", resize);
    for (const tile of tiles.values()) {
      if (tile.isVideo && tile.media) setHidden(tile.media, false);
      if (tile.kind === "text") setHidden(tile.node, false);
    }
    resetRail(track);
    canvas.remove();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  };
}
