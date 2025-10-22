/**
 * Product Incentive Calculator Module
 * Calculates product-based incentives for ethical and non-ethical products
 * 
 * Features:
 * - Process 4 Excel files (Active Alproean, Full Alproean, Sales & GP, Focus Product Report)
 * - Calculate ethical product incentives (3% of personal sales)
 * - Calculate non-ethical product incentives (5% of personal sales)
 * - Apply outlet threshold criteria (25% focus product sales vs total outlet revenue)
 * - Export matched and unmatched results
 */

const ProductIncentiveCalculator = {
    // Data storage
    files: {
        activeAlproean: null,
        fullAlproean: null,
        salesGp: null,
        focusProduct: null
    },
    
    data: {
        activeAlproeanList: [],
        fullAlproeanList: [],
        salesGpData: [],
        focusProductData: [],
        results: [],
        unmatchedResults: []
    },
    
    // Initialize the calculator
    init: function() {
        console.log('Initializing Product Incentive Calculator...');
        this.attachFileHandlers();
        this.updateCalculateButton();
    },
    
    // Attach file input handlers
    attachFileHandlers: function() {
        const fileInputs = {
            activeAlproean: document.getElementById('prodActiveAlproeanFile'),
            fullAlproean: document.getElementById('prodFullAlproeanFile'),
            salesGp: document.getElementById('prodSalesGpFile'),
            focusProduct: document.getElementById('prodFocusProductFile')
        };
        
        Object.keys(fileInputs).forEach(key => {
            const input = fileInputs[key];
            if (input) {
                input.addEventListener('change', (e) => {
                    this.handleFileUpload(e, key);
                });
            }
        });
    },
    
    // Handle file upload
    handleFileUpload: function(event, fileType) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.files[fileType] = file;
        this.showStatus(`Loaded: ${file.name}`, 'info');
        this.updateCalculateButton();
        
        // Parse the file immediately
        this.parseExcelFile(file, fileType);
    },
    
    // Parse Excel file
    parseExcelFile: function(file, fileType) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Process the data based on file type
                this.processFileData(jsonData, fileType);
                this.showStatus(`Parsed: ${file.name} (${jsonData.length} rows)`, 'success');
            } catch (error) {
                console.error('Error parsing file:', error);
                this.showStatus(`Error parsing ${file.name}: ${error.message}`, 'error');
            }
        };
        
        reader.readAsArrayBuffer(file);
    },
    
    // Process file data based on type
    processFileData: function(jsonData, fileType) {
        console.log(`Processing ${fileType}, total rows:`, jsonData.length);
        
        // Different files have different header row positions
        let headerRowIndex = 0;
        let dataStartRow = 1;
        
        if (fileType === 'salesGp') {
            // Sales GP has header at row 6 (index 5), data starts at row 7 (index 6)
            headerRowIndex = 5;
            dataStartRow = 6;
        } else if (fileType === 'focusProduct') {
            // Focus Product has header at row 7 (index 6), data starts at row 8 (index 7)
            headerRowIndex = 6;
            dataStartRow = 7;
        } else {
            // Active and Full Alproean have header at row 1 (index 0)
            headerRowIndex = 0;
            dataStartRow = 1;
        }
        
        // Store raw data for direct column access
        const rows = jsonData.slice(dataStartRow).filter(row => {
            // Filter out empty rows
            return row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '');
        });
        
        console.log(`${fileType} data rows after filtering:`, rows.length);
        
        // Store the processed data
        switch (fileType) {
            case 'activeAlproean':
                this.data.activeAlproeanList = rows;
                console.log('Active Alproean data loaded:', rows.length, 'rows');
                if (rows.length > 0) {
                    console.log('Sample row:', rows[0].slice(0, 5));
                }
                break;
            case 'fullAlproean':
                this.data.fullAlproeanList = rows;
                console.log('Full Alproean data loaded:', rows.length, 'rows');
                break;
            case 'salesGp':
                this.data.salesGpData = rows;
                console.log('Sales GP data loaded:', rows.length, 'rows');
                if (rows.length > 0) {
                    console.log('Sample Sales GP row - Col C (Store):', rows[0][2], 'Col G (Net Sales):', rows[0][6]);
                }
                break;
            case 'focusProduct':
                this.data.focusProductData = rows;
                console.log('Focus Product data loaded:', rows.length, 'rows');
                if (rows.length > 0) {
                    console.log('Sample Focus Product row - Col D (Store):', rows[0][3], 'Col F (Person):', rows[0][5], 'Col H (Model):', rows[0][7], 'Col L (Sales):', rows[0][11]);
                }
                break;
        }
    },
    
    // Update calculate button state
    updateCalculateButton: function() {
        const button = document.getElementById('calculateProductIncentivesBtn');
        if (!button) return;
        
        const allFilesUploaded = Object.values(this.files).every(file => file !== null);
        button.disabled = !allFilesUploaded;
        
        if (allFilesUploaded) {
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            button.classList.add('opacity-50', 'cursor-not-allowed');
        }
    },
    
    // Show status message
    showStatus: function(message, type) {
        const statusDiv = document.getElementById('productIncentiveStatus');
        if (!statusDiv) return;
        
        const colors = {
            info: 'bg-blue-50 border-blue-500 text-blue-800',
            success: 'bg-green-50 border-green-500 text-green-800',
            error: 'bg-red-50 border-red-500 text-red-800',
            warning: 'bg-yellow-50 border-yellow-500 text-yellow-800'
        };
        
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        statusDiv.className = `${colors[type]} border-l-4 rounded-lg p-4 mb-4`;
        statusDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type]} text-xl mr-3"></i>
                <p class="font-medium">${message}</p>
            </div>
        `;
        statusDiv.classList.remove('hidden');
        
        // Auto-hide success and info messages after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    },
    
    // Main calculation function
    calculate: function() {
        try {
            this.showStatus('Calculating product incentives...', 'info');
            
            // Validate all files are uploaded
            if (!this.validateFiles()) {
                this.showStatus('Please upload all required files', 'error');
                return;
            }
            
            // Reset results
            this.data.results = [];
            this.data.unmatchedResults = [];
            
            // Step 1: Extract outlet names from column C (index 2) and net sales from column G (index 6) in Sales GP
            const outletSalesMap = this.extractOutletSales();
            console.log('Outlet Sales Map:', outletSalesMap);
            
            // Step 2: Process Focus Product data
            const focusProductByEmployee = this.processFocusProductData();
            console.log('Focus Product by Employee:', focusProductByEmployee);
            
            // Step 3: Calculate outlet focus product totals
            const outletFocusProductTotals = this.calculateOutletFocusProductTotals(focusProductByEmployee);
            console.log('Outlet Focus Product Totals:', outletFocusProductTotals);
            
            // Step 4: Calculate threshold percentages for each outlet
            const outletThresholdMap = this.calculateOutletThresholds(outletFocusProductTotals, outletSalesMap);
            console.log('Outlet Threshold Map:', outletThresholdMap);
            
            // Step 5: Match employees and calculate incentives
            this.calculateEmployeeIncentives(focusProductByEmployee, outletThresholdMap);
            
            // Display results
            this.displayResults();
            
            this.showStatus('Product incentive calculation completed successfully!', 'success');
            
        } catch (error) {
            console.error('Error calculating product incentives:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    },
    
    // Validate all files are uploaded
    validateFiles: function() {
        return Object.values(this.files).every(file => file !== null);
    },
    
    // Extract outlet sales from Sales GP file (Column C = outlet name, Column G = net sales)
    extractOutletSales: function() {
        const outletSalesMap = {};
        let processedRows = 0;
        
        this.data.salesGpData.forEach(row => {
            // Column C is index 2, Column G is index 6 (0-indexed)
            const outletName = row[2]; // Column C
            const netSales = parseFloat(row[6]) || 0; // Column G
            
            if (outletName && netSales > 0) {
                const cleanOutletName = this.cleanOutletName(String(outletName));
                if (!outletSalesMap[cleanOutletName]) {
                    outletSalesMap[cleanOutletName] = 0;
                }
                outletSalesMap[cleanOutletName] += netSales;
                processedRows++;
            }
        });
        
        console.log(`Outlet Sales Map created from ${processedRows} rows:`, Object.keys(outletSalesMap).length, 'outlets');
        console.log('Sample outlets:', Object.keys(outletSalesMap).slice(0, 5));
        console.log('Sample sales:', Object.entries(outletSalesMap).slice(0, 3).map(([k, v]) => `${k}: ${v.toFixed(2)}`));
        return outletSalesMap;
    },
    
    // Process Focus Product data
    processFocusProductData: function() {
        const focusProductByEmployee = {};
        let processedCount = 0;
        let skippedCount = 0;
        
        this.data.focusProductData.forEach((row, index) => {
            // Column D (index 3) = outlet name (format: "0001 - JKJSTT1")
            // Column F (index 5) = sales person
            // Column H (index 7) = incentive model
            // Column L (index 11) = net sales
            const outletNameRaw = String(row[3] || '').trim();
            const salesPerson = String(row[5] || '').trim();
            const incentiveModel = String(row[7] || '').trim();
            const netSales = parseFloat(row[11]) || 0;
            
            if (!salesPerson || !incentiveModel || netSales <= 0) {
                skippedCount++;
                return;
            }
            
            // Extract last 7 characters for outlet name (e.g., "JKJSTT1" from "0001 - JKJSTT1")
            const outletName = this.extractLast7Chars(outletNameRaw);
            
            // Determine product type
            let productType = '';
            if (incentiveModel.toLowerCase().includes('ethical') && !incentiveModel.toLowerCase().includes('non')) {
                productType = 'ethical';
            } else if (incentiveModel.toLowerCase().includes('non') && incentiveModel.toLowerCase().includes('ethical')) {
                productType = 'non-ethical';
            } else {
                skippedCount++;
                return; // Skip if not recognized
            }
            
            // Create unique key for employee
            const employeeKey = salesPerson.toLowerCase();
            
            if (!focusProductByEmployee[employeeKey]) {
                focusProductByEmployee[employeeKey] = {
                    name: salesPerson,
                    outlet: outletName,
                    ethicalSales: 0,
                    nonEthicalSales: 0
                };
            }
            
            // Aggregate sales
            if (productType === 'ethical') {
                focusProductByEmployee[employeeKey].ethicalSales += netSales;
            } else if (productType === 'non-ethical') {
                focusProductByEmployee[employeeKey].nonEthicalSales += netSales;
            }
            
            processedCount++;
        });
        
        console.log(`Processed ${processedCount} rows, skipped ${skippedCount} rows`);
        console.log('Unique employees:', Object.keys(focusProductByEmployee).length);
        console.log('Sample employee names:', Object.keys(focusProductByEmployee).slice(0, 5));
        console.log('Sample employee data:', Object.values(focusProductByEmployee).slice(0, 3).map(e => ({
            name: e.name,
            outlet: e.outlet,
            ethical: e.ethicalSales.toFixed(2),
            nonEthical: e.nonEthicalSales.toFixed(2)
        })));
        
        return focusProductByEmployee;
    },
    
    // Calculate outlet focus product totals
    calculateOutletFocusProductTotals: function(focusProductByEmployee) {
        const outletTotals = {};
        
        Object.values(focusProductByEmployee).forEach(employee => {
            const outlet = this.cleanOutletName(employee.outlet);
            if (!outletTotals[outlet]) {
                outletTotals[outlet] = 0;
            }
            outletTotals[outlet] += employee.ethicalSales + employee.nonEthicalSales;
        });
        
        return outletTotals;
    },
    
    // Calculate outlet thresholds
    calculateOutletThresholds: function(outletFocusProductTotals, outletSalesMap) {
        const outletThresholdMap = {};
        
        Object.keys(outletFocusProductTotals).forEach(outlet => {
            const focusProductSales = outletFocusProductTotals[outlet];
            const totalSales = outletSalesMap[outlet] || 0;
            
            if (totalSales > 0) {
                const percentage = (focusProductSales / totalSales) * 100;
                outletThresholdMap[outlet] = {
                    percentage: percentage,
                    multiplier: percentage >= 25 ? 1.0 : 0.5
                };
            } else {
                outletThresholdMap[outlet] = {
                    percentage: 0,
                    multiplier: 0.5
                };
            }
        });
        
        return outletThresholdMap;
    },
    
    // Calculate employee incentives
    calculateEmployeeIncentives: function(focusProductByEmployee, outletThresholdMap) {
        // Create employee lookup maps from both Active and Full Alproean lists
        const employeeLookup = this.createEmployeeLookup();
        
        console.log('Employee lookup size:', Object.keys(employeeLookup).length);
        console.log('Focus product employees:', Object.keys(focusProductByEmployee).length);
        
        let matchedCount = 0;
        let unmatchedCount = 0;
        
        Object.values(focusProductByEmployee).forEach((employee, index) => {
            const employeeKey = employee.name.toLowerCase();
            const employeeInfo = employeeLookup[employeeKey];
            
            if (!employeeInfo) {
                // Add to unmatched
                this.data.unmatchedResults.push({
                    name: employee.name,
                    outlet: employee.outlet,
                    ethicalSales: employee.ethicalSales,
                    nonEthicalSales: employee.nonEthicalSales,
                    reason: 'Employee not found in Alproean lists'
                });
                unmatchedCount++;
                
                // Log first few unmatched
                if (unmatchedCount <= 3) {
                    console.log(`Unmatched employee: "${employee.name}"`);
                }
                return;
            }
            
            // Get outlet threshold
            const cleanOutlet = this.cleanOutletName(employee.outlet);
            const thresholdInfo = outletThresholdMap[cleanOutlet] || { percentage: 0, multiplier: 0.5 };
            
            // Calculate base incentives
            const ethicalIncentiveBase = employee.ethicalSales * 0.03; // 3%
            const nonEthicalIncentiveBase = employee.nonEthicalSales * 0.05; // 5%
            
            // Apply multiplier based on threshold
            const ethicalIncentive = ethicalIncentiveBase * thresholdInfo.multiplier;
            const nonEthicalIncentive = nonEthicalIncentiveBase * thresholdInfo.multiplier;
            const totalIncentive = ethicalIncentive + nonEthicalIncentive;
            
            // Log first few matches
            if (matchedCount < 3) {
                console.log(`Matched: ${employee.name} -> Ethical: ${ethicalIncentive.toFixed(2)}, Non-Ethical: ${nonEthicalIncentive.toFixed(2)}, Total: ${totalIncentive.toFixed(2)}`);
            }
            
            // Add to results
            this.data.results.push({
                name: employeeInfo.name,
                employeeId: employeeInfo.employeeId,
                outlet: employee.outlet,
                ethicalSales: employee.ethicalSales,
                nonEthicalSales: employee.nonEthicalSales,
                ethicalIncentive: ethicalIncentive,
                nonEthicalIncentive: nonEthicalIncentive,
                totalIncentive: totalIncentive,
                thresholdPercentage: thresholdInfo.percentage,
                multiplier: thresholdInfo.multiplier
            });
            matchedCount++;
        });
        
        console.log(`Employee matching complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);
        console.log(`Total results: ${this.data.results.length}`);
    },
    
    // Create employee lookup from Active and Full Alproean lists
    createEmployeeLookup: function() {
        const lookup = {};
        
        // Process Active Alproean list (Column 0 = name, Column 1 = employee ID)
        this.data.activeAlproeanList.forEach(row => {
            const name = String(row[0] || '').trim(); // First column
            const employeeId = String(row[1] || '').trim(); // Second column
            
            if (name && employeeId) {
                const key = name.toLowerCase();
                lookup[key] = { name: name, employeeId: employeeId };
            }
        });
        
        // Process Full Alproean list (may have different structure, also try columns 0 and 1)
        this.data.fullAlproeanList.forEach(row => {
            const name = String(row[0] || '').trim();
            const employeeId = String(row[1] || '').trim();
            
            if (name && employeeId) {
                const key = name.toLowerCase();
                if (!lookup[key]) {
                    lookup[key] = { name: name, employeeId: employeeId };
                }
            }
        });
        
        console.log('Employee lookup created with', Object.keys(lookup).length, 'employees');
        console.log('Sample employees:', Object.keys(lookup).slice(0, 5));
        
        return lookup;
    },
    
    // Clean outlet name
    cleanOutletName: function(outletName) {
        return String(outletName).trim().toLowerCase();
    },
    
    // Extract last 7 characters from outlet name
    extractLast7Chars: function(outletName) {
        const str = String(outletName).trim();
        return str.length >= 7 ? str.slice(-7) : str;
    },
    
    // Display results
    displayResults: function() {
        // Show results section
        const resultsDiv = document.getElementById('productIncentiveResults');
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
        }
        
        // Calculate totals
        let totalEthicalIncentives = 0;
        let totalNonEthicalIncentives = 0;
        let totalProductIncentives = 0;
        
        this.data.results.forEach(result => {
            totalEthicalIncentives += result.ethicalIncentive;
            totalNonEthicalIncentives += result.nonEthicalIncentive;
            totalProductIncentives += result.totalIncentive;
        });
        
        // Update summary cards
        document.getElementById('totalEthicalIncentives').textContent = this.formatCurrency(totalEthicalIncentives);
        document.getElementById('totalNonEthicalIncentives').textContent = this.formatCurrency(totalNonEthicalIncentives);
        document.getElementById('totalProductIncentives').textContent = this.formatCurrency(totalProductIncentives);
        
        // Populate results table
        this.populateResultsTable();
        
        // Enable export buttons
        document.getElementById('exportProductMatchedBtn').disabled = false;
        document.getElementById('exportProductUnmatchedBtn').disabled = this.data.unmatchedResults.length === 0;
    },
    
    // Populate results table
    populateResultsTable: function() {
        const tbody = document.getElementById('productIncentiveResultsBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.data.results.forEach(result => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${result.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${result.employeeId}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${result.outlet}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${this.formatCurrency(result.ethicalSales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${this.formatCurrency(result.nonEthicalSales)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold text-right">${this.formatCurrency(result.ethicalIncentive)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold text-right">${this.formatCurrency(result.nonEthicalIncentive)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold text-right">${this.formatCurrency(result.totalIncentive)}</td>
            `;
            tbody.appendChild(row);
        });
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
    },
    
    // Export matched results
    exportMatched: function() {
        try {
            if (this.data.results.length === 0) {
                this.showStatus('No matched results to export', 'warning');
                return;
            }
            
            // Prepare data for export
            const exportData = this.data.results.map(result => ({
                'Employee Name': result.name,
                'Employee ID': result.employeeId,
                'Outlet': result.outlet,
                'Ethical Personal Sales': result.ethicalSales,
                'Non-Ethical Personal Sales': result.nonEthicalSales,
                'Product Incentive Ethical': result.ethicalIncentive,
                'Product Incentive Non-Ethical': result.nonEthicalIncentive,
                'Total Product Incentives': result.totalIncentive,
                'Threshold %': result.thresholdPercentage.toFixed(2),
                'Multiplier': result.multiplier
            }));
            
            // Create workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Matched Results');
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `Product_Incentive_Matched_${timestamp}.xlsx`;
            
            // Export
            XLSX.writeFile(wb, filename);
            
            this.showStatus('Matched results exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting matched results:', error);
            this.showStatus(`Error exporting: ${error.message}`, 'error');
        }
    },
    
    // Export unmatched results
    exportUnmatched: function() {
        try {
            if (this.data.unmatchedResults.length === 0) {
                this.showStatus('No unmatched results to export', 'warning');
                return;
            }
            
            // Prepare data for export
            const exportData = this.data.unmatchedResults.map(result => ({
                'Employee Name': result.name,
                'Outlet': result.outlet,
                'Ethical Sales': result.ethicalSales,
                'Non-Ethical Sales': result.nonEthicalSales,
                'Reason': result.reason
            }));
            
            // Create workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Unmatched Results');
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `Product_Incentive_Unmatched_${timestamp}.xlsx`;
            
            // Export
            XLSX.writeFile(wb, filename);
            
            this.showStatus('Unmatched results exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting unmatched results:', error);
            this.showStatus(`Error exporting: ${error.message}`, 'error');
        }
    },
    
    // Reset calculator
    reset: function() {
        // Reset files
        this.files = {
            activeAlproean: null,
            fullAlproean: null,
            salesGp: null,
            focusProduct: null
        };
        
        // Reset data
        this.data = {
            activeAlproeanList: [],
            fullAlproeanList: [],
            salesGpData: [],
            focusProductData: [],
            results: [],
            unmatchedResults: []
        };
        
        // Clear file inputs
        const fileInputs = [
            'prodActiveAlproeanFile',
            'prodFullAlproeanFile',
            'prodSalesGpFile',
            'prodFocusProductFile'
        ];
        
        fileInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        
        // Hide results
        const resultsDiv = document.getElementById('productIncentiveResults');
        if (resultsDiv) resultsDiv.classList.add('hidden');
        
        const statusDiv = document.getElementById('productIncentiveStatus');
        if (statusDiv) statusDiv.classList.add('hidden');
        
        // Update button state
        this.updateCalculateButton();
        
        console.log('Product Incentive Calculator reset');
    }
};

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        ProductIncentiveCalculator.init();
    });
}
