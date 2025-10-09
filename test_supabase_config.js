// ========================================
// SUPABASE CONFIGURATION TEST SCRIPT
// ========================================
// Paste this in your browser console to test Supabase configuration

function testSupabaseConfig() {
    console.log('🔍 TESTING SUPABASE CONFIGURATION...');
    console.log('=====================================');
    
    // Check if Supabase is available
    console.log('1. Supabase availability:', typeof supabase !== 'undefined' ? '✅ Available' : '❌ Not available');
    
    // Check database connection variables
    console.log('2. _mode (cloud mode):', _mode);
    console.log('3. _db (database object):', _db ? '✅ Connected' : '❌ Not connected');
    
    // Check Supabase configuration
    if (typeof supabase !== 'undefined' && supabase.supabaseUrl) {
        console.log('4. Supabase URL:', supabase.supabaseUrl);
        console.log('5. API Key (first 20 chars):', supabase.supabaseKey ? supabase.supabaseKey.substring(0, 20) + '...' : 'Not found');
    }
    
    // Test direct API call
    console.log('\n6. Testing direct API call...');
    
    if (_db) {
        // Test with a simple count query
        _db.from('users')
            .select('id', { count: 'exact' })
            .then(function(result) {
                console.log('📊 Query result:', result);
                
                if (result.error) {
                    console.error('❌ Query failed:', result.error);
                    console.log('💡 Error details:');
                    console.log('   - Code:', result.error.code);
                    console.log('   - Message:', result.error.message);
                    console.log('   - Details:', result.error.details);
                } else {
                    console.log('✅ Query successful! User count:', result.count);
                    console.log('📋 Sample data:', result.data);
                }
            })
            .catch(function(error) {
                console.error('❌ Query exception:', error);
            });
    } else {
        console.log('❌ Cannot test - _db not available');
    }
    
    console.log('\n=====================================');
    console.log('🔧 TROUBLESHOOTING GUIDE:');
    console.log('- If API key error (401): Run the SQL fix script in Supabase dashboard');
    console.log('- If connection error: Check Supabase URL and API key');
    console.log('- If RLS error: Make sure Row Level Security is disabled');
    console.log('=====================================');
}

// Run the test
testSupabaseConfig();