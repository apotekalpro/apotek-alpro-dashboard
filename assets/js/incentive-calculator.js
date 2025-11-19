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
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            this.showStatus('Error: XLSX library not loaded. Please refresh the page.', 'error');
            console.error('XLSX library is not defined. Make sure the script is loaded before this code runs.');
            return;
        }
        
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
        // Handle different header row positions
        let headers, rows;
        let headerRowIndex = 0;
        let dataStartRow = 1;
        
        // DIAGNOSTIC: Log first 10 rows of raw data to identify structure
        if (fileType === 'activeAlproean' || fileType === 'fullAlproean') {
            console.log(`🔍 ${fileType} - First 10 rows of raw Excel data:`);
            jsonData.slice(0, 10).forEach((row, idx) => {
                console.log(`  Excel Row ${idx + 1}:`, {
                    colA: row[0],
                    colB: row[1],
                    colC: row[2],
                    colD: row[3]
                });
            });
            
            // AUTO-DETECT: Find the header row by looking for "Name" or "Nama" in column A
            // CRITICAL: Must be very specific to avoid matching employee data rows
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                const colA = this.toSafeString(row[0]).trim();
                const colB = this.toSafeString(row[1]).trim();
                const colC = this.toSafeString(row[2]).trim();
                
                // Check if this row contains EXACT header patterns (case-insensitive)
                const colA_lower = colA.toLowerCase();
                const colB_lower = colB.toLowerCase();
                const colC_lower = colC.toLowerCase();
                
                // Check for exact header matches
                const isHeaderRowA = colA_lower === 'nama' || colA_lower === 'name';
                const isHeaderRowB = colB_lower.includes('employee id') && colB_lower.length < 30;
                const isHeaderRowC = colC_lower.includes('job position') || colC_lower === 'role' || colC_lower === 'position';
                
                // Header row must have at least 2 of the 3 header indicators
                const headerScore = (isHeaderRowA ? 1 : 0) + (isHeaderRowB ? 1 : 0) + (isHeaderRowC ? 1 : 0);
                
                if (headerScore >= 2) {
                    headerRowIndex = i;
                    dataStartRow = i + 1;
                    console.log(`✅ AUTO-DETECTED Header at row ${i + 1} (0-indexed: ${i})`);
                    console.log(`   Column A: "${colA}" | Column B: "${colB}" | Column C: "${colC}"`);
                    break;
                }
            }
        }
        
        // Sales & GP and Personal Sales have headers at row 6 (index 5)
        if (fileType === 'salesGp' || fileType === 'personalSales') {
            headers = jsonData[5] || [];  // Row 6 (0-indexed as 5)
            rows = jsonData.slice(6);      // Data starts at row 7
            console.log(`${fileType}: Header at row 6, data from row 7, total data rows:`, rows.length);
        } else {
            // Other files use auto-detected or default row 1
            headers = jsonData[headerRowIndex] || [];
            rows = jsonData.slice(dataStartRow);
            console.log(`${fileType}: Header at row ${headerRowIndex + 1}, data from row ${dataStartRow + 1}, total data rows:`, rows.length);
        }
        
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
    
    // Safe string conversion
    toSafeString: function(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    },
    
    // Parse Active Alproean List
    // NEW SIMPLIFIED STRUCTURE (2025-11-18):
    // Column A (index 0): Name
    // Column B (index 1): Employee ID
    // Column C (index 2): Job Position / Role
    // Column D (index 3): Branch / Outlet
    parseActiveAlproean: function(headers, rows) {
        const data = [];
        
        // DIAGNOSTIC: Log header row to verify structure
        console.log('🔍 Active Alproean Headers:', {
            headerRow: headers,
            columnA: headers[0],
            columnB: headers[1],
            columnC: headers[2],
            columnD: headers[3]
        });
        
        // DIAGNOSTIC: Log first 5 raw data rows to identify any offset
        console.log('🔍 First 5 raw data rows:');
        rows.slice(0, 5).forEach((row, idx) => {
            console.log(`  Row ${idx}:`, {
                colA: row[0],
                colB: row[1],
                colC: row[2],
                colD: row[3]
            });
        });
        
        rows.forEach((row, idx) => {
            if (row.length > 3 && row[0]) {  // Need at least 4 columns (A, B, C, D)
                const employeeName = this.toSafeString(row[0]);   // Column A (index 0)
                const employeeId = this.toSafeString(row[1]);     // Column B (index 1)
                const role = this.toSafeString(row[2]);           // Column C (index 2)
                const outlet = this.toSafeString(row[3]);         // Column D (index 3)
                
                data.push({
                    employeeName: employeeName,
                    employeeId: employeeId,
                    role: role,
                    outlet: outlet,
                    status: 'active'
                });
                
                // Log first few for verification
                if (idx < 5) {
                    console.log(`✅ Parsed Active Row ${idx + 1}:`, { 
                        name: employeeName, 
                        id: employeeId, 
                        role: role, 
                        outlet: outlet 
                    });
                }
            }
        });
        console.log('✅ Parsed Active Alproean:', data.length, 'rows');
        return data;
    },
    
    // Parse Full Alproean List
    // USER SPECIFICATION: Column C (Name), D (Employee ID), L (Resign Date)
    // Excel columns: C=3rd, D=4th, L=12th
    // 0-indexed arrays: C=2, D=3, L=11
    parseFullAlproean: function(headers, rows) {
        const data = [];
        rows.forEach((row, idx) => {
            if (row.length > 11 && row[2]) {  // Need at least column L (index 11)
                const employeeName = this.toSafeString(row[2]);   // Column C (index 2)
                const employeeId = this.toSafeString(row[3]);     // Column D (index 3)
                const resignDate = this.toSafeString(row[11]);    // Column L (index 11)
                
                data.push({
                    employeeName: employeeName,
                    employeeId: employeeId,
                    resignDate: resignDate,
                    status: resignDate ? 'resigned' : 'active'
                });
                
                // Log first few for verification
                if (idx < 3) {
                    console.log(`Full Row ${idx + 1}:`, { employeeName, employeeId, resignDate });
                }
            }
        });
        console.log('✅ Parsed Full Alproean:', data.length, 'rows');
        return data;
    },
    
    // Parse Sales & GP Data
    // USER SPECIFICATION: Header at ROW 6, Column C (Store Name), G (Net Sales), L (GP), M (GP%)
    // Excel columns: B=2nd (Store), C=3rd (Store Name), G=7th, L=12th, M=13th
    // 0-indexed arrays: B=1, C=2, G=6, L=11, M=12
    // PREPROCESSING: Merge duplicate outlets (same Store + Store Name) by aggregating numerical values
    parseSalesGp: function(headers, rows) {
        // Step 1: Group rows by (Store + Store Name) combination
        const outletGroups = {};
        
        rows.forEach((row, idx) => {
            if (row.length > 12 && row[2]) {  // Need at least column M (index 12)
                const store = this.toSafeString(row[1]);          // Column B: Store (index 1)
                const storeName = this.toSafeString(row[2]);      // Column C: Store Name (index 2)
                const netSales = parseFloat(row[6]) || 0;         // Column G: Net Sales (index 6)
                const gp = parseFloat(row[11]) || 0;              // Column L: GP (index 11)
                
                // Create unique key: Store + Store Name
                const key = `${store}|${storeName}`;
                
                if (!outletGroups[key]) {
                    outletGroups[key] = {
                        store: store,
                        storeName: storeName,
                        totalNetSales: 0,
                        totalGP: 0,
                        rowCount: 0,
                        firstRowIdx: idx
                    };
                }
                
                // Aggregate numerical values
                outletGroups[key].totalNetSales += netSales;
                outletGroups[key].totalGP += gp;
                outletGroups[key].rowCount += 1;
            }
        });
        
        // Step 2: Convert grouped data to final format with recalculated GP%
        const data = [];
        Object.values(outletGroups).forEach(group => {
            // Recalculate GP% = (Total GP / Total Net Sales) × 100
            const gpMargin = group.totalNetSales > 0 
                ? (group.totalGP / group.totalNetSales) * 100 
                : 0;
            
            data.push({
                outlet: group.storeName,  // Use Store Name as outlet identifier
                totalSales: group.totalNetSales,
                gp: group.totalGP,
                gpMargin: gpMargin,
                achievement: 0,  // Will be calculated later when matched with targets
                _mergedFrom: group.rowCount  // Track how many rows were merged
            });
            
            // Log merged entries
            if (group.rowCount > 1) {
                console.log(`🔀 Merged ${group.rowCount} rows for outlet:`, {
                    store: group.store,
                    storeName: group.storeName,
                    totalNetSales: group.totalNetSales,
                    totalGP: group.totalGP,
                    gpMargin: gpMargin.toFixed(2) + '%'
                });
            }
            
            // Log first few for verification
            if (group.firstRowIdx < 3) {
                console.log(`Sales&GP Row ${group.firstRowIdx + 1}:`, {
                    outlet: group.storeName,
                    netSales: group.totalNetSales,
                    gp: group.totalGP,
                    gpMargin: gpMargin.toFixed(2) + '%'
                });
            }
        });
        
        const totalRows = Object.values(outletGroups).reduce((sum, g) => sum + g.rowCount, 0);
        const mergedCount = totalRows - data.length;
        
        console.log('✅ Parsed Sales & GP:', data.length, 'unique outlets');
        if (mergedCount > 0) {
            console.log(`🔀 Merged ${mergedCount} duplicate rows into ${data.length} unique outlets`);
        }
        
        return data;
    },
    
    // Parse Personal Sales
    // USER SPECIFICATION: Header at ROW 6, Column B (Store format "0001 - JKJSTT1"), C (Sales Person), E (Net Sales)
    // Excel columns: B=2nd, C=3rd, E=5th
    // 0-indexed arrays: B=1, C=2, E=4
    parsePersonalSales: function(headers, rows) {
        const data = [];
        rows.forEach((row, idx) => {
            if (row.length > 4 && row[2]) {  // Need at least column E (index 4)
                // Extract outlet code from column B (format: "0001 - JKJSTT1")
                let outletCode = '';
                if (row[1]) {
                    const storeStr = this.toSafeString(row[1]);  // Column B (index 1)
                    const parts = storeStr.split(' - ');
                    if (parts.length > 1) {
                        outletCode = parts[parts.length - 1].trim();  // Get last 6 chars "JKJSTT1"
                    } else {
                        // Fallback: get last 6 characters
                        outletCode = storeStr.slice(-6).trim();
                    }
                }
                
                const employeeName = this.toSafeString(row[2]);   // Column C: Sales Person (index 2)
                const netSales = parseFloat(row[4]) || 0;         // Column E: Net Sales (index 4)
                
                data.push({
                    outlet: outletCode,
                    employeeName: employeeName,
                    personalSales: netSales,
                    achievement: 0  // Will be calculated later
                });
                
                // Log first few for verification
                if (idx < 3) {
                    console.log(`Personal Sales Row ${idx + 1}:`, { outletCode, employeeName, netSales });
                }
            }
        });
        console.log('✅ Parsed Personal Sales:', data.length, 'rows');
        return data;
    },
    
    // Parse Outlet Mapping
    // USER SPECIFICATION: Column A (Outlet Code), B (Area Manager), C (Employee ID), D (Monthly Target)
    // Excel columns: A=1st, B=2nd, C=3rd, D=4th
    // 0-indexed arrays: A=0, B=1, C=2, D=3
    parseOutletMapping: function(headers, rows) {
        const data = [];
        rows.forEach((row, idx) => {
            if (row.length > 3 && row[0]) {  // Need at least column D (index 3)
                const outlet = this.toSafeString(row[0]);         // Column A: Outlet Code (index 0)
                const areaManager = this.toSafeString(row[1]);    // Column B: Area Manager (index 1)
                const employeeId = this.toSafeString(row[2]);     // Column C: Employee ID (index 2)
                const target = parseFloat(row[3]) || 0;           // Column D: Monthly Target (index 3)
                
                data.push({
                    outlet: outlet,
                    areaManager: areaManager,
                    employeeId: employeeId,
                    target: target
                });
                
                // Log first few for verification
                if (idx < 3) {
                    console.log(`Outlet Mapping Row ${idx + 1}:`, { outlet, areaManager, employeeId, target });
                }
            }
        });
        console.log('✅ Parsed Outlet Mapping:', data.length, 'rows');
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
            
            // Validate that all data is loaded
            if (this.data.activeAlproeanList.length === 0) {
                throw new Error('Active Alproean List is empty or not loaded');
            }
            if (this.data.fullAlproeanList.length === 0) {
                throw new Error('Full Alproean List is empty or not loaded');
            }
            if (this.data.salesGpData.length === 0) {
                throw new Error('Sales & GP Data is empty or not loaded');
            }
            if (this.data.personalSalesData.length === 0) {
                throw new Error('Personal Sales data is empty or not loaded');
            }
            if (this.data.outletMappingData.length === 0) {
                throw new Error('Outlet Mapping data is empty or not loaded');
            }
            
            console.log('📊 Data validation passed:', {
                activeAlproean: this.data.activeAlproeanList.length,
                fullAlproean: this.data.fullAlproeanList.length,
                salesGp: this.data.salesGpData.length,
                personalSales: this.data.personalSalesData.length,
                outletMapping: this.data.outletMappingData.length
            });
            
            // Debug: Show sample data from each file
            console.log('🔍 Sample Active Alproean:', this.data.activeAlproeanList.slice(0, 2));
            console.log('🔍 Sample Full Alproean:', this.data.fullAlproeanList.slice(0, 2));
            console.log('🔍 Sample Sales & GP:', this.data.salesGpData.slice(0, 2));
            console.log('🔍 Sample Personal Sales:', this.data.personalSalesData.slice(0, 2));
            console.log('🔍 Sample Outlet Mapping:', this.data.outletMappingData.slice(0, 2));
            
            // Clear previous results
            this.data.results = [];
            this.data.unmatchedResults = [];
            
            // Step 1: Match employees from Active Alproean with Full Alproean
            const matchedEmployees = this.matchEmployees();
            console.log('✅ Matched employees:', matchedEmployees.length);
            
            if (matchedEmployees.length === 0) {
                throw new Error('No employees could be matched. Please check that employee names/IDs match between Active and Full Alproean lists.');
            }
            
            // Debug: Show first matched employee details
            if (matchedEmployees.length > 0) {
                const firstMatch = matchedEmployees[0];
                console.log('🔍 First matched employee details:', {
                    name: firstMatch.employee.employeeName,
                    role: firstMatch.employee.role,
                    outlet: firstMatch.employee.outlet,
                    hasSalesData: !!firstMatch.salesData,
                    salesDataDetails: firstMatch.salesData,
                    hasPersonalSales: !!firstMatch.personalSales,
                    personalSalesDetails: firstMatch.personalSales,
                    hasOutletMapping: !!firstMatch.outletMapping,
                    outletMappingDetails: firstMatch.outletMapping
                });
            }
            
            // Debug: Role distribution summary
            const roleSummary = {};
            matchedEmployees.forEach(emp => {
                const role = emp.employee.role || 'undefined';
                roleSummary[role] = (roleSummary[role] || 0) + 1;
            });
            console.log('📊 Role Distribution:', roleSummary);
            
            // Step 2: Calculate AM rewards
            console.log('💰 Calculating AM rewards...');
            this.calculateAMRewards(matchedEmployees);
            
            // Step 3: Calculate Alproean rewards (must be before BM!)
            console.log('💰 Calculating Alproean rewards...');
            this.calculateAlproeanRewards(matchedEmployees);
            
            // Step 4: Calculate BM rewards (after Alproean, since BM = 50% of Alproean)
            console.log('💰 Calculating BM rewards...');
            this.calculateBMRewards(matchedEmployees);
            
            // Log sample results
            console.log('🎯 Sample calculated results:', matchedEmployees.slice(0, 5).map(e => ({
                name: e.employee.employeeName,
                role: e.employee.role,
                outlet: e.employee.outlet,
                amReward: e.amReward,
                bmReward: e.bmReward,
                alproeanReward: e.alproeanReward,
                totalReward: e.totalReward,
                achievement: e.salesData ? e.salesData.achievement : 'N/A'
            })));
            
            // Step 5: Display results
            this.displayResults();
            
            this.showStatus(`Calculation completed successfully! Processed ${matchedEmployees.length} employees.`, 'success');
        } catch (error) {
            console.error('❌ Calculation error:', error);
            this.showStatus(`Calculation error: ${error.message}`, 'error');
        }
    },
    
    // Safe string comparison helper
    safeStringCompare: function(str1, str2) {
        const s1 = (str1 || '').toString().toLowerCase().trim();
        const s2 = (str2 || '').toString().toLowerCase().trim();
        return s1 === s2;
    },
    
    // Flexible outlet matching - handles both short codes and full names
    outletMatch: function(outlet1, outlet2) {
        const o1 = (outlet1 || '').toString().toLowerCase().trim();
        const o2 = (outlet2 || '').toString().toLowerCase().trim();
        
        // Exact match
        if (o1 === o2) return true;
        
        // Check if one contains the other (for partial matches)
        if (o1.includes(o2) || o2.includes(o1)) return true;
        
        // Extract code patterns (e.g., "JKJSPR1" from full name)
        // Look for patterns like JKJSPR1, JKJSTT1, etc.
        const codePattern = /[A-Z]{6}\d+/gi;
        const codes1 = o1.match(codePattern) || [];
        const codes2 = o2.match(codePattern) || [];
        
        // Check if any extracted codes match
        for (let c1 of codes1) {
            for (let c2 of codes2) {
                if (c1.toLowerCase() === c2.toLowerCase()) return true;
            }
        }
        
        return false;
    },
    
    // Match employees
    matchEmployees: function() {
        const matched = [];
        const unmatched = [];
        
        console.log('🔍 Starting employee matching...');
        console.log('Active Alproean List:', this.data.activeAlproeanList.length, 'entries');
        console.log('Full Alproean List:', this.data.fullAlproeanList.length, 'entries');
        
        this.data.activeAlproeanList.forEach((activeEmployee, index) => {
            // Try to match by Employee ID first (more reliable), then by name
            let fullMatch = this.data.fullAlproeanList.find(full => 
                this.safeStringCompare(full.employeeId, activeEmployee.employeeId)
            );
            
            if (!fullMatch) {
                fullMatch = this.data.fullAlproeanList.find(full => 
                    this.safeStringCompare(full.employeeName, activeEmployee.employeeName)
                );
            }
            
            if (fullMatch) {
                // MULTI-OUTLET SUPPORT: Find ALL personal sales entries for this employee
                // An employee can work in multiple outlets (e.g., YUYU SRI RAHAYU in BTTSBB1 and BTTSDL1)
                const allPersonalSales = this.data.personalSalesData.filter(ps => 
                    this.safeStringCompare(ps.employeeName, activeEmployee.employeeName)
                );
                
                // If employee has personal sales in multiple outlets, create separate entries for each
                if (allPersonalSales.length > 0) {
                    allPersonalSales.forEach((personalSales, psIndex) => {
                        const outletCode = personalSales.outlet;
                        
                        // Match outlet mapping by outlet code (flexible matching)
                        const outletMapping = this.data.outletMappingData.find(mapping => 
                            this.outletMatch(mapping.outlet, outletCode)
                        );
                        
                        // Match sales data by outlet code (flexible matching)
                        const salesData = this.data.salesGpData.find(sales => 
                            this.outletMatch(sales.outlet, outletCode)
                        );
                        
                        // Calculate achievement percentages if we have targets
                        if (salesData && outletMapping && outletMapping.target > 0) {
                            salesData.achievement = (salesData.totalSales / outletMapping.target) * 100;
                        }
                        
                        if (personalSales && outletMapping && outletMapping.target > 0) {
                            personalSales.achievement = (personalSales.personalSales / outletMapping.target) * 100;
                        }
                        
                        matched.push({
                            employee: {
                                ...activeEmployee,
                                outlet: outletCode,  // Override outlet with actual outlet from Personal Sales
                                _multiOutlet: allPersonalSales.length > 1,  // Flag for multi-outlet employees
                                _outletIndex: psIndex + 1,  // Track which outlet (1st, 2nd, etc.)
                                _totalOutlets: allPersonalSales.length
                            },
                            fullData: fullMatch,
                            outletMapping: outletMapping,
                            salesData: salesData,
                            personalSales: personalSales,
                            amReward: 0,
                            bmReward: 0,
                            alproeanReward: 0,
                            totalReward: 0
                        });
                        
                        // Log multi-outlet employees
                        if (allPersonalSales.length > 1 && psIndex === 0) {
                            console.log(`🏢 Multi-outlet employee detected:`, {
                                name: activeEmployee.employeeName,
                                outlets: allPersonalSales.length,
                                outletCodes: allPersonalSales.map(ps => ps.outlet)
                            });
                        }
                    });
                } else {
                    // No personal sales found - use Active List outlet as fallback
                    const outletCode = activeEmployee.outlet;
                    
                    // Match outlet mapping by outlet code (flexible matching)
                    const outletMapping = this.data.outletMappingData.find(mapping => 
                        this.outletMatch(mapping.outlet, outletCode)
                    );
                    
                    // Match sales data by outlet code (flexible matching)
                    const salesData = this.data.salesGpData.find(sales => 
                        this.outletMatch(sales.outlet, outletCode)
                    );
                    
                    // Calculate achievement percentages if we have targets
                    if (salesData && outletMapping && outletMapping.target > 0) {
                        salesData.achievement = (salesData.totalSales / outletMapping.target) * 100;
                    }
                    
                    matched.push({
                        employee: activeEmployee,
                        fullData: fullMatch,
                        outletMapping: outletMapping,
                        salesData: salesData,
                        personalSales: null,
                        amReward: 0,
                        bmReward: 0,
                        alproeanReward: 0,
                        totalReward: 0
                    });
                }
                
                // Log first few matches
                if (index < 3) {
                    const firstMatch = matched.find(m => m.employee.employeeName === activeEmployee.employeeName);
                    if (firstMatch) {
                        console.log(`✅ Match ${index + 1}:`, {
                            name: activeEmployee.employeeName,
                            role: activeEmployee.role,
                            activeOutlet: activeEmployee.outlet,
                            usedOutlet: firstMatch.employee.outlet,
                            multiOutlet: firstMatch.employee._multiOutlet || false,
                            totalOutlets: firstMatch.employee._totalOutlets || 1,
                            hasSalesData: !!firstMatch.salesData,
                            hasPersonalSales: !!firstMatch.personalSales,
                            hasOutletMapping: !!firstMatch.outletMapping,
                            hasTarget: !!(firstMatch.outletMapping && firstMatch.outletMapping.target),
                            achievement: firstMatch.salesData ? firstMatch.salesData.achievement.toFixed(2) + '%' : 'N/A'
                        });
                    }
                }
            } else {
                unmatched.push({
                    employeeName: activeEmployee.employeeName,
                    employeeId: activeEmployee.employeeId,
                    role: activeEmployee.role,
                    outlet: activeEmployee.outlet,
                    reason: 'Not found in Full Alproean List'
                });
            }
        });
        
        // REVERSE CHECK: Find people in Personal Sales who are NOT in Active Alproean List
        // These are employees who made sales but are not in the active employee list
        console.log('🔍 Reverse check: Finding employees in Personal Sales but not in Active List...');
        
        const matchedEmployeeNames = new Set();
        matched.forEach(m => matchedEmployeeNames.add(m.employee.employeeName.toLowerCase().trim()));
        
        this.data.personalSalesData.forEach(ps => {
            const psName = this.toSafeString(ps.employeeName).toLowerCase().trim();
            
            // Check if this person from Personal Sales is already matched
            if (!matchedEmployeeNames.has(psName)) {
                // Not matched - check if they exist in Active Alproean List
                const inActiveList = this.data.activeAlproeanList.find(active => 
                    this.safeStringCompare(active.employeeName, ps.employeeName)
                );
                
                if (!inActiveList) {
                    // This person is in Personal Sales but NOT in Active List
                    // Check if they exist in Full Alproean List (might be resigned)
                    const inFullList = this.data.fullAlproeanList.find(full => 
                        this.safeStringCompare(full.employeeName, ps.employeeName)
                    );
                    
                    // Determine the reason based on Full List status
                    let reason = 'Found in Personal Sales but NOT in Active Alproean List';
                    let employeeId = 'Unknown';
                    let status = 'Unknown';
                    
                    if (inFullList) {
                        employeeId = inFullList.employeeId || 'Unknown';
                        if (inFullList.status === 'resigned' || inFullList.resignDate) {
                            reason = `Employee resigned (Resign Date: ${inFullList.resignDate || 'Unknown'})`;
                            status = 'Resigned';
                        } else {
                            reason = 'Found in Full Alproean List but NOT in Active List (Inactive employee)';
                            status = 'Inactive';
                        }
                    }
                    
                    // Check if we already added them to unmatched (avoid duplicates)
                    const alreadyUnmatched = unmatched.find(u => 
                        this.safeStringCompare(u.employeeName, ps.employeeName)
                    );
                    
                    if (!alreadyUnmatched) {
                        unmatched.push({
                            employeeName: ps.employeeName,
                            employeeId: employeeId,
                            role: 'Unknown',
                            outlet: ps.outlet,
                            personalSales: ps.personalSales,
                            status: status,
                            resignDate: inFullList ? inFullList.resignDate : null,
                            reason: reason
                        });
                        
                        console.log('⚠️ Unmatched employee found in Personal Sales:', {
                            name: ps.employeeName,
                            outlet: ps.outlet,
                            sales: ps.personalSales,
                            status: status,
                            reason: reason
                        });
                    }
                }
            }
        });
        
        console.log(`✅ Matching complete: ${matched.length} matched, ${unmatched.length} unmatched`);
        this.data.unmatchedResults = unmatched;
        return matched;
    },
    
    // Calculate AM Rewards
    // Two-part reward system:
    // 1. Area Reward: Based on total area performance
    // 2. Outlet Incentives: Individual outlet-level rewards
    calculateAMRewards: function(matchedEmployees) {
        // First, identify all Area Managers from Outlet Mapping
        const amAreas = {};  // Key: AM name, Value: { outlets: [], totalSales, totalGP, totalTarget }
        
        this.data.outletMappingData.forEach(mapping => {
            const amName = this.toSafeString(mapping.areaManager);
            if (!amName) return;
            
            if (!amAreas[amName]) {
                amAreas[amName] = {
                    amName: amName,
                    outlets: [],
                    totalSales: 0,
                    totalGP: 0,
                    totalTarget: 0,
                    amEmployee: null  // Will find the actual AM employee
                };
            }
            
            // Find the sales data for this outlet
            const salesData = this.data.salesGpData.find(sales => 
                this.outletMatch(sales.outlet, mapping.outlet)
            );
            
            if (salesData && mapping.target > 0) {
                amAreas[amName].outlets.push({
                    outletCode: mapping.outlet,
                    salesData: salesData,
                    target: mapping.target,
                    achievement: (salesData.totalSales / mapping.target) * 100
                });
                
                amAreas[amName].totalSales += salesData.totalSales;
                amAreas[amName].totalGP += salesData.gp || 0;
                amAreas[amName].totalTarget += mapping.target;
            }
        });
        
        console.log(`📊 Found ${Object.keys(amAreas).length} AM areas from Outlet Mapping`);
        
        // Match AM areas with actual employees
        let amCount = 0;
        matchedEmployees.forEach(emp => {
            const role = this.toSafeString(emp.employee.role).toUpperCase();
            const isAreaManager = (role.includes('AREA MANAGER') && !role.includes('BRANCH')) || 
                                 (role.includes('ASSOCIATE') && role.includes('AREA MANAGER'));
            
            if (isAreaManager) {
                amCount++;
                const empName = this.toSafeString(emp.employee.employeeName);
                
                // Find if this employee is listed as AM in outlet mapping
                const amArea = amAreas[empName];
                if (amArea) {
                    amArea.amEmployee = emp;
                }
            }
        });
        
        console.log(`✅ Found ${amCount} AM employees in Active List`);
        
        // Calculate rewards for each AM area
        Object.values(amAreas).forEach(amArea => {
            if (!amArea.amEmployee || amArea.outlets.length === 0) return;
            
            const emp = amArea.amEmployee;
            
            // PART 1: AREA REWARD (Region-level)
            // Calculate area achievement
            const areaAchievement = amArea.totalTarget > 0 
                ? (amArea.totalSales / amArea.totalTarget) * 100 
                : 0;
            
            // Determine area percentage
            let areaPercentage = 0;
            if (areaAchievement >= 100) {
                areaPercentage = 0.15;   // 0.15%
            } else if (areaAchievement >= 90) {
                areaPercentage = 0.113;  // 0.113%
            } else if (areaAchievement >= 80) {
                areaPercentage = 0.075;  // 0.075%
            }
            
            // Calculate area GP margin (Total GP / Total Revenue)
            const areaGPMargin = amArea.totalSales > 0 
                ? (amArea.totalGP / amArea.totalSales) * 100 
                : 0;
            
            // Apply GP adjustment to area reward
            const areaGPAdjustment = this.getGPAdjustment(areaGPMargin);
            const areaReward = amArea.totalSales * (areaPercentage / 100) * areaGPAdjustment;
            
            // PART 2: OUTLET INCENTIVES (Individual outlet rewards)
            let outletIncentivesTotal = 0;
            amArea.outlets.forEach(outlet => {
                const outletAchievement = outlet.achievement;
                
                // Determine outlet percentage
                let outletPercentage = 0;
                if (outletAchievement >= 100) {
                    outletPercentage = 0.15;   // 0.15%
                } else if (outletAchievement >= 90) {
                    outletPercentage = 0.113;  // 0.113%
                } else if (outletAchievement >= 80) {
                    outletPercentage = 0.075;  // 0.075%
                }
                
                if (outletPercentage > 0) {
                    // Apply GP adjustment based on outlet's GP margin
                    const outletGPAdjustment = this.getGPAdjustment(outlet.salesData.gpMargin);
                    const outletIncentive = outlet.salesData.totalSales * (outletPercentage / 100) * outletGPAdjustment;
                    outletIncentivesTotal += outletIncentive;
                }
            });
            
            // Total AM Reward = Area Reward + Outlet Incentives
            emp.amReward = areaReward + outletIncentivesTotal;
            
            // Debug first AM
            if (Object.values(amAreas).indexOf(amArea) === 0) {
                console.log('📊 Sample AM Calculation:', {
                    name: amArea.amName,
                    outlets: amArea.outlets.length,
                    totalSales: amArea.totalSales,
                    totalTarget: amArea.totalTarget,
                    areaAchievement: areaAchievement.toFixed(2) + '%',
                    areaGPMargin: areaGPMargin.toFixed(2) + '%',
                    areaReward: areaReward.toFixed(2),
                    outletIncentives: outletIncentivesTotal.toFixed(2),
                    totalAMReward: emp.amReward.toFixed(2)
                });
            }
        });
        
        console.log(`✅ Calculated AM rewards for ${Object.values(amAreas).filter(a => a.amEmployee).length} AMs`);
    },
    
    // Calculate BM Rewards
    // NOTE: Must be called AFTER calculateAlproeanRewards() since BM reward = 50% of personal Alproean
    calculateBMRewards: function(matchedEmployees) {
        let bmCount = 0;
        matchedEmployees.forEach(emp => {
            const role = this.toSafeString(emp.employee.role).toUpperCase();  // Use role from Active List Column G
            
            // Match ONLY: "Branch Manager" or "Senior Branch Manager"
            // Don't match: "Trainee Branch Manager", "Area Manager", etc.
            const isBranchManager = (role.includes('BRANCH MANAGER') || role.includes('SENIOR BRANCH MANAGER')) && 
                                   !role.includes('TRAINEE');
            
            if (isBranchManager) {
                bmCount++;
                
                // BM gets 50% bonus on their personal Alproean incentive
                // This is calculated from their alproeanReward which was set in calculateAlproeanRewards()
                if (emp.alproeanReward > 0) {
                    emp.bmReward = emp.alproeanReward * 0.5;
                }
            }
        });
        console.log(`Found ${bmCount} BM employees eligible for rewards`);
        
        // Debug: Show first few BM roles detected
        const bmRoles = matchedEmployees
            .filter(emp => {
                const role = this.toSafeString(emp.employee.role).toUpperCase();
                return (role.includes('BRANCH MANAGER') || role.includes('SENIOR BRANCH MANAGER')) && 
                       !role.includes('TRAINEE');
            })
            .slice(0, 5)
            .map(emp => ({ name: emp.employee.employeeName, role: emp.employee.role }));
        if (bmRoles.length > 0) {
            console.log('📋 Sample BM roles:', bmRoles);
        }
    },
    
    // Calculate Alproean Rewards
    calculateAlproeanRewards: function(matchedEmployees) {
        // Group by outlet
        const outletGroups = {};
        
        matchedEmployees.forEach(emp => {
            const outletKey = emp.employee.outlet;  // Use outlet from Active List
            
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
                if (emp.personalSales && emp.salesData) {
                    // Use outlet-level achievement (not individual)
                    const outletAchievement = outlet.salesData ? outlet.salesData.achievement : 0;
                    let alproeanPercentage = 0;
                    
                    // Thresholds: 80% -> 1.35%, 90% -> 2%, 100%+ -> 2.7%
                    if (outletAchievement >= 100) {
                        alproeanPercentage = 2.7;
                    } else if (outletAchievement >= 90) {
                        alproeanPercentage = 2.0;
                    } else if (outletAchievement >= 80) {
                        alproeanPercentage = 1.35;
                    }
                    
                    if (outlet.salesData && alproeanPercentage > 0) {
                        const gpAdjustment = this.getGPAdjustment(outlet.salesData.gpMargin);
                        
                        // Calculate total outlet incentive pool based on ACTUAL outlet total from Sales & GP
                        const outletIncentivePool = outlet.salesData.totalSales * (alproeanPercentage / 100) * gpAdjustment;
                        
                        // CRITICAL FIX: Use outlet total from Sales & GP report (Column G) as denominator
                        // NOT the sum of matched employees (outlet.totalPersonalSales)
                        // This accounts for ALL sales including non-matched employees (e.g., AM helping)
                        const outletTotalFromSalesGP = outlet.salesData.totalSales;
                        
                        if (outletTotalFromSalesGP > 0) {
                            // Calculate employee's share based on their contribution to ACTUAL outlet total
                            const employeeShare = emp.personalSales.personalSales / outletTotalFromSalesGP;
                            emp.alproeanReward = outletIncentivePool * employeeShare;
                            
                            // Store contribution ratio for export (percentage of ACTUAL outlet total)
                            emp.contributionRatio = (emp.personalSales.personalSales / outletTotalFromSalesGP) * 100;
                            
                            // Debug logging for first few employees
                            if (Object.values(outletGroups).indexOf(outlet) === 0 && outlet.employees.indexOf(emp) < 3) {
                                console.log(`📊 ${emp.employee.employeeName}:`, {
                                    outlet: outlet.outlet,
                                    personalSales: emp.personalSales.personalSales,
                                    outletTotalFromSalesGP: outletTotalFromSalesGP,
                                    contributionRatio: emp.contributionRatio.toFixed(2) + '%',
                                    alproeanReward: emp.alproeanReward.toFixed(2)
                                });
                            }
                        }
                    }
                }
            });
        });
        
        console.log(`Processed ${Object.keys(outletGroups).length} outlet groups for Alproean rewards`);
        
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
        
        // AGGREGATE MULTI-OUTLET EMPLOYEES
        // Group results by employee name and sum up their rewards from all outlets
        const aggregatedResults = {};
        
        this.data.results.forEach(emp => {
            const key = emp.employee.employeeName;
            
            if (!aggregatedResults[key]) {
                aggregatedResults[key] = {
                    employee: {
                        employeeName: emp.employee.employeeName,
                        employeeId: emp.employee.employeeId,
                        role: emp.employee.role,
                        outlet: emp.employee.outlet  // Will show first outlet
                    },
                    outlets: [],  // Track all outlets
                    amReward: 0,
                    bmReward: 0,
                    alproeanReward: 0,
                    totalReward: 0
                };
            }
            
            // Add outlet to list
            aggregatedResults[key].outlets.push(emp.employee.outlet);
            
            // Sum up rewards from all outlets
            aggregatedResults[key].amReward += emp.amReward;
            aggregatedResults[key].bmReward += emp.bmReward;
            aggregatedResults[key].alproeanReward += emp.alproeanReward;
            aggregatedResults[key].totalReward += emp.totalReward;
        });
        
        // Convert to array
        const displayResults = Object.values(aggregatedResults);
        
        // Calculate totals
        let totalAM = 0, totalBM = 0, totalAlproean = 0;
        
        displayResults.forEach(emp => {
            totalAM += emp.amReward;
            totalBM += emp.bmReward;
            totalAlproean += emp.alproeanReward;
        });
        
        // Calculate grand total (sum of all rewards)
        const grandTotal = totalAM + totalBM + totalAlproean;
        
        // Update summary cards
        document.getElementById('totalAmRewards').textContent = this.formatCurrency(totalAM);
        document.getElementById('totalBmRewards').textContent = this.formatCurrency(totalBM);
        document.getElementById('totalAlproeanRewards').textContent = this.formatCurrency(totalAlproean);
        document.getElementById('totalIncentives').textContent = this.formatCurrency(grandTotal);
        
        // Clear existing rows
        resultsBody.innerHTML = '';
        
        // Add rows
        displayResults.forEach((emp, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            // Show multiple outlets if employee works in more than one
            const outletDisplay = emp.outlets.length > 1 
                ? `${emp.outlets.join(', ')} [${emp.outlets.length} outlets]`
                : emp.employee.outlet || 'undefined';
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${emp.employee.employeeName}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${emp.employee.role || 'undefined'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${outletDisplay}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-blue-600">${this.formatCurrency(emp.amReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-green-600">${this.formatCurrency(emp.bmReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-purple-600">${this.formatCurrency(emp.alproeanReward)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold text-gray-900">${this.formatCurrency(emp.totalReward)}</td>
            `;
            
            resultsBody.appendChild(row);
        });
        
        // Enable export buttons
        const exportMatchedBtn = document.getElementById('exportMatchedBtn');
        const exportUnmatchedBtn = document.getElementById('exportUnmatchedBtn');
        
        if (exportMatchedBtn) {
            exportMatchedBtn.disabled = false;
            exportMatchedBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        if (exportUnmatchedBtn) {
            const hasUnmatched = this.data.unmatchedResults.length > 0;
            
            // Always enable button so users can click it
            exportUnmatchedBtn.disabled = false;
            exportUnmatchedBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'opacity-60');
            exportUnmatchedBtn.style.cursor = 'pointer';
            exportUnmatchedBtn.removeAttribute('disabled');
            
            if (hasUnmatched) {
                console.log(`✅ Export Unmatched button ENABLED (${this.data.unmatchedResults.length} unmatched employees)`);
            } else {
                console.log(`✅ All employees matched successfully (${this.data.results.length} total)`);
            }
        }
    },
    
    // Export matched results
    exportMatched: function() {
        const exportData = [];
        
        // Add headers (removed Region column, added Personal Sales and Contribution %)
        exportData.push([
            'Employee Name',
            'Employee ID',
            'Role',
            'Outlet',
            'Personal Sales (Rp)',
            'Contribution Ratio (%)',
            'GP Margin (%)',
            'AM Reward (Rp)',
            'BM Reward (Rp)',
            'Alproean Reward (Rp)',
            'Total Reward (Rp)'
        ]);
        
        // AGGREGATE MULTI-OUTLET EMPLOYEES FOR EXPORT
        // Group by employee name and sum up rewards from all outlets
        const aggregatedResults = {};
        
        this.data.results.forEach(emp => {
            const key = emp.employee.employeeName;
            
            if (!aggregatedResults[key]) {
                aggregatedResults[key] = {
                    employeeName: emp.employee.employeeName,
                    employeeId: emp.employee.employeeId,
                    role: emp.employee.role,
                    outlets: [],
                    personalSales: 0,
                    contributionRatio: 0,
                    gpMargin: 0,
                    amReward: 0,
                    bmReward: 0,
                    alproeanReward: 0,
                    totalReward: 0,
                    outletCount: 0
                };
            }
            
            // Add outlet
            aggregatedResults[key].outlets.push(emp.employee.outlet);
            
            // Sum personal sales
            if (emp.personalSales) {
                aggregatedResults[key].personalSales += emp.personalSales.personalSales;
            }
            
            // Average contribution ratio (weighted by personal sales)
            if (emp.contributionRatio) {
                aggregatedResults[key].contributionRatio += emp.contributionRatio;
            }
            
            // Average GP margin (weighted by sales data)
            if (emp.salesData) {
                aggregatedResults[key].gpMargin += emp.salesData.gpMargin;
            }
            
            // Sum rewards
            aggregatedResults[key].amReward += emp.amReward;
            aggregatedResults[key].bmReward += emp.bmReward;
            aggregatedResults[key].alproeanReward += emp.alproeanReward;
            aggregatedResults[key].totalReward += emp.totalReward;
            
            aggregatedResults[key].outletCount += 1;
        });
        
        // Add data rows
        Object.values(aggregatedResults).forEach(emp => {
            // Average the ratio and margin by outlet count
            const avgContributionRatio = emp.outletCount > 0 ? emp.contributionRatio / emp.outletCount : 0;
            const avgGpMargin = emp.outletCount > 0 ? emp.gpMargin / emp.outletCount : 0;
            
            // Show all outlets if employee works in multiple
            const outletDisplay = emp.outlets.length > 1 
                ? emp.outlets.join(', ') + ` [${emp.outlets.length} outlets]`
                : emp.outlets[0] || '';
            
            exportData.push([
                emp.employeeName,
                emp.employeeId,
                emp.role,
                outletDisplay,
                emp.personalSales,
                avgContributionRatio.toFixed(2),
                avgGpMargin.toFixed(2),
                emp.amReward,
                emp.bmReward,
                emp.alproeanReward,
                emp.totalReward
            ]);
        });
        
        // Create and download
        this.downloadExcel(exportData, 'Incentive_Calculation_Results.xlsx');
        this.showStatus('Matched results exported successfully!', 'success');
    },
    
    // Export unmatched results
    exportUnmatched: function() {
        console.log('📥 Export Unmatched Results clicked');
        console.log('Unmatched results count:', this.data.unmatchedResults.length);
        
        if (this.data.unmatchedResults.length === 0) {
            this.showStatus('✅ Excellent! All employees were successfully matched. There are no unmatched employees to export.', 'success');
            return;
        }
        
        console.log('Proceeding to export', this.data.unmatchedResults.length, 'unmatched employees');
        
        const exportData = [];
        
        // Add headers
        exportData.push([
            'Employee Name',
            'Employee ID',
            'Role',
            'Outlet',
            'Personal Sales (Rp)',
            'Status',
            'Resign Date',
            'Reason / Note'
        ]);
        
        // Add data rows
        this.data.unmatchedResults.forEach(emp => {
            exportData.push([
                emp.employeeName || '',
                emp.employeeId || '',
                emp.role || '',
                emp.outlet || '',
                emp.personalSales || 0,
                emp.status || 'Unmatched',
                emp.resignDate || '',
                emp.reason || 'Not found in Full Alproean List'
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
