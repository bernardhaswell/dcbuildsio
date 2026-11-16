/* Likely energized, 2025 to 2030: an estimate, read from data/likely.json (built from the workbook). */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
    for (const c of [].concat(kids)) if (c != null) n.append(c);
    return n;
  };
  const sv = (tag, attrs = {}, text) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };
  const CHIP = { nvidia: 'Nvidia', amd: 'AMD', google: 'Google TPU', amazon: 'Amazon Trainium', meta: 'Meta MTIA', microsoft: 'Microsoft Maia', openai: 'OpenAI', broadcom: 'Broadcom', huawei: 'Huawei Ascend', alibaba: 'Alibaba T-Head', cambricon: 'Cambricon', hygon: 'Hygon', baidu: 'Baidu Kunlun', intel: 'Intel', groq: 'Groq', cerebras: 'Cerebras', tesla: 'Tesla', undisclosed: 'Not disclosed', other: 'Other' };
  const f1 = (v) => (v >= 0.05 ? v.toFixed(1) : v > 0 ? '<0.1' : '–');
  const f2 = (v) => (v >= 0.005 ? v.toFixed(2) : v > 0 ? '<0.01' : '–');
  let D, tab = 'summary', all = false;

  function drawChart() {
    const host = $('#lk-chart'), s = D.summary, ys = D.years;
    const W = Math.max(320, host.clientWidth || 800), H = W < 560 ? 280 : 340, padL = W < 560 ? 30 : 44, padR = 8, padT = 34, padB = 34;
    const max = Math.max(...s.total) * 1.12, nice = max <= 20 ? 5 : max <= 50 ? 10 : 20, top = Math.ceil(max / nice) * nice;
    const x0 = padL, cw = (W - padL - padR) / ys.length, bw = Math.min(72, cw * 0.56), y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const root = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'lk-svg' });
    const defs = sv('defs');
    const pat = sv('pattern', { id: 'lk-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.append(sv('rect', { width: 6, height: 6, fill: 'color-mix(in srgb, var(--s1) 22%, transparent)' }), sv('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'color-mix(in srgb, var(--s1) 70%, transparent)', 'stroke-width': 2 }));
    defs.append(pat); root.append(defs);
    for (let v = 0; v <= top; v += nice) {
      root.append(sv('line', { x1: x0, x2: W - padR, y1: y(v), y2: y(v), class: 'lk-grid' }));
      root.append(sv('text', { x: x0 - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'lk-ax' }, String(v)));
    }
    ys.forEach((yr, i) => {
      const cx = x0 + cw * i + cw / 2, a = s.at_sites[i], e = s.not_yet_tracked[i], t = s.total[i];
      const g = sv('g', { class: 'lk-bar', tabindex: 0, 'aria-label': `${yr}: ${f1(t)} GW likely, ${f1(a)} at tracked sites, ${f1(e)} not yet in the tracker` });
      const r = Math.min(6, bw / 6);
      g.append(sv('path', { d: `M${cx - bw / 2},${y(a + e)} h${bw} V${y(a)} h${-bw}Z`, fill: 'url(#lk-hatch)' }));
      g.append(sv('rect', { x: cx - bw / 2, y: y(a), width: bw, height: Math.max(0, y(0) - y(a)), fill: 'var(--s1)' }));
      g.append(sv('rect', { x: cx - bw / 2, y: y(t), width: bw, height: Math.max(0, y(0) - y(t)), rx: r, fill: 'none', stroke: 'color-mix(in srgb, var(--s1) 55%, transparent)', 'stroke-width': 1 }));
      g.append(sv('text', { x: cx, y: y(t) - 10, 'text-anchor': 'middle', class: 'lk-val' }, f1(t)));
      g.append(sv('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'lk-yr' }, String(yr)));
      g.append(sv('title', {}, `${yr}: ${f1(t)} GW likely\n${f1(a)} GW at tracked sites, weighted by stage\n${f1(e)} GW Estimate: capacity not yet in the tracker`));
      root.append(g);
    });
    root.append(sv('text', { x: x0 - 8, y: 14, 'text-anchor': 'end', class: 'lk-ax' }, 'GW'));
    host.replaceChildren(root);
    $('#lk-legend').replaceChildren(
      el('span', {}, [el('i', { class: 'lk-sw solid' }), 'At tracked sites, weighted by how far along each one is']),
      el('span', {}, [el('i', { class: 'lk-sw hatch' }), 'Estimate: capacity not yet in the tracker']));
  }

  const head = (first, extra = []) => el('tr', {}, [el('th', { scope: 'col', text: first }), ...D.years.map((y) => el('th', { class: 'num', scope: 'col', text: String(y) })), el('th', { class: 'num tot', scope: 'col', text: '2025–30' }), ...extra.map((t) => el('th', { class: 'num', scope: 'col', text: t }))]);
  const line = (name, vals, cls = '', extra = [], fmt = f2) => el('tr', { class: cls }, [el('td', { title: name }, name), ...vals.map((v) => el('td', { class: 'num' + (v ? '' : ' z'), text: fmt(v) })), el('td', { class: 'num tot', text: fmt(vals.reduce((a, b) => a + b, 0)) }), ...extra.map((v) => el('td', { class: 'num dim', text: typeof v === 'number' ? fmt(v) : v }))]);

  function drawTable() {
    const t = $('#lk-table'), th = t.tHead, tb = t.tBodies[0], more = $('#lk-more'), s = D.summary;
    tb.replaceChildren(); more.hidden = true;
    if (tab === 'summary') {
      $('#lk-tsub').textContent = 'IT GW. Each year is capacity switching on in that year, not the running total. The last line is what the tracker has announced and dated in each year, for comparison.';
      th.replaceChildren(head(''));
      tb.append(line('Likely energized', s.total, 'total'), line('United States', s.us, 'sub'), line('Outside the US', s.outside_us, 'sub'),
        line('At tracked sites, weighted by stage', s.at_sites), line('Estimate: not yet in the tracker', s.not_yet_tracked, 'est'),
        el('tr', { class: 'lk-sep' }, el('td', { colspan: D.years.length + 2, text: 'Tracked sites by stage, weighted' })),
        ...D.stages.map((r) => line(r.stage, r.it_gw, 'sub')),
        el('tr', { class: 'lk-sep' }, el('td', { colspan: D.years.length + 2, text: 'For comparison' })),
        line('Announced in the tracker, dated in the year', s.announced_dated, 'quiet'));
      return;
    }
    const lbl = { chip: 'Chip maker', operator: 'Operator', end_user: 'End user', site: 'Site' }[tab];
    const rows = D.by[tab].filter((r) => !/^Total\b/.test(r.name)), tot = D.by[tab].find((r) => /^Total\b/.test(r.name));
    $('#lk-tsub').textContent = `IT GW by ${lbl.toLowerCase()}. Each row shares in the yearly total in proportion to its stage-weighted capacity, so rows add up to the Summary. "Announced" is the tracker’s dated capacity for 2025 to 2030 at the same rows.`;
    th.replaceChildren(head(lbl, ['Announced', 'Rows']));
    const LIMIT = 15, show = all ? rows : rows.slice(0, LIMIT);
    const name = (n) => (tab === 'chip' ? CHIP[n] || n : n);
    for (const r of show) tb.append(line(name(r.name), r.years, '', [r.announced, String(r.rows)]));
    if (!all && rows.length > LIMIT) { const rest = rows.slice(LIMIT); tb.append(line(`${rest.length} more`, D.years.map((_, i) => rest.reduce((a, r) => a + r.years[i], 0)), 'quiet', [rest.reduce((a, r) => a + r.announced, 0), String(rest.reduce((a, r) => a + r.rows, 0))])); }
    if (tot) tb.append(line('Total', tot.years, 'total', [tot.announced, String(tot.rows)]));
    more.hidden = rows.length <= LIMIT; more.textContent = all ? 'Show top 15' : `Show all ${rows.length}`;
  }

  function init(d) {
    D = d;
    $('#lk-sub').textContent = `What is likely to be energized each year, as opposed to everything announced. IT GW, worldwide excluding China. Our estimate, updated ${d.generated}; figures may be revised.`;
    const s = d.summary, last = s.total.length - 1;
    $('#lk-note').replaceChildren('How it works: every tracked site counts at a chance set by its stage (operating sites in full, paper projects at 15 to 35%), spread over its stated year and up to two years late. The yearly totals follow SemiAnalysis’s public capacity forecast, cut for the reduction in AI chip volumes it reported in November 2026, and the gap between that total and the tracked sites is shown as an estimate of capacity not yet announced. Not affected by the filters above. ',
      el('a', { href: 'data/likely-energized-by-site.xlsx', download: '', text: 'Download the workbook' }), ' to see and change every assumption.');
    $('#lk-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.v; all = false; for (const x of $('#lk-tabs').children) x.setAttribute('aria-checked', String(x === b)); drawTable(); });
    $('#lk-more').addEventListener('click', () => { all = !all; drawTable(); });
    drawChart(); drawTable();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawChart, 150); });
    void last;
  }
  const go = () => fetch('data/likely.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
    .catch(() => { const s = $('#likely'); if (s) s.hidden = true; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
