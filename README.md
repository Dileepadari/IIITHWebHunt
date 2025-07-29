# Website Hunt Game - IIIT Hyderabad

A competitive web-based gaming platform where IIIT Hyderabad teams compete to discover and "conquer" IIIT websites to earn points and climb the leaderboard.

## Features

- **Real-time Multiplayer Gaming**: WebSocket-powered live updates for instant leaderboard changes
- **Team Management**: Create teams with custom sizes and captain selection from registered users
- **Conquest System**: +100 points for correct IIIT website discoveries, -25 for incorrect attempts
- **Admin Panel**: Comprehensive game management including team creation, website management, and game session control
- **External Authentication**: Secure login system using Replit Auth
- **Live Leaderboard**: Real-time scoring with team rankings and conquest statistics
- **Modern Gaming UI**: Dark theme with neon accents and responsive design

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with custom gaming theme
- **Radix UI** components for accessibility
- **TanStack Query** for server state management
- **WebSocket client** for real-time updates

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database with Neon serverless
- **Drizzle ORM** for type-safe database operations
- **WebSocket server** for real-time communication
- **Replit Auth** for OAuth authentication

## Local Development Setup

### Prerequisites

- Node.js 20+ installed
- PostgreSQL database (local or cloud)
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd website-hunt-game
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/website_hunt"
PGHOST="localhost"
PGPORT="5432"
PGUSER="your_username"
PGPASSWORD="your_password"
PGDATABASE="website_hunt"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-here"

# Replit Auth Configuration (for production)
REPL_ID="your-repl-id"
ISSUER_URL="https://replit.com/oidc"
REPLIT_DOMAINS="your-domain.replit.app"
```

### 3. Database Setup

```bash
# Push database schema
npm run db:push

# Verify database connection
npm run db:studio  # Opens Drizzle Studio for database inspection
```

### 4. Initial Admin Setup

After starting the application, you'll need to set up an admin user:

1. Start the application: `npm run dev`
2. Navigate to the app and log in with Replit Auth
3. Manually update your user record in the database to set `is_admin = true`

```sql
-- Connect to your database and run:
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### 5. Start Development

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Production Deployment

### Using Replit

1. **Import Project**: Import this repository to Replit
2. **Database Setup**: Provision a PostgreSQL database through Replit
3. **Environment Variables**: Set up the required environment variables in Replit Secrets
4. **Deploy**: Use Replit's deploy feature

### Manual Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Set Environment Variables**: Configure all required environment variables on your hosting platform

3. **Database Migration**: Run database schema push on production:
   ```bash
   npm run db:push
   ```

4. **Start Production Server**:
   ```bash
   npm start
   ```

## Game Administration

### Setting Up a Game

1. **Login as Admin**: Use Replit Auth to login with an admin account
2. **Add Websites**: Navigate to Admin Panel > Websites tab and bulk add IIIT website URLs
3. **Create Teams**: Use Admin Panel > Teams tab to create teams with members and captains
4. **Start Game**: Go to Admin Panel > Game Control and start a new game session

### Managing Teams

- Teams can have custom sizes (flexible member count)
- Captains can be selected from registered users via dropdown
- Members are added as text entries during team creation
- Teams automatically appear on the leaderboard once created

### Scoring System

- **Correct Website Discovery**: +100 points
- **Incorrect Attempt**: -25 points
- **Real-time Updates**: All score changes broadcast via WebSocket

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user
- `GET /api/login` - Start login flow
- `GET /api/logout` - Logout user

### Teams
- `GET /api/teams` - Get all teams (leaderboard)
- `GET /api/teams/my-team` - Get current user's team
- `POST /api/teams` - Create new team (admin only)

### Websites
- `GET /api/websites` - Get all websites
- `GET /api/websites/available` - Get unconquered websites
- `POST /api/websites/bulk` - Bulk add websites (admin only)

### Game Management
- `GET /api/game/current` - Get current game session
- `POST /api/game/start` - Start new game (admin only)
- `POST /api/game/pause` - Pause current game (admin only)
- `POST /api/game/resume` - Resume paused game (admin only)
- `POST /api/game/end` - End current game (admin only)

### Conquests
- `POST /api/conquests` - Submit website conquest attempt
- `GET /api/conquests/recent` - Get recent conquest attempts
- `GET /api/conquests/team/:userId` - Get user's team conquests

## Database Schema

### Core Tables

- **users**: User profiles with admin flags
- **teams**: Team information with scoring metrics
- **websites**: IIIT websites available for conquest
- **conquests**: Records of team attempts (successful/failed)
- **gameSessions**: Game timing and duration management
- **sessions**: Authentication session storage

### Relationships

- Teams have captains (users) and track conquest statistics
- Websites can be conquered by teams
- Conquests link teams to websites with attempt results
- Game sessions control overall game state

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Check firewall settings

2. **Authentication Problems**
   - Verify Replit Auth configuration
   - Check REPL_ID and domain settings
   - Ensure SESSION_SECRET is set

3. **WebSocket Connection Issues**
   - Check if port 5000 is available
   - Verify WebSocket path is `/ws`
   - Check browser console for connection errors

### Development Tips

- Use `npm run db:studio` to inspect database contents
- Check browser console for client-side errors
- Monitor server logs for API request issues
- Use browser network tab to debug API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.