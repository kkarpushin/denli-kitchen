// Kitchen rules engine: layout -> modules -> cut list -> price.
// All prices are INVENTED DEMO assumptions (UAH), not a market quote, until calibrated
// against DENLI's own Viyar price list and 20-30 past projects.
// In production this file runs on the server only (see docs).

export const STYLES = {
  minimal: {
    name: 'Мінімалізм', tag: 'Білі матові фасади без ручок, кварц',
    img: 'assets/style-minimal.jpg', thumb: 'assets/thumb-minimal.jpg',
    c: { front: '#EEEBE6', upper: '#EEEBE6', top: '#F4F2EE', handle: '#2A2A2A', plinth: '#D9D5CF' },
    d: { front: 'mdf_paint', handles: 'gola', top: 'quartz', uppers: 'ceiling', fittings: 'blum' },
    prompt: 'minimalism: matte white handleless fronts with integrated Gola profile, wall cabinets up to the ceiling, thin white quartz countertop and backsplash, black tap',
  },
  scandi: {
    name: 'Скандинавський', tag: 'Білий мат, дуб, відкриті полиці',
    img: 'assets/style-scandi.jpg', thumb: 'assets/thumb-scandi.jpg',
    c: { front: '#F1EFEA', upper: '#F1EFEA', top: '#C8A27A', handle: '#1E1E1E', plinth: '#E3DFD8' },
    d: { front: 'pvc', handles: 'classic', top: 'dsp', uppers: 'std', fittings: 'std' },
    prompt: 'Scandinavian: white matte fronts combined with light natural oak open shelves and oak countertop, thin black handles, white hexagon tile backsplash',
  },
  neoclassic: {
    name: 'Неокласика', tag: 'Шавлієві рамкові фасади, латунь, мармур',
    img: 'assets/style-neoclassic.jpg', thumb: 'assets/thumb-neoclassic.jpg',
    c: { front: '#9AA88F', upper: '#9AA88F', top: '#ECEAE6', handle: '#B08D57', plinth: '#8C9A82' },
    d: { front: 'shaker', handles: 'classic', top: 'quartz', uppers: 'tall', fittings: 'blum' },
    prompt: 'modern neoclassic: sage green shaker-style fronts with brushed brass knobs and handles, white marble-look countertop and backsplash, crown molding on the wall cabinets',
  },
  graphite: {
    name: 'Графіт-лофт', tag: 'Антрацит, бетон, чорний метал',
    img: 'assets/style-graphite.jpg', thumb: 'assets/thumb-graphite.jpg',
    c: { front: '#3E4144', upper: '#3E4144', top: '#B9B5AE', handle: '#111111', plinth: '#2E3033' },
    d: { front: 'agt', handles: 'profile', top: 'compact', uppers: 'std', fittings: 'blum' },
    prompt: 'loft graphite: dark anthracite matte fronts, concrete-look countertop, black matte tap and black handles, open metal shelf, warm LED strip under the wall cabinets',
  },
  walnut: {
    name: 'Еко-горіх', tag: 'Шпон горіха, кашемір, теплий камінь',
    img: 'assets/style-walnut.jpg', thumb: 'assets/thumb-walnut.jpg',
    c: { front: '#6E4C34', upper: '#DCD3C6', top: '#E2D8CA', handle: '#6E4C34', plinth: '#4F3524' },
    d: { front: 'veneer', handles: 'gola', top: 'quartz', uppers: 'tall', fittings: 'blum' },
    prompt: 'warm eco: natural walnut veneer fronts on the lower cabinets and tall column, beige cashmere matte upper cabinets, beige stone countertop, warm under-cabinet light',
  },
  cashmere: {
    name: 'Кашемір', tag: 'Сіро-бежевий мат, бронза, теразо',
    img: 'assets/style-cashmere.jpg', thumb: 'assets/thumb-cashmere.jpg',
    c: { front: '#D2CABE', upper: '#D2CABE', top: '#EEEAE3', handle: '#8A6A47', plinth: '#BDB4A7' },
    d: { front: 'mdf_paint', handles: 'profile', top: 'quartz', uppers: 'std', fittings: 'blum' },
    prompt: 'soft modern: greige cashmere matte fronts with long slim bronze handles, light terrazzo countertop and backsplash, fluted glass doors on two wall cabinets',
  },
};

export const OPT = {
  front: {
    dsp: { name: 'ДСП Egger', m2: 950 },
    pvc: { name: 'МДФ у плівці ПВХ', m2: 2400 },
    agt: { name: 'AGT / акрил, суперматовий', m2: 3300 },
    mdf_paint: { name: 'Фарбований МДФ', m2: 4300 },
    shaker: { name: 'Фарбований МДФ, рамковий', m2: 5400 },
    veneer: { name: 'Натуральний шпон', m2: 6800 },
  },
  handles: {
    gola: { name: 'Без ручок, профіль Gola', perM: 750, perFront: 0 },
    profile: { name: 'Ручки-профілі', perM: 0, perFront: 380 },
    classic: { name: 'Класичні ручки', perM: 0, perFront: 420 },
  },
  top: {
    dsp: { name: 'ДСП 38 мм', perM: 1900, splash: 900, cut: 300 },
    compact: { name: 'Компакт-плита 12 мм', perM: 9800, splash: 6200, cut: 1200 },
    quartz: { name: 'Кварцовий камінь', perM: 19000, splash: 9500, cut: 1500 },
    ceramic: { name: 'Кераміка', perM: 24000, splash: 12000, cut: 1800 },
  },
  uppers: {
    std: { name: 'Стандартні, 720 мм', h: 720 },
    tall: { name: 'Подовжені, 900 мм', h: 900 },
    ceiling: { name: 'До стелі', h: null },
    none: { name: 'Без верхніх, полиці', h: 0 },
  },
  fittings: {
    std: { name: 'GTV / Muller', hinge: 120, drawer: 1250, lift: 1300 },
    blum: { name: 'Blum, Австрія', hinge: 290, drawer: 3300, lift: 3900 },
  },
};

export const PRICE = {
  body_m2: 560,      // вигадана ставка матеріалу корпусу, без розкрою
  back_m2: 190,      // ХДФ задня стінка
  cut_m2: 35,        // розкрій
  edge_m: 22,        // кромка 0.8 мм з поклейкою
  edge_front_m: 38,  // кромка 2 мм на фасадах з ДСП
  leg: 45, plinth_m: 420, shelf_pin: 6,
  fridge_kit: 1100, sink_tray: 650, led_m: 1100,
  K: 2.2,            // виробництво + маржа на матеріали корпусів і фасадів
  K_fit: 1.35,       // націнка на фурнітуру і ручки
  install: 0.08,     // монтаж, від вартості меблів
  delivery: 2500,
};

export const DEMO_CATALOG = {
  schema: 'denli-demo-catalog/1', source: 'invented-starter-catalog', validated: false,
  currency: 'UAH', manufacturingReady: false,
  dimensionsMm: { bodyThickness: 16, backThickness: 4, baseHeight: 720, baseDepth: 560,
    upperDepth: 320, plinthHeight: 100, defaultTopThickness: 38, upperBottom: 1450,
    ceilingGap: 20, maxTallHeight: 2400, maxUpperHeight: 1500, minUAisle: 900 },
  baseWidthsMm: [150, 200, 300, 400, 450, 500, 600, 800, 900],
  moduleTypes: ['base', 'drawers', 'cargo', 'sink', 'dw', 'hob', 'hob_oven', 'corner',
    'oven', 'fridge', 'fridge_free', 'filler', 'reserve', 'up', 'up_corner', 'hood', 'shelf'],
  fixedModules: { sink: 600, dishwasher: [450, 600], hob: 600, ovenColumn: 600,
    fridgeColumn: 600, freestandingFridgeSpace: 650, blindCorner: 1000, cornerReserve: 600 },
  limits: { minWallLength: 500, maxWallLength: 12000, minCeiling: 1800, maxCeiling: 5000 },
  unsupported: ['island-clearance', 'appliance-specific-fit', 'utilities-routing', 'doors-and-windows', 'machining', 'structural-checks'],
  disclaimer: 'Авторські демонстраційні модулі та вигадані ставки. Не каталог DENLI, не виробниче креслення і не комерційна пропозиція.',
};
const { baseHeight: BASE_H, baseDepth: BASE_D, upperDepth: UP_D, plinthHeight: PLINTH } = DEMO_CATALOG.dimensionsMm;
const WIDTHS = DEMO_CATALOG.baseWidthsMm;
const END_FILLER = 30;

// ---------- filling a gap with standard modules ----------
const fillCache = new Map();
export function fill(len) {
  if (!Number.isFinite(len) || len < 0 || len > DEMO_CATALOG.limits.maxWallLength) throw new RangeError('Unsupported module gap');
  // Never round up into the neighbouring appliance. Preserve sub-mm remainder.
  const n = Math.floor(len / 50), key = n;
  let mods = fillCache.get(key);
  if (!mods) {
    const dp = Array(n + 1).fill(null); dp[0] = { cost: 0, mods: [] };
    for (let k = 1; k <= n; k++) for (const w of WIDTHS) {
      const prev = dp[k - w / 50];
      if (!prev) continue;
      const cost = prev.cost + 30 + (w < 300 ? 160 : 0) + (w > 600 ? 25 : 0) + Math.abs(w - 600) * 0.15;
      if (!dp[k] || cost < dp[k].cost) dp[k] = { cost, mods: [...prev.mods, w] };
    }
    let best = { cost: len * 8, mods: [] };
    dp.forEach((v, k) => { if (v && v.cost + (len - k * 50) * 8 < best.cost) best = { cost: v.cost + (len - k * 50) * 8, mods: v.mods }; });
    mods = best.mods.sort((a, b) => b - a);
    if (fillCache.size >= 256) fillCache.clear();
    fillCache.set(key, mods);
  }
  return { mods: [...mods], rest: len - mods.reduce((a, w) => a + w, 0) };
}

function inputErrors(input) {
  const errors = [];
  if (!input || !['straight', 'L', 'U'].includes(input.layout)) return ['Оберіть підтримуване планування.'];
  const count = { straight: 1, L: 2, U: 3 }[input.layout];
  if (!Array.isArray(input.walls) || input.walls.length !== count) return [`Для цього планування потрібно стін: ${count}.`];
  Array.from(input.walls).forEach((w, i) => {
    if (!w || !Number.isFinite(w.length) || w.length < 500 || w.length > 12000) errors.push(`Стіна ${i + 1}: довжина має бути від 500 до 12000 мм.`);
    if (!w || !Number.isFinite(w.height) || w.height < 1800 || w.height > 5000) errors.push(`Стіна ${i + 1}: висота має бути від 1800 до 5000 мм.`);
    if (w && w.waterAt != null && (!Number.isFinite(w.waterAt) || w.waterAt < 0 || w.waterAt > w.length)) errors.push(`Стіна ${i + 1}: точка води має бути в межах стіни.`);
  });
  const app = input.app;
  if (!app || !['builtin', 'free', 'none'].includes(app.fridge) || !['column', 'under'].includes(app.oven)
      || ![0, 450, 600].includes(app.dw) || typeof app.micro !== 'boolean') errors.push('Перевірте параметри техніки.');
  for (const key of Object.keys(OPT)) if (!input.opt || !Object.hasOwn(OPT[key], input.opt[key])) errors.push(`Невідомий параметр: ${key}.`);
  if (input.island) errors.push('Острів потребує розмірів кімнати та перевірки проходів; у цьому прототипі він не підтримується.');
  if (!errors.length && input.layout === 'U' && input.walls[1].length < BASE_D * 2 + 900) errors.push('Замало місця між рядами П-подібної кухні за демонстраційним правилом проходу 900 мм.');
  return errors;
}
const invalidPlan = (errors, warnings = []) => ({ valid: false, demo: true, componentSource: DEMO_CATALOG.source,
  manufacturingReady: false, errors, warnings, walls: [], island: null, ceiling: null, upH: 0 });

// ---------- layout ----------
// input: { layout: 'straight'|'L'|'U', island: bool, walls: [{length, height, waterAt}],
//          app: { fridge: 'builtin'|'free'|'none', oven: 'column'|'under', dw: 600|450|0, micro: bool },
//          opt: { front, handles, top, uppers, fittings }, style }
export function plan(input) {
  const errors = inputErrors(input);
  if (errors.length) return invalidPlan(errors);
  const warnings = [DEMO_CATALOG.disclaimer];
  const walls = input.walls.map((w) => ({ ...w }));
  const app = input.app;
  const ceiling = Math.min(...walls.map((w) => w.height));
  const out = [];

  const tallSet = [];
  if (app.oven === 'column' || app.micro) tallSet.push({ type: 'oven', w: 600 });
  if (app.fridge === 'builtin') tallSet.push({ type: 'fridge', w: 600 });
  if (app.fridge === 'free') tallSet.push({ type: 'fridge_free', w: 650 });
  const hobType = app.oven === 'column' ? 'hob' : 'hob_oven';

  const mk = (seq) => seq; // sequence of items {type, w} or {gap, target, min}

  let seqs;
  if (input.layout === 'straight') {
    const L = walls[0].length;
    const water = walls[0].waterAt ?? L * 0.3;
    const mirrored = water > L / 2;
    const sinkCenter = mirrored ? L - water : water;
    const gapA = Math.max(0, sinkCenter - END_FILLER - 300);
    seqs = [mk([
      { type: 'filler', w: END_FILLER },
      { gap: 'A', target: gapA < 150 ? 0 : gapA, min: 0 },
      { type: 'sink', w: 600 },
      ...(app.dw ? [{ type: 'dw', w: app.dw }] : []),
      { gap: 'B', target: 800, min: 400, flex: true },
      { type: hobType, w: 600 },
      { gap: 'C', target: 450, min: 200 },
      ...tallSet,
      { type: 'filler', w: END_FILLER },
    ])];
    if (mirrored) seqs[0].reverse();
  } else if (input.layout === 'L') {
    seqs = [
      mk([{ type: 'filler', w: END_FILLER }, { gap: 'A', target: 300, min: 0 }, { type: 'sink', w: 600 },
        ...(app.dw ? [{ type: 'dw', w: app.dw }] : []), { gap: 'B', target: 600, min: 0, flex: true }, { type: 'corner', w: 1000 }]),
      mk([{ type: 'reserve', w: 600 }, { gap: 'D', target: 450, min: 300, flex: true }, { type: hobType, w: 600 },
        { gap: 'C', target: 450, min: 300 }, ...tallSet, { type: 'filler', w: END_FILLER }]),
    ];
  } else {
    seqs = [
      mk([{ type: 'filler', w: END_FILLER }, ...tallSet, { gap: 'E', target: 400, min: 0, flex: true }, { type: 'corner', w: 1000 }]),
      mk([{ type: 'reserve', w: 600 }, { gap: 'A', target: 300, min: 0 }, { type: 'sink', w: 600 },
        ...(app.dw ? [{ type: 'dw', w: app.dw }] : []), { gap: 'B', target: 300, min: 0, flex: true }, { type: 'reserve', w: 600 }]),
      mk([{ type: 'corner', w: 1000 }, { gap: 'D', target: 450, min: 300 }, { type: hobType, w: 600 },
        { gap: 'C', target: 400, min: 0, flex: true }, { type: 'filler', w: END_FILLER }]),
    ];
  }

  // Do not return overflowing geometry with only a warning. Require the full
  // fixed appliance set and the catalog's minimum worktop gaps to fit.
  seqs.forEach((seq, wi) => {
    const required = seq.reduce((sum, item) => sum + (item.gap ? item.min : item.w), 0);
    if (required > walls[wi].length + 1e-8) errors.push(`Стіна ${wi + 1}: для цього набору потрібно щонайменше ${required} мм, введено ${walls[wi].length} мм.`);
  });
  const upOpt = OPT.uppers[input.opt.uppers];
  const { upperBottom, ceilingGap, maxUpperHeight } = DEMO_CATALOG.dimensionsMm;
  const availableUpper = ceiling - upperBottom - ceilingGap;
  const upH = upOpt.h === null ? Math.min(maxUpperHeight, availableUpper) : upOpt.h;
  if (upH > availableUpper || (upOpt.h === null && upH < 360)) errors.push('Верхні шафи не поміщаються під заданою стелею. Оберіть нижчі шафи або полиці.');
  if (upOpt.h === null && availableUpper > maxUpperHeight) errors.push('Один ряд демонстраційних шаф не досягає цієї стелі. Оберіть стандартні або подовжені шафи.');
  if (tallSet.length && ceiling < 2100) errors.push('Для демонстраційних пеналів потрібна висота кімнати від 2100 мм.');
  if (errors.length) return invalidPlan(errors, warnings);

  seqs.forEach((seq, wi) => {
    const wall = walls[wi];
    if (!wall) return;
    const L = wall.length;
    const fixed = seq.filter((s) => !s.gap).reduce((a, s) => a + s.w, 0);
    const gaps = seq.filter((s) => s.gap);
    let free = L - fixed;
    // allocate: every gap gets its minimum, then fixed gaps grow to target
    // (safety gaps C/D/E first, then water alignment A), flex takes the rest.
    // Fixed gaps are snapped to modules first, so their waste flows to flex.
    let rem = free;
    gaps.forEach((g) => { g.len = Math.min(g.min, Math.max(0, rem)); rem -= g.len; });
    const prio = [...gaps.filter((g) => !g.flex && g.gap !== 'A'), ...gaps.filter((g) => g.gap === 'A' && !g.flex)];
    const modsOf = new Map();
    for (const g of prio) {
      const add = Math.max(0, Math.min(g.target - g.len, rem));
      g.len += add; rem -= add;
      const f = fill(g.len);
      modsOf.set(g, f.mods);
      rem += f.rest; g.len -= f.rest;
    }
    const flex = gaps.filter((g) => g.flex);
    let extraFiller = 0;
    if (flex.length) {
      flex.forEach((g) => { g.len += Math.max(0, rem) / flex.length; });
      flex.forEach((g) => { const f = fill(g.len); modsOf.set(g, f.mods); extraFiller += f.rest; });
    } else extraFiller += Math.max(0, rem);
    // expand into modules
    const items = [];
    let x = 0;
    for (const s of seq) {
      if (s.gap) (modsOf.get(s) || []).forEach((w) => items.push({ type: 'base', w }));
      else items.push({ type: s.type, w: s.w });
    }
    // put leftover on end fillers
    const fillers = items.filter((i) => i.type === 'filler');
    if (fillers.length) fillers.forEach((f) => (f.w += extraFiller / fillers.length));
    else if (extraFiller > 0) items.push({ type: 'filler', w: extraFiller });
    // positions
    for (const it of items) { it.x = x; x += it.w; }
    // drawer units next to the hob
    const hi = items.findIndex((i) => i.type === 'hob' || i.type === 'hob_oven');
    [hi - 1, hi + 1].forEach((j) => { if (items[j] && items[j].type === 'base' && items[j].w >= 400) items[j].type = 'drawers'; });
    items.forEach((i) => { if (i.type === 'base' && i.w <= 200) i.type = 'cargo'; });
    if (Math.abs(L - x) > 1e-6) errors.push('Не вдалося розкласти модулі в межах стіни.');
    const sink = items.find((i) => i.type === 'sink');
    if (sink && wall.waterAt != null && Math.abs(sink.x + sink.w / 2 - wall.waterAt) > 150) warnings.push(`Стіна ${wi + 1}: центр мийки зміщено від точки води; підключення потребує перевірки.`);
    out.push({ length: L, items, uppers: [] });
  });

  // uppers
  out.forEach((w) => {
    if (upH === 0) { // open shelves over the worktop
      const run = runSpan(w.items);
      const span = run.x1 - run.x0, width = Math.max(0, span * 0.6);
      w.uppers = width >= 150 ? [{ type: 'shelf', x: run.x0 + (span - width) / 2, w: width, h: 0 }] : [];
      return;
    }
    const run = runSpan(w.items);
    const hob = w.items.find((i) => i.type === 'hob' || i.type === 'hob_oven');
    const cornerAt = w.items.find((i) => i.type === 'corner');
    const resv = w.items.filter((i) => i.type === 'reserve');
    let a = run.x0, b = run.x1;
    const fixedU = [];
    if (cornerAt) {
      const cu = { type: 'up_corner', w: 600, x: cornerAt.x === run.x0 ? run.x0 : run.x1 - 600 };
      fixedU.push(cu);
    }
    resv.forEach((r) => { if (r.x + r.w <= a + 1) a = Math.max(a, r.x + UP_D); else if (r.x >= b - 1) b = Math.min(b, r.x + r.w - UP_D); });
    if (hob) fixedU.push({ type: 'hood', w: 600, x: hob.x });
    // fill segments between fixed uppers
    fixedU.sort((p, q) => p.x - q.x);
    const ups = [];
    let cur = a;
    for (const f of [...fixedU, { x: b, w: 0, end: true }]) {
      const seg = f.x - cur;
      if (seg > 0) {
        const r = fill(seg);
        let xx = cur + r.rest / 2;
        r.mods.forEach((mw) => { ups.push({ type: 'up', w: mw, x: xx }); xx += mw; });
      }
      if (!f.end) { ups.push(f); cur = f.x + f.w; }
    }
    ups.forEach((u) => (u.h = u.type === 'hood' ? Math.min(upH, 720) * 0.5 + 0 : upH));
    w.uppers = ups;
  });

  if (errors.length) return invalidPlan(errors, warnings);
  for (const w of out) {
    const sorted = [...w.uppers].sort((a, b) => a.x - b.x);
    if (sorted.some((u, i) => u.x < -1e-6 || u.x + u.w > w.length + 1e-6 || (i && u.x < sorted[i - 1].x + sorted[i - 1].w - 1e-6))) {
      return invalidPlan(['Верхні модулі перетинаються або виходять за межі стіни.'], warnings);
    }
  }
  return { valid: true, demo: true, componentSource: DEMO_CATALOG.source, manufacturingReady: false,
    walls: out, island: null, ceiling, upH, warnings, errors: [] };
}

function runSpan(items) {
  const base = items.filter((i) => !['filler', 'reserve', 'oven', 'fridge', 'fridge_free'].includes(i.type));
  if (!base.length) return { x0: 0, x1: 0 };
  return { x0: Math.min(...base.map((i) => i.x)), x1: Math.max(...base.map((i) => i.x + i.w)) };
}

// ---------- cut list ----------
const m = (mm) => mm / 1000;
export function cutList(p, input) {
  if (!p || p.valid !== true || inputErrors(input).length) return null;
  const parts = [], fit = [];
  const tallH = Math.min(p.ceiling - PLINTH - 20, 2400);
  let nb = 0, nu = 0, nt = 0;
  const P = (mod, name, l, w, qty, mat, edges) => parts.push({ mod, name, l: Math.round(l), w: Math.round(w), qty, mat, edges });
  const F = (mod, name, qty) => fit.push({ mod, name, qty });
  const runs = [...p.walls.map((w) => w.items), ...(p.island ? [p.island.items] : [])];
  runs.forEach((items) => items.forEach((it) => {
    const W = it.w;
    if (['filler', 'reserve', 'fridge_free'].includes(it.type)) return;
    if (['oven', 'fridge'].includes(it.type)) {
      const id = `П${++nt}`;
      P(id, 'Бік пенала', tallH, BASE_D, 2, 'body', 'Д1');
      P(id, 'Дно/дах/полиці', W - 32, BASE_D, 4, 'body', 'Д1');
      P(id, 'Задня стінка', tallH - 4, W - 4, 1, 'back', '');
      const aperture = it.type === 'oven' ? (input.app.oven === 'column' ? 600 : 0) + (input.app.micro ? 450 : 0) : 0;
      P(id, 'Фасад пенала', (tallH - aperture - 8) / 2, W - 4, 2, 'front', 'кругом');
      F(id, 'Петля', it.type === 'fridge' ? 4 : 5); F(id, 'Ніжка', 4);
      if (it.type === 'fridge') F(id, 'Комплект для вбудованого холодильника', 1);
      return;
    }
    if (it.type === 'dw') { const id = `Н${++nb}`; P(id, 'Фасад посудомийки', BASE_H - 4, W - 4, 1, 'front', 'кругом'); F(id, 'Кріплення фасаду ПММ', 1); return; }
    const id = `Н${++nb}`;
    const ww = it.type === 'corner' ? 1000 : W;
    P(id, 'Бік', BASE_H, BASE_D, 2, 'body', 'Д1');
    P(id, 'Дно', ww - 32, BASE_D, 1, 'body', 'Д1');
    P(id, 'Царга', ww - 32, 100, 2, 'body', 'Д1');
    P(id, 'Задня стінка', BASE_H - 4, ww - 4, 1, 'back', '');
    F(id, 'Ніжка', 4);
    if (it.type === 'drawers' || it.type === 'hob') {
      P(id, 'Фасад шухляди', 236, W - 4, 3, 'front', 'кругом'); F(id, 'Шухляда з доводчиком', 3);
    } else if (it.type === 'hob_oven') {
      P(id, 'Фасад шухляди під духовкою', 140, W - 4, 1, 'front', 'кругом'); F(id, 'Шухляда з доводчиком', 1);
    } else if (it.type === 'cargo') {
      P(id, 'Фасад карго', BASE_H - 4, W - 4, 1, 'front', 'кругом'); F(id, 'Карго-механізм', 1);
    } else if (it.type === 'corner') {
      P(id, 'Полиця', 968, 530, 1, 'body', 'Д1'); P(id, 'Фасад', BASE_H - 4, 446, 1, 'front', 'кругом');
      P(id, 'Глуха панель', BASE_H - 4, 550, 1, 'front', 'кругом'); F(id, 'Петля', 2); F(id, 'Кутовий механізм', 1);
    } else {
      const doors = W > 500 ? 2 : 1;
      if (it.type !== 'sink') P(id, 'Полиця', W - 32, 530, 1, 'body', 'Д1');
      P(id, 'Фасад', BASE_H - 4, W / doors - 4, doors, 'front', 'кругом'); F(id, 'Петля', 2 * doors);
      if (it.type === 'sink') F(id, 'Піддон під мийку', 1);
    }
  }));
  p.walls.forEach((w) => w.uppers.forEach((u) => {
    if (u.type === 'shelf') { const id = `В${++nu}`; P(id, 'Відкрита полиця', u.w, 250, 2, 'front', 'Д1'); F(id, 'Кріплення полиці', 4); return; }
    const id = `В${++nu}`;
    const H = u.h, W = u.w, D = u.type === 'up_corner' ? 600 : UP_D;
    P(id, 'Бік', H, UP_D, 2, 'body', 'Д1');
    P(id, 'Дно/дах', W - 32, D, 2, 'body', 'Д1');
    P(id, 'Задня стінка', H - 4, W - 4, 1, 'back', '');
    if (u.type === 'hood') { P(id, 'Фасад на підйомнику', H - 4, W - 4, 1, 'front', 'кругом'); F(id, 'Підйомний механізм', 1); return; }
    P(id, 'Полиця', W - 32, UP_D - 20, H > 800 ? 2 : 1, 'body', 'Д1');
    const doors = W > 500 ? 2 : 1;
    P(id, 'Фасад', H - 4, W / doors - 4, doors, 'front', 'кругом');
    F(id, 'Петля', (H > 900 ? 3 : 2) * doors);
  }));
  return { parts, fit, demo: true, manufacturingReady: false, componentSource: DEMO_CATALOG.source };
}

// ---------- price ----------
export function price(p, input) {
  const cut = cutList(p, input);
  if (!cut) return null;
  const { parts, fit } = cut;
  const o = input.opt;
  const fr = OPT.front[o.front], hd = OPT.handles[o.handles], tp = OPT.top[o.top], ft = OPT.fittings[o.fittings];
  let body = 0, back = 0, front = 0, bodyEdge = 0, frontEdge = 0, nFronts = 0, frontArea = 0;
  for (const x of parts) {
    const area = m(x.l) * m(x.w) * x.qty;
    if (x.mat === 'body') { body += area; bodyEdge += m(x.l) * x.qty; }
    if (x.mat === 'back') back += area;
    if (x.mat === 'front') { front += area; frontArea += area; nFronts += x.qty; if (o.front === 'dsp') frontEdge += 2 * (m(x.l) + m(x.w)) * x.qty; }
  }
  const fitCost = fit.reduce((a, f) => {
    const q = f.qty;
    switch (f.name) {
      case 'Петля': return a + q * ft.hinge;
      case 'Шухляда з доводчиком': return a + q * ft.drawer;
      case 'Підйомний механізм': return a + q * ft.lift;
      case 'Ніжка': return a + q * PRICE.leg;
      case 'Комплект для вбудованого холодильника': return a + q * PRICE.fridge_kit;
      case 'Піддон під мийку': return a + q * PRICE.sink_tray;
      case 'Карго-механізм': return a + q * 2600;
      case 'Кутовий механізм': return a + q * (o.fittings === 'blum' ? 9500 : 4200);
      default: return a + q * 150;
    }
  }, 0);
  let topLen = 0, baseRun = 0;
  const allRuns = [...p.walls.map((w) => w.items), ...(p.island ? [p.island.items] : [])];
  allRuns.forEach((items) => items.forEach((i) => {
    if (['base', 'drawers', 'cargo', 'sink', 'dw', 'hob', 'hob_oven', 'corner'].includes(i.type)) { topLen += i.w; baseRun += i.w; }
    // A corner reserve overlaps the adjacent corner footprint: do not bill it twice.
  }));
  const handles = hd.perFront ? hd.perFront * nFronts : hd.perM * m(baseRun) * 2;
  const panels = body * (PRICE.body_m2 + PRICE.cut_m2) + back * PRICE.back_m2 + front * fr.m2
    + bodyEdge * PRICE.edge_m + frontEdge * PRICE.edge_front_m + PRICE.plinth_m * m(baseRun);
  const furnitureOnly = panels * PRICE.K, fittings = (handles + fitCost) * PRICE.K_fit;
  const furniture = furnitureOnly + fittings;
  const splashLen = p.walls.reduce((a, w) => a + w.items.filter((i) => ['base', 'drawers', 'cargo', 'sink', 'dw', 'hob', 'hob_oven', 'corner'].includes(i.type)).reduce((s, i) => s + i.w, 0), 0);
  const countertop = tp.perM * m(topLen) + tp.cut * 2 + (o.top !== 'dsp' ? tp.splash * m(splashLen) : 0);
  const install = furniture * PRICE.install;
  // Quote display and total use the same rounded line values, so they add up.
  // No uncalibrated percentage band is presented as price uncertainty.
  const round = (v) => Math.round(v / 1000) * 1000;
  const lines = [
    { name: 'Корпуси і фасади (демо)', v: round(furnitureOnly) },
    { name: `Фурнітура (${ft.name}) і ручки`, v: round(fittings) },
    { name: `Стільниця: ${tp.name}`, v: round(countertop) },
    { name: 'Доставка і монтаж', v: round(install + PRICE.delivery) },
  ];
  return {
    total: lines.reduce((sum, line) => sum + line.v, 0), low: null, high: null,
    demo: true, calibrated: false, currency: 'UAH', basis: 'invented-starter-rates',
    manufacturingReady: false, componentSource: DEMO_CATALOG.source,
    exclusions: ['appliances', 'sink-and-tap', 'utility-relocation', 'measurement-validation', 'site-specific-work'],
    lines,
    stats: {
      base: allRuns.flat().filter((i) => ['base', 'drawers', 'cargo', 'sink', 'hob', 'hob_oven', 'corner'].includes(i.type)).length,
      upper: p.walls.reduce((a, w) => a + w.uppers.filter((u) => u.type !== 'shelf').length, 0),
      tall: allRuns.flat().filter((i) => ['oven', 'fridge'].includes(i.type)).length,
      drawers: fit.filter((f) => f.name === 'Шухляда з доводчиком').reduce((a, f) => a + f.qty, 0),
      fronts: nFronts, frontArea, baseRun: m(baseRun), topLen: m(topLen), parts: parts.reduce((a, x) => a + x.qty, 0),
    },
    parts, fit,
  };
}

// ---------- AI render prompt (kept server-side in production) ----------
export function renderPrompt(p, input, hasInspo) {
  const st = STYLES[input.style] || STYLES.minimal;
  const names = { sink: 'sink cabinet', dw: 'dishwasher', hob: 'induction hob over drawers', hob_oven: 'induction hob with built-in oven below', oven: 'tall column with built-in oven and microwave', fridge: 'tall column with built-in fridge', fridge_free: 'freestanding fridge', corner: 'corner cabinet', drawers: 'drawer unit', base: 'base cabinet', cargo: 'narrow pull-out' };
  const wallTxt = p.walls.map((w, i) => {
    const seq = w.items.filter((x) => names[x.type]).map((x) => x.type === 'oven'
      ? `tall column with ${[input.app.oven === 'column' ? 'built-in oven' : '', input.app.micro ? 'microwave' : ''].filter(Boolean).join(' and ')}`
      : names[x.type]);
    return `wall ${i + 1} (${(w.length / 1000).toFixed(2)} m), from left to right: ${seq.join(', ')}`;
  }).join('; ');
  const up = OPT.uppers[input.opt.uppers];
  return [
    'Edit this photo of a real room: install a brand-new built-in kitchen. Keep the room EXACTLY as it is: same camera position and lens, same walls, windows, doors, floor, ceiling and daylight. Remove any paper sheet or card taped on the wall and any old furniture where the new kitchen goes.',
    `Kitchen layout: ${input.layout === 'straight' ? 'straight run along the main wall' : input.layout === 'L' ? 'L-shaped' : 'U-shaped'}${input.island ? ' plus a kitchen island' : ''}. ${wallTxt}.`,
    up.h === 0 ? 'No wall cabinets, two open shelves instead.' : up.h === null ? 'Wall cabinets up to the ceiling.' : 'Wall cabinets above the worktop with a hood cabinet above the hob.',
    hasInspo ? `Match the fronts, colours, countertop and handles of the attached inspiration images. Base style: ${st.prompt}.` : `Style: ${st.prompt}.`,
    'Photorealistic interior photo with the same smartphone look. No people, no text, no logos.',
  ].join(' ');
}
