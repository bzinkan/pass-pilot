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

// Method 1: Create server/public directory structure  
const serverDir = path.join(projectRoot, 'server');
const publicDir = path.join(serverDir, 'public');
const builtPublicDir = path.join(projectRoot, 'dist', 'public');

if (fs.existsSync(builtPublicDir)) {
  console.log(`📁 Found built public directory: ${builtPublicDir}`);
  
  // Ensure server directory exists
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
    console.log('✅ Created server directory');
  }

  // Remove existing public dir completely (handles both files and directories)
  if (fs.existsSync(publicDir)) {
    try {
      const stat = fs.lstatSync(publicDir);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(publicDir);
        console.log('🔗 Removed existing symlink');
      } else {
        fs.rmSync(publicDir, { recursive: true, force: true });
        console.log('🗑️  Removed existing directory');
      }
    } catch (err) {
      console.log('⚠️  Could not remove existing public dir:', err.message);
    }
  }

  // Simple copy approach (most reliable for Docker builds)
  try {
    fs.cpSync(builtPublicDir, publicDir, { recursive: true });
    console.log('✅ Copied dist/public to server/public');
  } catch (err) {
    console.log('❌ Failed to copy built files:', err.message);
  }
} else {
  console.log('⚠️  Built public directory not found at:', builtPublicDir);
}

// Skip root public directory creation to avoid conflicts

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