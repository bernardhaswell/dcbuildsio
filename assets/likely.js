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
  // Display names for chip makers; same labels as the rest of the page. Unknown keys are title-cased, never shown raw.
  const CHIP = { 'Conventional servers, no accelerator': 'Conventional servers, no accelerator', 'Anthropic (own chip)': 'Anthropic (own chip)', nvidia: 'Nvidia', amd: 'AMD', google: 'Google TPU', amazon: 'AWS Trainium', microsoft: 'Microsoft Maia', meta: 'Meta MTIA', openai: 'OpenAI', broadcom: 'Broadcom custom', intel: 'Intel', qualcomm: 'Qualcomm', cerebras: 'Cerebras', groq: 'Groq', huawei: 'Huawei', alibaba: 'Alibaba T-Head', cambricon: 'Cambricon', hygon: 'Hygon', baidu: 'Baidu Kunlun', tesla: 'Tesla', other: 'MetaX, Biren and Zhonghao Xinying', undisclosed: 'Not disclosed' };
  const chipName = (k) => CHIP[k] || String(k || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const f1 = (v) => (v >= 0.05 ? v.toFixed(1) : v > 0 ? '<0.1' : '–');
  const f2 = (v) => (v >= 0.005 ? v.toFixed(2) : v > 0 ? '<0.01' : '–');
  let D, tab = 'summary', all = false;

  // ---- rows (one per site phase or agreement remainder, excluding China)
  let F = {};
  const R = (row) => { const o = {}; D.row_fields.forEach((k, i) => { o[k] = row[i]; }); return o; };
  const KEY = { chip: 'chip', operator: 'operator', end_user: 'end_user', site: 'site' };
  const nameOf = (tab, n) => (tab === 'chip' ? chipName(n) : n);
  const stTok = (st) => (/^In/.test(st) ? 'op' : /^Partly/.test(st) ? 'uc' : /^Before/.test(st) ? 'pm' : 'pp');

  // ---- drawer (shares the page's breakdown panel)
  function openList({ kicker, title, value, sub, items, yearIdx, extra }) {
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
    if (extra && Math.abs(extra.gw) > 0.0005) $('#bk-list').prepend(el('li', { class: 'bk-item' }, [
      el('div', { class: 'bk-top' }, [el('div', { class: 'bk-name' }, extra.title), el('div', { class: 'bk-mw', text: f2(extra.gw) })]),
      el('div', { class: 'bk-meta' }, el('span', { class: 'tag estimate', text: 'Estimate' })), el('div', { class: 'bk-why', text: extra.why })]));
    const tot = list.reduce((a, o) => a + val(o), 0) + (extra ? extra.gw : 0);
    $('#bk-sum').replaceChildren(el('span', { text: `Sum of ${list.length} ${list.length === 1 ? 'row' : 'rows'}${extra && Math.abs(extra.gw) > 0.0005 ? ' and the Estimate' : ''}` }), el('b', { text: f2(tot) + ' GW' }));
    dlg.hidden = false; document.body.classList.add('bk-on');
    requestAnimationFrame(() => { dlg.classList.add('on'); $('#bk-x').focus(); });
    $('#bk-list').scrollTop = 0;
  }
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Source'; } };
  const openYear = (i, pred = () => true, what = 'Named sites counted', est = D.summary.estimate[i]) => {
    const items = F.rows.filter((o) => o.counted_by_year[i] > 0.0005 && pred(o));
    openList({ kicker: `Likely energized · ${D.years[i]}`, title: what, value: items.reduce((a, o) => a + o.counted_by_year[i], 0), yearIdx: i, items,
      sub: `${items.length} sites and agreements counted in ${D.years[i]}, largest first, each with the reason it is in.${est > 0.05 ? ` ${f1(est)} GW more that year is at sites not itemised (Estimate), so it is not listed here.` : ''}` });
  };
  const clickable = (td, fn) => { td.classList.add('pick'); td.tabIndex = 0; td.setAttribute('role', 'button'); td.addEventListener('click', fn); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); return td; };

  let CASE = 'likely';
  const CASES = [['lower', 'Lower estimate'], ['likely', 'Likely'], ['upper', 'Upper estimate']];
  const caseName = () => CASES.find((c) => c[0] === CASE)[1];
  const isLikely = () => CASE === 'likely' || !(D.range && D.range.cases && D.range.cases[CASE]);
  const TOT = () => (isLikely() ? D.summary.total : D.range.cases[CASE].total);
  const REGS = () => (isLikely() ? D.regions : D.range.cases[CASE].regions);
  const REG = (n) => REGS().find((g) => g.name === n);
  function drawChart() {
    const host_ = $('#lk-chart'), s = D.summary, ys = D.years;
    const W = Math.max(320, host_.clientWidth || 800), H = W < 560 ? 280 : 340, padL = W < 560 ? 30 : 44, padR = 8, padT = 34, padB = 34;
    const max = Math.max(...s.total, ...((D.range && D.range.upper) || [])) * 1.08, nice = max <= 20 ? 5 : max <= 50 ? 10 : 20, top = Math.ceil(max / nice) * nice;
    const x0 = padL, cw = (W - padL - padR) / ys.length, bw = Math.min(72, cw * 0.56), y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const root = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'lk-svg' });
    const defs = sv('defs');
    for (const [id, c] of [['us', 'var(--s1)'], ['xu', 'var(--s2)']]) {
      const pat = sv('pattern', { id: `lk-h-${id}`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
      pat.append(sv('rect', { width: 6, height: 6, fill: `color-mix(in srgb, ${c} 20%, transparent)` }), sv('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: `color-mix(in srgb, ${c} 80%, transparent)`, 'stroke-width': 2 }));
      defs.append(pat);
    }
    root.append(defs);
    for (let v = 0; v <= top; v += nice) { root.append(sv('line', { x1: x0, x2: W - padR, y1: y(v), y2: y(v), class: 'lk-grid' })); root.append(sv('text', { x: x0 - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'lk-ax' }, String(v))); }
    const U = REG('United States'), X = REG('Outside the US'), T = TOT(), live = isLikely(), word = live ? 'likely' : caseName().toLowerCase();
    ys.forEach((yr, i) => {
      const cx = x0 + cw * i + cw / 2, t = T[i];
      const uN = U.named[i], uE = U.estimate[i], xN = X.named[i], xE = X.estimate[i];
      const segs = [
        { v: uN, fill: 'var(--s1)', us: true, lab: 'US, named sites' },
        { v: uE, fill: 'url(#lk-h-us)', us: true, est: true, lab: 'US, sites not itemised (Estimate)' },
        { v: xN, fill: 'var(--s2)', us: false, lab: 'Outside the US, named sites' },
        { v: xE, fill: 'url(#lk-h-xu)', us: false, est: true, lab: 'Outside the US, sites not itemised (Estimate)' }];
      const g = sv('g', { class: 'lk-col' });
      g.append(sv('rect', { x: cx - cw / 2, y: padT - 20, width: cw, height: H - padT + 20 - padB + 24, fill: 'transparent' }));
      let base = 0;
      for (const sg of segs) {
        if (sg.v > 0.01) {
          const region = sg.us ? 'US' : 'Outside the US', est = sg.us ? uE : xE;
          const r = sv('rect', live ? { x: cx - bw / 2, y: y(base + sg.v), width: bw, height: Math.max(0, y(base) - y(base + sg.v)), fill: sg.fill, class: 'lk-bar', tabindex: 0, role: 'button', 'aria-label': `${yr}, ${sg.lab}: ${f1(sg.v)} GW. Show the ${region} sites` }
            : { x: cx - bw / 2, y: y(base + sg.v), width: bw, height: Math.max(0, y(base) - y(base + sg.v)), fill: sg.fill, class: 'lk-seg' });
          r.append(sv('title', {}, `${yr}, ${word}: ${f1(t)} GW\nUS ${f1(U.years[i])} (named sites ${f1(uN)}, sites not itemised ${f1(uE)})\nOutside the US ${f1(X.years[i])} (named sites ${f1(xN)}, sites not itemised ${f1(xE)})${live ? `\nClick to see the ${region} sites` : ''}`));
          if (live) { const go = () => openRegion(sg.us ? U : X)(i);
          r.addEventListener('click', go); r.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } }); }
          g.append(r);
        }
        base += sg.v;
      }
      g.append(sv('text', { x: cx, y: y(t) - 10, 'text-anchor': 'middle', class: 'lk-val' }, f1(t)));
      g.append(sv('text', { x: cx, y: H - 10, 'text-anchor': 'middle', class: 'lk-yr' }, String(yr)));
      root.append(g);
    });
    root.append(sv('text', { x: x0 - 8, y: 14, 'text-anchor': 'end', class: 'lk-ax' }, 'GW'));
    host_.replaceChildren(root);
    $('#lk-legend').replaceChildren(
      el('span', {}, [el('i', { class: 'lk-sw us' }), 'US']), el('span', {}, [el('i', { class: 'lk-sw xu' }), 'Outside the US']),
      el('span', {}, [el('i', { class: 'lk-sw hatch-n' }), 'Hatched: sites not itemised (Estimate)']),
      el('span', { class: 'dim' }, `Solid: named sites, permitted, announced or company plan.${live ? ' Click a bar to see the sites' : ''}`));
  }


  const head = (first, extra = []) => el('tr', {}, [el('th', { scope: 'col', text: first }), ...D.years.map((y) => el('th', { class: 'num', scope: 'col', text: String(y) })), el('th', { class: 'num tot', scope: 'col', text: '2025–30' }), ...extra.map((t) => el('th', { class: 'num', scope: 'col', text: t }))]);
  const line = (name, vals, cls = '', extra = [], onCell = null) => el('tr', { class: cls }, [el('td', { title: name }, name),
    ...vals.map((v, i) => { const td = el('td', { class: 'num' + (v ? '' : ' z'), text: f2(v) }); return onCell && v > 0.0005 ? clickable(td, () => onCell(i)) : td; }),
    (() => { const v = vals.reduce((a, b) => a + b, 0), td = el('td', { class: 'num tot', text: f2(v) }); return onCell && v > 0.0005 ? clickable(td, () => onCell(null)) : td; })(),
    ...extra.map((v) => el('td', { class: 'num dim', text: typeof v === 'number' ? f2(v) : v }))]);
  const sep = (t) => el('tr', { class: 'lk-sep' }, el('td', { colspan: D.years.length + 4, text: t }));
  const MIXWHY = 'Capacity with no value on record for this, plus capacity at sites not itemised, is allocated: to chip makers toward each one’s likely share of accelerator power switched on, and to end users and operators as follows: capacity allocated to an in-house chip goes to the company it runs for (from 2027, Google TPU capacity beyond Anthropic’s agreements is shared between its users on public record, run by Google: Google’s own part 45% in 2027 easing to 25% in 2030, the rest to Anthropic and OpenAI, with OpenAI’s part held lower from 2028 because its TPU rental is reported, not confirmed, Estimate; Meta’s reported TPU rental is not confirmed, so it gets none), the rest goes to the largest buyers by capital spending (Meta’s share is phased out: three quarters in 2027, none from 2028, when it is held to its own sites and leases on record), and companies that report their own additions are held to them. Amazon runs capacity for the labs under their public agreements: from 2027, 0.75 GW a year for Anthropic (up to 5 GW over ten years, April 2026; less its AWS sites on record) and 0.5 GW a year for OpenAI (2 GW of Trainium, February 2026; less its AWS agreement rows on record) are moved from Amazon’s own use to the lab (Estimate); Amazon stays the operator. From 2026, 30% of the capacity Microsoft runs for itself is counted as used by OpenAI (Estimate); Microsoft stays the operator. US capacity with no end user on record that is not yet under construction is counted lower (5.4 GW less over 2027 to 2030, Estimate); sites under construction or operating are not reduced. Google as operator is held to the rate Amazon shows, about 10 IT GW per USD 100bn of datacenter capital spending, spread over 2027 to 2030; the capacity above it is run by third-party operators on record in the US. Facility and nameplate power are converted to IT load at 1.2. From 2027, capacity outside the US with no operator on record is run by the operators on record in that region, as is 68% of the Google-run TPU capacity there with no site (Estimate); no operator is shown above the capacity it has announced. End use is reconciled with operation for Google, Amazon, Microsoft, Meta, Oracle and SpaceX: a company’s own use is not above the capacity it runs, less what it runs for others, plus what it leases from others on record. Allocated use above that has no named user on record; it is not given to another large buyer and is counted as used by the operator that runs it, for its own customers, in proportion to the capacity each operator runs with no named user (Estimate). See the Allocation basis sheet in the workbook.';
  const openSet = (title, kicker, pred, cellOf) => (i) => {
    const items = F.rows.filter((o) => (i == null ? o.counted : o.counted_by_year[i]) > 0.0005 && pred(o));
    const rec = items.reduce((a, o) => a + (i == null ? o.counted : o.counted_by_year[i]), 0);
    const cell = cellOf ? cellOf(i) : rec, extra = !cellOf ? null : cell - rec > -0.0005 ? { gw: Math.max(0, cell - rec), title: 'Allocated, sites not itemised (Estimate)', why: MIXWHY } : { gw: cell - rec, title: 'Taken to run on other chips (Estimate)', why: 'Part of the capacity on record for this chip maker is taken to run on custom chips and AMD instead, so that its yearly figure matches the tracker’s Estimate. See the By chip maker sheet in the workbook.' };
    openList({ kicker: `${kicker} · ${i == null ? '2025 to 2030' : D.years[i]}`, title, value: cell, items, yearIdx: i == null ? null : i, extra,
      sub: `${items.length} sites and agreements counted${i == null ? ' in 2025 to 2030' : ' in ' + D.years[i]}, largest first, each with the reason it is in.${extra && Math.abs(extra.gw) > 0.0005 ? (extra.gw > 0 ? ' The first line is allocated to sites not itemised and is an Estimate.' : ' The first line is capacity taken to run on other chips, an Estimate.') : ''}` });
  };


  const EWHY = 'Capacity at sites the tracker does not itemise (Estimate): smaller datacenters, colocation halls and expansions inside existing campuses. Measured for 2025 and 2026 and kept separate from named sites. In the US it is not counted from 2028, except where needed so the US does not fall, because named sites and company plans already cover what utilities have agreed to connect. Outside the US each region has its own line, built from utility, grid operator and industry figures for its countries and set to the measured 2025 and 2026 level, so a new named site raises its region. See table 2 of the Likely sheet in the workbook.';
  const inRegion = (g) => (g.name === 'Outside the US' ? (o) => o.region !== 'United States' : (o) => o.region === g.name);
  const openRegion = (g) => (i) => {
    const pred = inRegion(g), items = F.rows.filter((o) => (i == null ? o.counted : o.counted_by_year[i]) > 0.0005 && pred(o));
    const sum = (a) => (i == null ? a.reduce((x, y) => x + y, 0) : a[i]), est = sum(g.estimate);
    openList({ kicker: `Likely energized · ${i == null ? '2025 to 2030' : D.years[i]}`, title: g.name, value: sum(g.years), items, yearIdx: i == null ? null : i,
      extra: { gw: est, title: 'Sites not itemised (Estimate)', why: EWHY },
      sub: `${items.length} sites and agreements counted${i == null ? ' in 2025 to 2030' : ' in ' + D.years[i]}, largest first, each with the reason it is in.${est > 0.0005 ? ' The first line is capacity at sites not itemised (Estimate).' : ''}` });
  };
  const regionLine = (g, cls) => line(g.name, g.years, cls, [sumOf(g.named), sumOf(g.estimate)], isLikely() ? openRegion(g) : null);
  const sumOf = (a) => a.reduce((x, y) => x + y, 0);

  function drawTable() {
    const t = $('#lk-table'), th = t.tHead, tb = t.tBodies[0], more = $('#lk-more'), s = D.summary, q = $('#lk-q');
    tb.replaceChildren(); more.hidden = true; q.hidden = !(tab === 'in' || tab === 'out');
    t.classList.toggle('lk-list', tab === 'in' || tab === 'out');
    if (tab === 'summary') {
      $('#lk-tsub').textContent = isLikely() ? 'IT GW. Each year is capacity switching on in that year, not a running total. Rest of world is Canada, Latin America, Africa and Orbital. Click a figure to see the sites behind it, with the Estimate shown as its own line.'
        : `IT GW, ${caseName().toLowerCase()} (Estimate). Each year is capacity switching on in that year, not a running total. Rest of world is Canada, Latin America, Africa and Orbital. Switch to Likely to click through to the sites.`;
      th.replaceChildren(head('', ['Named sites', 'Estimate']));
      const RGn = REG, U = REG('United States'), X = REG('Outside the US');
      tb.append(line(isLikely() ? 'Likely energized' : caseName(), TOT(), 'total', [sumOf(U.named) + sumOf(X.named), sumOf(U.estimate) + sumOf(X.estimate)]),
        regionLine(RGn('United States'), ''), regionLine(RGn('Outside the US'), ''),
        ...['Europe', 'Middle East', 'Asia', 'Rest of world'].map((n) => regionLine(RGn(n), 'sub ind')));
      if (!isLikely()) {
        tb.append(sep(`The rows below, and the chip maker, operator, end user and site views, show the Likely case`));
      }
      tb.append(
        sep('All regions'),
        line('Named sites and company plans', s.at_sites, '', [], openSet('Named sites counted', 'Likely energized', () => true)),
        ...(D.within || []).map((w) => line(`of which ${w.label.charAt(0).toLowerCase()}${w.label.slice(1)}`, w.it_gw, 'sub',
          [], /company-reported/i.test(w.label) ? openSet('Company-reported capacity, sites not itemised', 'Likely energized', (o) => /^reported\//.test(String(o.id))) : null)),
        line('Sites not itemised (Estimate)', s.estimate, 'est'),
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
      $('#lk-tsub').textContent = (isLikely() ? '' : 'Shown for the Likely case. ') + (inn
        ? `${I.rows + P.rows} sites and agreements are counted (${P.rows} only in part): ${f1(I.counted + P.counted)} GW in 2025 to 2030. Each is counted at its own chance of completion, from its own first power year. In means at least three quarters of the announced capacity is counted by 2030; partly in means less than that.`
        : `${N.rows} sites and agreements are not counted by 2030, and ${P.rows} are counted in part: ${f1(N.announced + (P.announced - P.counted))} GW of announced capacity. Each has its reason. ${B.rows} more (${f1(B.announced)} GW) were energized before 2025. China is not part of this forecast.`);
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
    const caseNote = isLikely() ? '' : `Shown for the Likely case; the ${caseName().toLowerCase()} applies to the chart and summary only. `;
    const lbl = { chip: 'Chip maker', operator: 'Operator', end_user: 'End user', site: 'Site' }[tab], key = KEY[tab];
    const isSpecial = (n) => /^(Total|Subtotal|Estimate|Check)/.test(n);
    const src = D.by[tab], rows = src.filter((r) => !isSpecial(r.name)), specials = src.filter((r) => isSpecial(r.name));
    const mix = rows.some((r) => r.assigned != null);
    $('#lk-tsub').textContent = caseNote + (mix
      ? `IT GW by ${lbl.toLowerCase()}. Every GW is assigned: the part on record for each site, plus capacity at sites not itemised, allocated to chip makers toward each one’s likely share of accelerator power switched on, and to end users and operators together by capital spending, with in-house chip capacity going to the company it runs for, a cloud's capacity built for a lab going to the lab, and companies held to the additions they report (the "Allocated" column, an Estimate). Click a figure to see the sites.${tab === 'chip' ? ' The forecast covers all datacenter capacity, so capacity above what accelerator shipments can fill is shown as conventional servers with no accelerator (Estimate).' : ''}`
      : `IT GW by ${lbl.toLowerCase()}, counted at named sites. Capacity at sites not itemised (Estimate) is a separate line and is not given to any ${lbl.toLowerCase()}. Click a figure to see the sites.`);
    th.replaceChildren(head(lbl, mix ? ['On record', 'Allocated'] : ['All dates', 'Rows in']));
    const extraOf = (r) => (mix ? [r.on_record, r.assigned] : [r.all_dates, `${r.rows_in} of ${r.rows}`]);
    const cellOf = (r) => (mix ? (i) => (i == null ? r.total : r.years[i]) : null);
    const LIMIT = 15, show = all ? rows : rows.slice(0, LIMIT);
    const isAssume = (r) => mix && r.total > 0.0005 && !r.on_record && !r.assigned;
    for (const r of show) tb.append(isAssume(r)
      ? line(`${nameOf(tab, r.name)} · Assumption`, r.years, 'est', ['', 'Assumption'])
      : line(nameOf(tab, r.name), r.years, '', extraOf(r), openSet(nameOf(tab, r.name), lbl, (o) => o[key] === r.name, cellOf(r))));
    if (!all && rows.length > LIMIT) {
      const rest = rows.slice(LIMIT), set = new Set(rest.map((r) => r.name)), sumY = D.years.map((_, i) => rest.reduce((a, r) => a + r.years[i], 0)), tot = rest.reduce((a, r) => a + r.total, 0);
      tb.append(line(`${rest.length} more`, sumY, 'quiet', mix ? [rest.reduce((a, r) => a + r.on_record, 0), rest.reduce((a, r) => a + r.assigned, 0)] : [rest.reduce((a, r) => a + r.all_dates, 0), ''], openSet(`${rest.length} smaller ${lbl.toLowerCase()}s`, lbl, (o) => set.has(o[key]), mix ? (i) => (i == null ? tot : sumY[i]) : null)));
    }
    for (const r of specials) tb.append(line(r.name.replace(/ \(.*\)$/, '').replace(/;.*$/, ''), r.years, /^Total/.test(r.name) ? 'total' : /^Estimate/.test(r.name) ? 'est' : 'quiet', mix ? [r.on_record ?? '', r.assigned ?? ''] : [r.all_dates || '', '']));
    more.hidden = rows.length <= LIMIT; more.textContent = all ? 'Show top 15' : `Show all ${rows.length}`;
  }

  function initCase() {
    if (!(D.range && D.range.cases && D.range.cases.lower && D.range.cases.upper)) return;
    const btn = $('#lk-case-btn'), menu = $('#lk-case-menu'), box = $('#lk-case');
    const NOTE = { lower: 'More sites late, fewer built', likely: 'Central case', upper: 'Fewer sites late, more built' };
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    const pick = (k) => { CASE = k; close(); btn.focus(); $('#lk-case-v').textContent = caseName(); drawChart(); drawTable(); };
    const build = () => menu.replaceChildren(...CASES.map(([k, t]) => {
      const li = el('li', { role: 'option', tabindex: '-1', 'aria-selected': String(CASE === k) }, [el('span', { text: t }), el('small', { text: NOTE[k] })]);
      li.addEventListener('click', () => pick(k)); li.addEventListener('keydown', (e) => {
        const items = [...menu.children], i = items.indexOf(li);
        if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || li).focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || li).focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(k); } else if (e.key === 'Escape') { close(); btn.focus(); } });
      return li; }));
    btn.addEventListener('click', () => { if (!menu.hidden) return close(); build(); menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); (menu.querySelector('[aria-selected="true"]') || menu.firstChild).focus(); });
    document.addEventListener('click', (e) => { if (!box.contains(e.target)) close(); });
    $('#lk-top').hidden = false;
  }
  function init(d) {
    D = d; F.rows = d.rows.map(R);
    $('#lk-sub').textContent = `What is likely to be energized each year, as opposed to everything announced. IT GW of all datacenter capacity, AI and conventional cloud, worldwide excluding China. Our estimate, updated ${d.generated}; figures may be revised.`;
    $('#lk-note').replaceChildren('How it works: this is built from the sites up, with no yearly target. Every site and agreement in the tracker has its own chance of completion, first power year and ramp, set from its stage, whether a buyer is named, and the delivery record of whoever is building it; the largest sites and agreements are judged one by one. Each year is the sum of those sites. Capacity the tracker does not itemise (smaller datacenters, colocation halls and expansions inside existing campuses) is measured for 2025 and 2026 and held at that level, shown hatched as an Estimate. For 2030, where most sites are not announced yet, large buyers whose programmes run past 2030 are held at their own 2028 to 2029 pace. Every site is marked in, partly in or not in, with the reason. The Case menu switches the chart and summary to the lower or upper estimate: lower if more sites under construction run late and fewer sites not yet started are built; upper if the reverse. Not affected by the filters above. ', el('a', { href: 'data/likely-energized-by-site.xlsx?v=202611181900', download: 'likely-energized-2025-2030.xlsx', text: 'Download the workbook' }), ' to trace every figure back to its sites.');
    $('#lk-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.v; all = false; $('#lk-q').value = ''; for (const x of $('#lk-tabs').children) x.setAttribute('aria-checked', String(x === b)); drawTable(); });
    $('#lk-more').addEventListener('click', () => { all = !all; drawTable(); });
    let qt; $('#lk-q').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(drawTable, 120); });
    initCase();
    drawChart(); drawTable();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawChart, 150); });
  }
  // Only hide the section if the data cannot be fetched; a drawing problem shows a note instead of hiding it.
  const go = () => fetch('data/likely.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { try { init(d); } catch (e) { console.error(e); const n = $('#lk-note'); if (n) n.textContent = 'This section could not be drawn. Please refresh the page.'; } })
    .catch(() => { const n = $('#lk-sub'); if (n) n.textContent = 'The forecast data could not be loaded. Please refresh the page.'; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
