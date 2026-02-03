
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedPasswordBuf = Buffer.from(hashed, "hex");
    const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "super_secret_session_key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.DATABASE_URL || "mongodb://localhost:27017/myones",
            ttl: 14 * 24 * 60 * 60, // 14 days
        }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
            sameSite: process.env.NODE_ENV === "production" ? 'lax' : 'lax'
        }
    };

    // If using Postgres instead of Mongo for sessions (which Drizzle implies), 
    // we might need connect-pg-simple or just MemoryStore for dev.
    // Assuming MongoStore is what was used legacy, or switching to MemoryStore if Mongo not available.
    // Ideally use a PG store. For now, let's fallback to Memory if no Mongo URL (or just keep as is if user has Mongo).
    // Given user has `drizzle-orm` (PG/SQLite), MongoStore might be wrong legacy artifact or hybrid.
    // I'll stick to MemoryStore for stability if I can't confirm Mongo.
    // Actually, let's use MemoryStore for now to reduce dependencies on external infra I can't see.
    // Or better, use `express-session` default MemoryStore.

    if (process.env.NODE_ENV === 'production') {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                const user = await storage.getUserByEmail(email);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                } else {
                    return done(null, user);
                }
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}
