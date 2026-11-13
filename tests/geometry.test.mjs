import test from 'node:test';
import assert from 'node:assert/strict';
import { REFS, homography, applyH, measureWall, measureError, alongWall } from '../measure.mjs';
import { DEMO_CATALOG, STYLES, OPT, PRICE, fill, plan, cutList, price } from '../engine.mjs';
import { readFileSync } from 'node:fs';

const close = (a, b, tol = 1e-7) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);
function rng(seed = 42) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }
const rectangle = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
function fixture({ width = 4000, height = 2700, dims = REFS.a4, angle = 0, transform = [0.24, 0.03, 80, 0.01, 0.29, 60, 0.00004, -0.00003, 1] } = {}) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const refWorld = rectangle(dims.w, dims.h).map(([x, y]) => [1100 + x * c - y * s, 1000 + x * s + y * c]);
  return { wall: rectangle(width, height).map((p) => applyH(transform, p)), ref: refWorld.map((p) => applyH(transform, p)), dims, width, height, transform };
}
const input = (layout = 'straight', length = 4200) => ({ layout, island: false,
  walls: Array.from({ length: { straight: 1, L: 2, U: 3 }[layout] }, () => ({ length, height: 2700, waterAt: 1200 })),
  app: { fridge: 'builtin', oven: 'column', dw: 600, micro: false }, opt: { ...STYLES.minimal.d }, style: 'minimal' });

// These are exact synthetic projective geometry checks, not real photo accuracy validation.
test('known rectangular scene survives perspective, rotation and explicit orientation', () => {
  for (const dims of [REFS.a4, { w: 297, h: 210 }, REFS.card]) {
    for (const angle of [0, 0.1, Math.PI / 4, Math.PI / 2, 2.3]) {
      const f = fixture({ dims, angle });
      const m = measureWall(f.wall, f.ref, dims);
      assert.ok(m); close(m.width, f.width); close(m.height, f.height);
      close(alongWall(m.H, m.width, applyH(f.transform, [1200, 1400])), 1200);
    }
  }
});

test('reference orientation must not be inferred from foreshortened image aspect', () => {
  const f = fixture({ dims: { w: 297, h: 210 }, transform: [0.08, 0, 0, 0, 0.4, 0, 0, 0, 1] });
  assert.ok(Math.hypot(f.ref[1][0] - f.ref[0][0], f.ref[1][1] - f.ref[0][1]) < Math.hypot(f.ref[3][0] - f.ref[0][0], f.ref[3][1] - f.ref[0][1]));
  const m = measureWall(f.wall, f.ref, f.dims);
  close(m.width, 4000); close(m.height, 2700);
});

test('image translation and resolution do not change physical dimensions', () => {
  const random = rng(17);
  for (let i = 0; i < 150; i++) {
    const f = fixture({ width: 3000 + random() * 3000, height: 2200 + random() * 1200, angle: random() * Math.PI * 2 });
    const scale = 0.1 + random() * 100, tx = (random() - 0.5) * 1e6, ty = (random() - 0.5) * 1e6;
    const tr = ([x, y]) => [x * scale + tx, y * scale + ty];
    const m = measureWall(f.wall.map(tr), f.ref.map(tr), f.dims);
    assert.ok(m); close(m.width, f.width, 2e-6); close(m.height, f.height, 2e-6);
  }
});

test('invalid, crossed, nonconvex and projectively singular inputs fail closed', () => {
  const f = fixture();
  for (const bad of [null, [], [[0, 0], [1, 1]], rectangle(0, 10), [[0, 0], [1, 1], [0, 1], [1, 0]], [[0, 0], [10, 0], [1, 1], [0, 10]], [[0, 0], [NaN, 0], [1, 1], [0, 1]]]) {
    assert.equal(measureWall(bad, f.ref, f.dims), null);
    assert.equal(measureWall(f.wall, bad, f.dims), null);
  }
  for (const dims of [null, {}, { w: 0, h: 1 }, { w: Infinity, h: 1 }, { w: '210', h: 297 }]) assert.equal(measureWall(f.wall, f.ref, dims), null);
  assert.equal(applyH([1, 0, 0, 0, 1, 0, 1, 0, 0], [0, 1]), null);
  assert.equal(applyH(null, [0, 0]), null);
  assert.equal(alongWall(null, 4000, [0, 0]), null);
  assert.equal(alongWall([1, 0, 0, 0, 1, 0, 0, 0, 1], Infinity, [0, 0]), null);
  assert.equal(homography(rectangle(1, 1), rectangle(0, 1)), null);
});

test('reference outside wall or with incompatible opposite edges is rejected', () => {
  const f = fixture();
  const outside = rectangle(210, 297).map(([x, y]) => applyH(f.transform, [-600 + x, 1000 + y]));
  assert.equal(measureWall(f.wall, outside, f.dims), null);
  const bad = rectangle(210, 297); bad[2] = [500, 297];
  assert.equal(measureWall(f.wall, bad.map(([x, y]) => applyH(f.transform, [1000 + x, 1000 + y])), f.dims), null);
});

test('jitter spread is reproducible sensitivity, never an accuracy promise', () => {
  const f = fixture();
  const args = [f.wall, f.ref, f.dims, 1200];
  const z = measureError(...args, { wallSigma: 0, refSigma: 0, random: rng() });
  assert.ok(z.valid); assert.equal(z.accuracyVerified, false); close(z.width, 0); close(z.height, 0);
  const a = measureError(...args, { random: rng() }), b = measureError(...args, { random: rng() });
  assert.deepEqual(a, b); assert.ok(a.valid && a.width > 0 && a.height > 0);
  assert.equal(a.kind, 'point-placement-sensitivity');
  const scale = (q) => q.map(([x, y]) => [x * 2, y * 2]);
  const doubled = measureError(scale(f.wall), scale(f.ref), f.dims, 2400, { random: rng() });
  close(a.width, doubled.width); close(a.height, doubled.height);
  const unstable = measureError(...args, { refSigma: 100, random: rng() });
  assert.equal(unstable.valid, false); assert.equal(unstable.width, null); assert.ok(unstable.rejectedFraction > 0.2);
  assert.equal(measureError(...args, { refSigma: -1 }).valid, false);
  assert.equal(measureError(f.wall, f.ref, f.dims, Infinity).valid, false);
});

test('module filling conserves fractional space and cache results cannot be mutated', () => {
  const random = rng(5);
  for (let i = 0; i < 300; i++) {
    const len = random() * 12000, f = fill(len), used = f.mods.reduce((a, b) => a + b, 0);
    assert.ok(f.rest >= 0); assert.ok(used <= len); close(used + f.rest, len);
    assert.ok(f.mods.every((w) => DEMO_CATALOG.baseWidthsMm.includes(w)));
  }
  assert.deepEqual(fill(149.9), { mods: [], rest: 149.9 });
  const original = fill(1200); fill(1200).mods[0] = 99999; assert.deepEqual(fill(1200), original);
  for (const len of [NaN, Infinity, -1, 12001]) assert.throws(() => fill(len), RangeError);
});

test('impossible layouts and malformed input return no buildable plan or price', () => {
  const variants = [null, {}, { ...input(), walls: Array(1) }, { ...input(), layout: 'X' }, { ...input('L'), walls: input().walls }, { ...input(), island: true }];
  for (const len of [NaN, Infinity, -1, 0, '4200', 1500]) { const f = input(); f.walls[0].length = len; variants.push(f); }
  for (const height of [0, NaN, 1900]) { const f = input(); f.walls[0].height = height; variants.push(f); }
  const badOpt = input(); badOpt.opt.front = 'unknown'; variants.push(badOpt);
  const badApp = input(); badApp.app.dw = 900; variants.push(badApp);
  const badWater = input(); badWater.walls[0].waterAt = -5; variants.push(badWater);
  for (const f of variants) {
    const p = plan(f); assert.equal(p.valid, false, JSON.stringify(f)); assert.ok(p.errors.length); assert.deepEqual(p.walls, []);
    assert.equal(price(p, f), null); assert.equal(cutList(p, f), null);
  }
});

test('accepted layouts fit every wall and yield positive draft parts and an additive quote', () => {
  const random = rng(1101);
  let accepted = 0;
  for (const layout of ['straight', 'L', 'U']) for (let i = 0; i < 160; i++) {
    const f = input(layout);
    f.walls.forEach((w) => { w.length = 2400 + random() * 7000; w.waterAt = w.length * random(); w.height = 2300 + random() * 800; });
    f.opt = { ...Object.values(STYLES)[i % 6].d };
    f.app.dw = [0, 450, 600][i % 3]; f.app.fridge = ['none', 'free', 'builtin'][i % 3]; f.app.oven = i % 2 ? 'column' : 'under'; f.app.micro = i % 5 === 0;
    const p = plan(f);
    if (!p.valid) { assert.ok(p.errors.length); continue; }
    accepted++;
    p.walls.forEach((w) => {
      close(w.items.reduce((sum, it) => sum + it.w, 0), w.length);
      let end = 0;
      for (const it of w.items) { close(it.x, end); assert.ok(it.w > 0); end = it.x + it.w; assert.ok(end <= w.length + 1e-7); }
      let upperEnd = 0;
      for (const u of [...w.uppers].sort((a, b) => a.x - b.x)) { assert.ok(u.x >= upperEnd - 1e-7); assert.ok(u.x + u.w <= w.length + 1e-7); assert.ok(u.h + 1450 <= p.ceiling); upperEnd = u.x + u.w; }
    });
    const q = price(p, f);
    assert.ok(q.total > 0); assert.equal(q.total, q.lines.reduce((sum, l) => sum + l.v, 0));
    assert.equal(q.low, null); assert.equal(q.high, null); assert.equal(q.calibrated, false); assert.equal(q.manufacturingReady, false);
    assert.ok(q.parts.every((part) => part.l > 0 && part.w > 0 && part.qty > 0 && Number.isFinite(part.l * part.w * part.qty)));
    assert.ok(q.fit.every((part) => Number.isInteger(part.qty) && part.qty > 0));
  }
  assert.ok(accepted > 350, `Only ${accepted} accepted layouts`);
});

test('tall fronts split cabinet face rather than billing two full-height faces', () => {
  const f = input(), p = plan(f), parts = cutList(p, f).parts;
  const fronts = parts.filter((part) => part.name === 'Фасад пенала');
  assert.equal(fronts.length, 2);
  for (const front of fronts) assert.ok(front.l * front.qty <= 2400);
  const ovenFront = fronts[0];
  assert.ok(ovenFront.l * ovenFront.qty < 2400 - 590);
});

test('exported draft catalog and rates match the engine source', () => {
  const json = JSON.parse(readFileSync(new URL('../data/demo-catalog.json', import.meta.url)));
  assert.deepEqual(json.catalog, DEMO_CATALOG); assert.deepEqual(json.options, OPT); assert.deepEqual(json.rates, PRICE);
});


test('microwave column preserves a separately requested oven under the hob', () => {
  const f = input(); f.app.oven = 'under'; f.app.micro = true;
  const p = plan(f);
  assert.ok(p.valid);
  assert.equal(p.walls[0].items.filter((it) => it.type === 'hob_oven').length, 1);
  assert.equal(p.walls[0].items.filter((it) => it.type === 'oven').length, 1);
  const fronts = cutList(p, f).parts.filter((part) => part.name === 'Фасад пенала');
  close(fronts[0].l * fronts[0].qty, 2400 - 450 - 8);
});
