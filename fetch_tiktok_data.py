#!/usr/bin/env python3
"""
Fetch TikTok Live data from Google Sheets and generate tiktok-performance.html
with embedded JSON data.
"""
import urllib.request
import urllib.parse
import json
import sys
import re
from datetime import datetime

SHEET_ID = '1VE4yznBlIAfLUP50tkF6IAOlNbFm2vhyPs0Jv5aJ-6U'

def fetch_gviz(sheet_name):
    url = (f'https://docs.google.com/spreadsheets/d/{SHEET_ID}'
           f'/gviz/tq?tqx=out:json&sheet={urllib.parse.quote(sheet_name)}')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            text = r.read().decode('utf-8')
        start = text.find('{')
        end   = text.rfind('}') + 1
        return json.loads(text[start:end])
    except Exception as e:
        print(f'  [WARN] Could not fetch "{sheet_name}": {e}', file=sys.stderr)
        return None

def cell_val(cells, idx, default=None):
    if idx < len(cells) and cells[idx] and cells[idx].get('v') is not None:
        return cells[idx]['v']
    return default

def parse_num(v):
    if v is None: return 0
    if isinstance(v, (int, float)): return float(v)
    s = re.sub(r'[,\s]', '', str(v))
    try: return float(s)
    except: return 0

def parse_gmv(v):
    """GMV may come as float or string like '586,300.00'"""
    if v is None: return 0
    if isinstance(v, (int, float)): return float(v)
    s = re.sub(r'[Rp\s]', '', str(v)).replace(',', '')
    try: return float(s)
    except: return 0

def fmt_duration(v):
    """Duration comes as Date() string from gviz"""
    if v is None: return ''
    if isinstance(v, str) and v.startswith('Date('):
        m = re.match(r'Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)', v)
        if m:
            _, _, _, h, mi, s = [int(x) for x in m.groups()]
            return f'{h}:{mi:02d}:{s:02d}'
    return str(v)

# ─── Parse Dashboard sheet ───────────────────────────────────────────────────
def parse_dashboard(gviz):
    rows = []
    if not gviz or 'table' not in gviz:
        return rows
    for row in gviz['table'].get('rows', []):
        cells = row.get('c') or []
        month = cell_val(cells, 0)
        if not month or not re.search(r'\d{4}', str(month)):
            continue
        rows.append({
            'month':     str(month).strip(),
            'lives':     int(parse_num(cell_val(cells, 1))),
            'duration':  fmt_duration(cell_val(cells, 2)),
            'views':     int(parse_num(cell_val(cells, 3))),
            'likes':     int(parse_num(cell_val(cells, 4))),
            'comments':  int(parse_num(cell_val(cells, 5))),
            'followers': int(parse_num(cell_val(cells, 6))),
            'gmv':       parse_gmv(cell_val(cells, 7)),
        })
    return rows

# ─── Parse individual month sheet ────────────────────────────────────────────
def parse_month_sheet(gviz, sheet_name):
    rows = []
    if not gviz or 'table' not in gviz:
        return rows

    raw_rows = gviz['table'].get('rows', [])
    # Row 0 = "Month: ..." header, Row 1 = column names — skip both
    for raw in raw_rows[2:]:
        cells = raw.get('c') or []
        views     = parse_num(cell_val(cells, 9))
        likes     = parse_num(cell_val(cells, 10))
        comments  = parse_num(cell_val(cells, 11))
        followers = parse_num(cell_val(cells, 12))
        gmv       = parse_gmv(cell_val(cells, 14))

        # Skip rows with no meaningful engagement
        if views == 0 and likes == 0 and comments == 0 and gmv == 0:
            continue

        day      = str(cell_val(cells, 0) or '')
        date     = str(cell_val(cells, 1) or '')
        time_val = str(cell_val(cells, 2) or '')
        platform = str(cell_val(cells, 3) or 'Tiktok')
        theme    = str(cell_val(cells, 4) or '')
        title    = str(cell_val(cells, 5) or '')
        brief    = str(cell_val(cells, 6) or '')
        sku      = str(cell_val(cells, 7) or '')
        duration = fmt_duration(cell_val(cells, 8))

        rows.append({
            'sheet':    sheet_name,
            'day':      day,
            'date':     date,
            'time':     time_val,
            'platform': platform,
            'theme':    theme,
            'title':    title,
            'brief':    brief,
            'sku':      sku,
            'duration': duration,
            'views':    int(views),
            'likes':    int(likes),
            'comments': int(comments),
            'followers':int(followers),
            'gmv':      gmv,
        })
    return rows

# ─── MAIN ────────────────────────────────────────────────────────────────────
def build_data():
    print('Fetching Dashboard sheet…', file=sys.stderr)
    dash_gviz  = fetch_gviz('Dashboard')
    dashboard  = parse_dashboard(dash_gviz)

    # Active sheets = those with lives > 0 OR views > 0
    active_sheets = [r['month'] for r in dashboard if r['lives'] > 0 or r['views'] > 0]
    if not active_sheets:
        active_sheets = ['Februari 2026', 'Maret 2026', 'April 2026']
    print(f'Active sheets: {active_sheets}', file=sys.stderr)

    # Fetch each month sheet
    month_data = []
    seen_content = {}  # avoid duplicate content (April returning Maret data issue)
    for sname in active_sheets:
        print(f'  Fetching "{sname}"…', file=sys.stderr)
        gviz = fetch_gviz(sname)
        rows = parse_month_sheet(gviz, sname)

        # Detect if this sheet has same content as a previous sheet (de-dup)
        # Use first row date as fingerprint
        fp = rows[0]['date'] + str(rows[0]['views']) if rows else '__empty__'
        if fp in seen_content and fp != '__empty__':
            print(f'    [SKIP] "{sname}" appears to be duplicate of "{seen_content[fp]}"', file=sys.stderr)
            # Mark it with no rows so monthly LB shows empty
            month_data.append({'month': sname, 'rows': [], 'duplicate_of': seen_content[fp]})
        else:
            seen_content[fp] = sname
            month_data.append({'month': sname, 'rows': rows})
        print(f'    -> {len(rows)} data rows', file=sys.stderr)

    return {
        'generated_at': datetime.now().isoformat(),
        'dashboard':    dashboard,
        'months':       month_data,
        'current_month': active_sheets[-1] if active_sheets else '',
    }

if __name__ == '__main__':
    data = build_data()
    print(json.dumps(data, ensure_ascii=False, indent=2))
