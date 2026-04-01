#!/usr/bin/env python3
"""
HTTP server + /api/tiktok-data proxy for TikTok Live Performance dashboard.
Key fix: properly handles merged cells in column F (Judul Live / Title)
by carrying the last-seen value forward to sub-rows that share the same
live session date block (Day A / Date B are also merged and carried forward).
"""
import http.server
import socketserver
import os, sys, json, re, time
import urllib.request, urllib.parse
from datetime import datetime

SHEET_ID = '1VE4yznBlIAfLUP50tkF6IAOlNbFm2vhyPs0Jv5aJ-6U'
CACHE = {'data': None, 'ts': 0}
CACHE_TTL = 300  # 5 min

# ── helpers ───────────────────────────────────────────────────────────────
def fetch_gviz(sheet_name):
    url = (f'https://docs.google.com/spreadsheets/d/{SHEET_ID}'
           f'/gviz/tq?tqx=out:json&sheet={urllib.parse.quote(sheet_name)}')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            text = r.read().decode('utf-8')
        s = text.find('{'); e = text.rfind('}') + 1
        return json.loads(text[s:e])
    except Exception as ex:
        print(f'  [WARN] fetch "{sheet_name}": {ex}', file=sys.stderr)
        return None

def cv(cells, idx):
    """Return cell value or None."""
    if idx < len(cells) and cells[idx] and cells[idx].get('v') is not None:
        return cells[idx]['v']
    return None

def cvf(cells, idx):
    """Return formatted cell string ('f') if present, else raw value."""
    if idx < len(cells) and cells[idx]:
        f = cells[idx].get('f')
        if f is not None:
            return str(f)
        v = cells[idx].get('v')
        if v is not None:
            return v
    return None

def pnum(v):
    if v is None: return 0
    if isinstance(v, (int, float)): return float(v)
    try: return float(re.sub(r'[,\s Rp]', '', str(v)))
    except: return 0

def pgmv(v):
    if v is None: return 0
    if isinstance(v, (int, float)): return float(v)
    try: return float(re.sub(r'[^\d.]', '', str(v).replace(',', '')))
    except: return 0

def fmt_dur(v, formatted=None):
    """
    Convert gviz duration to H:MM:SS string.
    gviz encodes durations > 24h as a Date() where the date portion
    counts extra days from the epoch Dec 30, 1899.
    e.g. Date(1900,0,1,7,0,0) = 2 extra days + 7 h = 55:00:00
    
    If the gviz formatted string ('f') is provided and looks correct, use it.
    """
    # Prefer the pre-formatted value from gviz ('f' field) — it's already correct
    if formatted is not None:
        s = str(formatted).strip()
        if re.match(r'\d+:\d{2}:\d{2}', s):
            return s
    if v is None: return ''
    if isinstance(v, str) and v.startswith('Date('):
        m = re.match(r'Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)', v)
        if m:
            yr, mo, day, h, mi, s = [int(x) for x in m.groups()]
            # Compute delta days from gviz epoch (Dec 30, 1899)
            from datetime import date as _date
            try:
                # gviz months are 0-based
                d = _date(yr, mo + 1, day)
                epoch = _date(1899, 12, 30)
                extra_days = (d - epoch).days
                total_h = extra_days * 24 + h
                return f'{total_h}:{mi:02d}:{s:02d}'
            except Exception:
                return f'{h}:{mi:02d}:{s:02d}'
    return str(v)

def fmt_time(v):
    """Normalise time string → HH:MM"""
    if not v: return ''
    s = str(v)
    # e.g. "12:00:00 PM" → "12:00 PM"
    m = re.match(r'(\d+:\d+)(?::\d+)?\s*(AM|PM)?', s, re.I)
    if m:
        t = m.group(1)
        ap = (' ' + m.group(2).upper()) if m.group(2) else ''
        return t + ap
    return s

# ── Dashboard sheet parser ────────────────────────────────────────────────
def parse_dashboard(gviz):
    out = []
    if not gviz or 'table' not in gviz: return out
    for row in gviz['table'].get('rows', []):
        cells = row.get('c') or []
        month = cv(cells, 0)
        if not month or not re.search(r'\d{4}', str(month)): continue
        out.append({
            'month':     str(month).strip(),
            'lives':     int(pnum(cv(cells, 1))),
            'duration':  fmt_dur(cv(cells, 2), cvf(cells, 2)),
            'views':     int(pnum(cv(cells, 3))),
            'likes':     int(pnum(cv(cells, 4))),
            'comments':  int(pnum(cv(cells, 5))),
            'followers': int(pnum(cv(cells, 6))),
            'gmv':       pgmv(cv(cells, 7)),
        })
    return out

# ── Month sheet parser — with merged-cell carry-forward ───────────────────
def parse_month_sheet(gviz, sheet_name):
    """
    Column mapping (0-based):
      0=Day(A)  1=Date(B)  2=Time(C)  3=Platform(D)  4=Theme(E)
      5=Title(F)  6=Brief(G)  7=SKU(H)  8=Duration(I)
      9=Views(J) 10=Likes(K) 11=Comments(L) 12=Followers(M)
      13=EngRate(N) 14=GMV(O)

    Merged cells: Day, Date, Title (and sometimes Theme) only appear
    in the first sub-row of each session block; subsequent sub-rows
    for 17:00 and 19:00 have blank values in those columns.
    We carry them forward.
    """
    out = []
    if not gviz or 'table' not in gviz: return out
    raw = gviz['table'].get('rows', [])

    # carry-forward state
    last_day   = ''
    last_date  = ''
    last_title = ''
    last_theme = ''

    for row in raw:  # gviz returns data rows only (no header rows to skip)
        cells = row.get('c') or []

        # -- Update carry-forward fields when present --
        day_raw   = cv(cells, 0)
        date_raw  = cv(cells, 1)
        title_raw = cv(cells, 5)
        theme_raw = cv(cells, 4)

        if day_raw   is not None: last_day   = str(day_raw).strip()
        if date_raw  is not None: last_date  = str(date_raw).strip()
        if title_raw is not None: last_title = str(title_raw).strip()
        if theme_raw is not None: last_theme = str(theme_raw).strip()

        # -- Metric columns --
        views     = pnum(cv(cells,  9))
        likes     = pnum(cv(cells, 10))
        comments  = pnum(cv(cells, 11))
        followers = pnum(cv(cells, 12))
        gmv       = pgmv(cv(cells, 14))

        # Skip rows with no engagement data at all
        if views == 0 and likes == 0 and comments == 0 and gmv == 0:
            continue

        sku      = str(cv(cells, 7) or '').strip()
        duration = fmt_dur(cv(cells, 8), cvf(cells, 8))
        time_str = fmt_time(str(cv(cells, 2) or ''))
        platform = str(cv(cells, 3) or 'Tiktok').strip()

        out.append({
            'sheet':    sheet_name,
            'day':      last_day,
            'date':     last_date,
            'time':     time_str,
            'platform': platform,
            'theme':    last_theme,
            'title':    last_title,   # ← now properly carries forward
            'sku':      sku,
            'duration': duration,
            'views':    int(views),
            'likes':    int(likes),
            'comments': int(comments),
            'followers':int(followers),
            'gmv':      gmv,
        })
    return out

# ── Main data builder ──────────────────────────────────────────────────────
def build_tiktok_data(bust=False):
    now = time.time()
    if not bust and CACHE['data'] and (now - CACHE['ts']) < CACHE_TTL:
        return CACHE['data']

    print('  [API] Fetching fresh data…', file=sys.stderr)
    dash_gviz = fetch_gviz('Dashboard')
    dashboard = parse_dashboard(dash_gviz)

    active_sheets = [r['month'] for r in dashboard if r['lives'] > 0 or r['views'] > 0]
    if not active_sheets:
        active_sheets = ['Februari 2026', 'Maret 2026']

    month_data = []
    seen_fps = set()

    for sname in active_sheets:
        gviz = fetch_gviz(sname)
        rows = parse_month_sheet(gviz, sname)
        fp   = (rows[0]['date'] + str(rows[0]['views'])) if rows else '__empty__'

        if fp in seen_fps and fp != '__empty__':
            # Duplicate sheet — relabel rows for monthly LB but mark _dup for yearly
            relabeled = [{**r, 'sheet': sname, '_dup': True} for r in rows]
            month_data.append({'month': sname, 'rows': relabeled})
        else:
            seen_fps.add(fp)
            month_data.append({'month': sname, 'rows': rows})

    # Detect current month from today's date
    today   = datetime.now()
    id_map  = {
        'January':'Januari','February':'Februari','March':'Maret',
        'April':'April','May':'Mei','June':'Juni',
        'July':'Juli','August':'Agustus','September':'September',
        'October':'Oktober','November':'November','December':'Desember'
    }
    en_m  = today.strftime('%B')
    id_m  = id_map.get(en_m, en_m)
    yr    = today.year
    cur   = next((c for c in [f'{en_m} {yr}', f'{id_m} {yr}'] if c in active_sheets), None)
    if not cur and active_sheets:
        cur = active_sheets[-1]

    data = {
        'generated_at':  datetime.now().isoformat(),
        'dashboard':     dashboard,
        'months':        month_data,
        'current_month': cur,
    }
    CACHE['data'] = data
    CACHE['ts']   = now
    return data

# ── HTTP Handler ──────────────────────────────────────────────────────────
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/tiktok-data'):
            bust = 'bust=' in self.path
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            try:
                data = build_tiktok_data(bust=bust)
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                err = json.dumps({'error': str(e)}).encode()
                self.wfile.write(err)
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        sys.stdout.write(f'{self.log_date_time_string()} - {fmt % args}\n')
        sys.stdout.flush()

if __name__ == '__main__':
    port = 8000
    os.chdir('/home/user/webapp')
    with socketserver.TCPServer(('', port), Handler) as httpd:
        print(f'Server running at http://localhost:{port}')
        sys.stdout.flush()
        httpd.serve_forever()
