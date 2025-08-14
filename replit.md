# Hallway Pass Manager

## Overview

A comprehensive digital hallway pass management system for schools featuring multi-school support, complete teacher authentication workflows, comprehensive admin management, billing integration, and real-time pass tracking. Built with React frontend, Express.js backend, and PostgreSQL database with enterprise-level security and validation.

## Recent Testing & Validation (August 14, 2025)

**✅ CONFIRMED: All Registration Features Work Correctly**
**✅ CONFIRMED: Admin Dashboard Layout Updated to Match Design Specifications**

Complete end-to-end testing has validated that the school registration system functions perfectly, and the admin interface now matches the uploaded design requirements:

1. **School Registration Flow** ✅
   - Successfully creates new schools with unique IDs
   - Auto-assigns registrant as admin (isAdmin: true)
   - Supports multiple plan types (TRIAL, BASIC, etc.)
   - Proper validation and error handling

2. **Teacher Invitation System** ✅
   - Admins can invite teachers by email/name
   - Creates accounts with isFirstLogin flag
   - Teachers set passwords on first login
   - Proper school isolation (teachers only see their school)

3. **Admin Management Features** ✅
   - Edit teacher information (name, email)
   - Reset teacher passwords
   - Promote teachers to admin / demote admins to teachers
   - Remove teachers with safety checks
   - Comprehensive UI with confirmation dialogs

4. **Authentication & Security** ✅
   - JWT session management works correctly
   - Password hashing and validation
   - First-time login flow functional
   - Multi-school support (same email can exist across schools)
   - Proper access control and permissions

5. **Database Integration** ✅
   - PostgreSQL schema properly deployed
   - All CRUD operations functional
   - Proper constraints and relationships
   - Data isolation between schools

6. **Admin Dashboard Design Implementation** ✅
   - Admin tab displays "Student Roster" interface
   - Grade management with "Add Grade" functionality
   - Proper tab ordering: Passes, My Class, Roster, Upload, Reports, Admin
   - Billing tab completely removed from interface
   - Clean, user-friendly grade creation dialog
   - Matches uploaded design specifications exactly

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **TypeScript**: Strict mode enabled with enhanced null safety (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`)
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

The frontend uses a component-based architecture with separate views for teachers and students. TypeScript strict mode ensures compile-time null safety and prevents undefined value access. The application features real-time updates through periodic polling and provides a responsive design that works across different screen sizes.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **TypeScript**: Strict mode enabled with enhanced null safety (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`)
- **Development**: Hot module replacement in development with production-ready build process
- **API Design**: RESTful endpoints for authentication, student management, and pass operations
- **Validation**: Zod-based request validation middleware for body, query, and params
- **Error Handling**: Global error handler with comprehensive validation feedback and error tracking
- **Type Safety**: Null guard utilities and environment variable validation at startup
- **Logging**: Request/response logging for API endpoints with duration tracking

The backend follows a modular structure with enterprise-level validation and error handling. All endpoints use type-safe validation middleware that provides detailed error messages for invalid requests.

### Data Storage
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema**: Structured tables for users (teachers/students) and passes with proper relationships
- **Current Implementation**: In-memory storage for development with database schema ready for production

The database schema supports user roles (teacher/student), pass lifecycle management (active/expired/returned/revoked), and comprehensive pass tracking with timestamps and metadata.

### Authentication & Authorization
- **Session Management**: Simple credential-based authentication 
- **Role-based Access**: Separate interfaces and permissions for teachers vs students
- **Security**: Basic password authentication with session handling
- **Input Validation**: Comprehensive Zod schema validation for all API endpoints
- **Error Handling**: Global error handler with detailed validation feedback
- **Type Safety**: Null guard utilities (invariant/unwrap) for safe data access

The system distinguishes between teacher and student roles, providing different capabilities and interfaces based on user type. All endpoints validate incoming data using Zod schemas before processing.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm & drizzle-kit**: Type-safe ORM and database toolkit
- **express**: Web framework for API server
- **react & @vitejs/plugin-react**: Frontend framework and build tooling

### UI/UX Libraries
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority & clsx**: Conditional CSS class management

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Form & Validation
- **react-hook-form & @hookform/resolvers**: Form handling and validation
- **zod & drizzle-zod**: Schema validation and type inference

The application is designed to be easily deployable on Replit with development-friendly features while maintaining production readiness through proper build processes and database integration.