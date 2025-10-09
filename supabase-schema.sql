-- Apotek Alpro Dashboard - Supabase Database Schema
-- This file contains all the SQL to set up your cloud database

-- Enable UUID extension (for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Main user management
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  employee_id TEXT,
  manager TEXT,
  date_added DATE DEFAULT CURRENT_DATE,
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  last_password_change TIMESTAMP WITH TIME ZONE,
  department_access TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login logs table - Audit trail
CREATE TABLE login_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email TEXT NOT NULL,
  activity TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Department access configuration
CREATE TABLE department_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  departments TEXT[] NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_login_logs_user_email ON login_logs(user_email);
CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX idx_department_config_role ON department_config(role);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_config_updated_at BEFORE UPDATE ON department_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default department configuration
INSERT INTO department_config (role, departments) VALUES
('admin', ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'adminConfig']),
('manager', ARRAY['operations', 'ppm', 'strategy', 'finance']),
('user', ARRAY['operations']);

-- Row Level Security (RLS) policies for data protection
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your security needs)
-- Allow all operations for now (we'll secure this later if needed)
CREATE POLICY "Allow all operations for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for login_logs" ON login_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations for department_config" ON department_config FOR ALL USING (true);

-- Create a default admin user (you'll change this password immediately)
-- Password: 'admin123' (hashed with bcrypt)
INSERT INTO users (email, password_hash, name, role, status, department_access) VALUES
('admin@apotekal.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', 'active', ARRAY['operations', 'ppm', 'strategy', 'finance', 'bpt', 'procurement', 'warehouseApd', 'ppr', 'academy', 'adminConfig']);