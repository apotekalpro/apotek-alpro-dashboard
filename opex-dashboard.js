/**
 * OpEX Dashboard - Google Sheets Data Integration
 * Handles data fetching, processing, and rendering for OpEX Dashboard
 */

class OpexDashboard {
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
        this.filteredData = {
            audit: [],
            sttk: [],
            cctv: []
        };
    }

    /**
     * Initialize the dashboard by loading all data
     */
    async init() {
        try {
            await this.loadAllData();
            this.renderAll();
            return true;
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard. Loading sample data...');
            this.loadSampleData();
            this.renderAll();
            return false;
        }
    }

    /**
     * Load all sheet data in parallel
     */
    async loadAllData() {
        const promises = [
            this.loadSheetData('Audit', 'A:N'),
            this.loadSheetData('FieldAudit_Detail', 'A:AU'),
            this.loadSheetData('INDEX', 'A:B'),
            this.loadSheetData('STTK_SHRINKAGE', 'A:G'),
            this.loadSheetData('Shrinkage_Top30', 'A:G'),
            this.loadSheetData('CCTV_14H', 'A:Q')
        ];

        const results = await Promise.all(promises);
        
        this.processAuditData(results[0]);
        this.processAuditDetailData(results[1]);
        this.processIndexData(results[2]);
        this.processSttkData(results[3]);
        this.processShrinkageData(results[4]);
        this.processCctvData(results[5]);

        // Initialize filtered data
        this.filteredData.audit = [...this.data.audit];
        this.filteredData.sttk = [...this.data.sttk];
        this.filteredData.cctv = [...this.data.cctv];
    }

    /**
     * Generic function to load data from Google Sheets
     */
    async loadSheetData(sheetName, range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${sheetName}!${range}?key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            console.error(`Error loading ${sheetName}:`, error);
            throw error;
        }
    }

    /**
     * Process Audit sheet data
     */
    processAuditData(rawData) {
        if (!rawData || rawData.length === 0) return;

        const headers = rawData[0];
        const rows = rawData.slice(1);

        const processedData = rows
            .filter(row => row[12] && row[12] !== '0.00%') // Column M is not 0.00%
            .map(row => ({
                outletCode: row[10] || '', // K
                amName: row[3] || '', // D
                visitDate: row[11] || '', // L
                month: row[6] || '', // G
                scoring: row[12] || '0%', // M
                finalScore: row[13] || '' // N
            }));

        // Keep only latest record per outlet
        this.data.audit = this.getLatestRecordPerOutlet(processedData);
    }

    /**
     * Process Audit Detail data
     */
    processAuditDetailData(rawData) {
        if (!rawData || rawData.length === 0) return;

        const headers = rawData[0];
        this.data.auditDetail = {
            headers: headers,
            rows: rawData.slice(1)
        };
    }

    /**
     * Process Index data (code to name mapping)
     */
    processIndexData(rawData) {
        if (!rawData || rawData.length === 0) return;

        this.data.index = rawData.slice(1).map(row => ({
            code: row[0] || '',
            name: row[1] || ''
        }));
    }

    /**
     * Process STTK Shrinkage data
     */
    processSttkData(rawData) {
        if (!rawData || rawData.length === 0) return;

        this.data.sttk = rawData.slice(1)
            .map(row => ({
                month: row[0] || '', // A
                outletName: row[1] || '', // B
                areaManager: row[6] || '', // G
                stockLoss: this.parseNumber(row[6]) // Assuming column G has stock loss
            }))
            .filter(item => item.stockLoss < 0); // Only losses (negative values)
    }

    /**
     * Process Shrinkage Top 30 data
     */
    processShrinkageData(rawData) {
        if (!rawData || rawData.length === 0) return;

        this.data.shrinkage = rawData.slice(1)
            .slice(0, 30) // Top 30 only
            .map(row => ({
                itemCode: row[4] || '', // E
                itemName: row[5] || '', // F
                value: this.parseNumber(row[6]) // G
            }));
    }

    /**
     * Process CCTV 14H data
     */
    processCctvData(rawData) {
        if (!rawData || rawData.length === 0) return;

        this.data.cctv = rawData.slice(1)
            .filter(row => this.parseNumber(row[4]) > 0) // E (traffic) > 0
            .map(row => ({
                month: row[16] || '', // Q
                checkDate: row[0] || '', // A
                videoDate: row[1] || '', // B
                outlet: row[2] || '', // C
                am: row[3] || '', // D
                totalTraffic: this.parseNumber(row[4]), // E
                lossSales: this.parseNumber(row[6]), // G
                greeting: this.parseNumber(row[7]), // H
                offerHelp: this.parseNumber(row[8]), // I
                infoProduct: this.parseNumber(row[9]), // J
                offerMore: this.parseNumber(row[10]), // K
                closing: this.parseNumber(row[11]), // L
                noStaff: this.parseNumber(row[12]), // M
                staffBusy: this.parseNumber(row[13]), // N
                noStock: this.parseNumber(row[14]), // O
                others: this.parseNumber(row[15]) // P
            }));
    }

    /**
     * Get latest record per outlet based on month
     */
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

    /**
     * Parse month string to Date object
     */
    parseMonth(monthStr) {
        if (!monthStr) return new Date(0);

        const monthMap = {
            'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
            'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
            'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
            'january': 0, 'february': 1, 'march': 2, 'april': 3,
            'may': 4, 'june': 5, 'july': 6, 'august': 7,
            'september': 8, 'october': 9, 'november': 10, 'december': 11
        };

        const parts = monthStr.toLowerCase().split(' ');
        const month = monthMap[parts[0]] || 0;
        const year = parseInt(parts[1]) || new Date().getFullYear();

        return new Date(year, month);
    }

    /**
     * Parse number from string
     */
    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        
        const cleaned = value.toString().replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Parse percentage to number
     */
    parsePercentage(value) {
        if (!value) return 0;
        return this.parseNumber(value.toString().replace('%', ''));
    }

    /**
     * Apply filters to audit data
     */
    applyAuditFilters(amFilter, outletFilter) {
        this.filteredData.audit = this.data.audit.filter(item => {
            const matchAM = !amFilter || item.amName.toLowerCase().includes(amFilter.toLowerCase());
            const matchOutlet = !outletFilter || item.outletCode.toLowerCase().includes(outletFilter.toLowerCase());
            return matchAM && matchOutlet;
        });
        this.renderAuditSection();
    }

    /**
     * Apply filters to STTK data
     */
    applySttkFilters(amFilter, outletFilter, monthFilter) {
        this.filteredData.sttk = this.data.sttk.filter(item => {
            const matchAM = !amFilter || item.areaManager.toLowerCase().includes(amFilter.toLowerCase());
            const matchOutlet = !outletFilter || item.outletName.toLowerCase().includes(outletFilter.toLowerCase());
            const matchMonth = !monthFilter || item.month === monthFilter;
            return matchAM && matchOutlet && matchMonth;
        });
        this.renderSttkSection();
    }

    /**
     * Apply filters to CCTV data
     */
    applyCctvFilters(amFilter, outletFilter, monthFilter) {
        this.filteredData.cctv = this.data.cctv.filter(item => {
            const matchAM = !amFilter || item.am.toLowerCase().includes(amFilter.toLowerCase());
            const matchOutlet = !outletFilter || item.outlet.toLowerCase().includes(outletFilter.toLowerCase());
            const matchMonth = !monthFilter || item.month === monthFilter;
            return matchAM && matchOutlet && matchMonth;
        });
        this.renderCctvSection();
    }

    /**
     * Render all sections
     */
    renderAll() {
        this.renderAuditSection();
        this.renderSttkSection();
        this.renderShrinkageSection();
        this.renderCctvSection();
    }

    /**
     * Render Audit Section
     */
    renderAuditSection() {
        const data = this.filteredData.audit;

        // Summary cards
        this.updateElement('totalAudits', data.length);
        const avgScore = data.reduce((sum, item) => sum + this.parsePercentage(item.scoring), 0) / data.length || 0;
        this.updateElement('avgScore', avgScore.toFixed(1) + '%');
        this.updateElement('outletsAudited', new Set(data.map(a => a.outletCode)).size);

        // Sort by scoring
        const sorted = [...data].sort((a, b) => 
            this.parsePercentage(b.scoring) - this.parsePercentage(a.scoring)
        );

        // Top 5 Leaderboard
        const top5Html = sorted.slice(0, 5).map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td><span class="badge badge-green">${this.escapeHtml(item.scoring)}</span></td>
            </tr>
        `).join('');
        this.updateElement('top5Leaderboard', top5Html || '<tr><td colspan="4" class="no-data">No data available</td></tr>');

        // Bottom 5 Leaderboard
        const bottom5Html = sorted.slice(-5).reverse().map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td><span class="badge badge-red">${this.escapeHtml(item.scoring)}</span></td>
            </tr>
        `).join('');
        this.updateElement('bottom5Leaderboard', bottom5Html || '<tr><td colspan="4" class="no-data">No data available</td></tr>');

        // All audit data table
        const tableHtml = sorted.map(item => `
            <tr class="clickable-row" onclick="opexDashboard.showAuditDetail('${this.escapeHtml(item.outletCode)}', '${this.escapeHtml(item.month)}', '${this.escapeHtml(item.visitDate)}')">
                <td>${this.escapeHtml(item.outletCode)}</td>
                <td>${this.escapeHtml(item.amName)}</td>
                <td>${this.escapeHtml(item.visitDate)}</td>
                <td>${this.escapeHtml(item.scoring)}</td>
                <td>${this.escapeHtml(item.finalScore)}</td>
                <td>
                    <button class="btn-primary text-xs px-3 py-1" onclick="event.stopPropagation(); opexDashboard.showAuditDetail('${this.escapeHtml(item.outletCode)}', '${this.escapeHtml(item.month)}', '${this.escapeHtml(item.visitDate)}')">
                        <i class="fas fa-eye mr-1"></i>View Details
                    </button>
                </td>
            </tr>
        `).join('');
        this.updateElement('auditDataTable', tableHtml || '<tr><td colspan="6" class="no-data">No data available</td></tr>');

        // Render audit detail summary
        this.renderAuditDetailSummary();
    }

    /**
     * Render Audit Detail Summary
     */
    renderAuditDetailSummary() {
        // This would analyze the FieldAudit_Detail sheet
        // For now, showing placeholder
        this.updateElement('top10Issues', '<tr><td colspan="4" class="no-data">Detail analysis coming soon...</td></tr>');
        this.updateElement('fullDetailTable', '<tr><td colspan="5" class="no-data">Detail analysis coming soon...</td></tr>');
    }

    /**
     * Render STTK Section
     */
    renderSttkSection() {
        const data = this.filteredData.sttk;

        // Sort by stock loss (most negative first)
        const sorted = [...data].sort((a, b) => a.stockLoss - b.stockLoss);

        // Top 5 worst
        const worst5Html = sorted.slice(0, 5).map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.outletName)}</td>
                <td>${this.escapeHtml(item.areaManager)}</td>
                <td><span class="badge badge-red">${item.stockLoss.toFixed(2)}</span></td>
            </tr>
        `).join('');
        this.updateElement('worstStockLoss', worst5Html || '<tr><td colspan="5" class="no-data">No data available</td></tr>');

        // All STTK data
        const tableHtml = sorted.map(item => `
            <tr>
                <td>${this.escapeHtml(item.month)}</td>
                <td>${this.escapeHtml(item.outletName)}</td>
                <td>${this.escapeHtml(item.areaManager)}</td>
                <td><span class="badge ${item.stockLoss < 0 ? 'badge-red' : 'badge-green'}">${item.stockLoss.toFixed(2)}</span></td>
            </tr>
        `).join('');
        this.updateElement('sttkDataTable', tableHtml || '<tr><td colspan="4" class="no-data">No data available</td></tr>');

        // Populate month filter
        const months = [...new Set(this.data.sttk.map(item => item.month))].sort();
        const monthOptions = '<option value="">All Months</option>' +
            months.map(m => `<option value="${this.escapeHtml(m)}">${this.escapeHtml(m)}</option>`).join('');
        this.updateElement('sttkFilterMonth', monthOptions);
    }

    /**
     * Render Shrinkage Section
     */
    renderShrinkageSection() {
        const tableHtml = this.data.shrinkage.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${this.escapeHtml(item.itemCode)}</td>
                <td>${this.escapeHtml(item.itemName)}</td>
                <td><span class="badge badge-red">${item.value.toFixed(2)}</span></td>
            </tr>
        `).join('');
        this.updateElement('shrinkageItemsTable', tableHtml || '<tr><td colspan="4" class="no-data">No data available</td></tr>');
    }

    /**
     * Render CCTV Section
     */
    renderCctvSection() {
        const data = this.filteredData.cctv;

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
        this.updateElement('top10LossSales', top10Html || '<tr><td colspan="5" class="no-data">No data available</td></tr>');

        // All CCTV data - sorted by latest month
        const sortedByMonth = [...data].sort((a, b) => 
            this.parseMonth(b.month) - this.parseMonth(a.month)
        );

        const cctvTableHtml = sortedByMonth.map(item => `
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
        this.updateElement('cctvDataTable', cctvTableHtml || '<tr><td colspan="16" class="no-data">No data available</td></tr>');

        // Populate month filters
        const months = [...new Set(this.data.cctv.map(item => item.month))].sort();
        const monthOptions = '<option value="">All Months</option>' +
            months.map(m => `<option value="${this.escapeHtml(m)}">${this.escapeHtml(m)}</option>`).join('');
        this.updateElement('cctvFilterMonth', monthOptions);
        this.updateElement('lossSalesMonthFilter', monthOptions);

        // Render summaries
        this.updateLossSalesSummary();
        this.updateTaskPerformanceSummary();
    }

    /**
     * Update Loss Sales Summary
     */
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
        
        this.updateElement('lossSalesReasonTable', html || '<tr><td colspan="3" class="no-data">No data available</td></tr>');
    }

    /**
     * Update Task Performance Summary
     */
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

        this.updateElement('taskPerformanceTable', html || '<tr><td colspan="4" class="no-data">No data available</td></tr>');
    }

    /**
     * Show audit detail modal
     */
    showAuditDetail(outletCode, month, visitDate) {
        document.getElementById('modalOutletCode').textContent = outletCode;

        // TODO: Implement full detail extraction from FieldAudit_Detail sheet
        const detailHtml = `
            <div class="p-4">
                <h3 class="font-bold mb-2">Outlet: ${this.escapeHtml(outletCode)}</h3>
                <p>Month: ${this.escapeHtml(month)}</p>
                <p>Visit Date: ${this.escapeHtml(visitDate)}</p>
                <div class="mt-4">
                    <h4 class="font-semibold mb-2">Detailed Audit Results</h4>
                    <p class="text-gray-600">Detailed analysis implementation in progress...</p>
                </div>
            </div>
        `;

        document.getElementById('modalContent').innerHTML = detailHtml;
        document.getElementById('auditDetailModal').style.display = 'block';
    }

    /**
     * Helper function to update element content
     */
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

    /**
     * Escape HTML to prevent XSS
     */
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

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Could implement toast notification here
    }

    /**
     * Load sample data for testing
     */
    loadSampleData() {
        this.data.audit = [
            { outletCode: 'OUT001', amName: 'John Doe', visitDate: '2026-03-15', month: 'Maret 2026', scoring: '95.5%', finalScore: 'A' },
            { outletCode: 'OUT002', amName: 'Jane Smith', visitDate: '2026-03-14', month: 'Maret 2026', scoring: '88.2%', finalScore: 'B' },
            { outletCode: 'OUT003', amName: 'Bob Wilson', visitDate: '2026-03-13', month: 'Maret 2026', scoring: '72.1%', finalScore: 'C' },
            { outletCode: 'OUT004', amName: 'Alice Brown', visitDate: '2026-03-12', month: 'Maret 2026', scoring: '65.8%', finalScore: 'D' },
            { outletCode: 'OUT005', amName: 'Charlie Davis', visitDate: '2026-03-11', month: 'Maret 2026', scoring: '58.3%', finalScore: 'E' }
        ];

        this.data.sttk = [
            { month: 'March 2026', outletName: 'Outlet A', areaManager: 'Manager 1', stockLoss: -15000 },
            { month: 'March 2026', outletName: 'Outlet B', areaManager: 'Manager 2', stockLoss: -12000 },
            { month: 'March 2026', outletName: 'Outlet C', areaManager: 'Manager 3', stockLoss: -8500 },
            { month: 'March 2026', outletName: 'Outlet D', areaManager: 'Manager 4', stockLoss: -6200 },
            { month: 'March 2026', outletName: 'Outlet E', areaManager: 'Manager 5', stockLoss: -4800 }
        ];

        this.data.shrinkage = [
            { itemCode: 'ITEM001', itemName: 'Paracetamol 500mg', value: 5000 },
            { itemCode: 'ITEM002', itemName: 'Amoxicillin 500mg', value: 4500 },
            { itemCode: 'ITEM003', itemName: 'Vitamin C 1000mg', value: 4000 }
        ];

        this.data.cctv = [
            {
                month: 'March 2026', checkDate: '2026-03-15', videoDate: '2026-03-14',
                outlet: 'Outlet A', am: 'Manager 1', totalTraffic: 150, lossSales: 30,
                greeting: 120, offerHelp: 110, infoProduct: 100, offerMore: 90, closing: 85,
                noStaff: 10, staffBusy: 8, noStock: 7, others: 5
            },
            {
                month: 'March 2026', checkDate: '2026-03-14', videoDate: '2026-03-13',
                outlet: 'Outlet B', am: 'Manager 2', totalTraffic: 200, lossSales: 45,
                greeting: 160, offerHelp: 150, infoProduct: 140, offerMore: 130, closing: 120,
                noStaff: 15, staffBusy: 12, noStock: 10, others: 8
            }
        ];

        this.filteredData.audit = [...this.data.audit];
        this.filteredData.sttk = [...this.data.sttk];
        this.filteredData.cctv = [...this.data.cctv];
    }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpexDashboard;
}
