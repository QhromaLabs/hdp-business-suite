# HDP Delivery App (Refined Specification)

This app is designed for delivery personnel to manage orders, navigate to customer locations, and share live location with the admin.

## Core Features

### 1. Delivery Agent Dashboard
- **Available Orders**: Real-time list of approved orders waiting for a delivery agent.
- **My Deliveries**: List of orders currently accepted by the agent.
- **Order Details Modal**:
    - View customer contact, order items, and delivery address.
    - **"View in Map"**: One-click button to open Google/Apple Maps with a pin at the customer's store location.
    - **"Accept Order"**: Claim the order and update status to 'dispatched'.
    - **"Mark as Delivered"**: Complete the delivery, update status to 'delivered', and timestamp the event.

### 2. Map & Location Logic
- **Similar to Sales Agent App**: Uses `geolocator` to capture the agent's current coordinates.
- **Admin Dispatch**: Admin can pull the saved customer store location or manually input a destination.
- **Live Tracking**: While a delivery is active, the app shares the agent's live location with the admin dashboard for monitoring.
- **Store Location Management**: Ability to save/update customer store locations (Lat/Long) within the business ecosystem.

### 3. Business Logic Flow
1. **Order Creation**: Order is created (POS, Web, or Admin).
2. **Approval**: Admin approves the order.
3. **Location Pinning**: Admin ensures the order has a destination location (either from customer profile or manual).
4. **Agent Acceptance**: Delivery agent sees the order in the app and accepts it.
5. **Transit**: Agent uses "View in Map" to navigate. Live location is shared.
6. **Completion**: Agent marks as delivered.

## Technical Stack
- **Framework**: Flutter (Dart)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Maps**: OS-native navigation via `url_launcher` (replicates sales agent logic).
- **Location**: `geolocator`
