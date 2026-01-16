-- Initialize PostgreSQL schemas for ERP System
-- This script runs automatically when PostgreSQL container starts for the first time

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS common;

-- Grant privileges (optional, depends on your security requirements)
-- GRANT ALL PRIVILEGES ON SCHEMA auth TO erp_user;
-- GRANT ALL PRIVILEGES ON SCHEMA business TO erp_user;
-- GRANT ALL PRIVILEGES ON SCHEMA common TO erp_user;

