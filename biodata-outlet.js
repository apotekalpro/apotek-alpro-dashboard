// ============================================================
//  BIODATA OUTLET — Interactive Map + Cascade Detail View
//  Data source: Google Sheets "DIGITAL MASTER"
// ============================================================

const BiodataOutlet = (() => {

  // ----------------------------------------------------------
  //  RAW STORE DATA  (A=shortCode, B=completeCode, C=storeName, J=kota)
  // ----------------------------------------------------------
  const STORES = [
    {shortCode:"JKJSTT",completeCode:"10001-JKJSTT1",name:"APOTEK ALPRO TEBET TIMUR",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJSVR",completeCode:"10002-JKJSVR1",name:"APOTEK ALPRO VETERAN RAYA",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJBTM",completeCode:"10003-JKJBTM1",name:"APOTEK ALPRO TOMANG",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JKJSBZ",completeCode:"10004-JKJSBZ1",name:"APOTEK ALPRO BELLEZA",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"BTTSGV",completeCode:"10005-BTTSGV1",name:"APOTEK ALPRO GOLDEN VIENNA",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"BTTSSU",completeCode:"10006-BTTSSU1",name:"APOTEK ALPRO SUTERA UTAMA",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"JKJUSK",completeCode:"10007-JKJUSK1",name:"APOTEK ALPRO SUNTER KEMAYORAN",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"BTTSB9",completeCode:"10008-BTTSB91",name:"APOTEK ALPRO BINTARO SEKTOR 9",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"BTTSVS",completeCode:"10009-BTTSVS1",name:"APOTEK ALPRO VERSAILLES",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"BTTGBI",completeCode:"10010-BTTGBI1",name:"APOTEK ALPRO BOLSENA ILAGGO",kota:"KABUPATEN TANGERANG"},
    {shortCode:"JKJPSR",completeCode:"10011-JKJPSR1",name:"APOTEK ALPRO SALEMBA RAYA",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"BTTSGR",completeCode:"10012-BTTSGR1",name:"APOTEK ALPRO GRAHA RAYA",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"JKJSTB",completeCode:"10013-JKJSTB1",name:"APOTEK ALPRO TEBET BARAT",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJSKC",completeCode:"10014-JKJSKC1",name:"APOTEK ALPRO KALIBATA CITY",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJBGV",completeCode:"10015-JKJBGV1",name:"APOTEK ALPRO GREENVILLE",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JKJPMB",completeCode:"10016-JKJPMB1",name:"APOTEK ALPRO MANGGA BESAR",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"BTTGBW",completeCode:"10017-BTTGBW1",name:"APOTEK ALPRO BANJAR WIJAYA",kota:"KOTA TANGERANG"},
    {shortCode:"BTTSB2",completeCode:"10018-BTTSB21",name:"APOTEK ALPRO BINTARO SEKTOR 2",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"JKJSRR",completeCode:"10019-JKJSRR1",name:"APOTEK ALPRO REMPOA RAYA",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJSGH",completeCode:"10020-JKJSGH1",name:"APOTEK ALPRO GEDUNG HIJAU",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JBBSOC",completeCode:"10021-JBBSOC1",name:"APOTEK ALPRO OLYMPIC CIKARANG",kota:"KABUPATEN BEKASI"},
    {shortCode:"JBBGCV",completeCode:"10022-JBBGCV1",name:"APOTEK ALPRO CIMANGGU VILLA",kota:"KOTA BOGOR"},
    {shortCode:"JBDPAU",completeCode:"10023-JBDPAU1",name:"APOTEK ALPRO AKSES UI",kota:"KOTA DEPOK"},
    {shortCode:"JBDPMR",completeCode:"10024-JBDPMR1",name:"APOTEK ALPRO MARGONDA RAYA",kota:"KOTA DEPOK"},
    {shortCode:"JBBSMT",completeCode:"10025-JBBSMT1",name:"APOTEK ALPRO METLAND TAMBUN",kota:"KABUPATEN BEKASI"},
    {shortCode:"BTTGEK",completeCode:"10026-BTTGEK1",name:"APOTEK ALPRO ESPANA KARAWACI",kota:"KOTA TANGERANG"},
    {shortCode:"JBDPSW",completeCode:"10027-JBDPSW1",name:"APOTEK ALPRO SILIWANGI",kota:"KOTA DEPOK"},
    {shortCode:"JKJTTH",completeCode:"10028-JKJTTH1",name:"APOTEK ALPRO TAMANSARI HIVE",kota:"KOTA JAKARTA TIMUR"},
    {shortCode:"JKJSRD",completeCode:"10029-JKJSRD1",name:"APOTEK ALPRO RADIO DALAM",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJBRS",completeCode:"10030-JKJBRS1",name:"APOTEK ALPRO MERUYA RADEN SALEH",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JBBGCC",completeCode:"10031-JBBGCC1",name:"APOTEK ALPRO CIBUBUR CIKEAS",kota:"KABUPATEN BOGOR"},
    {shortCode:"JKJBKB",completeCode:"10032-JKJBKB1",name:"APOTEK ALPRO KOSAMBI BARU",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JKJPDA",completeCode:"10033-JKJPDA1",name:"APOTEK ALPRO MRT DUKUH ATAS",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"JBBSJB",completeCode:"10034-JBBSJB1",name:"APOTEK ALPRO JATIBENING",kota:"KOTA BEKASI"},
    {shortCode:"BTTSRF",completeCode:"10035-BTTSRF1",name:"APOTEK ALPRO RADEN FATAH",kota:"KOTA TANGERANG"},
    {shortCode:"JKJUSI",completeCode:"10036-JKJUSI1",name:"APOTEK ALPRO SUNTER INDAH",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JBBGRC",completeCode:"10037-JBBGRC1",name:"APOTEK ALPRO RAYA CIKARET",kota:"KABUPATEN BOGOR"},
    {shortCode:"JKJSTS",completeCode:"10039-JKJSTS1",name:"APOTEK ALPRO TAMANSARI SEMANGGI",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JBBSTR",completeCode:"10040-JBBSTR1",name:"APOTEK ALPRO BEKASI TIMUR REGENCY",kota:"KOTA BEKASI"},
    {shortCode:"BTTSRG",completeCode:"10042-BTTSRG1",name:"APOTEK ALPRO REGIA GRAHA",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"BTTGSG",completeCode:"10043-BTTGSG1",name:"APOTEK ALPRO SERPONG GARDEN",kota:"KABUPATEN TANGERANG"},
    {shortCode:"JKJPMS",completeCode:"10044-JKJPMS1",name:"APOTEK ALPRO MENTENG SQUARE",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"JKJBDK",completeCode:"10045-JKJBDK1",name:"APOTEK ALPRO DURI KOSAMBI",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"BTTSRC",completeCode:"10046-BTTSRC1",name:"APOTEK ALPRO EXPRESS RAYA CEGER",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"JKJUBR",completeCode:"10047-JKJUBR1",name:"APOTEK ALPRO BOULEVARD RAYA",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JBBGBR",completeCode:"10049-JBBGBR1",name:"APOTEK ALPRO BANGBARUNG RAYA",kota:"KOTA BOGOR"},
    {shortCode:"JKJTPL",completeCode:"10051-JKJTPL1",name:"APOTEK ALPRO PISANGAN LAMA",kota:"KOTA JAKARTA TIMUR"},
    {shortCode:"JKJTLB",completeCode:"10052-JKJTLB1",name:"APOTEK ALPRO LUBANG BUAYA",kota:"KOTA JAKARTA TIMUR"},
    {shortCode:"JKJUTG",completeCode:"10053-JKJUTG1",name:"APOTEK ALPRO TELUK GONG",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJSRS",completeCode:"10055-JKJSRS1",name:"APOTEK ALPRO RASUNA",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JBBSRP",completeCode:"10056-JBBSRP1",name:"APOTEK ALPRO RAYA PRAMUKA",kota:"KOTA BEKASI"},
    {shortCode:"BTTGBR",completeCode:"10057-BTTGBR1",name:"APOTEK ALPRO BERINGIN RAYA",kota:"KOTA TANGERANG"},
    {shortCode:"JBBSSR",completeCode:"10058-JBBSSR1",name:"APOTEK ALPRO SINGARAJA",kota:"KABUPATEN BEKASI"},
    {shortCode:"JBBGWU",completeCode:"10059-JBBGWU1",name:"APOTEK ALPRO WISATA UTAMA",kota:"KABUPATEN BOGOR"},
    {shortCode:"JKJSRM",completeCode:"10060-JKJSRM1",name:"APOTEK ALPRO RASAMALA",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"BTTSBB",completeCode:"10061-BTTSBB1",name:"APOTEK ALPRO BOULEVARD BSD",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"JBBSKP",completeCode:"10062-JBBSKP1",name:"APOTEK ALPRO KEMANG PRATAMA",kota:"KOTA BEKASI"},
    {shortCode:"JKJBHI",completeCode:"10063-JKJBHI1",name:"APOTEK ALPRO HARAPAN INDAH",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JBBSGI",completeCode:"10064-JBBSGI1",name:"APOTEK ALPRO GALAXI INDAH",kota:"KOTA BEKASI"},
    {shortCode:"BTTGPS",completeCode:"10065-BTTGPS1",name:"APOTEK ALPRO PALEM SEMI",kota:"KABUPATEN TANGERANG"},
    {shortCode:"JKJUWB",completeCode:"10066-JKJUWB1",name:"APOTEK ALPRO WALANG BARU",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JBBSGW",completeCode:"10067-JBBSGW1",name:"APOTEK ALPRO GRAND WISATA",kota:"KABUPATEN BEKASI"},
    {shortCode:"BTTGPP",completeCode:"10068-BTTGPP1",name:"APOTEK ALPRO PORIS PARADISE",kota:"KOTA TANGERANG"},
    {shortCode:"JKJSKR",completeCode:"10069-JKJSKR1",name:"APOTEK ALPRO KALIBATA RESIDENCE",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJPSB",completeCode:"10070-JKJPSB1",name:"APOTEK ALPRO SABANG",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"JKJBHL",completeCode:"10071-JKJBHL1",name:"APOTEK ALPRO HAJI LEBAR",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JKJSBI",completeCode:"10072-JKJSBI1",name:"APOTEK ALPRO BONA INDAH",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JBBGLW",completeCode:"10073-JBBGLW1",name:"APOTEK ALPRO LEGENDA WISATA",kota:"KABUPATEN BOGOR"},
    {shortCode:"JKJUPI",completeCode:"10074-JKJUPI1",name:"APOTEK ALPRO PIK",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJBCS",completeCode:"10076-JKJBCS1",name:"APOTEK ALPRO CITRA SATU",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JBBSCC",completeCode:"10077-JBBSCC1",name:"APOTEK ALPRO CITRAGRAND CIBUBUR",kota:"KOTA BEKASI"},
    {shortCode:"BTTGCR",completeCode:"10078-BTTGCR1",name:"APOTEK ALPRO CITRA RAYA",kota:"KABUPATEN TANGERANG"},
    {shortCode:"JKJSMP",completeCode:"10079-JKJSMP1",name:"APOTEK ALPRO MAMPANG PRAPATAN",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJUGK",completeCode:"10080-JKJUGK1",name:"APOTEK ALPRO GADING KIRANA",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJPTR",completeCode:"10081-JKJPTR1",name:"APOTEK ALPRO THAMRIN RESIDENCE",kota:"KOTA JAKARTA PUSAT"},
    {shortCode:"JKJUAM",completeCode:"10082-JKJUAM1",name:"APOTEK ALPRO APARTEMEN MOI",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJSTM",completeCode:"10083-JKJSTM1",name:"APOTEK ALPRO TEBET MAS INDAH",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJTPD",completeCode:"10084-JKJTPD1",name:"APOTEK ALPRO PONDASI",kota:"KOTA JAKARTA TIMUR"},
    {shortCode:"JBBGWC",completeCode:"10085-JBBGWC1",name:"APOTEK ALPRO WISATA CANADIAN",kota:"KABUPATEN BOGOR"},
    {shortCode:"BTTGGB",completeCode:"10086-BTTGGB1",name:"APOTEK ALPRO GADING BOULEVARD",kota:"KOTA TANGERANG"},
    {shortCode:"JKJUGB",completeCode:"10087-JKJUGB1",name:"APOTEK ALPRO KELAPA GADING BOULEVARD",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJUGN",completeCode:"10088-JKJUGN1",name:"APOTEK ALPRO GADING NIAS",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JKJPMP",completeCode:"10089-JKJPMP1",name:"APOTEK ALPRO MEDITERANIA PALACE",kota:"KOTA JAKARTA UTARA"},
    {shortCode:"JBBSLH",completeCode:"10090-JBBSLH1",name:"APOTEK ALPRO LEMBAH HIJAU",kota:"KABUPATEN BEKASI"},
    {shortCode:"BTTGKS",completeCode:"10091-BTTGKS1",name:"APOTEK ALPRO KREO SELATAN",kota:"KOTA TANGERANG"},
    {shortCode:"JBBGBD",completeCode:"10092-JBBGBD1",name:"APOTEK ALPRO BUKIT DAGO",kota:"KABUPATEN BOGOR"},
    {shortCode:"JBBSJM",completeCode:"10093-JBBSJM1",name:"APOTEK ALPRO JATIMAKMUR",kota:"KOTA BEKASI"},
    {shortCode:"JKJBSC",completeCode:"10094-JKJBSC1",name:"APOTEK ALPRO SEASONS CITY",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"JKJBPL",completeCode:"10095-JKJBPL1",name:"APOTEK ALPRO PALEM LESTARI",kota:"KOTA JAKARTA BARAT"},
    {shortCode:"BTTSWS",completeCode:"10096-BTTSWS1",name:"APOTEK ALPRO WR SUPRATMAN",kota:"KOTA TANGERANG SELATAN"},
    {shortCode:"BTTGPB",completeCode:"10097-BTTGPB1",name:"APOTEK ALPRO PURI BETA",kota:"KOTA TANGERANG"},
    {shortCode:"JKJSKB",completeCode:"10098-JKJSKB1",name:"APOTEK ALPRO KEBAGUSAN CITY",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JKJSPR",completeCode:"10099-JKJSPR1",name:"APOTEK ALPRO PANCORAN RIVERSIDE",kota:"KOTA JAKARTA SELATAN"},
    {shortCode:"JBBGPS",completeCode:"10100-JBBGPS1",name:"APOTEK ALPRO PANGERAN SOGIRI",kota:"KOTA BOGOR"},
    {shortCode:"JBBGTC",completeCode:"10101-JBBGTC1",name:"APOTEK ALPRO TAMAN CILEUNGSI",kota:"KABUPATEN BOGOR"},
    {shortCode:"JBDPRK",completeCode:"10102-JBDPRK1",name:"APOTEK ALPRO RAYA KUKUSAN",kota:"KABUPATEN BOGOR"},
    {shortCode:"JKJTMM",completeCode:"10103-JKJTMM1",name:"APOTEK ALPRO METLAND MENTENG",kota:"KOTA JAKARTA TIMUR"},
    {shortCode:"JBBSKH",completeCode:"10104-JBBSKH1",name:"APOTEK ALPRO KOTA HARAPAN INDAH",kota:"KOTA BEKASI"},
    {shortCode:"JKJTRC",completeCode:"10105-JKJTRC1",name:"APOTEK ALPRO RAYA CIPAYUNG",kota:"KOTA JAKARTA TIMUR"},
  ];

  // ----------------------------------------------------------
  //  REGION CONFIGURATION — map label + color + kota list
  // ----------------------------------------------------------
  const REGIONS = {
    "jakarta-pusat": {
      label: "Jakarta Pusat",
      color: "#3B82F6",
      hoverColor: "#1D4ED8",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA JAKARTA PUSAT"],
      mapX: 47, mapY: 38, mapW: 12, mapH: 10,
    },
    "jakarta-utara": {
      label: "Jakarta Utara",
      color: "#06B6D4",
      hoverColor: "#0891B2",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA JAKARTA UTARA"],
      mapX: 44, mapY: 20, mapW: 16, mapH: 18,
    },
    "jakarta-barat": {
      label: "Jakarta Barat",
      color: "#8B5CF6",
      hoverColor: "#7C3AED",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA JAKARTA BARAT"],
      mapX: 30, mapY: 30, mapW: 17, mapH: 20,
    },
    "jakarta-selatan": {
      label: "Jakarta Selatan",
      color: "#10B981",
      hoverColor: "#059669",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA JAKARTA SELATAN"],
      mapX: 40, mapY: 48, mapW: 18, mapH: 18,
    },
    "jakarta-timur": {
      label: "Jakarta Timur",
      color: "#F59E0B",
      hoverColor: "#D97706",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA JAKARTA TIMUR"],
      mapX: 58, mapY: 30, mapW: 18, mapH: 24,
    },
    "tangerang-selatan": {
      label: "Tangerang Selatan",
      color: "#EC4899",
      hoverColor: "#DB2777",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA TANGERANG SELATAN"],
      mapX: 18, mapY: 52, mapW: 18, mapH: 16,
    },
    "tangerang-kota": {
      label: "Kota Tangerang",
      color: "#F97316",
      hoverColor: "#EA580C",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA TANGERANG"],
      mapX: 12, mapY: 28, mapW: 18, mapH: 20,
    },
    "kab-tangerang": {
      label: "Kab. Tangerang",
      color: "#84CC16",
      hoverColor: "#65A30D",
      highlightColor: "#FDE047",
      kotaMatch: ["KABUPATEN TANGERANG"],
      mapX: 4, mapY: 14, mapW: 20, mapH: 22,
    },
    "kota-bekasi": {
      label: "Kota Bekasi",
      color: "#EF4444",
      hoverColor: "#DC2626",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA BEKASI"],
      mapX: 76, mapY: 30, mapW: 15, mapH: 18,
    },
    "kab-bekasi": {
      label: "Kab. Bekasi",
      color: "#DC2626",
      hoverColor: "#B91C1C",
      highlightColor: "#FDE047",
      kotaMatch: ["KABUPATEN BEKASI"],
      mapX: 76, mapY: 48, mapW: 20, mapH: 20,
    },
    "depok": {
      label: "Depok",
      color: "#0EA5E9",
      hoverColor: "#0284C7",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA DEPOK"],
      mapX: 42, mapY: 66, mapW: 14, mapH: 12,
    },
    "bogor-kota": {
      label: "Kota Bogor",
      color: "#22C55E",
      hoverColor: "#16A34A",
      highlightColor: "#FDE047",
      kotaMatch: ["KOTA BOGOR"],
      mapX: 38, mapY: 78, mapW: 12, mapH: 12,
    },
    "kab-bogor": {
      label: "Kab. Bogor",
      color: "#4ADE80",
      hoverColor: "#22C55E",
      highlightColor: "#FDE047",
      kotaMatch: ["KABUPATEN BOGOR"],
      mapX: 56, mapY: 66, mapW: 22, mapH: 22,
    },
  };

  // Google Sheets CSV export URL
  const SHEET_ID = "1oKBl-ppv5qjsBq8IXj5Q9KPThlSepSG-ocLIdZeS3g0";
  const SHEET_NAME = "DIGITAL MASTER";
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  // State
  let allSheetData = null;  // rows from sheet
  let currentView = 'map'; // 'map' | 'region' | 'outlet'
  let selectedRegion = null;
  let selectedOutlet = null;
  let searchHighlight = null; // shortCode of highlighted store

  // ----------------------------------------------------------
  //  INIT
  // ----------------------------------------------------------
  function init() {
    renderMapView();
    loadSheetData();
    attachSearchListener();
  }

  // ----------------------------------------------------------
  //  SHEET DATA LOADER
  // ----------------------------------------------------------
  async function loadSheetData() {
    const statusEl = document.getElementById('bo-sheet-status');
    if (statusEl) statusEl.textContent = 'Loading live data...';
    try {
      const resp = await fetch(SHEET_URL);
      if (!resp.ok) throw new Error('Network error');
      const text = await resp.text();
      allSheetData = parseCSV(text);
      if (statusEl) {
        statusEl.textContent = `✓ Live data loaded (${allSheetData.length - 1} outlets)`;
        statusEl.className = 'text-xs text-green-600 font-medium mt-1';
      }
      // If we're already on outlet detail, refresh
      if (currentView === 'outlet' && selectedOutlet) {
        showOutletDetail(selectedOutlet);
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = '⚠ Using offline data (could not reach sheet)';
        statusEl.className = 'text-xs text-amber-600 font-medium mt-1';
      }
    }
  }

  // ----------------------------------------------------------
  //  CSV PARSER
  // ----------------------------------------------------------
  function parseCSV(text) {
    const rows = [];
    let cur = '', inQ = false, row = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQ && text[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        row.push(cur); cur = '';
      } else if ((ch === '\n' || ch === '\r') && !inQ) {
        row.push(cur); cur = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r' && text[i+1] === '\n') i++;
      } else {
        cur += ch;
      }
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // Get row from sheet by short code
  function getSheetRow(shortCode) {
    if (!allSheetData || allSheetData.length < 2) return null;
    for (let i = 1; i < allSheetData.length; i++) {
      if ((allSheetData[i][0] || '').trim().toUpperCase() === shortCode.toUpperCase()) {
        return allSheetData[i];
      }
    }
    return null;
  }

  function getColVal(row, idx) {
    if (!row) return '—';
    const v = (row[idx] || '').trim();
    return v || '—';
  }

  // ----------------------------------------------------------
  //  SEARCH
  // ----------------------------------------------------------
  function attachSearchListener() {
    const inp = document.getElementById('bo-search-input');
    const resultsEl = document.getElementById('bo-search-results');
    if (!inp) return;
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toUpperCase();
      if (!q) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        clearSearchHighlight();
        return;
      }
      const matches = STORES.filter(s =>
        s.name.includes(q) ||
        s.shortCode.includes(q) ||
        s.completeCode.includes(q) ||
        s.kota.includes(q)
      ).slice(0, 8);

      if (!matches.length) {
        resultsEl.innerHTML = '<div class="px-4 py-2 text-gray-400 text-sm">No results found</div>';
        resultsEl.classList.remove('hidden');
        return;
      }
      resultsEl.innerHTML = matches.map(s => `
        <div class="bo-search-item px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
             onclick="BiodataOutlet.selectSearchResult('${s.shortCode}')">
          <div class="font-semibold text-gray-800 text-sm">${s.name}</div>
          <div class="text-xs text-gray-500">${s.completeCode} · ${s.kota}</div>
        </div>
      `).join('');
      resultsEl.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!inp.contains(e.target) && !resultsEl.contains(e.target)) {
        resultsEl.classList.add('hidden');
      }
    });
  }

  function selectSearchResult(shortCode) {
    const store = STORES.find(s => s.shortCode === shortCode);
    if (!store) return;
    document.getElementById('bo-search-results').classList.add('hidden');
    // Find region
    const regionKey = getRegionKey(store.kota);
    // Highlight region on map
    searchHighlight = shortCode;
    if (currentView !== 'map') {
      showMapView();
    }
    setTimeout(() => {
      highlightRegionOnMap(regionKey);
      // Show region popup with this store highlighted
      showRegionView(regionKey, shortCode);
    }, 100);
  }

  function getRegionKey(kota) {
    for (const [key, cfg] of Object.entries(REGIONS)) {
      if (cfg.kotaMatch.includes(kota)) return key;
    }
    return null;
  }

  function clearSearchHighlight() {
    searchHighlight = null;
    document.querySelectorAll('.map-region').forEach(el => {
      const rid = el.dataset.region;
      if (rid) {
        el.style.opacity = '1';
        el.style.filter = 'none';
      }
    });
  }

  function highlightRegionOnMap(regionKey) {
    document.querySelectorAll('.map-region').forEach(el => {
      if (el.dataset.region !== regionKey) {
        el.style.opacity = '0.4';
      } else {
        el.style.opacity = '1';
        el.style.filter = 'drop-shadow(0 0 12px #FDE047)';
      }
    });
  }

  // ----------------------------------------------------------
  //  VIEW: MAP
  // ----------------------------------------------------------
  function showMapView() {
    currentView = 'map';
    selectedRegion = null;
    selectedOutlet = null;
    renderMapView();
  }

  function renderMapView() {
    const container = document.getElementById('bo-main-container');
    if (!container) return;

    const totalOutlets = STORES.length;
    const regionsSummary = Object.entries(REGIONS).map(([key, cfg]) => {
      const count = STORES.filter(s => cfg.kotaMatch.includes(s.kota)).length;
      return { key, label: cfg.label, color: cfg.color, count };
    }).filter(r => r.count > 0);

    container.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-map-marked-alt text-blue-600"></i>
            Biodata Outlet — Map View
          </h3>
          <p class="text-gray-500 text-sm mt-1">${totalOutlets} outlets across Greater Jakarta & surroundings</p>
          <div id="bo-sheet-status" class="text-xs text-blue-500 font-medium mt-1">Loading live data...</div>
        </div>
        <!-- Search -->
        <div class="relative w-full md:w-80">
          <div class="relative">
            <input id="bo-search-input" type="text" placeholder="Search outlet name, code, or city..."
              class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm">
            <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
          </div>
          <div id="bo-search-results" class="hidden absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-72 overflow-y-auto"></div>
        </div>
      </div>

      <!-- Map + Legend row -->
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- SVG Map -->
        <div class="flex-1 bg-gradient-to-br from-sky-50 to-blue-100 rounded-2xl p-4 shadow-inner border border-blue-200" style="min-height:460px">
          <div class="text-center text-xs text-blue-500 mb-2 font-medium">Click a region to explore outlets</div>
          ${buildSVGMap()}
        </div>

        <!-- Legend / Region Cards -->
        <div class="lg:w-72 flex flex-col gap-2">
          <div class="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2">
            <i class="fas fa-layer-group text-blue-500"></i> Regions
          </div>
          ${regionsSummary.map(r => `
            <div class="region-card flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer border-2 border-transparent hover:border-blue-300 shadow-sm transition-all duration-200 hover:shadow-md"
                 style="background: linear-gradient(135deg, ${r.color}18, ${r.color}30);"
                 onclick="BiodataOutlet.showRegionView('${r.key}')">
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full shadow-sm" style="background:${r.color}"></div>
                <span class="text-sm font-medium text-gray-800">${r.label}</span>
              </div>
              <span class="text-xs font-bold px-2 py-1 rounded-full text-white" style="background:${r.color}">${r.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    attachSearchListener();
    attachMapHover();
  }

  function buildSVGMap() {
    // SVG paths representing Greater Jakarta regions (simplified polygon map)
    // Coordinates are in % of 800x600 viewBox
    const svgPaths = {
      "jakarta-pusat":   "M 375,190 L 420,185 L 440,200 L 435,250 L 405,255 L 370,240 Z",
      "jakarta-utara":   "M 350,80  L 480,70  L 510,90  L 500,160 L 460,185 L 420,185 L 375,190 L 355,175 Z",
      "jakarta-barat":   "M 195,155 L 355,175 L 375,190 L 370,240 L 340,280 L 300,295 L 235,280 L 195,255 Z",
      "jakarta-selatan": "M 340,280 L 370,240 L 405,255 L 435,250 L 450,290 L 440,340 L 410,360 L 365,360 L 330,335 Z",
      "jakarta-timur":   "M 435,200 L 520,195 L 560,220 L 555,305 L 520,320 L 470,320 L 450,290 L 435,250 Z",
      "tangerang-selatan":"M 165,310 L 235,280 L 300,295 L 330,335 L 315,385 L 285,410 L 230,415 L 175,390 Z",
      "tangerang-kota":  "M 95,175  L 195,155 L 235,280 L 165,310 L 110,300 L 82,255 Z",
      "kab-tangerang":   "M 35,70   L 195,65  L 210,120 L 195,155 L 95,175  L 45,165 L 15,125 Z",
      "kota-bekasi":     "M 560,195 L 640,195 L 660,220 L 650,315 L 600,330 L 555,305 L 555,220 Z",
      "kab-bekasi":      "M 580,320 L 660,315 L 695,355 L 685,420 L 620,440 L 565,415 L 550,375 Z",
      "depok":           "M 340,365 L 410,360 L 440,390 L 430,440 L 390,455 L 345,440 L 330,405 Z",
      "bogor-kota":      "M 310,445 L 390,455 L 390,490 L 370,510 L 320,510 L 305,485 Z",
      "kab-bogor":       "M 450,360 L 560,355 L 575,400 L 570,460 L 510,480 L 440,475 L 415,445 L 430,395 Z",
    };

    const pieces = Object.entries(REGIONS).map(([key, cfg]) => {
      const count = STORES.filter(s => cfg.kotaMatch.includes(s.kota)).length;
      const path = svgPaths[key] || '';
      if (!path) return '';
      // Compute centroid for label
      const pts = path.match(/[\d.]+,[\d.]+/g)||[];
      let cx=0, cy=0;
      pts.forEach(p => { const [x,y]=p.split(','); cx+=+x; cy+=+y; });
      cx = cx/pts.length; cy = cy/pts.length;
      return `
        <path class="map-region" data-region="${key}"
              d="${path}"
              fill="${cfg.color}" fill-opacity="0.75"
              stroke="white" stroke-width="2"
              style="cursor:pointer; transition: all 0.2s"
              onclick="BiodataOutlet.showRegionView('${key}')"/>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="9" fill="white" font-weight="bold" pointer-events="none" style="text-shadow:0 1px 2px #0005">${cfg.label}</text>
        <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="10" fill="white" font-weight="bold" pointer-events="none">${count}</text>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 800 560" class="w-full h-full" style="max-height:420px" xmlns="http://www.w3.org/2000/svg">
        <!-- Ocean / background -->
        <rect width="800" height="560" fill="#DBEAFE" rx="12"/>
        <!-- Land base -->
        <ellipse cx="400" cy="290" rx="370" ry="250" fill="#F0FDF4" opacity="0.5"/>
        ${pieces}
        <!-- Title -->
        <text x="400" y="548" text-anchor="middle" font-size="11" fill="#64748B" font-style="italic">Greater Jakarta Region — Apotek Alpro Network</text>
      </svg>
    `;
  }

  function attachMapHover() {
    document.querySelectorAll('.map-region').forEach(el => {
      const rid = el.dataset.region;
      const cfg = REGIONS[rid];
      if (!cfg) return;
      el.addEventListener('mouseenter', () => {
        el.setAttribute('fill-opacity', '0.95');
        el.setAttribute('stroke-width', '3');
        el.setAttribute('stroke', '#fff');
        el.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,.35))';
      });
      el.addEventListener('mouseleave', () => {
        el.setAttribute('fill-opacity', '0.75');
        el.setAttribute('stroke-width', '2');
        el.setAttribute('stroke', 'white');
        el.style.filter = '';
      });
    });
  }

  // ----------------------------------------------------------
  //  VIEW: REGION (outlet list)
  // ----------------------------------------------------------
  function showRegionView(regionKey, highlightShortCode) {
    currentView = 'region';
    selectedRegion = regionKey;
    const cfg = REGIONS[regionKey];
    if (!cfg) return;
    const regionStores = STORES.filter(s => cfg.kotaMatch.includes(s.kota));

    const container = document.getElementById('bo-main-container');
    container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-5 text-sm text-gray-500">
        <button onclick="BiodataOutlet.showMapView()" class="hover:text-blue-600 transition-colors flex items-center gap-1">
          <i class="fas fa-map-marked-alt"></i> Map
        </button>
        <i class="fas fa-chevron-right text-xs"></i>
        <span class="font-semibold text-gray-800">${cfg.label}</span>
      </div>

      <!-- Header + Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <span class="inline-block w-4 h-4 rounded-full" style="background:${cfg.color}"></span>
            ${cfg.label}
          </h3>
          <p class="text-gray-500 text-sm mt-1">${regionStores.length} outlets in this region</p>
        </div>
        <div class="relative w-full md:w-72">
          <input id="bo-search-input" type="text" placeholder="Search outlet..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm">
          <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
          <div id="bo-search-results" class="hidden absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto"></div>
        </div>
      </div>

      <!-- Outlet Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="bo-outlet-grid">
        ${regionStores.map(s => `
          <div class="outlet-card group relative rounded-2xl p-4 cursor-pointer border-2 transition-all duration-200 shadow-sm hover:shadow-xl ${highlightShortCode === s.shortCode ? 'ring-4 ring-yellow-400 border-yellow-300 scale-105' : 'border-gray-100 hover:border-blue-300'}"
               style="background: linear-gradient(135deg, white, ${cfg.color}12);"
               onclick="BiodataOutlet.showOutletDetail('${s.shortCode}')">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2" style="background:${cfg.color}22; color:${cfg.color}">${s.shortCode}</div>
                <h4 class="font-bold text-gray-800 text-sm leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">
                  ${s.name.replace('APOTEK ALPRO ', '')}
                </h4>
                <p class="text-xs text-gray-500 mt-1">${s.completeCode}</p>
              </div>
              <i class="fas fa-chevron-right text-gray-300 group-hover:text-blue-500 transition-colors mt-1 ml-2 flex-shrink-0"></i>
            </div>
            <div class="mt-3 flex items-center gap-1 text-xs text-gray-400">
              <i class="fas fa-map-pin" style="color:${cfg.color}"></i>
              <span>${s.kota}</span>
            </div>
            ${highlightShortCode === s.shortCode ? `
              <div class="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full shadow">
                <i class="fas fa-star"></i> Found
              </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    attachSearchListener();
    // Scroll highlight into view
    if (highlightShortCode) {
      setTimeout(() => {
        const cards = document.querySelectorAll('.outlet-card');
        cards.forEach(c => {
          if (c.onclick && c.getAttribute('onclick') && c.getAttribute('onclick').includes(highlightShortCode)) {
            c.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }, 200);
    }
  }

  // ----------------------------------------------------------
  //  VIEW: OUTLET DETAIL
  // ----------------------------------------------------------
  function showOutletDetail(shortCode) {
    currentView = 'outlet';
    selectedOutlet = shortCode;
    const store = STORES.find(s => s.shortCode === shortCode);
    if (!store) return;
    const cfg = REGIONS[getRegionKey(store.kota)] || { label: store.kota, color: '#3B82F6' };
    const row = getSheetRow(shortCode);

    const container = document.getElementById('bo-main-container');
    container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-5 text-sm text-gray-500 flex-wrap">
        <button onclick="BiodataOutlet.showMapView()" class="hover:text-blue-600 transition-colors flex items-center gap-1">
          <i class="fas fa-map-marked-alt"></i> Map
        </button>
        <i class="fas fa-chevron-right text-xs"></i>
        <button onclick="BiodataOutlet.showRegionView('${getRegionKey(store.kota)}')" class="hover:text-blue-600 transition-colors">
          ${cfg.label}
        </button>
        <i class="fas fa-chevron-right text-xs"></i>
        <span class="font-semibold text-gray-800">${store.name.replace('APOTEK ALPRO ','')}</span>
      </div>

      <!-- Hero Header -->
      <div class="rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden" style="background: linear-gradient(135deg, ${cfg.color}, ${cfg.hoverColor||cfg.color})">
        <div class="absolute top-0 right-0 w-48 h-48 opacity-10">
          <i class="fas fa-store-alt" style="font-size:8rem; position:absolute; top:1rem; right:1rem;"></i>
        </div>
        <div class="relative z-10">
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <span class="bg-white/20 backdrop-blur text-white text-sm font-bold px-3 py-1 rounded-full">${store.shortCode}</span>
            <span class="bg-white/10 text-white text-xs px-3 py-1 rounded-full">${store.completeCode}</span>
          </div>
          <h2 class="text-2xl md:text-3xl font-black mb-1">${store.name}</h2>
          <p class="text-white/80 text-sm flex items-center gap-2">
            <i class="fas fa-map-pin"></i> ${store.kota}
          </p>
          ${row ? `<div class="text-white/70 text-xs mt-2 flex items-center gap-2"><i class="fas fa-sync-alt"></i> Live data from Google Sheets</div>` :
                   `<div class="text-yellow-200 text-xs mt-2 flex items-center gap-2"><i class="fas fa-exclamation-circle"></i> Full data loads when sheet is accessible</div>`}
        </div>
      </div>

      <!-- Data Sections -->
      <div class="space-y-5">
        ${buildSection('Operation Details', 'fas fa-cogs', '#3B82F6', buildOperationDetails(row, store))}
        ${buildSection('Business Development', 'fas fa-chart-line', '#10B981', buildBizDevDetails(row))}
        ${buildSection('PPR Details', 'fas fa-file-contract', '#8B5CF6', buildPPRDetails(row))}
        ${buildSection('PPM Details', 'fas fa-tools', '#F59E0B', buildPPMDetails(row))}
        ${buildSection('Sales Performance', 'fas fa-chart-bar', '#EF4444', buildSalesDetails(row))}
      </div>
    `;
  }

  function buildSection(title, icon, color, content) {
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 flex items-center gap-3 border-b border-gray-100" style="background: linear-gradient(to right, ${color}12, white)">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style="background:${color}22">
            <i class="${icon} text-sm" style="color:${color}"></i>
          </div>
          <h4 class="font-bold text-gray-800 text-base">${title}</h4>
        </div>
        <div class="p-5">${content}</div>
      </div>
    `;
  }

  function buildGrid(fields) {
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${fields.map(f => `
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div class="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">${f.label}</div>
          <div class="text-sm font-semibold text-gray-800 break-words">${f.value}</div>
        </div>
      `).join('')}
    </div>`;
  }

  function buildOperationDetails(row, store) {
    // Cols: A=0 short code, B=1 complete code, C=2 store name, D=3 AM
    // E=4 Opening Hours, F=5 Closing Hours, G=6 Date Opened, H=7 Alamat
    // I=8 Kecamatan, J=9 Kota, K=10 Province, L=11 PostCode
    // M=12 Mobile No, N=13 Email Alpro
    return buildGrid([
      { label: 'Short Code', value: store.shortCode },
      { label: 'Complete Code', value: store.completeCode },
      { label: 'Store Name', value: store.name },
      { label: 'Area Manager', value: getColVal(row, 3) },
      { label: 'Opening Hours', value: getColVal(row, 4) },
      { label: 'Closing Hours', value: getColVal(row, 5) },
      { label: 'Date Opened', value: getColVal(row, 6) },
      { label: 'Address', value: getColVal(row, 7) },
      { label: 'Kecamatan', value: getColVal(row, 8) },
      { label: 'Kota', value: store.kota },
      { label: 'Province', value: getColVal(row, 10) },
      { label: 'Post Code', value: getColVal(row, 11) },
      { label: 'Mobile No', value: getColVal(row, 12) },
      { label: 'Email', value: getColVal(row, 13) },
    ]);
  }

  function buildBizDevDetails(row) {
    // O=14 Lease Start Date, P=15 Lease End Date, Q=16 Monthly Rental
    return buildGrid([
      { label: 'Lease Start Date', value: getColVal(row, 14) },
      { label: 'Lease End Date', value: getColVal(row, 15) },
      { label: 'Monthly Rental', value: formatCurrency(getColVal(row, 16)) },
    ]);
  }

  function buildPPRDetails(row) {
    // R=17 IMB, S=18 No SIA, T=19 Tgl Sia Terbit, U=20 Tgl Sia Expiry, V=21 APJ
    return buildGrid([
      { label: 'IMB', value: getColVal(row, 17) },
      { label: 'No SIA', value: getColVal(row, 18) },
      { label: 'Tgl SIA Terbit', value: getColVal(row, 19) },
      { label: 'Tgl SIA Expiry', value: getColVal(row, 20) },
      { label: 'APJ', value: getColVal(row, 21) },
    ]);
  }

  function buildPPMDetails(row) {
    // W=22 Optimal HC, X=23 Current HC, Y=24 Num of BM, Z=25 Num of Apoteker
    // AA=26 Num of TTK, AB=27 Num of CE
    return buildGrid([
      { label: 'Optimal HC', value: getColVal(row, 22) },
      { label: 'Current HC', value: getColVal(row, 23) },
      { label: 'Num of BM', value: getColVal(row, 24) },
      { label: 'Num of Apoteker', value: getColVal(row, 25) },
      { label: 'Num of TTK', value: getColVal(row, 26) },
      { label: 'Num of CE', value: getColVal(row, 27) },
    ]);
  }

  function buildSalesDetails(row) {
    // AC=28 Target Revenue 100%, AD=29 Goal Revenue Bulanan, AE=30 Ave Sales
    // AF=31 Last Month Revenue, AG=32 Last Month Profit, AH=33 Last Month Margin
    // AI=34 Last Month Transaction, AJ=35 Last Month PP, AK=36 Last Month FP%
    // AL=37 Last Month R.R%, AM=38 Last Month PSH, AN=39 Current Month Forecasted Revenue
    // AO=40 Current Month Growth%, AP=41 Vs Target, AQ=42 VS Goal Bulanan
    // AR=43 Category, AS=44 Clan AM
    const fields = [
      { label: 'Target Revenue 100%', value: formatCurrency(getColVal(row, 28)) },
      { label: 'Goal Revenue Bulanan', value: formatCurrency(getColVal(row, 29)) },
      { label: 'Ave Sales', value: formatCurrency(getColVal(row, 30)) },
      { label: 'Last Month Revenue', value: formatCurrency(getColVal(row, 31)) },
      { label: 'Last Month Profit', value: formatCurrency(getColVal(row, 32)) },
      { label: 'Last Month Margin', value: formatPct(getColVal(row, 33)) },
      { label: 'Last Month Transactions', value: getColVal(row, 34) },
      { label: 'Last Month PP', value: getColVal(row, 35) },
      { label: 'Last Month FP %', value: formatPct(getColVal(row, 36)) },
      { label: 'Last Month R.R %', value: formatPct(getColVal(row, 37)) },
      { label: 'Last Month PSH', value: getColVal(row, 38) },
      { label: 'Forecasted Revenue', value: formatCurrency(getColVal(row, 39)) },
      { label: 'Current Month Growth %', value: formatPct(getColVal(row, 40)) },
      { label: 'Vs Target', value: formatPct(getColVal(row, 41)) },
      { label: 'VS Goal Bulanan', value: formatPct(getColVal(row, 42)) },
      { label: 'Category', value: getColVal(row, 43) },
      { label: 'Clan AM', value: getColVal(row, 44) },
    ];
    return buildGrid(fields);
  }

  function formatCurrency(val) {
    if (!val || val === '—') return '—';
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return val;
    return 'Rp ' + num.toLocaleString('id-ID');
  }

  function formatPct(val) {
    if (!val || val === '—') return '—';
    if (val.includes('%')) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toFixed(2) + '%';
  }

  // ----------------------------------------------------------
  //  PUBLIC API
  // ----------------------------------------------------------
  return {
    init,
    showMapView,
    showRegionView,
    showOutletDetail,
    selectSearchResult,
  };
})();
