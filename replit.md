# ONES - Personalized AI Supplement Platform

## Overview
ONES is a personalized AI supplement platform that creates custom supplement formulas based on individual health profiles. It features a conversational AI, analyzes blood test data, and provides personalized supplement recommendations delivered as single capsules. The platform is a full-stack web application with a modern, health-focused UI emphasizing trust, scientific backing, and user-friendly interactions, aiming to provide a comprehensive, AI-driven solution for personalized nutrition.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for lightweight client-side routing.
- **Styling**: Tailwind CSS with a custom design system optimized for health/wellness.
- **Component Library**: Custom components built on Radix UI primitives.
- **State Management**: TanStack Query for server state management and caching.
- **Build Tool**: Vite for fast development and optimized production builds.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions.
- **Development**: Hot module replacement with Vite integration.

### UI Design System
- **Color Palette**: Earthy, health-focused theme with deep teal primary and warm accents.
- **Typography**: Inter for body text and Playfair Display for headlines.
- **Component Patterns**: Shadcn/ui components with health-tech inspired styling.
- **Responsive Design**: Mobile-first approach with consistent spacing.
- **Accessibility**: Built on Radix UI primitives for WCAG compliance.

### Data Layer
- **Database**: PostgreSQL for reliable data persistence.
- **ORM**: Drizzle for type-safe database queries and migrations.
- **Schema Management**: Centralized schema definitions with automated type generation.
- **Database Hosting**: Neon Database for serverless PostgreSQL.

### Core Features Architecture
- **AI Chat Interface**: Conversational UI for health assessments, including file upload for blood tests.
- **Comprehensive Health Profile Collection**: 5-phase systematic questioning to collect all health data, extracting information from conversations using JSON blocks.
- **Lab Data Extraction System**: Automatic analysis of uploaded PDF and image lab reports using `pdf-parse` and OpenAI GPT-4o Vision API for structured data extraction.
- **Personalization Engine**: Algorithm to process user health data for custom supplement formulas.
- **Formula Management**: System combining base formulas and individual ingredients, displaying ingredient names with mg amounts. Formulas are saved with version numbering.
- **Formula Selection & History**: Grid view of formula versions with selection mechanism, synchronizing tabs to reflect the selected formula. Users can review and order any previous version.
- **Formula Extraction & Validation System**: Server-side detection and user notification for AI formula output failures or unapproved ingredients.
- **Ingredient Validation System**: Strict enforcement that AI only recommends ingredients from an approved catalog, with critical rules embedded in the AI prompt.
- **AI Prompt Engineering** (Updated Nov 10, 2025):
  - **Exact Ingredient Name Enforcement**: AI must use character-for-character catalog matches (e.g., "Alpha Gest" → must be "Alpha Gest III")
  - **Medical Practitioner Communication Style**: Mandatory detailed clinical explanations BEFORE JSON output
  - **Base Formula Composition Breakdown**: AI explains what active ingredients are IN each base formula and WHY they're chosen
  - **Individualized Reasoning**: Connects lab values, biomarkers, conditions, and medications to specific ingredient choices
  - **Preflight Verification Checklist**: AI validates exact name matching and dose ranges before sending formulas
  - **Updated Dosing Rules**: 10mg minimum per ingredient (no multiples-of-50 requirement)
- **Ingredient Catalog** (Updated Nov 10, 2025):
  - **22 Base Formulas**: Expanded from 19 to 22 formulas by adding Alpha Gest III, Alpha Green II, and Alpha Oxyme
  - **All Active Ingredients Expandable**: All 130+ active ingredients across all base formulas have comprehensive benefits arrays (2-4 benefits each)
  - **42 Individual Ingredients**: Complete catalog with comprehensive metadata (type, suggestedUse, benefits, dose ranges)
  - Enables expandable ingredient details in MyFormulaPage UI for all base formulas and individual ingredients
  - Benefits include evidence-based descriptions for vitamins, minerals, herbs, glandulars, and proprietary ingredients
  - Ensures consistent user experience across all formula visualizations
- **Ingredient Information System** (Added Nov 10, 2025):
  - **Unified Backend Lookup**: `/api/ingredients/:ingredientName` endpoint sources from INDIVIDUAL_INGREDIENTS and BASE_FORMULA_DETAILS
  - **Name Normalization**: Handles 20+ common ingredient aliases (CoQ10 → CoEnzyme Q10, PC → Phosphatidylcholine, etc.)
  - **Centralized Alias Map**: INGREDIENT_ALIASES in shared/ingredients.ts ensures consistent naming across frontend/backend
  - **Comprehensive Metadata**: Returns benefits, type, suggestedUse, doseRange, interactions, sources, quality indicators
  - **Smart Fallbacks**: Gracefully handles unknown ingredients with sensible defaults
  - **UI Integration**: Ingredient dropdowns show detailed, ingredient-specific benefits instead of generic "General health support"
- **Ingredient Normalization System** (Fixed Nov 10, 2025):
  - **URI Encoding Fix**: Removed double URL decoding in ingredient lookup endpoints to prevent 500 errors on special characters (%, /, etc.)
  - **Conservative Normalization**: Smart stripping of AI-added qualifiers while preserving canonical name components:
    - **PRESERVES**: "Root", "Leaf", "Extract", extraction ratios (e.g., "Ginger Root", "Blackcurrant Extract", "Turmeric Root Extract 4:1")
    - **STRIPS**: PE qualifiers (e.g., "PE 1/8%"), percentages (e.g., "40%"), parenthetical sources (e.g., "(soy)", "(bovine)")
  - **Comprehensive Alias System**: 20+ aliases handle common variations:
    - "cboost" → "C Boost", "coq10" → "CoEnzyme Q10"
    - "curcumin/turmeric/turmeric root/turmeric extract" → "Turmeric Root Extract 4:1"
    - "ginko" → "Ginkgo Biloba", "ahswaganda" → "Ashwagandha"
    - "alpha gest" → "Alpha Gest III", "pc" → "Phosphatidylcholine"
  - **5-Step Normalization Process**:
    1. Check alias map with raw name
    2. Check catalog with raw name (catches exact matches)
    3. Strip conservative qualifiers (PE, %, parentheses only)
    4. Check alias map with stripped name
    5. Check catalog with stripped name
  - **Formula Storage Normalization**: All ingredient names normalized before database persistence, ensuring canonical names in storage
  - **Aligned AI Prompt**: Prompt updated to reflect catalog structure, clarifying which names include "Root", "Extract", ratios as canonical components
- **Progress Tracking**: User journey monitoring with iterative formula optimization.
- **Business Model**: One-time purchases for 3/6/12 month supplies; no refunds on custom orders unless damaged/defective.
- **Wearable Integration**: Production-ready database schema (`wearable_connections`, `biometric_data`, `biometric_trends`), secure OAuth implementation with AES-256-GCM token encryption, and automated token refresh system.
- **Admin Dashboard**: Enhanced dashboard with clickable stat cards, filtered user lists (All, Paid, Active), and "Today's Orders" section.

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle Kit**: Database migration and schema management.
- **Connect-pg-simple**: PostgreSQL session store.

### Development Tools
- **Vite**: Build tool with TypeScript support.
- **ESBuild**: Fast bundling.
- **Tailwind CSS**: Utility-first CSS framework.

### UI Component Libraries
- **Radix UI**: Headless UI primitives.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Utility for type-safe component variants.
- **Embla Carousel**: Touch-friendly carousel.

### Styling & Animation
- **PostCSS**: CSS processing.
- **Clsx & Tailwind Merge**: Conditional class name utilities.
- **Framer Motion**: Animation library.

### Data Management
- **TanStack Query**: Server state management.
- **React Hook Form**: Form state management.
- **Hookform Resolvers**: Integration for form validation.
- **Date-fns**: Date manipulation utilities.

### File Handling & Analysis
- **pdf-parse**: PDF text extraction.
- **OpenAI GPT-4o Vision**: Image OCR for scanned lab reports.

### Font & Typography
- **Google Fonts**: Inter and Playfair Display.