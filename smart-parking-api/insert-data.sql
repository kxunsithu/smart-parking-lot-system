
-- Seed data for smart parking lot system
BEGIN;

-- 1) Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'System administrator'),
(2, 'OWNER', 'Parking owner'),
(3, 'STAFF', 'Parking staff'),
(4, 'CUSTOMER', 'End customer');

-- 2) Users
INSERT INTO users (id, name, email, password, role_id, is_active, is_verified) VALUES
(1, 'Alice Admin', 'alice.admin@example.com', 'password123', 1, 1, 1),
(2, 'Bob Owner', 'bob.owner@example.com', 'password123', 2, 1, 1),
(3, 'Carol Staff', 'carol.staff@example.com', 'password123', 3, 1, 1),
(4, 'Dave Customer', 'dave.customer@example.com', 'password123', 4, 1, 1);

-- 3) Parking Owners
INSERT INTO parking_owners (id, user_id, company_name) VALUES
(1, 2, 'Bob''s Parking LLC');

-- 4) Parking Lots
INSERT INTO parking_lots (id, owner_id, name, type, address, latitude, longitude, google_map_url, is_active) VALUES
(1, 1, 'Downtown Lot', 'Outdoor', '100 Market St, Metropolis', 40.7128, -74.0060, 'https://maps.example.com/?q=100+Market+St', 1);

-- 5) Parking Floors
INSERT INTO parking_floors (id, parking_lot_id, floor_name) VALUES
(1, 1, 'Ground Floor'),
(2, 1, 'Level 2');

-- 6) Parking Slots (3 per floor)
INSERT INTO parking_slots (id, floor_id, slot_number, section, latitude, longitude, status) VALUES
(1, 1, 'G-01', 'A', 40.71281, -74.00601, 'AVAILABLE'),
(2, 1, 'G-02', 'A', 40.71282, -74.00602, 'AVAILABLE'),
(3, 1, 'G-03', 'B', 40.71283, -74.00603, 'AVAILABLE'),
(4, 2, 'L2-01', 'A', 40.71284, -74.00604, 'AVAILABLE'),
(5, 2, 'L2-02', 'B', 40.71285, -74.00605, 'AVAILABLE'),
(6, 2, 'L2-03', 'B', 40.71286, -74.00606, 'AVAILABLE');

-- 7) Parking Staff
INSERT INTO parking_staff (id, user_id, parking_lot_id, created_by) VALUES
(1, 3, 1, 2);

-- 8) Customers
INSERT INTO customers (id, user_id, current_lat, current_lng) VALUES
(1, 4, 40.71300, -74.00650);

-- 9) Vehicles
INSERT INTO vehicles (id, customer_id, plate_number, vehicle_type, brand, color) VALUES
(1, 1, 'ABC-1234', 'CAR', 'Toyota', 'White');

-- 10) Parking Sessions
INSERT INTO parking_sessions (id, vehicle_id, slot_id, start_time, end_time, duration, fee, status) VALUES
(1, 1, 1, datetime('now', '-2 hours'), datetime('now', '-1 hour'), 60, 1000.0, 'FINISHED');

-- 11) Payments
INSERT INTO payments (id, customer_id, parking_session_id, amount, payment_method, status, paid_at) VALUES
(1, 1, 1, 1000.0, 'CASH', 'PAID', CURRENT_TIMESTAMP);

-- 12) Packages (Sample subscription tiers)
INSERT INTO packages (id, name, description, price, duration_days, max_lots, max_staff, is_active) VALUES
(1, 'Basic',      'Ideal for small operators — 1 lot, up to 5 staff',        9900.0,  30,  1, 5,  1),
(2, 'Pro',        'For growing businesses — up to 3 lots, 20 staff',         24900.0, 30,  3, 20, 1),
(3, 'Enterprise', 'Unlimited scale — up to 10 lots, unlimited staff',        49900.0, 30, 10, 999, 1);

COMMIT;


-- Notes:
-- Adjust password values to real password hashes in production.
-- If you re-run this file against an existing DB, you may need to truncate or use ON CONFLICT clauses.

