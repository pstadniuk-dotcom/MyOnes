// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";
// import { fileURLToPath } from "url";
// import { validateEnvPlugin } from "./vite-plugin-validate-env";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export default defineConfig({
//   plugins: [
//     react(),
//     // No longer need to validate VITE_API_BASE in monorepo setup
//     // Frontend and backend share the same origin, so relative URLs work
//     validateEnvPlugin({
//       // Empty config - no environment variables required for API base URL
//       failOnError: true,
//     }),
//   ],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "client", "src"),
//       "@shared": path.resolve(__dirname, "shared"),
//       "@assets": path.resolve(__dirname, "attached_assets"),
//     },
//   },
//   root: path.resolve(__dirname, "client"),
//   build: {
//     outDir: path.resolve(__dirname, "dist/public"),
//     emptyOutDir: true,
//   },
//   server: {
//     hmr: {
//       port: 5000,
//     },
//     fs: {
//       strict: true,
//       deny: ["**/.*"],
//       allow: [
//         path.resolve(__dirname, "client"),
//         path.resolve(__dirname, "attached_assets"),
//         path.resolve(__dirname, "shared"),
//         path.resolve(__dirname, "node_modules"),
//       ],
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnvPlugin } from "./vite-plugin-validate-env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    validateEnvPlugin({
      failOnError: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  base: "/",
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  server: {
    hmr: {
      port: 5000,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(__dirname, "client"),
        path.resolve(__dirname, "attached_assets"),
        path.resolve(__dirname, "shared"),
        path.resolve(__dirname, "node_modules"),
      ],
    },
  },
});