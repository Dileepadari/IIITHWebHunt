# Website Hunt Game - IIIT Hyderabad

## Overview

This is a competitive gaming platform called "Website Hunt" designed for IIIT Hyderabad teams. It's a real-time multiplayer game where teams compete to discover and "conquer" IIIT websites to earn points and climb the leaderboard. The application features team management, live scoring, conquest tracking, and an admin panel for game management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application follows a monorepo structure with separate client and server directories:
- **Frontend**: React + TypeScript with Vite bundler
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket integration for live updates
- **Authentication**: Replit Auth with session management

### Directory Organization
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared schemas and types between client/server
- Root level configuration files for build tools

## Key Components

### Frontend Architecture
- **React Router**: Using `wouter` library for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Radix UI components with custom gaming-themed styling
- **Styling**: Tailwind CSS with custom gaming color scheme (dark theme, electric blue, neon green)
- **Real-time Updates**: WebSocket client for live data synchronization

### Backend Architecture
- **API Structure**: RESTful endpoints with Express.js
- **Database Layer**: Drizzle ORM with PostgreSQL via Neon
- **Session Management**: PostgreSQL-backed sessions with `connect-pg-simple`
- **WebSocket Server**: Real-time communication for live updates
- **Middleware**: Custom logging, error handling, and authentication

### Database Schema
The system uses PostgreSQL with the following main entities:
- **users**: User profiles with admin flags
- **teams**: Team information with scoring metrics
- **websites**: IIIT websites available for conquest
- **conquests**: Records of team attempts (successful/failed)
- **gameSessions**: Game timing and duration management
- **sessions**: Authentication session storage

## Data Flow

### Authentication Flow
1. Users authenticate via Replit Auth (OAuth)
2. User data stored in PostgreSQL users table
3. Sessions managed server-side with PostgreSQL storage
4. Admin privileges controlled via user flags

### Game Flow
1. Admin starts game session with duration
2. Teams attempt to conquer websites by submitting URLs
3. System validates submissions and awards/deducts points
4. Real-time updates broadcast via WebSocket
5. Leaderboard updates automatically

### Real-time Updates
- WebSocket connection established on page load
- Server broadcasts conquest results, team updates, game state changes
- Client invalidates relevant React Query caches for fresh data
- UI updates automatically without page refresh

## External Dependencies

### Primary Technologies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **express**: Web server framework
- **ws**: WebSocket implementation

### Authentication
- **passport**: Authentication middleware
- **openid-client**: OAuth client for Replit Auth
- **express-session**: Session management

### Development Tools
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- Express server with hot reload via `tsx`
- Database migrations managed with Drizzle Kit
- Replit-specific development tooling integrated

### Production Build
- Frontend built with Vite to `dist/public`
- Backend bundled with esbuild to `dist/index.js`
- Single production server serves both static files and API
- Database schema pushed via Drizzle migrations

### Environment Configuration
- Database URL from environment variables
- Session secrets for authentication
- Replit-specific OAuth configuration
- Development vs production mode handling

### Key Scripts
- `dev`: Development mode with hot reload
- `build`: Production build of both frontend and backend
- `start`: Production server startup
- `db:push`: Database schema deployment