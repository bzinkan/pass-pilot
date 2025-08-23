#!/usr/bin/env node
/**
 * Post-build fix for Railway deployment
 * Creates the directory structure expected by the production server
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

// Ensure the server directory exists at the root level
// This is what the bundled code expects based on the path resolution
const serverDir = path.join(projectRoot, 'server');
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
  console.log('✅ Created server directory');
}

// Create a public directory inside server if it doesn't exist
// This is what vite.ts serveStatic function looks for
const publicDir = path.join(serverDir, 'public');
const builtPublicDir = path.join(projectRoot, 'dist', 'public');

if (fs.existsSync(builtPublicDir) && !fs.existsSync(publicDir)) {
  // Create symlink or copy built files
  try {
    fs.symlinkSync(builtPublicDir, publicDir, 'dir');
    console.log('✅ Created symlink from server/public to dist/public');
  } catch (err) {
    // If symlink fails, copy files
    fs.cpSync(builtPublicDir, publicDir, { recursive: true });
    console.log('✅ Copied dist/public to server/public');
  }
}

console.log('✅ Post-build fix completed');