import {
  users,
  teams,
  websites,
  conquests,
  gameSessions,
  type User,
  type UpsertUser,
  type Team,
  type InsertTeam,
  type Website,
  type InsertWebsite,
  type Conquest,
  type InsertConquest,
  type GameSession,
  type InsertGameSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Team operations
  getTeams(): Promise<Team[]>;
  getTeamById(id: string): Promise<Team | undefined>;
  getTeamByUserId(userId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeamScore(teamId: string, points: number): Promise<void>;
  
  // Website operations
  getWebsites(): Promise<Website[]>;
  getAvailableWebsites(): Promise<Website[]>;
  getWebsiteByUrl(url: string): Promise<Website | undefined>;
  createWebsite(website: InsertWebsite): Promise<Website>;
  conquerWebsite(websiteId: string, teamId: string): Promise<void>;
  
  // Conquest operations
  getConquestsByTeam(teamId: string): Promise<Conquest[]>;
  getRecentConquests(limit?: number): Promise<(Conquest & { team: Team; website?: Website })[]>;
  createConquest(conquest: InsertConquest): Promise<Conquest>;
  
  // Game session operations
  getCurrentGameSession(): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<void>;
  
  // Admin operations
  getGameStats(): Promise<{
    totalWebsites: number;
    conquered: number;
    activeTeams: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    return db
      .select()
      .from(teams)
      .orderBy(desc(teams.score), desc(teams.websitesConquered));
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByUserId(userId: string): Promise<Team | undefined> {
    const [team] = await db
      .select()
      .from(teams)
      .where(
        sql`${teams.captainId} = ${userId} OR ${userId} = ANY(${teams.members})`
      );
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeamScore(teamId: string, points: number): Promise<void> {
    await db
      .update(teams)
      .set({
        score: sql`${teams.score} + ${points}`,
        totalAttempts: sql`${teams.totalAttempts} + 1`,
        ...(points > 0 && {
          successfulAttempts: sql`${teams.successfulAttempts} + 1`,
          websitesConquered: sql`${teams.websitesConquered} + 1`,
        }),
      })
      .where(eq(teams.id, teamId));
  }

  // Website operations
  async getWebsites(): Promise<Website[]> {
    return db.select().from(websites).orderBy(websites.domain);
  }

  async getAvailableWebsites(): Promise<Website[]> {
    return db
      .select()
      .from(websites)
      .where(eq(websites.isConquered, false))
      .orderBy(websites.domain);
  }

  async getWebsiteByUrl(url: string): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.url, url));
    return website;
  }

  async createWebsite(website: InsertWebsite): Promise<Website> {
    const [newWebsite] = await db.insert(websites).values(website).returning();
    return newWebsite;
  }

  async conquerWebsite(websiteId: string, teamId: string): Promise<void> {
    await db
      .update(websites)
      .set({
        isConquered: true,
        conqueredBy: teamId,
        conqueredAt: new Date(),
      })
      .where(eq(websites.id, websiteId));
  }

  // Conquest operations
  async getConquestsByTeam(teamId: string): Promise<Conquest[]> {
    return db
      .select()
      .from(conquests)
      .where(eq(conquests.teamId, teamId))
      .orderBy(desc(conquests.attemptedAt));
  }

  async getRecentConquests(limit = 20): Promise<(Conquest & { team: Team; website?: Website })[]> {
    const results = await db
      .select({
        conquest: conquests,
        team: teams,
        website: websites,
      })
      .from(conquests)
      .innerJoin(teams, eq(conquests.teamId, teams.id))
      .leftJoin(websites, eq(conquests.websiteId, websites.id))
      .orderBy(desc(conquests.attemptedAt))
      .limit(limit);

    return results.map(({ conquest, team, website }) => ({
      ...conquest,
      team,
      website: website || undefined,
    }));
  }

  async createConquest(conquest: InsertConquest): Promise<Conquest> {
    const [newConquest] = await db.insert(conquests).values(conquest).returning();
    return newConquest;
  }

  // Game session operations
  async getCurrentGameSession(): Promise<GameSession | undefined> {
    const [session] = await db
      .select()
      .from(gameSessions)
      .where(sql`${gameSessions.status} != 'ended'`)
      .orderBy(desc(gameSessions.createdAt))
      .limit(1);
    return session;
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const [newSession] = await db.insert(gameSessions).values(session).returning();
    return newSession;
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<void> {
    await db
      .update(gameSessions)
      .set(updates)
      .where(eq(gameSessions.id, id));
  }

  // Admin operations
  async getGameStats(): Promise<{
    totalWebsites: number;
    conquered: number;
    activeTeams: number;
  }> {
    const [websiteStats] = await db
      .select({
        total: sql<number>`count(*)`,
        conquered: sql<number>`count(*) filter (where ${websites.isConquered} = true)`,
      })
      .from(websites);

    const [teamStats] = await db
      .select({
        activeTeams: sql<number>`count(*)`,
      })
      .from(teams);

    return {
      totalWebsites: websiteStats.total,
      conquered: websiteStats.conquered,
      activeTeams: teamStats.activeTeams,
    };
  }
}

export const storage = new DatabaseStorage();
