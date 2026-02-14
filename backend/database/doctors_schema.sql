-- Add doctors table to existing database
USE medivision_db;

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  cnic_number VARCHAR(20) NOT NULL,
  pmdc_number VARCHAR(50) UNIQUE NOT NULL,
  hospital_affiliation VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_pmdc (pmdc_number)
);

-- Show table structure
DESCRIBE doctors;
