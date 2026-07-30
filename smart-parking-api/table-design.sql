-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

-- 2. Users (with hierarchy and verification tracking)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. Token Blacklist
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 4. OTPs
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_otps_email ON otps(email);

-- 5. Parking Owners
CREATE TABLE IF NOT EXISTS parking_owners (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    company_name VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Parking Lots
CREATE TABLE IF NOT EXISTS parking_lots (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    google_map_url TEXT,
    type VARCHAR(50) DEFAULT 'PUBLIC' CHECK (type IN ('PUBLIC', 'PRIVATE')),
    is_active BOOLEAN DEFAULT TRUE,
    rate_per_hour DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES parking_owners(id)
);
CREATE INDEX ix_parking_lots_name ON parking_lots(name);

-- 8. Parking Staff
CREATE TABLE IF NOT EXISTS parking_staff (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    parking_lot_id INT NOT NULL,
    created_by INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 9. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    brand VARCHAR(50),
    color VARCHAR(30),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 10. Parking Floors
CREATE TABLE IF NOT EXISTS parking_floors (
    id SERIAL PRIMARY KEY,
    parking_lot_id INT NOT NULL,
    floor_name VARCHAR(50),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id)
);

-- 11. Parking Slots
CREATE TABLE IF NOT EXISTS parking_slots (
    id SERIAL PRIMARY KEY,
    floor_id INT NOT NULL,
    slot_number VARCHAR(20) NOT NULL,
    section VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED')),
    FOREIGN KEY (floor_id) REFERENCES parking_floors(id),
    UNIQUE (floor_id, slot_number)
);
CREATE INDEX ix_parking_slots_status ON parking_slots(status);

-- 12. Parking Sessions
CREATE TABLE IF NOT EXISTS parking_sessions (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT,         -- minutes
    fee DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'FINISHED')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);
CREATE INDEX ix_parking_sessions_status ON parking_sessions(status);
CREATE INDEX ix_parking_sessions_vehicle_id ON parking_sessions(vehicle_id);
CREATE INDEX ix_parking_sessions_vehicle_status ON parking_sessions(vehicle_id, status);

-- 13. Payments (for Parking Sessions)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    parking_session_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'KBZPAY', 'WAVEPAY', 'AYAPAY', 'UABPAY')),
    transaction_ref VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PAID' CHECK (status IN ('PENDING', 'PAID', 'REFUNDED')),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX ix_payments_status ON payments(status);

-- 14. Packages (Subscription tiers defined by Admin)
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL,
    duration_days INT NOT NULL,
    max_lots INT NOT NULL DEFAULT 1,
    max_staff INT NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Owner Subscriptions (purchased packages)
CREATE TABLE IF NOT EXISTS owner_subscriptions (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    package_id INT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    transaction_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES parking_owners(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT
);
CREATE INDEX ix_owner_subscriptions_owner_id ON owner_subscriptions(owner_id);
CREATE INDEX ix_owner_subscriptions_package_id ON owner_subscriptions(package_id);
