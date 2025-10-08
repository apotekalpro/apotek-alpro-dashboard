# Executive Dashboard API Specifications

## Authentication Endpoints

### POST /api/auth/register
**Description:** User registration with email verification
```json
{
  "email": "user@example.com",
  "username": "john_doe", 
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "operations" // Set by admin, default: operations
}
```
**Response:**
```json
{
  "message": "Registration successful. Please check your email for verification.",
  "user_id": 123
}
```

### POST /api/auth/login
**Description:** User authentication
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response:**
```json
{
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here", 
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "operations",
    "first_name": "John",
    "last_name": "Doe"
  },
  "expires_in": 3600
}
```

### POST /api/auth/refresh
**Description:** Refresh access token
```json
{
  "refresh_token": "refresh_token_here"
}
```

### POST /api/auth/logout
**Description:** Logout and invalidate tokens
**Headers:** Authorization: Bearer {token}

### POST /api/auth/forgot-password
**Description:** Request password reset
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password
**Description:** Reset password with token
```json
{
  "token": "reset_token",
  "new_password": "newSecurePassword123"
}
```

### GET /api/auth/verify-email/{token}
**Description:** Verify email address

---

## User Management Endpoints (Admin Only)

### GET /api/users
**Description:** Get all users with pagination
**Query Params:** page, limit, role, status, search
**Headers:** Authorization: Bearer {admin_token}

### POST /api/users
**Description:** Create new user (admin)
```json
{
  "email": "newuser@example.com",
  "username": "new_user",
  "password": "tempPassword123",
  "first_name": "New",
  "last_name": "User",
  "role": "finance",
  "status": "active",
  "send_invitation": true
}
```

### PUT /api/users/{id}
**Description:** Update user details
```json
{
  "role": "manager",
  "status": "inactive",
  "first_name": "Updated Name"
}
```

### DELETE /api/users/{id}
**Description:** Delete user account

---

## Dashboard Endpoints

### GET /api/dashboard/tabs
**Description:** Get accessible tabs based on user role
**Headers:** Authorization: Bearer {token}
**Response:**
```json
{
  "tabs": [
    {
      "id": "operations",
      "name": "Operations", 
      "icon": "fas fa-cogs",
      "accessible": true,
      "subtabs": [
        {"id": "outlet", "name": "Outlet Dashboard"},
        {"id": "opps-ed", "name": "OPPS ED Project"}
      ]
    }
  ]
}
```

### GET /api/dashboard/user-info
**Description:** Get current user information
**Headers:** Authorization: Bearer {token}
**Response:**
```json
{
  "user": {
    "email": "user@example.com",
    "role": "operations",
    "full_name": "John Doe",
    "last_login": "2023-10-08T10:30:00Z",
    "ip_address": "192.168.1.1"
  }
}
```

---

## System Administration

### GET /api/admin/audit-logs
**Description:** Get system audit logs
**Headers:** Authorization: Bearer {admin_token}
**Query Params:** user_id, action, start_date, end_date

### POST /api/admin/settings
**Description:** Update system settings
```json
{
  "setting_key": "max_login_attempts",
  "setting_value": "5"
}
```

### GET /api/admin/dashboard-stats
**Description:** Get dashboard usage statistics
**Headers:** Authorization: Bearer {admin_token}

---

## Security Features

### Rate Limiting
- Login attempts: 5 per 15 minutes per IP
- Registration: 3 per hour per IP
- Password reset: 3 per hour per email

### JWT Configuration
- Access token expiry: 1 hour
- Refresh token expiry: 7 days  
- Token rotation on refresh

### Password Policy
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Optional: special character requirement

### Email Templates
- Welcome email with verification
- Password reset instructions
- Account status change notifications
- Security alerts (login from new IP)