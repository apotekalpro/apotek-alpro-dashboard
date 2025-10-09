// Temporary Admin Setup for Testing
// Run this in browser console to create a test admin user in localStorage

// Create temporary admin user
const tempAdmin = {
    id: 'temp-admin-123',
    email: 'admin@apotekal.com',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    status: 'active',
    employeeId: 'ADMIN001',
    manager: '',
    dateAdded: new Date().toISOString().split('T')[0],
    departmentAccess: ['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'adminConfig'],
    lastLogin: null,
    loginCount: 0
};

// Get existing user data or create new
let userData = JSON.parse(localStorage.getItem('userManagementData') || '{"users":[],"loginLogs":[],"filteredUsers":[],"filteredLogs":[],"currentUserPage":1,"currentLogPage":1,"usersPerPage":10,"logsPerPage":20}');

// Add admin if not exists
const existingAdmin = userData.users.find(u => u.email === 'admin@apotekal.com');
if (!existingAdmin) {
    userData.users.push(tempAdmin);
    userData.filteredUsers = [...userData.users];
    
    // Save to localStorage
    localStorage.setItem('userManagementData', JSON.stringify(userData));
    
    console.log('✅ Temporary admin user created!');
    console.log('📧 Email: admin@apotekal.com');
    console.log('🔑 Password: admin123');
    console.log('🔄 Please refresh the page to login');
} else {
    console.log('ℹ️ Admin user already exists');
}