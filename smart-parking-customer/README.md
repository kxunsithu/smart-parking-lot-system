# Smart Parking Customer Web App

A modern React web application for customers to search, book, and manage parking spaces.

## Tech Stack

- **React 19** - Latest React with new features
- **TypeScript** - Type-safe development
- **Vite 8** - Fast build tool and dev server
- **Tailwind CSS v4** - Modern utility-first CSS
- **shadcn UI** - Beautiful, accessible components
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors
- **React Hook Form + Zod** - Form validation
- **Sonner** - Toast notifications

## Features

- **Authentication**: Login and registration with form validation
- **Dashboard**: Search and browse available parking lots
- **Vehicle Management**: Add, edit, and delete vehicles
- **Parking Sessions**: View active and past parking sessions
- **Profile Management**: Update personal information and change password
- **Parking Booking**: Book parking spots with vehicle selection
- **Responsive Design**: Mobile-friendly interface

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend API running on `http://localhost:8000`

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5174`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/              # API client and endpoints
├── components/       # Reusable UI components
│   ├── layout/      # Layout components (Navbar)
│   ├── theme/       # Theme provider
│   └── ui/          # shadcn UI components
├── pages/           # Page components
├── store/           # Zustand state management
├── lib/             # Utility functions
└── App.tsx          # Main app with routing
```

## API Integration

The app connects to the Smart Parking API with:
- Automatic JWT token management
- Token refresh on 401 errors
- Request/response interceptors
- Type-safe API calls

## Authentication Flow

1. User registers/logs in
2. Tokens stored in localStorage and Zustand store
3. Protected routes check authentication status
4. API calls include Authorization header
5. Tokens auto-refresh on expiration

## Build Status

✅ Build successful - No errors
⚠️ CSS linting warnings are expected (Tailwind v4 syntax not recognized by linter but works correctly)
