import {
  users,
  teams,
  websites,
  conquests,
  gameSessions,
  type User,
  type UpsertUser,
  type CreateUser,
  type Team,
  type InsertTeam,
  type Website,
  type Conquest,
  type GameSession,
  type InsertGameSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import { parseHuntUrl, DEFAULT_WEBSITE_POINTS } from "@shared/url";
import type { ConquestOutcome } from "@shared/conquest";

export type ConquestWithContext = Conquest & { team: Team; website?: Website };

export type RecordedAttempt = {
  teamId: string;
  websiteId: string | null;
  url: string;
  normalizedUrl: string;
  isSuccessful: boolean;
  points: number;
  outcome: ConquestOutcome;
};

export type BulkWebsiteReport = {
  added: Website[];
  duplicates: string[];
  rejected: { url: string; reason: string }[];
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Team operations
  getTeams(): Promise<Team[]>;
  getTeamById(id: string): Promise<Team | undefined>;
  getTeamByUserId(userId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  applyAttemptToTeam(teamId: string, points: number, conquered: boolean): Promise<void>;

  // Website operations
  getWebsites(): Promise<Website[]>;
  getAvailableWebsites(): Promise<Website[]>;
  findWebsiteForGuess(key: string, host: string): Promise<Website | undefined>;
  createWebsiteFromUrl(url: string, points?: number, source?: string): Promise<Website | undefined>;
  createWebsitesBulk(urls: string[]): Promise<BulkWebsiteReport>;
  claimWebsite(websiteId: string, teamId: string): Promise<boolean>;

  // Conquest operations
  getConquestsByTeam(teamId: string): Promise<Conquest[]>;
  getTeamAttempt(teamId: string, normalizedUrl: string): Promise<Conquest | undefined>;
  getRecentConquests(limit?: number): Promise<ConquestWithContext[]>;
  recordAttempt(attempt: RecordedAttempt): Promise<Conquest>;

  // Game session operations
  getCurrentGameSession(): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<void>;
  pauseCurrentGame(): Promise<GameSession>;
  resumeCurrentGame(): Promise<GameSession>;
  endCurrentGame(): Promise<GameSession>;

  // Admin operations
  getGameStats(): Promise<GameStats>;
}

export type GameStats = {
  totalWebsites: number;
  conquered: number;
  discovered: number;
  activeTeams: number;
  totalAttempts: number;
};

export class DatabaseStorage implements IStorage {
  // ---------------------------------------------------------------- users

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.firstName, users.lastName, users.email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Usernames are matched case-insensitively so "Dileep" and "dileep" are one
    // account, matching how people actually type their own name.
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);
    return user;
  }

  async createUser(userData: CreateUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  // ---------------------------------------------------------------- teams

  async getTeams(): Promise<Team[]> {
    return db
      .select()
      .from(teams)
      .orderBy(desc(teams.score), desc(teams.websitesConquered), teams.name);
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByUserId(userId: string): Promise<Team | undefined> {
    // A user belongs to a team either as its captain or by appearing in the
    // members array (which stores user ids).
    const [team] = await db
      .select()
      .from(teams)
      .where(sql`${teams.captainId} = ${userId} OR ${userId} = ANY(${teams.members})`);
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  /**
   * Applies one scored attempt to a team.
   *
   * `conquered` is passed explicitly rather than inferred from `points > 0`, so
   * that a zero-point or neutral result can never silently inflate the
   * conquered counter.
   */
  async applyAttemptToTeam(teamId: string, points: number, conquered: boolean): Promise<void> {
    await db
      .update(teams)
      .set({
        score: sql`${teams.score} + ${points}`,
        totalAttempts: sql`${teams.totalAttempts} + 1`,
        ...(conquered
          ? {
              successfulAttempts: sql`${teams.successfulAttempts} + 1`,
              websitesConquered: sql`${teams.websitesConquered} + 1`,
            }
          : {}),
      })
      .where(eq(teams.id, teamId));
  }

  // ------------------------------------------------------------- websites

  async getWebsites(): Promise<Website[]> {
    return db.select().from(websites).orderBy(websites.domain, websites.normalizedUrl);
  }

  async getAvailableWebsites(): Promise<Website[]> {
    return db
      .select()
      .from(websites)
      .where(eq(websites.isConquered, false))
      .orderBy(websites.domain);
  }

  /**
   * Resolves a guess to a target.
   *
   * Tries the full normalized key first, then falls back to the bare host. The
   * fallback matters because admins seed roots ("cvit.iiit.ac.in") while players
   * often paste whatever deep link they landed on - having found the site, they
   * should not be marked wrong over a path suffix.
   */
  async findWebsiteForGuess(key: string, host: string): Promise<Website | undefined> {
    const candidates = await db
      .select()
      .from(websites)
      .where(
        key === host
          ? eq(websites.normalizedUrl, key)
          : or(eq(websites.normalizedUrl, key), eq(websites.normalizedUrl, host)),
      );

    return (
      candidates.find((site) => site.normalizedUrl === key) ??
      candidates.find((site) => site.normalizedUrl === host)
    );
  }

  /**
   * Inserts a website from a raw URL, deriving every stored field from the
   * canonical parse. Returns undefined for unparseable input, and the existing
   * row if the site is already known.
   */
  async createWebsiteFromUrl(
    url: string,
    points: number = DEFAULT_WEBSITE_POINTS,
    source: string = "admin",
  ): Promise<Website | undefined> {
    const parsed = parseHuntUrl(url);
    if (!parsed.ok) return undefined;

    const [inserted] = await db
      .insert(websites)
      .values({
        url: parsed.href,
        normalizedUrl: parsed.key,
        domain: parsed.host,
        points,
        source,
      })
      .onConflictDoNothing({ target: websites.normalizedUrl })
      .returning();

    if (inserted) return inserted;

    // Lost an insert race, or the site was already seeded: return what is there.
    const [existing] = await db
      .select()
      .from(websites)
      .where(eq(websites.normalizedUrl, parsed.key));
    return existing;
  }

  /**
   * Bulk import for the admin panel. One bad line must never sink the batch, so
   * every URL is validated and normalized independently and the caller gets a
   * per-URL report back.
   */
  async createWebsitesBulk(urls: string[]): Promise<BulkWebsiteReport> {
    const rejected: { url: string; reason: string }[] = [];
    const rows = new Map<string, { url: string; normalizedUrl: string; domain: string }>();

    for (const raw of urls) {
      const parsed = parseHuntUrl(raw);
      if (!parsed.ok) {
        rejected.push({ url: raw, reason: parsed.reason });
        continue;
      }
      if (!parsed.isHuntDomain) {
        rejected.push({ url: raw, reason: "not_hunt_domain" });
        continue;
      }
      // Deduplicate within the batch itself: pasting the same site twice in
      // different shapes is the norm, not an error.
      rows.set(parsed.key, {
        url: parsed.href,
        normalizedUrl: parsed.key,
        domain: parsed.host,
      });
    }

    if (rows.size === 0) return { added: [], duplicates: [], rejected };

    const keys = [...rows.keys()];
    const added = await db
      .insert(websites)
      .values([...rows.values()])
      .onConflictDoNothing({ target: websites.normalizedUrl })
      .returning();

    const addedKeys = new Set(added.map((site) => site.normalizedUrl));
    const duplicates = keys.filter((key) => !addedKeys.has(key));

    return { added, duplicates, rejected };
  }

  /**
   * Claims a website for a team, atomically.
   *
   * The `isConquered = false` guard is part of the UPDATE rather than a prior
   * read, so two teams submitting the same URL at the same moment cannot both
   * be told they won it. Returns false when someone else got there first.
   */
  async claimWebsite(websiteId: string, teamId: string): Promise<boolean> {
    const claimed = await db
      .update(websites)
      .set({ isConquered: true, conqueredBy: teamId, conqueredAt: new Date() })
      .where(and(eq(websites.id, websiteId), eq(websites.isConquered, false)))
      .returning({ id: websites.id });

    return claimed.length > 0;
  }

  // ------------------------------------------------------------- conquests

  async getConquestsByTeam(teamId: string): Promise<Conquest[]> {
    return db
      .select()
      .from(conquests)
      .where(eq(conquests.teamId, teamId))
      .orderBy(desc(conquests.attemptedAt));
  }

  /** The team's most recent attempt at one normalized URL, if any. */
  async getTeamAttempt(teamId: string, normalizedUrl: string): Promise<Conquest | undefined> {
    const [attempt] = await db
      .select()
      .from(conquests)
      .where(and(eq(conquests.teamId, teamId), eq(conquests.normalizedUrl, normalizedUrl)))
      .orderBy(desc(conquests.attemptedAt))
      .limit(1);
    return attempt;
  }

  async getRecentConquests(limit = 20): Promise<ConquestWithContext[]> {
    const results = await db
      .select({ conquest: conquests, team: teams, website: websites })
      .from(conquests)
      .innerJoin(teams, eq(conquests.teamId, teams.id))
      .leftJoin(websites, eq(conquests.websiteId, websites.id))
      .orderBy(desc(conquests.attemptedAt))
      .limit(limit);

    return results.map(({ conquest, team, website }) => ({
      ...conquest,
      team,
      website: website ?? undefined,
    }));
  }

  async recordAttempt(attempt: RecordedAttempt): Promise<Conquest> {
    const [recorded] = await db.insert(conquests).values(attempt).returning();
    return recorded;
  }

  // ---------------------------------------------------------- game session

  /**
   * The live session, with elapsed time applied.
   *
   * A game with a duration has to stop on its own - nobody is guaranteed to be
   * in the admin panel at the deadline - so an active session past its end time
   * is ended here, on read, before anyone can act on it.
   */
  async getCurrentGameSession(): Promise<GameSession | undefined> {
    const [session] = await db
      .select()
      .from(gameSessions)
      .where(sql`${gameSessions.status} != 'ended'`)
      .orderBy(desc(gameSessions.createdAt))
      .limit(1);

    if (!session) return undefined;

    const deadline = sessionDeadline(session);
    if (session.status === "active" && deadline && Date.now() >= deadline.getTime()) {
      await this.updateGameSession(session.id, { status: "ended", endTime: deadline });
      return { ...session, status: "ended", endTime: deadline };
    }

    return session;
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    // Only one session may be live at a time; retire anything still open.
    await db
      .update(gameSessions)
      .set({ status: "ended", endTime: new Date() })
      .where(sql`${gameSessions.status} != 'ended'`);

    const [newSession] = await db.insert(gameSessions).values(session).returning();
    return newSession;
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<void> {
    await db.update(gameSessions).set(updates).where(eq(gameSessions.id, id));
  }

  async pauseCurrentGame(): Promise<GameSession> {
    const current = await this.requireLiveSession("pause");
    if (current.status !== "active") {
      throw new GameStateError(`Cannot pause a game that is ${current.status}.`);
    }
    await this.updateGameSession(current.id, { status: "paused" });
    return { ...current, status: "paused" };
  }

  async resumeCurrentGame(): Promise<GameSession> {
    const current = await this.requireLiveSession("resume");
    if (current.status !== "paused") {
      throw new GameStateError(`Cannot resume a game that is ${current.status}.`);
    }
    await this.updateGameSession(current.id, { status: "active" });
    return { ...current, status: "active" };
  }

  async endCurrentGame(): Promise<GameSession> {
    const current = await this.requireLiveSession("end");
    const endTime = new Date();
    await this.updateGameSession(current.id, { status: "ended", endTime });
    return { ...current, status: "ended", endTime };
  }

  private async requireLiveSession(action: string): Promise<GameSession> {
    const current = await this.getCurrentGameSession();
    if (!current || current.status === "ended") {
      throw new GameStateError(`There is no running game to ${action}.`);
    }
    return current;
  }

  // ----------------------------------------------------------------- stats

  async getGameStats(): Promise<GameStats> {
    // count(*) comes back as bigint, which node-postgres hands over as a string;
    // cast in SQL so the API always emits real numbers.
    const [websiteStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        conquered: sql<number>`count(*) filter (where ${websites.isConquered})::int`,
        discovered: sql<number>`count(*) filter (where ${websites.source} = 'discovered')::int`,
      })
      .from(websites);

    const [teamStats] = await db
      .select({
        activeTeams: sql<number>`count(*)::int`,
        totalAttempts: sql<number>`coalesce(sum(${teams.totalAttempts}), 0)::int`,
      })
      .from(teams);

    return {
      totalWebsites: websiteStats?.total ?? 0,
      conquered: websiteStats?.conquered ?? 0,
      discovered: websiteStats?.discovered ?? 0,
      activeTeams: teamStats?.activeTeams ?? 0,
      totalAttempts: teamStats?.totalAttempts ?? 0,
    };
  }
}

/** Raised for illegal game-state transitions so routes can answer 409, not 500. */
export class GameStateError extends Error {
  readonly status = 409;
}

/** When an active session with a duration is scheduled to finish. */
export function sessionDeadline(session: GameSession): Date | null {
  if (!session.startTime || !session.duration) return null;
  return new Date(new Date(session.startTime).getTime() + session.duration * 60_000);
}

export const storage = new DatabaseStorage();
