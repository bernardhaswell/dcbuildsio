"""Build data/likely.json (and the published workbook) from the likely-energized workbook.

Usage: python3 scripts/build_likely.py path/to/likely-energized-by-site.xlsx
The workbook holds live formulas; it is recalculated with LibreOffice so the site shows
the same values a reader sees in Excel. Nothing on the site is hard-coded.
"""
import json, shutil, subprocess, sys, tempfile, datetime, pathlib
import openpyxl

src = pathlib.Path(sys.argv[1]).resolve()
root = pathlib.Path(__file__).resolve().parent.parent
tmp = pathlib.Path(tempfile.mkdtemp())
shutil.copy(src, tmp / 'in.xlsx')
subprocess.run(['soffice', '--headless', '--convert-to', 'xlsx:Calc MS Excel 2007 XML', '--outdir', str(tmp / 'out'), str(tmp / 'in.xlsx')], check=True, capture_output=True, timeout=300)
calc = tmp / 'out' / 'in.xlsx'
wb = openpyxl.load_workbook(calc, data_only=True)
r = lambda v: round(float(v or 0), 4) if isinstance(v, (int, float)) or v is None else v

S = wb['Summary']
years = [int(S.cell(1, c).value) for c in range(2, 8)]
lab = lambda i: str(S.cell(i, 1).value or '').strip()
vals = lambda ws, i: [r(ws.cell(i, c).value) for c in range(2, 8)]
def find(prefix):
    for i in range(1, S.max_row + 1):
        if lab(i).lower().startswith(prefix.lower()): return i
    raise SystemExit(f'Summary row not found: {prefix}')
summary = {'total': vals(S, find('Likely energized, total')), 'us': vals(S, find('US')), 'outside_us': vals(S, find('outside US')),
           'at_sites': vals(S, find('at named sites')), 'estimate': vals(S, find('Estimate:')),
           'announced_dated': vals(S, find('Tracker as published'))}
summary_labels = {'at_sites': lab(find('at named sites')), 'estimate': lab(find('Estimate:'))}
tiers, i = [], find('Named sites counted') + 1
while lab(i).startswith('Tier'): tiers.append({'tier': lab(i), 'it_gw': vals(S, i)}); i += 1
rec, i = [], find('Reconciliation') + 1
while lab(i) and not lab(i).startswith('Rows by'): rec.append({'label': lab(i), 'it_gw': r(S.cell(i, 2).value)}); i += 1
status, i = [], find('Rows by forecast status') + 1
while lab(i) and not lab(i).startswith('For comparison'):
    status.append({'status': lab(i), 'rows': int(S.cell(i, 2).value or 0), 'announced': r(S.cell(i, 3).value), 'counted': r(S.cell(i, 4).value)}); i += 1

def table(name):
    ws = wb[name]; out = []
    hdr = [str(ws.cell(1, c).value or '') for c in range(1, 12)]
    mix = any('assigned by mix' in h for h in hdr)
    for i in range(2, ws.max_row + 1):
        k = ws.cell(i, 1).value
        if k is None or ws.cell(i, 2).value is None or str(k).startswith('Check'): continue
        v = [ws.cell(i, c).value for c in range(2, 12)]
        if mix:
            out.append({'name': str(k), 'years': [r(x) for x in v[:6]], 'total': r(v[6]), 'on_record': r(v[7]), 'assigned': r(v[8]), 'rows': int(v[9] or 0)})
        else:
            out.append({'name': str(k), 'years': [r(x) for x in v[:6]], 'total': r(v[6]), 'all_dates': r(v[7]), 'rows': int(v[8] or 0), 'rows_in': int(v[9] or 0)})
    return out

def note(name):
    ws = wb[name]
    for i in range(ws.max_row, 1, -1):
        v = ws.cell(i, 1).value
        if isinstance(v, str) and ws.cell(i, 2).value is None and len(v) > 60: return v
    return ''

R = wb['Rows']; H = [c.value for c in R[1]]; ix = {h: j for j, h in enumerate(H)}
rows = []
for row in R.iter_rows(min_row=2, values_only=True):
    if not row[0] or str(row[ix['region']] or '').strip().lower() == 'china': continue
    g = lambda k: row[ix[k]]
    rows.append([g('id'), g('site'), g('phase'), g('FORECAST STATUS'), g('area'), g('us_state') or '', g('stage'), g('stated_year'),
                 r(g('it_gw')), r(g('counted_2025_2030')), [r(g(f'counted {y}')) for y in years], g('first_year_counted'),
                 g('chip_vendor'), g('end_user'), g('end_user_basis'), g('operator'), g('reason'), g('source_url'), g('tier')])
A = wb['Assumptions']
assumptions = [{'tier': A.cell(i, 1).value, 'evidence': A.cell(i, 2).value, 'counts': A.cell(i, 3).value, 'earliest': A.cell(i, 4).value, 'why': A.cell(i, 6).value}
               for i in range(2, A.max_row + 1) if isinstance(A.cell(i, 1).value, int)]
out = {'generated': datetime.date.today().isoformat(), 'basis': 'IT GW, worldwide excluding China', 'years': years,
       'summary': summary, 'summary_labels': summary_labels, 'tiers': tiers, 'reconciliation': rec, 'status': status, 'assumptions': assumptions,
       'mix_note': note('By chip maker'), 'by': {'chip': table('By chip maker'), 'operator': table('By operator'), 'end_user': table('By end user'), 'site': table('By site')},
       'row_fields': ['id', 'site', 'phase', 'status', 'area', 'us_state', 'stage', 'stated_year', 'it_gw', 'counted', 'counted_by_year', 'first_year', 'chip', 'end_user', 'end_user_basis', 'operator', 'reason', 'source_url', 'tier'],
       'rows': rows}
txt = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
assert 'defensib' not in txt.lower()
assert 'semianal' not in txt.lower(), 'likely.json would name an outside forecast; clean the workbook first'
(root / 'data' / 'likely.json').write_text(txt)
# Publish the workbook only if no cell names an outside forecast (Kohulan, 2026-11-16).
clean = not any(isinstance(c.value, str) and 'semianal' in c.value.lower() for ws in wb.worksheets for row in ws.iter_rows() for c in row)
dest = root / 'data' / 'likely-energized-by-site.xlsx'
if clean: shutil.copy(calc, dest)
elif dest.exists(): dest.unlink()
print('workbook published' if clean else 'workbook NOT published: it names an outside forecast')
chk = [round(sum(x[10][k] for x in rows), 3) for k in range(6)]
print('total', summary['total'], '\nat sites', summary['at_sites'], '\nrows sum', chk, '\nrows', len(rows))
