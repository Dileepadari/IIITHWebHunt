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
    ('https://admportal-db.iiit.ac.in', 'admportal-db.iiit.ac.in', 120, false),
    ('https://admportal.iiit.ac.in', 'admportal.iiit.ac.in', 150, false),
    ('https://admissions.iiit.ac.in', 'admissions.iiit.ac.in', 200, false),
    ('https://alumni.iiit.ac.in', 'alumni.iiit.ac.in', 130, false),
    ('https://alphagrep.iiit.ac.in', 'alphagrep.iiit.ac.in', 100, false),
    ('https://antivirus.iiit.ac.in', 'antivirus.iiit.ac.in', 110, false),
    ('https://apex.github.io', 'apex.github.io', 10, false),
    ('https://apps.iiit.ac.in', 'apps.iiit.ac.in', 130, false),
    ('https://assets.iiit.ac.in', 'assets.iiit.ac.in', 100, false),
    ('https://auth.iiit.ac.in', 'auth.iiit.ac.in', 160, false),
    ('https://backup.iiit.ac.in', 'backup.iiit.ac.in', 110, false),
    ('https://banners.iiit.ac.in', 'banners.iiit.ac.in', 100, false),
    ('https://blogs-dev.iiit.ac.in', 'blogs-dev.iiit.ac.in', 90, false),
    ('https://blogs.iiit.ac.in', 'blogs.iiit.ac.in', 120, false),
    ('https://calendar.iiit.ac.in', 'calendar.iiit.ac.in', 130, false),
    ('https://cdith.iiit.ac.in', 'cdith.iiit.ac.in', 100, false),
    ('https://cdn.iiit.ac.in', 'cdn.iiit.ac.in', 130, false),
    ('https://certificates.iiit.ac.in', 'certificates.iiit.ac.in', 120, false),
    ('https://chat.iiit.ac.in', 'chat.iiit.ac.in', 110, false),
    ('https://check.iiit.ac.in', 'check.iiit.ac.in', 100, false),
    ('https://cloud.iiit.ac.in', 'cloud.iiit.ac.in', 150, false),
    ('https://clubs.iiit.ac.in', 'clubs.iiit.ac.in', 120, false),
    ('https://code.iiit.ac.in', 'code.iiit.ac.in', 130, false),
    ('https://conference.iiit.ac.in', 'conference.iiit.ac.in', 120, false),
    ('https://consent.iiit.ac.in', 'consent.iiit.ac.in', 100, false),
    ('https://courses-db.iiit.ac.in', 'courses-db.iiit.ac.in', 120, false),
    ('https://courses.iiit.ac.in', 'courses.iiit.ac.in', 200, false),
    ('https://cricket.iiit.ac.in', 'cricket.iiit.ac.in', 80, false),
    ('https://csg-dev.iiit.ac.in', 'csg-dev.iiit.ac.in', 90, false),
    ('https://csg.iiit.ac.in', 'csg.iiit.ac.in', 130, false),
    ('https://data.iiit.ac.in', 'data.iiit.ac.in', 140, false),
    ('https://datasets.iiit.ac.in', 'datasets.iiit.ac.in', 130, false),
    ('https://db.iiit.ac.in', 'db.iiit.ac.in', 100, false),
    ('https://debug.iiit.ac.in', 'debug.iiit.ac.in', 80, false),
    ('https://demo.iiit.ac.in', 'demo.iiit.ac.in', 90, false),
    ('https://dev.iiit.ac.in', 'dev.iiit.ac.in', 100, false),
    ('https://dhcp.iiit.ac.in', 'dhcp.iiit.ac.in', 110, false),
    ('https://dialin.iiit.ac.in', 'dialin.iiit.ac.in', 100, false),
    ('https://docs-test.iiit.ac.in', 'docs-test.iiit.ac.in', 100, false),
    ('https://docs.iiit.ac.in', 'docs.iiit.ac.in', 140, false),
    ('https://dorms.iiit.ac.in', 'dorms.iiit.ac.in', 120, false),
    ('https://downloads.iiit.ac.in', 'downloads.iiit.ac.in', 110, false),
    ('https://dr.iiit.ac.in', 'dr.iiit.ac.in', 110, false),
    ('https://dualdegree.iiit.ac.in', 'dualdegree.iiit.ac.in', 120, false),
    ('https://eduroam-dev.iiit.ac.in', 'eduroam-dev.iiit.ac.in', 90, false),
    ('https://eduroam.iiit.ac.in', 'eduroam.iiit.ac.in', 140, false),
    ('https://election.iiit.ac.in', 'election.iiit.ac.in', 100, false),
    ('https://eng.iiit.ac.in', 'eng.iiit.ac.in', 100, false),
    ('https://engineering.iiit.ac.in', 'engineering.iiit.ac.in', 110, false),
    ('https://events.iiit.ac.in', 'events.iiit.ac.in', 130, false),
    ('https://elearn.iiit.ac.in', 'elearn.iiit.ac.in', 180, false),
    ('https://exam.iiit.ac.in', 'exam.iiit.ac.in', 120, false),
    ('https://exams.iiit.ac.in', 'exams.iiit.ac.in', 130, false),
    ('https://faculty.iiit.ac.in', 'faculty.iiit.ac.in', 150, false),
    ('https://felicity-sysad.iiit.ac.in', 'felicity-sysad.iiit.ac.in', 110, false),
    ('https://felicity.iiit.ac.in', 'felicity.iiit.ac.in', 160, false),
    ('https://files.iiit.ac.in', 'files.iiit.ac.in', 120, false),
    ('https://firewall.iiit.ac.in', 'firewall.iiit.ac.in', 110, false),
    ('https://forms.iiit.ac.in', 'forms.iiit.ac.in', 130, false),
    ('https://ftp.iiit.ac.in', 'ftp.iiit.ac.in', 100, false),
    ('https://g-hub.iiit.ac.in', 'g-hub.iiit.ac.in', 150, false),
    ('https://gallery.iiit.ac.in', 'gallery.iiit.ac.in', 120, false),
    ('https://git.iiit.ac.in', 'git.iiit.ac.in', 160, false),
    ('https://gitlab.iiit.ac.in', 'gitlab.iiit.ac.in', 140, false),
    ('https://gk.iiit.ac.in', 'gk.iiit.ac.in', 80, false),
    ('https://gw1-test.iiit.ac.in', 'gw1-test.iiit.ac.in', 80, false),
    ('https://help.iiit.ac.in', 'help.iiit.ac.in', 130, false),
    ('https://helpdesk.iiit.ac.in', 'helpdesk.iiit.ac.in', 140, false),
    ('https://home.iiit.ac.in', 'home.iiit.ac.in', 120, false),
    ('https://hr.iiit.ac.in', 'hr.iiit.ac.in', 110, false),
    ('https://ihub.iiit.ac.in', 'ihub.iiit.ac.in', 150, false),
    ('https://ims.iiit.ac.in', 'ims.iiit.ac.in', 140, false),
    ('https://iiit-new.iiit.ac.in', 'iiit-new.iiit.ac.in', 100, false),
    ('https://ims-extr.iiit.ac.in', 'ims-extr.iiit.ac.in', 130, false),
    ('https://ims-mess.iiit.ac.in', 'ims-mess.iiit.ac.in', 110, false),
    ('https://ims-proxy.iiit.ac.in', 'ims-proxy.iiit.ac.in', 120, false),
    ('https://ims-test.iiit.ac.in', 'ims-test.iiit.ac.in', 100, false),
    ('https://intranet.iiit.ac.in', 'intranet.iiit.ac.in', 150, false),
    ('https://irb.iiit.ac.in', 'irb.iiit.ac.in', 150, false),
    ('https://jobs.iiit.ac.in', 'jobs.iiit.ac.in', 140, false),
    ('https://ldap-balancer1.iiit.ac.in', 'ldap-balancer1.iiit.ac.in', 120, false),
    ('https://ldap-loadbalancer1.iiit.ac.in', 'ldap-loadbalancer1.iiit.ac.in', 120, false),
    ('https://ldap-loadbalancer2.iiit.ac.in', 'ldap-loadbalancer2.iiit.ac.in', 120, false),
    ('https://ldap-new2.iiit.ac.in', 'ldap-new2.iiit.ac.in', 120, false),
    ('https://ldap4.iiit.ac.in', 'ldap4.iiit.ac.in', 120, false),
    ('https://ldap5.iiit.ac.in', 'ldap5.iiit.ac.in', 120, false),
    ('https://librenms.iiit.ac.in', 'librenms.iiit.ac.in', 160, false),
    ('https://library.iiit.ac.in', 'library.iiit.ac.in', 200, false),
    ('https://life.iiit.ac.in', 'life.iiit.ac.in', 140, false),
    ('https://lists-dev.iiit.ac.in', 'lists-dev.iiit.ac.in', 100, false),
    ('https://lists.iiit.ac.in', 'lists.iiit.ac.in', 130, false),
    ('https://login.iiit.ac.in', 'login.iiit.ac.in', 180, false),
    ('https://lms.iiit.ac.in', 'lms.iiit.ac.in', 160, false),
    ('https://ltrc.iiit.ac.in', 'ltrc.iiit.ac.in', 100, false),
    ('https://mail.iiit.ac.in', 'mail.iiit.ac.in', 180, false),
    ('https://maildev.iiit.ac.in', 'maildev.iiit.ac.in', 90, false),
    ('https://moodle.iiit.ac.in', 'moodle.iiit.ac.in', 170, false),
    ('https://monitor.iiit.ac.in', 'monitor.iiit.ac.in', 150, false),
    ('https://nagios2-beta.iiit.ac.in', 'nagios2-beta.iiit.ac.in', 130, false),
    ('https://nagios.iiit.ac.in', 'nagios.iiit.ac.in', 150, false),
    ('https://network.iiit.ac.in', 'network.iiit.ac.in', 120, false),
    ('https://nilgiri.iiit.ac.in', 'nilgiri.iiit.ac.in', 110, false),
    ('https://nocs.iiit.ac.in', 'nocs.iiit.ac.in', 140, false),
    ('https://nwcsb2025.iiit.ac.in', 'nwcsb2025.iiit.ac.in', 100, false),
    ('https://oauth.iiit.ac.in', 'oauth.iiit.ac.in', 150, false),
    ('https://office-docs.iiit.ac.in', 'office-docs.iiit.ac.in', 140, false),
    ('https://onlineedu.iiit.ac.in', 'onlineedu.iiit.ac.in', 130, false),
    ('https://osdg.iiit.ac.in', 'osdg.iiit.ac.in', 150, false),
    ('https://outreach.iiit.ac.in', 'outreach.iiit.ac.in', 130, false),
    ('https://packer.iiit.ac.in', 'packer.iiit.ac.in', 100, false),
    ('https://people.iiit.ac.in', 'people.iiit.ac.in', 140, false),
    ('https://pflogs.iiit.ac.in', 'pflogs.iiit.ac.in', 200, false),
    ('https://phonebook.iiit.ac.in', 'phonebook.iiit.ac.in', 130, false),
    ('https://photos.iiit.ac.in', 'photos.iiit.ac.in', 120, false),
    ('https://policy-docs.iiit.ac.in', 'policy-docs.iiit.ac.in', 120, false),
    ('https://portal.iiit.ac.in', 'portal.iiit.ac.in', 180, false),
    ('https://portals.iiit.ac.in', 'portals.iiit.ac.in', 140, false),
    ('https://postgres.iiit.ac.in', 'postgres.iiit.ac.in', 100, false),
    ('https://print.iiit.ac.in', 'print.iiit.ac.in', 110, false),
    ('https://prx.iiit.ac.in', 'prx.iiit.ac.in', 130, false),
    ('https://proxy.iiit.ac.in', 'proxy.iiit.ac.in', 150, false),
    ('https://proxypass.iiit.ac.in', 'proxypass.iiit.ac.in', 160, false),
    ('https://proxypass2.iiit.ac.in', 'proxypass2.iiit.ac.in', 160, false),
    ('https://public.iiit.ac.in', 'public.iiit.ac.in', 100, false),
    ('https://puppet.iiit.ac.in', 'puppet.iiit.ac.in', 110, false),
    ('https://pwsh.iiit.ac.in', 'pwsh.iiit.ac.in', 120, false),
    ('https://quiz.iiit.ac.in', 'quiz.iiit.ac.in', 110, false),
    ('https://radio.iiit.ac.in', 'radio.iiit.ac.in', 80, false),
    ('https://research.iiit.ac.in', 'research.iiit.ac.in', 180, false),
    ('https://resources.iiit.ac.in', 'resources.iiit.ac.in', 130, false),
    ('https://reverseproxy-dev.iiit.ac.in', 'reverseproxy-dev.iiit.ac.in', 90, false),
    ('https://saml.iiit.ac.in', 'saml.iiit.ac.in', 140, false),
    ('https://scrape-proxy.iiit.ac.in', 'scrape-proxy.iiit.ac.in', 110, false),
    ('https://secure.iiit.ac.in', 'secure.iiit.ac.in', 130, false),
    ('https://selfservice.iiit.ac.in', 'selfservice.iiit.ac.in', 140, false),
    ('https://server.iiit.ac.in', 'server.iiit.ac.in', 100, false),
    ('https://services.iiit.ac.in', 'services.iiit.ac.in', 140, false),
    ('https://signup.iiit.ac.in', 'signup.iiit.ac.in', 120, false),
    ('https://slc-tech.iiit.ac.in', 'slc-tech.iiit.ac.in', 100, false),
    ('https://sms.iiit.ac.in', 'sms.iiit.ac.in', 110, false),
    ('https://ssh.iiit.ac.in', 'ssh.iiit.ac.in', 130, false),
    ('https://staff.iiit.ac.in', 'staff.iiit.ac.in', 120, false),
    ('https://staging.iiit.ac.in', 'staging.iiit.ac.in', 90, false),
    ('https://stats.iiit.ac.in', 'stats.iiit.ac.in', 130, false),
    ('https://storage.iiit.ac.in', 'storage.iiit.ac.in', 140, false),
    ('https://students.iiit.ac.in', 'students.iiit.ac.in', 200, false),
    ('https://subversion.iiit.ac.in', 'subversion.iiit.ac.in', 100, false),
    ('https://sysad-tracker.iiit.ac.in', 'sysad-tracker.iiit.ac.in', 130, false),
    ('https://talk.iiit.ac.in', 'talk.iiit.ac.in', 110, false),
    ('https://teleport.iiit.ac.in', 'teleport.iiit.ac.in', 150, false),
    ('https://test.iiit.ac.in', 'test.iiit.ac.in', 90, false),
    ('https://tickets.iiit.ac.in', 'tickets.iiit.ac.in', 130, false),
    ('https://tto.iiit.ac.in', 'tto.iiit.ac.in', 150, false),
    ('https://vault.iiit.ac.in', 'vault.iiit.ac.in', 160, false),
    ('https://video.iiit.ac.in', 'video.iiit.ac.in', 140, false),
    ('https://videos.iiit.ac.in', 'videos.iiit.ac.in', 130, false),
    ('https://viswam.iiit.ac.in', 'viswam.iiit.ac.in', 100, false),
    ('https://vpn-dev.iiit.ac.in', 'vpn-dev.iiit.ac.in', 90, false),
    ('https://vpn-extern.iiit.ac.in', 'vpn-extern.iiit.ac.in', 140, false),
    ('https://vpn.iiit.ac.in', 'vpn.iiit.ac.in', 180, false),
    ('https://webcmc.iiit.ac.in', 'webcmc.iiit.ac.in', 120, false),
    ('https://whitepapers.iiit.ac.in', 'whitepapers.iiit.ac.in', 140, false),
    ('https://wiki.iiit.ac.in', 'wiki.iiit.ac.in', 150, false),
    ('https://www.iiit.ac.in', 'www.iiit.ac.in', 250, false),
    ('https://zimbra.iiit.ac.in', 'zimbra.iiit.ac.in', 150, false),
    ('https://zoom.iiit.ac.in', 'zoom.iiit.ac.in', 140, false)
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