# Smart Parking — Database Schema

This document converts the DrawSQL schema into a Markdown-friendly format. Each table below lists columns and attributes.

## Tables

### `roles`
```sql
id int [pk, increment]
name varchar(50) [unique, not null]
description varchar(255)
```

### `users`
```sql
id int [pk, increment]
name varchar(100) [not null]
email varchar(100) [unique, not null]
password varchar(255) [not null]
phone varchar(20)
role_id int [not null]
created_by int
created_at timestamp
```
Note: `created_by` references `users.id` to track user hierarchy.

### `parking_owners`
```sql
id int [pk, increment]
user_id int [unique, not null]
company_name varchar(100)
business_license varchar(100)
address varchar(255)
```

### `parking_lots`
```sql
id int [pk, increment]
owner_id int [not null]
name varchar(100) [not null]
type varchar(50)
address varchar(255)
latitude double
longitude double
google_map_url text
total_slots int
created_at timestamp
```

### `parking_staff`
```sql
id int [pk, increment]
user_id int [unique, not null]
parking_lot_id int [not null]
employee_code varchar(50)
position varchar(50)
```

### `customers`
```sql
id int [pk, increment]
user_id int [unique, not null]
current_lat double
current_lng double
```

### `vehicles`
```sql
id int [pk, increment]
customer_id int [not null]
plate_number varchar(30) [unique, not null]
vehicle_type varchar(50)
brand varchar(50)
color varchar(30)
```

### `parking_floors`
```sql
id int [pk, increment]
parking_lot_id int [not null]
floor_name varchar(50)
```

### `parking_slots`
```sql
id int [pk, increment]
floor_id int [not null]
slot_number varchar(20) [not null]
section varchar(50)
latitude double
longitude double
status varchar(20)
```

### `reservations`
```sql
id int [pk, increment]
customer_id int [not null]
slot_id int [not null]
reservation_time timestamp [not null]
status varchar(20)
```

### `parking_sessions`
```sql
id int [pk, increment]
vehicle_id int [not null]
slot_id int [not null]
entry_time timestamp
exit_time timestamp
duration int
fee double
status varchar(20)
```

### `payments`
```sql
id int [pk, increment]
parking_session_id int [not null]
customer_id int [not null]
reservation_id int
amount double [not null]
payment_method varchar(50)
status varchar(20)
paid_at timestamp
```

## Relationships

- `users.role_id` -> `roles.id`
- `users.created_by` -> `users.id`
- `parking_owners.user_id` -> `users.id`
- `parking_lots.owner_id` -> `parking_owners.id`
- `parking_staff.user_id` -> `users.id`
- `parking_staff.parking_lot_id` -> `parking_lots.id`
- `customers.user_id` -> `users.id`
- `vehicles.customer_id` -> `customers.id`
- `parking_floors.parking_lot_id` -> `parking_lots.id`
- `parking_slots.floor_id` -> `parking_floors.id`
- `reservations.customer_id` -> `customers.id`
- `reservations.slot_id` -> `parking_slots.id`
- `parking_sessions.vehicle_id` -> `vehicles.id`
- `parking_sessions.slot_id` -> `parking_slots.id`
- `payments.parking_session_id` -> `parking_sessions.id`
- `payments.customer_id` -> `customers.id`
- `payments.reservation_id` -> `reservations.id`

---
*Exported from DrawSQL-style source and reformatted for Markdown.*

