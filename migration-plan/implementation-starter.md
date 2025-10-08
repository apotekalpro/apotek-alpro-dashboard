# Implementation Starter Guide

## Quick Start Template (Node.js + React)

### 1. Backend Setup (Express.js)

```bash
# Initialize backend
mkdir dashboard-backend && cd dashboard-backend
npm init -y

# Install dependencies
npm install express cors helmet morgan bcryptjs jsonwebtoken
npm install nodemailer pg pg-hstore sequelize
npm install express-rate-limit express-validator
npm install --save-dev nodemon

# Development dependencies
npm install --save-dev jest supertest
```

**Basic Express Server:**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Frontend Setup (React + Vite)

```bash
# Initialize frontend
npx create-vite@latest dashboard-frontend --template react
cd dashboard-frontend

# Install additional dependencies
npm install @tailwindcss/forms @heroicons/react
npm install axios react-router-dom zustand
npm install react-hot-toast framer-motion

# Setup Tailwind CSS
npx tailwindcss init -p
```

**App Structure:**
```javascript
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

### 3. Authentication Context
```javascript
// src/contexts/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token
      };
    case 'LOGIN_FAIL':
      return { ...state, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null, token: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null
  });

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.data.token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL', payload: error.response?.data?.message });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4. Migration Script for Current Users
```javascript
// scripts/migrate-users.js
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function migrateUsers() {
  const users = [];
  
  // Read your current CSV file
  fs.createReadStream('current-users.csv')
    .pipe(csv())
    .on('data', (row) => {
      users.push(row);
    })
    .on('end', async () => {
      for (const userData of users) {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          await User.create({
            email: userData.email,
            username: userData.username || userData.email.split('@')[0],
            password_hash: hashedPassword,
            role: userData.role,
            status: userData.status === 'active' ? 'active' : 'inactive',
            email_verified: true, // Assume existing users are verified
            first_name: userData.first_name || '',
            last_name: userData.last_name || ''
          });
          
          console.log(`Migrated user: ${userData.email}`);
        } catch (error) {
          console.error(`Error migrating ${userData.email}:`, error.message);
        }
      }
      console.log('Migration completed!');
    });
}

migrateUsers();
```

### 5. Environment Configuration
```bash
# backend/.env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/dashboard
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRE=7d

# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

```bash
# frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=Apotek Alpro Dashboard
```

### 6. Deployment Scripts
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting deployment..."

# Backend deployment
echo "📦 Building backend..."
cd backend
npm ci --production
npm run build

# Frontend deployment  
echo "🎨 Building frontend..."
cd ../frontend
npm ci
npm run build

# Database migration
echo "🗄️ Running database migrations..."
cd ../backend
npm run migrate

# Restart services
echo "🔄 Restarting services..."
pm2 restart dashboard-backend
sudo systemctl reload nginx

echo "✅ Deployment completed!"
```

### 7. Testing Setup
```javascript
// backend/tests/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Authentication', () => {
  test('Should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.message).toContain('Registration successful');
  });

  test('Should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

---

## Next Steps to Start

1. **Set up development environment:**
   ```bash
   git clone your-repo
   cd dashboard-project
   mkdir backend frontend
   ```

2. **Initialize both projects using the templates above**

3. **Set up local database:**
   ```bash
   createdb dashboard_dev
   psql dashboard_dev < migration-plan/database-schema.sql
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

5. **Begin migration of your current UI components to React**

This starter template provides a solid foundation that can be extended based on your specific needs!