import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, GameStateError, sessionDeadline } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { evaluateConquest } from "./conquest";
import { checkCooldown } from "./rateLimit";
import { isUniqueViolation, isForeignKeyViolation } from "./dbErrors";
import { insertTeamSchema, type User } from "@shared/schema";
import { SUBMISSION_COOLDOWN_MS } from "@shared/url";
import type { ConquestResult } from "@shared/conquest";
import { z } from "zod";
import { log } from "./vite";

/** Every real-time message the server pushes. Mirrored by the client hook. */
export type ServerEvent =
  | "TEAM_CREATED"
  | "WEBSITES_ADDED"
  | "CONQUEST_RESULT"
  | "GAME_STARTED"
  | "GAME_PAUSED"
  | "GAME_RESUMED"
  | "GAME_ENDED";

/** Requires an authenticated admin; every admin route goes through this. */
const isAdmin: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as User | undefined;
  if (!sessionUser?.id) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Re-read from the database rather than trusting the session copy, so that
  // revoking admin takes effect immediately instead of at next login.
  const user = await storage.getUser(sessionUser.id);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

/** Wraps an async handler so a rejected promise becomes a 500, not a crash. */
function route(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const bulkUrlsSchema = z.object({
  urls: z.array(z.string()).min(1, "Provide at least one URL").max(500),
});

const conquestSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
});

const startGameSchema = z.object({
  duration: z.coerce.number().int().positive().max(24 * 60).default(180),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  setupAuth(app);

  // ----------------------------------------------------------------- users

  app.get(
    "/api/users",
    isAuthenticated,
    isAdmin,
    route(async (_req, res) => {
      const users = await storage.getAllUsers();
      // Never ship password hashes to the admin panel; it only needs identities.
      res.json(users.map(({ password, ...user }) => user));
    }),
  );

  // ----------------------------------------------------------------- teams

  app.get(
    "/api/teams",
    isAuthenticated,
    route(async (_req, res) => {
      res.json(await storage.getTeams());
    }),
  );

  app.get(
    "/api/teams/my-team",
    isAuthenticated,
    route(async (req, res) => {
      const team = await storage.getTeamByUserId((req.user as User).id);
      res.json(team ?? null);
    }),
  );

  app.post(
    "/api/teams",
    isAuthenticated,
    isAdmin,
    route(async (req, res) => {
      const parsed = insertTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid team" });
      }

      const name = parsed.data.name.trim();
      if (!name) return res.status(400).json({ message: "Team name is required" });

      const members = (parsed.data.members ?? []).map((m) => m.trim()).filter(Boolean);
      if (members.length === 0) {
        return res.status(400).json({ message: "A team needs at least one member" });
      }

      // A captain must also be a member, otherwise they cannot submit for the
      // team they lead (membership is what /teams/my-team looks up).
      const captainId = parsed.data.captainId || null;
      if (captainId && !members.includes(captainId)) members.push(captainId);

      try {
        const team = await storage.createTeam({ ...parsed.data, name, members, captainId });
        broadcast("TEAM_CREATED", team);
        res.status(201).json(team);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ message: `A team named "${name}" already exists` });
        }
        if (isForeignKeyViolation(error)) {
          return res.status(400).json({ message: "That captain is not a registered user" });
        }
        throw error;
      }
    }),
  );

  // -------------------------------------------------------------- websites

  app.get(
    "/api/websites",
    isAuthenticated,
    route(async (_req, res) => {
      res.json(await storage.getWebsites());
    }),
  );

  app.get(
    "/api/websites/available",
    isAuthenticated,
    route(async (_req, res) => {
      res.json(await storage.getAvailableWebsites());
    }),
  );

  app.post(
    "/api/websites/bulk",
    isAuthenticated,
    isAdmin,
    route(async (req, res) => {
      const parsed = bulkUrlsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid URLs" });
      }

      const report = await storage.createWebsitesBulk(parsed.data.urls);
      if (report.added.length > 0) broadcast("WEBSITES_ADDED", { count: report.added.length });

      res.json({
        count: report.added.length,
        duplicates: report.duplicates.length,
        rejected: report.rejected,
        websites: report.added,
      });
    }),
  );

  // -------------------------------------------------------------- conquest

  app.post(
    "/api/conquests",
    isAuthenticated,
    route(async (req, res) => {
      const parsed = conquestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "URL is required" });
      }

      const team = await storage.getTeamByUserId((req.user as User).id);
      if (!team) {
        return res
          .status(403)
          .json({ message: "You must be part of a team to make conquest attempts" });
      }

      // The hunt is only open while a game is actually running.
      const session = await storage.getCurrentGameSession();
      if (!session || session.status !== "active") {
        return res.status(409).json({
          message:
            session?.status === "paused"
              ? "The game is paused. Hang tight until an admin resumes it."
              : "There is no game running right now.",
        });
      }

      const cooldown = checkCooldown(team.id);
      if (!cooldown.allowed) {
        res.setHeader("Retry-After", Math.ceil(cooldown.retryAfterMs / 1000));
        return res.status(429).json({
          message: "Slow down - one submission every 2 seconds.",
          retryAfterMs: cooldown.retryAfterMs,
        });
      }

      const decision = await evaluateConquest(parsed.data.url, team);
      if (decision.kind === "rejected") {
        return res.status(400).json({ message: decision.message, reason: decision.reason });
      }

      const result: ConquestResult = {
        outcome: decision.outcome,
        points: decision.score ? decision.points : 0,
        isSuccessful: decision.isSuccessful,
        url: decision.url,
        discovered: decision.discovered,
        website: decision.website,
        conqueredBy: decision.conqueredBy,
        team,
      };

      if (decision.record) {
        result.conquest = await storage.recordAttempt({
          teamId: team.id,
          websiteId: decision.website?.id ?? null,
          url: decision.url,
          // Always the canonical key, never the display URL: this is the column
          // getTeamAttempt() matches on to recognise a repeat submission.
          normalizedUrl: decision.key,
          isSuccessful: decision.isSuccessful,
          points: result.points,
          outcome: decision.outcome,
        });
      }

      if (decision.score) {
        await storage.applyAttemptToTeam(team.id, result.points, decision.isSuccessful);
        result.team = await storage.getTeamById(team.id);
      }

      // Only broadcast when something actually changed; a repeat submission or a
      // "already done" reply must not spam every connected leaderboard.
      if (decision.record || decision.score) {
        broadcast("CONQUEST_RESULT", {
          conquest: result.conquest,
          outcome: decision.outcome,
          team: result.team,
          website: decision.website,
          leaderboard: await storage.getTeams(),
        });
      }

      res.json(result);
    }),
  );

  app.get(
    "/api/conquests/my-team",
    isAuthenticated,
    route(async (req, res) => {
      const team = await storage.getTeamByUserId((req.user as User).id);
      if (!team) return res.json([]);
      res.json(await storage.getConquestsByTeam(team.id));
    }),
  );

  app.get(
    "/api/conquests/recent",
    isAuthenticated,
    route(async (req, res) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      res.json(await storage.getRecentConquests(limit));
    }),
  );

  // ---------------------------------------------------------- game session

  app.get(
    "/api/game/current",
    isAuthenticated,
    route(async (_req, res) => {
      const session = await storage.getCurrentGameSession();
      if (!session) return res.json(null);

      // Hand the client an absolute deadline instead of letting it re-derive one
      // from start time and duration against a possibly-skewed local clock.
      const deadline = sessionDeadline(session);
      res.json({
        ...session,
        endsAt: deadline ? deadline.toISOString() : null,
        serverTime: new Date().toISOString(),
        cooldownMs: SUBMISSION_COOLDOWN_MS,
      });
    }),
  );

  app.post(
    "/api/game/start",
    isAuthenticated,
    isAdmin,
    route(async (req, res) => {
      const parsed = startGameSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Duration must be a positive number of minutes" });
      }

      const session = await storage.createGameSession({
        status: "active",
        startTime: new Date(),
        duration: parsed.data.duration,
      });

      broadcast("GAME_STARTED", session);
      res.status(201).json(session);
    }),
  );

  for (const [path, action, event] of [
    ["pause", "pauseCurrentGame", "GAME_PAUSED"],
    ["resume", "resumeCurrentGame", "GAME_RESUMED"],
    ["end", "endCurrentGame", "GAME_ENDED"],
  ] as const) {
    app.post(
      `/api/game/${path}`,
      isAuthenticated,
      isAdmin,
      route(async (_req, res) => {
        const session = await storage[action]();
        broadcast(event, session);
        res.json(session);
      }),
    );
  }

  app.get(
    "/api/admin/stats",
    isAuthenticated,
    route(async (_req, res) => {
      // Readable by any player: the same counters drive the public hero banner.
      res.json(await storage.getGameStats());
    }),
  );

  // ------------------------------------------------------------- websocket

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: "CONNECTED" }));
    ws.on("error", (error) => log(`websocket error: ${error.message}`, "ws"));
  });

  httpServer.on("upgrade", (request, socket, head) => {
    // Only claim /ws; anything else belongs to Vite's HMR socket in development.
    if (!request.url?.startsWith("/ws")) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  function broadcast(type: ServerEvent, data: unknown): void {
    const payload = JSON.stringify({ type, data });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  // Illegal state transitions are the caller's fault, not a server fault.
  app.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof GameStateError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  });

  return httpServer;
}
