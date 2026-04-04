-- ============================================================
-- RemitApp Database Schema
-- Run this script once to initialize the database
-- ============================================================

-- Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'remit_db')
BEGIN
    CREATE DATABASE remit_db;
END
GO

USE remit_db;
GO

-- ============================================================
-- USERS TABLE
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        uuid          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        full_name     NVARCHAR(100) NOT NULL,
        email         NVARCHAR(150) NOT NULL UNIQUE,
        phone         NVARCHAR(20),
        role          NVARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','operator')),
        is_active     BIT NOT NULL DEFAULT 1,
        created_at    DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by    INT NULL,
        updated_by    INT NULL
    );
END
GO

-- ============================================================
-- OTP TABLE
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='otps' AND xtype='U')
BEGIN
    CREATE TABLE otps (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        email         NVARCHAR(150) NOT NULL,
        otp_code      NVARCHAR(10) NOT NULL,
        expires_at    DATETIME2 NOT NULL,
        is_used       BIT NOT NULL DEFAULT 0,
        created_at    DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_otps_email ON otps(email);
END
GO

-- ============================================================
-- SENDERS TABLE
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='senders' AND xtype='U')
BEGIN
    CREATE TABLE senders (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        uuid            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        full_name       NVARCHAR(100) NOT NULL,
        email           NVARCHAR(150) NOT NULL UNIQUE,
        phone           NVARCHAR(20),
        address         NVARCHAR(250),
        country         NVARCHAR(100) NOT NULL DEFAULT 'Japan',
        id_type         NVARCHAR(50),
        id_number       NVARCHAR(100),
        is_active       BIT NOT NULL DEFAULT 1,
        created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by      INT NULL REFERENCES users(id),
        updated_by      INT NULL REFERENCES users(id)
    );
END
GO

-- ============================================================
-- RECEIVERS TABLE
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='receivers' AND xtype='U')
BEGIN
    CREATE TABLE receivers (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        uuid            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        full_name       NVARCHAR(100) NOT NULL,
        email           NVARCHAR(150),
        phone           NVARCHAR(20) NOT NULL,
        address         NVARCHAR(250),
        country         NVARCHAR(100) NOT NULL DEFAULT 'Nepal',
        bank_name       NVARCHAR(100),
        bank_account    NVARCHAR(50),
        is_active       BIT NOT NULL DEFAULT 1,
        created_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by      INT NULL REFERENCES users(id),
        updated_by      INT NULL REFERENCES users(id)
    );
END
GO

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='transactions' AND xtype='U')
BEGIN
    CREATE TABLE transactions (
        id                  INT IDENTITY(1,1) PRIMARY KEY,
        uuid                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        reference_no        NVARCHAR(50) NOT NULL UNIQUE,
        sender_id           INT NOT NULL REFERENCES senders(id),
        receiver_id         INT NOT NULL REFERENCES receivers(id),
        send_amount_jpy     DECIMAL(18,2) NOT NULL,
        forex_rate          DECIMAL(10,6) NOT NULL DEFAULT 0.92,
        converted_amount_npr DECIMAL(18,2) NOT NULL,
        service_fee_npr     DECIMAL(18,2) NOT NULL,
        total_amount_npr    DECIMAL(18,2) NOT NULL,
        status              NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
        kafka_offset        BIGINT NULL,
        remarks             NVARCHAR(500),
        created_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by          INT NULL REFERENCES users(id),
        updated_by          INT NULL REFERENCES users(id)
    );
    CREATE INDEX IX_transactions_sender_id ON transactions(sender_id);
    CREATE INDEX IX_transactions_receiver_id ON transactions(receiver_id);
    CREATE INDEX IX_transactions_created_at ON transactions(created_at);
    CREATE INDEX IX_transactions_reference_no ON transactions(reference_no);
END
GO

-- ============================================================
-- SEED: Default Admin User (password must be set via OTP flow)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@remitapp.com')
BEGIN
    INSERT INTO users (full_name, email, phone, role, is_active)
    VALUES ('System Admin', 'admin@remitapp.com', '+977-9800000000', 'admin', 1);
END
GO

PRINT 'Database schema created successfully!';
GO
