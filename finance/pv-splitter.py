#!/usr/bin/env python3
"""
PV Splitter Backend Service
Splits Excel files with multiple sheets into individual files
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import openpyxl
from openpyxl.utils import get_column_letter
import io
import zipfile
import os
import json
from datetime import datetime
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'pv-splitter',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/split-excel', methods=['POST'])
def split_excel():
    """
    Split an Excel file with multiple sheets into individual files
    Returns metadata about the split files for download
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'File must be an Excel file (.xlsx or .xls)'}), 400
        
        # Read the uploaded Excel file
        file_content = file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(file_content))
        
        # Create a temporary directory to store split files
        temp_dir = tempfile.mkdtemp()
        split_files_info = []
        
        # Process each sheet
        for sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
            
            # Extract company name from D9
            company_name = sheet['D9'].value
            if company_name is None:
                company_name = f"Sheet_{sheet_name}"
            else:
                company_name = str(company_name).strip()
            
            # Extract PV number from R9
            pv_number = sheet['R9'].value
            if pv_number is None:
                pv_number = "NO_PV"
            else:
                pv_number = str(pv_number).strip()
            
            # Extract email from D12
            email = sheet['D12'].value
            if email is None:
                email = ""
            else:
                email = str(email).strip()
            
            # Create safe filename
            # Replace invalid filename characters
            safe_company = "".join(c for c in company_name if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_pv = "".join(c for c in pv_number if c.isalnum() or c in (' ', '-', '_', '/')).strip()
            
            # Create filename: "CompanyName PV_Number.xlsx"
            filename = f"{safe_company} {safe_pv}.xlsx"
            
            # Create a new workbook with only this sheet
            new_workbook = openpyxl.Workbook()
            new_workbook.remove(new_workbook.active)  # Remove default sheet
            
            # Copy the sheet to the new workbook
            new_sheet = new_workbook.create_sheet(sheet_name)
            
            # Copy all cells with their values, styles, and formatting
            for row in sheet.iter_rows():
                for cell in row:
                    new_cell = new_sheet[cell.coordinate]
                    new_cell.value = cell.value
                    
                    # Copy cell formatting
                    if cell.has_style:
                        new_cell.font = cell.font.copy()
                        new_cell.border = cell.border.copy()
                        new_cell.fill = cell.fill.copy()
                        new_cell.number_format = cell.number_format
                        new_cell.protection = cell.protection.copy()
                        new_cell.alignment = cell.alignment.copy()
            
            # Copy column dimensions
            for col in sheet.column_dimensions:
                if col in sheet.column_dimensions:
                    new_sheet.column_dimensions[col].width = sheet.column_dimensions[col].width
            
            # Copy row dimensions
            for row in sheet.row_dimensions:
                if row in sheet.row_dimensions:
                    new_sheet.row_dimensions[row].height = sheet.row_dimensions[row].height
            
            # Copy merged cells
            for merged_cell in sheet.merged_cells.ranges:
                new_sheet.merge_cells(str(merged_cell))
            
            # Save the new workbook
            file_path = os.path.join(temp_dir, filename)
            new_workbook.save(file_path)
            
            # Store file information
            split_files_info.append({
                'filename': filename,
                'company_name': company_name,
                'pv_number': pv_number,
                'email': email,
                'sheet_name': sheet_name,
                'file_path': file_path
            })
        
        # Create a zip file containing all split files
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_info in split_files_info:
                zip_file.write(file_info['file_path'], file_info['filename'])
        
        zip_buffer.seek(0)
        
        # Store zip file temporarily
        zip_filename = f"pv_split_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        with open(zip_path, 'wb') as f:
            f.write(zip_buffer.getvalue())
        
        # Return file information (without file_path for security)
        response_data = {
            'success': True,
            'files': [{
                'filename': f['filename'],
                'company_name': f['company_name'],
                'pv_number': f['pv_number'],
                'email': f['email'],
                'sheet_name': f['sheet_name']
            } for f in split_files_info],
            'total_files': len(split_files_info),
            'zip_filename': zip_filename,
            'temp_dir': temp_dir  # Full path for backend use
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': type(e).__name__
        }), 500

@app.route('/api/download-zip/<path:temp_dir>/<filename>', methods=['GET'])
def download_zip(temp_dir, filename):
    """Download the zip file containing all split files"""
    try:
        # Reconstruct the full path - temp_dir comes from URL without leading /
        if not temp_dir.startswith('/'):
            temp_dir = '/' + temp_dir
        file_path = os.path.join(temp_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'File not found: {file_path}'}), 404
        
        def cleanup():
            """Cleanup temporary directory after download"""
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except:
                pass
        
        response = send_file(
            file_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )
        
        # Schedule cleanup (note: this won't work perfectly in all cases)
        # For production, consider a background cleanup task
        
        return response
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download-individual/<path:temp_dir>/<filename>', methods=['GET'])
def download_individual(temp_dir, filename):
    """Download an individual split file"""
    try:
        # Reconstruct the full path - temp_dir comes from URL without leading /
        if not temp_dir.startswith('/'):
            temp_dir = '/' + temp_dir
        file_path = os.path.join(temp_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'File not found: {file_path}'}), 404
        
        return send_file(
            file_path,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-email-data', methods=['POST'])
def get_email_data():
    """
    Prepare email data for Gmail integration
    Returns the email recipients and their corresponding files
    """
    try:
        data = request.json
        files_info = data.get('files', [])
        
        # Group files by email
        email_groups = {}
        for file_info in files_info:
            email = file_info.get('email', '').strip()
            if email and '@' in email:  # Basic email validation
                if email not in email_groups:
                    email_groups[email] = []
                email_groups[email].append(file_info)
        
        # Prepare email data
        email_data = []
        for email, files in email_groups.items():
            email_data.append({
                'to': email,
                'subject': f"PV Documents - {', '.join([f['pv_number'] for f in files[:3]])}{'...' if len(files) > 3 else ''}",
                'body': f"""Dear {files[0]['company_name']},

Please find attached your PV document(s):

{chr(10).join([f"- {f['filename']}" for f in files])}

Best regards,
Apotek Alpro Finance Team""",
                'files': files
            })
        
        return jsonify({
            'success': True,
            'email_count': len(email_data),
            'emails': email_data
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting PV Splitter Service on port 5001...")
    print("Service endpoints:")
    print("  - POST /api/split-excel - Split Excel file")
    print("  - GET  /api/download-zip/<temp_dir>/<filename> - Download all files as zip")
    print("  - GET  /api/download-individual/<temp_dir>/<filename> - Download individual file")
    print("  - POST /api/get-email-data - Get email data for Gmail integration")
    print("  - GET  /health - Health check")
    app.run(host='0.0.0.0', port=5001, debug=True)
