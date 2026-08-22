/**
 * Idempotent bootstrap: guarantees an admin account exists and optionally seeds
 * starter websites.
 *
 * Without this there is no way to reach the admin panel at all - `is_admin`
 * defaults to false and no route can grant it - so a fresh deployment had a
 * locked control room and no key.
 *
 * Usage:  npm run db:seed
 * Env:    ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_WEBSITES
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { users } from "../shared/schema";
import { storage } from "../server/storage";
import { parseHuntUrl } from "../shared/url";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/** Sites every IIIT hunt starts with; extend or replace via SEED_WEBSITES. */
const DEFAULT_WEBSITES = [
  "https://www.iiit.ac.in",
  "https://students.iiit.ac.in",
  "https://faculty.iiit.ac.in",
  "https://research.iiit.ac.in",
  "https://admissions.iiit.ac.in",
  "https://placements.iiit.ac.in",
  "https://library.iiit.ac.in",
  "https://sports.iiit.ac.in",
  "https://cvit.iiit.ac.in",
  "https://ltrc.iiit.ac.in",
];

async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@iiit.ac.in";
  const password = process.env.ADMIN_PASSWORD;

  const existing = await storage.getUserByUsername(username);
  if (existing) {
    if (!existing.isAdmin) {
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
      console.log(`Promoted existing user "${username}" to admin.`);
    } else {
      console.log(`Admin "${username}" already exists; leaving it untouched.`);
    }
    return;
  }

  if (!password) {
    console.error(
      "ADMIN_PASSWORD is not set. Refusing to create an admin with a default password.",
    );
    console.error("Set ADMIN_PASSWORD and run again, e.g. ADMIN_PASSWORD=... npm run db:seed");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const [admin] = await db
    .insert(users)
    .values({
      username,
      email,
      password: await hashPassword(password),
      firstName: "Site",
      lastName: "Admin",
      isAdmin: true,
      isGoogleAuth: false,
    })
    .returning();

  console.log(`Created admin "${admin.username}" <${admin.email}>.`);
}

async function seedWebsites(): Promise<void> {
  const configured = process.env.SEED_WEBSITES;
  const urls = configured
    ? configured.split(/[\s,]+/).filter(Boolean)
    : DEFAULT_WEBSITES;

  const invalid = urls.filter((url) => {
    const parsed = parseHuntUrl(url);
    return !parsed.ok || !parsed.isHuntDomain;
  });
  if (invalid.length > 0) {
    console.warn(`Skipping ${invalid.length} non-hunt URL(s): ${invalid.join(", ")}`);
  }

  const report = await storage.createWebsitesBulk(urls);
  console.log(
    `Websites: ${report.added.length} added, ${report.duplicates.length} already present, ` +
      `${report.rejected.length} rejected.`,
  );
}

async function main(): Promise<void> {
  console.log("Seeding Website Hunt...");
  await seedAdmin();
  await seedWebsites();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
