-- Add doctor digital signature support
USE medivision_db;

-- Add signature path column to doctors table
ALTER TABLE doctors ADD COLUMN doctor_signature_path VARCHAR(500) NULL;

-- Show updated table structure
DESCRIBE doctors;
