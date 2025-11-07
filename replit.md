# ONES - Personalized AI Supplement Platform

## Overview

ONES is a personalized AI supplement platform that creates custom supplement formulas based on individual health profiles. The platform features a conversational AI interface that guides users through health assessments, analyzes blood test data, and provides personalized supplement recommendations delivered as single capsules. The system is designed as a full-stack web application with a modern, health-focused user interface that emphasizes trust, scientific backing, and user-friendly interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 7, 2025 - Enhanced Admin Dashboard
- **Clickable Stat Cards**: All user-related stat cards (Total Users, Paid Users, Active Users) are now clickable and navigate to filtered user lists
- **Filtered User Lists**: Admin can view users filtered by type:
  - All Users: Complete user list
  - Paid Users: Users who have placed at least one order
  - Active Users: Users who have created at least one formula
- **Today's Orders Section**: Admin dashboard displays all orders placed today with user details, amounts, and supply duration
- **Filter UI Improvements**: UserManagementPage shows active filter in header with option to clear filter and return to all users

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design system optimized for health/wellness aesthetics
- **Component Library**: Custom components built on Radix UI primitives following design guidelines
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API development
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **Development**: Hot module replacement with Vite integration for seamless development

### UI Design System
- **Color Palette**: Earthy, health-focused theme with deep teal primary (#168 76% 42%) and warm accent colors
- **Typography**: Inter for body text and Playfair Display for headlines, emphasizing medical-grade readability
- **Component Patterns**: Shadcn/ui components with health-tech inspired styling (Headspace/Calm aesthetic)
- **Responsive Design**: Mobile-first approach with consistent spacing using Tailwind utilities
- **Accessibility**: Built on Radix UI primitives ensuring WCAG compliance

### Data Layer
- **Database**: PostgreSQL for reliable data persistence
- **ORM**: Drizzle for type-safe database queries and migrations
- **Schema Management**: Centralized schema definitions with automated type generation
- **Database Hosting**: Neon Database for serverless PostgreSQL with connection pooling

### Core Features Architecture
- **AI Chat Interface**: Conversational UI for health assessments with file upload capabilities for blood tests
- **Comprehensive Health Profile Collection** (Updated Oct 14, 2025):
  - 5-phase systematic questioning approach to collect ALL health profile data
  - Phase 1: Basic demographics, medications, allergies, sleep hours
  - Phase 2: Lifestyle habits including smoking status, alcohol consumption (drinks/week), exercise frequency, stress level
  - Phase 3: Symptoms, cardiovascular metrics (blood pressure, heart rate), chronic conditions
  - Phase 4: Blood test upload prompts, medical history
  - Phase 5: Environmental exposures
  - Automatic health data extraction from conversations with ```health-data JSON blocks
  - AI explicitly asks about every field: medications, smoking, alcohol, conditions, allergies, etc.
- **Lab Data Extraction System** (Added Oct 2025):
  - Automatic analysis of uploaded PDF and image lab reports
  - PDF text extraction using pdf-parse library
  - Image OCR using OpenAI GPT-4o Vision API
  - AI-powered structured data extraction (test values, dates, ranges, status flags)
  - Extracted lab data automatically integrated into AI chat context for personalized recommendations
  - Robust error handling with graceful fallbacks
- **Personalization Engine**: Algorithm that processes user health data to create custom supplement formulas
- **Formula Management**: System for combining base formulas with individual ingredients (32 base formulas + 29 individual ingredients)
  - Formula display shows individual ingredient names with mg amounts (e.g., "Heart Support - 450mg")
  - Formulas automatically saved to database with proper version numbering
  - "See Your Formulation" button appears after AI creates formula, linking to My Formulation tab
  - Clean AI responses with JSON code extracted backend before display
- **Formula Selection & History** (Added Oct 16-17, 2025):
  - Grid view displaying all formula versions (newest to oldest) as expandable cards
  - Visual selection mechanism with ring borders and "Selected" badges
  - Auto-selects newest formula by default
  - All tabs (Ingredients, Safety Metrics, Actions) synchronized to reflect selected formula
  - Order confirmation dialog showing comprehensive formula details before checkout
  - User can review and order any previous formula version
- **Formula Extraction & Validation System** (Added Oct 17, 2025):
  - Server-side detection of AI formula output failures
  - Automatic user notification when formula missing required JSON format
  - Validation error alerts for unapproved ingredients with retry instructions
  - Comprehensive logging of extraction failures for debugging
  - Prevents silent formula loss with clear error messaging
- **Ingredient Validation System** (Added Oct 16-17, 2025):
  - Strict enforcement: AI can ONLY recommend ingredients from approved catalog (32 base formulas + 29 individual ingredients)
  - Critical ingredient rules at top of AI prompt preventing made-up formula names
  - AI explicitly instructed that user's current supplements are for REFERENCE ONLY - not for inclusion in formulas
  - Specific guidance for brain/cognitive support using individual ingredients (Ginko Biloba, Phosphatidylcholine, Omega 3)
  - Backend validation checks all formula ingredients against approved catalog before saving
  - If user requests unapproved ingredient, AI explains it's not available and suggests alternatives
  - Prevents formula creation with made-up names like "Brain Support", "Cognitive Support", etc.
- **Progress Tracking**: User journey monitoring with iterative formula optimization
- **Business Model & Refund Policy** (Updated Nov 2025):
  - One-time purchases only (3/6/12 month supplies) - NOT subscriptions
  - No refunds or returns on custom orders due to personalized, made-to-order nature
  - Exception: Damaged/defective products receive free replacement
  - Refund and Returns policy pages updated to reflect custom order policy
  - Maximum formula dosage updated from 6800mg to 5500mg (Nov 2025)

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management tools
- **Connect-pg-simple**: PostgreSQL session store for user authentication

### Development Tools
- **Vite**: Build tool with TypeScript support and hot module replacement
- **ESBuild**: Fast bundling for production builds
- **Tailwind CSS**: Utility-first CSS framework with custom configuration

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Lucide React**: Icon library for consistent visual elements
- **Class Variance Authority**: Utility for creating type-safe component variants
- **Embla Carousel**: Touch-friendly carousel for mobile interactions

### Styling & Animation
- **PostCSS**: CSS processing with Autoprefixer
- **Clsx & Tailwind Merge**: Conditional class name utilities
- **Framer Motion**: Animation library for micro-interactions and transitions

### Data Management
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management with validation
- **Hookform Resolvers**: Integration between form validation and schema validation
- **Date-fns**: Date manipulation utilities

### File Handling & Analysis
- **pdf-parse**: PDF text extraction for lab report analysis
- **OpenAI GPT-4o Vision**: Image OCR for scanned lab reports
- **File Upload Support**: HIPAA-compliant secure upload with automatic lab data extraction
- **Asset Management**: Vite-based asset optimization and serving

### Font & Typography
- **Google Fonts**: Inter and Playfair Display for professional health-tech aesthetic
- **Custom Font Loading**: Optimized web font delivery with preconnect optimization