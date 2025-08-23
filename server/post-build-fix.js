#!/usr/bin/env node
/**
 * Post-build fix for Railway deployment
 * Creates the directory structure expected by the production server
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');

console.log('🔧 Running post-build fix for Railway deployment...');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`📁 Dist directory: ${distDir}`);

// Method 1: Create server/public symlink to dist/public
const serverDir = path.join(projectRoot, 'server');
const publicDir = path.join(serverDir, 'public');
const builtPublicDir = path.join(projectRoot, 'dist', 'public');

if (fs.existsSync(builtPublicDir)) {
  // Ensure server directory exists
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
    console.log('✅ Created server directory');
  }

  // Remove existing public dir if it exists
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }

  // Create symlink or copy
  try {
    fs.symlinkSync(path.relative(serverDir, builtPublicDir), publicDir, 'dir');
    console.log('✅ Created symlink from server/public to dist/public');
  } catch (err) {
    console.log('⚠️  Symlink failed, copying files instead:', err.message);
    fs.cpSync(builtPublicDir, publicDir, { recursive: true });
    console.log('✅ Copied dist/public to server/public');
  }
} else {
  console.log('⚠️  Built public directory not found at:', builtPublicDir);
}

// Method 2: Also create public directory in root (fallback)
const rootPublicDir = path.join(projectRoot, 'public');
if (fs.existsSync(builtPublicDir) && !fs.existsSync(rootPublicDir)) {
  try {
    fs.symlinkSync('dist/public', rootPublicDir, 'dir');
    console.log('✅ Created root public directory symlink');
  } catch (err) {
    fs.cpSync(builtPublicDir, rootPublicDir, { recursive: true });
    console.log('✅ Created root public directory copy');
  }
}

// List the final directory structure for debugging
console.log('📋 Final directory structure:');
try {
  const items = fs.readdirSync(projectRoot);
  items.forEach(item => {
    const itemPath = path.join(projectRoot, item);
    const stat = fs.statSync(itemPath);
    console.log(`   ${stat.isDirectory() ? '📁' : '📄'} ${item}`);
  });
} catch (err) {
  console.log('Could not list directory structure:', err.message);
}

console.log('✅ Post-build fix completed');