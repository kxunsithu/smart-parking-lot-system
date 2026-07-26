
-- Seed data for smart parking lot system
BEGIN;

-- 1) Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'System administrator'),
(2, 'OWNER', 'Parking owner'),
(3, 'STAFF', 'Parking staff'),
(4, 'CUSTOMER', 'End customer');

-- 2) Users
INSERT INTO users (id, name, email, password, phone, role_id, created_by) VALUES
(1, 'Alice Admin', 'alice.admin@example.com', 'password123', '+10000000001', 1, NULL),
(2, 'Bob Owner', 'bob.owner@example.com', 'password123', '+10000000002', 2, 1),
(3, 'Carol Staff', 'carol.staff@example.com', 'password123', '+10000000003', 3, 2),
(4, 'Dave Customer', 'dave.customer@example.com', 'password123', '+10000000004', 4, 1);

-- 3) Parking Owners
INSERT INTO parking_owners (id, user_id, company_name, business_license, address) VALUES
(1, 2, 'Bob''s Parking LLC', 'BL-12345', '123 Main St, Metropolis');

-- 4) Parking Lots
INSERT INTO parking_lots (id, owner_id, name, type, address, latitude, longitude, google_map_url, total_slots) VALUES
(1, 1, 'Downtown Lot', 'Outdoor', '100 Market St, Metropolis', 40.7128, -74.0060, 'https://maps.example.com/?q=100+Market+St', 6);

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
INSERT INTO parking_staff (id, user_id, parking_lot_id, employee_code, position) VALUES
(1, 3, 1, 'STF-1001', 'Attendant');

-- 8) Customers
INSERT INTO customers (id, user_id, current_lat, current_lng) VALUES
(1, 4, 40.71300, -74.00650);

-- 9) Vehicles
INSERT INTO vehicles (id, customer_id, plate_number, vehicle_type, brand, color) VALUES
(1, 1, 'ABC-1234', 'CAR', 'Toyota', 'White');

-- 10) Reservations
INSERT INTO reservations (id, customer_id, slot_id, reservation_time, status) VALUES
(1, 1, 1, NOW() + INTERVAL '1 hour', 'CONFIRMED');

-- 11) Parking Sessions
INSERT INTO parking_sessions (id, vehicle_id, slot_id, entry_time, exit_time, duration, fee, status) VALUES
(1, 1, 1, NOW(), NULL, NULL, NULL, 'ACTIVE');

-- 12) Payments
INSERT INTO payments (id, parking_session_id, customer_id, reservation_id, amount, payment_method, status, paid_at) VALUES
(1, 1, 1, 1, 5.00, 'CASH', 'PAID', NOW());

COMMIT;

-- Notes:
-- Adjust password values to real password hashes in production.
-- If you re-run this file against an existing DB, you may need to truncate or use ON CONFLICT clauses.

