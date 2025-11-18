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
                    colD: row[3],
                    colE: row[4],
                    colF: row[5],
                    colG: row[6]
                });
            });
            
            // AUTO-DETECT: Find the header row by looking for "Name" or "Nama" in column C
            // CRITICAL: Must be very specific to avoid matching employee data rows
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                const colC = this.toSafeString(row[2]).trim();
                const colD = this.toSafeString(row[3]).trim();
                const colG = this.toSafeString(row[6]).trim();
                
                // Check if this row contains EXACT header patterns (case-insensitive)
                // Must match the ENTIRE cell value, not just contain the word
                const colC_lower = colC.toLowerCase();
                const colD_lower = colD.toLowerCase();
                const colG_lower = colG.toLowerCase();
                
                // Check for exact header matches or very close variations
                const isHeaderRowC = colC_lower === 'nama' || colC_lower === 'name';
                const isHeaderRowD = colD_lower.includes('employee id') && colD_lower.length < 30;  // Must be short
                const isHeaderRowG = colG_lower.includes('job position') || colG_lower === 'role' || colG_lower === 'position';
                
                // Header row must have at least 2 of the 3 header indicators
                const headerScore = (isHeaderRowC ? 1 : 0) + (isHeaderRowD ? 1 : 0) + (isHeaderRowG ? 1 : 0);
                
                if (headerScore >= 2) {
                    headerRowIndex = i;
                    dataStartRow = i + 1;
                    console.log(`✅ AUTO-DETECTED Header at row ${i + 1} (0-indexed: ${i})`);
                    console.log(`   Column C: "${colC}" | Column D: "${colD}" | Column G: "${colG}"`);
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
    // USER SPECIFICATION: Column C (Name), D (Employee ID), G (Job Position), AO (Branch Talenta)
    // Excel columns: C=3rd, D=4th, G=7th, AO=41st
    // 0-indexed arrays: C=2, D=3, G=6, AO=40
    parseActiveAlproean: function(headers, rows) {
        const data = [];
        
        // DIAGNOSTIC: Log header row to verify structure
        console.log('🔍 Active Alproean Headers:', {
            headerRow: headers,
            columnC: headers[2],
            columnD: headers[3],
            columnG: headers[6],
            columnAO: headers[40]
        });
        
        // DIAGNOSTIC: Log first 5 raw data rows to identify any offset
        console.log('🔍 First 5 raw data rows:');
        rows.slice(0, 5).forEach((row, idx) => {
            console.log(`  Row ${idx}:`, {
                colC: row[2],
                colD: row[3],
                colG: row[6],
                colAO: row[40]
            });
        });
        
        rows.forEach((row, idx) => {
            if (row.length > 40 && row[2]) {  // Need at least column AO (index 40)
                const employeeName = this.toSafeString(row[2]);   // Column C (index 2)
                const employeeId = this.toSafeString(row[3]);     // Column D (index 3)
                const role = this.toSafeString(row[6]);           // Column G (index 6)
                const outlet = this.toSafeString(row[40]);        // Column AO (index 40)
                
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
    // Excel columns: C=3rd, G=7th, L=12th, M=13th
    // 0-indexed arrays: C=2, G=6, L=11, M=12
    parseSalesGp: function(headers, rows) {
        const data = [];
        rows.forEach((row, idx) => {
            if (row.length > 12 && row[2]) {  // Need at least column M (index 12)
                const outlet = this.toSafeString(row[2]);         // Column C: Store Name (index 2)
                const netSales = parseFloat(row[6]) || 0;         // Column G: Net Sales (index 6)
                const gp = parseFloat(row[11]) || 0;              // Column L: GP (index 11)
                const gpMargin = parseFloat(row[12]) || 0;        // Column M: GP% (index 12)
                
                data.push({
                    outlet: outlet,
                    totalSales: netSales,
                    gp: gp,
                    gpMargin: gpMargin,
                    achievement: 0  // Will be calculated later when matched with targets
                });
                
                // Log first few for verification
                if (idx < 3) {
                    console.log(`Sales&GP Row ${idx + 1}:`, { outlet, netSales, gp, gpMargin });
                }
            }
        });
        console.log('✅ Parsed Sales & GP:', data.length, 'rows');
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
                // First match personal sales by employee name to get the outlet code
                const personalSales = this.data.personalSalesData.find(ps => 
                    this.safeStringCompare(ps.employeeName, activeEmployee.employeeName)
                );
                
                // Use outlet code from Personal Sales (most reliable - extracted from "0001 - JKJSPR1")
                // Fallback to Active List outlet if Personal Sales not found
                const outletCode = personalSales ? personalSales.outlet : activeEmployee.outlet;
                
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
                
                // Log first few matches
                if (index < 3) {
                    console.log(`✅ Match ${index + 1}:`, {
                        name: activeEmployee.employeeName,
                        role: activeEmployee.role,
                        activeOutlet: activeEmployee.outlet,
                        usedOutlet: outletCode,
                        hasSalesData: !!salesData,
                        hasPersonalSales: !!personalSales,
                        hasOutletMapping: !!outletMapping,
                        hasTarget: !!(outletMapping && outletMapping.target),
                        achievement: salesData ? salesData.achievement.toFixed(2) + '%' : 'N/A'
                    });
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
        
        // Calculate totals
        let totalAM = 0, totalBM = 0, totalAlproean = 0;
        
        this.data.results.forEach(emp => {
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
        this.data.results.forEach((emp, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${emp.employee.employeeName}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${emp.employee.role || 'undefined'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${emp.employee.outlet || 'undefined'}</td>
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
        
        // Add data rows
        this.data.results.forEach(emp => {
            // Use the contribution ratio that was calculated in calculateAlproeanRewards()
            // This uses the ACTUAL outlet total from Sales & GP report (not sum of matched employees)
            const contributionRatio = emp.contributionRatio || 0;
            
            exportData.push([
                emp.employee.employeeName,
                emp.employee.employeeId,
                emp.employee.role,
                emp.employee.outlet,
                emp.personalSales ? emp.personalSales.personalSales : 0,
                contributionRatio.toFixed(2),
                emp.salesData ? emp.salesData.gpMargin.toFixed(2) : 0,
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
            'Status',
            'Note'
        ]);
        
        // Add data rows
        this.data.unmatchedResults.forEach(emp => {
            exportData.push([
                emp.employeeName || '',
                emp.employeeId || '',
                emp.role || '',
                emp.outlet || '',
                'Unmatched',
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
