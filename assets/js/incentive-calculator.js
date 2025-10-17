/**
 * Incentive Calculator Module
 * Calculates AM, BM, and Alproean incentives based on sales performance and GP margins
 * 
 * Features:
 * - Process 5 Excel files (Active Alproean, Full Alproean, Sales & GP, Personal Sales, Outlet Mapping)
 * - Calculate AM rewards (region-level + individual outlet rewards)
 * - Calculate BM rewards (50% bonus on personal Alproean incentives)
 * - Calculate Personal Alproean rewards (proportional distribution)
 * - Apply GP margin adjustments
 * - Export matched and unmatched results
 */

const IncentiveCalculator = {
    // Data storage
    files: {
        activeAlproean: null,
        fullAlproean: null,
        salesGp: null,
        personalSales: null,
        outletMapping: null
    },
    
    data: {
        activeAlproeanList: [],
        fullAlproeanList: [],
        salesGpData: [],
        personalSalesData: [],
        outletMappingData: [],
        results: [],
        unmatchedResults: []
    },
    
    // Initialize the calculator
    init: function() {
        console.log('Initializing Incentive Calculator...');
        this.attachFileHandlers();
        this.updateCalculateButton();
    },
    
    // Attach file input handlers
    attachFileHandlers: function() {
        const fileInputs = {
            activeAlproean: document.getElementById('activeAlproeanFile'),
            fullAlproean: document.getElementById('fullAlproeanFile'),
            salesGp: document.getElementById('salesGpFile'),
            personalSales: document.getElementById('personalSalesFile'),
            outletMapping: document.getElementById('outletMappingFile')
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
        // Skip header row
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        
        switch (fileType) {
            case 'activeAlproean':
                this.data.activeAlproeanList = this.parseActiveAlproean(headers, rows);
                break;
            case 'fullAlproean':
                this.data.fullAlproeanList = this.parseFullAlproean(headers, rows);
                break;
            case 'salesGp':
                this.data.salesGpData = this.parseSalesGp(headers, rows);
                break;
            case 'personalSales':
                this.data.personalSalesData = this.parsePersonalSales(headers, rows);
                break;
            case 'outletMapping':
                this.data.outletMappingData = this.parseOutletMapping(headers, rows);
                break;
        }
    },
    
    // Parse Active Alproean List
    parseActiveAlproean: function(headers, rows) {
        const data = [];
        rows.forEach(row => {
            if (row.length > 0 && row[0]) {
                data.push({
                    employeeName: row[0] || '',
                    employeeId: row[1] || '',
                    region: row[2] || '',
                    role: row[3] || '',
                    status: row[4] || 'active'
                });
            }
        });
        return data;
    },
    
    // Parse Full Alproean List
    parseFullAlproean: function(headers, rows) {
        const data = [];
        rows.forEach(row => {
            if (row.length > 0 && row[0]) {
                data.push({
                    employeeName: row[0] || '',
                    employeeId: row[1] || '',
                    outlet: row[2] || '',
                    region: row[3] || '',
                    role: row[4] || ''
                });
            }
        });
        return data;
    },
    
    // Parse Sales & GP Data
    parseSalesGp: function(headers, rows) {
        const data = [];
        rows.forEach(row => {
            if (row.length > 0 && row[0]) {
                data.push({
                    outlet: row[0] || '',
                    totalSales: parseFloat(row[1]) || 0,
                    gpMargin: parseFloat(row[2]) || 0,
                    achievement: parseFloat(row[3]) || 0,
                    region: row[4] || ''
                });
            }
        });
        return data;
    },
    
    // Parse Personal Sales
    parsePersonalSales: function(headers, rows) {
        const data = [];
        rows.forEach(row => {
            if (row.length > 0 && row[0]) {
                data.push({
                    employeeName: row[0] || '',
                    personalSales: parseFloat(row[1]) || 0,
                    outlet: row[2] || '',
                    achievement: parseFloat(row[3]) || 0
                });
            }
        });
        return data;
    },
    
    // Parse Outlet Mapping
    parseOutletMapping: function(headers, rows) {
        const data = [];
        rows.forEach(row => {
            if (row.length > 0 && row[0]) {
                data.push({
                    outlet: row[0] || '',
                    region: row[1] || '',
                    areaManager: row[2] || '',
                    branchManager: row[3] || ''
                });
            }
        });
        return data;
    },
    
    // Update Calculate button state
    updateCalculateButton: function() {
        const btn = document.getElementById('calculateIncentivesBtn');
        if (!btn) return;
        
        const allFilesLoaded = Object.values(this.files).every(file => file !== null);
        btn.disabled = !allFilesLoaded;
        
        if (allFilesLoaded) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    },
    
    // Calculate all incentives
    calculate: function() {
        try {
            this.showStatus('Calculating incentives...', 'info');
            
            // Clear previous results
            this.data.results = [];
            this.data.unmatchedResults = [];
            
            // Step 1: Match employees from Active Alproean with Full Alproean
            const matchedEmployees = this.matchEmployees();
            
            // Step 2: Calculate AM rewards
            this.calculateAMRewards(matchedEmployees);
            
            // Step 3: Calculate BM rewards
            this.calculateBMRewards(matchedEmployees);
            
            // Step 4: Calculate Alproean rewards
            this.calculateAlproeanRewards(matchedEmployees);
            
            // Step 5: Display results
            this.displayResults();
            
            this.showStatus('Calculation completed successfully!', 'success');
        } catch (error) {
            console.error('Calculation error:', error);
            this.showStatus(`Calculation error: ${error.message}`, 'error');
        }
    },
    
    // Match employees
    matchEmployees: function() {
        const matched = [];
        const unmatched = [];
        
        this.data.activeAlproeanList.forEach(activeEmployee => {
            const fullMatch = this.data.fullAlproeanList.find(full => 
                full.employeeName.toLowerCase().trim() === activeEmployee.employeeName.toLowerCase().trim() ||
                full.employeeId === activeEmployee.employeeId
            );
            
            if (fullMatch) {
                const outletMapping = this.data.outletMappingData.find(mapping => 
                    mapping.outlet.toLowerCase().trim() === fullMatch.outlet.toLowerCase().trim()
                );
                
                const salesData = this.data.salesGpData.find(sales => 
                    sales.outlet.toLowerCase().trim() === fullMatch.outlet.toLowerCase().trim()
                );
                
                const personalSales = this.data.personalSalesData.find(ps => 
                    ps.employeeName.toLowerCase().trim() === activeEmployee.employeeName.toLowerCase().trim()
                );
                
                matched.push({
                    employee: activeEmployee,
                    fullData: fullMatch,
                    outletMapping: outletMapping,
                    salesData: salesData,
                    personalSales: personalSales,
                    amReward: 0,
                    bmReward: 0,
                    alproeanReward: 0,
                    totalReward: 0
                });
            } else {
                unmatched.push(activeEmployee);
            }
        });
        
        this.data.unmatchedResults = unmatched;
        return matched;
    },
    
    // Calculate AM Rewards
    calculateAMRewards: function(matchedEmployees) {
        // Group by region and AM
        const amGroups = {};
        
        matchedEmployees.forEach(emp => {
            if (emp.fullData.role === 'AM' || emp.fullData.role === 'Area Manager') {
                const key = `${emp.fullData.region}_${emp.employee.employeeName}`;
                
                if (!amGroups[key]) {
                    amGroups[key] = {
                        amName: emp.employee.employeeName,
                        region: emp.fullData.region,
                        outlets: [],
                        totalAchievement: 0,
                        totalSales: 0
                    };
                }
                
                amGroups[key].outlets.push(emp);
                if (emp.salesData) {
                    amGroups[key].totalSales += emp.salesData.totalSales;
                    amGroups[key].totalAchievement += emp.salesData.achievement;
                }
            }
        });
        
        // Calculate rewards for each AM
        Object.values(amGroups).forEach(amGroup => {
            const avgAchievement = amGroup.outlets.length > 0 
                ? amGroup.totalAchievement / amGroup.outlets.length 
                : 0;
            
            // Determine AM reward percentage based on achievement
            let amPercentage = 0;
            if (avgAchievement >= 100) {
                amPercentage = 0.15; // 0.15%
            } else if (avgAchievement >= 90) {
                amPercentage = 0.075; // 0.075%
            }
            
            // Calculate region-level reward
            const regionReward = amGroup.totalSales * (amPercentage / 100);
            
            // Calculate individual outlet rewards
            amGroup.outlets.forEach(emp => {
                if (emp.salesData) {
                    const gpAdjustment = this.getGPAdjustment(emp.salesData.gpMargin);
                    const outletReward = emp.salesData.totalSales * (amPercentage / 100) * gpAdjustment;
                    emp.amReward = (regionReward / amGroup.outlets.length) + outletReward;
                }
            });
        });
    },
    
    // Calculate BM Rewards
    calculateBMRewards: function(matchedEmployees) {
        matchedEmployees.forEach(emp => {
            if (emp.fullData.role === 'BM' || emp.fullData.role === 'Branch Manager') {
                if (emp.personalSales) {
                    // Calculate personal Alproean incentive first
                    const personalAchievement = emp.personalSales.achievement || 0;
                    let alproeanPercentage = 0;
                    
                    if (personalAchievement >= 100) {
                        alproeanPercentage = 2.7;
                    } else if (personalAchievement >= 90) {
                        alproeanPercentage = 1.35;
                    }
                    
                    if (emp.salesData) {
                        const gpAdjustment = this.getGPAdjustment(emp.salesData.gpMargin);
                        const personalAlproeanReward = emp.personalSales.personalSales * (alproeanPercentage / 100) * gpAdjustment;
                        
                        // BM gets 50% bonus on personal Alproean incentive
                        emp.bmReward = personalAlproeanReward * 0.5;
                    }
                }
            }
        });
    },
    
    // Calculate Alproean Rewards
    calculateAlproeanRewards: function(matchedEmployees) {
        // Group by outlet
        const outletGroups = {};
        
        matchedEmployees.forEach(emp => {
            const outletKey = emp.fullData.outlet;
            
            if (!outletGroups[outletKey]) {
                outletGroups[outletKey] = {
                    outlet: outletKey,
                    employees: [],
                    totalPersonalSales: 0,
                    salesData: emp.salesData
                };
            }
            
            outletGroups[outletKey].employees.push(emp);
            if (emp.personalSales) {
                outletGroups[outletKey].totalPersonalSales += emp.personalSales.personalSales;
            }
        });
        
        // Calculate proportional rewards for each outlet
        Object.values(outletGroups).forEach(outlet => {
            outlet.employees.forEach(emp => {
                if (emp.personalSales && outlet.totalPersonalSales > 0) {
                    const personalAchievement = emp.personalSales.achievement || 0;
                    let alproeanPercentage = 0;
                    
                    if (personalAchievement >= 100) {
                        alproeanPercentage = 2.7;
                    } else if (personalAchievement >= 90) {
                        alproeanPercentage = 1.35;
                    }
                    
                    if (outlet.salesData && alproeanPercentage > 0) {
                        const gpAdjustment = this.getGPAdjustment(outlet.salesData.gpMargin);
                        
                        // Calculate total outlet incentive pool
                        const outletIncentivePool = outlet.salesData.totalSales * (alproeanPercentage / 100) * gpAdjustment;
                        
                        // Calculate employee's share based on their contribution
                        const employeeShare = emp.personalSales.personalSales / outlet.totalPersonalSales;
                        emp.alproeanReward = outletIncentivePool * employeeShare;
                    }
                }
            });
        });
        
        // Calculate total rewards
        matchedEmployees.forEach(emp => {
            emp.totalReward = emp.amReward + emp.bmReward + emp.alproeanReward;
        });
        
        this.data.results = matchedEmployees;
    },
    
    // Get GP margin adjustment factor
    getGPAdjustment: function(gpMargin) {
        if (gpMargin >= 25) {
            return 1.0; // 100%
        } else if (gpMargin >= 22) {
            return 0.7; // 70%
        } else if (gpMargin >= 20) {
            return 0.5; // 50%
        } else {
            return 0.0; // 0%
        }
    },
    
    // Display results
    displayResults: function() {
        const resultsSection = document.getElementById('incentiveResults');
        const resultsBody = document.getElementById('incentiveResultsBody');
        
        if (!resultsSection || !resultsBody) return;
        
        // Show results section
        resultsSection.classList.remove('hidden');
        
        // Calculate totals
        let totalAM = 0, totalBM = 0, totalAlproean = 0;
        
        this.data.results.forEach(emp => {
            totalAM += emp.amReward;
            totalBM += emp.bmReward;
            totalAlproean += emp.alproeanReward;
        });
        
        // Update summary cards
        document.getElementById('totalAmRewards').textContent = this.formatCurrency(totalAM);
        document.getElementById('totalBmRewards').textContent = this.formatCurrency(totalBM);
        document.getElementById('totalAlproeanRewards').textContent = this.formatCurrency(totalAlproean);
        
        // Clear existing rows
        resultsBody.innerHTML = '';
        
        // Add rows
        this.data.results.forEach((emp, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${emp.employee.employeeName}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${emp.fullData.role}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${emp.fullData.region}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-blue-600">${this.formatCurrency(emp.amReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-green-600">${this.formatCurrency(emp.bmReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-purple-600">${this.formatCurrency(emp.alproeanReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold text-gray-900">${this.formatCurrency(emp.totalReward)}</td>
            `;
            
            resultsBody.appendChild(row);
        });
        
        // Enable export buttons
        document.getElementById('exportMatchedBtn').disabled = false;
        document.getElementById('exportUnmatchedBtn').disabled = this.data.unmatchedResults.length === 0;
    },
    
    // Export matched results
    exportMatched: function() {
        const exportData = [];
        
        // Add headers
        exportData.push([
            'Employee Name',
            'Employee ID',
            'Role',
            'Region',
            'Outlet',
            'AM Reward (Rp)',
            'BM Reward (Rp)',
            'Alproean Reward (Rp)',
            'Total Reward (Rp)',
            'Sales Achievement (%)',
            'GP Margin (%)'
        ]);
        
        // Add data rows
        this.data.results.forEach(emp => {
            exportData.push([
                emp.employee.employeeName,
                emp.employee.employeeId,
                emp.fullData.role,
                emp.fullData.region,
                emp.fullData.outlet,
                emp.amReward,
                emp.bmReward,
                emp.alproeanReward,
                emp.totalReward,
                emp.salesData ? emp.salesData.achievement : 0,
                emp.salesData ? emp.salesData.gpMargin : 0
            ]);
        });
        
        // Create and download
        this.downloadExcel(exportData, 'Incentive_Calculation_Results.xlsx');
        this.showStatus('Matched results exported successfully!', 'success');
    },
    
    // Export unmatched results
    exportUnmatched: function() {
        const exportData = [];
        
        // Add headers
        exportData.push([
            'Employee Name',
            'Employee ID',
            'Region',
            'Role',
            'Status',
            'Note'
        ]);
        
        // Add data rows
        this.data.unmatchedResults.forEach(emp => {
            exportData.push([
                emp.employeeName,
                emp.employeeId,
                emp.region,
                emp.role,
                emp.status,
                'Not found in Full Alproean List'
            ]);
        });
        
        // Create and download
        this.downloadExcel(exportData, 'Unmatched_Employees.xlsx');
        this.showStatus('Unmatched results exported successfully!', 'success');
    },
    
    // Download Excel file
    downloadExcel: function(data, filename) {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        XLSX.writeFile(wb, filename);
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    // Show status message
    showStatus: function(message, type = 'info') {
        const statusDiv = document.getElementById('incentiveStatus');
        if (!statusDiv) return;
        
        statusDiv.classList.remove('hidden');
        statusDiv.className = 'mb-4 p-4 rounded-lg';
        
        let bgColor, borderColor, textColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-50';
                borderColor = 'border-green-200';
                textColor = 'text-green-700';
                icon = 'fa-check-circle';
                break;
            case 'error':
                bgColor = 'bg-red-50';
                borderColor = 'border-red-200';
                textColor = 'text-red-700';
                icon = 'fa-exclamation-triangle';
                break;
            case 'warning':
                bgColor = 'bg-yellow-50';
                borderColor = 'border-yellow-200';
                textColor = 'text-yellow-700';
                icon = 'fa-exclamation-circle';
                break;
            default:
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-200';
                textColor = 'text-blue-700';
                icon = 'fa-info-circle';
        }
        
        statusDiv.className = `mb-4 p-4 rounded-lg border ${bgColor} ${borderColor}`;
        statusDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icon} mr-2 ${textColor}"></i>
                <span class="${textColor}">${message}</span>
            </div>
        `;
        
        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    },
    
    // Reset calculator
    reset: function() {
        // Clear files
        this.files = {
            activeAlproean: null,
            fullAlproean: null,
            salesGp: null,
            personalSales: null,
            outletMapping: null
        };
        
        // Clear data
        this.data = {
            activeAlproeanList: [],
            fullAlproeanList: [],
            salesGpData: [],
            personalSalesData: [],
            outletMappingData: [],
            results: [],
            unmatchedResults: []
        };
        
        // Reset file inputs
        ['activeAlproeanFile', 'fullAlproeanFile', 'salesGpFile', 'personalSalesFile', 'outletMappingFile'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        
        // Hide results
        const resultsSection = document.getElementById('incentiveResults');
        const statusDiv = document.getElementById('incentiveStatus');
        
        if (resultsSection) resultsSection.classList.add('hidden');
        if (statusDiv) statusDiv.classList.add('hidden');
        
        // Update button state
        this.updateCalculateButton();
        
        this.showStatus('Calculator reset successfully', 'info');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        IncentiveCalculator.init();
    });
} else {
    IncentiveCalculator.init();
}
