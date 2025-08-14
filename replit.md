# Hallway Pass Manager

## Overview

A web application for managing hallway passes in an educational setting. The system allows teachers to create, monitor, and revoke student passes while providing students with real-time access to their active passes and pass history. Built with React frontend and Express.js backend with PostgreSQL database integration.

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