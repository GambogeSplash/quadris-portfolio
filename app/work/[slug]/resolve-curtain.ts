/*
 * "Resolve" boundary, the site's own signature physics. Media at the top and
 * bottom viewport edges renders as a coarse mosaic and sharpens into focus as
 * it travels inward, echoing the pixelated loading language already in the
 * site. Scroll velocity coarsens the boundary, so the page reacts to how hard
 * it is being pushed. Zero geometric distortion: the GL tile overlays its DOM
 * element exactly, so where the effect is zero the two are indistinguishable.
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
const EDGE_ZONE = 0.14; // fraction of viewport height where media resolves
const MAX_CELL = 26; // mosaic cell size in css px at the very edge, at rest
const VELOCITY_CELL_BOOST = 1.2; // up to +120% cell size at full scroll speed
const VELOCITY_NORM = 40; // px/frame of scroll that counts as full speed

const VERTEX = /* glsl */ `
  precision highp float;
  attribute vec2 uv;
  attribute vec3 position;
  uniform vec2 uResolution;
  uniform vec4 uRect; // left, top, width, height (css px, y-down)
  varying vec2 vUv;
  varying float vScreenY;

  void main() {
    vUv = uv;
    vec2 screen = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;
    vScreenY = screen.y;
    float nx = screen.x / uResolution.x * 2.0 - 1.0;
    float ny = 1.0 - screen.y / uResolution.y * 2.0;
    gl_Position = vec4(nx, ny, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uResolution;
  uniform vec4 uRect;
  uniform float uZonePx;     // resolve band height in css px
  uniform float uTopGate;    // 0 at the very top of the document (page opens sharp)
  uniform float uBottomGate; // 0 at the very end (page closes sharp)
  uniform float uMaxCell;    // mosaic cell at the very edge, css px
  uniform float uVelocity;   // 0..1 smoothed scroll speed
  varying vec2 vUv;
  varying float vScreenY;

  void main() {
    float distTop = vScreenY;
    float distBottom = uResolution.y - vScreenY;
    float edgeTop = (1.0 - clamp(distTop / uZonePx, 0.0, 1.0)) * uTopGate;
    float edgeBottom = (1.0 - clamp(distBottom / uZonePx, 0.0, 1.0)) * uBottomGate;
    float edge = max(edgeTop, edgeBottom);
    edge = edge * edge; // ease in so the band's inner border is invisible

    float cell = mix(1.0, uMaxCell * (1.0 + ${VELOCITY_CELL_BOOST} * uVelocity), edge);
    vec2 tilePx = vUv * uRect.zw;
    vec2 quantized = (floor(tilePx / cell) + 0.5) * cell;
    vec2 uvq = clamp(quantized / uRect.zw, 0.0, 1.0);
    gl_FragColor = texture2D(tMap, mix(vUv, uvq, step(1.5, cell)));
  }
`;

function smooth01(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

interface Tile {
  node: HTMLElement;
  texture: Texture;
  program: Program;
  mesh: Mesh;
  ready: boolean;
}

// Render a placeholder slot (gray box + label) into a canvas so it resolves
// like any other tile.
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

export function mountResolveCurtain(column: HTMLElement) {
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
  const geometry = new Plane(gl, { width: 1, height: 1 });
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
        uZonePx: { value: 0 },
        uTopGate: { value: 0 },
        uBottomGate: { value: 0 },
        uMaxCell: { value: MAX_CELL },
        uVelocity: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.frustumCulled = false;
    mesh.setParent(scene);
    return { node, texture, program, mesh, ready: false };
  };

  let lastScroll = window.scrollY;
  let velocity = 0;

  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      if (canvas.style.display !== "none") canvas.style.display = "none";
      return;
    }
    if (canvas.style.display === "none") canvas.style.display = "block";

    const vh = resolution[1];
    const doc = document.documentElement;
    const zonePx = EDGE_ZONE * vh;
    const topGate = smooth01(window.scrollY / zonePx);
    const bottomGate = smooth01((doc.scrollHeight - window.scrollY - vh) / zonePx);

    // Smoothed scroll speed: spikes on flicks, decays when the page rests.
    const dy = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    velocity += (Math.min(dy / VELOCITY_NORM, 1) - velocity) * 0.12;

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
      const nearTop = rect.top < zonePx && topGate > 0.001;
      const nearBottom = rect.bottom > vh - zonePx && bottomGate > 0.001;
      const onScreen = rect.bottom > 0 && rect.top < vh;
      const visible = tile.ready && onScreen && (nearTop || nearBottom);
      tile.mesh.visible = visible;
      if (!visible) continue;

      const u = tile.program.uniforms;
      const r = u.uRect.value as number[];
      r[0] = snap(rect.left);
      r[1] = snap(rect.top);
      r[2] = snap(rect.width);
      r[3] = snap(rect.height);
      u.uZonePx.value = zonePx;
      u.uTopGate.value = topGate;
      u.uBottomGate.value = bottomGate;
      u.uVelocity.value = velocity;
    }

    for (const [node, tile] of tiles) {
      if (seen.has(node)) continue;
      tile.mesh.setParent(null);
      tiles.delete(node);
    }

    renderer.render({ scene });
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    canvas.remove();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  };
}
