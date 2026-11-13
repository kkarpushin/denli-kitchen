// Single-photo planar geometry for a DEMO, not a manufacturing measurement.
// Assumes a rectangular, flat wall, a flat rectangular reference on that wall,
// correctly ordered corners, and an undistorted pinhole image. These assumptions
// cannot be verified from the four points. Reference orientation is USER supplied.

export const REFS = {
  a4: { name: 'Аркуш А4', w: 210, h: 297 },
  card: { name: 'Банківська картка', w: 85.6, h: 53.98 },
};

const finitePoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const positive = (v) => Number.isFinite(v) && v > 0;
const dimsOK = (d) => d && positive(d.w) && positive(d.h);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);

function validQuad(q) {
  if (!Array.isArray(q) || q.length !== 4 || !q.every(finitePoint)) return false;
  const span = Math.max(...q.flatMap((p, i) => q.slice(i + 1).map((v) => dist(p, v))));
  if (!positive(span)) return false;
  const turns = q.map((p, i) => cross(p, q[(i + 1) % 4], q[(i + 2) % 4]) / span ** 2);
  return turns.every((v) => v > 1e-7) || turns.every((v) => v < -1e-7);
}

// Normalize coordinates before elimination to avoid pixel-offset/scale conditioning.
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!Number.isFinite(M[p][c]) || Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const pivot = M[c][c];
    for (let k = c; k <= n; k++) M[c][k] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const result = M.map((row) => row[n]);
  return result.every(Number.isFinite) ? result : null;
}
const mul3 = (a, b) => Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
});
function normalize(q) {
  const x = q.reduce((s, p) => s + p[0], 0) / 4, y = q.reduce((s, p) => s + p[1], 0) / 4;
  const k = Math.SQRT2 / (q.reduce((s, p) => s + Math.hypot(p[0] - x, p[1] - y), 0) / 4);
  return { points: q.map((p) => [(p[0] - x) * k, (p[1] - y) * k]),
    T: [k, 0, -x * k, 0, k, -y * k, 0, 0, 1], inverse: [1 / k, 0, x, 0, 1 / k, y, 0, 0, 1] };
}

export function homography(src, dst) {
  if (!validQuad(src) || !validQuad(dst)) return null;
  const a = normalize(src), d = normalize(dst), A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = a.points[i], [u, v] = d.points[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  if (!h) return null;
  const H = mul3(d.inverse, mul3([...h, 1], a.T));
  const k = Math.max(...H.map(Math.abs));
  if (!positive(k) || !H.every(Number.isFinite)) return null;
  const out = H.map((v) => v / k);
  const den = src.map(([x, y]) => out[6] * x + out[7] * y + out[8]);
  if (!(den.every((v) => v > 0) || den.every((v) => v < 0))) return null;
  return src.every((p) => applyH(out, p)) ? out : null;
}

export function applyH(H, p) {
  if (!Array.isArray(H) || H.length !== 9 || !H.every(Number.isFinite) || !finitePoint(p)) return null;
  const [x, y] = p, w = H[6] * x + H[7] * y + H[8];
  const scale = Math.abs(H[6] * x) + Math.abs(H[7] * y) + Math.abs(H[8]);
  if (!positive(scale) || Math.abs(w) <= scale * 1e-12) return null;
  const q = [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  return q.every(Number.isFinite) ? q : null;
}

// wall: [ceilL, ceilR, floorR, floorL]. Reference corners follow its perimeter.
// refDims.w is edge 0->1, refDims.h is edge 1->2, in mm. Swap dims for landscape
// when points are marked top-left first. Pixel aspect cannot determine orientation.
export function measureWall(wall, ref, refDims) {
  if (!validQuad(ref) || !dimsOK(refDims)) return null;
  const H = homography(wall, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  if (!H) return null;
  const q = ref.map((p) => applyH(H, p));
  if (q.some((p) => !p || p.some((v) => v < -1e-8 || v > 1 + 1e-8)) || !validQuad(q)) return null;
  const u = [0, 1].map((i) => ((q[1][i] - q[0][i]) + (q[2][i] - q[3][i])) / 2);
  const v = [0, 1].map((i) => ((q[3][i] - q[0][i]) + (q[2][i] - q[1][i])) / 2);
  const un = Math.hypot(...u), vn = Math.hypot(...v);
  if (Math.min(un, vn) < 1e-6) return null;
  // On the rectified wall, opposite reference edges must agree (within annotation
  // tolerance). This rejects many bad corner selections, not physical assumption errors.
  const closure = Math.hypot(...[0, 1].map((i) => q[0][i] + q[2][i] - q[1][i] - q[3][i]));
  if (closure / Math.min(un, vn) > 0.25) return null;
  // Fit the diagonal wall metric diag(width^2,height^2). The orthogonality row
  // makes this identifiable even with a reference rotated 45 degrees on the wall.
  const rows = [[u[0] ** 2, u[1] ** 2], [v[0] ** 2, v[1] ** 2],
    [Math.SQRT2 * u[0] * v[0], Math.SQRT2 * u[1] * v[1]]];
  const rhs = [refDims.w ** 2, refDims.h ** 2, 0];
  const sx = Math.hypot(...rows.map((r) => r[0])), sy = Math.hypot(...rows.map((r) => r[1]));
  if (!positive(sx) || !positive(sy)) return null;
  const ab = rows.reduce((s, r) => s + (r[0] / sx) * (r[1] / sy), 0);
  const det = 1 - ab ** 2;
  if (det < 1e-10) return null;
  const ax = rows.reduce((s, r, i) => s + (r[0] / sx) * rhs[i], 0);
  const ay = rows.reduce((s, r, i) => s + (r[1] / sy) * rhs[i], 0);
  const w2 = (ax - ab * ay) / (det * sx), h2 = (ay - ab * ax) / (det * sy);
  if (!positive(w2) || !positive(h2)) return null;
  const residual = Math.hypot(...rows.map((r, i) => r[0] * w2 + r[1] * h2 - rhs[i])) / Math.hypot(...rhs);
  if (!Number.isFinite(residual) || residual > 0.25) return null;
  return { width: Math.sqrt(w2), height: Math.sqrt(h2), H, residual, demo: true,
    method: 'rectangular-wall-and-coplanar-reference' };
}

export function alongWall(H, widthMm, p) {
  if (!positive(widthMm)) return null;
  const q = applyH(H, p);
  return q && Number.isFinite(q[0] * widthMm) ? q[0] * widthMm : null;
}

function gauss(random) {
  // Avoid unbounded rejection loops with a supplied deterministic RNG.
  const a = random(), b = random();
  if (!(a >= 0 && a < 1 && b >= 0 && b < 1)) throw new RangeError('random must return [0,1)');
  return Math.sqrt(-2 * Math.log(Math.max(a, Number.EPSILON))) * Math.cos(2 * Math.PI * b);
}

// Relative standard deviation (%) under ASSUMED independent Gaussian point jitter.
// This is sensitivity to marking, not an accuracy interval, confidence, or bound.
// It excludes lens distortion, non-flat surfaces, wrong reference size/orientation,
// reference depth, image cropping assumptions, and systematic annotation errors.
export function measureError(wall, ref, refDims, imgW, { refSigma = 0.6, wallSigma = 2.5, samples = 300, random = Math.random } = {}) {
  const result = { width: null, height: null, valid: false, kind: 'point-placement-sensitivity',
    samples, accepted: 0, rejectedFraction: 1, assumptions: 'independent-gaussian-point-jitter',
    accuracyVerified: false };
  if (!positive(imgW) || !Number.isFinite(refSigma) || refSigma < 0 || !Number.isFinite(wallSigma) || wallSigma < 0
      || !Number.isInteger(samples) || samples < 50 || samples > 2000 || typeof random !== 'function'
      || !measureWall(wall, ref, refDims)) return result;
  const s = imgW / 1200, rs = refSigma * s, ws = wallSigma * s;
  result.refSigmaPx = rs; result.wallSigmaPx = ws;
  const W = [], Hh = [];
  for (let i = 0; i < samples; i++) {
    const jitter = (pts, sigma) => pts.map(([x, y]) => [x + gauss(random) * sigma, y + gauss(random) * sigma]);
    const m = measureWall(jitter(wall, ws), jitter(ref, rs), refDims);
    if (m) { W.push(m.width); Hh.push(m.height); }
  }
  result.accepted = W.length; result.rejectedFraction = 1 - W.length / samples;
  // Many rejected samples indicate instability. Do not silently report a reassuring
  // spread from just the surviving subset.
  if (result.rejectedFraction > 0.2) return result;
  const rel = (a) => {
    const mu = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / (a.length - 1));
    return (sd / mu) * 100;
  };
  result.width = rel(W); result.height = rel(Hh); result.valid = true;
  return result;
}

// ---------- reference sheet detection ----------
// Finds a bright, low-saturation, near-rectangular blob with the right aspect,
// then fits straight lines to its 4 edges (ignores tape on the corners).
export function detectReference(img, refDims = REFS.a4) {
  if (!img || !dimsOK(refDims) || typeof document === 'undefined') return null;
  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height;
  if (!positive(W0) || !positive(H0)) return null;
  const sc = 400 / Math.max(W0, H0);
  const w = Math.max(1, Math.round(W0 * sc)), h = Math.max(1, Math.round(H0 * sc));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const V = new Float32Array(w * h), S = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    V[i] = mx; S[i] = (mx - mn) / (mx + 1e-6);
  }
  // box blur of V (radius 12) via integral image
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += V[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; }
  }
  const R = 12;
  const blur = (x, y) => {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(w, x + R + 1), y1 = Math.min(h, y + R + 1);
    const s = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
    return s / ((x1 - x0) * (y1 - y0));
  };
  const cand = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (V[i] > 140 && S[i] < 0.14 && V[i] > blur(x, y) + 14) cand[i] = 1;
  }
  const lab = new Int32Array(w * h);
  const targetAr = Math.max(refDims.w, refDims.h) / Math.min(refDims.w, refDims.h);
  let best = null, n = 0;
  const stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!cand[s0] || lab[s0]) continue;
    n++; lab[s0] = n; stack.push(s0);
    let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) if (j >= 0 && cand[j] && !lab[j]) { lab[j] = n; stack.push(j); }
    }
    if (area < w * h * 0.0003 || area > w * h * 0.04) continue;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const fill = area / (bw * bh), ar = Math.max(bw, bh) / Math.min(bw, bh);
    if (fill < 0.6) continue;
    const score = fill * Math.exp(-Math.abs(ar - targetAr) * 3);
    if (!best || score > best.score) best = { score, x0, y0, x1, y1 };
  }
  if (!best || best.score < 0.35) return null;
  return refineCorners(img, W0, H0, best, sc);
}

function refineCorners(img, W0, H0, b, sc) {
  const X0 = Math.max(0, Math.floor((b.x0 - 3) / sc)), Y0 = Math.max(0, Math.floor((b.y0 - 3) / sc));
  const X1 = Math.min(W0, Math.ceil((b.x1 + 4) / sc)), Y1 = Math.min(H0, Math.ceil((b.y1 + 4) / sc));
  const w = X1 - X0, h = Y1 - Y0;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, X0, Y0, w, h, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const V = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) V[i] = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  const sorted = Float32Array.from(V).sort();
  const thr = (sorted[Math.floor(sorted.length * 0.95)] + sorted[Math.floor(sorted.length * 0.05)]) / 2;
  let rx0 = w, rx1 = 0, ry0 = h, ry1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (V[y * w + x] > thr) {
    if (x < rx0) rx0 = x; if (x > rx1) rx1 = x; if (y < ry0) ry0 = y; if (y > ry1) ry1 = y;
  }
  const cross = (get, len, rev) => {
    let i = -1;
    if (!rev) { for (let k = 0; k < len; k++) if (get(k) > thr) { i = k; break; } }
    else { for (let k = len - 1; k >= 0; k--) if (get(k) > thr) { i = k; break; } }
    if (i < 0) return null;
    const j = rev ? i + 1 : i - 1;
    if (j < 0 || j >= len) return i;
    return j + ((thr - get(j)) / (get(i) - get(j) + 1e-9)) * (i - j);
  };
  const L = [], Rr = [], T = [], B = [];
  for (let y = Math.floor(ry0 + (ry1 - ry0) * 0.2); y < ry1 - (ry1 - ry0) * 0.2; y++) {
    const l = cross((k) => V[y * w + k], w, false), r = cross((k) => V[y * w + k], w, true);
    if (l != null) { L.push([y, l]); Rr.push([y, r]); }
  }
  for (let x = Math.floor(rx0 + (rx1 - rx0) * 0.2); x < rx1 - (rx1 - rx0) * 0.2; x++) {
    const t = cross((k) => V[k * w + x], h, false), bb = cross((k) => V[k * w + x], h, true);
    if (t != null) { T.push([x, t]); B.push([x, bb]); }
  }
  if (L.length < 4 || T.length < 4) return null;
  const fit = (pts) => {
    let P = pts;
    let k = 0, c = 0;
    for (let it = 0; it < 3; it++) {
      const n = P.length;
      const st = P.reduce((a, p) => a + p[0], 0), sv = P.reduce((a, p) => a + p[1], 0);
      const stt = P.reduce((a, p) => a + p[0] * p[0], 0), stv = P.reduce((a, p) => a + p[0] * p[1], 0);
      const den = n * stt - st * st;
      k = den ? (n * stv - st * sv) / den : 0; c = (sv - k * st) / n;
      const res = P.map((p) => Math.abs(p[1] - (k * p[0] + c)));
      const med = [...res].sort((a, b) => a - b)[Math.floor(res.length / 2)];
      const lim = Math.max(1, med * 2.5);
      const keep = P.filter((_, i) => res[i] < lim);
      if (keep.length < 4) break;
      P = keep;
    }
    return [k, c];
  };
  const [kl, bl] = fit(L), [kr, br] = fit(Rr), [kt, bt] = fit(T), [kb, bb2] = fit(B);
  const inter = (kx, bx, ky, by) => { const y = (ky * bx + by) / (1 - ky * kx); return [kx * y + bx + X0, y + Y0]; };
  const corners = [inter(kl, bl, kt, bt), inter(kr, br, kt, bt), inter(kr, br, kb, bb2), inter(kl, bl, kb, bb2)];
  return validQuad(corners) && corners.every(([x, y]) => x >= 0 && x <= W0 && y >= 0 && y <= H0) ? corners : null;
}
