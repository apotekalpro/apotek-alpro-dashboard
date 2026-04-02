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
KOS_SHEET_ID = '1klstE9eWYuCJ67jzU0X_hgDTYQGz2M6E56qTN-KmWVA'
KOS_CACHE = {}   # sheet_name → {'data': csv_text, 'ts': timestamp}
KOS_CACHE_TTL = 180  # 3 min

# Use the gviz/tq JSON endpoint to list actual sheet names
KOS_SHEETS_CACHE = {'names': None, 'ts': 0}

MONTH_NAMES = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
]

def fetch_kos_sheet_names():
    """Return the list of month sheet names that actually exist in the spreadsheet.

    Strategy 1: Try the gviz/tq JSON endpoint (sheet=<month>) for each month and
    check which ones return valid CSV for that month.  Results are cached for
    KOS_CACHE_TTL seconds.  Because we also maintain a per-sheet cache in
    KOS_CACHE, subsequent individual CSV requests are served from cache.

    Strategy 2 (legacy / slow): Fetch the spreadsheet HTML page and parse sheet
    names from the embedded JSON.  This is unreliable because Google often blocks
    server-side requests.
    """
    now = time.time()
    if KOS_SHEETS_CACHE['names'] is not None and (now - KOS_SHEETS_CACHE['ts']) < KOS_CACHE_TTL:
        return KOS_SHEETS_CACHE['names']

    # ── Strategy 1: try HTML parsing (fast, but Google may block) ────────────
    url = f'https://docs.google.com/spreadsheets/d/{KOS_SHEET_ID}/edit'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode('utf-8')
        names_raw = re.findall(r'"name"\s*:\s*"([^"]+)"', html)
        found = []
        seen = set()
        for n in names_raw:
            if n in MONTH_NAMES and n not in seen:
                found.append(n)
                seen.add(n)
        if found:
            KOS_SHEETS_CACHE['names'] = found
            KOS_SHEETS_CACHE['ts'] = now
            print(f'  [KOS] Sheet names via HTML: {found}', file=sys.stderr)
            return found
    except Exception as ex:
        print(f'  [KOS] HTML sheet name fetch failed: {ex}', file=sys.stderr)

    # ── Strategy 2: probe each month by fetching its CSV ─────────────────────
    # (uses the same fetch_kos_csv logic, so results land in KOS_CACHE too)
    print('  [KOS] Probing month sheets via CSV…', file=sys.stderr)
    found = []
    for m in MONTH_NAMES:
        csv_text = fetch_kos_csv(m)   # returns None for non-existent sheets
        if csv_text is not None:
            found.append(m)

    KOS_SHEETS_CACHE['names'] = found
    KOS_SHEETS_CACHE['ts'] = now
    print(f'  [KOS] Sheet names via probe: {found}', file=sys.stderr)
    return found

def fetch_kos_csv(sheet_name, bust_cache=False):
    """Fetch CSV from Google Sheets for KOS Seeding dashboard (server-side, no CORS).

    Returns the CSV text if the sheet exists and contains data, or None if:
    - The sheet name does not exist in the spreadsheet
    - The response is HTML (error page)
    - The response CSV does not mention this month in its header (Google returns
      the first sheet when a requested sheet name does not exist)
    """
    now = time.time()
    if not bust_cache:
        cached = KOS_CACHE.get(sheet_name)
        if cached and (now - cached['ts']) < KOS_CACHE_TTL:
            # None cached means the sheet was confirmed absent
            return cached['data']

    url = (f'https://docs.google.com/spreadsheets/d/{KOS_SHEET_ID}'
           f'/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(sheet_name)}')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            text = r.read().decode('utf-8')

        # Reject HTML error pages or empty responses
        stripped = text.strip()
        if stripped.startswith('<!') or stripped == '':
            KOS_CACHE[sheet_name] = {'data': None, 'ts': now}
            return None

        # ── KEY CHECK ──────────────────────────────────────────────────────────
        # Google Sheets returns the FIRST sheet's CSV when the requested sheet
        # does NOT exist.  We detect this by verifying the header row of the
        # returned CSV contains the requested month name (every real KOS Seeding
        # sheet has column headers that include the month name, e.g. "Februari",
        # "Maret", etc.).
        first_line = text.split('\n')[0].lower()
        sheet_lower = sheet_name.lower()
        if sheet_lower not in first_line:
            print(f'  [KOS] "{sheet_name}" not found in header → sheet does not exist',
                  file=sys.stderr)
            # Cache the negative result so we don't keep hitting Google
            KOS_CACHE[sheet_name] = {'data': None, 'ts': now}
            return None

        KOS_CACHE[sheet_name] = {'data': text, 'ts': now}
        print(f'  [KOS] "{sheet_name}" fetched OK ({len(text)} bytes)', file=sys.stderr)
        return text

    except Exception as ex:
        print(f'  [KOS] fetch "{sheet_name}": {ex}', file=sys.stderr)
        return None


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

        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()

        elif self.path.startswith('/api/kos-seeding-sheets'):
            # Returns JSON list of real sheet names that exist in the spreadsheet.
            # Pass ?bust=1 to force-refresh the sheet-names cache.
            parsed_path = urllib.parse.urlparse(self.path)
            bust = 'bust' in urllib.parse.parse_qs(parsed_path.query)
            if bust:
                KOS_SHEETS_CACHE['names'] = None
                KOS_SHEETS_CACHE['ts'] = 0
                # Also clear CSV cache for all months so stale entries are evicted
                KOS_CACHE.clear()
            names = fetch_kos_sheet_names()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'sheets': names or []}).encode('utf-8'))

        elif self.path.startswith('/api/kos-seeding-csv'):
            # Extract ?sheet=SheetName&bust=1 from query string
            parsed_path = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed_path.query)
            sheet_name = qs.get('sheet', [''])[0].strip()
            bust_cache = 'bust' in qs
            if not sheet_name:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"Missing sheet parameter"}')
                return
            csv_text = fetch_kos_csv(sheet_name, bust_cache=bust_cache)
            if csv_text is None:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"Sheet not found"}')
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.end_headers()
            self.wfile.write(csv_text.encode('utf-8'))

        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        sys.stdout.write(f'{self.log_date_time_string()} - {fmt % args}\n')
        sys.stdout.flush()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    os.chdir('/home/user/webapp')
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', port), Handler) as httpd:
        print(f'Server running at http://localhost:{port}')
        sys.stdout.flush()
        httpd.serve_forever()
