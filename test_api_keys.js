// ========================================
// API KEY TESTING SCRIPT
// ========================================
// Run this in your browser console to test different API keys

function testAPIKeys() {
    console.log('🔐 API KEY TESTING UTILITY');
    console.log('==========================');
    
    // Get current configuration
    const currentURL = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'Not found';
    const currentKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : 'Not found';
    
    console.log('📍 Current Supabase URL:', currentURL);
    console.log('🔑 Current API Key (first 50 chars):', currentKey.substring(0, 50) + '...');
    console.log('');
    
    // Test current configuration
    console.log('🧪 Testing current configuration...');
    
    if (currentURL !== 'Not found' && currentKey !== 'Not found') {
        // Create a test client
        const testClient = supabase.createClient(currentURL, currentKey);
        
        testClient
            .from('users')
            .select('count', { count: 'exact' })
            .then(function(result) {
                if (result.error) {
                    console.error('❌ Current config failed:', result.error.message);
                    console.log('💡 Try these steps:');
                    console.log('   1. Check if you have the correct API keys from Supabase Dashboard');
                    console.log('   2. Try using service_role key instead of anon key');
                    console.log('   3. Verify the Supabase project URL is correct');
                } else {
                    console.log('✅ Current config works! User count:', result.count);
                }
            })
            .catch(function(error) {
                console.error('❌ Test failed:', error);
            });
    } else {
        console.log('❌ Configuration not found');
    }
    
    console.log('');
    console.log('🔧 TO FIX THIS ISSUE:');
    console.log('1. Go to Supabase Dashboard → Settings → API');
    console.log('2. Copy the service_role key (not anon key)');
    console.log('3. Replace SUPABASE_ANON_KEY in your code with service_role key');
    console.log('4. The service_role key has full database access and bypasses RLS');
}

// Function to test a specific API key
function testSpecificKey(url, key, keyType) {
    console.log(`🧪 Testing ${keyType} key...`);
    
    const testClient = supabase.createClient(url, key);
    
    return testClient
        .from('users')
        .select('count', { count: 'exact' })
        .then(function(result) {
            if (result.error) {
                console.error(`❌ ${keyType} key failed:`, result.error.message);
                return false;
            } else {
                console.log(`✅ ${keyType} key works! User count:`, result.count);
                return true;
            }
        })
        .catch(function(error) {
            console.error(`❌ ${keyType} key error:`, error);
            return false;
        });
}

// Run the test
testAPIKeys();