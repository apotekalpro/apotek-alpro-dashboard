// ============================================================
//  BIODATA OUTLET — Interactive Map + Cascade Detail View
//  v2.0 — All 205 outlets, merged regions, proper map
// ============================================================

const BiodataOutlet = (() => {

  // ----------------------------------------------------------
  //  ALL 205 STORES  (shortCode = col A, completeCode = col B,
  //                   name = col C, kota = col J)
  // ----------------------------------------------------------
  const STORES = [
    {s:"JKJSTT1",c:"0001-JKJSTT1",n:"APOTEK ALPRO TEBET TIMUR",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJSVR1",c:"0002-JKJSVR1",n:"APOTEK ALPRO VETERAN RAYA",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBTM1",c:"0003-JKJBTM1",n:"APOTEK ALPRO TOMANG",k:"KOTA JAKARTA BARAT"},
    {s:"JKJSBZ1",c:"0004-JKJSBZ1",n:"APOTEK ALPRO BELLEZA",k:"KOTA JAKARTA SELATAN"},
    {s:"BTTSGV1",c:"0005-BTTSGV1",n:"APOTEK ALPRO GOLDEN VIENNA",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTSSU1",c:"0006-BTTSSU1",n:"APOTEK ALPRO SUTERA UTAMA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJUSK1",c:"0007-JKJUSK1",n:"APOTEK ALPRO SUNTER KEMAYORAN",k:"KOTA JAKARTA UTARA"},
    {s:"BTTSB91",c:"0008-BTTSB91",n:"APOTEK ALPRO BINTARO SEKTOR 9",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTSVS1",c:"0009-BTTSVS1",n:"APOTEK ALPRO VERSAILLES",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTGBI1",c:"0010-BTTGBI1",n:"APOTEK ALPRO BOLSENA ILAGGO",k:"KABUPATEN TANGERANG"},
    {s:"JKJPSR1",c:"0011-JKJPSR1",n:"APOTEK ALPRO SALEMBA RAYA",k:"KOTA JAKARTA PUSAT"},
    {s:"BTTSGR1",c:"0012-BTTSGR1",n:"APOTEK ALPRO GRAHA RAYA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSTB1",c:"0013-JKJSTB1",n:"APOTEK ALPRO TEBET BARAT",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJSKC1",c:"0014-JKJSKC1",n:"APOTEK ALPRO KALIBATA CITY",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBGV1",c:"0015-JKJBGV1",n:"APOTEK ALPRO GREENVILLE",k:"KOTA JAKARTA BARAT"},
    {s:"JKJPMB1",c:"0016-JKJPMB1",n:"APOTEK ALPRO MANGGA BESAR",k:"KOTA JAKARTA PUSAT"},
    {s:"BTTGBW1",c:"0017-BTTGBW1",n:"APOTEK ALPRO BANJAR WIJAYA",k:"KOTA TANGERANG"},
    {s:"BTTSB21",c:"0018-BTTSB21",n:"APOTEK ALPRO BINTARO SEKTOR 2",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSRR1",c:"0019-JKJSRR1",n:"APOTEK ALPRO REMPOA RAYA",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJSGH1",c:"0020-JKJSGH1",n:"APOTEK ALPRO GEDUNG HIJAU",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSOC1",c:"0021-JBBSOC1",n:"APOTEK ALPRO OLYMPIC CIKARANG",k:"KABUPATEN BEKASI"},
    {s:"JBBGCV1",c:"0022-JBBGCV1",n:"APOTEK ALPRO CIMANGGU VILLA",k:"KOTA BOGOR"},
    {s:"JBDPAU1",c:"0023-JBDPAU1",n:"APOTEK ALPRO AKSES UI",k:"KOTA DEPOK"},
    {s:"JBDPMR1",c:"0024-JBDPMR1",n:"APOTEK ALPRO MARGONDA RAYA",k:"KOTA DEPOK"},
    {s:"JBBSMT1",c:"0025-JBBSMT1",n:"APOTEK ALPRO METLAND TAMBUN",k:"KABUPATEN BEKASI"},
    {s:"BTTGEK1",c:"0026-BTTGEK1",n:"APOTEK ALPRO ESPANA KARAWACI",k:"KOTA TANGERANG"},
    {s:"JBDPSW1",c:"0027-JBDPSW1",n:"APOTEK ALPRO SILIWANGI",k:"KOTA DEPOK"},
    {s:"JKJTTH1",c:"0028-JKJTTH1",n:"APOTEK ALPRO TAMANSARI HIVE",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJSRD1",c:"0029-JKJSRD1",n:"APOTEK ALPRO RADIO DALAM",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBRS1",c:"0030-JKJBRS1",n:"APOTEK ALPRO MERUYA RADEN SALEH",k:"KOTA JAKARTA BARAT"},
    {s:"JBBGCC1",c:"0031-JBBGCC1",n:"APOTEK ALPRO CIBUBUR CIKEAS",k:"KABUPATEN BOGOR"},
    {s:"JKJBKB1",c:"0032-JKJBKB1",n:"APOTEK ALPRO KOSAMBI BARU",k:"KOTA JAKARTA BARAT"},
    {s:"JKJPDA1",c:"0033-JKJPDA1",n:"APOTEK ALPRO MRT DUKUH ATAS",k:"KOTA JAKARTA PUSAT"},
    {s:"JBBSJB1",c:"0034-JBBSJB1",n:"APOTEK ALPRO JATIBENING",k:"KOTA BEKASI"},
    {s:"BTTSRF1",c:"0035-BTTSRF1",n:"APOTEK ALPRO RADEN FATAH",k:"KOTA TANGERANG"},
    {s:"JKJUSI1",c:"0036-JKJUSI1",n:"APOTEK ALPRO SUNTER INDAH",k:"KOTA JAKARTA UTARA"},
    {s:"JBBGRC1",c:"0037-JBBGRC1",n:"APOTEK ALPRO RAYA CIKARET",k:"KABUPATEN BOGOR"},
    {s:"JKJSTS1",c:"0039-JKJSTS1",n:"APOTEK ALPRO TAMANSARI SEMANGGI",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSTR1",c:"0040-JBBSTR1",n:"APOTEK ALPRO BEKASI TIMUR REGENCY",k:"KOTA BEKASI"},
    {s:"BTTSRG1",c:"0042-BTTSRG1",n:"APOTEK ALPRO REGIA GRAHA",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTGSG1",c:"0043-BTTGSG1",n:"APOTEK ALPRO SERPONG GARDEN",k:"KABUPATEN TANGERANG"},
    {s:"JKJPMS1",c:"0044-JKJPMS1",n:"APOTEK ALPRO MENTENG SQUARE",k:"KOTA JAKARTA PUSAT"},
    {s:"JKJBDK1",c:"0045-JKJBDK1",n:"APOTEK ALPRO DURI KOSAMBI",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSRC1",c:"0046-BTTSRC1",n:"APOTEK ALPRO EXPRESS RAYA CEGER",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJUBR1",c:"0047-JKJUBR1",n:"APOTEK ALPRO BOULEVARD RAYA",k:"KOTA JAKARTA UTARA"},
    {s:"JBBGBR1",c:"0049-JBBGBR1",n:"APOTEK ALPRO BANGBARUNG RAYA",k:"KOTA BOGOR"},
    {s:"JKJTPL1",c:"0051-JKJTPL1",n:"APOTEK ALPRO PISANGAN LAMA",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJTLB1",c:"0052-JKJTLB1",n:"APOTEK ALPRO LUBANG BUAYA",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJUTG1",c:"0053-JKJUTG1",n:"APOTEK ALPRO TELUK GONG",k:"KOTA JAKARTA UTARA"},
    {s:"JKJSRS1",c:"0055-JKJSRS1",n:"APOTEK ALPRO RASUNA",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSRP1",c:"0056-JBBSRP1",n:"APOTEK ALPRO RAYA PRAMUKA",k:"KOTA BEKASI"},
    {s:"BTTGBR1",c:"0057-BTTGBR1",n:"APOTEK ALPRO BERINGIN RAYA",k:"KOTA TANGERANG"},
    {s:"JBBSSR1",c:"0058-JBBSSR1",n:"APOTEK ALPRO SINGARAJA",k:"KABUPATEN BEKASI"},
    {s:"JBBGWU1",c:"0059-JBBGWU1",n:"APOTEK ALPRO WISATA UTAMA",k:"KABUPATEN BOGOR"},
    {s:"JKJSRM1",c:"0060-JKJSRM1",n:"APOTEK ALPRO RASAMALA",k:"KOTA JAKARTA SELATAN"},
    {s:"BTTSBB1",c:"0061-BTTSBB1",n:"APOTEK ALPRO BOULEVARD BSD",k:"KOTA TANGERANG SELATAN"},
    {s:"JBBSKP1",c:"0062-JBBSKP1",n:"APOTEK ALPRO KEMANG PRATAMA",k:"KOTA BEKASI"},
    {s:"JKJBHI1",c:"0063-JKJBHI1",n:"APOTEK ALPRO HARAPAN INDAH",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSGI1",c:"0064-JBBSGI1",n:"APOTEK ALPRO GALAXI INDAH",k:"KOTA BEKASI"},
    {s:"BTTGPS1",c:"0065-BTTGPS1",n:"APOTEK ALPRO PALEM SEMI",k:"KABUPATEN TANGERANG"},
    {s:"JKJUWB1",c:"0066-JKJUWB1",n:"APOTEK ALPRO WALANG BARU",k:"KOTA JAKARTA UTARA"},
    {s:"JBBSGW1",c:"0067-JBBSGW1",n:"APOTEK ALPRO GRAND WISATA",k:"KABUPATEN BEKASI"},
    {s:"BTTGPP1",c:"0068-BTTGPP1",n:"APOTEK ALPRO PORIS PARADISE",k:"KOTA TANGERANG"},
    {s:"JKJSKR1",c:"0069-JKJSKR1",n:"APOTEK ALPRO KALIBATA RESIDENCE",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJPSB1",c:"0070-JKJPSB1",n:"APOTEK ALPRO SABANG",k:"KOTA JAKARTA PUSAT"},
    {s:"JKJBHL1",c:"0071-JKJBHL1",n:"APOTEK ALPRO HAJI LEBAR",k:"KOTA JAKARTA BARAT"},
    {s:"JKJSBI1",c:"0072-JKJSBI1",n:"APOTEK ALPRO BONA INDAH",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBGLW1",c:"0073-JBBGLW1",n:"APOTEK ALPRO LEGENDA WISATA",k:"KABUPATEN BOGOR"},
    {s:"JKJUPI1",c:"0074-JKJUPI1",n:"APOTEK ALPRO PIK",k:"KOTA JAKARTA UTARA"},
    {s:"JKJBCS1",c:"0076-JKJBCS1",n:"APOTEK ALPRO CITRA SATU",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSCC1",c:"0077-JBBSCC1",n:"APOTEK ALPRO CITRAGRAND CIBUBUR",k:"KOTA BEKASI"},
    {s:"BTTGCR1",c:"0078-BTTGCR1",n:"APOTEK ALPRO CITRA RAYA",k:"KOTA TANGERANG"},
    {s:"JKJSMP1",c:"0079-JKJSMP1",n:"APOTEK ALPRO MAMPANG PRAPATAN",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJUGK1",c:"0080-JKJUGK1",n:"APOTEK ALPRO GADING KIRANA",k:"KOTA JAKARTA UTARA"},
    {s:"JKJPTR1",c:"0081-JKJPTR1",n:"APOTEK ALPRO THAMRIN RESIDENCE",k:"KOTA JAKARTA PUSAT"},
    {s:"JKJUAM1",c:"0082-JKJUAM1",n:"APOTEK ALPRO APARTEMEN MOI",k:"KOTA JAKARTA UTARA"},
    {s:"JKJSTM1",c:"0083-JKJSTM1",n:"APOTEK ALPRO TEBET MAS INDAH",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJTPD1",c:"0084-JKJTPD1",n:"APOTEK ALPRO PONDASI",k:"KOTA JAKARTA TIMUR"},
    {s:"JBBGWC1",c:"0085-JBBGWC1",n:"APOTEK ALPRO WISATA CANADIAN",k:"KABUPATEN BOGOR"},
    {s:"BTTGGB1",c:"0086-BTTGGB1",n:"APOTEK ALPRO GADING BOULEVARD",k:"KOTA TANGERANG"},
    {s:"JKJUGB1",c:"0087-JKJUGB1",n:"APOTEK ALPRO KELAPA GADING BOULEVARD",k:"KOTA JAKARTA UTARA"},
    {s:"JKJUGN1",c:"0088-JKJUGN1",n:"APOTEK ALPRO GADING NIAS",k:"KOTA JAKARTA UTARA"},
    {s:"JKJPMP1",c:"0089-JKJPMP1",n:"APOTEK ALPRO MEDITERANIA PALACE",k:"KOTA JAKARTA UTARA"},
    {s:"JBBSLH1",c:"0090-JBBSLH1",n:"APOTEK ALPRO LEMBAH HIJAU",k:"KABUPATEN BEKASI"},
    {s:"BTTGKS1",c:"0091-BTTGKS1",n:"APOTEK ALPRO KREO SELATAN",k:"KOTA TANGERANG"},
    {s:"JBBGBD1",c:"0092-JBBGBD1",n:"APOTEK ALPRO BUKIT DAGO",k:"KABUPATEN BOGOR"},
    {s:"JBBSJM1",c:"0093-JBBSJM1",n:"APOTEK ALPRO JATIMAKMUR",k:"KOTA BEKASI"},
    {s:"JKJBSC1",c:"0094-JKJBSC1",n:"APOTEK ALPRO SEASONS CITY",k:"KOTA JAKARTA BARAT"},
    {s:"JKJBPL1",c:"0095-JKJBPL1",n:"APOTEK ALPRO PALEM LESTARI",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSWS1",c:"0096-BTTSWS1",n:"APOTEK ALPRO WR SUPRATMAN",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTGPB1",c:"0097-BTTGPB1",n:"APOTEK ALPRO PURI BETA",k:"KOTA TANGERANG"},
    {s:"JKJSKB1",c:"0098-JKJSKB1",n:"APOTEK ALPRO KEBAGUSAN CITY",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJSPR1",c:"0099-JKJSPR1",n:"APOTEK ALPRO PANCORAN RIVERSIDE",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBGPS1",c:"0100-JBBGPS1",n:"APOTEK ALPRO PANGERAN SOGIRI",k:"KOTA BOGOR"},
    {s:"JBBGTC1",c:"0101-JBBGTC1",n:"APOTEK ALPRO TAMAN CILEUNGSI",k:"KABUPATEN BOGOR"},
    {s:"JBDPRK1",c:"0102-JBDPRK1",n:"APOTEK ALPRO RAYA KUKUSAN",k:"KABUPATEN BOGOR"},
    {s:"JKJTMM1",c:"0103-JKJTMM1",n:"APOTEK ALPRO METLAND MENTENG",k:"KOTA JAKARTA TIMUR"},
    {s:"JBBSKH1",c:"0104-JBBSKH1",n:"APOTEK ALPRO KOTA HARAPAN INDAH",k:"KOTA BEKASI"},
    {s:"JKJTRC1",c:"0105-JKJTRC1",n:"APOTEK ALPRO RAYA CIPAYUNG",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTGLK1",c:"0106-BTTGLK1",n:"APOTEK ALPRO LIPPO KARAWACI",k:"KOTA TANGERANG"},
    {s:"BTTSDL1",c:"0107-BTTSDL1",n:"APOTEK ALPRO DE LATINOS",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJUMJ1",c:"0108-JKJUMJ1",n:"APOTEK ALPRO KEMAYORAN JASMINE",k:"KOTA JAKARTA UTARA"},
    {s:"JKJPWH1",c:"0109-JKJPWH1",n:"APOTEK ALPRO WAHID HASYIM",k:"KOTA JAKARTA PUSAT"},
    {s:"JKJSRG1",c:"0110-JKJSRG1",n:"APOTEK ALPRO RAYA RAGUNAN",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBKJ1",c:"0111-JKJBKJ1",n:"APOTEK ALPRO KEBUN JERUK",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSCR1",c:"0112-JBBSCR1",n:"APOTEK ALPRO CAMAN RAYA",k:"KOTA BEKASI"},
    {s:"BTTGMA1",c:"0113-BTTGMA1",n:"APOTEK ALPRO MODERN ARCADE",k:"KOTA TANGERANG"},
    {s:"JKJBSI1",c:"0114-JKJBSI1",n:"APOTEK ALPRO SEMANAN INDAH",k:"KOTA JAKARTA BARAT"},
    {s:"JKJBPB1",c:"0115-JKJBPB1",n:"APOTEK ALPRO PERMATA BUANA",k:"KOTA JAKARTA BARAT"},
    {s:"BTTGDG1",c:"0116-BTTGDG1",n:"APOTEK ALPRO DUTA GARDEN",k:"KOTA TANGERANG"},
    {s:"JKJBPI1",c:"0117-JKJBPI1",n:"APOTEK ALPRO PURI INDAH",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSZR1",c:"0118-JBBSZR1",n:"APOTEK ALPRO ZAMRUD",k:"KOTA BEKASI"},
    {s:"BTTGLC1",c:"0119-BTTGLC1",n:"APOTEK ALPRO LEGOSO CIPUTAT",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSCR1",c:"0120-JKJSCR1",n:"APOTEK ALPRO CIPETE RAYA",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBPP1",c:"0121-JKJBPP1",n:"APOTEK ALPRO PURI PARKVIEW",k:"KOTA JAKARTA BARAT"},
    {s:"BTTGRV1",c:"0122-BTTGRV1",n:"APOTEK ALPRO RIVIERA",k:"KABUPATEN TANGERANG"},
    {s:"JBDPAC1",c:"0123-JBDPAC1",n:"APOTEK ALPRO ALTERNATIF CIBUBUR",k:"KOTA DEPOK"},
    {s:"JKJBTD1",c:"0124-JKJBTD1",n:"APOTEK ALPRO TANJUNG DUREN",k:"KOTA JAKARTA BARAT"},
    {s:"JKJSB11",c:"0125-JKJSB11",n:"APOTEK ALPRO BINTARO SEKTOR 1",k:"KOTA JAKARTA SELATAN"},
    {s:"BTTGKD1",c:"0126-BTTGKD1",n:"APOTEK ALPRO KELAPA DUA",k:"KOTA TANGERANG"},
    {s:"JBDPKR1",c:"0128-JBDPKR1",n:"APOTEK ALPRO KEMAKMURAN RAYA",k:"KOTA DEPOK"},
    {s:"JBBDSB1",c:"0129-JBBDSB1",n:"APOTEK ALPRO STASIUN BANDUNG",k:"KOTA BANDUNG"},
    {s:"JBBDBB1",c:"0130-JBBDBB1",n:"APOTEK ALPRO BUAH BATU",k:"KOTA BANDUNG"},
    {s:"BTTSP81",c:"0131-BTTSP81",n:"APOTEK ALPRO PASAR 8",k:"KOTA TANGERANG SELATAN"},
    {s:"JBBSBR1",c:"0132-JBBSBR1",n:"APOTEK ALPRO BINTARA RAYA",k:"KOTA BEKASI"},
    {s:"BTTSSR1",c:"0133-BTTSSR1",n:"APOTEK ALPRO SORRENTO SQUARE",k:"KABUPATEN TANGERANG"},
    {s:"JBBGLJ1",c:"0134-JBBGLJ1",n:"APOTEK ALPRO LOTUS JASMINE",k:"KOTA BOGOR"},
    {s:"JKJBAR1",c:"2001-JKJBAR1",n:"APOTEK ALPRO EXPRESS ANGGREK ROSLIANA",k:"KOTA JAKARTA BARAT"},
    {s:"JKJBSR1",c:"2002-JKJBSR1",n:"APOTEK ALPRO EXPRESS SRENGSENG RAYA",k:"KOTA JAKARTA BARAT"},
    {s:"JBDPVP1",c:"2003-JBDPVP1",n:"APOTEK ALPRO VILLA PERMATA",k:"KOTA DEPOK"},
    {s:"JKJSPC1",c:"2004-JKJSPC1",n:"APOTEK ALPRO EXPRESS PANJANG CIPULIR",k:"KOTA JAKARTA SELATAN"},
    {s:"BTTSPK1",c:"2005-BTTSPK1",n:"APOTEK ALPRO EXPRESS PONDOK KACANG",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTSHK1",c:"2006-BTTSHK1",n:"APOTEK ALPRO EXPRESS HK KADEMANGAN",k:"KOTA TANGERANG SELATAN"},
    {s:"JBDPLR1",c:"2007-JBDPLR1",n:"APOTEK ALPRO EXPRESS LIMO RAYA",k:"KOTA DEPOK"},
    {s:"JBDPRR1",c:"2008-JBDPRR1",n:"APOTEK ALPRO EXPRESS RIDWAN RAIS",k:"KOTA DEPOK"},
    {s:"JBDPPD1",c:"2009-JBDPPD1",n:"APOTEK ALPRO EXPRESS PONDOK DUTA",k:"KOTA DEPOK"},
    {s:"JKJTCT1",c:"2010-JKJTCT1",n:"APOTEK ALPRO EXPRESS CENTEX",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJSPK1",c:"2011-JKJSPK1",n:"APOTEK ALPRO EXPRESS PULO KAMBOJA",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSWA1",c:"2012-JBBSWA1",n:"APOTEK ALPRO EXPRESS WISMA ASRI",k:"KOTA BEKASI"},
    {s:"JBBDPW1",c:"2013-JBBDPW1",n:"APOTEK ALPRO EXPRESS PANDAN WANGI",k:"KOTA CIMAHI"},
    {s:"BTTSPR1",c:"2014-BTTSPR1",n:"APOTEK ALPRO EXPRESS PURNAWARMAN",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTGCD1",c:"2015-BTTGCD1",n:"APOTEK ALPRO EXPRESS CIPADU",k:"KOTA TANGERANG"},
    {s:"JKJTPB1",c:"2016-JKJTPB1",n:"APOTEK ALPRO EXPRESS PENGGILINGAN BARU",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTSCR1",c:"2017-BTTSCR1",n:"APOTEK ALPRO EXPRESS CIATER RAYA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJBJR1",c:"2018-JKJBJR1",n:"APOTEK ALPRO EXPRESS JOGLO RAYA",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSLR1",c:"2019-BTTSLR1",n:"APOTEK ALPRO EXPRESS LEGOSO RAYA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSDK1",c:"2020-JKJSDK1",n:"APOTEK ALPRO EXPRESS PRAJA DALAM K",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSPU1",c:"2021-JBBSPU1",n:"APOTEK ALPRO EXPRESS PONDOK UNGU",k:"KABUPATEN BEKASI"},
    {s:"JBBGBG1",c:"2022-JBBGBG1",n:"APOTEK ALPRO EXPRESS PURA BOJONG GEDE",k:"KABUPATEN BOGOR"},
    {s:"BTTSPM1",c:"2023-BTTSPM1",n:"APOTEK ALPRO EXPRESS VILLA PAMULANG MAS",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJTA21",c:"2024-JKJTA21",n:"APOTEK ALPRO EXPRESS ALBAIDHO 2",k:"KOTA JAKARTA TIMUR"},
    {s:"JBBSBB1",c:"2025-JBBSBB1",n:"APOTEK ALPRO EXPRESS BABAKAN",k:"KOTA BEKASI"},
    {s:"JKJSKJ1",c:"2026-JKJSKJ1",n:"APOTEK ALPRO EXPRESS KAHFI JAGAKARSA",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSTB1",c:"2027-JBBSTB1",n:"APOTEK ALPRO TARUM BARAT",k:"KABUPATEN BEKASI"},
    {s:"JBBSP21",c:"2028-JBBSP21",n:"APOTEK ALPRO EXPRESS PERUMNAS 2",k:"KOTA BEKASI"},
    {s:"JKJTPI1",c:"2029-JKJTPI1",n:"APOTEK ALPRO EXPRESS PULO INDAH",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTSSP1",c:"2030-BTTSSP1",n:"APOTEK ALPRO EXPRESS SERUA PERMAI",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJBKU1",c:"2031-JKJBKU1",n:"APOTEK ALPRO EXPRESS KEMBANGAN UTARA",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSPC1",c:"2032-BTTSPC1",n:"APOTEK ALPRO EXPRESS PONDOK CABE",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJTPW1",c:"2033-JKJTPW1",n:"APOTEK ALPRO EXPRESS PANCAWARGA",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTSPS1",c:"2034-BTTSPS1",n:"APOTEK ALPRO EXPRESS PANTI ASUHAN",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTSSK1",c:"2035-BTTSSK1",n:"APOTEK ALPRO EXPRESS SURYA KENCANA",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTSBK1",c:"2036-BTTSBK1",n:"APOTEK ALPRO EXPRESS BHAYANGKARA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJTDS1",c:"2037-JKJTDS1",n:"APOTEK ALPRO DUREN SAWIT",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTGPR1",c:"2041-BTTGPR1",n:"APOTEK ALPRO EXPRESS PAWON RAYA",k:"KABUPATEN TANGERANG"},
    {s:"JBDPPP1",c:"2042-JBDPPP1",n:"APOTEK ALPRO EXPRESS PONDOK PETIR",k:"KOTA DEPOK"},
    {s:"JKJSKH1",c:"2044-JKJSKH1",n:"APOTEK ALPRO EXPRESS KELAPA HIJAU",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBMU1",c:"2045-JKJBMU1",n:"APOTEK ALPRO EXPRESS MERUYA UTARA",k:"KOTA JAKARTA BARAT"},
    {s:"JKJSLM1",c:"2046-JKJSLM1",n:"APOTEK ALPRO EXPRESS LIMO",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJTPR1",c:"2047-JKJTPR1",n:"APOTEK ALPRO EXPRESS PONDOK RANGGON",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJSMR1",c:"2048-JKJSMR1",n:"APOTEK ALPRO EXPRESS MARGASATWA RAYA",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJPMR1",c:"2049-JKJPMR1",n:"APOTEK ALPRO EXPRESS MERUYA SELATAN",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSDB1",c:"2050-JBBSDB1",n:"APOTEK ALPRO EXPRESS D BOULEVARD BARAT",k:"KOTA BEKASI"},
    {s:"JKJTPT1",c:"2051-JKJTPT1",n:"APOTEK ALPRO EXPRESS PERTENGAHAN",k:"KOTA JAKARTA TIMUR"},
    {s:"JBBSJK1",c:"2052-JBBSJK1",n:"APOTEK ALPRO EXPRESS JATIKRAMAT",k:"KOTA BEKASI"},
    {s:"JKJTHH1",c:"2053-JKJTHH1",n:"APOTEK ALPRO EXPRESS HAJI HASAN",k:"KOTA JAKARTA TIMUR"},
    {s:"JBBSTP1",c:"2054-JBBSTP1",n:"APOTEK ALPRO EXPRESS TAMAN PURI CENDANA",k:"KABUPATEN BEKASI"},
    {s:"JKJSBS1",c:"2055-JKJSBS1",n:"APOTEK ALPRO EXPRESS TJ BARAT SELATAN",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJBAU1",c:"2056-JKJBAU1",n:"APOTEK ALPRO EXPRESS ASSURUR",k:"KOTA JAKARTA BARAT"},
    {s:"BTTGCM1",c:"2057-BTTGCM1",n:"APOTEK ALPRO EXPRESS CIPTO MANGUNKUSUMO",k:"KOTA TANGERANG"},
    {s:"JKJSPG1",c:"2059-JKJSPG1",n:"APOTEK ALPRO EXPRESS PENINGGARAN",k:"KOTA JAKARTA SELATAN"},
    {s:"BTTSSJ1",c:"2060-BTTSSJ1",n:"APOTEK ALPRO EXPRESS SUMATERA JOMBANG",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJTBK1",c:"2061-JKJTBK1",n:"APOTEK ALPRO EXPRESS BUARAN KLENDER",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJBTW1",c:"2062-JKJBTW1",n:"APOTEK ALPRO EXPRESS TAQWA",k:"KOTA JAKARTA BARAT"},
    {s:"JBBDPT1",c:"2063-JBBDPT1",n:"APOTEK ALPRO EXPRESS PESANTREN",k:"KOTA CIMAHI"},
    {s:"BTTSJR1",c:"2064-BTTSJR1",n:"APOTEK ALPRO EXPRESS JAPOS RAYA",k:"KOTA TANGERANG SELATAN"},
    {s:"BTTGIP1",c:"2065-BTTGIP1",n:"APOTEK ALPRO EXPRESS INPRES",k:"KOTA TANGERANG"},
    {s:"JKJBR11",c:"2067-JKJBR11",n:"APOTEK ALPRO EXPRESS SALAM RAYA 1",k:"KOTA JAKARTA BARAT"},
    {s:"JBBSMJ1",c:"2068-JBBSMJ1",n:"APOTEK ALPRO EXPRESS MARGAHAYU JAYA",k:"KOTA BEKASI"},
    {s:"JBBDNI1",c:"2070-JBBDNI1",n:"APOTEK ALPRO EXPRESS NUSA INDAH",k:"KOTA CIMAHI"},
    {s:"BTTGPI1",c:"2071-BTTGPI1",n:"APOTEK ALPRO EXPRESS PORIS INDAH",k:"KOTA TANGERANG"},
    {s:"BTTGC21",c:"2072-BTTGC21",n:"APOTEK ALPRO EXPRESS CILEDUG INDAH 2",k:"KOTA TANGERANG"},
    {s:"JBBGAR1",c:"2073-JBBGAR1",n:"APOTEK ALPRO EXPRESS ARCO RAYA",k:"KABUPATEN BOGOR"},
    {s:"JKJTK81",c:"2074-JKJTK81",n:"APOTEK ALPRO EXPRESS KALISARI 8",k:"KOTA JAKARTA TIMUR"},
    {s:"BTTGRS1",c:"2075-BTTGRS1",n:"APOTEK ALPRO EXPRESS RADEN SALEH",k:"KOTA TANGERANG"},
    {s:"JKJBAG1",c:"2076-JKJBAG1",n:"APOTEK ALPRO EXPRESS ANGGREK GARUDA",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSAP1",c:"2077-BTTSAP1",n:"APOTEK ALPRO EXPRESS ARIA PUTRA",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSPT1",c:"2078-JKJSPT1",n:"APOTEK ALPRO EXPRESS POLTANGAN",k:"KOTA JAKARTA SELATAN"},
    {s:"JKJTDK1",c:"2079-JKJTDK1",n:"APOTEK ALPRO DERMAGA KLENDER",k:"KOTA JAKARTA TIMUR"},
    {s:"JKJBPR1",c:"2080-JKJBPR1",n:"APOTEK ALPRO EXPRESS PANJANG RAYA",k:"KOTA JAKARTA BARAT"},
    {s:"BTTSPL1",c:"2081-BTTSPL1",n:"APOTEK ALPRO EXPRESS PINANG PAMULANG",k:"KOTA TANGERANG SELATAN"},
    {s:"JKJSMC1",c:"2082-JKJSMC1",n:"APOTEK ALPRO EXPRESS MANGGA CIPULIR",k:"KOTA JAKARTA SELATAN"},
    {s:"JBBSAS1",c:"2083-JBBSAS1",n:"APOTEK ALPRO EXPRESS AGUS SALIM",k:"KOTA BEKASI"},
    {s:"JBBSRH1",c:"2085-JBBSRH1",n:"APOTEK ALPRO EXPRESS RAYA HANKAM",k:"KOTA BEKASI"},
    {s:"JKJPCP1",c:"0135-JKJPCP1",n:"APOTEK ALPRO CEMPAKA PUTIH",k:"KOTA JAKARTA PUSAT"},
  ];

  // ----------------------------------------------------------
  //  MERGED REGION CONFIGURATION
  //  Per request: Bogor merged, Bekasi merged, Tangerang merged
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

  // Google Sheets CSV
  const SHEET_ID = "1oKBl-ppv5qjsBq8IXj5Q9KPThlSepSG-ocLIdZeS3g0";
  const SHEET_NAME = "DIGITAL MASTER";
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  // State
  let allSheetData = null;
  let currentView = 'map';
  let selectedRegion = null;
  let selectedOutlet = null;
  let _initialized = false;

  // ----------------------------------------------------------
  //  INIT
  // ----------------------------------------------------------
  function init() {
    renderMapView();
    loadSheetData();
  }

  // ----------------------------------------------------------
  //  SHEET DATA LOADER
  // ----------------------------------------------------------
  async function loadSheetData() {
    const statusEl = document.getElementById('bo-sheet-status');
    if (statusEl) statusEl.textContent = 'Loading live data from Google Sheets...';
    try {
      const resp = await fetch(SHEET_URL);
      if (!resp.ok) throw new Error('Network error');
      const text = await resp.text();
      allSheetData = parseCSV(text);
      if (statusEl) {
        statusEl.textContent = `✓ Live data loaded (${allSheetData.length - 1} outlets)`;
        statusEl.className = 'text-xs text-green-600 font-medium mt-1';
      }
      if (currentView === 'outlet' && selectedOutlet) showOutletDetail(selectedOutlet);
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = '⚠ Offline mode — outlet details may be limited';
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
      } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

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

  // ----------------------------------------------------------
  //  HELPERS
  // ----------------------------------------------------------
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
  //  VIEW: MAP (with inline search)
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

    // Build regions summary with counts, sorted by count desc
    const regionsSummary = Object.entries(REGIONS).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: cfg.color,
      count: STORES.filter(s => cfg.kotaMatch.includes(s.k)).length
    })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);

    // DKI Jakarta group vs outer regions
    const dkiKeys = ['jakarta-pusat','jakarta-utara','jakarta-barat','jakarta-selatan','jakarta-timur'];
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

    function regionCard(r, size = 'normal') {
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
          <!-- Top accent bar -->
          <div class="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style="background:${r.color}"></div>
          <!-- Icon -->
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm"
               style="background:${r.color}20">
            <i class="fas ${icon} text-base" style="color:${r.color}"></i>
          </div>
          <!-- Label -->
          <p class="font-bold text-gray-800 text-xs leading-tight mb-2 group-hover:text-gray-900">${r.label}</p>
          <!-- Count badge -->
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-black shadow-sm"
               style="background:${r.color}">
            <i class="fas fa-store text-xs opacity-80"></i>
            <span>${r.count}</span>
          </div>
          <!-- Hover arrow -->
          <div class="absolute bottom-2 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fas fa-arrow-right text-xs" style="color:${r.color}"></i>
          </div>
        </button>`;
    }

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
          <div id="bo-sheet-status" class="text-xs text-blue-500 font-medium mt-1">
            <i class="fas fa-circle-notch fa-spin mr-1"></i>Connecting to Google Sheets...
          </div>
        </div>
        <!-- Search bar -->
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

      <!-- ── SUMMARY STATS ROW ── -->
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

      <!-- ── DKI JAKARTA SECTION ── -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-blue-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">DKI Jakarta</h4>
          <span class="text-xs text-gray-400 font-medium">${dkiTotal} outlets</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${dkiRegions.map(r => regionCard(r)).join('')}
        </div>
      </div>

      <!-- ── OUTER REGIONS SECTION ── -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-1 h-5 rounded-full bg-emerald-600"></div>
          <h4 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Greater Jakarta &amp; Beyond</h4>
          <span class="text-xs text-gray-400 font-medium">${totalOutlets - dkiTotal} outlets</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          ${outerRegions.map(r => regionCard(r, 'large')).join('')}
        </div>
      </div>
    `;

    attachSearch();

    // Re-trigger live data status if already loaded
    const statusEl = document.getElementById('bo-sheet-status');
    if (allSheetData && statusEl) {
      statusEl.innerHTML = `<i class="fas fa-check-circle mr-1"></i>Live data loaded (${allSheetData.length - 1} outlets)`;
      statusEl.className = 'text-xs text-green-600 font-medium mt-1';
    }
  }

  // ----------------------------------------------------------
  //  VIEW: REGION
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
        <!-- Mini search in region -->
        <div class="relative w-full sm:w-72">
          <input id="bo-region-search" type="text" placeholder="Filter outlets..."
            class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
            style="--tw-ring-color:${cfg.color}40"
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
           style="background:linear-gradient(135deg,white,${cfg.color}10);${isHL ? '' : ''}"
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

      <!-- Hero -->
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
            ${row ? '<i class="fas fa-sync-alt mr-1"></i>Live data from Google Sheets' : '<i class="fas fa-exclamation-circle mr-1"></i>Sheet data unavailable — showing offline record'}
          </p>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-5">
        ${detailSection('Operation Details','fas fa-cogs','#3B82F6', operationDetails(row, store))}
        ${detailSection('Business Development','fas fa-chart-line','#10B981', bizDevDetails(row))}
        ${detailSection('PPR Details','fas fa-file-contract','#8B5CF6', pprDetails(row))}
        ${detailSection('PPM Details','fas fa-users-cog','#F59E0B', ppmDetails(row))}
        ${detailSection('Sales Performance','fas fa-chart-bar','#EF4444', salesDetails(row))}
      </div>

      <!-- Bottom back button -->
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

  function grid(fields) {
    return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${fields.map(f => `
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div class="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wide">${f.l}</div>
          <div class="text-sm font-semibold text-gray-800 break-words">${f.v || '—'}</div>
        </div>`).join('')}
    </div>`;
  }

  function operationDetails(row, store) {
    return grid([
      {l:'Short Code',      v: store.s},
      {l:'Complete Code',   v: store.c},
      {l:'Store Name',      v: store.n},
      {l:'Area Manager',    v: getV(row,3)},
      {l:'Opening Hours',   v: getV(row,4)},
      {l:'Closing Hours',   v: getV(row,5)},
      {l:'Date Opened',     v: getV(row,6)},
      {l:'Address',         v: getV(row,7)},
      {l:'Kecamatan',       v: getV(row,8)},
      {l:'Kota',            v: store.k},
      {l:'Province',        v: getV(row,10)},
      {l:'Post Code',       v: getV(row,11)},
      {l:'Mobile No',       v: getV(row,12)},
      {l:'Email',           v: getV(row,13)},
    ]);
  }

  function bizDevDetails(row) {
    return grid([
      {l:'Lease Start Date', v: getV(row,14)},
      {l:'Lease End Date',   v: getV(row,15)},
      {l:'Monthly Rental',   v: fmt$$(getV(row,16))},
    ]);
  }

  function pprDetails(row) {
    return grid([
      {l:'IMB',            v: getV(row,17)},
      {l:'No SIA',         v: getV(row,18)},
      {l:'Tgl SIA Terbit', v: getV(row,19)},
      {l:'Tgl SIA Expiry', v: getV(row,20)},
      {l:'APJ',            v: getV(row,21)},
    ]);
  }

  function ppmDetails(row) {
    return grid([
      {l:'Optimal HC',      v: getV(row,22)},
      {l:'Current HC',      v: getV(row,23)},
      {l:'Num of BM',       v: getV(row,24)},
      {l:'Num of Apoteker', v: getV(row,25)},
      {l:'Num of TTK',      v: getV(row,26)},
      {l:'Num of CE',       v: getV(row,27)},
    ]);
  }

  function salesDetails(row) {
    return grid([
      {l:'Target Revenue 100%',          v: fmt$$(getV(row,28))},
      {l:'Goal Revenue Bulanan',          v: fmt$$(getV(row,29))},
      {l:'Ave Sales',                     v: fmt$$(getV(row,30))},
      {l:'Last Month Revenue',            v: fmt$$(getV(row,31))},
      {l:'Last Month Profit',             v: fmt$$(getV(row,32))},
      {l:'Last Month Margin',             v: fmtPct(getV(row,33))},
      {l:'Last Month Transactions',       v: getV(row,34)},
      {l:'Last Month PP',                 v: getV(row,35)},
      {l:'Last Month FP %',               v: fmtPct(getV(row,36))},
      {l:'Last Month R.R %',              v: fmtPct(getV(row,37))},
      {l:'Last Month PSH',                v: getV(row,38)},
      {l:'Forecasted Revenue',            v: fmt$$(getV(row,39))},
      {l:'Current Month Growth %',        v: fmtPct(getV(row,40))},
      {l:'Vs Target',                     v: fmtPct(getV(row,41))},
      {l:'VS Goal Bulanan',               v: fmtPct(getV(row,42))},
      {l:'Category',                      v: getV(row,43)},
      {l:'Clan AM',                       v: getV(row,44)},
    ]);
  }

  // ----------------------------------------------------------
  //  SEARCH
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
        const dispName = s.n.replace(/^APOTEK ALPRO (EXPRESS )?/i,'');
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
