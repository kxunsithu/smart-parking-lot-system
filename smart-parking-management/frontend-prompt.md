# Frontend Prompt — Smart Parking Lot Management System

## Project Overview
Build a modern frontend for the Smart Parking Lot Management System using React.js with Tailwind CSS and shadcn/ui. The app should provide a clean, professional, and responsive interface for different user roles such as System Admin, Parking Owner, Parking Staff, and Customer.

## Technology Stack
- React.js (Vite + TypeScript preferred)
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query (React Query)
- Axios
- React Hook Form + Zod
- Lucide Icons
- Recharts (for dashboard analytics)

## Main Goals
Create a polished web application that allows users to:
- Register and log in securely
- View dashboard statistics
- Manage parking lots, floors, slots, and reservations
- Handle parking sessions and payments
- Search parking lots and reserve slots
- View reports and analytics

## Required Pages / Features
### 1. Authentication
- Login page
- Register page
- Forgot password / reset password page
- Protected route handling

### 2. Admin Dashboard
- Overview cards
- User and role management
- Parking owner management
- Reports and analytics

### 3. Parking Owner Dashboard
- Manage parking lots
- Manage floors and slots
- View reservations and sessions
- Revenue and occupancy monitoring

### 4. Parking Staff Dashboard
- Check-in / check-out flow
- Update slot status
- Confirm reservations
- Manage active sessions

### 5. Customer Dashboard
- Search parking lots by location or name
- View lot details
- Reserve a slot
- Manage vehicles
- View payment and booking history

## UI / UX Requirements
- Modern and minimal design
- Clean white/blue/green visual style
- Responsive for desktop, tablet, and mobile
- Use shadcn/ui components for forms, tables, dialogs, cards, and navigation
- Use Tailwind CSS for styling and spacing
- Include loading states, empty states, and form validation
- Make the app feel professional and production-ready

## API Integration Expectations
Connect to the backend API under the structure:
- Auth endpoints: login, register, refresh token
- Parking lot endpoints
- Reservation endpoints
- Payment endpoints
- User and role endpoints

Use a service layer for API calls and handle errors gracefully.

## Suggested Folder Structure
```bash
src/
  api/
  components/
    ui/
  pages/
  layouts/
  hooks/
  services/
  stores/
  types/
  utils/
  App.tsx
  main.tsx
```

## Deliverables
- Fully responsive React frontend
- Reusable components with shadcn/ui
- Tailwind-based styling
- Role-based UI navigation
- Clean page layouts and modern dashboard design
- API integration with loading and error handling

## Additional Notes
- Prefer a polished, simple, and professional UI rather than overly complex design
- Use dark/light theme support if possible
- Follow best practices for accessibility and component reusability
- Keep the code structured and easy to maintain
