%% Smart Parking Lot Management System — Use Case Diagram
%% Actors: System Admin, Parking Owner, Parking Staff, Customer, Digital Wallet System
flowchart TD
    subgraph SYS["Smart Parking Lot Management System"]
        direction TB

        subgraph AUTH["Authentication"]
            UC1["Register / Verify Email (OTP)"]
            UC2["Log In (JWT)"]
            UC3["Log Out / Refresh Token"]
            UC4["Change Password"]
            UC5["Manage Own Profile"]
        end

        subgraph ADMIN_UC["Admin Module"]
            UC6["Manage Users (activate / deactivate / delete)"]
            UC7["Manage Parking Owners (toggle status)"]
            UC8["Manage Subscription Packages (CRUD / enable / disable)"]
            UC9["Manage Subscriptions (toggle status)"]
            UC10["Configure Platform Wallet Account"]
            UC11["View Global Dashboard & Revenue"]
            UC12["View All Lots / Sessions / Payments"]
        end

        subgraph OWNER_UC["Owner Module"]
            UC13["Purchase / Renew Subscription"]
            UC14["Configure Own Wallet Account"]
            UC15["Manage Parking Lots"]
            UC16["Manage Floors"]
            UC17["Manage Slots (CRUD / status)"]
            UC18["Manage Staff"]
            UC19["View Own Dashboard & Revenue"]
        end

        subgraph STAFF_UC["Staff Module"]
            UC20["View Lot Dashboard"]
            UC21["View Slot Availability"]
            UC22["Update Slot Status"]
            UC23["View / Finish Sessions"]
        end

        subgraph CUST_UC["Customer Module"]
            UC24["Manage Own Cars"]
            UC25["Browse / Search Parking Lots"]
            UC26["View Lot Details (floors / slots / 3D)"]
            UC27["Book a Slot (future time window)"]
            UC28["Pay for Parking Session"]
            UC29["Track Own Sessions"]
            UC30["Finish Own Session"]
        end

        subgraph PAY["Payment (via Digital Wallet)"]
            UC31["Initiate Payment (send OTP)"]
            UC32["Confirm Payment (OTP + PIN)"]
            UC33["Verify Payment Status (callback)"]
        end

        %% System Admin
        ADMIN --- UC1
        ADMIN --- UC2
        ADMIN --- UC6
        ADMIN --- UC7
        ADMIN --- UC8
        ADMIN --- UC9
        ADMIN --- UC10
        ADMIN --- UC11
        ADMIN --- UC12

        %% Parking Owner
        OWNER --- UC1
        OWNER --- UC2
        OWNER --- UC13
        OWNER --- UC14
        OWNER --- UC15
        OWNER --- UC16
        OWNER --- UC17
        OWNER --- UC18
        OWNER --- UC19

        %% Parking Staff
        STAFF --- UC2
        STAFF --- UC20
        STAFF --- UC21
        STAFF --- UC22
        STAFF --- UC23

        %% Customer
        CUSTOMER --- UC1
        CUSTOMER --- UC2
        CUSTOMER --- UC24
        CUSTOMER --- UC25
        CUSTOMER --- UC26
        CUSTOMER --- UC27
        CUSTOMER --- UC28
        CUSTOMER --- UC29
        CUSTOMER --- UC30

        %% Digital wallet as secondary actor
        UC13 --- UC31
        UC28 --- UC31
        UC31 --- WALLET
        UC32 --- WALLET
        UC33 --- WALLET
    end

    ADMIN(["System Admin"])
    OWNER(["Parking Owner"])
    STAFF(["Parking Staff"])
    CUSTOMER(["Customer"])
    WALLET(["Digital Wallet System"])

    style SYS fill:#fff8dc,stroke:#b58900,stroke-width:2px
    style ADMIN fill:#e3f2fd,stroke:#1565c0
    style OWNER fill:#e8f5e9,stroke:#2e7d32
    style STAFF fill:#fce4ec,stroke:#c2185b
    style CUSTOMER fill:#f3e5f5,stroke:#6a1b9a
    style WALLET fill:#e0f7fa,stroke:#006064
