-- ============================================================================
--  SMART PARKING LOT SYSTEM  —  DATABASE TABLE DESIGN
--  Dialect: PostgreSQL
--
--  How to import into https://drawdb.app
--    1. Open drawDB, set the dialect selector (top bar) to "PostgreSQL".
--    2. Database tab  ->  "Import From"  ->  SQL.
--    3. Paste this whole file into the editor  ->  "OK"  ->  "Fit to screen".
--
--  Keep table order below: parents first, children after. drawDB re-lays out
--  the canvas automatically, but this order also keeps dependencyOrder sane.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
--  1. ROLES — ADMIN / OWNER / STAFF / CUSTOMER
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255)
);


-- ────────────────────────────────────────────────────────────────────────────
--  2. USERS — single identity table; role decides which profile table is used
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL        PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  NOT NULL UNIQUE,
    password      VARCHAR(255)  NOT NULL,          -- bcrypt hash
    role_id       INT           NOT NULL,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    is_verified   BOOLEAN       NOT NULL DEFAULT FALSE,
    phone         VARCHAR(20),
    profile_image VARCHAR(255),
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
);
CREATE INDEX ix_users_role_id ON users (role_id);
CREATE INDEX ix_users_email   ON users (email);


-- ────────────────────────────────────────────────────────────────────────────
--  3. TOKEN_BLACKLIST — revoked refresh-token jti, so logout persists
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_blacklist (
    id         SERIAL       PRIMARY KEY,
    jti        VARCHAR(64)  NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL
);
CREATE INDEX ix_token_blacklist_jti ON token_blacklist (jti);


-- ────────────────────────────────────────────────────────────────────────────
--  4. OTPS — email login codes
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
    id         SERIAL       PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(10)  NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP,
    is_used    BOOLEAN      DEFAULT FALSE
);
CREATE INDEX ix_otps_email ON otps (email);


-- ────────────────────────────────────────────────────────────────────────────
--  5. CITIES — Kayin State townships (lookup for parking lot location)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    name_mm     VARCHAR(200),                      -- Myanmar script name
    description TEXT,
    image_url   VARCHAR(500),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_cities_name ON cities (name);


-- ────────────────────────────────────────────────────────────────────────────
--  6. CUSTOMERS — 1:1 profile of a user with role CUSTOMER
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    user_id     INT   NOT NULL UNIQUE,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- ────────────────────────────────────────────────────────────────────────────
--  7. PARKING_OWNERS — 1:1 profile of a user with role OWNER
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_owners (
    id           SERIAL       PRIMARY KEY,
    user_id      INT          NOT NULL UNIQUE,
    company_name VARCHAR(100),
    CONSTRAINT fk_parking_owners_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- ────────────────────────────────────────────────────────────────────────────
--  8. PARKING_LOTS — owned by a ParkingOwner, located in a city
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_lots (
    id             SERIAL        PRIMARY KEY,
    owner_id       INT           NOT NULL,
    name           VARCHAR(100)  NOT NULL,
    google_map_url TEXT,
    city           VARCHAR(100),                  -- kept in sync with cities.name
    type           VARCHAR(50)   NOT NULL DEFAULT 'PUBLIC',
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    rate_per_hour  DOUBLE PRECISION,             -- owner-set hourly rate
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_parking_lots_type CHECK (type IN ('PUBLIC', 'PRIVATE')),
    CONSTRAINT fk_parking_lots_owner FOREIGN KEY (owner_id) REFERENCES parking_owners (id)
);
CREATE INDEX ix_parking_lots_owner_id ON parking_lots (owner_id);
CREATE INDEX ix_parking_lots_name     ON parking_lots (name);
CREATE INDEX ix_parking_lots_city     ON parking_lots (city);


-- ────────────────────────────────────────────────────────────────────────────
--  9. PARKING_STAFF — 1:1 profile of a user assigned to one lot
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_staff (
    id            SERIAL PRIMARY KEY,
    user_id       INT    NOT NULL UNIQUE,
    parking_lot_id INT   NOT NULL,
    created_by    INT,                           -- user who invited the staff
    CONSTRAINT fk_parking_staff_user     FOREIGN KEY (user_id)       REFERENCES users (id)       ON DELETE CASCADE,
    CONSTRAINT fk_parking_staff_lot      FOREIGN KEY (parking_lot_id) REFERENCES parking_lots (id),
    CONSTRAINT fk_parking_staff_creator FOREIGN KEY (created_by)     REFERENCES users (id)
);
CREATE INDEX ix_parking_staff_parking_lot_id ON parking_staff (parking_lot_id);


-- ────────────────────────────────────────────────────────────────────────────
--  10. PARKING_FLOORS — levels inside a lot
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_floors (
    id             SERIAL      PRIMARY KEY,
    parking_lot_id INT         NOT NULL,
    floor_name     VARCHAR(50),
    CONSTRAINT fk_parking_floors_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots (id)
);
CREATE INDEX ix_parking_floors_parking_lot_id ON parking_floors (parking_lot_id);


-- ────────────────────────────────────────────────────────────────────────────
--  11. PARKING_SLOTS — individual bays, unique per floor
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_slots (
    id          SERIAL        PRIMARY KEY,
    floor_id    INT           NOT NULL,
    slot_number VARCHAR(20)   NOT NULL,
    section     VARCHAR(50),
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    status      VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT ck_parking_slots_status CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED')),
    CONSTRAINT uq_parking_slots_floor_slot UNIQUE (floor_id, slot_number),
    CONSTRAINT fk_parking_slots_floor FOREIGN KEY (floor_id) REFERENCES parking_floors (id)
);
CREATE INDEX ix_parking_slots_floor_id ON parking_slots (floor_id);
CREATE INDEX ix_parking_slots_status   ON parking_slots (status);


-- ────────────────────────────────────────────────────────────────────────────
--  12. CARS — vehicles owned by a customer, plate number is the business key
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
    id           SERIAL       PRIMARY KEY,
    customer_id  INT          NOT NULL,
    plate_number VARCHAR(30)  NOT NULL UNIQUE,
    brand        VARCHAR(50),
    color        VARCHAR(30),
    CONSTRAINT fk_cars_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);
CREATE INDEX ix_cars_customer_id   ON cars (customer_id);
CREATE INDEX ix_cars_plate_number  ON cars (plate_number);


-- ────────────────────────────────────────────────────────────────────────────
--  13. PARKING_SESSIONS — car entry -> exit at one slot, duration in minutes
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_sessions (
    id         SERIAL        PRIMARY KEY,
    car_id     INT           NOT NULL,
    slot_id    INT           NOT NULL,
    start_time TIMESTAMP     NOT NULL,
    end_time   TIMESTAMP,
    duration   INT,                               -- minutes
    fee        DOUBLE PRECISION,
    status     VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT ck_parking_sessions_status CHECK (status IN ('ACTIVE', 'FINISHED')),
    CONSTRAINT fk_parking_sessions_car  FOREIGN KEY (car_id)  REFERENCES cars (id),
    CONSTRAINT fk_parking_sessions_slot FOREIGN KEY (slot_id) REFERENCES parking_slots (id)
);
CREATE INDEX ix_parking_sessions_status    ON parking_sessions (status);
CREATE INDEX ix_parking_sessions_car_id    ON parking_sessions (car_id);
CREATE INDEX ix_parking_sessions_car_status ON parking_sessions (car_id, status);


-- ────────────────────────────────────────────────────────────────────────────
--  14. PACKAGES — subscription tiers defined by the admin
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
    id            SERIAL        PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    description   TEXT,
    price         DOUBLE PRECISION NOT NULL,
    duration_days INT           NOT NULL,
    max_lots      INT           NOT NULL DEFAULT 1,
    max_staff     INT           NOT NULL DEFAULT 5,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ────────────────────────────────────────────────────────────────────────────
--  15. WALLET_ACCOUNTS — digital-wallet external-system credentials
--      owner_id NULL  ->  the platform (admin) receiving subscription fees
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id           SERIAL       PRIMARY KEY,
    owner_id     INT          UNIQUE,             -- NULL = platform account
    name         VARCHAR(100) NOT NULL,
    wallet_phone VARCHAR(20),
    api_key      VARCHAR(255) NOT NULL,           -- X-API-Key of external system
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_accounts_owner FOREIGN KEY (owner_id) REFERENCES parking_owners (id) ON DELETE CASCADE
);
CREATE INDEX ix_wallet_accounts_owner_id ON wallet_accounts (owner_id);


-- ────────────────────────────────────────────────────────────────────────────
--  16. OWNER_SUBSCRIPTIONS — a purchased package for an owner
--      Row is created only after the wallet confirms payment (ACTIVE).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_subscriptions (
    id         SERIAL        PRIMARY KEY,
    owner_id   INT           NOT NULL,
    package_id INT           NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status     VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    amount     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_owner_subscriptions_status CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT fk_owner_subscriptions_owner  FOREIGN KEY (owner_id)   REFERENCES parking_owners (id)  ON DELETE CASCADE,
    CONSTRAINT fk_owner_subscriptions_package FOREIGN KEY (package_id) REFERENCES packages (id)         ON DELETE RESTRICT
);
CREATE INDEX ix_owner_subscriptions_owner_id   ON owner_subscriptions (owner_id);
CREATE INDEX ix_owner_subscriptions_package_id ON owner_subscriptions (package_id);
CREATE INDEX ix_owner_subscriptions_status     ON owner_subscriptions (status);


-- ────────────────────────────────────────────────────────────────────────────
--  17. PAYMENTS — completed / recorded digital-wallet transactions
--      Written only once the external wallet confirms the payment.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                      SERIAL        PRIMARY KEY,
    user_id                 INT           NOT NULL,
    wallet_account_id       INT,                        -- whose API key was used
    session_id              INT,                        -- parking fee payment
    subscription_id         INT,                        -- package fee payment
    reference               VARCHAR(100)  NOT NULL UNIQUE,   -- parking-side ref, e.g. PP-000001
    wallet_payment_reference VARCHAR(64),                   -- e.g. PAY-000001
    wallet_payment_url      VARCHAR(512),                  -- hosted wallet page
    wallet_transaction_number VARCHAR(64),                 -- e.g. TX-000001
    receiver_phone          VARCHAR(20),
    amount                  DOUBLE PRECISION NOT NULL,
    fee                     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total                   DOUBLE PRECISION NOT NULL,
    status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    message                 TEXT,
    paid_at                 TIMESTAMP,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_payments_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED')),
    CONSTRAINT fk_payments_user         FOREIGN KEY (user_id)         REFERENCES users (id)              ON DELETE CASCADE,
    CONSTRAINT fk_payments_wallet       FOREIGN KEY (wallet_account_id) REFERENCES wallet_accounts (id)   ON DELETE SET NULL,
    CONSTRAINT fk_payments_session      FOREIGN KEY (session_id)      REFERENCES parking_sessions (id)    ON DELETE SET NULL,
    CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES owner_subscriptions (id) ON DELETE SET NULL
);
CREATE INDEX ix_payments_reference         ON payments (reference);
CREATE INDEX ix_payments_status            ON payments (status);
CREATE INDEX ix_payments_user_id           ON payments (user_id);
CREATE INDEX ix_payments_session_id        ON payments (session_id);
CREATE INDEX ix_payments_subscription_id   ON payments (subscription_id);
CREATE INDEX ix_payments_wallet_account_id ON payments (wallet_account_id);


-- ────────────────────────────────────────────────────────────────────────────
--  18. PENDING_WALLET_PAYMENTS — in-flight external wallet payment
--      Deferred fields let the app create the real session / subscription row
--      only after confirmation, so no PENDING rows exist in those tables.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_wallet_payments (
    id                       SERIAL        PRIMARY KEY,
    user_id                  INT           NOT NULL,
    wallet_account_id        INT,
    session_id               INT,
    subscription_id          INT,                    -- set after completion
    -- deferred parking-session fields
    pending_car_id          INT,
    pending_slot_id         INT,
    pending_start_time      TIMESTAMP WITH TIME ZONE,
    pending_end_time        TIMESTAMP WITH TIME ZONE,
    -- deferred subscription fields
    pending_package_id      INT,
    pending_owner_id        INT,
    is_renewal              BOOLEAN       NOT NULL DEFAULT FALSE,
    reference               VARCHAR(100)  NOT NULL UNIQUE,
    wallet_payment_reference VARCHAR(64),
    wallet_payment_url      VARCHAR(512),
    amount                  DOUBLE PRECISION NOT NULL,
    fee                     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total                   DOUBLE PRECISION NOT NULL,
    message                 TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pending_payments_user         FOREIGN KEY (user_id)             REFERENCES users (id)               ON DELETE CASCADE,
    CONSTRAINT fk_pending_payments_wallet       FOREIGN KEY (wallet_account_id)  REFERENCES wallet_accounts (id)     ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_session      FOREIGN KEY (session_id)          REFERENCES parking_sessions (id)     ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_subscription FOREIGN KEY (subscription_id)     REFERENCES owner_subscriptions (id)  ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_car          FOREIGN KEY (pending_car_id)      REFERENCES cars (id)                 ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_slot         FOREIGN KEY (pending_slot_id)     REFERENCES parking_slots (id)        ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_package      FOREIGN KEY (pending_package_id)  REFERENCES packages (id)             ON DELETE SET NULL,
    CONSTRAINT fk_pending_payments_owner        FOREIGN KEY (pending_owner_id)    REFERENCES parking_owners (id)       ON DELETE SET NULL
);
CREATE INDEX ix_pending_wallet_payments_reference         ON pending_wallet_payments (reference);
CREATE INDEX ix_pending_wallet_payments_user_id           ON pending_wallet_payments (user_id);
CREATE INDEX ix_pending_wallet_payments_session_id        ON pending_wallet_payments (session_id);
CREATE INDEX ix_pending_wallet_payments_subscription_id   ON pending_wallet_payments (subscription_id);
CREATE INDEX ix_pending_wallet_payments_wallet_account_id ON pending_wallet_payments (wallet_account_id);