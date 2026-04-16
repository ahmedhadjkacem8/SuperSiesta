-- ============================================================
-- SuperSiesta — MySQL Initialisation Script
-- Runs once on first container start (empty data volume)
-- ============================================================

-- Ensure the database exists with proper charset
CREATE DATABASE IF NOT EXISTS `SuperSiestaDB`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to the application user
GRANT ALL PRIVILEGES ON `SuperSiestaDB`.* TO 'siesta_user'@'%';
FLUSH PRIVILEGES;
