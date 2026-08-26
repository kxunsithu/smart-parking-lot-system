-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

-- 2. Users (with hierarchy, verification tracking, phone & profile image)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX ix_users_email ON users(email);

-- 3. Token Blacklist
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
CREATE INDEX ix_token_blacklist_jti ON token_blacklist(jti);

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

-- 9. Cars
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    brand VARCHAR(50),
    color VARCHAR(30),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX ix_cars_plate_number ON cars(plate_number);

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
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    FOREIGN KEY (floor_id) REFERENCES parking_floors(id),
    CONSTRAINT uq_parking_slots_floor_slot UNIQUE (floor_id, slot_number)
);
CREATE INDEX ix_parking_slots_status ON parking_slots(status);

-- 12. Parking Sessions
CREATE TABLE IF NOT EXISTS parking_sessions (
    id SERIAL PRIMARY KEY,
    car_id INT NOT NULL,
    slot_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT,         -- minutes
    fee DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);
CREATE INDEX ix_parking_sessions_status ON parking_sessions(status);
CREATE INDEX ix_parking_sessions_car_id ON parking_sessions(car_id);
CREATE INDEX ix_parking_sessions_car_status ON parking_sessions(car_id, status);

-- 13. Packages (Subscription tiers defined by Admin)
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL,
    duration_days INT NOT NULL,
    max_lots INT NOT NULL DEFAULT 1,
    max_staff INT NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Owner Subscriptions (purchased packages)
CREATE TABLE IF NOT EXISTS owner_subscriptions (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    package_id INT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES parking_owners(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT
);
CREATE INDEX ix_owner_subscriptions_owner_id ON owner_subscriptions(owner_id);
CREATE INDEX ix_owner_subscriptions_package_id ON owner_subscriptions(package_id);

-- 15. Wallet Accounts (Digital wallet receiver accounts for owners & platform admin)
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id SERIAL PRIMARY KEY,
    owner_id INT UNIQUE,
    name VARCHAR(100) NOT NULL,
    wallet_phone VARCHAR(20),
    api_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES parking_owners(id) ON DELETE CASCADE
);

-- 16. Payments (Completed/recorded digital wallet transactions)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    wallet_account_id INT,
    session_id INT,
    subscription_id INT,
    reference VARCHAR(100) UNIQUE NOT NULL,
    wallet_payment_reference VARCHAR(64),
    wallet_payment_url VARCHAR(512),
    wallet_transaction_number VARCHAR(64),
    receiver_phone VARCHAR(20),
    amount DOUBLE PRECISION NOT NULL,
    fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    total DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    message TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (wallet_account_id) REFERENCES wallet_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES parking_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES owner_subscriptions(id) ON DELETE SET NULL
);
CREATE INDEX ix_payments_session_id ON payments(session_id);
CREATE INDEX ix_payments_subscription_id ON payments(subscription_id);
CREATE INDEX ix_payments_wallet_account_id ON payments(wallet_account_id);
CREATE INDEX ix_payments_reference ON payments(reference);
CREATE INDEX ix_payments_status ON payments(status);

