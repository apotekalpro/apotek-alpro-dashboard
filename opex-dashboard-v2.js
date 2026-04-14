/**
 * OpEX Dashboard V2 - Improved with pagination and correct data mapping
 */

class OpexDashboardV2 {
    constructor(sheetId, apiKey) {
        this.sheetId = sheetId;
        this.apiKey = apiKey;
        this.data = {
            audit: [],
            auditDetail: [],
            auditAnalysis: { outletTotal: [], outletTidak: [], outletYa: [], amTotal: [], amTidak: [], amYa: [] },
            index: [],
            sttk: [],
            shrinkage: [],
            cctv: []
        };
        
        // Pagination
        this.pagination = {
            audit: { currentPage: 1, pageSize: 15, total: 0 },
            sttk: { currentPage: 1, pageSize: 15, total: 0 },
            cctv: { currentPage: 1, pageSize: 15, total: 0 }
        };
        
        // Sorting state
        this.sorting = {
            audit: { column: null, direction: 'asc' },
            sttk: { column: null, direction: 'asc' },
            cctv: { column: null, direction: 'asc' },
            compliance: { column: null, direction: 'asc' }
        };
        
        // Filtering state
        this.filters = {
            sttk: { outlet: '', am: '', month: '' },
            cctv: { outlet: '', am: '', month: '' }
        };
        
        // Filtered data cache
        this.filteredData = {
            sttk: [],
            cctv: [],
            compliance: []
        };
    }

    async init() {
        try {
            console.log('Initializing OpEX Dashboard V2...');
            await this.loadAllData();
            this.renderAll();
            return true;
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.loadSampleData();
            this.renderAll();
            return false;
        }
    }

    async loadAllData() {
        console.log('Loading data from Google Sheets...');
        
        const promises = [
            this.loadSheetData('Audit', 'A:N'),
            this.loadSheetData('FieldAudit_Detail', 'A:AU'),
            this.loadSheetData('INDEX', 'A:B'),
            this.loadSheetData('STTK_SHRINKAGE', 'A:I'),
            this.loadSheetData('Shrinkage_Items_Raw', 'A:G'),
            this.loadSheetData('CCTV_14H', 'A:Q'),  // Load all rows, no limit
            this.loadSheetData('Analysis Field Audit Detail', 'A:AS')
        ];

        const results = await Promise.all(promises);
        
        this.processAuditData(results[0]);
        this.processAuditDetailData(results[1]);
        this.processIndexData(results[2]);
        this.processSttkData(results[3]);
        this.processShrinkageData(results[4]);
        this.processCctvData(results[5]);
        this.processAuditAnalysisData(results[6]);
        
        // After processing audit analysis, render the summary
        if (this.data.auditAnalysis && this.data.auditAnalysis.codes) {
            this.renderAuditSummary(new Map());
        }
    }

    async loadSheetData(sheetName, range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${sheetName}!${range}?key=${this.apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.values || [];
    }

    processSttkData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No STTK data found');
            return;
        }

        console.log('Processing STTK data, rows:', rawData.length);
        console.log('Sample STTK first row:', rawData[1]);
        
        // Skip header row
        this.data.sttk = rawData.slice(1)
            .filter(row => {
                // Must have month and store name
                if (!row[0] || !row[1]) return false;
                
                // Column C (index 2) contains Type: check for "Auto" (exclude it)
                const type = (row[2] || '').toString().trim().toUpperCase();
                if (type === 'AUTO') {
                    console.log(`Excluding Auto STTK: ${row[1]}`);
                    return false;
                }
                
                return true;
            })
            .map(row => {
                // Column structure: A=Month, B=StoreName, C=Type, D=Qty, E=Cost, F=SourceFileId, G=SourceFileName, H=AM, I=Outlet
                const shrinkageQty = this.parseAndFormatSttkNumber(row[3]); // Column D
                const shrinkageCost = this.parseAndFormatSttkNumber(row[4]); // Column E
                const stockLoss = shrinkageCost || shrinkageQty || 0;
                
                console.log(`STTK: ${row[1]} | Type: ${row[2]} | Qty: ${row[3]} → ${shrinkageQty} | Cost: ${row[4]} → ${shrinkageCost}`);
                
                return {
                    month: row[0] || '',
                    storeName: row[1] || '',
                    type: row[2] || '', // Auto/Manual
                    shrinkageQty: shrinkageQty,
                    shrinkageCost: shrinkageCost,
                    sourceFileId: row[5] || '',
                    sourceFileName: row[6] || '',
                    am: row[7] || '',
                    outlet: row[8] || '',
                    stockLoss: stockLoss
                };
            })
            .filter(item => item.stockLoss !== 0);

        console.log('Processed STTK records (excluding Auto):', this.data.sttk.length);
        if (this.data.sttk.length > 0) {
            console.log('Sample processed STTK:', this.data.sttk[0]);
        }
        this.pagination.sttk.total = this.data.sttk.length;
    }

    processShrinkageData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No Shrinkage data found');
            return;
        }

        console.log('Processing Shrinkage data, rows:', rawData.length);
        console.log('Sample Shrinkage first row:', rawData[1]);
        
        // Skip header row and aggregate by item code
        const itemMap = new Map();
        
        rawData.slice(1)
            .filter(row => row[2] && row[3]) // Has ItemCode and ItemName
            .forEach(row => {
                const itemCode = row[2] || '';
                const itemName = row[3] || '';
                const qty = this.parseAndFormatSttkNumber(row[4]) || 0;
                const cost = this.parseAndFormatSttkNumber(row[5]) || 0;
                const value = cost || qty || 0;
                
                console.log(`Shrinkage item: ${itemCode} | ${itemName} | Qty: ${row[4]} → ${qty} | Cost: ${row[5]} → ${cost}`);
                
                // If item already exists, sum the values
                if (itemMap.has(itemCode)) {
                    const existing = itemMap.get(itemCode);
                    existing.qty += qty;
                    existing.cost += cost;
                    existing.value += value;
                    console.log(`  → Summing with existing. New total: ${existing.value}`);
                } else {
                    // New item
                    itemMap.set(itemCode, {
                        month: row[0] || '',
                        storeName: row[1] || '',
                        itemCode: itemCode,
                        itemName: itemName,
                        qty: qty,
                        cost: cost,
                        value: value
                    });
                }
            });
        
        // Convert map to array, sort by absolute value, and take top 30
        this.data.shrinkage = Array.from(itemMap.values())
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .slice(0, 30);

        console.log('Processed Shrinkage items (Top 30 after summing by item code):', this.data.shrinkage.length);
        console.log('Total unique items before filtering to top 30:', itemMap.size);
        if (this.data.shrinkage.length > 0) {
            console.log('Top item:', this.data.shrinkage[0]);
        }
    }

    processCctvData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No CCTV data found');
            return;
        }

        console.log('Processing CCTV data, rows:', rawData.length);
        
        // First row is headers
        const headers = rawData[0];
        console.log('CCTV Headers:', headers);
        
        // Count how many rows have data
        let validRowCount = 0;
        let emptyRowCount = 0;
        
        // Process data rows (skip header)
        this.data.cctv = rawData.slice(1)
            .filter(row => {
                // Column E = Total Traffic (index 4)
                const trafficValue = row[4];
                const trafficNum = this.parseNumber(trafficValue);
                
                // Also check if outlet name exists (column C, index 2)
                const hasOutlet = row[2] && row[2].trim() !== '';
                
                const shouldInclude = trafficNum > 0 && hasOutlet;
                
                if (!hasOutlet) {
                    emptyRowCount++;
                } else if (trafficNum <= 0) {
                    console.log('Row with outlet but no traffic:', row[2], 'traffic:', trafficValue);
                } else {
                    validRowCount++;
                    console.log('✓ Including:', row[2], 'traffic:', trafficNum);
                }
                
                return shouldInclude;
            })
            .map(row => {
                return {
                    checkDate: row[0] || '',      // A: Tanggal Per
                    videoDate: row[1] || '',      // B: Video Date  
                    outlet: row[2] || '',         // C: Outlet
                    am: row[3] || '',             // D: AM
                    totalTraffic: this.parseNumber(row[4]) || 0,   // E: Total Traffik
                    totalTransa: this.parseNumber(row[5]) || 0,    // F: Total Transa
                    totalLostSales: this.parseNumber(row[6]) || 0, // G: Total Lost S
                    // GREEN COLUMNS - Task Performance
                    totalTitipan: this.parseNumber(row[7]) || 0,   // H: Total Titipan
                    totalUpselling: this.parseNumber(row[8]) || 0, // I: Total Upselling
                    totalTensi: this.parseNumber(row[9]) || 0,     // J: Total Tensi
                    totalBundle: this.parseNumber(row[10]) || 0,   // K: Total Bundle
                    totalMember: this.parseNumber(row[11]) || 0,   // L: Total Member
                    // RED COLUMNS - Loss Reasons
                    totalKosong: this.parseNumber(row[12]) || 0,   // M: Total Kosong
                    totalMahal: this.parseNumber(row[13]) || 0,    // N: Total Mahal
                    totalTitipan2: this.parseNumber(row[14]) || 0, // O: Total Titipan (red)
                    totalLainnya: this.parseNumber(row[15]) || 0,  // P: Total Lainnya
                    month: row[16] || ''          // Q: Month
                };
            });

        console.log('CCTV Summary: Valid rows:', validRowCount, 'Empty rows:', emptyRowCount);
        console.log('Processed CCTV records:', this.data.cctv.length);
        this.pagination.cctv.total = this.data.cctv.length;
    }

    processAuditData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No Audit data found');
            return;
        }

        console.log('Processing Audit data, total rows:', rawData.length - 1);
        
        const rows = rawData.slice(1);
        const processedData = rows
            .filter(row => row[12] && row[12] !== '0.00%')
            .map(row => ({
                outletCode: row[10] || '',
                amName: row[3] || '',
                visitDate: row[11] || '',
                month: row[6] || '',
                scoring: row[13] || '0%',      // SWAPPED: Column N = Scoring
                finalScore: row[12] || ''      // SWAPPED: Column M = Final Score
            }));

        console.log('Filtered Audit records (non-zero scoring):', processedData.length);
        
        // Log sample data for debugging
        if (processedData.length > 0) {
            console.log('Sample audit record:', {
                outletCode: processedData[0].outletCode,
                visitDate: processedData[0].visitDate,
                month: processedData[0].month,
                scoring: processedData[0].scoring
            });
        }

        this.data.audit = this.getLatestRecordPerOutlet(processedData);
        this.pagination.audit.total = this.data.audit.length;
        console.log('Final Audit records (latest per outlet):', this.data.audit.length);
    }

    processAuditDetailData(rawData) {
        if (!rawData || rawData.length === 0) return;
        this.data.auditDetail = { headers: rawData[0], rows: rawData.slice(1) };
    }

    processIndexData(rawData) {
        if (!rawData || rawData.length === 0) return;
        this.data.index = rawData.slice(1).map(row => ({
            code: row[0] || '',
            name: row[1] || ''
        }));
    }

    processAuditAnalysisData(rawData) {
        if (!rawData || rawData.length < 7) {
            console.warn('No Audit Analysis data found, rows:', rawData ? rawData.length : 0);
            return;
        }

        console.log('Processing Audit Analysis data, rows:', rawData.length);
        
        // Row 1 = Headers (columns C to AS contain audit codes)
        const headers = rawData[0];
        console.log('Analysis headers sample:', headers.slice(0, 10));
        
        // Row 2-4: Outlet Hasil (Total, TIDAK, YES)
        // Row 5-7: AM Hasil (Total, TIDAK, YES)
        const outletTotal = rawData[1];  // Row 2
        const outletTidak = rawData[2];  // Row 3
        const outletYa = rawData[3];     // Row 4
        const amTotal = rawData[4];      // Row 5
        const amTidak = rawData[5];      // Row 6
        const amYa = rawData[6];         // Row 7
        
        // Process columns C onwards (index 2+)
        this.data.auditAnalysis = {
            codes: [],
            outletData: [],
            amData: []
        };
        
        // Start from column C (index 2)
        for (let i = 2; i < headers.length && i < 47; i++) {  // Up to column AS (index 46)
            const code = headers[i];
            if (!code) continue;
            
            // Find name from INDEX
            const indexEntry = this.data.index.find(idx => idx.code === code);
            const name = indexEntry ? indexEntry.name : code;
            
            this.data.auditAnalysis.codes.push({
                code: code,
                name: name,
                outletTotal: this.parseNumber(outletTotal[i]) || 0,
                outletTidak: this.parseNumber(outletTidak[i]) || 0,
                outletYa: this.parseNumber(outletYa[i]) || 0,
                amTotal: this.parseNumber(amTotal[i]) || 0,
                amTidak: this.parseNumber(amTidak[i]) || 0,
                amYa: this.parseNumber(amYa[i]) || 0
            });
        }
        
        console.log('Processed Audit Analysis codes:', this.data.auditAnalysis.codes.length);
    }

    getLatestRecordPerOutlet(data) {
        const outletMap = new Map();
        data.forEach(record => {
            const outlet = record.outletCode;
            
            if (!outletMap.has(outlet)) {
                outletMap.set(outlet, record);
            } else {
                const existingRecord = outletMap.get(outlet);
                
                // Compare by month first
                const currentMonth = this.parseMonth(record.month);
                const existingMonth = this.parseMonth(existingRecord.month);
                
                // If months are different, use the newer month
                if (currentMonth > existingMonth) {
                    outletMap.set(outlet, record);
                } else if (currentMonth.getTime() === existingMonth.getTime()) {
                    // Same month - compare by visit date
                    const currentVisitDate = this.parseVisitDate(record.visitDate);
                    const existingVisitDate = this.parseVisitDate(existingRecord.visitDate);
                    
                    if (currentVisitDate > existingVisitDate) {
                        outletMap.set(outlet, record);
                    }
                }
            }
        });
        return Array.from(outletMap.values());
    }
    
    parseVisitDate(dateStr) {
        if (!dateStr) return new Date(0);
        
        // Handle various date formats
        // Format 1: DD/MM/YYYY (e.g., "03/09/2026")
        // Format 2: YYYY-MM-DD (e.g., "2026-03-09")
        // Format 3: DD-MM-YYYY (e.g., "03-09-2026")
        
        try {
            // Try DD/MM/YYYY format first (most common in your sheet)
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
                    const year = parseInt(parts[2]);
                    return new Date(year, month, day);
                }
            }
            
            // Try YYYY-MM-DD format
            if (dateStr.includes('-') && dateStr.length === 10) {
                const parts = dateStr.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                    return new Date(dateStr);
                }
            }
            
            // Try DD-MM-YYYY format
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3 && parts[0].length <= 2) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    return new Date(year, month, day);
                }
            }
            
            // Fallback: try native Date parsing
            return new Date(dateStr);
        } catch (e) {
            console.warn('Failed to parse visit date:', dateStr, e);
            return new Date(0);
        }
    }

    parseMonth(monthStr) {
        if (!monthStr) return new Date(0);
        const monthMap = {
            'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
            'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
            'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
            'january': 0, 'february': 1, 'march': 2, 'may': 4,
            'june': 5, 'july': 6, 'august': 7, 'october': 9, 'december': 11
        };
        const parts = monthStr.toLowerCase().split(' ');
        const month = monthMap[parts[0]] || 0;
        const year = parseInt(parts[1]) || new Date().getFullYear();
        return new Date(year, month);
    }

    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        const cleaned = value.toString().replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
    }
    
    /**
     * Smart number parser for STTK/Shrinkage values
     * - If has "," as thousand separator and "." as decimal → Use as-is (already formatted)
     * - If has "." as separator OR no separator → Divide by 100,000
     */
    parseAndFormatSttkNumber(value) {
        if (!value) return 0;
        
        const str = value.toString().trim();
        
        // CASE 1: Number has comma as thousand separator (US/International format)
        // Examples: "301,042,599" or "301,042,599.00" or "301,042.50"
        // → Use original number WITHOUT division
        if (str.includes(',')) {
            // Remove all commas and parse as float
            const cleaned = str.replace(/,/g, '');
            const parsed = parseFloat(cleaned) || 0;
            console.log(`STTK Parse (format with comma): "${str}" → ${parsed}`);
            return parsed;
        }
        
        // CASE 2: Number has dot as separator OR is plain digits (European format or unformatted)
        // Examples: "301.042.599" or "301042599" or "301.042"
        // → DIVIDE by 100,000
        // Remove all dots (if European format) then divide
        const cleaned = str.replace(/\./g, '');
        const rawValue = parseFloat(cleaned) || 0;
        const divided = rawValue / 100000;
        console.log(`STTK Parse (format with dot/plain): "${str}" → raw: ${rawValue} → divided: ${divided}`);
        return divided;
    }

    // Helper to format STTK numbers for display
    formatSttkNumber(value) {
        if (!value || value === 0) return '0';
        
        // If value >= 1000, format with commas as thousand separator
        if (Math.abs(value) >= 1000) {
            return Math.abs(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        
        // If value < 1000, show with 2 decimal places
        return Math.abs(value).toFixed(2);
    }

    // Helper to format STTK currency for display
    formatSttkCurrency(value) {
        if (!value || value === 0) return 'Rp 0';
        
        const absValue = Math.abs(value);
        
        // If value >= 1000, format with commas and no decimals: Rp 2,202,519
        if (absValue >= 1000) {
            return 'Rp ' + absValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        
        // If value < 1000, show with 2 decimal places: Rp 3.01
        return 'Rp ' + absValue.toFixed(2);
    }

    parsePercentage(value) {
        if (!value) return 0;
        return this.parseNumber(value.toString().replace('%', ''));
    }

    renderAll() {
        // Initialize filtered data with all data
        this.filteredData.sttk = [...this.data.sttk];
        this.filteredData.cctv = [...this.data.cctv];
        
        // Populate month filter dropdowns
        this.populateMonthFilters();
        
        this.renderAuditSection();
        this.renderSttkSection();
        this.renderShrinkageSection();
        this.renderCctvSection();
    }

    renderAuditSection() {
        const data = this.data.audit;
        
        // Summary cards
        this.updateElement('totalAudits', data.length);
        const avgScore = data.reduce((sum, item) => sum + this.parsePercentage(item.scoring), 0) / data.length || 0;
        this.updateElement('avgScore', avgScore.toFixed(1) + '%');
        this.updateElement('outletsAudited', new Set(data.map(a => a.outletCode)).size);

        // Sort data
        const sorted = [...data].sort((a, b) => 
            this.parsePercentage(b.scoring) - this.parsePercentage(a.scoring)
        );

        // Top 5 & Bottom 5 Leaderboards
        this.renderLeaderboards(sorted);
        
        // Paginated table
        this.renderAuditTable();
    }

    renderLeaderboards(sorted) {
        const top5Html = sorted.slice(0, 5).map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td><span class="badge badge-green">${this.escapeHtml(item.finalScore)}</span></td>
            </tr>
        `).join('');
        this.updateElement('top5Leaderboard', top5Html || '<tr><td colspan="4" class="no-data">No data</td></tr>');

        // Filter out outlets with 0 score (not yet audited) for bottom 5
        const nonZeroSorted = sorted.filter(item => {
            const score = this.parsePercentage(item.finalScore);
            return score !== 0 && item.finalScore !== '0%' && item.finalScore !== '0.00%';
        });
        
        const bottom5Html = nonZeroSorted.slice(-5).reverse().map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td><span class="badge badge-red">${this.escapeHtml(item.finalScore)}</span></td>
            </tr>
        `).join('');
        this.updateElement('bottom5Leaderboard', bottom5Html || '<tr><td colspan="4" class="no-data">No data</td></tr>');
    }

    renderAuditTable() {
        const { currentPage, pageSize } = this.pagination.audit;
        const sorted = [...this.data.audit].sort((a, b) => 
            this.parsePercentage(b.scoring) - this.parsePercentage(a.scoring)
        );
        
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = sorted.slice(startIdx, endIdx);
        
        const tableHtml = pageData.map(item => `
            <tr class="clickable-row" onclick="opexDashboard.showAuditDetail('${this.escapeHtml(item.outletCode)}')">
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td>${this.escapeHtml(item.visitDate)}</td>
                <td>${this.escapeHtml(item.scoring)}</td>
                <td>${this.escapeHtml(item.finalScore)}</td>
                <td>
                    <button class="btn-primary text-xs px-3 py-1" onclick="event.stopPropagation(); opexDashboard.showAuditDetail('${this.escapeHtml(item.outletCode)}')">
                        <i class="fas fa-eye mr-1"></i>View
                    </button>
                </td>
            </tr>
        `).join('');
        
        this.updateElement('auditDataTable', tableHtml || '<tr><td colspan="6" class="no-data">No data</td></tr>');
        this.updatePaginationControls('audit', sorted.length);
    }

    renderSttkSection() {
        const data = this.data.sttk;
        console.log('Rendering STTK section with', data.length, 'records');
        
        const sorted = [...data].sort((a, b) => a.stockLoss - b.stockLoss);
        
        // Top 5 worst
        const worst5Html = sorted.slice(0, 5).map((item, index) => {
            const formattedCost = this.formatSttkCurrency(item.stockLoss);
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${this.escapeHtml(item.month)}</td>
                    <td>${this.escapeHtml(item.storeName)}</td>
                    <td>${this.escapeHtml(item.am || 'N/A')}</td>
                    <td><span class="badge badge-red">${formattedCost}</span></td>
                </tr>
            `;
        }).join('');
        this.updateElement('worstStockLoss', worst5Html || '<tr><td colspan="5" class="no-data">No data</td></tr>');
        
        // Paginated table
        this.renderSttkTable();
    }

    renderSttkTable() {
        const { currentPage, pageSize } = this.pagination.sttk;
        
        // Use filtered data if filters are active, otherwise use all data
        const dataToRender = this.filteredData.sttk.length > 0 || 
                            this.filters.sttk.outlet || this.filters.sttk.am || this.filters.sttk.month
            ? this.filteredData.sttk 
            : this.data.sttk;
        
        const sorted = [...dataToRender].sort((a, b) => a.stockLoss - b.stockLoss);
        
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = sorted.slice(startIdx, endIdx);
        
        const tableHtml = pageData.map(item => {
            const formattedCost = this.formatSttkCurrency(item.stockLoss);
            const formattedQty = this.formatSttkNumber(item.shrinkageQty);
            
            return `
                <tr>
                    <td>${this.escapeHtml(item.month)}</td>
                    <td>${this.escapeHtml(item.storeName)}</td>
                    <td>${this.escapeHtml(item.am || 'N/A')}</td>
                    <td>${formattedQty}</td>
                    <td><span class="badge ${item.stockLoss < 0 ? 'badge-red' : 'badge-green'}">${formattedCost}</span></td>
                </tr>
            `;
        }).join('');
        
        this.updateElement('sttkDataTable', tableHtml || '<tr><td colspan="5" class="no-data">No data</td></tr>');
        this.updatePaginationControls('sttk', sorted.length);
    }

    renderShrinkageSection() {
        console.log('Rendering Shrinkage section with', this.data.shrinkage.length, 'items');
        
        const tableHtml = this.data.shrinkage.map((item, index) => {
            const formattedValue = this.formatSttkCurrency(item.value);
            return `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.itemCode)}</td>
                <td>${this.escapeHtml(item.itemName)}</td>
                <td><span class="badge badge-red">${formattedValue}</span></td>
            </tr>
        `;
        }).join('');
        
        this.updateElement('shrinkageItemsTable', tableHtml || '<tr><td colspan="4" class="no-data">No data available</td></tr>');
    }

    renderCctvSection() {
        const data = this.data.cctv;
        console.log('Rendering CCTV section with', data.length, 'records');
        
        // Summary cards
        const totalTraffic = data.reduce((sum, item) => sum + item.totalTraffic, 0);
        const totalLostSales = data.reduce((sum, item) => sum + item.totalLostSales, 0);
        const conversionRate = totalTraffic > 0 ? ((totalTraffic - totalLostSales) / totalTraffic * 100) : 0;
        const avgLoss = data.length > 0 ? (totalLostSales / data.length) : 0;
        
        this.updateElement('totalTraffic', totalTraffic.toLocaleString());
        this.updateElement('totalLossSales', totalLostSales.toLocaleString());
        this.updateElement('conversionRate', conversionRate.toFixed(1) + '%');
        this.updateElement('avgLoss', avgLoss.toFixed(0));
        
        // Top 10 loss sales
        const sortedByLoss = [...data].sort((a, b) => b.totalLostSales - a.totalLostSales).slice(0, 10);
        const top10Html = sortedByLoss.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.outlet)}</td>
                <td>${this.escapeHtml(item.am)}</td>
                <td><span class="badge badge-red">${item.totalLostSales}</span></td>
            </tr>
        `).join('');
        this.updateElement('top10LossSales', top10Html || '<tr><td colspan="5" class="no-data">No data</td></tr>');
        
        // Paginated table
        this.renderCctvTable();
        
        // Summaries
        this.updateLossSalesSummary();
        this.updateTaskPerformanceSummary();
    }

    renderCctvTable() {
        const { currentPage, pageSize } = this.pagination.cctv;
        
        // Use filtered data if filters are active, otherwise use all data
        const dataToRender = this.filteredData.cctv.length > 0 || 
                            this.filters.cctv.outlet || this.filters.cctv.am || this.filters.cctv.month
            ? this.filteredData.cctv 
            : this.data.cctv;
        
        const sorted = [...dataToRender].sort((a, b) => 
            this.parseMonth(b.month) - this.parseMonth(a.month)
        );
        
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = sorted.slice(startIdx, endIdx);
        
        const tableHtml = pageData.map(item => `
            <tr>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.checkDate)}</td>
                <td>${this.escapeHtml(item.videoDate)}</td>
                <td>${this.escapeHtml(item.outlet)}</td>
                <td>${this.escapeHtml(item.am)}</td>
                <td>${item.totalTraffic}</td>
                <td>${item.totalTransa}</td>
                <td><span class="badge badge-red">${item.totalLostSales}</span></td>
                <td class="bg-green-50">${item.totalTitipan}</td>
                <td class="bg-green-50">${item.totalUpselling}</td>
                <td class="bg-green-50">${item.totalTensi}</td>
                <td class="bg-green-50">${item.totalBundle}</td>
                <td class="bg-green-50">${item.totalMember}</td>
                <td class="bg-red-50">${item.totalKosong}</td>
                <td class="bg-red-50">${item.totalMahal}</td>
                <td class="bg-red-50">${item.totalTitipan2}</td>
                <td class="bg-red-50">${item.totalLainnya}</td>
            </tr>
        `).join('');
        
        this.updateElement('cctvDataTable', tableHtml || '<tr><td colspan="17" class="no-data">No data</td></tr>');
        this.updatePaginationControls('cctv', sorted.length);
    }

    updatePaginationControls(section, totalItems) {
        const pagination = this.pagination[section];
        const totalPages = Math.ceil(totalItems / pagination.pageSize);
        
        const controlsHtml = `
            <div class="flex justify-between items-center mt-4">
                <div class="text-sm text-gray-600">
                    Showing ${((pagination.currentPage - 1) * pagination.pageSize) + 1} to ${Math.min(pagination.currentPage * pagination.pageSize, totalItems)} of ${totalItems} records
                </div>
                <div class="flex gap-2">
                    <button onclick="opexDashboard.changePage('${section}', ${pagination.currentPage - 1})" 
                            class="btn-secondary text-sm px-3 py-1" 
                            ${pagination.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span class="px-3 py-1 text-sm">Page ${pagination.currentPage} of ${totalPages}</span>
                    <button onclick="opexDashboard.changePage('${section}', ${pagination.currentPage + 1})" 
                            class="btn-secondary text-sm px-3 py-1" 
                            ${pagination.currentPage >= totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        this.updateElement(`${section}Pagination`, controlsHtml);
    }

    changePage(section, newPage) {
        const pagination = this.pagination[section];
        const totalPages = Math.ceil(pagination.total / pagination.pageSize);
        
        if (newPage < 1 || newPage > totalPages) return;
        
        pagination.currentPage = newPage;
        
        if (section === 'audit') this.renderAuditTable();
        else if (section === 'sttk') this.renderSttkTable();
        else if (section === 'cctv') this.renderCctvTable();
    }

    updateLossSalesSummary(monthFilter = '') {
        const data = monthFilter ? 
            this.data.cctv.filter(item => item.month === monthFilter) : 
            this.data.cctv;

        const totalKosong = data.reduce((sum, item) => sum + item.totalKosong, 0);
        const totalMahal = data.reduce((sum, item) => sum + item.totalMahal, 0);
        const totalTitipan = data.reduce((sum, item) => sum + item.totalTitipan2, 0);
        const totalLainnya = data.reduce((sum, item) => sum + item.totalLainnya, 0);

        const total = totalKosong + totalMahal + totalTitipan + totalLainnya;

        const reasons = [
            { name: 'Kosong (Out of Stock)', count: totalKosong },
            { name: 'Mahal (Too Expensive)', count: totalMahal },
            { name: 'Titipan', count: totalTitipan },
            { name: 'Lainnya (Others)', count: totalLainnya }
        ].sort((a, b) => b.count - a.count);

        const html = reasons.map(reason => `
            <tr>
                <td>${this.escapeHtml(reason.name)}</td>
                <td><span class="badge badge-red">${reason.count}</span></td>
                <td>${total > 0 ? ((reason.count / total) * 100).toFixed(1) : 0}%</td>
            </tr>
        `).join('');
        
        this.updateElement('lossSalesReasonTable', html || '<tr><td colspan="3" class="no-data">No data</td></tr>');
    }

    updateTaskPerformanceSummary() {
        const data = this.data.cctv;

        const totalTitipan = data.reduce((sum, item) => sum + item.totalTitipan, 0);
        const totalUpselling = data.reduce((sum, item) => sum + item.totalUpselling, 0);
        const totalTensi = data.reduce((sum, item) => sum + item.totalTensi, 0);
        const totalBundle = data.reduce((sum, item) => sum + item.totalBundle, 0);
        const totalMember = data.reduce((sum, item) => sum + item.totalMember, 0);
        const totalTraffic = data.reduce((sum, item) => sum + item.totalTraffic, 0);

        const tasks = [
            { name: 'Titipan', count: totalTitipan },
            { name: 'Upselling', count: totalUpselling },
            { name: 'Tensi (Blood Pressure Check)', count: totalTensi },
            { name: 'Bundle', count: totalBundle },
            { name: 'Member', count: totalMember }
        ].sort((a, b) => b.count - a.count);

        const html = tasks.map(task => {
            const avgPerTraffic = totalTraffic > 0 ? (task.count / totalTraffic) : 0;
            const performanceLevel = avgPerTraffic > 0.8 ? 'Excellent' :
                                    avgPerTraffic > 0.6 ? 'Good' :
                                    avgPerTraffic > 0.4 ? 'Average' : 'Needs Improvement';
            const badgeClass = avgPerTraffic > 0.8 ? 'badge-green' :
                              avgPerTraffic > 0.6 ? 'badge-yellow' : 'badge-red';

            return `
                <tr>
                    <td>${this.escapeHtml(task.name)}</td>
                    <td><span class="badge ${badgeClass}">${task.count}</span></td>
                    <td>${(avgPerTraffic * 100).toFixed(1)}%</td>
                    <td><span class="badge ${badgeClass}">${performanceLevel}</span></td>
                </tr>
            `;
        }).join('');
        
        this.updateElement('taskPerformanceTable', html || '<tr><td colspan="4" class="no-data">No data</td></tr>');
    }

    showAuditDetail(outletCode) {
        document.getElementById('modalOutletCode').textContent = outletCode;
        document.getElementById('auditDetailModal').style.display = 'block';
        
        // Find matching audit record
        const auditRecord = this.data.audit.find(a => a.outletCode === outletCode);
        if (!auditRecord) {
            document.getElementById('modalContent').innerHTML = '<div class="no-data">No data found for this outlet</div>';
            return;
        }
        
        // Find matching detail records
        const detailRecords = this.data.auditDetail.rows.filter(row => {
            // Column B = outlet code, Column A = month, Column C = visit date
            return row[1] === outletCode;
        });
        
        if (detailRecords.length === 0) {
            document.getElementById('modalContent').innerHTML = '<div class="no-data">No detail records found</div>';
            return;
        }
        
        // Render audit detail
        this.renderAuditDetailModal(auditRecord, detailRecords);
    }
    
    renderAuditDetailModal(auditRecord, detailRecords) {
        let html = `
            <div class="mb-4">
                <h3 class="font-semibold mb-2">Audit Information</h3>
                <p><strong>AM:</strong> ${this.escapeHtml(auditRecord.amName)}</p>
                <p><strong>Visit Date:</strong> ${this.escapeHtml(auditRecord.visitDate)}</p>
                <p><strong>Scoring:</strong> ${this.escapeHtml(auditRecord.scoring)}</p>
            </div>
        `;
        
        // Group TIDAK entries by code
        const tidakMap = new Map();
        
        detailRecords.forEach(row => {
            // Columns E-AU contain audit results
            const headers = this.data.auditDetail.headers;
            for (let i = 4; i < Math.min(row.length, headers.length); i++) {
                const value = (row[i] || '').toString().toUpperCase();
                if (value === 'TIDAK') {
                    const code = headers[i];
                    // Find name from INDEX
                    const indexEntry = this.data.index.find(idx => idx.code === code);
                    const name = indexEntry ? indexEntry.name : code;
                    const key = `${code} - ${name}`;
                    tidakMap.set(key, (tidakMap.get(key) || 0) + 1);
                }
            }
        });
        
        if (tidakMap.size > 0) {
            html += `
                <div class="mb-4">
                    <h3 class="font-semibold mb-2">TIDAK Issues (${tidakMap.size} unique)</h3>
                    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left p-2 bg-gray-100">Code - Description</th>
                                    <th class="text-right p-2 bg-gray-100">Count</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // Sort by count descending
            const sorted = Array.from(tidakMap.entries()).sort((a, b) => b[1] - a[1]);
            sorted.forEach(([key, count]) => {
                html += `
                    <tr>
                        <td class="p-2 border-b">${this.escapeHtml(key)}</td>
                        <td class="p-2 border-b text-right"><span class="badge badge-red">${count}</span></td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            html += '<div class="mb-4"><p class="text-green-600">✓ No TIDAK issues found</p></div>';
        }
        
        // Summary: Top 10 issues and full compliance table
        this.renderAuditSummary(tidakMap);
        
        document.getElementById('modalContent').innerHTML = html;
    }
    
    renderAuditSummary(tidakMap) {
        // Use Analysis sheet data if available
        if (this.data.auditAnalysis && this.data.auditAnalysis.codes && this.data.auditAnalysis.codes.length > 0) {
            // Sort by outletTidak count descending
            const sorted = [...this.data.auditAnalysis.codes]
                .filter(item => item.outletTidak > 0)
                .sort((a, b) => b.outletTidak - a.outletTidak);
            
            const top10 = sorted.slice(0, 10);
            
            let html = `
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-3">📊 Field Audit Detail Summary</h3>
                    
                    <h4 class="font-semibold mb-2">Top 10 Issues (TIDAK) - Outlet Results</h4>
                    <table class="w-full mb-4">
                        <thead>
                            <tr class="bg-purple-600 text-white">
                                <th class="p-2">Rank</th>
                                <th class="p-2 text-left">Code</th>
                                <th class="p-2 text-left">Description</th>
                                <th class="p-2">TIDAK Count</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            if (top10.length === 0) {
                html += '<tr><td colspan="4" class="p-4 text-center text-gray-500">No TIDAK issues found</td></tr>';
            } else {
                top10.forEach((item, index) => {
                    html += `
                        <tr>
                            <td class="p-2 border-b text-center">${index + 1}</td>
                            <td class="p-2 border-b">${this.escapeHtml(item.code)}</td>
                            <td class="p-2 border-b">${this.escapeHtml(item.name)}</td>
                            <td class="p-2 border-b text-center"><span class="badge badge-red">${item.outletTidak}</span></td>
                        </tr>
                    `;
                });
            }
            
            html += `
                        </tbody>
                    </table>
                    
                    <h4 class="font-semibold mb-2">Overall Compliance</h4>
                    <p class="text-sm text-gray-600 mb-2">Full breakdown comparing Outlet vs AM results</p>
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="w-full" id="overallComplianceTable">
                            <thead>
                                <tr class="bg-purple-600 text-white">
                                    <th class="p-2 text-left sortable cursor-pointer" rowspan="2" onclick="opexDashboard.sortOverallCompliance('code')">
                                        Code <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 text-left sortable cursor-pointer" rowspan="2" onclick="opexDashboard.sortOverallCompliance('description')">
                                        Description <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 text-center" colspan="3">Outlet Results</th>
                                    <th class="p-2 text-center" colspan="3">AM Results</th>
                                </tr>
                                <tr class="bg-purple-500 text-white">
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('outletTidak')">
                                        TIDAK <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('outletYa')">
                                        YES <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('outletTotal')">
                                        Total <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('amTidak')">
                                        TIDAK <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('amYa')">
                                        YES <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                    <th class="p-2 sortable cursor-pointer" onclick="opexDashboard.sortOverallCompliance('amTotal')">
                                        Total <i class="fas fa-sort sort-icon"></i>
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="overallComplianceBody">
            `;
            
            this.data.auditAnalysis.codes.forEach(item => {
                const outletCompliance = item.outletTotal > 0 ? 
                    ((item.outletYa / item.outletTotal) * 100).toFixed(1) : 0;
                const amCompliance = item.amTotal > 0 ? 
                    ((item.amYa / item.amTotal) * 100).toFixed(1) : 0;
                
                html += `
                    <tr>
                        <td class="p-2 border-b">${this.escapeHtml(item.code)}</td>
                        <td class="p-2 border-b">${this.escapeHtml(item.name)}</td>
                        <td class="p-2 border-b text-center"><span class="badge badge-red">${item.outletTidak}</span></td>
                        <td class="p-2 border-b text-center"><span class="badge badge-green">${item.outletYa}</span></td>
                        <td class="p-2 border-b text-center">${item.outletTotal}</td>
                        <td class="p-2 border-b text-center"><span class="badge badge-red">${item.amTidak}</span></td>
                        <td class="p-2 border-b text-center"><span class="badge badge-green">${item.amYa}</span></td>
                        <td class="p-2 border-b text-center">${item.amTotal}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Update summary section in the page (outside modal)
            const summaryDiv = document.getElementById('fieldAuditSummary');
            if (summaryDiv) {
                summaryDiv.innerHTML = html;
            }
        } else {
            // Fallback to old method
            const sorted = Array.from(tidakMap.entries()).sort((a, b) => b[1] - a[1]);
            const top10 = sorted.slice(0, 10);
            
            let html = `
                <div class="mt-6">
                    <h3 class="text-lg font-bold mb-3">📊 Field Audit Detail Summary</h3>
                    <p class="text-gray-600">Loading analysis data...</p>
                </div>
            `;
            
            const summaryDiv = document.getElementById('fieldAuditSummary');
            if (summaryDiv) {
                summaryDiv.innerHTML = html;
            }
        }
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            if (typeof content === 'string' && content.includes('<')) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    // ========== FILTERING METHODS ==========
    
    applySttkFilters() {
        const outletFilter = document.getElementById('sttkOutletFilter')?.value.toLowerCase() || '';
        const amFilter = document.getElementById('sttkAmFilter')?.value.toLowerCase() || '';
        const monthFilter = document.getElementById('sttkMonthFilter')?.value || '';
        
        this.filters.sttk = { outlet: outletFilter, am: amFilter, month: monthFilter };
        
        this.filteredData.sttk = this.data.sttk.filter(row => {
            const matchesOutlet = !outletFilter || (row.storeName && row.storeName.toLowerCase().includes(outletFilter));
            const matchesAm = !amFilter || (row.am && row.am.toLowerCase().includes(amFilter));
            const matchesMonth = !monthFilter || row.month === monthFilter;
            return matchesOutlet && matchesAm && matchesMonth;
        });
        
        this.pagination.sttk.currentPage = 1;
        this.pagination.sttk.total = this.filteredData.sttk.length;
        this.renderSttkTable();
        console.log(`STTK filtered: ${this.filteredData.sttk.length} of ${this.data.sttk.length} records`);
    }
    
    clearSttkFilters() {
        document.getElementById('sttkOutletFilter').value = '';
        document.getElementById('sttkAmFilter').value = '';
        document.getElementById('sttkMonthFilter').value = '';
        this.filters.sttk = { outlet: '', am: '', month: '' };
        this.filteredData.sttk = [...this.data.sttk];
        this.pagination.sttk.currentPage = 1;
        this.pagination.sttk.total = this.data.sttk.length;
        this.renderSttkTable();
    }
    
    applyCctvFilters() {
        const outletFilter = document.getElementById('cctvOutletFilter')?.value.toLowerCase() || '';
        const amFilter = document.getElementById('cctvAmFilter')?.value.toLowerCase() || '';
        const monthFilter = document.getElementById('cctvMonthFilter')?.value || '';
        
        this.filters.cctv = { outlet: outletFilter, am: amFilter, month: monthFilter };
        
        this.filteredData.cctv = this.data.cctv.filter(row => {
            const matchesOutlet = !outletFilter || (row.outlet && row.outlet.toLowerCase().includes(outletFilter));
            const matchesAm = !amFilter || (row.am && row.am.toLowerCase().includes(amFilter));
            const matchesMonth = !monthFilter || row.month === monthFilter;
            return matchesOutlet && matchesAm && matchesMonth;
        });
        
        this.pagination.cctv.currentPage = 1;
        this.pagination.cctv.total = this.filteredData.cctv.length;
        this.renderCctvTable();
        console.log(`CCTV filtered: ${this.filteredData.cctv.length} of ${this.data.cctv.length} records`);
    }
    
    clearCctvFilters() {
        document.getElementById('cctvOutletFilter').value = '';
        document.getElementById('cctvAmFilter').value = '';
        document.getElementById('cctvMonthFilter').value = '';
        this.filters.cctv = { outlet: '', am: '', month: '' };
        this.filteredData.cctv = [...this.data.cctv];
        this.pagination.cctv.currentPage = 1;
        this.pagination.cctv.total = this.data.cctv.length;
        this.renderCctvTable();
    }
    
    populateMonthFilters() {
        // Populate STTK month filter
        const sttkMonths = [...new Set(this.data.sttk.map(row => row.month))].sort();
        const sttkSelect = document.getElementById('sttkMonthFilter');
        if (sttkSelect) {
            sttkSelect.innerHTML = '<option value="">All Months</option>' +
                sttkMonths.map(month => `<option value="${month}">${month}</option>`).join('');
        }
        
        // Populate CCTV month filter
        const cctvMonths = [...new Set(this.data.cctv.map(row => row.month))].sort();
        const cctvSelect = document.getElementById('cctvMonthFilter');
        if (cctvSelect) {
            cctvSelect.innerHTML = '<option value="">All Months</option>' +
                cctvMonths.map(month => `<option value="${month}">${month}</option>`).join('');
        }
    }
    
    // ========== SORTING METHODS ==========
    
    sortCctv(column) {
        const state = this.sorting.cctv;
        
        // Toggle direction if same column, otherwise default to ascending
        if (state.column === column) {
            state.direction = state.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.column = column;
            state.direction = 'asc';
        }
        
        const dataToSort = this.filteredData.cctv.length > 0 ? this.filteredData.cctv : this.data.cctv;
        
        dataToSort.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];
            
            // Handle numeric columns
            if (['totalTraffic', 'totalTransa', 'totalLostSales', 'totalTitipan', 'totalUpselling', 
                 'totalTensi', 'totalBundle', 'totalMember', 'totalKosong', 'totalMahal', 
                 'totalTitipan2', 'totalLainnya'].includes(column)) {
                aVal = this.parseNumber(aVal);
                bVal = this.parseNumber(bVal);
            }
            
            // Handle date columns
            if (['checkDate', 'videoDate'].includes(column)) {
                aVal = new Date(aVal || '1900-01-01');
                bVal = new Date(bVal || '1900-01-01');
            }
            
            // Handle month column
            if (column === 'month') {
                aVal = this.parseMonth(aVal);
                bVal = this.parseMonth(bVal);
            }
            
            // Compare
            if (aVal < bVal) return state.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        if (this.filteredData.cctv.length > 0) {
            this.filteredData.cctv = dataToSort;
        } else {
            this.data.cctv = dataToSort;
        }
        
        this.renderCctvTable();
        console.log(`CCTV sorted by ${column} (${state.direction})`);
    }
    
    sortCompliance(column) {
        const state = this.sorting.compliance;
        
        if (state.column === column) {
            state.direction = state.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.column = column;
            state.direction = 'asc';
        }
        
        // Get compliance data from auditAnalysis
        if (!this.data.auditAnalysis || !this.data.auditAnalysis.codes) {
            console.warn('No audit analysis data to sort');
            return;
        }
        
        // Create array of compliance rows
        const complianceRows = this.data.auditAnalysis.codes.map(code => {
            const indexEntry = this.data.index.find(idx => idx.code === code);
            const description = indexEntry ? indexEntry.name : code;
            const tidakCount = this.data.auditAnalysis.outletTidak[code] || 0;
            const yesCount = this.data.auditAnalysis.outletYa[code] || 0;
            const total = this.data.auditAnalysis.outletTotal[code] || 0;
            const compliance = total > 0 ? ((yesCount / total) * 100).toFixed(1) : 0;
            
            return { code, description, tidakCount, yesCount, total, compliance };
        });
        
        // Sort the array
        complianceRows.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];
            
            // Handle numeric columns
            if (['tidakCount', 'yesCount', 'total', 'compliance'].includes(column)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            
            if (aVal < bVal) return state.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Store sorted compliance data
        this.filteredData.compliance = complianceRows;
        
        // Re-render the compliance table
        this.renderComplianceTable();
        console.log(`Compliance sorted by ${column} (${state.direction})`);
    }
    
    renderComplianceTable() {
        const rows = this.filteredData.compliance.length > 0 
            ? this.filteredData.compliance 
            : this.createComplianceRows();
        
        if (!rows || rows.length === 0) {
            return;
        }
        
        let html = '';
        rows.forEach(row => {
            const complianceClass = row.compliance >= 80 ? 'text-green-600' : row.compliance >= 60 ? 'text-yellow-600' : 'text-red-600';
            html += `
                <tr>
                    <td class="font-mono">${this.escapeHtml(row.code)}</td>
                    <td>${this.escapeHtml(row.description)}</td>
                    <td class="text-red-600 font-semibold">${row.tidakCount}</td>
                    <td class="text-green-600 font-semibold">${row.yesCount}</td>
                    <td class="${complianceClass} font-semibold">${row.compliance}%</td>
                </tr>
            `;
        });
        
        this.updateElement('fullDetailTable', html);
    }
    
    sortOverallCompliance(column) {
        // Initialize sorting state for overall compliance if not exists
        if (!this.sorting.overallCompliance) {
            this.sorting.overallCompliance = { column: null, direction: 'asc' };
        }
        
        const state = this.sorting.overallCompliance;
        
        if (state.column === column) {
            state.direction = state.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.column = column;
            state.direction = 'asc';
        }
        
        // Get audit analysis data
        if (!this.data.auditAnalysis || !this.data.auditAnalysis.codes) {
            console.warn('No audit analysis data to sort');
            return;
        }
        
        // Sort the codes array based on the selected column
        const sortedCodes = [...this.data.auditAnalysis.codes].sort((a, b) => {
            let aVal, bVal;
            
            switch(column) {
                case 'code':
                    aVal = a.code;
                    bVal = b.code;
                    break;
                case 'description':
                    aVal = a.name;
                    bVal = b.name;
                    break;
                case 'outletTidak':
                    aVal = a.outletTidak || 0;
                    bVal = b.outletTidak || 0;
                    break;
                case 'outletYa':
                    aVal = a.outletYa || 0;
                    bVal = b.outletYa || 0;
                    break;
                case 'outletTotal':
                    aVal = a.outletTotal || 0;
                    bVal = b.outletTotal || 0;
                    break;
                case 'amTidak':
                    aVal = a.amTidak || 0;
                    bVal = b.amTidak || 0;
                    break;
                case 'amYa':
                    aVal = a.amYa || 0;
                    bVal = b.amYa || 0;
                    break;
                case 'amTotal':
                    aVal = a.amTotal || 0;
                    bVal = b.amTotal || 0;
                    break;
                default:
                    return 0;
            }
            
            // Compare values
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return state.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Re-render the Overall Compliance table body
        this.renderOverallComplianceBody(sortedCodes);
        console.log(`Overall Compliance sorted by ${column} (${state.direction})`);
    }
    
    renderOverallComplianceBody(sortedCodes) {
        const codes = sortedCodes || this.data.auditAnalysis.codes;
        
        let html = '';
        codes.forEach(item => {
            const outletCompliance = item.outletTotal > 0 ? 
                ((item.outletYa / item.outletTotal) * 100).toFixed(1) : 0;
            const amCompliance = item.amTotal > 0 ? 
                ((item.amYa / item.amTotal) * 100).toFixed(1) : 0;
            
            html += `
                <tr>
                    <td class="p-2 border-b">${this.escapeHtml(item.code)}</td>
                    <td class="p-2 border-b">${this.escapeHtml(item.name)}</td>
                    <td class="p-2 border-b text-center"><span class="badge badge-red">${item.outletTidak}</span></td>
                    <td class="p-2 border-b text-center"><span class="badge badge-green">${item.outletYa}</span></td>
                    <td class="p-2 border-b text-center">${item.outletTotal}</td>
                    <td class="p-2 border-b text-center"><span class="badge badge-red">${item.amTidak}</span></td>
                    <td class="p-2 border-b text-center"><span class="badge badge-green">${item.amYa}</span></td>
                    <td class="p-2 border-b text-center">${item.amTotal}</td>
                </tr>
            `;
        });
        
        this.updateElement('overallComplianceBody', html);
    }
    
    createComplianceRows() {
        if (!this.data.auditAnalysis || !this.data.auditAnalysis.codes) {
            return [];
        }
        
        return this.data.auditAnalysis.codes.map(code => {
            const indexEntry = this.data.index.find(idx => idx.code === code);
            const description = indexEntry ? indexEntry.name : code;
            const tidakCount = this.data.auditAnalysis.outletTidak[code] || 0;
            const yesCount = this.data.auditAnalysis.outletYa[code] || 0;
            const total = this.data.auditAnalysis.outletTotal[code] || 0;
            const compliance = total > 0 ? ((yesCount / total) * 100).toFixed(1) : 0;
            
            return { code, description, tidakCount, yesCount, total, compliance };
        });
    }

    loadSampleData() {
        console.log('Loading sample data...');
        // Sample data implementation
        this.data.audit = [
            { outletCode: 'OUT001', amName: 'John Doe', visitDate: '2026-03-15', month: 'Maret 2026', scoring: '95.5%', finalScore: 'A' },
            { outletCode: 'OUT002', amName: 'Jane Smith', visitDate: '2026-03-14', month: 'Maret 2026', scoring: '88.2%', finalScore: 'B' }
        ];
        
        this.data.sttk = [
            { month: 'Maret 2026', storeName: '2038 - ( H ) SBKT ) APOTEK ALPRO EXPRESS BHAYANGKARA', am: 'FUNNAININDYA', stockLoss: -2518.513 },
            { month: 'Maret 2026', storeName: '0093 - ( J8BS,MT ) APOTEK ALPRO JALIMAKMUR', am: 'CAMELIA PUTRI', stockLoss: -2044.234 }
        ];
        
        this.data.shrinkage = [
            { itemCode: 'ITEM001', itemName: 'Product 1', value: 5000 },
            { itemCode: 'ITEM002', itemName: 'Product 2', value: 4500 }
        ];
        
        this.data.cctv = [
            {
                month: 'Maret 2026', checkDate: '2026-03-15', videoDate: '2026-03-14',
                outlet: 'Outlet A', am: 'Manager 1', totalTraffic: 150, lossSales: 30,
                greeting: 120, offerHelp: 110, infoProduct: 100, offerMore: 90, closing: 85,
                noStaff: 10, staffBusy: 8, noStock: 7, others: 5
            }
        ];
        
        this.pagination.audit.total = this.data.audit.length;
        this.pagination.sttk.total = this.data.sttk.length;
        this.pagination.cctv.total = this.data.cctv.length;
    }
}
