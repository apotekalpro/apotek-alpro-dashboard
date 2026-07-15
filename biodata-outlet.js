// ============================================================
//  BIODATA OUTLET — Interactive Map + Cascade Detail View
//  v3.0 — Live data from Google Sheets (auto-reflects new outlets)
// ============================================================

const BiodataOutlet = (() => {

  // ----------------------------------------------------------
  //  STORES — populated dynamically after Google Sheets fetch
  //  Col A (idx 0) = shortCode (s)
  //  Col B (idx 1) = completeCode (c)
  //  Col C (idx 2) = storeName (n)
  //  Col J (idx 9) = kota (k)
  // ----------------------------------------------------------
  let STORES = [];   // filled by loadSheetData()

  // ----------------------------------------------------------
  //  MERGED REGION CONFIGURATION
  //  Bogor, Bekasi, Tangerang each merge Kota + Kabupaten
  // ----------------------------------------------------------
  const REGIONS = {
    "jakarta-pusat": {
      label: "Jakarta Pusat",
      shortLabel: "Jkt Pusat",
      color: "#6366F1",
      kotaMatch: ["KOTA JAKARTA PUSAT"],
    },
    "jakarta-utara": {
      label: "Jakarta Utara",
      shortLabel: "Jkt Utara",
      color: "#0EA5E9",
      kotaMatch: ["KOTA JAKARTA UTARA"],
    },
    "jakarta-barat": {
      label: "Jakarta Barat",
      shortLabel: "Jkt Barat",
      color: "#8B5CF6",
      kotaMatch: ["KOTA JAKARTA BARAT"],
    },
    "jakarta-selatan": {
      label: "Jakarta Selatan",
      shortLabel: "Jkt Selatan",
      color: "#10B981",
      kotaMatch: ["KOTA JAKARTA SELATAN"],
    },
    "jakarta-timur": {
      label: "Jakarta Timur",
      shortLabel: "Jkt Timur",
      color: "#F59E0B",
      kotaMatch: ["KOTA JAKARTA TIMUR"],
    },
    "tangerang": {
      label: "Tangerang",
      shortLabel: "Tangerang",
      color: "#EC4899",
      kotaMatch: ["KOTA TANGERANG", "KABUPATEN TANGERANG"],
    },
    "tangerang-selatan": {
      label: "Tangerang Selatan",
      shortLabel: "Tangsel",
      color: "#F43F5E",
      kotaMatch: ["KOTA TANGERANG SELATAN"],
    },
    "bekasi": {
      label: "Bekasi",
      shortLabel: "Bekasi",
      color: "#EF4444",
      kotaMatch: ["KOTA BEKASI", "KABUPATEN BEKASI"],
    },
    "depok": {
      label: "Depok",
      shortLabel: "Depok",
      color: "#0D9488",
      kotaMatch: ["KOTA DEPOK"],
    },
    "bogor": {
      label: "Bogor",
      shortLabel: "Bogor",
      color: "#22C55E",
      kotaMatch: ["KOTA BOGOR", "KABUPATEN BOGOR"],
    },
    "bandung-cimahi": {
      label: "Bandung & Cimahi",
      shortLabel: "Bandung",
      color: "#A855F7",
      kotaMatch: ["KOTA BANDUNG", "KOTA CIMAHI"],
    },
  };

  // ----------------------------------------------------------
  //  GOOGLE SHEETS CONFIG
  // ----------------------------------------------------------
  const SHEET_ID   = "1oKBl-ppv5qjsBq8IXj5Q9KPThlSepSG-ocLIdZeS3g0";
  const SHEET_NAME = "DIGITAL MASTER";
  const SHEET_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  // ----------------------------------------------------------
  //  STATE
  // ----------------------------------------------------------
  let allSheetData  = null;
  let currentView   = 'map';
  let selectedRegion  = null;
  let selectedOutlet  = null;
  let _initialized  = false;

  // ----------------------------------------------------------
  //  INIT — show loading skeleton, then fetch live data
  // ----------------------------------------------------------
  function init() {
    currentView = 'map';
    renderLoadingSkeleton();    // instant skeleton while fetching
    loadSheetData();            // async: builds STORES, then renders grid
  }

  // ----------------------------------------------------------
  //  LOADING SKELETON
  // ----------------------------------------------------------
  function renderLoadingSkeleton() {
    const container = document.getElementById('bo-main-container');
    if (!container) return;
    container.innerHTML = `
      <!-- Header skeleton -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-store text-blue-600"></i>
            Biodata Outlet
          </h3>
          <p class="text-gray-500 text-sm mt-1">Loading outlet data from Google Sheets…</p>
          <div class="flex items-center gap-2 mt-1">
            <i class="fas fa-circle-notch fa-spin text-blue-500 text-xs"></i>
            <span class="text-xs text-blue-500 font-medium">Connecting to DIGITAL MASTER sheet…</span>
          </div>
        </div>
      </div>

      <!-- Stats skeleton -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        ${Array(4).fill(0).map(() => `
          <div class="rounded-2xl p-4 border border-gray-100 animate-pulse">
            <div class="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
            <div class="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>`).join('')}
      </div>

      <!-- DKI skeleton -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-blue-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">DKI Jakarta</h4>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${Array(5).fill(0).map(() => `
            <div class="rounded-2xl border-2 border-gray-100 p-4 animate-pulse" style="min-height:110px">
              <div class="w-10 h-10 rounded-xl bg-gray-200 mb-2 mx-auto"></div>
              <div class="h-3 bg-gray-200 rounded mb-2"></div>
              <div class="h-5 bg-gray-200 rounded w-12 mx-auto"></div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Outer skeleton -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-emerald-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Greater Jakarta &amp; Beyond</h4>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          ${Array(6).fill(0).map(() => `
            <div class="rounded-2xl border-2 border-gray-100 p-5 animate-pulse" style="min-height:130px">
              <div class="w-10 h-10 rounded-xl bg-gray-200 mb-2 mx-auto"></div>
              <div class="h-3 bg-gray-200 rounded mb-2"></div>
              <div class="h-5 bg-gray-200 rounded w-12 mx-auto"></div>
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------------
  //  SHEET DATA LOADER — fetch CSV, build STORES, then render
  // ----------------------------------------------------------
  async function loadSheetData() {
    try {
      const resp = await fetch(SHEET_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      allSheetData = parseCSV(text);

      // Build STORES dynamically from parsed rows
      // Skip row 0 (header); skip rows with empty col A or col A === "SHORT CODE"
      STORES = allSheetData.slice(1)
        .filter(r => {
          const code = (r[0] || '').trim();
          return code && code.toUpperCase() !== 'SHORT CODE';
        })
        .map(r => ({
          s: r[0].trim(),                            // Short Code (col A)
          c: (r[1] || '').trim(),                    // Complete Code (col B)
          n: (r[2] || '').trim(),                    // Store Name (col C)
          k: (r[9] || '').trim().toUpperCase(),      // Kota (col J)
        }));

      // Render the real grid now that STORES is populated
      renderMapView();

    } catch (e) {
      // On error: still render map (with 0 counts) and show warning
      renderMapView();
      const statusEl = document.getElementById('bo-sheet-status');
      if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i>Could not load live data — check connection`;
        statusEl.className = 'text-xs text-red-500 font-medium mt-1';
      }
    }
  }

  // ----------------------------------------------------------
  //  CSV PARSER (handles quoted fields, embedded commas/newlines)
  // ----------------------------------------------------------
  function parseCSV(text) {
    const rows = [];
    let cur = '', inQ = false, row = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        row.push(cur); cur = '';
      } else if ((ch === '\n' || ch === '\r') && !inQ) {
        row.push(cur); cur = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // ----------------------------------------------------------
  //  HELPERS
  // ----------------------------------------------------------
  function getSheetRow(shortCode) {
    if (!allSheetData || allSheetData.length < 2) return null;
    const sc = shortCode.toUpperCase();
    for (let i = 1; i < allSheetData.length; i++) {
      if ((allSheetData[i][0] || '').trim().toUpperCase() === sc) return allSheetData[i];
    }
    return null;
  }

  function getV(row, idx) {
    if (!row) return '—';
    return (row[idx] || '').trim() || '—';
  }

  function getRegionKey(kota) {
    for (const [key, cfg] of Object.entries(REGIONS)) {
      if (cfg.kotaMatch.includes(kota)) return key;
    }
    return null;
  }

  function fmt$$(val) {
    if (!val || val === '—') return '—';
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return val;
    return 'Rp ' + num.toLocaleString('id-ID');
  }

  function fmtPct(val) {
    if (!val || val === '—') return '—';
    if (String(val).includes('%')) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toFixed(2) + '%';
  }

  // ----------------------------------------------------------
  //  BACK BUTTON COMPONENT
  // ----------------------------------------------------------
  function backBtn(label, onclick) {
    return `
      <button onclick="${onclick}"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 mb-5">
        <i class="fas fa-arrow-left text-xs"></i>
        <span>${label}</span>
      </button>`;
  }

  // ----------------------------------------------------------
  //  BREADCRUMB
  // ----------------------------------------------------------
  function breadcrumb(items) {
    return `
      <div class="flex items-center gap-1.5 mb-5 flex-wrap text-sm">
        ${items.map((item, i) => i < items.length - 1
          ? `<button onclick="${item.onclick}" class="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">${item.label}</button><i class="fas fa-chevron-right text-gray-300 text-xs"></i>`
          : `<span class="font-semibold text-gray-800">${item.label}</span>`
        ).join('')}
      </div>`;
  }

  // ----------------------------------------------------------
  //  VIEW: MAP (region grid)
  // ----------------------------------------------------------
  function showMapView() {
    currentView = 'map';
    selectedRegion = null;
    selectedOutlet = null;
    if (STORES.length === 0 && !allSheetData) {
      // Data not yet loaded — show skeleton and kick off fetch
      renderLoadingSkeleton();
      loadSheetData();
    } else {
      renderMapView();
    }
  }

  function renderMapView() {
    const container = document.getElementById('bo-main-container');
    if (!container) return;
    currentView = 'map';

    const totalOutlets = STORES.length;

    // Build regions summary (live counts from STORES)
    const regionsSummary = Object.entries(REGIONS).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: cfg.color,
      count: STORES.filter(s => cfg.kotaMatch.includes(s.k)).length
    })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);

    // DKI Jakarta group vs outer regions
    const dkiKeys    = ['jakarta-pusat','jakarta-utara','jakarta-barat','jakarta-selatan','jakarta-timur'];
    const dkiRegions   = regionsSummary.filter(r => dkiKeys.includes(r.key));
    const outerRegions = regionsSummary.filter(r => !dkiKeys.includes(r.key));
    const dkiTotal     = dkiRegions.reduce((s, r) => s + r.count, 0);

    // Icon map per region
    const icons = {
      'jakarta-pusat':     'fa-building',
      'jakarta-utara':     'fa-water',
      'jakarta-barat':     'fa-city',
      'jakarta-selatan':   'fa-tree',
      'jakarta-timur':     'fa-industry',
      'tangerang':         'fa-plane',
      'tangerang-selatan': 'fa-home',
      'bekasi':            'fa-warehouse',
      'depok':             'fa-university',
      'bogor':             'fa-mountain',
      'bandung-cimahi':    'fa-volcano',
    };

    function regionCard(r, size) {
      const icon = icons[r.key] || 'fa-map-marker-alt';
      const isLarge = size === 'large';
      return `
        <button onclick="BiodataOutlet.showRegionView('${r.key}')"
          class="bo-region-tile group relative flex flex-col items-center justify-center text-center
                 rounded-2xl border-2 border-transparent transition-all duration-200
                 hover:shadow-xl hover:-translate-y-1 cursor-pointer select-none
                 ${isLarge ? 'p-5' : 'p-4'}"
          style="background:linear-gradient(145deg, ${r.color}18, ${r.color}08);
                 border-color:${r.color}30;
                 min-height:${isLarge ? '130px' : '110px'}">
          <div class="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style="background:${r.color}"></div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm"
               style="background:${r.color}20">
            <i class="fas ${icon} text-base" style="color:${r.color}"></i>
          </div>
          <p class="font-bold text-gray-800 text-xs leading-tight mb-2 group-hover:text-gray-900">${r.label}</p>
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-black shadow-sm"
               style="background:${r.color}">
            <i class="fas fa-store text-xs opacity-80"></i>
            <span>${r.count}</span>
          </div>
          <div class="absolute bottom-2 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fas fa-arrow-right text-xs" style="color:${r.color}"></i>
          </div>
        </button>`;
    }

    // Status text
    const dataLoaded = allSheetData !== null;
    const statusHTML = dataLoaded
      ? `<i class="fas fa-check-circle mr-1 text-green-500"></i><span class="text-green-600">Live data loaded — ${totalOutlets} outlets from DIGITAL MASTER sheet</span>`
      : `<i class="fas fa-circle-notch fa-spin mr-1"></i><span class="text-blue-500">Loading from Google Sheets…</span>`;

    container.innerHTML = `
      <!-- ── PAGE HEADER ── -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-store text-blue-600"></i>
            Biodata Outlet
          </h3>
          <p class="text-gray-500 text-sm mt-1">
            <span class="font-semibold text-gray-700">${totalOutlets}</span> outlets across
            <span class="font-semibold text-gray-700">${regionsSummary.length}</span> regions
          </p>
          <div id="bo-sheet-status" class="text-xs font-medium mt-1">
            ${statusHTML}
          </div>
        </div>
        <!-- Global search bar -->
        <div class="relative w-full sm:w-80 flex-shrink-0">
          <input id="bo-search-input" type="text" placeholder="Search outlet name, code, or city…"
            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm">
          <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
          <div id="bo-search-results"
               class="hidden absolute z-50 w-full bg-white border border-gray-200
                      rounded-xl shadow-xl mt-1 max-h-72 overflow-y-auto"></div>
        </div>
      </div>

      <!-- ── SUMMARY STATS ── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
          <p class="text-xs text-blue-500 font-semibold uppercase tracking-wide">Total Outlets</p>
          <p class="text-3xl font-black text-blue-700 mt-1">${totalOutlets}</p>
        </div>
        <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border border-indigo-200">
          <p class="text-xs text-indigo-500 font-semibold uppercase tracking-wide">DKI Jakarta</p>
          <p class="text-3xl font-black text-indigo-700 mt-1">${dkiTotal}</p>
        </div>
        <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
          <p class="text-xs text-emerald-500 font-semibold uppercase tracking-wide">Regions</p>
          <p class="text-3xl font-black text-emerald-700 mt-1">${regionsSummary.length}</p>
        </div>
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
          <p class="text-xs text-orange-500 font-semibold uppercase tracking-wide">Outside DKI</p>
          <p class="text-3xl font-black text-orange-700 mt-1">${totalOutlets - dkiTotal}</p>
        </div>
      </div>

      <!-- ── DKI JAKARTA ── -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-blue-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">DKI Jakarta</h4>
          <span class="text-xs text-gray-400 font-medium">${dkiTotal} outlets</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${dkiRegions.length ? dkiRegions.map(r => regionCard(r, 'normal')).join('') : '<p class="text-gray-400 text-sm col-span-full py-4 text-center">Loading…</p>'}
        </div>
      </div>

      <!-- ── GREATER JAKARTA & BEYOND ── -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-emerald-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Greater Jakarta &amp; Beyond</h4>
          <span class="text-xs text-gray-400 font-medium">${totalOutlets - dkiTotal} outlets</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          ${outerRegions.length ? outerRegions.map(r => regionCard(r, 'large')).join('') : '<p class="text-gray-400 text-sm col-span-full py-4 text-center">Loading…</p>'}
        </div>
      </div>
    `;

    attachSearch();
  }

  // ----------------------------------------------------------
  //  VIEW: REGION (outlet list)
  // ----------------------------------------------------------
  function showRegionView(regionKey, highlightCode) {
    currentView = 'region';
    selectedRegion = regionKey;
    const cfg = REGIONS[regionKey];
    if (!cfg) return;
    const regionStores = STORES.filter(s => cfg.kotaMatch.includes(s.k));

    const container = document.getElementById('bo-main-container');
    container.innerHTML = `
      ${backBtn('← Back to Map', "BiodataOutlet.showMapView()")}
      ${breadcrumb([
        { label: '<i class="fas fa-map-marked-alt mr-1"></i>Map', onclick: "BiodataOutlet.showMapView()" },
        { label: cfg.label }
      ])}

      <!-- Region header -->
      <div class="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
           style="background:linear-gradient(135deg,${cfg.color}20,${cfg.color}08);border:1.5px solid ${cfg.color}30">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm"
               style="background:${cfg.color}">${regionStores.length}</div>
          <div>
            <h3 class="text-xl font-black text-gray-800">${cfg.label}</h3>
            <p class="text-sm text-gray-500">${regionStores.length} outlets · ${cfg.kotaMatch.join(', ')}</p>
          </div>
        </div>
        <div class="relative w-full sm:w-72">
          <input id="bo-region-search" type="text" placeholder="Filter outlets..."
            class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
            oninput="BiodataOutlet._filterRegionCards(this.value)">
          <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
        </div>
      </div>

      <!-- Outlet cards grid -->
      <div id="bo-region-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        ${regionStores.map(s => buildOutletCard(s, cfg, highlightCode)).join('')}
      </div>
      <p id="bo-region-empty" class="hidden text-center text-gray-400 py-8 text-sm">No outlets match your filter.</p>
    `;

    if (highlightCode) {
      setTimeout(() => {
        const el = document.getElementById('bo-card-' + highlightCode);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }

  function buildOutletCard(s, cfg, highlightCode) {
    const isHL = highlightCode === s.s;
    const displayName = s.n.replace(/^APOTEK ALPRO (EXPRESS )?/i, '');
    const isExpress = s.n.toLowerCase().includes('express');
    return `
      <div id="bo-card-${s.s}"
           class="bo-outlet-card group relative rounded-2xl p-4 cursor-pointer border-2 transition-all duration-200 shadow-sm hover:shadow-lg ${isHL ? 'ring-4 ring-yellow-300 border-yellow-300 scale-105' : 'border-gray-100 hover:border-opacity-50'}"
           style="background:linear-gradient(135deg,white,${cfg.color}10);"
           onclick="BiodataOutlet.showOutletDetail('${s.s}')">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${cfg.color}22;color:${cfg.color}">${s.s}</span>
              ${isExpress ? `<span class="text-xs font-semibold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">Express</span>` : ''}
            </div>
            <h4 class="font-bold text-gray-800 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">${displayName}</h4>
            <p class="text-xs text-gray-400 mt-1 truncate">${s.c}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-200 group-hover:text-blue-400 transition-colors mt-0.5 flex-shrink-0 text-xs"></i>
        </div>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <i class="fas fa-map-pin" style="color:${cfg.color}"></i>
          <span class="truncate">${s.k}</span>
        </div>
        ${isHL ? `<div class="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full shadow-md"><i class="fas fa-star mr-1"></i>Found</div>` : ''}
      </div>`;
  }

  function _filterRegionCards(q) {
    const lq = q.toLowerCase();
    const cards = document.querySelectorAll('.bo-outlet-card');
    let visible = 0;
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const show = !lq || text.includes(lq);
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const empty = document.getElementById('bo-region-empty');
    if (empty) empty.classList.toggle('hidden', visible > 0);
  }

  // ----------------------------------------------------------
  //  VIEW: OUTLET DETAIL
  // ----------------------------------------------------------
  function showOutletDetail(shortCode) {
    currentView = 'outlet';
    selectedOutlet = shortCode;
    const store = STORES.find(s => s.s === shortCode);
    if (!store) return;
    const rKey = getRegionKey(store.k);
    const cfg = rKey ? REGIONS[rKey] : { label: store.k, color: '#3B82F6', shortLabel: store.k };
    const row = getSheetRow(shortCode);

    const container = document.getElementById('bo-main-container');
    container.innerHTML = `
      ${backBtn(`← Back to ${cfg.label}`, `BiodataOutlet.showRegionView('${rKey}')`)}
      ${breadcrumb([
        { label: '<i class="fas fa-map-marked-alt mr-1"></i>Map', onclick: "BiodataOutlet.showMapView()" },
        { label: cfg.label, onclick: `BiodataOutlet.showRegionView('${rKey}')` },
        { label: store.n.replace(/^APOTEK ALPRO (EXPRESS )?/i, '') }
      ])}

      <!-- Hero banner -->
      <div class="rounded-2xl p-6 mb-6 text-white shadow-xl relative overflow-hidden"
           style="background:linear-gradient(135deg,${cfg.color},${cfg.color}cc)">
        <div class="absolute inset-0 opacity-10">
          <i class="fas fa-store-alt" style="font-size:15rem;position:absolute;right:-2rem;bottom:-3rem;line-height:1"></i>
        </div>
        <div class="relative z-10">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="bg-white/25 backdrop-blur text-white text-sm font-black px-3 py-1 rounded-full tracking-wide">${store.s}</span>
            <span class="bg-white/15 text-white/90 text-xs px-3 py-1 rounded-full font-mono">${store.c}</span>
            ${store.n.toLowerCase().includes('express') ? `<span class="bg-orange-400/80 text-white text-xs font-bold px-2 py-1 rounded-full">Express</span>` : ''}
          </div>
          <h2 class="text-2xl md:text-3xl font-black mb-1 leading-tight">${store.n}</h2>
          <p class="text-white/75 text-sm flex items-center gap-2 mt-1"><i class="fas fa-map-pin"></i>${store.k}</p>
          <p class="text-white/60 text-xs mt-2">
            ${row
              ? '<i class="fas fa-sync-alt mr-1"></i>Live data from Google Sheets'
              : '<i class="fas fa-exclamation-circle mr-1"></i>Sheet data unavailable'}
          </p>
        </div>
      </div>

      <!-- Detail sections -->
      <div class="space-y-5">
        ${detailSection('Operation Details',   'fas fa-cogs',        '#3B82F6', operationDetails(row, store))}
        ${detailSection('Business Development','fas fa-chart-line',  '#10B981', bizDevDetails(row))}
        ${detailSection('PPR Details',         'fas fa-file-contract','#8B5CF6',pprDetails(row))}
        ${detailSection('PPM Details',         'fas fa-users-cog',   '#F59E0B', ppmDetails(row))}
        ${detailSection('Sales Performance',   'fas fa-chart-bar',   '#EF4444', salesDetails(row))}
      </div>

      <!-- Bottom back -->
      <div class="mt-6">
        ${backBtn(`← Back to ${cfg.label}`, `BiodataOutlet.showRegionView('${rKey}')`)}
      </div>
    `;
  }

  function detailSection(title, icon, color, content) {
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-5 py-3.5 flex items-center gap-3 border-b border-gray-100"
             style="background:linear-gradient(to right,${color}10,white)">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center" style="background:${color}20">
            <i class="${icon} text-sm" style="color:${color}"></i>
          </div>
          <h4 class="font-bold text-gray-800">${title}</h4>
        </div>
        <div class="p-5">${content}</div>
      </div>`;
  }

  function fieldGrid(fields) {
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${fields.map(f => `
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div class="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wide">${f.l}</div>
          <div class="text-sm font-semibold text-gray-800 break-words">${f.v || '—'}</div>
        </div>`).join('')}
    </div>`;
  }

  function operationDetails(row, store) {
    return fieldGrid([
      { l: 'Short Code',    v: store.s },
      { l: 'Complete Code', v: store.c },
      { l: 'Store Name',    v: store.n },
      { l: 'Area Manager',  v: getV(row, 3) },
      { l: 'Opening Hours', v: getV(row, 4) },
      { l: 'Closing Hours', v: getV(row, 5) },
      { l: 'Date Opened',   v: getV(row, 6) },
      { l: 'Address',       v: getV(row, 7) },
      { l: 'Kecamatan',     v: getV(row, 8) },
      { l: 'Kota',          v: store.k },
      { l: 'Province',      v: getV(row, 10) },
      { l: 'Post Code',     v: getV(row, 11) },
      { l: 'Mobile No',     v: getV(row, 12) },
      { l: 'Email',         v: getV(row, 13) },
    ]);
  }

  function bizDevDetails(row) {
    return fieldGrid([
      { l: 'Lease Start Date', v: getV(row, 14) },
      { l: 'Lease End Date',   v: getV(row, 15) },
      { l: 'Monthly Rental',   v: fmt$$(getV(row, 16)) },
    ]);
  }

  function pprDetails(row) {
    return fieldGrid([
      { l: 'IMB',            v: getV(row, 17) },
      { l: 'No SIA',         v: getV(row, 18) },
      { l: 'Tgl SIA Terbit', v: getV(row, 19) },
      { l: 'Tgl SIA Expiry', v: getV(row, 20) },
      { l: 'APJ',            v: getV(row, 21) },
    ]);
  }

  function ppmDetails(row) {
    return fieldGrid([
      { l: 'Optimal HC',      v: getV(row, 22) },
      { l: 'Current HC',      v: getV(row, 23) },
      { l: 'Num of BM',       v: getV(row, 24) },
      { l: 'Num of Apoteker', v: getV(row, 25) },
      { l: 'Num of TTK',      v: getV(row, 26) },
      { l: 'Num of CE',       v: getV(row, 27) },
    ]);
  }

  function salesDetails(row) {
    return fieldGrid([
      { l: 'Target Revenue 100%',    v: fmt$$(getV(row, 28)) },
      { l: 'Goal Revenue Bulanan',   v: fmt$$(getV(row, 29)) },
      { l: 'Ave Sales',              v: fmt$$(getV(row, 30)) },
      { l: 'Last Month Revenue',     v: fmt$$(getV(row, 31)) },
      { l: 'Last Month Profit',      v: fmt$$(getV(row, 32)) },
      { l: 'Last Month Margin',      v: fmtPct(getV(row, 33)) },
      { l: 'Last Month Transactions',v: getV(row, 34) },
      { l: 'Last Month PP',          v: getV(row, 35) },
      { l: 'Last Month FP %',        v: fmtPct(getV(row, 36)) },
      { l: 'Last Month R.R %',       v: fmtPct(getV(row, 37)) },
      { l: 'Last Month PSH',         v: getV(row, 38) },
      { l: 'Forecasted Revenue',     v: fmt$$(getV(row, 39)) },
      { l: 'Current Month Growth %', v: fmtPct(getV(row, 40)) },
      { l: 'Vs Target',              v: fmtPct(getV(row, 41)) },
      { l: 'VS Goal Bulanan',        v: fmtPct(getV(row, 42)) },
      { l: 'Category',               v: getV(row, 43) },
      { l: 'Clan AM',                v: getV(row, 44) },
    ]);
  }

  // ----------------------------------------------------------
  //  GLOBAL SEARCH
  // ----------------------------------------------------------
  function attachSearch() {
    const inp = document.getElementById('bo-search-input');
    const res = document.getElementById('bo-search-results');
    if (!inp) return;

    inp.addEventListener('input', () => {
      const q = inp.value.trim().toUpperCase();
      if (!q) { res.innerHTML = ''; res.classList.add('hidden'); return; }
      const hits = STORES.filter(s =>
        s.n.toUpperCase().includes(q) || s.s.toUpperCase().includes(q) ||
        s.c.toUpperCase().includes(q) || s.k.toUpperCase().includes(q)
      ).slice(0, 10);
      if (!hits.length) {
        res.innerHTML = '<div class="px-4 py-3 text-gray-400 text-sm">No results found</div>';
        res.classList.remove('hidden'); return;
      }
      res.innerHTML = hits.map(s => {
        const rk = getRegionKey(s.k);
        const color = rk ? REGIONS[rk].color : '#6B7280';
        const dispName = s.n.replace(/^APOTEK ALPRO (EXPRESS )?/i, '');
        return `
          <div class="bo-search-item px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
               onclick="BiodataOutlet._pickSearch('${s.s}')">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color}"></div>
              <div>
                <div class="font-semibold text-gray-800 text-sm">${dispName}</div>
                <div class="text-xs text-gray-400">${s.c} · ${s.k}</div>
              </div>
            </div>
          </div>`;
      }).join('');
      res.classList.remove('hidden');
    });

    document.addEventListener('click', e => {
      if (!inp.contains(e.target) && res && !res.contains(e.target))
        res.classList.add('hidden');
    }, { passive: true });
  }

  function _pickSearch(shortCode) {
    const store = STORES.find(s => s.s === shortCode);
    const res = document.getElementById('bo-search-results');
    if (res) res.classList.add('hidden');
    if (!store) return;
    const rk = getRegionKey(store.k);
    if (rk) showRegionView(rk, shortCode);
  }

  // ----------------------------------------------------------
  //  PUBLIC API
  // ----------------------------------------------------------
  return {
    init,
    showMapView,
    showRegionView,
    showOutletDetail,
    _pickSearch,
    _filterRegionCards,
  };
})();
