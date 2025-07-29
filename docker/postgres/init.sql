-- Website Hunt PostgreSQL Initialization Script
-- This script sets up the initial database structure and sample data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database user if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'websitehunt_user') THEN
        CREATE ROLE websitehunt_user WITH LOGIN PASSWORD 'secure_password_change_in_production';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE websitehunt TO websitehunt_user;
GRANT ALL ON SCHEMA public TO websitehunt_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO websitehunt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO websitehunt_user;

-- Sample IIIT websites for the game (you can modify this list)
INSERT INTO websites (url, points, is_conquered) VALUES
    ('https://www.iiit.ac.in', 100, false),
    ('https://students.iiit.ac.in', 150, false),
    ('https://faculty.iiit.ac.in', 120, false),
    ('https://research.iiit.ac.in', 180, false),
    ('https://admissions.iiit.ac.in', 140, false),
    ('https://placements.iiit.ac.in', 160, false),
    ('https://library.iiit.ac.in', 110, false),
    ('https://mess.iiit.ac.in', 90, false),
    ('https://sports.iiit.ac.in', 100, false),
    ('https://clubs.iiit.ac.in', 130, false)
ON CONFLICT (url) DO NOTHING;

-- Create an admin user (change password in production)
INSERT INTO users (username, email, password, first_name, last_name, is_admin, is_google_auth) VALUES
    ('admin', 'admin@iiit.ac.in', crypt('admin123', gen_salt('bf')), 'System', 'Administrator', true, false)
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_captain_id ON teams(captain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conquests_team_id ON conquests(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conquests_website_id ON conquests(website_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websites_is_conquered ON websites(is_conquered);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Grant sequences permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO websitehunt_user;