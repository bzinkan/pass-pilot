// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientIndex = path.resolve(process.cwd(), "client", "index.html");
const usingClientFolder = fs.existsSync(clientIndex);

const srcRoot = usingClientFolder ? "client/src" : "src";
const publicDir = usingClientFolder ? "client/public" : "public";
const outDir = usingClientFolder ? "../dist/client" : "dist/client";

export default defineConfig({
  root: usingClientFolder ? "client" : ".",
  publicDir,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, srcRoot),
      "@components": path.resolve(__dirname, `${srcRoot}/components`),
    },
  },
  build: {
    outDir,
    emptyOutDir: false,
    rollupOptions: {
      // leave this file alone; serve from public/
      external: ["/firebase-config.js", "firebase-config.js"],
    },
  },
});
