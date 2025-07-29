-- Website Hunt Development Database Initialization
-- This script sets up the development database with sample data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Development sample data
INSERT INTO websites (url, points, is_conquered) VALUES
    ('https://dev.iiit.ac.in', 100, false),
    ('https://test.iiit.ac.in', 150, false),
    ('https://staging.iiit.ac.in', 120, false),
    ('https://demo.iiit.ac.in', 180, false),
    ('https://beta.iiit.ac.in', 140, false)
ON CONFLICT (url) DO NOTHING;

-- Create development admin user
INSERT INTO users (username, email, password, first_name, last_name, is_admin, is_google_auth) VALUES
    ('devadmin', 'dev@iiit.ac.in', crypt('devpass', gen_salt('bf')), 'Dev', 'Admin', true, false),
    ('testuser', 'test@iiit.ac.in', crypt('testpass', gen_salt('bf')), 'Test', 'User', false, false)
ON CONFLICT (username) DO NOTHING;

-- Create development team
INSERT INTO teams (name, captain_id, members, score) VALUES
    ('Dev Team', (SELECT id FROM users WHERE username = 'testuser'), ARRAY['testuser'], 0)
ON CONFLICT (name) DO NOTHING;