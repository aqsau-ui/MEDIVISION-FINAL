-- Migration Script: Replace gender column with country column
-- Date: 2026-02-19
-- Description: Updates users and pending_users tables to replace gender with country

USE medivision_db;

-- Step 1: Add country column to users table
ALTER TABLE users ADD COLUMN country VARCHAR(100) NULL AFTER date_of_birth;

-- Step 2: Migrate existing gender data (optional - set a default country for existing users)
-- You can update this based on your requirements
UPDATE users SET country = 'Pakistan' WHERE country IS NULL;

-- Step 3: Remove gender column from users table
ALTER TABLE users DROP COLUMN gender;

-- Step 4: Make country NOT NULL after migration
ALTER TABLE users MODIFY COLUMN country VARCHAR(100) NOT NULL;

-- Step 5: Add country column to pending_users table if it exists
ALTER TABLE pending_users ADD COLUMN country VARCHAR(100) NULL AFTER password;

-- Step 6: Update pending_users (if any exist)
UPDATE pending_users SET country = 'Pakistan' WHERE country IS NULL;

-- Step 7: Remove gender from pending_users
ALTER TABLE pending_users DROP COLUMN gender;

-- Step 8: Make country NOT NULL in pending_users
ALTER TABLE pending_users MODIFY COLUMN country VARCHAR(100) NOT NULL;

-- Verify changes
DESCRIBE users;
DESCRIBE pending_users;

-- Show sample data
SELECT id, full_name, email, country, city FROM users LIMIT 5;
