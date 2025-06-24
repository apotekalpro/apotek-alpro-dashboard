# Setup & Deployment Guide

## 🚀 Quick Start

### **Prerequisites**
- **Python**: 3.8 or higher
- **Memory**: 4GB RAM minimum (8GB+ recommended)
- **Storage**: 2GB free space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+

## 🔧 Local Development Setup

### **Step 1: Clone and Setup**
```bash
# Clone repository
git clone https://github.com/your-org/invoice-payment-dashboard.git
cd invoice-payment-dashboard

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### **Step 2: Configuration**
```bash
# Copy configuration template
cp config/config.template.yaml config/config.yaml

# Create necessary directories
mkdir -p data logs backups
```

### **Step 3: Database Setup**
```bash
# Initialize SQLite database (default)
python scripts/init_database.py

# Verify setup
python -c "import sqlite3; print('Database ready!')"
```

### **Step 4: Launch Application**
```bash
# Start the dashboard
streamlit run app.py

# Access at: http://localhost:8501
```

## 🐳 Docker Deployment

### **Quick Docker Setup**
```bash
# Build and run
docker build -t invoice-dashboard .
docker run -p 8501:8501 -v $(pwd)/data:/app/data invoice-dashboard
```

### **Docker Compose (Recommended)**
```yaml
# docker-compose.yml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "8501:8501"
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/invoices
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: invoices
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Deploy with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f dashboard
```

## ☁️ Cloud Deployment

### **AWS EC2 Setup**
```bash
# Connect to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git nginx

# Clone and setup
git clone https://github.com/your-org/invoice-payment-dashboard.git
cd invoice-payment-dashboard
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure as systemd service
sudo cp deployment/invoice-dashboard.service /etc/systemd/system/
sudo systemctl enable invoice-dashboard
sudo systemctl start invoice-dashboard
```

### **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/invoice-dashboard
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8501;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/invoice-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🗄️ Database Configuration

### **SQLite (Default)**
```yaml
# config/config.yaml
database:
  type: "sqlite"
  path: "data/transactions.db"
```

### **PostgreSQL (Production)**
```yaml
database:
  type: "postgresql"
  host: "localhost"
  port: 5432
  database: "invoice_matching"
  username: "postgres"
  password: "your_password"
```

```bash
# PostgreSQL setup
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb invoice_matching
sudo -u postgres createuser invoice_user
python scripts/init_postgresql.py
```

### **MySQL**
```yaml
database:
  type: "mysql"
  host: "localhost"
  port: 3306
  database: "invoice_matching"
  username: "mysql_user"
  password: "your_password"
```

## 🔐 Security Configuration

### **Environment Variables**
```bash
# Create .env file
cat > .env << 'EOF'
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/invoices
ENCRYPTION_KEY=your-encryption-key-here
SMTP_USERNAME=your-email@company.com
SMTP_PASSWORD=your-app-password
EOF
```

### **Production Security**
```yaml
# config/config.yaml
security:
  authentication:
    enabled: true
    method: "database"
  ssl:
    enabled: true
    cert_path: "/path/to/certificate.crt"
    key_path: "/path/to/private.key"
```

## 📊 Performance Optimization

### **Basic Optimization**
```yaml
# config/config.yaml
performance:
  max_memory_usage: "2GB"
  chunk_size: 10000
  parallel_workers: 4
  cache_enabled: true
```

### **Database Optimization**
```sql
-- PostgreSQL indexes
CREATE INDEX idx_invoices_amount ON invoices(amount);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_customer_id ON invoices(customer_id);
```

## 🔍 Monitoring & Logging

### **Basic Logging**
```yaml
# config/config.yaml
logging:
  level: "INFO"
  file: "logs/app.log"
  max_size: 10485760  # 10MB
  backup_count: 5
```

### **Health Checks**
```bash
# Check application status
curl http://localhost:8501/health

# View logs
tail -f logs/app.log

# Monitor system resources
htop
```

## 🧪 Testing

```bash
# Run tests
pytest tests/ -v

# Run with coverage
pytest --cov=src tests/

# Load testing
python scripts/load_test.py
```

## 🆘 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Find and kill process
lsof -i :8501
kill -9 <PID>

# Use different port
streamlit run app.py --server.port 8502
```

#### **Database Connection Issues**
```bash
# Test database connection
python -c "
import sqlalchemy
engine = sqlalchemy.create_engine('your-database-url')
print('Connection successful!')
"
```

#### **Memory Issues**
```bash
# Monitor memory usage
free -h

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### **Permission Issues**
```bash
# Fix file permissions
chmod +x scripts/*.py
chown -R $USER:$USER data/ logs/
```

## 📚 Additional Resources

- **Configuration**: See `config/config.template.yaml` for all options
- **Features**: See [FEATURES.md](FEATURES.md) for detailed feature list
- **Business Logic**: See [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md) for matching algorithms
- **Performance**: See [PERFORMANCE.md](PERFORMANCE.md) for optimization guide

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/invoice-payment-dashboard/issues)
- **Documentation**: [Wiki](https://github.com/your-org/invoice-payment-dashboard/wiki)
- **Email**: support@yourcompany.com

---

**Quick Reference Commands:**
```bash
# Start development server
streamlit run app.py

# Run with Docker
docker-compose up -d

# Check logs
docker-compose logs -f dashboard

# Backup database
python scripts/backup_database.py

# Update application
git pull && pip install -r requirements.txt
```
