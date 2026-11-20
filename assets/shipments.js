/* Accelerator shipments, 2026 to 2030 (Estimate) */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const sv = (tag, attrs = {}, text) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const COL = {
    'Nvidia': 'var(--s6)', 'Google TPU': 'var(--s1)', 'AMD': 'var(--s8)', 'OpenAI (own chip)': 'var(--s3)',
    'AWS Trainium (Estimate)': 'var(--s4)', 'Meta, Anthropic and start-up chips': 'var(--s7)',
  };
  const colour = (k) => COL[k] || 'var(--text-3)';
  const isEst = (k) => /estimate/i.test(k);
  const f1 = (v) => (v == null ? '' : Number(v).toFixed(1));
  let D = null;

  // spec: key, title host ids, series, total, unit label, line
  function chart(host, series, totals, opts) {
    if (!host) return;
    host.textContent = '';
    const ys = D.years, keys = Object.keys(series);
    const W = Math.max(300, host.clientWidth || 560), H = W < 520 ? 280 : 320;
    const padL = 34, padR = 10, padT = 30, padB = 34;
    const mx = Math.max(...totals, ...(opts.line || [])) * 1.14, step = mx <= 25 ? 5 : 10, top = Math.ceil(mx / step) * step;
    const cw = (W - padL - padR) / ys.length, bw = Math.min(60, cw * 0.56);
    const y = (v) => padT + (H - padT - padB) * (1 - v / top), cx = (i) => padL + cw * i + cw / 2;
    const root = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'lk-svg' });
    const defs = sv('defs'), est = keys.filter(isEst);
    est.forEach((k, j) => {
      const c = colour(k), pat = sv('pattern', { id: `${opts.id}-h-${j}`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
      pat.append(sv('rect', { width: 6, height: 6, fill: `color-mix(in srgb, ${c} 18%, transparent)` }), sv('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: `color-mix(in srgb, ${c} 85%, transparent)`, 'stroke-width': 2 }));
      defs.append(pat);
    });
    root.append(defs);
    for (let t = 0; t <= top; t += step) {
      root.append(sv('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), class: 'lk-grid' }));
      root.append(sv('text', { x: padL - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'lk-ax' }, String(t)));
    }
    ys.forEach((yr, i) => {
      let acc = 0;
      for (const k of keys) {
        const v = series[k][i] || 0; if (!v) continue;
        const r = sv('rect', { x: cx(i) - bw / 2, y: y(acc + v), width: bw, height: Math.max(0, y(acc) - y(acc + v)), fill: isEst(k) ? `url(#${opts.id}-h-${est.indexOf(k)})` : colour(k), stroke: 'var(--bg, #0b0b0c)', 'stroke-width': 1 });
        r.append(sv('title', {}, `${k}, ${yr}: ${f1(v)} ${opts.unit}`));
        root.append(r); acc += v;
      }
      root.append(sv('text', { x: cx(i), y: y(totals[i]) - 8, 'text-anchor': 'middle', class: 'lk-val' }, opts.fmt(totals[i])));
      root.append(sv('text', { x: cx(i), y: H - 10, 'text-anchor': 'middle', class: 'lk-yr' }, String(yr)));
    });
    if (opts.line) {
      const pts = opts.line.map((v, i) => [cx(i), y(v)]);
      root.append(sv('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''), class: 'sh-likely' }));
      pts.forEach((p, i) => { const c = sv('circle', { cx: p[0], cy: p[1], r: 3.5, class: 'sh-likely-pt' }); c.append(sv('title', {}, `Likely IT GW energized, ex-China, ${ys[i]}: ${f1(opts.line[i])}`)); root.append(c); });
    }
    host.append(root);
  }

  function legend(lg, series, withLine) {
    lg.textContent = '';
    for (const k of Object.keys(series)) {
      const s = el('span'), sw = el('i', 'lk-sw');
      sw.style.background = isEst(k) ? `repeating-linear-gradient(45deg, color-mix(in srgb, ${colour(k)} 85%, transparent) 0 2px, color-mix(in srgb, ${colour(k)} 18%, transparent) 2px 5px)` : colour(k);
      s.append(sw, document.createTextNode(k)); lg.append(s);
    }
    if (withLine) { const l = el('span'); l.append(el('i', 'sh-key-likely'), document.createTextNode('Likely IT GW energized, ex-China')); lg.append(l); }
  }

  function table(t, head, series, rows) {
    const tr0 = el('tr'); tr0.append(el('th', null, head)); D.years.forEach((yr) => tr0.append(el('th', 'num', String(yr))));
    t.tHead.textContent = ''; t.tHead.append(tr0);
    const tb = t.tBodies[0]; tb.textContent = '';
    const row = (label, vals, cls, fmt = f1) => { const tr = el('tr', cls || ''); tr.append(el('td', null, label)); vals.forEach((v) => tr.append(el('td', 'num', fmt(v)))); tb.append(tr); };
    for (const k of Object.keys(series)) row(k, series[k], isEst(k) ? 'est' : '');
    for (const r of rows) row(...r);
  }

  function draw() {
    chart($('#sh-gw-chart'), D.it_gw, D.it_gw_total, { id: 'shg', unit: 'IT GW', fmt: (v) => String(v), line: D.likely_energized_ex_china });
    chart($('#sh-u-chart'), D.units_m, D.units_total_m, { id: 'shu', unit: 'million units', fmt: (v) => `${f1(v)}m` });
  }

  function init(d) {
    D = d;
    const notes = D.notes || [];
    const put = (sel, arr) => { const n = $(sel); n.textContent = ''; for (const x of arr) if (x) n.append(el('p', null, x)); };
    put('#sh-gw-note', [notes[0], notes[2]]);
    put('#sh-u-note', [notes[1]]);
    legend($('#sh-gw-legend'), D.it_gw, true);
    legend($('#sh-u-legend'), D.units_m, false);
    table($('#sh-gw-table'), 'IT GW', D.it_gw, [
      ['Total IT GW shipped', D.it_gw_total, 'total', (v) => String(v)],
      ['Likely IT GW energized, ex-China', D.likely_energized_ex_china, 'quiet'],
    ]);
    const uk = Object.keys(D.units_m);
    const perM = D.years.map((_, i) => uk.reduce((a, k) => a + ((D.it_gw[k] || [])[i] || 0), 0) / D.units_total_m[i]);
    table($('#sh-u-table'), 'Millions of units', D.units_m, [
      ['Total units shipped (millions)', D.units_total_m, 'total'],
      ['IT GW per million units (makers above)', perM, 'quiet'],
    ]);
    draw();
    let tm; addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(draw, 150); });
  }

  const go = () => fetch('data/accelerator-shipments.json?v=202611201345').then((r) => r.json()).then(init).catch(() => { const c = $('#shipments'); if (c) c.hidden = true; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
