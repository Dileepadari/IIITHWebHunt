-- Website Hunt PostgreSQL initialization.
--
-- This file deliberately does NOT create application tables. The schema is owned
-- by Drizzle (shared/schema.ts) and applied with `npm run db:push` on startup;
-- the previous version of this script declared its own copy of every table with
-- different column types, so the two definitions drifted apart the moment either
-- changed. Here we only prepare things Drizzle cannot: extensions and roles.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- provides gen_random_uuid()

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'websitehunt_user') THEN
        CREATE ROLE websitehunt_user WITH LOGIN PASSWORD 'strongpassword';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE websitehunt TO websitehunt_user;
GRANT ALL ON SCHEMA public TO websitehunt_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO websitehunt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO websitehunt_user;
