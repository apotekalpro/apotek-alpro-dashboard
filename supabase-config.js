// Supabase Configuration and Helper Functions
// Replace the localStorage functionality with cloud database

// Supabase client setup - YOU NEED TO ADD YOUR CREDENTIALS HERE
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon public key

// Import Supabase client (we'll add this to your HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase;

// Initialize Supabase client
function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include the Supabase CDN script.');
        return false;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
    return true;
}

// Password hashing utility (simple for now, you can enhance later)
function hashPassword(password) {
    // For production, use proper bcrypt or similar
    // For now, using a simple hash (you should upgrade this)
    return btoa(password + 'salt_apotek_alpro_2024');
}

// Cloud-based User Management Functions
const CloudUserManager = {
    
    // Load all users from Supabase
    async loadUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            console.log('✅ Loaded', data.length, 'users from cloud');
            return data || [];
        } catch (error) {
            console.error('❌ Error loading users:', error);
            return [];
        }
    },
    
    // Authenticate user
    async authenticateUser(email, password) {
        try {
            const passwordHash = hashPassword(password);
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('password_hash', passwordHash)
                .eq('status', 'active')
                .single();
            
            if (error || !data) {
                console.log('❌ Authentication failed for:', email);
                return null;
            }
            
            // Update login statistics
            await supabase
                .from('users')
                .update({
                    last_login: new Date().toISOString(),
                    login_count: (data.login_count || 0) + 1
                })
                .eq('id', data.id);
            
            // Log successful login
            await this.logActivity(email, 'login', {
                loginCount: (data.login_count || 0) + 1,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ User authenticated:', email);
            return {
                email: data.email,
                role: data.role,
                name: data.name,
                id: data.id
            };
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return null;
        }
    },
    
    // Create new user
    async createUser(userData) {
        try {
            const newUser = {
                email: userData.email.toLowerCase(),
                password_hash: hashPassword(userData.password),
                name: userData.name,
                role: userData.role || 'user',
                status: userData.status || 'active',
                employee_id: userData.employeeId || null,
                manager: userData.manager || null,
                date_added: userData.dateAdded || new Date().toISOString().split('T')[0],
                department_access: userData.departmentAccess || []
            };
            
            const { data, error } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ User created:', data.email);
            return data;
            
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    },
    
    // Update existing user
    async updateUser(userId, updates) {
        try {
            // Hash password if it's being updated
            if (updates.password) {
                updates.password_hash = hashPassword(updates.password);
                delete updates.password;
            }
            
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ User updated:', data.email);
            return data;
            
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    },
    
    // Delete user
    async deleteUser(userId) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            
            console.log('✅ User deleted');
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return false;
        }
    },
    
    // Change user password
    async changePassword(email, currentPassword, newPassword) {
        try {
            const currentHash = hashPassword(currentPassword);
            const newHash = hashPassword(newPassword);
            
            // Verify current password and update
            const { data, error } = await supabase
                .from('users')
                .update({
                    password_hash: newHash,
                    last_password_change: new Date().toISOString()
                })
                .eq('email', email.toLowerCase())
                .eq('password_hash', currentHash)
                .select()
                .single();
            
            if (error || !data) {
                console.log('❌ Password change failed - incorrect current password');
                return false;
            }
            
            // Log password change
            await this.logActivity(email, 'password_changed', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            
            console.log('✅ Password changed for:', email);
            return true;
            
        } catch (error) {
            console.error('❌ Error changing password:', error);
            return false;
        }
    },
    
    // Log user activity
    async logActivity(userEmail, activity, metadata = {}) {
        try {
            const logEntry = {
                user_email: userEmail,
                activity: activity,
                ip_address: 'localhost', // We simplified IP tracking
                user_agent: metadata.userAgent || navigator.userAgent,
                metadata: metadata
            };
            
            const { error } = await supabase
                .from('login_logs')
                .insert([logEntry]);
            
            if (error) throw error;
            
            console.log('📝 Activity logged:', activity, 'for', userEmail);
            
        } catch (error) {
            console.error('❌ Error logging activity:', error);
        }
    },
    
    // Load activity logs
    async loadActivityLogs(limit = 100) {
        try {
            const { data, error } = await supabase
                .from('login_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('❌ Error loading activity logs:', error);
            return [];
        }
    },
    
    // Load department configuration
    async loadDepartmentConfig() {
        try {
            const { data, error } = await supabase
                .from('department_config')
                .select('*');
            
            if (error) throw error;
            
            const config = {};
            data.forEach(item => {
                config[item.role] = item.departments;
            });
            
            return config;
            
        } catch (error) {
            console.error('❌ Error loading department config:', error);
            return {};
        }
    }
};

// Export localStorage data (for migration)
function exportLocalStorageData() {
    const data = {
        userManagementData: JSON.parse(localStorage.getItem('userManagementData') || '{"users":[],"loginLogs":[]}'),
        departmentAccessConfig: JSON.parse(localStorage.getItem('departmentAccessConfig') || '{}'),
        loginLogs: JSON.parse(localStorage.getItem('loginLogs') || '[]')
    };
    
    console.log('📊 Local storage data:', data);
    return data;
}

console.log('📦 Supabase integration loaded. Call initSupabase() to connect.');