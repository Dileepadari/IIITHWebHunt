# Complete Local Deployment Guide

This guide provides step-by-step instructions for setting up the Website Hunt game platform locally from scratch.

## Prerequisites

### System Requirements
- **Node.js**: Version 20.x or higher
- **PostgreSQL**: Version 14.x or higher
- **Git**: Latest version
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### Development Tools (Recommended)
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - PostgreSQL (for database management)

## Step-by-Step Setup

### 1. Install Prerequisites

#### On Windows:
```powershell
# Install Node.js from https://nodejs.org/
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Install Git from https://git-scm.com/download/win

# Verify installations
node --version
npm --version
psql --version
git --version
```

#### On macOS:
```bash
# Using Homebrew
brew install node postgresql git

# Start PostgreSQL service
brew services start postgresql

# Verify installations
node --version
npm --version
psql --version
git --version
```

#### On Linux (Ubuntu/Debian):
```bash
# Update package manager
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Git
sudo apt-get install -y git

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installations
node --version
npm --version
psql --version
git --version
```

### 2. Database Setup

#### Create Database and User
```bash
# Switch to postgres user (Linux/macOS)
sudo -u postgres psql

# Or connect directly (Windows/if postgres user setup)
psql -U postgres
```

```sql
-- Create database
CREATE DATABASE website_hunt;

-- Create user with password
CREATE USER hunt_admin WITH PASSWORD 'secure_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE website_hunt TO hunt_admin;

-- Exit psql
\q
```

#### Test Database Connection
```bash
psql -U hunt_admin -d website_hunt -h localhost -W
```

### 3. Project Setup

#### Clone Repository
```bash
# Clone the project
git clone <your-repository-url>
cd website-hunt-game

# Or if starting fresh, create the project structure
mkdir website-hunt-game
cd website-hunt-game
```

#### Install Dependencies
```bash
# Install all project dependencies
npm install

# If you encounter permission issues on Linux/macOS:
sudo npm install -g npm@latest
npm install
```

### 4. Environment Configuration

#### Create Environment File
Create a `.env` file in the project root:

```bash
# Create .env file
touch .env  # Linux/macOS
# Or manually create on Windows
```

#### Configure Environment Variables
Edit `.env` file with your database configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://hunt_admin:secure_password_123@localhost:5432/website_hunt"
PGHOST="localhost"
PGPORT="5432"
PGUSER="hunt_admin"
PGPASSWORD="secure_password_123"
PGDATABASE="website_hunt"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# Development Configuration
NODE_ENV="development"

# Replit Auth Configuration (for local development, these can be placeholder)
REPL_ID="local-development"
ISSUER_URL="https://replit.com/oidc"
REPLIT_DOMAINS="localhost:5000"
```

### 5. Database Schema Setup

#### Push Database Schema
```bash
# Initialize database with schema
npm run db:push

# Expected output:
# > rest-express@1.0.0 db:push
# > drizzle-kit push
# 
# [✓] Pulling schema from database...
# [✓] Changes applied successfully!
```

#### Verify Database Setup
```bash
# Open database studio (optional)
npm run db:studio

# Or verify with direct SQL
psql -U hunt_admin -d website_hunt -c "\dt"
```

### 6. Initial Data Setup

#### Create Admin User (Required)
Since authentication is handled by Replit, for local development you'll need to:

1. **Start the application first**:
   ```bash
   npm run dev
   ```

2. **Access the app** at `http://localhost:5000`

3. **Login with Replit** (or skip auth for local dev by modifying the code)

4. **Set admin privileges** in database:
   ```sql
   -- Connect to database
   psql -U hunt_admin -d website_hunt
   
   -- Find your user ID (after first login)
   SELECT id, email, "firstName", "lastName", "isAdmin" FROM users;
   
   -- Set admin privileges
   UPDATE users SET "isAdmin" = true WHERE email = 'your-email@example.com';
   
   -- Verify
   SELECT id, email, "isAdmin" FROM users WHERE "isAdmin" = true;
   ```

#### Add Sample Data (Optional)
```sql
-- Add sample websites for testing
INSERT INTO websites (url, domain, points) VALUES 
('https://www.iiit.ac.in', 'www.iiit.ac.in', 100),
('https://students.iiit.ac.in', 'students.iiit.ac.in', 100),
('https://academics.iiit.ac.in', 'academics.iiit.ac.in', 100),
('https://research.iiit.ac.in', 'research.iiit.ac.in', 100);

-- Add sample team
INSERT INTO teams (name, members, score) VALUES 
('Sample Team', ARRAY['Alice', 'Bob', 'Charlie'], 0);
```

### 7. Start Development Server

#### Run the Application
```bash
# Start development server
npm run dev

# Expected output:
# > rest-express@1.0.0 dev
# > NODE_ENV=development tsx server/index.ts
# [timestamp] PM [express] serving on port 5000
```

#### Verify Everything Works
1. **Open browser** to `http://localhost:5000`
2. **Check WebSocket connection** (look for WebSocket messages in browser console)
3. **Test API endpoints** using browser network tab
4. **Login and access admin panel**

### 8. Production Build (Optional)

#### Build for Production
```bash
# Create production build
npm run build

# Start production server
npm start
```

### 9. Common Issues and Solutions

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
# Linux/macOS:
sudo systemctl status postgresql
# Or
brew services list | grep postgres

# Windows:
# Check Services app for PostgreSQL service

# Test connection manually
psql -U hunt_admin -d website_hunt -h localhost
```

#### Port Already in Use
```bash
# Find process using port 5000
# Linux/macOS:
lsof -i :5000

# Windows:
netstat -ano | findstr :5000

# Kill the process if needed
# Linux/macOS:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F
```

#### Permission Issues
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Clear npm cache
npm cache clean --force
```

#### Missing Dependencies
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

### 10. Development Workflow

#### Daily Development
```bash
# 1. Start database (if not running)
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# 2. Start development server
npm run dev

# 3. Make changes to code
# 4. Test in browser
# 5. Check database with:
npm run db:studio
```

#### Database Management
```bash
# View current schema
npm run db:studio

# Reset database (careful!)
psql -U hunt_admin -d website_hunt -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run db:push

# Backup database
pg_dump -U hunt_admin -h localhost website_hunt > backup.sql

# Restore database
psql -U hunt_admin -h localhost website_hunt < backup.sql
```

## Security Notes for Production

1. **Change default passwords** in production
2. **Use environment-specific secrets** for SESSION_SECRET
3. **Configure proper PostgreSQL user permissions**
4. **Set up SSL/TLS** for database connections
5. **Use proper Replit Auth configuration** with real domain
6. **Implement rate limiting** and other security measures

## Getting Help

If you encounter issues:

1. **Check the logs** in terminal where `npm run dev` is running
2. **Check browser console** for frontend errors
3. **Verify database connection** with direct psql commands
4. **Check port availability** if server won't start
5. **Review environment variables** in `.env` file

For additional support, refer to the main README.md file or create an issue in the repository.