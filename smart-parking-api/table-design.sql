-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

-- 2. Users table (with hierarchy tracking)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id INT NOT NULL,
    created_by INT, -- Tracks who created this user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. Parking Owners
CREATE TABLE IF NOT EXISTS parking_owners (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    company_name VARCHAR(100),
    business_license VARCHAR(100),
    address VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Parking Lots
CREATE TABLE IF NOT EXISTS parking_lots (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    address VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    google_map_url TEXT,
    total_slots INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES parking_owners(id)
);

-- 5. Parking Staff
CREATE TABLE IF NOT EXISTS parking_staff (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    parking_lot_id INT NOT NULL,
    employee_code VARCHAR(50),
    position VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id)
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    plate_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    brand VARCHAR(50),
    color VARCHAR(30),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 8. Parking Floors
CREATE TABLE IF NOT EXISTS parking_floors (
    id SERIAL PRIMARY KEY,
    parking_lot_id INT NOT NULL,
    floor_name VARCHAR(50),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id)
);

-- 9. Parking Slots
CREATE TABLE IF NOT EXISTS parking_slots (
    id SERIAL PRIMARY KEY,
    floor_id INT NOT NULL,
    slot_number VARCHAR(20) NOT NULL,
    section VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED')),
    FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
);

-- 10. Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    slot_id INT NOT NULL,
    reservation_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

-- 11. Parking Sessions
CREATE TABLE IF NOT EXISTS parking_sessions (
    id SERIAL PRIMARY KEY,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    entry_time TIMESTAMP,
    exit_time TIMESTAMP,
    duration INT,
    fee DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FINISHED')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    parking_session_id INT NOT NULL,
    customer_id INT NOT NULL,
    reservation_id INT,
    amount DOUBLE PRECISION NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    status VARCHAR(20) DEFAULT 'PAID' CHECK (status IN ('PENDING', 'PAID', 'REFUNDED')),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);