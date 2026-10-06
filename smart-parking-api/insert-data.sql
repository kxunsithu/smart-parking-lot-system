-- Seed data for smart parking lot system (PostgreSQL compatible)
BEGIN;

-- 1) Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'System administrator'),
(2, 'OWNER', 'Parking owner'),
(3, 'STAFF', 'Parking staff'),
(4, 'CUSTOMER', 'End customer');

-- 2) Cities (Only the 6 requested cities)
INSERT INTO cities (id, name, name_mm, description, is_active) VALUES
(1, 'Hlaingbwe', 'လှိုင်းဘွဲ့', 'Central township of Kayin State known for agricultural communities.', TRUE),
(2, 'Hpa-an', 'ဘားအံ', 'Capital city of Kayin State, famous for Mount Zwekabin, Saddar Cave, and Kyaut Ka Latt Pagoda.', TRUE),
(3, 'Kawkareik', 'ကော့ကရိတ်', 'Strategic transit city situated at the foot of the Dawna Range along the Asian Highway.', TRUE),
(4, 'Kyainseikgyi', 'ကြာအင်းဆိပ်ကြီး', 'Southern township of Kayin State situated along the Zami and Winyaw Rivers.', TRUE),
(5, 'Myawaddy', 'မြဝတီ', 'Major border trade hub on the Thai-Myanmar border connected to Mae Sot via the Friendship Bridge.', TRUE),
(6, 'Payathonzu', 'ဘုရားသုံးဆူ', 'Border town famous for the Three Pagodas Pass connecting Myanmar and Thailand.', TRUE);

-- 3) Users (All users have password: Admin2026@)
INSERT INTO users (id, name, email, password, role_id, is_active, is_verified, phone) VALUES
(1, 'System Admin', 'khunsithu350@gmail.com', '$2b$12$xO.0/NqKpcYpHQd35iGp2uN2Mtwnzd2tH5VrKcC7sw0Y8QjSg/qTC', 1, TRUE, TRUE, '+959000000001'),
(2, 'KBZ Banking Office', 'kbz.bankingoffice@gmail.com', '$2b$12$xO.0/NqKpcYpHQd35iGp2uN2Mtwnzd2tH5VrKcC7sw0Y8QjSg/qTC', 2, TRUE, TRUE, '+959600000001'),
(3, 'Saw Kler Htoo', 'sawhklertoo.staff@gmail.com', '$2b$12$xO.0/NqKpcYpHQd35iGp2uN2Mtwnzd2tH5VrKcC7sw0Y8QjSg/qTC', 3, TRUE, TRUE, '+959700000001'),
(4, 'Saw Blay Htoo', 'sawblayhtoo@gmail.com', '$2b$12$xO.0/NqKpcYpHQd35iGp2uN2Mtwnzd2tH5VrKcC7sw0Y8QjSg/qTC', 4, TRUE, TRUE, '+959800000001');

-- 4) Parking Owners
INSERT INTO parking_owners (id, user_id, company_name) VALUES
(1, 2, 'KBZ Banking Office');

-- 5) Wallet Accounts (Platform Admin & Owner Wallet Accounts)
INSERT INTO wallet_accounts (id, owner_id, name, wallet_phone, api_key, is_active) VALUES
(1, NULL, 'System Admin Platform Account', '+959000000001', 'admin_platform_wallet_api_key_secret', TRUE),
(2, 1, 'KBZ Banking Office Wallet Account', '+959600000001', 'kbz_bankingoffice_wallet_api_key_secret', TRUE);

-- 6) Parking Lots (Kayin State — strictly allowed cities)
INSERT INTO parking_lots (id, owner_id, name, google_map_url, type, is_active, rate_per_hour, city) VALUES
(1, 1, 'Hpa-an Central Market Parking', 'https://maps.google.com/maps?q=16.88934,97.63225&hl=en&z=16&output=embed', 'PUBLIC', TRUE, 500.0, 'Hpa-an'),
(2, 1, 'Myawaddy Border Trade Parking', 'https://maps.google.com/maps?q=16.69170,98.50980&hl=en&z=16&output=embed', 'PUBLIC', TRUE, 800.0, 'Myawaddy'),
(3, 1, 'Kawkareik Town Centre Parking', 'https://maps.google.com/maps?q=16.55420,98.24350&hl=en&z=16&output=embed', 'PUBLIC', TRUE, 400.0, 'Kawkareik');

-- 7) Parking Floors
INSERT INTO parking_floors (id, parking_lot_id, floor_name) VALUES
(1, 1, 'Ground Floor (G)'),
(2, 1, 'Level 1 (L1)');

-- 8) Parking Slots
INSERT INTO parking_slots (id, floor_id, slot_number, section, latitude, longitude, status) VALUES
(1, 1, 'G-A01', 'A', 16.88934, 97.63225, 'AVAILABLE'),
(2, 1, 'G-A02', 'A', 16.88935, 97.63226, 'AVAILABLE'),
(3, 1, 'G-B01', 'B', 16.88938, 97.63229, 'AVAILABLE'),
(4, 2, 'L1-A01', 'A', 16.88942, 97.63225, 'AVAILABLE');

-- 9) Parking Staff
INSERT INTO parking_staff (id, user_id, parking_lot_id, created_by) VALUES
(1, 3, 1, 2);

-- 10) Customers
INSERT INTO customers (id, user_id, current_lat, current_lng) VALUES
(1, 4, 16.88934, 97.63225);

-- 11) Cars
INSERT INTO cars (id, customer_id, plate_number, brand, color) VALUES
(1, 1, '1A-1111', 'Toyota', 'White');

-- 12) Parking Sessions
INSERT INTO parking_sessions (id, car_id, slot_id, start_time, end_time, duration, fee, status) VALUES
(1, 1, 1, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', 60, 500.0, 'FINISHED');

-- 13) Packages (Subscription tiers defined by Admin)
INSERT INTO packages (id, name, description, price, duration_days, max_lots, max_staff, is_active) VALUES
(1, 'Basic',      'Ideal for small operators — 1 lot, up to 5 staff',        9900.0,  30,  1, 5,   TRUE),
(2, 'Pro',        'For growing businesses — up to 3 lots, 20 staff',         24900.0, 30,  3, 20,  TRUE),
(3, 'Enterprise', 'Unlimited scale — up to 10 lots, unlimited staff',        49900.0, 30, 10, 999, TRUE);

-- 14) Owner Subscriptions
INSERT INTO owner_subscriptions (id, owner_id, package_id, started_at, expires_at, status, amount) VALUES
(1, 1, 2, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP + INTERVAL '15 days', 'ACTIVE', 24900.0);

-- 15) Payments (Matching Subscription & Session with Transactions)
INSERT INTO payments (id, user_id, wallet_account_id, session_id, subscription_id, reference, wallet_payment_reference, wallet_transaction_number, receiver_phone, amount, fee, total, status, message, paid_at) VALUES
(1, 4, 2, 1, NULL, 'PP-SES-000001', 'PAY-WAL-SES-000001', 'TX-WAL-SES-000001', '+959600000001', 500.0, 0.0, 500.0, 'COMPLETED', 'Parking session payment for slot G-A01 successful', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(2, 2, 1, NULL, 1, 'PP-SUB-000001', 'PAY-WAL-SUB-000001', 'TX-WAL-SUB-000001', '+959000000001', 24900.0, 0.0, 24900.0, 'COMPLETED', 'Pro package subscription payment successful', CURRENT_TIMESTAMP - INTERVAL '15 days');

-- Reset sequences for auto-increment IDs in PostgreSQL
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('cities_id_seq', (SELECT MAX(id) FROM cities));
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
