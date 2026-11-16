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

  // ---- rows (one per site phase or agreement remainder, excluding China)
  let F = {};
  const R = (row) => { const o = {}; D.row_fields.forEach((k, i) => { o[k] = row[i]; }); return o; };
  const KEY = { chip: 'chip', operator: 'operator', end_user: 'end_user', site: 'site' };
  const nameOf = (tab, n) => (tab === 'chip' ? CHIP[n] || n : n);
  const stTok = (st) => (/^In/.test(st) ? 'op' : /^Partly/.test(st) ? 'uc' : /^Before/.test(st) ? 'pm' : 'pp');

  // ---- drawer (shares the page's breakdown panel)
  function openList({ kicker, title, value, sub, items, yearIdx }) {
    const dlg = $('#bk'); if (!dlg) return;
    const val = (o) => (yearIdx == null ? o.counted : o.counted_by_year[yearIdx]);
    const list = items.slice().sort((a, b) => val(b) - val(a) || b.it_gw - a.it_gw);
    $('#bk-k').textContent = kicker; $('#bk-who').textContent = title;
    $('#bk-v').replaceChildren(el('b', { text: f2(value) }), ' GW ', el('span', { class: 'dim', text: 'IT · Estimate' }));
    $('#bk-sub').textContent = sub;
    $('#bk-list').replaceChildren(...list.map((o) => el('li', { class: 'bk-item' }, [
      el('div', { class: 'bk-top' }, [el('div', { class: 'bk-name' }, [el('span', { text: o.site }), o.phase ? el('span', { class: 'dim', text: ' · ' + o.phase }) : null]), el('div', { class: 'bk-mw', text: f2(val(o)) })]),
      el('div', { class: 'bk-meta' }, [el('span', { class: 'tk sm tk-st-' + stTok(o.status), text: o.status }), el('span', { class: 'dim', text: [o.us_state, o.area].filter(Boolean).join(', ') }), el('span', { class: 'dim', text: o.stage }),
        el('span', { class: 'dim', text: `${f2(o.it_gw)} GW announced` })]),
      o.reason ? el('div', { class: 'bk-why', text: o.reason }) : null,
      o.source_url ? el('div', { class: 'bk-src' }, [el('span', { class: 'dim', text: 'Source ' }), el('a', { href: o.source_url, target: '_blank', rel: 'noopener', text: host(o.source_url) })]) : null])));
    const tot = list.reduce((a, o) => a + val(o), 0);
    $('#bk-sum').replaceChildren(el('span', { text: `Sum of ${list.length} ${list.length === 1 ? 'row' : 'rows'}` }), el('b', { text: f2(tot) + ' GW' }));
    dlg.hidden = false; document.body.classList.add('bk-on');
    requestAnimationFrame(() => { dlg.classList.add('on'); $('#bk-x').focus(); });
    $('#bk-list').scrollTop = 0;
  }
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Source'; } };
  const openYear = (i, pred = () => true, what = 'Named sites counted') => {
    const items = F.rows.filter((o) => o.counted_by_year[i] > 0.0005 && pred(o));
    openList({ kicker: `Likely energized · ${D.years[i]}`, title: what, value: items.reduce((a, o) => a + o.counted_by_year[i], 0), yearIdx: i, items,
      sub: `${items.length} sites and agreements counted in ${D.years[i]}, largest first, each with the reason it is in. ${f1(D.summary.estimate[i])} GW more that year is an Estimate of capacity not yet at a named site in the tracker, so it is not listed here.` });
  };
  const clickable = (td, fn) => { td.classList.add('pick'); td.tabIndex = 0; td.setAttribute('role', 'button'); td.addEventListener('click', fn); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); return td; };

  function drawChart() {
    const host_ = $('#lk-chart'), s = D.summary, ys = D.years;
    const W = Math.max(320, host_.clientWidth || 800), H = W < 560 ? 280 : 340, padL = W < 560 ? 30 : 44, padR = 8, padT = 34, padB = 34;
    const max = Math.max(...s.total) * 1.12, nice = max <= 20 ? 5 : max <= 50 ? 10 : 20, top = Math.ceil(max / nice) * nice;
    const x0 = padL, cw = (W - padL - padR) / ys.length, bw = Math.min(72, cw * 0.56), y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const root = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'lk-svg' });
    const defs = sv('defs'), pat = sv('pattern', { id: 'lk-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.append(sv('rect', { width: 6, height: 6, fill: 'color-mix(in srgb, var(--warn) 18%, transparent)' }), sv('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'color-mix(in srgb, var(--warn) 75%, transparent)', 'stroke-width': 2 }));
    defs.append(pat); root.append(defs);
    for (let v = 0; v <= top; v += nice) { root.append(sv('line', { x1: x0, x2: W - padR, y1: y(v), y2: y(v), class: 'lk-grid' })); root.append(sv('text', { x: x0 - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'lk-ax' }, String(v))); }
    ys.forEach((yr, i) => {
      const cx = x0 + cw * i + cw / 2, a = s.at_sites[i], e = s.estimate[i], t = s.total[i];
      const g = sv('g', { class: 'lk-bar', tabindex: 0, role: 'button', 'aria-label': `${yr}: ${f1(t)} GW likely, ${f1(a)} at named sites, ${f1(e)} Estimate not at a named site. Show the sites` });
      g.append(sv('rect', { x: cx - cw / 2, y: padT - 20, width: cw, height: H - padT + 20 - padB + 24, fill: 'transparent' }));
      if (e > 0.01) g.append(sv('rect', { x: cx - bw / 2, y: y(a + e), width: bw, height: Math.max(0, y(a) - y(a + e)), fill: 'url(#lk-hatch)' }));
      g.append(sv('rect', { x: cx - bw / 2, y: y(a), width: bw, height: Math.max(0, y(0) - y(a)), fill: 'var(--s1)' }));
      g.append(sv('text', { x: cx, y: y(t) - 10, 'text-anchor': 'middle', class: 'lk-val' }, f1(t)));
      g.append(sv('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'lk-yr' }, String(yr)));
      g.append(sv('title', {}, `${yr}: ${f1(t)} GW likely\n${f1(a)} GW at named sites\n${f1(e)} GW Estimate: not at a named site\nClick to see the sites`));
      const go = () => openYear(i); g.addEventListener('click', go); g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      root.append(g);
    });
    root.append(sv('text', { x: x0 - 8, y: 14, 'text-anchor': 'end', class: 'lk-ax' }, 'GW'));
    host_.replaceChildren(root);
    $('#lk-legend').replaceChildren(el('span', {}, [el('i', { class: 'lk-sw solid' }), 'At named sites in the tracker']), el('span', {}, [el('i', { class: 'lk-sw hatch' }), 'Estimate: capacity not yet at a named site']), el('span', { class: 'dim' }, 'Click a bar to see the sites counted that year'));
  }

  const head = (first, extra = []) => el('tr', {}, [el('th', { scope: 'col', text: first }), ...D.years.map((y) => el('th', { class: 'num', scope: 'col', text: String(y) })), el('th', { class: 'num tot', scope: 'col', text: '2025–30' }), ...extra.map((t) => el('th', { class: 'num', scope: 'col', text: t }))]);
  const line = (name, vals, cls = '', extra = [], onCell = null) => el('tr', { class: cls }, [el('td', { title: name }, name),
    ...vals.map((v, i) => { const td = el('td', { class: 'num' + (v ? '' : ' z'), text: f2(v) }); return onCell && v > 0.0005 ? clickable(td, () => onCell(i)) : td; }),
    (() => { const v = vals.reduce((a, b) => a + b, 0), td = el('td', { class: 'num tot', text: f2(v) }); return onCell && v > 0.0005 ? clickable(td, () => onCell(null)) : td; })(),
    ...extra.map((v) => el('td', { class: 'num dim', text: typeof v === 'number' ? f2(v) : v }))]);
  const sep = (t) => el('tr', { class: 'lk-sep' }, el('td', { colspan: D.years.length + 4, text: t }));
  const openSet = (title, kicker, pred) => (i) => {
    if (i == null) { const items = F.rows.filter((o) => o.counted > 0.0005 && pred(o)); return openList({ kicker: kicker + ' · 2025 to 2030', title, value: items.reduce((a, o) => a + o.counted, 0), items, sub: `${items.length} sites and agreements counted in 2025 to 2030, largest first, each with the reason it is in.` }); }
    openYear(i, pred, title);
  };

  function drawTable() {
    const t = $('#lk-table'), th = t.tHead, tb = t.tBodies[0], more = $('#lk-more'), s = D.summary, q = $('#lk-q');
    tb.replaceChildren(); more.hidden = true; q.hidden = !(tab === 'in' || tab === 'out');
    t.classList.toggle('lk-list', tab === 'in' || tab === 'out');
    if (tab === 'summary') {
      $('#lk-tsub').textContent = 'IT GW. Each year is capacity switching on in that year, not a running total. Click a figure to see the sites behind it.';
      th.replaceChildren(head(''));
      tb.append(line('Likely energized', s.total, 'total'), line('United States', s.us, 'sub'), line('Outside the US', s.outside_us, 'sub'),
        line('At named sites in the tracker', s.at_sites, '', [], openSet('Named sites counted', 'Likely energized', () => true)),
        line('Estimate: not yet at a named site', s.estimate, 'est'),
        sep('Named sites counted, by strength of evidence'),
        ...D.tiers.map((r) => { const n = (r.tier.match(/^Tier (\d+)/) || [])[1]; return line(r.tier.replace(/^Tier \d+: /, ''), r.it_gw, 'sub', [], openSet(r.tier.replace(/^Tier \d+: /, ''), 'Likely energized', (o) => String(o.tier) === n)); }),
        sep('For comparison'), line('Announced in the tracker, dated in the year', s.announced_dated, 'quiet'));
      return;
    }
    if (tab === 'in' || tab === 'out') {
      const inn = tab === 'in', term = q.value.trim().toLowerCase();
      let rows = F.rows.filter((o) => (inn ? /^(In|Partly)/.test(o.status) : o.status === 'Not in' || /^Partly/.test(o.status)));
      const val = (o) => (inn ? o.counted : o.it_gw - o.counted);
      rows.sort((a, b) => val(b) - val(a));
      const st = D.status, find = (k) => st.find((x) => x.status === k) || { rows: 0, announced: 0, counted: 0 };
      const I = find('In'), P = find('Partly in'), N = find('Not in'), B = find('Before 2025');
      $('#lk-tsub').textContent = inn
        ? `${I.rows + P.rows} sites and agreements are counted (${P.rows} only in part): ${f1(I.counted + P.counted)} GW in 2025 to 2030. Sites are taken in order of evidence, operating first, then under construction, then permitted or announced sites, until each year’s likely total is reached.`
        : `${N.rows} sites and agreements are not counted by 2030, and ${P.rows} are cut back: ${f1(N.announced + (P.announced - P.counted))} GW of announced capacity. Each has its reason. ${B.rows} more (${f1(B.announced)} GW) were energized before 2025. China is not part of this forecast.`;
      if (term) rows = rows.filter((o) => [o.site, o.phase, o.area, o.us_state, o.operator, o.end_user, o.reason, o.stage].join(' ').toLowerCase().includes(term));
      th.replaceChildren(el('tr', {}, [['Site', ''], ['Where', ''], ['Stage', ''], ['Announced', 'num'], [inn ? 'Counted' : 'Not counted', 'num'], [inn ? 'Year' : 'Status', ''], ['Reason and source', '']].map(([x, c]) => el('th', { scope: 'col', class: c, text: x }))));
      const LIMIT = 30, show = all ? rows : rows.slice(0, LIMIT);
      for (const o of show) tb.append(el('tr', {}, [
        el('td', {}, [el('div', { class: 'lk-site', text: o.site }), o.phase ? el('div', { class: 'dim lk-ph', text: o.phase }) : null]),
        el('td', { class: 'dim', text: [o.us_state, o.area].filter(Boolean).join(', ') }), el('td', { class: 'dim', text: o.stage }),
        el('td', { class: 'num', text: f2(o.it_gw) }), el('td', { class: 'num', text: f2(val(o)) }),
        el('td', {}, inn ? String(o.first_year || '') : el('span', { class: 'tk sm tk-st-' + stTok(o.status), text: o.status })),
        el('td', { class: 'lk-reason' }, [o.reason || '', o.source_url ? [' ', el('a', { href: o.source_url, target: '_blank', rel: 'noopener', text: host(o.source_url) })] : null].flat())]));
      if (!rows.length) tb.append(el('tr', {}, el('td', { colspan: 7, class: 'empty', text: 'Nothing matches.' })));
      more.hidden = rows.length <= LIMIT; more.textContent = all ? 'Show first 30' : `Show all ${rows.length}`;
      return;
    }
    const lbl = { chip: 'Chip maker', operator: 'Operator', end_user: 'End user', site: 'Site' }[tab], key = KEY[tab];
    const isSpecial = (n) => /^(Total|Subtotal|Estimate)/.test(n);
    const rows = D.by[tab].filter((r) => !isSpecial(r.name)), specials = D.by[tab].filter((r) => isSpecial(r.name));
    $('#lk-tsub').textContent = `IT GW by ${lbl.toLowerCase()}, counted at named sites. The Estimate for capacity not yet at a named site is a separate line and is not given to any ${lbl.toLowerCase()}. Click a figure to see the sites.`;
    th.replaceChildren(head(lbl, ['All dates', 'Rows in']));
    const LIMIT = 15, show = all ? rows : rows.slice(0, LIMIT);
    for (const r of show) tb.append(line(nameOf(tab, r.name), r.years, '', [r.all_dates, `${r.rows_in} of ${r.rows}`], openSet(nameOf(tab, r.name), lbl, (o) => o[key] === r.name)));
    if (!all && rows.length > LIMIT) { const rest = rows.slice(LIMIT), set = new Set(rest.map((r) => r.name)); tb.append(line(`${rest.length} more`, D.years.map((_, i) => rest.reduce((a, r) => a + r.years[i], 0)), 'quiet', [rest.reduce((a, r) => a + r.all_dates, 0), ''], openSet(`${rest.length} smaller ${lbl.toLowerCase()}s`, lbl, (o) => set.has(o[key])))); }
    for (const r of specials) tb.append(line(r.name.replace(/ \(.*\)$/, ''), r.years, /^Total/.test(r.name) ? 'total' : /^Estimate/.test(r.name) ? 'est' : 'quiet', [r.all_dates || '', '']));
    more.hidden = rows.length <= LIMIT; more.textContent = all ? 'Show top 15' : `Show all ${rows.length}`;
  }

  function init(d) {
    D = d; F.rows = d.rows.map(R);
    $('#lk-sub').textContent = `What is likely to be energized each year, as opposed to everything announced. IT GW, worldwide excluding China. Our estimate, updated ${d.generated}; figures may be revised.`;
    $('#lk-note').replaceChildren('How it works: the yearly totals follow SemiAnalysis’s public capacity forecast, reduced for the cut in AI chip volumes it reported in November 2026. Each year is then filled with named sites from the tracker in order of evidence: operating, then under construction, then permitted or announced sites, preferring those with a named buyer. Whatever named sites cannot cover is an Estimate of capacity not yet announced. Every site is marked in, partly in or not in, with the reason. Not affected by the filters above. ',
      el('a', { href: 'data/likely-energized-by-site.xlsx', download: '', text: 'Download the workbook' }), ' to see and change every assumption.');
    $('#lk-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.v; all = false; $('#lk-q').value = ''; for (const x of $('#lk-tabs').children) x.setAttribute('aria-checked', String(x === b)); drawTable(); });
    $('#lk-more').addEventListener('click', () => { all = !all; drawTable(); });
    let qt; $('#lk-q').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(drawTable, 120); });
    drawChart(); drawTable();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawChart, 150); });
  }
  const go = () => fetch('data/likely.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
    .catch(() => { const s = $('#likely'); if (s) s.hidden = true; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
