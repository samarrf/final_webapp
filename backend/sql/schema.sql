USE homeease;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS rent_payments;
DROP TABLE IF EXISTS leases;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS landlords;

SET FOREIGN_KEY_CHECKS = 1;



CREATE TABLE landlords (
    landlord_id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (landlord_id),
    UNIQUE KEY uq_landlords_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE properties (
    property_id INT NOT NULL AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    street_address VARCHAR(150) NOT NULL,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (property_id),
    KEY idx_properties_landlord (landlord_id),

    CONSTRAINT fk_properties_landlord
        FOREIGN KEY (landlord_id)
        REFERENCES landlords (landlord_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE units (
    unit_id INT NOT NULL AUTO_INCREMENT,
    property_id INT NOT NULL,
    unit_label VARCHAR(40) NOT NULL,
    bedrooms TINYINT UNSIGNED NOT NULL,
    bathrooms DECIMAL(3,1) UNSIGNED NOT NULL,
    monthly_rent DECIMAL(9,2) NOT NULL,
    status ENUM('vacant', 'occupied') NOT NULL DEFAULT 'vacant',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (unit_id),
    KEY idx_units_property (property_id),

    CONSTRAINT fk_units_property
        FOREIGN KEY (property_id)
        REFERENCES properties (property_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tenants (
    tenant_id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id),
    UNIQUE KEY uq_tenants_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE leases (
    lease_id INT NOT NULL AUTO_INCREMENT,
    unit_id INT NOT NULL,
    tenant_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(9,2) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,

    PRIMARY KEY (lease_id),
    KEY idx_leases_unit (unit_id),
    KEY idx_leases_tenant (tenant_id),

    CONSTRAINT fk_leases_unit
        FOREIGN KEY (unit_id)
        REFERENCES units (unit_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_leases_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (tenant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE rent_payments (
    payment_id INT NOT NULL AUTO_INCREMENT,
    lease_id INT NOT NULL,
    amount_due DECIMAL(9,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE DEFAULT NULL,
    status ENUM('paid', 'due', 'overdue') NOT NULL DEFAULT 'due',

    PRIMARY KEY (payment_id),
    KEY idx_payments_lease_due (lease_id, due_date),

    CONSTRAINT fk_rent_payments_lease
        FOREIGN KEY (lease_id)
        REFERENCES leases (lease_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


INSERT INTO landlords (
    first_name,
    last_name,
    email,
    password_hash,
    phone
) VALUES (
    'Samar',
    'Rafi',
    'samar@homeease.dev',
    '$2y$10$qNYfx8oyBqs3dZWmespRa.9gsFV8Z8EWYq7mSn3M4k8QgV9Y41IN6',
    '540-555-0100'
);


INSERT INTO properties (
    landlord_id,
    street_address,
    city,
    state,
    zip_code
) VALUES
    (
        1,
        '214 Maple St',
        'Blacksburg',
        'VA',
        '24060'
    ),
    (
        1,
        '77 Draper Rd',
        'Blacksburg',
        'VA',
        '24060'
    ),
    (
        1,
        '9 Prices Fork Rd',
        'Christiansburg',
        'VA',
        '24073'
    );


INSERT INTO units (
    property_id,
    unit_label,
    bedrooms,
    bathrooms,
    monthly_rent,
    status
) VALUES
    (
        1,
        'Unit A',
        2,
        1.0,
        1250.00,
        'occupied'
    ),
    (
        1,
        'Unit B',
        1,
        1.0,
        950.00,
        'vacant'
    ),
    (
        2,
        'Main House',
        3,
        2.0,
        1800.00,
        'occupied'
    ),
    (
        3,
        'Main House',
        2,
        2.0,
        1400.00,
        'occupied'
    );


INSERT INTO tenants (
    first_name,
    last_name,
    email,
    password_hash,
    phone
) VALUES
    (
        'J.',
        'Alvarez',
        'jalvarez@example.com',
        '$2y$10$qNYfx8oyBqs3dZWmespRa.9gsFV8Z8EWYq7mSn3M4k8QgV9Y41IN6',
        '540-555-0101'
    ),
    (
        'M.',
        'Chen',
        'mchen@example.com',
        '$2y$10$qNYfx8oyBqs3dZWmespRa.9gsFV8Z8EWYq7mSn3M4k8QgV9Y41IN6',
        '540-555-0102'
    ),
    (
        'S.',
        'Okafor',
        'sokafor@example.com',
        '$2y$10$qNYfx8oyBqs3dZWmespRa.9gsFV8Z8EWYq7mSn3M4k8QgV9Y41IN6',
        '540-555-0103'
    );


INSERT INTO leases (
    unit_id,
    tenant_id,
    start_date,
    end_date,
    monthly_rent,
    active
) VALUES
    (
        1,
        1,
        '2026-02-01',
        '2027-01-31',
        1250.00,
        1
    ),
    (
        3,
        2,
        '2026-01-15',
        '2027-01-14',
        1800.00,
        1
    ),
    (
        4,
        3,
        '2026-03-01',
        '2027-02-28',
        1400.00,
        1
    );


INSERT INTO rent_payments (
    lease_id,
    amount_due,
    due_date,
    paid_date,
    status
) VALUES
    (
        1,
        1250.00,
        '2026-08-01',
        '2026-07-29',
        'paid'
    ),
    (
        2,
        1800.00,
        '2026-08-01',
        NULL,
        'due'
    ),
    (
        3,
        1400.00,
        '2026-08-01',
        NULL,
        'overdue'
    );