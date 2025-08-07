-- SGM Database Initialization Script
-- This script runs when PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance (these complement Prisma schema)
-- Note: Main tables are created by Prisma migrations

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- This script will be executed after Prisma migrations
-- Additional indexes can be added here for performance optimization