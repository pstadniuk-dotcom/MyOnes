import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { logger } from "./infra/logging/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: viteLogger,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      let page = await vite.transformIndexHtml(url, template);
      
      // Inject nonce into ALL script tags (including those injected by vite)
      const nonce = (res as any).locals.cspNonce;
      if (nonce) {
        page = page.replace(/<script(?![^>]*nonce=)/g, `<script nonce="${nonce}"`);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      // Hashed asset files are immutable; cache aggressively
      if (filePath.includes(path.join('dist', 'public', 'assets')) || filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  // BUT only for non-API routes - API routes should 404 if not found
  // AND not for static asset paths (e.g. stale /assets/*.js requests after redeploy)
  // — serving HTML for a missing JS chunk causes MIME-type errors in the browser
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // API routes 404 instead of returning the SPA shell
    if (url.startsWith('/api')) {
      return next();
    }

    // Static asset requests (hashed chunks, css, images, fonts, etc.) must NOT
    // fall through to index.html — return a real 404 so the browser doesn't
    // try to parse HTML as a JS module.
    if (
      url.startsWith('/assets/') ||
      /\.(?:js|mjs|css|map|json|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot|txt|xml|pdf|wasm)(?:\?.*)?$/i.test(url)
    ) {
      return res.status(404).type('text/plain').send('Not Found');
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");
      
      const nonce = (res as any).locals.cspNonce;
      if (nonce) {
        // Hardening: Inject nonces into all script and style tags to ensure compatibility with strict CSP
        template = template.replace(/<script(?![^>]*nonce=)/g, `<script nonce="${nonce}"`);
        template = template.replace(/<link rel="stylesheet"(?![^>]*nonce=)/g, `<link rel="stylesheet" nonce="${nonce}"`);
      }
      
      res.status(200).set({ "Content-Type": "text/html" }).send(template);
    } catch (e) {
      logger.error('Failed to serve index.html', { error: e });
      res.status(500).send('Internal Server Error');
    }
  });
}
