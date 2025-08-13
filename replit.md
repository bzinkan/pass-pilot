# Overview

A comprehensive Hall Pass Management System built with React, TypeScript, Express.js, and PostgreSQL. The application enables schools to digitally track student hall passes, providing real-time monitoring of student movements, automated status tracking, and comprehensive reporting capabilities. Features include student registration, pass creation with duration limits, active pass monitoring, historical reporting, and print functionality for physical passes.

## Recent Changes (August 13, 2025)
- ✅ **Fixed Pass Creation System**: Resolved schema validation issues preventing hall pass creation
- ✅ **ID Generation Fixed**: All database entities (users, grades, students, passes) now properly generate UUIDs
- ✅ **Enum Values Corrected**: Changed invalid "out" status to proper "active" status for passes
- ✅ **CRUD Operations Complete**: All create, read, update, delete operations now functional
- ✅ **Reference Files Integration**: Successfully used uploaded working code snippets to restore functionality
- ✅ **Firebase Removal Complete**: Eliminated Firebase complexity, using pure database authentication
- ✅ **First-Login Password System**: Teachers set permanent password on first login (bcrypt hashed)
- ✅ **Password System Fix**: Fixed multi-step login path to support first-login password setting
- ✅ **Password Change Feature**: Complete password change functionality in Profile tab with secure validation
- ✅ **Super Admin School Deletion**: Fixed foreign key constraint issues preventing school deletion
- ✅ **School Management Controls**: Super admin can override student/teacher limits regardless of plan type
- ✅ **Small Team Plans Updated**: Increased capacity from 150 to 200 students for better value
- ✅ **Super Admin Dashboard Overhaul**: Replaced passes metrics with trial/paid account tracking, added Money Tracker and Subscription Tracker
- ✅ **Deployment Readiness Complete**: Fixed all TypeScript errors, build issues, and database migration conflicts
- ✅ **Production Optimization Complete**: Removed 158 unused Firebase packages, cleaned MemStorage class, deleted development files, optimized bundle from 175kb to 162kb
- ✅ **MyClass Tab Null Safety Fixed**: Permanently resolved recurring null errors with comprehensive defensive programming - all object property access now uses optional chaining and safe fallback values

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Management**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: Custom logging, error handling, and request parsing
- **Development**: Hot reload with Vite integration in development mode
- **Storage Interface**: Abstract storage pattern with in-memory implementation for development

## Data Management
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Type-safe database schema definitions shared between client and server
- **Validation**: Zod schemas for runtime type validation
- **Tables**: Students (id, name, grade, room, initials) and Hall Passes (with student relationships, timing, and status tracking)
- **Development Data**: Seeded mock data for testing and development

## Application Features
- **Pass Management**: Create, track, and check-in hall passes with duration limits
- **Real-time Updates**: Automatic status updates (active, returned, overdue) with 30-second refresh intervals
- **Search & Filtering**: Student search functionality and pass history filtering
- **Print Integration**: Modal-based pass printing with formatted layouts
- **Statistics Dashboard**: Real-time metrics on active passes, daily totals, and overdue tracking
- **Settings Management**: Configurable school settings, default values, and system preferences
- **Subscription Management**: Complete Stripe integration for paid plans with trial periods
- **Multi-School Support**: Platform-wide super admin with individual school isolation
- **Billing & Payments**: Secure payment processing, subscription management, and customer portal

## Shared Code Organization
- **Schema Definitions**: Unified TypeScript types and Zod validators in `/shared`
- **Type Safety**: End-to-end type safety from database to UI components
- **Code Reuse**: Shared validation logic between client and server
- **Import Paths**: TypeScript path mapping for clean imports (`@shared/*`)

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form for form management
- **TypeScript**: Full TypeScript support with strict type checking
- **Vite**: Development server and build tool with HMR support
- **Express.js**: Backend web framework with middleware support

## Database & ORM
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL database integration
- **Database Migration**: Drizzle Kit for schema management and migrations

## Payment Processing & Billing
- **Stripe**: Complete payment processing infrastructure with subscriptions
- **@stripe/stripe-js**: Frontend Stripe JavaScript SDK for payment forms
- **@stripe/react-stripe-js**: React components for Stripe Elements
- **Stripe API**: Backend integration for customer management, subscriptions, and webhooks

## UI & Styling
- **Radix UI**: Accessible UI primitives (dialogs, forms, navigation, etc.)
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system with Tailwind integration

## Data Management & Validation
- **TanStack Query**: Server state management, caching, and synchronization
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities

## Development Tools
- **Replit Integration**: Development environment optimization and error overlay
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer