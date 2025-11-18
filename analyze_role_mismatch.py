#!/usr/bin/env python3
"""
Analyze role mismatch between Active Alproean List and Incentive Calculation Results
"""

import pandas as pd
import sys

def analyze_files():
    print("=" * 80)
    print("ANALYZING ROLE MISMATCH IN PPM INCENTIVE CALCULATOR")
    print("=" * 80)
    
    # Read Active Alproean List
    print("\n📂 Reading Active Alproean List...")
    active_df = pd.read_excel('/home/user/uploaded_files/Active Alproean List.xlsx', header=None)
    
    # Print first 15 rows to understand structure
    print("\n🔍 First 15 rows of Active Alproean List (raw):")
    print(active_df.head(15).to_string())
    
    # Find header row
    print("\n🔍 Searching for header row...")
    header_row = None
    for idx, row in active_df.iterrows():
        if idx > 10:  # Don't search beyond row 10
            break
        # Check column C (index 2) and D (index 3) for header patterns
        col_c = str(row[2]).lower() if pd.notna(row[2]) else ""
        col_d = str(row[3]).lower() if pd.notna(row[3]) else ""
        
        if 'name' in col_c or 'nama' in col_c or 'employee' in col_d or 'id' in col_d:
            header_row = idx
            print(f"✅ Found header at row {idx + 1} (0-indexed: {idx})")
            print(f"   Column C (Name): {row[2]}")
            print(f"   Column D (Employee ID): {row[3]}")
            print(f"   Column G (Role): {row[6]}")
            print(f"   Column AO (Outlet): {row[40]}")
            break
    
    if header_row is None:
        print("⚠️ WARNING: Could not find header row! Using row 0 as default.")
        header_row = 0
    
    # Re-read with correct header
    active_df = pd.read_excel('/home/user/uploaded_files/Active Alproean List.xlsx', header=header_row)
    
    print(f"\n📊 Active Alproean List shape: {active_df.shape}")
    print(f"📊 Columns: {list(active_df.columns[:10])}...")  # Show first 10 columns
    
    # Get column names
    cols = list(active_df.columns)
    print(f"\n📋 Column mapping:")
    print(f"   Column C (index 2): {cols[2] if len(cols) > 2 else 'N/A'}")
    print(f"   Column D (index 3): {cols[3] if len(cols) > 3 else 'N/A'}")
    print(f"   Column G (index 6): {cols[6] if len(cols) > 6 else 'N/A'}")
    print(f"   Column AO (index 40): {cols[40] if len(cols) > 40 else 'N/A'}")
    
    # Extract relevant columns (C=2, D=3, G=6, AO=40 in 0-indexed)
    name_col = active_df.iloc[:, 2]  # Column C
    id_col = active_df.iloc[:, 3]    # Column D
    role_col = active_df.iloc[:, 6]  # Column G
    outlet_col = active_df.iloc[:, 40]  # Column AO
    
    active_data = pd.DataFrame({
        'Name': name_col,
        'Employee_ID': id_col,
        'Role': role_col,
        'Outlet': outlet_col
    })
    
    # Remove rows with missing names
    active_data = active_data[active_data['Name'].notna() & (active_data['Name'] != '')]
    
    print(f"\n✅ Extracted {len(active_data)} employee records from Active List")
    print("\n🔍 First 10 employees from Active List:")
    print(active_data.head(10).to_string(index=False))
    
    # Read Incentive Calculation Results
    print("\n\n📂 Reading Incentive Calculation Results...")
    results_df = pd.read_excel('/home/user/uploaded_files/Incentive_Calculation_Results (12).xlsx')
    
    print(f"\n📊 Results shape: {results_df.shape}")
    print(f"📊 Columns: {list(results_df.columns)}")
    
    print("\n🔍 First 10 employees from Results:")
    print(results_df[['Employee Name', 'Role', 'Outlet']].head(10).to_string(index=False))
    
    # Compare the two
    print("\n\n" + "=" * 80)
    print("COMPARISON: Active List vs Results")
    print("=" * 80)
    
    # Find mismatches
    mismatches = []
    for idx, result_row in results_df.iterrows():
        result_name = str(result_row['Employee Name']).strip()
        result_role = str(result_row['Role']).strip()
        
        # Find matching name in active list
        active_match = active_data[active_data['Name'].astype(str).str.strip() == result_name]
        
        if not active_match.empty:
            active_role = str(active_match.iloc[0]['Role']).strip()
            if active_role != result_role:
                mismatches.append({
                    'Row': idx + 2,  # +2 because of 0-index and header row
                    'Name': result_name,
                    'Expected_Role': active_role,
                    'Got_Role': result_role,
                    'Match': '❌'
                })
            else:
                if idx < 15:  # Show first 15 matches
                    print(f"✅ Row {idx + 2}: {result_name} - Role matches: {result_role}")
        else:
            if idx < 5:  # Show first 5 not found
                print(f"⚠️ Row {idx + 2}: {result_name} - Not found in Active List")
    
    if mismatches:
        print(f"\n\n❌ FOUND {len(mismatches)} ROLE MISMATCHES:")
        print("=" * 80)
        mismatch_df = pd.DataFrame(mismatches)
        print(mismatch_df.to_string(index=False))
        
        # Analyze pattern
        print("\n\n🔍 ANALYZING MISMATCH PATTERN:")
        print("=" * 80)
        
        # Check if there's a consistent offset
        for i, mismatch in enumerate(mismatches[:5]):  # Check first 5 mismatches
            name = mismatch['Name']
            got_role = mismatch['Got_Role']
            
            # Find whose role this actually is
            actual_owner = active_data[active_data['Role'].astype(str).str.strip() == got_role]
            if not actual_owner.empty:
                print(f"\n❌ {name} got role: {got_role}")
                print(f"   This role actually belongs to: {actual_owner.iloc[0]['Name']}")
                
                # Find position difference
                name_pos = active_data[active_data['Name'].astype(str).str.strip() == name].index
                owner_pos = actual_owner.index
                if len(name_pos) > 0 and len(owner_pos) > 0:
                    offset = owner_pos[0] - name_pos[0]
                    print(f"   Position offset: {offset} rows")
    else:
        print("\n✅ NO MISMATCHES FOUND! All roles match correctly.")
    
    # Check the specific examples from the screenshot
    print("\n\n" + "=" * 80)
    print("CHECKING SPECIFIC EMPLOYEES FROM SCREENSHOT:")
    print("=" * 80)
    
    test_names = ['KHOO ZI YU', 'ESTER DESINDO NABABAN', 'Khoo Zi Yu', 'Ester Desindo Nababan']
    
    for test_name in test_names:
        print(f"\n🔍 Searching for: {test_name}")
        
        # In Active List
        active_match = active_data[active_data['Name'].astype(str).str.upper().str.strip() == test_name.upper()]
        if not active_match.empty:
            print(f"   Active List - Role: {active_match.iloc[0]['Role']}")
        else:
            print(f"   Active List - NOT FOUND")
        
        # In Results
        result_match = results_df[results_df['Employee Name'].astype(str).str.upper().str.strip() == test_name.upper()]
        if not result_match.empty:
            print(f"   Results     - Role: {result_match.iloc[0]['Role']}")
        else:
            print(f"   Results     - NOT FOUND")

if __name__ == '__main__':
    try:
        analyze_files()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
