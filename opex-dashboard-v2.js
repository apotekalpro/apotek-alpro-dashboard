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
            cctv: { column: null, direction: 'asc' }
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
            this.loadSheetData('CCTV_14H', 'A1:Q500')
        ];

        const results = await Promise.all(promises);
        
        this.processAuditData(results[0]);
        this.processAuditDetailData(results[1]);
        this.processIndexData(results[2]);
        this.processSttkData(results[3]);
        this.processShrinkageData(results[4]);
        this.processCctvData(results[5]);
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
        
        // Skip header row
        this.data.sttk = rawData.slice(1)
            .filter(row => row[0] && row[1]) // Has month and store name
            .map(row => {
                // Based on your screenshot: A=Month, B=StoreName, C=ShrinkageQty, D=ShrinkageCost
                const shrinkageValue = this.parseNumber(row[3]) || this.parseNumber(row[2]) || 0;
                
                return {
                    month: row[0] || '',
                    storeName: row[1] || '',
                    shrinkageQty: this.parseNumber(row[2]) || 0,
                    shrinkageCost: this.parseNumber(row[3]) || 0,
                    sourceFileId: row[4] || '',
                    sourceFileName: row[5] || '',
                    am: row[6] || '',
                    outlet: row[7] || '',
                    stockLoss: shrinkageValue
                };
            })
            .filter(item => item.stockLoss !== 0);

        console.log('Processed STTK records:', this.data.sttk.length);
        this.pagination.sttk.total = this.data.sttk.length;
    }

    processShrinkageData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No Shrinkage data found');
            return;
        }

        console.log('Processing Shrinkage data, rows:', rawData.length);
        
        // Skip header row
        this.data.shrinkage = rawData.slice(1)
            .filter(row => row[2] && row[3]) // Has ItemCode and ItemName
            .map(row => ({
                month: row[0] || '',
                storeName: row[1] || '',
                itemCode: row[2] || '',
                itemName: row[3] || '',
                qty: this.parseNumber(row[4]) || 0,
                cost: this.parseNumber(row[5]) || 0,
                value: this.parseNumber(row[5]) || this.parseNumber(row[4]) || 0
            }))
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .slice(0, 30);

        console.log('Processed Shrinkage items:', this.data.shrinkage.length);
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
        
        // Process data rows (skip header)
        this.data.cctv = rawData.slice(1)
            .filter(row => {
                // Find traffic column (should be around column E based on your data)
                const traffic = this.parseNumber(row[4]); // Column E (index 4)
                return traffic > 0;
            })
            .map(row => {
                return {
                    checkDate: row[0] || '',      // A: Tgl Pengecekan
                    videoDate: row[1] || '',      // B: Tgl Video
                    outlet: row[2] || '',         // C: Nama Toko
                    am: row[3] || '',             // D: AM
                    totalTraffic: this.parseNumber(row[4]) || 0,  // E: Total Traffic
                    // Columns F-G might be other metrics
                    lossSales: this.parseNumber(row[6]) || 0,      // G: Loss Sales
                    greeting: this.parseNumber(row[7]) || 0,       // H: Greeting
                    offerHelp: this.parseNumber(row[8]) || 0,      // I: Offer Help
                    infoProduct: this.parseNumber(row[9]) || 0,    // J: Info Product
                    offerMore: this.parseNumber(row[10]) || 0,     // K: Offer More
                    closing: this.parseNumber(row[11]) || 0,       // L: Closing
                    noStaff: this.parseNumber(row[12]) || 0,       // M: No Staff
                    staffBusy: this.parseNumber(row[13]) || 0,     // N: Staff Busy
                    noStock: this.parseNumber(row[14]) || 0,       // O: No Stock
                    others: this.parseNumber(row[15]) || 0,        // P: Others
                    month: row[16] || ''          // Q: Month
                };
            });

        console.log('Processed CCTV records:', this.data.cctv.length);
        this.pagination.cctv.total = this.data.cctv.length;
    }

    processAuditData(rawData) {
        if (!rawData || rawData.length < 2) {
            console.warn('No Audit data found');
            return;
        }

        const rows = rawData.slice(1);
        const processedData = rows
            .filter(row => row[12] && row[12] !== '0.00%')
            .map(row => ({
                outletCode: row[10] || '',
                amName: row[3] || '',
                visitDate: row[11] || '',
                month: row[6] || '',
                scoring: row[12] || '0%',
                finalScore: row[13] || ''
            }));

        this.data.audit = this.getLatestRecordPerOutlet(processedData);
        this.pagination.audit.total = this.data.audit.length;
        console.log('Processed Audit records:', this.data.audit.length);
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

    getLatestRecordPerOutlet(data) {
        const outletMap = new Map();
        data.forEach(record => {
            const outlet = record.outletCode;
            const currentMonth = this.parseMonth(record.month);
            if (!outletMap.has(outlet)) {
                outletMap.set(outlet, record);
            } else {
                const existingMonth = this.parseMonth(outletMap.get(outlet).month);
                if (currentMonth > existingMonth) {
                    outletMap.set(outlet, record);
                }
            }
        });
        return Array.from(outletMap.values());
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

    parsePercentage(value) {
        if (!value) return 0;
        return this.parseNumber(value.toString().replace('%', ''));
    }

    renderAll() {
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
                <td><span class="badge badge-green">${this.escapeHtml(item.scoring)}</span></td>
            </tr>
        `).join('');
        this.updateElement('top5Leaderboard', top5Html || '<tr><td colspan="4" class="no-data">No data</td></tr>');

        const bottom5Html = sorted.slice(-5).reverse().map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td><span class="badge badge-red">${this.escapeHtml(item.scoring)}</span></td>
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
        const worst5Html = sorted.slice(0, 5).map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.storeName)}</td>
                <td>${this.escapeHtml(item.am || 'N/A')}</td>
                <td><span class="badge badge-red">${item.stockLoss.toFixed(2)}</span></td>
            </tr>
        `).join('');
        this.updateElement('worstStockLoss', worst5Html || '<tr><td colspan="5" class="no-data">No data</td></tr>');
        
        // Paginated table
        this.renderSttkTable();
    }

    renderSttkTable() {
        const { currentPage, pageSize } = this.pagination.sttk;
        const sorted = [...this.data.sttk].sort((a, b) => a.stockLoss - b.stockLoss);
        
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = sorted.slice(startIdx, endIdx);
        
        const tableHtml = pageData.map(item => `
            <tr>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.storeName)}</td>
                <td>${this.escapeHtml(item.am || 'N/A')}</td>
                <td><span class="badge ${item.stockLoss < 0 ? 'badge-red' : 'badge-green'}">${item.stockLoss.toFixed(2)}</span></td>
            </tr>
        `).join('');
        
        this.updateElement('sttkDataTable', tableHtml || '<tr><td colspan="4" class="no-data">No data</td></tr>');
        this.updatePaginationControls('sttk', sorted.length);
    }

    renderShrinkageSection() {
        console.log('Rendering Shrinkage section with', this.data.shrinkage.length, 'items');
        
        const tableHtml = this.data.shrinkage.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.itemCode)}</td>
                <td>${this.escapeHtml(item.itemName)}</td>
                <td><span class="badge badge-red">${Math.abs(item.value).toFixed(2)}</span></td>
            </tr>
        `).join('');
        
        this.updateElement('shrinkageItemsTable', tableHtml || '<tr><td colspan="4" class="no-data">No data available</td></tr>');
    }

    renderCctvSection() {
        const data = this.data.cctv;
        console.log('Rendering CCTV section with', data.length, 'records');
        
        // Summary cards
        const totalTraffic = data.reduce((sum, item) => sum + item.totalTraffic, 0);
        const totalLossSales = data.reduce((sum, item) => sum + item.lossSales, 0);
        const conversionRate = totalTraffic > 0 ? ((totalTraffic - totalLossSales) / totalTraffic * 100) : 0;
        const avgLoss = data.length > 0 ? (totalLossSales / data.length) : 0;
        
        this.updateElement('totalTraffic', totalTraffic.toLocaleString());
        this.updateElement('totalLossSales', totalLossSales.toLocaleString());
        this.updateElement('conversionRate', conversionRate.toFixed(1) + '%');
        this.updateElement('avgLoss', avgLoss.toFixed(0));
        
        // Top 10 loss sales
        const sortedByLoss = [...data].sort((a, b) => b.lossSales - a.lossSales).slice(0, 10);
        const top10Html = sortedByLoss.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.outlet)}</td>
                <td>${this.escapeHtml(item.am)}</td>
                <td><span class="badge badge-red">${item.lossSales}</span></td>
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
        const sorted = [...this.data.cctv].sort((a, b) => 
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
                <td><span class="badge badge-red">${item.lossSales}</span></td>
                <td class="bg-green-50">${item.greeting}</td>
                <td class="bg-green-50">${item.offerHelp}</td>
                <td class="bg-green-50">${item.infoProduct}</td>
                <td class="bg-green-50">${item.offerMore}</td>
                <td class="bg-green-50">${item.closing}</td>
                <td class="bg-red-50">${item.noStaff}</td>
                <td class="bg-red-50">${item.staffBusy}</td>
                <td class="bg-red-50">${item.noStock}</td>
                <td class="bg-red-50">${item.others}</td>
            </tr>
        `).join('');
        
        this.updateElement('cctvDataTable', tableHtml || '<tr><td colspan="16" class="no-data">No data</td></tr>');
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

        const totalNoStaff = data.reduce((sum, item) => sum + item.noStaff, 0);
        const totalStaffBusy = data.reduce((sum, item) => sum + item.staffBusy, 0);
        const totalNoStock = data.reduce((sum, item) => sum + item.noStock, 0);
        const totalOthers = data.reduce((sum, item) => sum + item.others, 0);

        const total = totalNoStaff + totalStaffBusy + totalNoStock + totalOthers;

        const reasons = [
            { name: 'No Staff Available', count: totalNoStaff },
            { name: 'Staff Busy', count: totalStaffBusy },
            { name: 'No Stock', count: totalNoStock },
            { name: 'Others', count: totalOthers }
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

        const totalGreeting = data.reduce((sum, item) => sum + item.greeting, 0);
        const totalOfferHelp = data.reduce((sum, item) => sum + item.offerHelp, 0);
        const totalInfoProduct = data.reduce((sum, item) => sum + item.infoProduct, 0);
        const totalOfferMore = data.reduce((sum, item) => sum + item.offerMore, 0);
        const totalClosing = data.reduce((sum, item) => sum + item.closing, 0);
        const totalTraffic = data.reduce((sum, item) => sum + item.totalTraffic, 0);

        const tasks = [
            { name: 'Greeting', count: totalGreeting },
            { name: 'Offer Help', count: totalOfferHelp },
            { name: 'Info Product', count: totalInfoProduct },
            { name: 'Offer More', count: totalOfferMore },
            { name: 'Closing', count: totalClosing }
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
                    <td><span class="badge badge-green">${task.count}</span></td>
                    <td>${avgPerTraffic.toFixed(2)}</td>
                    <td><span class="badge ${badgeClass}">${performanceLevel}</span></td>
                </tr>
            `;
        }).join('');

        this.updateElement('taskPerformanceTable', html || '<tr><td colspan="4" class="no-data">No data</td></tr>');
    }

    showAuditDetail(outletCode) {
        document.getElementById('modalOutletCode').textContent = outletCode;
        document.getElementById('modalContent').innerHTML = '<div class="loading">Loading details...</div>';
        document.getElementById('auditDetailModal').style.display = 'block';
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
