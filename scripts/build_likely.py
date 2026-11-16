"""Build data/likely.json (and the published workbook) from the likely-energized workbook.

Usage: python3 scripts/build_likely.py path/to/likely-energized-by-site.xlsx
The workbook holds live formulas; it is recalculated with LibreOffice so the site reads
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

r = lambda v: round(float(v or 0), 4)
S = wb['Summary']
years = [int(S.cell(1, c).value) for c in range(2, 8)]
row = lambda ws, i: [r(ws.cell(i, c).value) for c in range(2, 8)]
label = lambda i: str(S.cell(i, 1).value or '').strip()
summary = {
    'total': row(S, 3), 'us': row(S, 4), 'outside_us': row(S, 5),
    'at_sites': row(S, 6), 'not_yet_tracked': row(S, 7),
    'announced_dated': row(S, 10),
}
stages = [{'stage': label(i), 'it_gw': row(S, i)} for i in range(13, 20) if label(i)]
regions = [{'region': label(i), 'it_gw': row(S, i)} for i in range(22, 28) if label(i)]

def table(name):
    ws = wb[name]; out = []
    for i in range(2, ws.max_row + 1):
        k = ws.cell(i, 1).value
        if k is None: continue
        v = [ws.cell(i, c).value for c in range(2, 13)]
        out.append({'name': str(k), 'years': [r(x) for x in v[:6]], 'total': r(v[6]), 'at_sites': r(v[7]),
                    'estimate': r(v[8]), 'announced': r(v[9]), 'rows': int(v[10] or 0)})
    return sorted(out, key=lambda x: -x['total'])

A = wb['Assumptions']
assumptions = []
for i in range(2, 9):
    if A.cell(i, 1).value:
        assumptions.append({'stage': A.cell(i, 1).value, 'chance': r(A.cell(i, 2).value), 'on_time': r(A.cell(i, 3).value),
                            'one_late': r(A.cell(i, 4).value), 'two_late': r(A.cell(i, 5).value), 'why': A.cell(i, 9).value})

about = [str(c.value) for c in wb['About']['A'] if c.value]
out = {'generated': datetime.date.today().isoformat(), 'basis': 'IT GW, worldwide excluding China', 'years': years,
       'summary': summary, 'stages': stages, 'regions': regions, 'assumptions': assumptions, 'about': about,
       'by': {'chip': table('By chip maker'), 'operator': table('By operator'), 'end_user': table('By end user'), 'site': table('By site')}}
(root / 'data' / 'likely.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
shutil.copy(calc, root / 'data' / 'likely-energized-by-site.xlsx')
print('likely.json written:', summary['total'])
