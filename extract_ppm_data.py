#!/usr/bin/env python3
"""Extract real PPM data from Google Sheets and output as JSON"""
import urllib.request, io, csv, json
from collections import Counter, defaultdict
from datetime import datetime, date

SHEET_ID = '1S4uqo11FidtOHXqRJQNdd_NAQhDPSfW57qxL4llXLlc'
TODAY = date(2026, 7, 9)
SIX_M_START = date(2026, 1, 9)
TWELVE_M_START = date(2025, 7, 9)
YTD_START = date(2026, 1, 1)

def fetch_csv(gid, timeout=30):
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={gid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching gid={gid}: {e}")
        return ''

def pd(s):
    s = str(s).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except:
            pass
    return None

def load_master():
    raw = fetch_csv(1)
    rows = list(csv.reader(io.StringIO(raw)))
    return rows[2:]  # skip 2 header rows

# Column indices confirmed from data inspection
C = {
    'NAME': 0, 'POS': 4, 'ORG': 2,
    'JOIN': 8, 'RESIGN': 9,
    'BRANCH': 36, 'AM': 51,
    'STATUS': 73, 'STATUS2': 76,
    'REASON': 81, 'EI': 83,
    'COST_CENTER': 57,
}

def get(row, col_name, default=''):
    idx = C.get(col_name, -1)
    if idx < 0 or len(row) <= idx:
        return default
    return row[idx].strip()

# ─── Load all data ───────────────────────────────────────────────
print("Loading master data...")
data_rows = load_master()
print(f"  Loaded {len(data_rows)} rows")

# ─── Active Headcount ────────────────────────────────────────────
# "Active Alproean" definition: Status col73 = Active AND col76 = Active
# OR: Status col73 = Active (broader, used in BOD sheet which shows 794)
# The user says 794 - let's try: Active in col76, regardless of col73

active_794 = [r for r in data_rows
              if get(r,'STATUS2') == 'Active' and get(r,'NAME')]

active_strict = [r for r in data_rows
                 if get(r,'STATUS') == 'Active' and get(r,'STATUS2') == 'Active'
                 and get(r,'NAME')]

# True active = Status2=Active (col76 which is labeled "Status Active/Non Active" in real context)
# The BOD dashboard shows 794 "Active HC" - let's count using STATUS col 73 = Active
active_col73 = [r for r in data_rows
                if get(r,'STATUS') == 'Active' and get(r,'NAME')]

print(f"\nActive counts:")
print(f"  col73=Active: {len(active_col73)}")
print(f"  col76=Active: {len(active_794)}")
print(f"  Both: {len(active_strict)}")

# Use col73 as primary (closest to 794 - shown as 894 which includes those with future resign)
# Let's filter col73=Active AND (no resign date OR future resign date)
true_active = []
for r in data_rows:
    if not get(r, 'NAME'): continue
    if get(r, 'STATUS') != 'Active': continue
    resign_dt = pd(get(r, 'RESIGN'))
    # Active means no resign date, or resign date in the future
    if resign_dt is None or resign_dt > TODAY:
        true_active.append(r)

print(f"  True Active (Status=Active, resign=none or future): {len(true_active)}")

# HQ vs Outlet
hq_active = [r for r in true_active if 'apotek alpro' not in get(r,'BRANCH').lower()]
outlet_active = [r for r in true_active if 'apotek alpro' in get(r,'BRANCH').lower()]
print(f"  HQ Active: {len(hq_active)}")
print(f"  Outlet Active: {len(outlet_active)}")

# ─── Resignations ────────────────────────────────────────────────
res_all = []
for r in data_rows:
    if not get(r,'NAME'): continue
    d = pd(get(r,'RESIGN'))
    if d:
        res_all.append((r, d))

res_6m = [(r,d) for r,d in res_all if SIX_M_START <= d <= TODAY]
res_12m = [(r,d) for r,d in res_all if TWELVE_M_START <= d <= TODAY]
res_ytd = [(r,d) for r,d in res_all if YTD_START <= d <= TODAY]

print(f"\nResignations:")
print(f"  6M (Jan9-Jul9 2026): {len(res_6m)}")
print(f"  12M (Jul9 2025-Jul9 2026): {len(res_12m)}")
print(f"  YTD (Jan1-Jul9 2026): {len(res_ytd)}")

# ─── New Hires ────────────────────────────────────────────────────
hire_all = []
for r in data_rows:
    if not get(r,'NAME'): continue
    d = pd(get(r,'JOIN'))
    if d:
        hire_all.append((r, d))

hire_6m = [(r,d) for r,d in hire_all if SIX_M_START <= d <= TODAY]
hire_12m = [(r,d) for r,d in hire_all if TWELVE_M_START <= d <= TODAY]
hire_ytd = [(r,d) for r,d in hire_all if YTD_START <= d <= TODAY]
print(f"\nNew Hires:")
print(f"  6M: {len(hire_6m)}, 12M: {len(hire_12m)}, YTD: {len(hire_ytd)}")

# ─── Monthly breakdown (Feb-Jul 2026) ────────────────────────────
months_6m = ['2026-02','2026-03','2026-04','2026-05','2026-06','2026-07']
month_labels = ['Feb 26','Mar 26','Apr 26','May 26','Jun 26','Jul 26']

monthly_resign = defaultdict(int)
monthly_hire = defaultdict(int)

for _,d in res_all:
    key = d.strftime('%Y-%m')
    if key in months_6m:
        monthly_resign[key] += 1

for _,d in hire_all:
    key = d.strftime('%Y-%m')
    if key in months_6m:
        monthly_hire[key] += 1

resign_monthly = [monthly_resign.get(m, 0) for m in months_6m]
hire_monthly = [monthly_hire.get(m, 0) for m in months_6m]
print(f"\nMonthly (Feb-Jul 2026):")
for i,m in enumerate(months_6m):
    print(f"  {m}: Resign={resign_monthly[i]}, Hire={hire_monthly[i]}")

# ─── HQ vs Outlet resignation (12M) ─────────────────────────────
hq_res_12m = [(r,d) for r,d in res_12m if 'apotek alpro' not in get(r,'BRANCH').lower()]
outlet_res_12m = [(r,d) for r,d in res_12m if 'apotek alpro' in get(r,'BRANCH').lower()]
print(f"\nHQ resigned 12M: {len(hq_res_12m)}, Outlet: {len(outlet_res_12m)}")

# ─── Position breakdown ───────────────────────────────────────────
pos_active = Counter(get(r,'POS') for r in true_active if get(r,'POS'))
pos_resign_12m = Counter(get(r,'POS') for r,_ in res_12m if get(r,'POS'))
print(f"\nTop positions ACTIVE:")
for p,c in pos_active.most_common(10):
    print(f"  '{p}': {c}")
print(f"\nTop positions RESIGNED 12M:")
for p,c in pos_resign_12m.most_common(10):
    print(f"  '{p}': {c}")

# ─── AM (Approval Line) resign 12M ────────────────────────────────
am_resign_12m = Counter(get(r,'AM') for r,_ in res_12m if get(r,'AM'))
print(f"\nTop AM resign 12M:")
for a,c in am_resign_12m.most_common(12):
    print(f"  '{a}': {c}")

# ─── Resign reasons ───────────────────────────────────────────────
reason_cnt = Counter(get(r,'REASON') for r in data_rows if get(r,'REASON'))
print(f"\nResign reasons:")
total_reason = sum(reason_cnt.values())
for rr,c in reason_cnt.most_common(8):
    print(f"  '{rr}': {c} ({c/total_reason*100:.1f}%)")

# ─── Exit Interview ────────────────────────────────────────────────
ei_count = sum(1 for r in data_rows if get(r,'EI') not in ('','#N/A','None'))
print(f"\nExit interview records: {ei_count}")

# ─── Newbie vs Oldbie (6M resign) ─────────────────────────────────
nb = ob = 0
for r, rd in res_6m:
    jd = pd(get(r,'JOIN'))
    if jd:
        if (rd - jd).days < 183:
            nb += 1
        else:
            ob += 1
print(f"\nNewbie (<6M): {nb}, Oldbie (>=6M): {ob}")

# ─── Monthly newbie/oldbie ────────────────────────────────────────
nb_monthly = defaultdict(int)
ob_monthly = defaultdict(int)
for r, rd in res_all:
    key = rd.strftime('%Y-%m')
    if key not in months_6m: continue
    jd = pd(get(r,'JOIN'))
    if jd:
        if (rd - jd).days < 183:
            nb_monthly[key] += 1
        else:
            ob_monthly[key] += 1

newbie_arr = [nb_monthly.get(m,0) for m in months_6m]
oldbie_arr = [ob_monthly.get(m,0) for m in months_6m]
print(f"\nNewbie monthly: {newbie_arr}")
print(f"Oldbie monthly: {oldbie_arr}")

# ─── Output JSON for dashboard ────────────────────────────────────
result = {
    "activeHC": len(true_active),
    "hqActiveHC": len(hq_active),
    "outletActiveHC": len(outlet_active),
    "resigned6M": len(res_6m),
    "resigned12M": len(res_12m),
    "resignedYTD": len(res_ytd),
    "newHire6M": len(hire_6m),
    "newHire12M": len(hire_12m),
    "newHireYTD": len(hire_ytd),
    "resignMonthly": resign_monthly,
    "hireMonthly": hire_monthly,
    "hqResigned12M": len(hq_res_12m),
    "outletResigned12M": len(outlet_res_12m),
    "newbieTurnover6M": nb,
    "oldbieTurnover6M": ob,
    "newbieMonthly": newbie_arr,
    "oldbieMonthly": oldbie_arr,
    "exitInterviewCount": ei_count,
    "positionActive": dict(pos_active.most_common(10)),
    "positionResigned12M": dict(pos_resign_12m.most_common(10)),
    "amResigned12M": dict(am_resign_12m.most_common(12)),
    "resignReasons": dict(reason_cnt.most_common(8)),
    "monthLabels": month_labels,
}

with open('/home/user/webapp/ppm_real_data.json', 'w') as f:
    json.dump(result, f, indent=2)
print(f"\n✅ Data written to ppm_real_data.json")
print(json.dumps(result, indent=2))
