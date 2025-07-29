import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  captainId: varchar("captain_id").references(() => users.id),
  members: text("members").array().notNull(),
  score: integer("score").default(0),
  websitesConquered: integer("websites_conquered").default(0),
  successfulAttempts: integer("successful_attempts").default(0),
  totalAttempts: integer("total_attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Websites table
export const websites = pgTable("websites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: varchar("url").notNull().unique(),
  domain: varchar("domain").notNull(),
  isConquered: boolean("is_conquered").default(false),
  conqueredBy: varchar("conquered_by").references(() => teams.id),
  conqueredAt: timestamp("conquered_at"),
  points: integer("points").default(100),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conquest attempts table
export const conquests = pgTable("conquests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  websiteId: varchar("website_id").references(() => websites.id),
  url: varchar("url").notNull(),
  isSuccessful: boolean("is_successful").notNull(),
  points: integer("points").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Game sessions table
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: varchar("status").notNull().default("waiting"), // waiting, active, paused, ended
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  captainedTeam: one(teams, {
    fields: [users.id],
    references: [teams.captainId],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  captain: one(users, {
    fields: [teams.captainId],
    references: [users.id],
  }),
  conquests: many(conquests),
  conqueredWebsites: many(websites),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  conqueror: one(teams, {
    fields: [websites.conqueredBy],
    references: [teams.id],
  }),
  conquests: many(conquests),
}));

export const conquestsRelations = relations(conquests, ({ one }) => ({
  team: one(teams, {
    fields: [conquests.teamId],
    references: [teams.id],
  }),
  website: one(websites, {
    fields: [conquests.websiteId],
    references: [websites.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  score: true,
  websitesConquered: true,
  successfulAttempts: true,
  totalAttempts: true,
});

export const insertWebsiteSchema = createInsertSchema(websites).omit({
  id: true,
  createdAt: true,
  isConquered: true,
  conqueredBy: true,
  conqueredAt: true,
});

export const insertConquestSchema = createInsertSchema(conquests).omit({
  id: true,
  attemptedAt: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websites.$inferSelect;
export type InsertConquest = z.infer<typeof insertConquestSchema>;
export type Conquest = typeof conquests.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
