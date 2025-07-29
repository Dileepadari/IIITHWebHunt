import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTeamSchema, insertWebsiteSchema, insertConquestSchema, insertGameSessionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Team routes
  app.get('/api/teams', isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get('/api/teams/my-team', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      res.json(team);
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      
      // Broadcast team creation
      broadcastToAll({
        type: 'TEAM_CREATED',
        data: team
      });
      
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Website routes
  app.get('/api/websites', isAuthenticated, async (req, res) => {
    try {
      const websites = await storage.getWebsites();
      res.json(websites);
    } catch (error) {
      console.error("Error fetching websites:", error);
      res.status(500).json({ message: "Failed to fetch websites" });
    }
  });

  app.get('/api/websites/available', isAuthenticated, async (req, res) => {
    try {
      const websites = await storage.getAvailableWebsites();
      res.json(websites);
    } catch (error) {
      console.error("Error fetching available websites:", error);
      res.status(500).json({ message: "Failed to fetch available websites" });
    }
  });

  app.post('/api/websites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertWebsiteSchema.parse(req.body);
      const website = await storage.createWebsite(validatedData);
      res.json(website);
    } catch (error) {
      console.error("Error creating website:", error);
      res.status(500).json({ message: "Failed to create website" });
    }
  });

  // Conquest routes
  app.post('/api/conquests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const team = await storage.getTeamByUserId(userId);
      
      if (!team) {
        return res.status(400).json({ message: "You must be part of a team to make conquest attempts" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Check if URL is a valid IIIT website
      const website = await storage.getWebsiteByUrl(url);
      let points = -25; // Default penalty for wrong guess
      let isSuccessful = false;
      let websiteId = null;

      if (website && !website.isConquered) {
        // Successful conquest
        points = website.points;
        isSuccessful = true;
        websiteId = website.id;
        
        // Mark website as conquered
        await storage.conquerWebsite(website.id, team.id);
      }

      // Record the conquest attempt
      const conquest = await storage.createConquest({
        teamId: team.id,
        websiteId,
        url,
        isSuccessful,
        points,
      });

      // Update team score
      await storage.updateTeamScore(team.id, points);

      // Broadcast conquest result
      const updatedTeams = await storage.getTeams();
      broadcastToAll({
        type: 'CONQUEST_RESULT',
        data: {
          conquest: {
            ...conquest,
            team,
            website,
          },
          leaderboard: updatedTeams,
        }
      });

      res.json({ conquest, points, isSuccessful });
    } catch (error) {
      console.error("Error processing conquest:", error);
      res.status(500).json({ message: "Failed to process conquest" });
    }
  });

  app.get('/api/conquests/team/:teamId', isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const conquests = await storage.getConquestsByTeam(teamId);
      res.json(conquests);
    } catch (error) {
      console.error("Error fetching team conquests:", error);
      res.status(500).json({ message: "Failed to fetch team conquests" });
    }
  });

  app.get('/api/conquests/recent', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const conquests = await storage.getRecentConquests(limit);
      res.json(conquests);
    } catch (error) {
      console.error("Error fetching recent conquests:", error);
      res.status(500).json({ message: "Failed to fetch recent conquests" });
    }
  });

  // Game session routes
  app.get('/api/game/current', isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getCurrentGameSession();
      res.json(session);
    } catch (error) {
      console.error("Error fetching current game session:", error);
      res.status(500).json({ message: "Failed to fetch current game session" });
    }
  });

  app.post('/api/game/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const session = await storage.createGameSession({
        status: 'active',
        startTime: new Date(),
        duration: req.body.duration || 180, // Default 3 hours
      });

      broadcastToAll({
        type: 'GAME_STARTED',
        data: session
      });

      res.json(session);
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.patch('/api/game/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.updateGameSession(id, req.body);

      broadcastToAll({
        type: 'GAME_UPDATED',
        data: { id, ...req.body }
      });

      res.json({ message: "Game session updated" });
    } catch (error) {
      console.error("Error updating game session:", error);
      res.status(500).json({ message: "Failed to update game session" });
    }
  });

  // Admin stats route
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getGameStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // Broadcast function for real-time updates
  function broadcastToAll(data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Make broadcastToAll available globally (for development)
  (global as any).broadcastToAll = broadcastToAll;

  return httpServer;
}
