-- Website Hunt PostgreSQL Initialization Script
-- This script sets up the initial database structure and sample data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Removed pgcrypto since we're not using PostgreSQL's crypt functions

-- Create database user if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'websitehunt_user'
    ) THEN
        CREATE ROLE websitehunt_user WITH LOGIN PASSWORD 'strongpassword';
    END IF;
END
$$;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE websitehunt TO websitehunt_user;
GRANT ALL ON SCHEMA public TO websitehunt_user;

-- Set default privileges for all future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO websitehunt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO websitehunt_user;

-- Create tables if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_google_auth BOOLEAN DEFAULT FALSE,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    captain_id UUID REFERENCES users(id),
    members TEXT[] NOT NULL,
    score INTEGER DEFAULT 0,
    websites_conquered INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT UNIQUE NOT NULL,
    domain TEXT NOT NULL,
    is_conquered BOOLEAN DEFAULT FALSE,
    conquered_by UUID REFERENCES teams(id),
    conquered_at TIMESTAMP,
    points INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conquests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id),
    website_id UUID REFERENCES websites(id),
    url TEXT NOT NULL,
    is_successful BOOLEAN NOT NULL,
    points INTEGER NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT NOT NULL DEFAULT 'waiting',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Insert sample IIIT websites
INSERT INTO websites (url, domain, points, is_conquered) VALUES
    ('https://www.iiit.ac.in', 'iiit.ac.in', 100, false),
    ('https://students.iiit.ac.in', 'students.iiit.ac.in', 150, false),
    ('https://faculty.iiit.ac.in', 'faculty.iiit.ac.in', 120, false),
    ('https://research.iiit.ac.in', 'research.iiit.ac.in', 180, false),
    ('https://admissions.iiit.ac.in', 'admissions.iiit.ac.in', 140, false),
    ('https://placements.iiit.ac.in', 'placements.iiit.ac.in', 160, false),
    ('https://library.iiit.ac.in', 'library.iiit.ac.in', 110, false),
    ('https://mess.iiit.ac.in', 'mess.iiit.ac.in', 90, false),
    ('https://sports.iiit.ac.in', 'sports.iiit.ac.in', 100, false),
    ('https://clubs.iiit.ac.in', 'clubs.iiit.ac.in', 130, false)
ON CONFLICT (url) DO NOTHING;

-- Admin user will be created programmatically by the Node.js application

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_captain_id ON teams(captain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conquests_team_id ON conquests(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conquests_website_id ON conquests(website_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_is_conquered ON websites(is_conquered);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Grant sequences usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO websitehunt_user;