import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { isUniqueViolation } from "./dbErrors";

declare global {
  namespace Express {
    // Aliasing through a distinct name avoids the interface extending itself,
    // which is what made the old declaration a circular-reference error.
    interface User extends AppUser {}
  }
}

type AppUser = User;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;

  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  // timingSafeEqual throws when the buffers differ in length, so a truncated or
  // legacy hash would otherwise crash the login route instead of rejecting it.
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Finds a free username near the requested one.
 *
 * Google sign-in derives a username from the email prefix, and two people at
 * different domains routinely share one ("rahul@iiit.ac.in", "rahul@gmail.com").
 * Without this, the second of them hit a unique-constraint 500 at login.
 */
async function uniqueUsername(base: string): Promise<string> {
  const root = base.replace(/[^a-z0-9._-]/gi, "").toLowerCase() || "player";

  if (!(await storage.getUserByUsername(root))) return root;
  for (let suffix = 2; suffix < 100; suffix++) {
    const candidate = `${root}${suffix}`;
    if (!(await storage.getUserByUsername(candidate))) return candidate;
  }
  return `${root}-${randomBytes(4).toString("hex")}`;
}

export function setupAuth(app: Express) {
  // Session configuration
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({ 
    pool, 
    createTableIfMissing: true,
    tableName: "sessions"
  });

  // A predictable session secret lets anyone forge a session cookie, so in
  // production it must be supplied rather than silently defaulted.
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  // Secure cookies are the right default in production, but they are only sent
  // over HTTPS - so a production deployment served over plain HTTP (a LAN event
  // with no TLS, for instance) would hand out a cookie the browser then refuses
  // to return, and every login would appear to succeed and immediately fail.
  // COOKIE_SECURE makes that an explicit, documented choice instead of a mystery.
  const secureCookies =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";

  if (process.env.NODE_ENV === "production" && !secureCookies) {
    console.warn(
      "[auth] COOKIE_SECURE=false: session cookies will be sent over plain HTTP. " +
        "Only do this on a trusted network without TLS.",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: secureCookies,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid username or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google Strategy (if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            let user = await storage.getUserByEmail(email);
            if (!user) {
              user = await storage.createUser({
                username: await uniqueUsername(email.split("@")[0]),
                email,
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
                profileImageUrl: profile.photos?.[0]?.value || "",
                isGoogleAuth: true,
              });
            }
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      // A session whose user has been deleted must fail closed; passing
      // undefined here left req.user unset while req.isAuthenticated() still
      // reported true, and every route then read `.id` off undefined.
      done(null, user ?? false);
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const username = String(req.body?.username ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = String(req.body?.password ?? "");
      const firstName = String(req.body?.firstName ?? "").trim();
      const lastName = String(req.body?.lastName ?? "").trim();

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user
      let user;
      try {
        user = await storage.createUser({
          username,
          email,
          password: await hashPassword(password),
          firstName,
          lastName,
          isGoogleAuth: false,
        });
      } catch (error) {
        // Two simultaneous signups can both pass the checks above; the unique
        // index is the real arbiter, so translate its error rather than 500.
        if (isUniqueViolation(error)) {
          return res.status(409).json({ message: "That username or email is already registered" });
        }
        throw error;
      }

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Destroy the stored session too, so the row cannot be replayed with a
      // stolen cookie after the user has explicitly signed out.
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
    });
  });

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};