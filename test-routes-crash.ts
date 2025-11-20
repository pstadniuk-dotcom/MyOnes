
import express from "express";
import { registerRoutes } from "./server/routes";

async function test() {
  console.log("Testing routes...");
  const app = express();
  try {
    await registerRoutes(app, { 
      authLimiter: (req, res, next) => next(), 
      aiLimiter: (req, res, next) => next() 
    } as any);
    console.log("Routes registered.");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
