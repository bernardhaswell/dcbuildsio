(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v; else n.setAttribute(k, v);
    }
    for (const c of [].concat(kids)) if (c != null) n.append(c);
    return n;
  };
  const svg = (tag, attrs = {}, text) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const LABEL = {
    us: 'United States', canada: 'Canada', latam: 'Latin America', europe: 'Europe', middle_east: 'Middle East',
    asia_pacific: 'Asia Pacific', china: 'China', africa: 'Africa', global: 'Global',
    rumoured: 'Rumoured', announced: 'Announced', permitted: 'Permitted', under_construction: 'Under construction',
    partially_live: 'Partially live', live: 'Live', delayed: 'Delayed', paused: 'Paused', cancelled: 'Cancelled',
    nvidia: 'Nvidia', amd: 'AMD', google: 'Google TPU', amazon: 'AWS Trainium', microsoft: 'Microsoft Maia', meta: 'Meta MTIA',
    openai: 'OpenAI', broadcom: 'Broadcom custom', intel: 'Intel', qualcomm: 'Qualcomm', cerebras: 'Cerebras', groq: 'Groq',
    huawei: 'Huawei', other: 'Other', undisclosed: 'Undisclosed', unspecified: 'unspecified',
    verified: 'Verified', sourced: 'Sourced',
  };
  const lab = (k) => LABEL[k] || k;
  const CHIP_ORDER = ['nvidia', 'amd', 'google', 'amazon', 'microsoft', 'meta', 'openai', 'broadcom'];
  const STATUS_ORDER = ['live', 'partially_live', 'under_construction', 'permitted', 'announced', 'delayed', 'paused', 'cancelled'];
  const gw = (mw) => {
    const g = mw / 1000;
    return g >= 100 ? g.toFixed(0) : g >= 10 ? g.toFixed(1) : g.toFixed(2);
  };
  const fmtMW = (mw) => (mw == null ? '' : Math.round(mw).toLocaleString('en-US'));

  let DS, phaseById, state;
  const defaults = () => ({ kind: '', stage: '', region: '', us_state: '', chip: '', role: 'operator', measure: 'facility_mw', q: '',
    period: 'year', group: 'chip_vendor', sort: { key: 'mw', dir: -1 }, open: new Set() });

  const entName = (id) => (DS.entities[id] && DS.entities[id].name) || id;
  const roleLabel = (p, role) => (p.roles[role] || []).map(entName).join(' + ') || 'Not disclosed';
  const mwOf = (p, measure) => (measure === 'it_mw' ? p.derived.it_mw : p.derived.facility_mw);
  const counted = (p) => p.counted !== false;
  const isDeal = (p) => p.kind === 'deal';
  const estimated = (p) => isDeal(p) && p.location_basis === 'estimated';
  const stageOf = (p) => (isDeal(p) ? 'agreement' : p.status === 'live' || p.status === 'partially_live' ? 'operating'
    : p.status === 'under_construction' ? 'construction' : p.status === 'permitted' ? 'permitted' : p.status === 'rumoured' ? 'rumoured'
    : p.status === 'cancelled' ? 'cancelled' : 'announced');
  const STAGE = { operating: 'Operating', construction: 'Under construction', permitted: 'Permitted, not started', announced: 'Paper: announced site',
    agreement: 'Paper: agreement with no site', rumoured: 'Paper: reported, unconfirmed', cancelled: 'Cancelled' };
  const passStage = (p) => { const s = stageOf(p), f = state.stage; return !f || (f === 'real' ? s === 'operating' || s === 'construction' : f === 'paper' ? s === 'announced' || s === 'agreement' || s === 'rumoured' : s === f); };
  const kindLabel = (p) => (!isDeal(p) ? 'Named sites' : estimated(p) ? 'Agreements with no site, location estimated' : 'Agreements with no site, country stated');

  function passPhase(p) {
    if (state.kind && (state.kind === 'estimated' ? !estimated(p) : (state.kind === 'deal') !== isDeal(p))) return false;
    if (state.region && p.region !== state.region) return false;
    if (state.us_state && p.us_state !== state.us_state) return false;
    if (!passStage(p)) return false;
    if (state.chip && !(p.chips || []).some((c) => c.vendor === state.chip)) return false;
    if (state.q) {
      const hay = [p.site_name, p.phase_name, p.city, p.county, p.us_state, p.country,
        ...Object.values(p.roles).flat().map(entName), ...(p.chips || []).map((c) => `${lab(c.vendor)} ${c.family} ${c.model || ''}`)]
        .join(' ').toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }
  const rowsNow = () => DS.deployments.filter((d) => passPhase(phaseById[d.id]) && (!state.chip || d.chip_vendor === state.chip));
  const groupKey = (d, g) => {
    const p = phaseById[d.id];
    if (g === 'company') return roleLabel(p, state.role);
    if (g === 'chip_family') return d.chip_vendor === 'undisclosed' ? 'Undisclosed' : `${lab(d.chip_vendor)} ${d.chip_family === 'unspecified' ? '(family n/a)' : d.chip_family.replace(/_/g, ' ')}`;
    if (g === 'us_state') return p.us_state || (p.region === 'us' && isDeal(p) ? 'US, state not known (agreements)' : 'Outside US');
    if (g === 'kind') return kindLabel(p);
    if (g === 'stage') return STAGE[stageOf(p)];
    if (g === 'chip_vendor') return lab(d.chip_vendor);
    return lab(g === 'region' ? p.region : p.status);
  };

  // Colour follows the entity: slots are assigned once from the full dataset, never from the filtered view.
  const colorMaps = {};
  function buildColors() {
    for (const g of ['chip_vendor', 'chip_family', 'company', 'region', 'us_state', 'status', 'kind', 'stage']) {
      const totals = new Map();
      for (const d of DS.deployments) {
        const k = groupKey(d, g);
        totals.set(k, (totals.get(k) || 0) + (d.facility_mw || 0));
      }
      let keys = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
      if (g === 'chip_vendor') keys = CHIP_ORDER.map(lab).filter((k) => totals.has(k)).concat(keys.filter((k) => !CHIP_ORDER.map(lab).includes(k)));
      if (g === 'status') keys = STATUS_ORDER.map(lab).filter((k) => totals.has(k));
      if (g === 'stage') keys = Object.values(STAGE).filter((k) => totals.has(k));
      const m = new Map();
      keys.filter((k) => !/^(Undisclosed|Not disclosed|Outside US|Other)$/.test(k)).slice(0, 7).forEach((k, i) => m.set(k, `var(--s${i + 1})`));
      colorMaps[g] = m;
    }
  }
  const colorOf = (g, k) => colorMaps[g].get(k) || 'var(--other)';

  // ---------------------------------------------------------------- tooltip
  const tip = $('#tip');
  function showTip(evt, title, rows) {
    tip.replaceChildren(el('b', { text: title }), ...rows.map(([c, k, v]) =>
      el('div', { class: 'r' }, [el('span', {}, [c ? el('i', { class: 'sw', style: `background:${c}` }) : null, k]), el('span', { text: v })])));
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(evt.clientX + 14, innerWidth - r.width - 8) + 'px';
    tip.style.top = Math.max(8, Math.min(evt.clientY + 14, innerHeight - r.height - 8)) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------------------------------------------------------------- charts
  const niceMax = (v) => {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 4, 8, 10]) if (v <= m * p) return m * p;
    return 10 * p;
  };

  function drawTime() {
    const host = $('#chart-time'), legend = $('#legend-time');
    const m = state.measure, g = state.group, quarterly = state.period === 'quarter';
    const rows = rowsNow().filter((d) => d[m] != null);
    const dated = rows.filter((d) => d.year != null);
    const undated = rows.filter((d) => d.year == null).reduce((s, d) => s + d[m], 0);
    const pk = (d) => (quarterly ? (d.quarter ? `${d.year} Q${d.quarter}` : `${d.year} Q?`) : String(d.year));
    const order = (k) => { const [y, q] = k.split(' '); return +y * 10 + (q ? (q === 'Q?' ? 5 : +q[1]) : 0); };
    const periods = [...new Set(dated.map(pk))].sort((a, b) => order(a) - order(b));
    if (!quarterly && periods.length) {
      const ys = periods.map(Number);
      periods.length = 0;
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++) periods.push(String(y));
    }
    const totals = new Map();
    dated.forEach((d) => { const k = groupKey(d, g); totals.set(k, (totals.get(k) || 0) + d[m]); });
    const named = [...colorMaps[g].keys()].filter((k) => totals.has(k));
    const rest = [...totals.keys()].filter((k) => !colorMaps[g].has(k));
    const series = named.concat(rest.length > 1 ? ['Other'] : rest);
    const fold = (k) => (colorMaps[g].has(k) || rest.length <= 1 ? k : 'Other');
    const cell = new Map();
    dated.forEach((d) => { const key = pk(d) + '|' + fold(groupKey(d, g)); cell.set(key, (cell.get(key) || 0) + d[m]); });
    $('#c1-sub').textContent = `${m === 'it_mw' ? 'IT' : 'Facility'} GW placed in the period it energizes.` +
      (undated > 0 ? ` A further ${gw(undated)} GW in this filter has no date yet and is not drawn.` : '') +
      (quarterly ? ' "Q?" holds capacity dated to a year only.' : '');
    host.replaceChildren(); legend.replaceChildren();
    if (!periods.length) { host.append(el('div', { class: 'empty', text: 'No dated capacity matches these filters.' })); return; }

    const W = Math.max(host.clientWidth || 900, 320), H = 320, L = 44, R = 12, T = 22, B = 30;
    const colTotals = periods.map((p) => series.reduce((s, k) => s + (cell.get(p + '|' + k) || 0), 0));
    const max = niceMax(Math.max(...colTotals) / 1000) * 1000;
    const band = (W - L - R) / periods.length, bw = Math.min(24, band * 0.7);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Stacked column chart of capacity energizing by period. The same data is in the downloadable Deployment sheet.' });
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      root.append(svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: i ? 'gridline' : 'axis' }));
      root.append(svg('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, (v / 1000).toLocaleString('en-US')));
    }
    root.append(svg('text', { x: L - 8, y: 10, 'text-anchor': 'end' }, 'GW'));
    const every = Math.ceil(periods.length / Math.max(1, Math.floor((W - L - R) / 62)));
    periods.forEach((p, i) => {
      const cx = L + band * (i + 0.5);
      const col = svg('g', { class: 'col' });
      let acc = 0;
      const segs = series.map((k) => [k, cell.get(p + '|' + k) || 0]).filter(([, v]) => v > 0);
      segs.forEach(([k, v], j) => {
        const y1 = y(acc + v), y0 = y(acc), h = Math.max(0, y0 - y1 - (j < segs.length - 1 ? 2 : 0));
        const top = j === segs.length - 1, r = top ? Math.min(4, h) : 0;
        const x = cx - bw / 2, yy = y0 - h;
        col.append(svg('path', { fill: colorOf(g, k), d: `M${x},${y0}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bw - r}Q${x + bw},${yy} ${x + bw},${yy + r}V${y0}Z` }));
        acc += v;
      });
      if (colTotals[i] > 0 && periods.length <= 16) col.append(svg('text', { x: cx, y: y(colTotals[i]) - 6, 'text-anchor': 'middle', class: 'val' }, gw(colTotals[i])));
      const hit = svg('rect', { x: cx - band / 2, y: T, width: band, height: H - T - B, class: 'hit', tabindex: 0, 'aria-label': `${p}: ${gw(colTotals[i])} GW` });
      const show = (e) => showTip(e, p, segs.slice().reverse().map(([k, v]) => [colorOf(g, k), k, gw(v) + ' GW']).concat([[null, 'Total', gw(colTotals[i]) + ' GW']]));
      hit.addEventListener('mousemove', show); hit.addEventListener('mouseleave', hideTip);
      hit.addEventListener('focus', () => { const b = hit.getBoundingClientRect(); show({ clientX: b.left + b.width / 2, clientY: b.top + 20 }); });
      hit.addEventListener('blur', hideTip);
      root.append(col, hit);
      if (i % every === 0) root.append(svg('text', { x: cx, y: H - 10, 'text-anchor': 'middle' }, p));
    });
    host.append(root);
    if (series.length > 1) series.forEach((k) => legend.append(el('span', {}, [el('i', { class: 'sw', style: `background:${colorOf(g, k)}` }), k])));
  }

  function drawBars(hostSel, keyFn, emptyText, limit = 12) {
    const host = $(hostSel), m = state.measure;
    const totals = new Map();
    rowsNow().forEach((d) => { if (d[m] == null) return; const k = keyFn(d); if (k == null) return; totals.set(k, (totals.get(k) || 0) + d[m]); });
    let items = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    if (items.length > limit) {
      const tail = items.slice(limit - 1);
      items = items.slice(0, limit - 1).concat([[`Other (${tail.length})`, tail.reduce((s, x) => s + x[1], 0)]]);
    }
    host.replaceChildren();
    if (!items.length) { host.append(el('div', { class: 'empty', text: emptyText })); return; }
    const W = Math.max(host.clientWidth || 480, 280), rowH = 28, L = Math.min(190, W * 0.42), R = 56, H = items.length * rowH + 6;
    const max = Math.max(...items.map((x) => x[1]));
    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Bar chart; the same figures are in the table below.' });
    root.append(svg('line', { x1: L, x2: L, y1: 0, y2: H, class: 'axis' }));
    items.forEach(([k, v], i) => {
      const cy = i * rowH + rowH / 2 + 3, w = Math.max(2, (W - L - R) * (v / max)), h = 14, r = Math.min(4, w);
      const name = k.length > 26 ? k.slice(0, 25) + '…' : k;
      root.append(svg('text', { x: L - 8, y: cy + 4, 'text-anchor': 'end' }, name));
      const bar = svg('path', { fill: 'var(--s1)', d: `M${L},${cy - h / 2}H${L + w - r}Q${L + w},${cy - h / 2} ${L + w},${cy - h / 2 + r}V${cy + h / 2 - r}Q${L + w},${cy + h / 2} ${L + w - r},${cy + h / 2}H${L}Z` });
      root.append(bar, svg('text', { x: L + w + 6, y: cy + 4, class: 'val' }, gw(v)));
      const hit = svg('rect', { x: 0, y: i * rowH + 3, width: W, height: rowH, class: 'hit' });
      hit.addEventListener('mousemove', (e) => showTip(e, k, [[null, state.measure === 'it_mw' ? 'IT' : 'Facility', gw(v) + ' GW'], [null, 'Share of filter', Math.round((v / items.reduce((s, x) => s + x[1], 0)) * 100) + '%']]));
      hit.addEventListener('mouseleave', hideTip);
      root.append(hit);
    });
    host.append(root);
  }

  // ---------------------------------------------------------------- pivot table
  function drawPivot() {
    const m = state.measure, g = state.group, quarterly = state.period === 'quarter';
    const rows = rowsNow().filter((d) => d[m] != null);
    const pk = (d) => (d.year == null ? 'Undated' : quarterly ? (d.quarter ? `${d.year} Q${d.quarter}` : `${d.year} Q?`) : String(d.year));
    const order = (k) => { if (k === 'Undated') return 1e9; const [y, q] = k.split(' '); return +y * 10 + (q ? (q === 'Q?' ? 5 : +q[1]) : 0); };
    const cols = [...new Set(rows.map(pk))].sort((a, b) => order(a) - order(b));
    const cell = new Map(), tot = new Map();
    rows.forEach((d) => { const k = groupKey(d, g), c = pk(d); cell.set(k + '|' + c, (cell.get(k + '|' + c) || 0) + d[m]); tot.set(k, (tot.get(k) || 0) + d[m]); });
    const keys = [...tot.keys()].sort((a, b) => tot.get(b) - tot.get(a));
    const thead = $('#t-pivot thead'), tbody = $('#t-pivot tbody');
    const label = $('#c-group').selectedOptions[0].text;
    $('#pv-sub').textContent = `${m === 'it_mw' ? 'IT' : 'Facility'} GW energizing in each ${quarterly ? 'quarter' : 'year'}, by ${label.toLowerCase()}. Uses the period and split chosen above and the current filters.`;
    thead.replaceChildren(el('tr', {}, [el('th', { text: label, scope: 'col', style: 'cursor:default' }), ...cols.map((c) => el('th', { text: c, class: 'num', scope: 'col', style: 'cursor:default' })), el('th', { text: 'Total', class: 'num', scope: 'col', style: 'cursor:default' })]));
    tbody.replaceChildren();
    if (!keys.length) { tbody.append(el('tr', {}, el('td', { colspan: cols.length + 2, class: 'empty', text: 'Nothing matches these filters.' }))); return; }
    const f = (v) => (v ? (v / 1000).toFixed(v < 100 ? 3 : 2) : '');
    for (const k of keys) tbody.append(el('tr', {}, [el('td', { text: k }), ...cols.map((c) => el('td', { class: 'num', text: f(cell.get(k + '|' + c)) })), el('td', { class: 'num', text: f(tot.get(k)) })]));
    tbody.append(el('tr', { class: 'total' }, [el('td', { text: 'Total' }), ...cols.map((c) => el('td', { class: 'num', text: f(keys.reduce((s, k) => s + (cell.get(k + '|' + c) || 0), 0)) })), el('td', { class: 'num', text: f([...tot.values()].reduce((a, b) => a + b, 0)) })]));
  }

  // ---------------------------------------------------------------- tiles
  function drawTiles() {
    const showCancelled = state.stage === 'cancelled';
    const m = state.measure, ps = DS.phases.filter(passPhase).filter((p) => counted(p) || (showCancelled && p.status === 'cancelled'));
    const sum = (f) => ps.filter(f).reduce((s, p) => s + (mwOf(p, m) || 0), 0);
    const all = sum(() => true), live = sum((p) => p.status === 'live' || p.status === 'partially_live'), uc = sum((p) => p.status === 'under_construction' || p.status === 'permitted');
    const sites = ps.filter((p) => !isDeal(p)), dealMW = sum(isDeal), estMW = sum(estimated);
    const tiles = [
      [showCancelled ? 'Cancelled capacity (not in totals)' : 'Capacity tracked', gw(all) + ' GW', `${gw(all - dealMW)} GW at ${new Set(sites.map((p) => p.site_id)).size} named sites plus ${gw(dealMW)} GW under agreements with no site yet`],
      ['Agreements with no site', gw(dealMW) + ' GW', `Only the part not already at a named site. ${gw(estMW)} GW of it has an estimated location; the rest has a stated country`],
      ['Operating', gw(live) + ' GW', 'Live or partly live. Full phase size, including parts still ramping'],
      ['Under construction', gw(sum((p) => stageOf(p) === 'construction')) + ' GW', `Plus ${gw(sum((p) => stageOf(p) === 'permitted'))} GW permitted and not started`],
      ['Paper stage', gw(sum((p) => ['announced', 'agreement', 'rumoured'].includes(stageOf(p)))) + ' GW', 'Announced sites not yet started, unconfirmed reports, and agreements with no site'],
    ];
    $('#tiles').replaceChildren(...tiles.map(([k, v, n]) => el('div', { class: 'tile' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), el('div', { class: 'n', text: n })])));
  }

  // ---------------------------------------------------------------- tables
  const chipText = (cs) => (cs || []).map((c) => `${lab(c.vendor)}${c.model && !lab(c.vendor).includes(c.model) ? ' ' + c.model : c.family && c.family !== 'unspecified' ? ' ' + c.family.replace(/_/g, ' ') : ''}`).join(', ');
  const when = (p) => p.timeline.full_capacity || p.timeline.first_power || ((p.timeline.ramp || []).slice(-1)[0] || {}).period || '';
  const srcLink = (s) => el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.publisher || 'Source' });
  const COLS = [
    ['site', 'Site and phase', (p) => p.site_name + ' ' + p.phase_name],
    ['loc', 'Location', (p) => (p.us_state || p.country || '') + (p.city || '')],
    ['company', 'Company', (p) => roleLabel(p, state.role)],
    ['status', 'Status', (p) => STATUS_ORDER.indexOf(p.status)],
    ['mw', 'MW', (p) => mwOf(p, state.measure) || 0, 'num'],
    ['when', 'Energizes', (p) => String(when(p))],
    ['chips', 'Chips', (p) => chipText(p.chips)],
    ['src', 'Source', (p) => (p.sources[0] || {}).date || ''],
  ];
  function drawPhases() {
    const thead = $('#t-phases thead'), tbody = $('#t-phases tbody');
    const ps = DS.phases.filter(passPhase);
    const col = COLS.find((c) => c[0] === state.sort.key) || COLS[4];
    ps.sort((a, b) => { const x = col[2](a), y = col[2](b); return (x > y ? 1 : x < y ? -1 : 0) * state.sort.dir; });
    $('#t-sub').textContent = `${ps.length} of ${DS.phases.length} rows. MW shown is ${state.measure === 'it_mw' ? 'IT' : 'facility'} load; a dotted underline marks a derived figure. Select a row for sources and detail.`;
    thead.replaceChildren(el('tr', {}, COLS.map(([k, t, , cls]) => {
      const th = el('th', { text: k === 'company' ? `Company (${$('#f-role').selectedOptions[0].text.toLowerCase()})` : t, tabindex: 0, class: cls || '', scope: 'col' });
      if (state.sort.key === k) th.setAttribute('aria-sort', state.sort.dir > 0 ? 'ascending' : 'descending');
      const go = () => { state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (cls ? -1 : 1) }; drawPhases(); };
      th.addEventListener('click', go); th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return th;
    })));
    tbody.replaceChildren();
    if (!ps.length) { tbody.append(el('tr', {}, el('td', { colspan: COLS.length, class: 'empty', text: 'No phases match these filters.' }))); return; }
    for (const p of ps) {
      const mw = mwOf(p, state.measure), basis = state.measure === 'it_mw' ? p.derived.it_basis : p.derived.facility_basis;
      const derived = basis && /estimated|treated|used as/.test(basis);
      const tr = el('tr', { class: 'row', tabindex: 0, 'aria-expanded': state.open.has(p.id) }, [
        el('td', {}, [el('div', { class: 'site', text: p.site_name }), isDeal(p) ? el('span', { class: 'tag deal', text: 'Agreement, no site' }) : (p.phase_name && p.phase_name !== p.site_name ? el('div', { class: 'dim', text: p.phase_name }) : null)]),
        isDeal(p) ? el('td', {}, [lab(p.region) === 'United States' ? 'United States' : `${p.country || ''} (${lab(p.region)})`, el('div', {}, el('span', { class: 'tag ' + (estimated(p) ? 'estimate' : 'stated'), title: p.location_why || '', text: estimated(p) ? 'Estimate' : 'Stated' }))]) : el('td', {}, [[p.city, p.us_state].filter(Boolean).join(', ') || '', el('div', { class: 'dim', text: p.region === 'us' ? (p.county ? p.county + ' County' : '') : p.country || '' })]),
        el('td', { text: roleLabel(p, state.role) }),
        el('td', {}, [el('span', { class: 'badge ' + p.status }, [el('i'), lab(p.status)]), counted(p) ? null : el('div', { class: 'dim', text: 'Not counted' })]),
        el('td', { class: 'num' }, mw == null ? el('span', { class: 'dim', text: 'n/a' }) : el('span', derived ? { class: 'est', title: basis, text: fmtMW(mw) } : { text: fmtMW(mw) })),
        el('td', { text: when(p) || 'Not dated' }),
        el('td', { text: chipText(p.chips) || 'Not disclosed' }),
        el('td', {}, p.sources[0] ? [srcLink(p.sources[0]), el('div', { class: 'dim', text: `${p.sources[0].date || ''} · ${lab(p.verification)}` })] : ''),
      ]);
      const toggle = () => { state.open.has(p.id) ? state.open.delete(p.id) : state.open.add(p.id); drawPhases(); };
      tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') toggle(); });
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') toggle(); });
      tbody.append(tr);
      if (state.open.has(p.id)) tbody.append(detailRow(p));
    }
  }
  function detailRow(p) {
    const dl = el('dl');
    const add = (k, v) => { if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) dl.append(el('dt', { text: k }), el('dd', {}, v)); };
    const c = p.capacity || {}, d = p.derived, t = p.timeline || {}, pw = p.power || {}, mo = p.money || {};
    if (isDeal(p)) add(estimated(p) ? 'Location (estimated)' : 'Location (country stated)', p.location_why);
    add('Stated capacity', c.stated_mw != null ? `${fmtMW(c.stated_mw)} MW (${c.stated_basis || 'basis unspecified'})` : null);
    add('Facility / IT', d.facility_mw != null ? `${fmtMW(d.facility_mw)} MW facility (${d.facility_basis}); ${fmtMW(d.it_mw)} MW IT (${d.it_basis})` : null);
    add('Campus plan', p.campus_planned_mw ? `${fmtMW(p.campus_planned_mw)} MW at full build-out` : null);
    for (const r of ['developer', 'owner', 'operator', 'tenant', 'end_customer', 'financing', 'power_supplier', 'builder', 'hardware_partner']) {
      if ((p.roles[r] || []).length) add(r.replace('_', ' ').replace(/^./, (x) => x.toUpperCase()), p.roles[r].map(entName).join(', '));
    }
    add('Timeline', [['Announced', t.announced], ['Construction start', t.construction_start], ['First power', t.first_power], ['Full capacity', t.full_capacity]].filter((x) => x[1]).map((x) => `${x[0]} ${x[1]}`).join(' · '));
    add('Ramp', (t.ramp || []).map((r) => `${r.period}: ${fmtMW(r.cumulative_mw)} MW${r.basis === 'estimated' ? ' (est.)' : ''}`).join(' · '));
    add('Chips', (p.chips || []).map((x) => `${lab(x.vendor)} ${x.model || x.family || ''}${x.units ? ', ' + x.units.toLocaleString('en-US') + ' units' : ''}${x.basis === 'estimated' ? ' (est.)' : ''}`).join(' · '));
    add('Power', [(pw.sources || []).join(', ').replace(/_/g, ' '), pw.behind_the_meter ? 'behind the meter' : '', p.grid_region, p.utility].filter(Boolean).join(' · '));
    add('Money', [mo.capex_usd_m ? `Capex $${(mo.capex_usd_m / 1000).toLocaleString('en-US')}bn` : '', mo.contract_value_usd_m ? `Contract $${(mo.contract_value_usd_m / 1000).toLocaleString('en-US')}bn` : ''].filter(Boolean).join(' · '));
    add('Estimates', Object.entries(p.estimated || {}).map(([k, v]) => `${k}: ${v}`).join(' · '));
    add('Not counted', counted(p) ? null : p.count_note);
    add('Reconciliation', p.resolution);
    add('Confidence', `${p.confidence || 'n/a'} · ${lab(p.verification)} · updated ${p.updated}`);
    add('Notes', p.notes);
    add('Sources', p.sources.map((s) => el('div', {}, [srcLink(s), ` ${s.title ? '· ' + s.title : ''} (${s.date || 'n.d.'}, ${String(s.type || '').replace(/_/g, ' ')})`, s.quote ? el('blockquote', { text: s.quote }) : null])));
    return el('tr', { class: 'detail' }, el('td', { colspan: COLS.length }, dl));
  }
  function drawDeals() {
    const head = ['Agreement', 'Buyer', 'Seller', 'GW', 'Likely location', 'In the totals', 'Chips', 'Schedule', 'Announced', 'Source'];
    $('#t-deals thead').replaceChildren(el('tr', {}, head.map((h, i) => el('th', { text: h, class: i === 3 ? 'num' : '', scope: 'col', style: 'cursor:default' }))));
    const body = $('#t-deals tbody');
    body.replaceChildren();
    const deals = DS.deals.slice().sort((a, b) => (b.capacity_mw || 0) - (a.capacity_mw || 0));
    if (!deals.length) { body.append(el('tr', {}, el('td', { colspan: head.length, class: 'empty', text: 'No sourced deals yet.' }))); return; }
    for (const d of deals) {
      const pt = d.parties || {}, s = d.sources[0], lo = d.location || {};
      body.append(el('tr', {}, [
        el('td', {}, [el('div', { class: 'site', text: d.name }), el('div', { class: 'dim', text: String(d.type || '').replace(/_/g, ' ') })]),
        el('td', { text: (pt.buyer || []).map(entName).join(', ') }), el('td', { text: (pt.seller || []).map(entName).join(', ') }),
        el('td', { class: 'num', text: d.capacity_mw ? gw(d.capacity_mw) : 'n/a' }),
        el('td', {}, lo.region ? [lab(lo.region) === 'United States' ? 'United States' : [lo.country, lab(lo.region)].filter(Boolean).join(', '), el('div', {}, el('span', { class: 'tag ' + (lo.basis === 'estimated' ? 'estimate' : 'stated'), title: lo.why || '', text: lo.basis === 'estimated' ? 'Estimate' : 'Stated' })), el('div', { class: 'dim', text: lo.why || '' })] : ''),
        el('td', {}, [lo.unsited_mw >= 1 ? el('b', { text: gw(lo.unsited_mw) + ' GW added' }) : el('span', { text: lo.treatment === 'count' ? 'Counted at sites' : lo.treatment === 'dropped' ? 'Dropped or superseded' : 'Nothing added' }), el('div', { class: 'dim', text: lo.treatment === 'count' ? ((lo.unsited_mw >= 1 ? 'Already counted: ' : 'All of it is already counted: ') + ((lo.deductions || []).join('; ') || 'at named sites')) : String(lo.treatment_text || '').replace(/^Not added: /, '') }), lo.note ? el('div', { class: 'dim', text: lo.note }) : null, lo.dropped_source ? el('div', {}, ['Source: ', el('a', { href: lo.dropped_source.url, target: '_blank', rel: 'noopener', text: `${lo.dropped_source.publisher}, ${lo.dropped_source.date}` })]) : null]),
        el('td', { text: chipText(d.chips) }),
        el('td', { text: (d.schedule || []).filter((x) => x.cumulative_mw > 0).map((x) => `${x.period}: ${gw(x.cumulative_mw)} GW`).join(' · ') || 'Not given' }),
        el('td', { text: d.announced || '' }),
        el('td', {}, s ? [srcLink(s), el('div', { class: 'dim', text: lab(d.verification) })] : ''),
      ]));
    }
  }

  // ---------------------------------------------------------------- wiring
  function render() {
    drawTiles(); drawTime(); drawPivot();
    drawBars('#chart-state', (d) => phaseById[d.id].us_state || null, 'No US capacity matches these filters.');
    $('#c3-title').textContent = `By company (${$('#f-role').selectedOptions[0].text.toLowerCase()})`;
    drawBars('#chart-company', (d) => roleLabel(phaseById[d.id], state.role), 'Nothing matches these filters.');
    drawPhases();
  }
  function fill(sel, values, all) {
    $(sel).replaceChildren(el('option', { value: '', text: all }), ...values.map((v) => el('option', { value: v, text: lab(v) })));
  }
  function init(ds) {
    DS = ds; phaseById = Object.fromEntries(ds.phases.map((p) => [p.id, p])); state = defaults();
    buildColors();
    const uniq = (f) => [...new Set(ds.phases.map(f).filter(Boolean))].sort();
    fill('#f-region', uniq((p) => p.region), 'All regions');
    fill('#f-state', uniq((p) => p.us_state), 'All states');
    fill('#f-chip', [...new Set(ds.phases.flatMap((p) => (p.chips || []).map((c) => c.vendor)))].sort(), 'All vendors');
    const bind = (sel, key, ev = 'change') => $(sel).addEventListener(ev, (e) => { state[key] = e.target.value; if (key === 'us_state' && e.target.value) { state.region = 'us'; $('#f-region').value = 'us'; } render(); });
    bind('#f-kind', 'kind'); bind('#f-region', 'region'); bind('#f-state', 'us_state'); bind('#f-stage', 'stage'); bind('#f-chip', 'chip');
    bind('#f-role', 'role'); bind('#f-measure', 'measure'); bind('#f-q', 'q', 'input'); bind('#c-period', 'period'); bind('#c-group', 'group');
    $('#f-reset').addEventListener('click', () => {
      const keep = { period: state.period, group: state.group };
      state = Object.assign(defaults(), keep);
      for (const [sel, key] of [['#f-kind', 'kind'], ['#f-region', 'region'], ['#f-state', 'us_state'], ['#f-stage', 'stage'], ['#f-chip', 'chip'], ['#f-role', 'role'], ['#f-measure', 'measure'], ['#f-q', 'q']]) $(sel).value = state[key];
      render();
    });
    $('#stamp').textContent = `Updated ${ds.generated.slice(0, 10)} · ${ds.phases.filter((p) => !isDeal(p)).length} sourced site phases, ${ds.deals.length} agreements`;
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 120); });
    drawDeals(); render();
  }
  fetch('data/tracker.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
    .catch((e) => { $('#stamp').textContent = 'Data failed to load (' + e.message + '). Refresh to try again.'; });
})();
