# Hallway Pass Manager

## Overview
The Hallway Pass Manager is a comprehensive digital system for schools to manage hallway passes. It supports multiple schools, includes teacher authentication, extensive admin management, billing integration, and real-time pass tracking. The project aims to provide an enterprise-level secure and validated solution for efficient school operations, enhancing student accountability and administrative oversight.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety.
- **Styling**: Tailwind CSS with shadcn/ui for consistent design.
- **State Management**: TanStack React Query for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Build Tool**: Vite for fast development and optimized production builds.
- **Design Principles**: Component-based architecture with separate views for teachers and students, responsive design, real-time updates through periodic polling.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **API Design**: RESTful endpoints for authentication, student management, and pass operations.
- **Validation**: Zod-based request validation middleware for body, query, and parameters.
- **Error Handling**: Global error handler with comprehensive validation feedback and error tracking.
- **Type Safety**: Enhanced TypeScript strict mode with null guard utilities and fail-fast environment variable validation at startup.
- **Defensive Programming**: Comprehensive guard helpers (`invariant()`, `unwrap()`, `assertNonEmpty()`) and consistent API response shaping (`ApiOk<T>`, `ApiErr`).
- **Security**: Secure Stripe webhook validation using `bodyParser.raw` and `stripe.webhooks.constructEvent()`.
- **Monitoring**: Global error handler with enhanced logging, request ID tracking, and optional notifications.

### Data Storage
- **Database**: PostgreSQL with Neon serverless database.
- **ORM**: Drizzle ORM for type-safe database operations and migrations.
- **Schema**: Structured tables for users (teachers/students) and passes with proper relationships, supporting roles, pass lifecycle, and metadata.

### Authentication & Authorization
- **Session Management**: Credential-based authentication.
- **Role-based Access**: Separate interfaces and permissions for teachers and students (teacher/student roles, SUPER_ADMIN for school administrators).
- **Security**: Password hashing and JWT session management.
- **Input Validation**: Comprehensive Zod schema validation for all API endpoints.

### Key Features and Implementations
- **School Registration**: Supports multiple plan types, auto-promotes first login user to admin (FIXED: bulletproof admin assignment), generates unique school IDs.
- **Teacher Invitation**: Admins can invite teachers, teachers set passwords on first login, proper school isolation.
- **Admin Management**: Edit teacher info, reset passwords, promote/demote roles, remove teachers.
- **Kiosk Functionality**: Self-service student interface mirroring MyClass, teacher-initiated with PIN protection, real-time pass sync, pass type selection, live statistics.
- **Progressive Web App (PWA)**: Complete PWA implementation with manifest and service worker for offline functionality, caching, and install prompts.
- **TypeScript Null Protection**: Enhanced strict null checking (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`) and comprehensive null guard utilities.
- **Environment Validation**: Zod-based schema validation for all environment variables, fail-fast behavior.
- **Runtime Request Validation**: Comprehensive Zod-based validation middleware for request body, query, and route parameters.
- **Safer API Responses**: Consistent API response shapes for success and errors (`ApiOk`, `ApiErr`).
- **Defensive React UI Patterns**: UI guard utilities for loading, error, and data existence checks, safe array/object access.
- **V2 Registration System**: Webhook-first provisioning with idempotency, atomic school/admin creation, status tracking, demo mode fallback, unique slug generation.
- **Student Alphabetical Sorting**: MyClass tab displays students in alphabetical order by last name for both available and checked-out students, improving teacher workflow and student location.
- **Session Management Fix**: Fixed critical session timeout mismatch that caused random logouts. Server-side sessions now properly expire after 7 days to match cookie expiration, with automatic session renewal on activity.
- **Smart Search Feature**: Added intelligent search bar to MyClass tab for quick student lookup in large classrooms. Filters both available and checked-out students by first name, last name, or full name with real-time results.
- **Passes Tab Functionality Restored**: Fixed critical issue where Passes tab wasn't displaying active students due to data structure mismatch between destination field and pass type filtering. Simplified grade filtering for better reliability while maintaining pass type filtering functionality.
- **Enhanced Destination Display**: Implemented color-coded destination badges across Passes and Reports tabs. Custom destinations (purple), Nurse destinations (red), Main Office (yellow), Discipline (orange), with fallback to General (blue). Teacher information now displays correctly showing who issued each pass.
- **Fixed Reports Tab Filtering**: Resolved critical filtering issues in Reports tab, especially for PWA mobile mode. Enhanced grade filtering by adding proper database joins between passes → students → grades tables. Added automatic filter refresh using useEffect to ensure filters apply immediately without manual button clicks. Implemented cache busting for mobile PWA reliability and improved query key management for proper refetching.

## External Dependencies

### Core Framework Dependencies
- `@neondatabase/serverless`: Serverless PostgreSQL database connection.
- `drizzle-orm` & `drizzle-kit`: Type-safe ORM and database toolkit.
- `express`: Web framework for API server.
- `react` & `@vitejs/plugin-react`: Frontend framework and build tooling.

### UI/UX Libraries
- `@radix-ui/*`: Comprehensive set of accessible UI primitives.
- `@tanstack/react-query`: Server state management and caching.
- `tailwindcss`: Utility-first CSS framework.
- `class-variance-authority` & `clsx`: Conditional CSS class management.

### Form & Validation
- `react-hook-form` & `@hookform/resolvers`: Form handling and validation.
- `zod` & `drizzle-zod`: Schema validation and type inference.
```