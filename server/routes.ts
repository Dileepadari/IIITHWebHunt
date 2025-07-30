import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertTeamSchema,
  insertWebsiteSchema,
  insertConquestSchema,
  insertGameSessionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  setupAuth(app);

  // User routes
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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
      const userId = req.user.id;
      const team = await storage.getTeamByUserId(userId);
      res.json(team);
    } catch (error) {
      console.error("Error fetching user team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);

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
      const userId = req.user.id;
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

  app.post('/api/websites/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { urls } = req.body;
      if (!Array.isArray(urls)) {
        return res.status(400).json({ message: "URLs must be an array" });
      }

      const websites = await storage.createWebsitesBulk(urls);
      res.json({ count: websites.length, websites });
    } catch (error) {
      console.error("Error creating websites in bulk:", error);
      res.status(500).json({ message: "Failed to create websites" });
    }
  });

  // Conquest routes
  app.post('/api/conquests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const team = await storage.getTeamByUserId(userId);

      if (!team) {
        return res.status(400).json({ message: "You must be part of a team to make conquest attempts" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const website = await storage.getWebsiteByUrl(url);
      let points = -25;
      let isSuccessful = false;
      let websiteId = null;

      if (website && !website.isConquered) {
        points = website.points || 100;
        isSuccessful = true;
        websiteId = website.id;
        await storage.conquerWebsite(website.id, team.id);
      }

      const conquest = await storage.createConquest({
        teamId: team.id,
        websiteId,
        url,
        isSuccessful,
        points,
      });

      await storage.updateTeamScore(team.id, points);

      const updatedTeams = await storage.getTeams();
      broadcastToAll({
        type: 'CONQUEST_RESULT',
        data: {
          conquest: { ...conquest, team, website },
          leaderboard: updatedTeams,
        }
      });

      res.json({ conquest, points, isSuccessful });
    } catch (error) {
      console.error("Error processing conquest:", error);
      res.status(500).json({ message: "Failed to process conquest" });
    }
  });

  app.get('/api/conquests/team/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const team = await storage.getTeamByUserId(userId);
      if (!team) return res.json([]);
      const conquests = await storage.getConquestsByTeam(team.id);
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const session = await storage.createGameSession({
        status: 'active',
        startTime: new Date(),
        duration: req.body.duration || 180,
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

  app.post('/api/game/pause', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const session = await storage.pauseCurrentGame();
      broadcastToAll({
        type: 'GAME_PAUSED',
        data: session
      });

      res.json(session);
    } catch (error) {
      console.error("Error pausing game:", error);
      res.status(500).json({ message: "Failed to pause game" });
    }
  });

  app.post('/api/game/resume', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const session = await storage.resumeCurrentGame();
      broadcastToAll({
        type: 'GAME_RESUMED',
        data: session
      });

      res.json(session);
    } catch (error) {
      console.error("Error resuming game:", error);
      res.status(500).json({ message: "Failed to resume game" });
    }
  });

  app.post('/api/game/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const session = await storage.endCurrentGame();
      broadcastToAll({
        type: 'GAME_ENDED',
        data: session
      });

      res.json(session);
    } catch (error) {
      console.error("Error ending game:", error);
      res.status(500).json({ message: "Failed to end game" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Create HTTP server manually
  const httpServer = createServer(app);

  // WebSocket server for real-time updates (noServer mode)
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log("Received WebSocket message:", data);
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  // Forward upgrade requests to the correct WebSocket server
  httpServer.on("upgrade", (request, socket, head) => {
    const { url } = request;

    if (url?.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }

    // If not /ws, let Vite (or other handlers) handle the upgrade
  });

  // Make broadcast available globally
  function broadcastToAll(data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  (global as any).broadcastToAll = broadcastToAll;

  return httpServer;
}
