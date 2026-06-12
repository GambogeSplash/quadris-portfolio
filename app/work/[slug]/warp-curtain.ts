/*
 * Vertical edge-warp for case study pages: the home rail's lens physics
 * rotated 90 degrees. As media crosses the top or bottom viewport edge it
 * flares horizontally away from the column centerline and picks up the same
 * CRT-style dispersion, gated at the document's start and end so the page
 * opens and closes flat. Same constants as the rail so the two pages read as
 * one physical system.
 *
 * The DOM element is clipped where the warp band begins and the GL tail takes
 * over, so the flat and warped halves seam invisibly.
 *
 * Alternative signature: ./resolve-curtain.ts (mosaic resolution boundary).
 * Swap the import in nav.tsx to switch.
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
const SEGMENTS_X = 14;
const SEGMENTS_Y = 48;
const EDGE_ZONE = 0.1; // fraction of viewport height where the warp lives
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
  uniform vec4 uRect;        // left, top, width, height (css px, y-down)
  uniform float uBandCenter; // column centerline x; the page warps as one sheet
  uniform float uFan;
  uniform float uEdgeZone;
  uniform float uEdgePow;
  uniform float uTopGate;    // 0 at the very top of the document
  uniform float uBottomGate; // 0 at the very end of the document
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vUv = uv;
    vec2 screen = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;

    float sy = screen.y / uResolution.y;
    float dist = min(sy, 1.0 - sy);
    float edge = pow(smoothstep(uEdgeZone, 0.0, dist), uEdgePow);
    edge *= mix(uTopGate, uBottomGate, step(0.5, sy));
    float blend = smoothstep(${BLEND_START}, ${BLEND_END}, edge);
    float x = uBandCenter + (screen.x - uBandCenter) * (1.0 + uFan * edge * blend);

    float nx = x / uResolution.x * 2.0 - 1.0;
    float ny = 1.0 - sy * 2.0;
    gl_Position = vec4(nx, ny, 0.0, 1.0);
    vEdge = edge;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uChroma;
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vec4 base = texture2D(tMap, vUv);
    float seam = smoothstep(${BLEND_START}, ${BLEND_END}, vEdge);
    float fx = smoothstep(${BLEND_END}, ${FX_END}, vEdge);
    float ca = uChroma * fx * (0.4 + vEdge);
    float r = texture2D(tMap, vUv + vec2(ca, 0.0)).r;
    float b = texture2D(tMap, vUv - vec2(ca, 0.0)).b;
    vec3 rgb = mix(base.rgb, vec3(r, base.g, b), fx);
    gl_FragColor = vec4(rgb * base.a, base.a) * seam;
  }
`;

function smooth01(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// Viewport fraction where the warp blend has fully ramped; the DOM clip hands
// off to the GL tail here. Derived from the same EDGE_ZONE/EDGE_POW curve.
const CLIP_ZONE = 0.0873699;

interface Tile {
  node: HTMLElement;
  texture: Texture;
  program: Program;
  mesh: Mesh;
  ready: boolean;
}

// Render a placeholder slot (gray box + label) into a canvas so it warps like
// any other tile.
function snapshotPlaceholder(node: HTMLElement, dpr: number): HTMLCanvasElement {
  const rect = node.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  const cs = getComputedStyle(node);
  ctx.fillStyle = cs.backgroundColor || "#f2f2f2";
  ctx.fillRect(0, 0, rect.width, rect.height);
  const span = node.querySelector("span");
  if (span) {
    const ss = getComputedStyle(span);
    ctx.font = `${ss.fontStyle} ${ss.fontWeight} ${ss.fontSize} ${ss.fontFamily}`;
    ctx.fillStyle = ss.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxW = Math.min(288, rect.width - 32);
    const words = (span.textContent ?? "").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (ctx.measureText(probe).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = probe;
      }
    }
    if (line) lines.push(line);
    const lh = (parseFloat(ss.fontSize) || 13) * 1.3;
    const startY = rect.height / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, rect.width / 2, startY + i * lh));
  }
  return canvas;
}

export function mountWarpCurtain(column: HTMLElement) {
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
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100svh;pointer-events:none;z-index:30;display:none";
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

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    resolution[0] = window.innerWidth;
    resolution[1] = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const makeTile = (node: HTMLElement): Tile => {
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
        uTopGate: { value: 0 },
        uBottomGate: { value: 0 },
        uChroma: { value: CHROMA },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.frustumCulled = false;
    mesh.setParent(scene);
    return { node, texture, program, mesh, ready: false };
  };

  const setClip = (node: HTMLElement, top: number, bottom: number) => {
    const clip = top > 0 || bottom > 0 ? `inset(${top}px 0 ${bottom}px 0)` : "";
    if (node.style.clipPath !== clip) node.style.clipPath = clip;
  };

  const reset = () => {
    for (const tile of tiles.values()) setClip(tile.node, 0, 0);
  };

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      if (canvas.style.display !== "none") canvas.style.display = "none";
      reset();
      return;
    }
    if (canvas.style.display === "none") canvas.style.display = "block";

    const vh = resolution[1];
    const colRect = column.getBoundingClientRect();
    const bandCenter = colRect.left + colRect.width / 2;
    const doc = document.documentElement;
    const edgePx = Math.max(EDGE_ZONE * vh, 1);
    const topGate = smooth01(window.scrollY / edgePx);
    const bottomGate = smooth01((doc.scrollHeight - window.scrollY - vh) / edgePx);
    const zonePx = EDGE_ZONE * vh;
    const clipPx = CLIP_ZONE * vh;

    const targets = column.querySelectorAll<HTMLElement>(
      ".cs-media img, .cs-media-row img, .cs-placeholder",
    );
    const seen = new Set<HTMLElement>();
    for (const node of targets) {
      seen.add(node);
      let tile = tiles.get(node);
      if (!tile) {
        tile = makeTile(node);
        tiles.set(node, tile);
      }
      if (!tile.ready) {
        if (node instanceof HTMLImageElement) {
          if (node.complete && node.naturalWidth > 0) {
            tile.texture.image = node;
            tile.texture.needsUpdate = true;
            tile.ready = true;
          }
        } else {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            tile.texture.image = snapshotPlaceholder(node, dpr);
            tile.texture.needsUpdate = true;
            tile.ready = true;
          }
        }
      }

      const rect = node.getBoundingClientRect();
      const onScreen = rect.bottom > 0 && rect.top < vh;
      const nearTop = rect.top < zonePx && topGate > 0.001;
      const nearBottom = rect.bottom > vh - zonePx && bottomGate > 0.001;
      const visible = tile.ready && onScreen && (nearTop || nearBottom);
      tile.mesh.visible = visible;

      if (visible) {
        const clipTop = nearTop ? Math.max(0, (clipPx - rect.top) * topGate) : 0;
        const clipBottom = nearBottom
          ? Math.max(0, (rect.bottom - (vh - clipPx)) * bottomGate)
          : 0;
        setClip(node, clipTop, clipBottom);
      } else {
        setClip(node, 0, 0);
      }
      if (!visible) continue;

      const u = tile.program.uniforms;
      const r = u.uRect.value as number[];
      r[0] = snap(rect.left);
      r[1] = snap(rect.top);
      r[2] = snap(rect.width);
      r[3] = snap(rect.height);
      u.uBandCenter.value = bandCenter;
      u.uTopGate.value = topGate;
      u.uBottomGate.value = bottomGate;
    }

    for (const [node, tile] of tiles) {
      if (seen.has(node)) continue;
      setClip(node, 0, 0);
      tile.mesh.setParent(null);
      tiles.delete(node);
    }

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    reset();
    canvas.remove();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  };
}
