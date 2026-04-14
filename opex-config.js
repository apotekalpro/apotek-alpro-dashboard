/**
 * OpEX Dashboard Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Get your Google Sheets API Key:
 *    - Go to https://console.cloud.google.com/
 *    - Create a new project or select existing one
 *    - Enable Google Sheets API
 *    - Create credentials (API Key)
 *    - Copy the API key below
 * 
 * 2. Make sure your Google Sheet is publicly accessible:
 *    - Open your Google Sheet
 *    - Click "Share" button
 *    - Change to "Anyone with the link can view"
 * 
 * 3. Replace the values below with your actual configuration
 */

const OPEX_CONFIG = {
    // Your Google Sheets API Key
    API_KEY: 'AIzaSyCwK1q9OWeIqZ5suEWOB9IpE5o5VDYmYYA', // Replace with your actual API key
    
    // Your Google Sheets ID (from the URL)
    SHEET_ID: '1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M',
    
    // Sheet names and ranges
    SHEETS: {
        AUDIT: {
            name: 'Audit',
            range: 'A:N'
        },
        AUDIT_DETAIL: {
            name: 'FieldAudit_Detail',
            range: 'A:AU'
        },
        INDEX: {
            name: 'INDEX',
            range: 'A:B'
        },
        STTK: {
            name: 'STTK_SHRINKAGE',
            range: 'A:I'
        },
        SHRINKAGE: {
            name: 'Shrinkage_Top30',
            range: 'A:G'
        },
        CCTV: {
            name: 'CCTV_14H',
            range: 'A:Q'
        }
    },
    
    // Enable debug mode for testing
    DEBUG_MODE: true,
    
    // Use sample data if API fails (for development/testing)
    USE_SAMPLE_DATA_ON_ERROR: true
};

// Validate configuration
function validateOpexConfig() {
    if (OPEX_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('⚠️  Google Sheets API key not configured. Using sample data.');
        return false;
    }
    return true;
}
