-- Seed data for smart parking lot system (PostgreSQL compatible)
BEGIN;

-- 1) Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'System administrator'),
(2, 'OWNER', 'Parking owner'),
(3, 'STAFF', 'Parking staff'),
(4, 'CUSTOMER', 'End customer');

-- 2) Users
INSERT INTO users (id, name, email, password, role_id, is_active, is_verified, phone) VALUES
(1, 'Alice Admin', 'alice.admin@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 1, TRUE, TRUE, '09123456789'),
(2, 'Bob Owner', 'bob.owner@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 2, TRUE, TRUE, '09234567890'),
(3, 'Carol Staff', 'carol.staff@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 3, TRUE, TRUE, '09345678901'),
(4, 'Dave Customer', 'dave.customer@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 4, TRUE, TRUE, '09456789012');

-- 3) Parking Owners
INSERT INTO parking_owners (id, user_id, company_name) VALUES
(1, 2, 'Bob''s Parking LLC');

-- 4) Wallet Accounts (Platform Admin & Owner Wallet Accounts)
INSERT INTO wallet_accounts (id, owner_id, name, wallet_phone, api_key, is_active) VALUES
(1, NULL, 'System Admin Platform Account', '09123456789', 'admin_platform_wallet_api_key_secret', TRUE),
(2, 1, 'Bob''s Parking Wallet Account', '09234567890', 'bobs_parking_wallet_api_key_secret', TRUE);

-- 5) Parking Lots
INSERT INTO parking_lots (id, owner_id, name, google_map_url, type, is_active, rate_per_hour) VALUES
(1, 1, 'Downtown Lot', 'https://maps.example.com/?q=100+Market+St', 'PUBLIC', TRUE, 1000.0);

-- 6) Parking Floors
INSERT INTO parking_floors (id, parking_lot_id, floor_name) VALUES
(1, 1, 'Ground Floor'),
(2, 1, 'Level 2');

-- 7) Parking Slots (3 per floor)
INSERT INTO parking_slots (id, floor_id, slot_number, section, latitude, longitude, status) VALUES
(1, 1, 'G-01', 'A', 40.71281, -74.00601, 'AVAILABLE'),
(2, 1, 'G-02', 'A', 40.71282, -74.00602, 'AVAILABLE'),
(3, 1, 'G-03', 'B', 40.71283, -74.00603, 'AVAILABLE'),
(4, 2, 'L2-01', 'A', 40.71284, -74.00604, 'AVAILABLE'),
(5, 2, 'L2-02', 'B', 40.71285, -74.00605, 'AVAILABLE'),
(6, 2, 'L2-03', 'B', 40.71286, -74.00606, 'AVAILABLE');

-- 8) Parking Staff
INSERT INTO parking_staff (id, user_id, parking_lot_id, created_by) VALUES
(1, 3, 1, 2);

-- 9) Customers
INSERT INTO customers (id, user_id, current_lat, current_lng) VALUES
(1, 4, 40.71300, -74.00650);

-- 10) Cars
INSERT INTO cars (id, customer_id, plate_number, brand, color) VALUES
(1, 1, 'ABC-1234', 'Toyota', 'White');

-- 11) Parking Sessions
INSERT INTO parking_sessions (id, car_id, slot_id, start_time, end_time, duration, fee, status) VALUES
(1, 1, 1, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', 60, 1000.0, 'FINISHED');

-- 12) Packages (Subscription tiers defined by Admin)
INSERT INTO packages (id, name, description, price, duration_days, max_lots, max_staff, is_active) VALUES
(1, 'Basic',      'Ideal for small operators — 1 lot, up to 5 staff',        9900.0,  30,  1, 5,   TRUE),
(2, 'Pro',        'For growing businesses — up to 3 lots, 20 staff',         24900.0, 30,  3, 20,  TRUE),
(3, 'Enterprise', 'Unlimited scale — up to 10 lots, unlimited staff',        49900.0, 30, 10, 999, TRUE);

-- 13) Owner Subscriptions
INSERT INTO owner_subscriptions (id, owner_id, package_id, started_at, expires_at, status, amount) VALUES
(1, 1, 2, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '20 days', 'ACTIVE', 24900.0);

-- 14) Payments (Parking session payment & Owner subscription payment)
INSERT INTO payments (id, user_id, wallet_account_id, session_id, subscription_id, reference, wallet_payment_reference, wallet_transaction_number, receiver_phone, amount, fee, total, status, message, paid_at) VALUES
(1, 4, 2, 1, NULL, 'PP-100001', 'PAY-WAL-100001', 'TX-WAL-999001', '09234567890', 1000.0, 0.0, 1000.0, 'COMPLETED', 'Parking session payment successful', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(2, 2, 1, NULL, 1, 'PP-100002', 'PAY-WAL-100002', 'TX-WAL-999002', '09123456789', 24900.0, 0.0, 24900.0, 'COMPLETED', 'Pro package subscription payment successful', CURRENT_TIMESTAMP - INTERVAL '10 days');

-- Reset sequences for auto-increment IDs in PostgreSQL
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('parking_owners_id_seq', (SELECT MAX(id) FROM parking_owners));
SELECT setval('wallet_accounts_id_seq', (SELECT MAX(id) FROM wallet_accounts));
SELECT setval('parking_lots_id_seq', (SELECT MAX(id) FROM parking_lots));
SELECT setval('parking_floors_id_seq', (SELECT MAX(id) FROM parking_floors));
SELECT setval('parking_slots_id_seq', (SELECT MAX(id) FROM parking_slots));
SELECT setval('parking_staff_id_seq', (SELECT MAX(id) FROM parking_staff));
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('cars_id_seq', (SELECT MAX(id) FROM cars));
SELECT setval('parking_sessions_id_seq', (SELECT MAX(id) FROM parking_sessions));
SELECT setval('packages_id_seq', (SELECT MAX(id) FROM packages));
SELECT setval('owner_subscriptions_id_seq', (SELECT MAX(id) FROM owner_subscriptions));
SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));

COMMIT;
