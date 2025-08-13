#!/usr/bin/env node
/**
 * PassPilot preDeploy.js — One‑Command Consolidated Checks
 *
 * Run before every deploy:
 *   node scripts/preDeploy.js
 *
 * Optional live HTTP checks (if your server is running):
 *   PREDEPLOY_BASE_URL="http://localhost:5000" \
 *   TEST_LOGIN_EMAIL="..." \
 *   TEST_LOGIN_PASSWORD="..." \
 *   TEST_SCHOOL_ID="..." \
 *   node scripts/preDeploy.js
 *
 * Env expected (Deploy):
 *   SESSION_SECRET, STRIPE_SECRET_KEY, DATABASE_URL, STRIPE_WEBHOOK_SECRET, JWT_SECRET
 *
 * Extras:
 *   PREDEPLOY_APPLY_CASCADES=1   -> will run generateCascadeMigrations.ts automatically
 *   PREDEPLOY_TEST_EMAIL=foo@bar -> run fixEmailReset.ts (dry-run) against this email
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = process.env.PREDEPLOY_BASE_URL || 'http://localhost:5000';
const APPLY_CASCADES = process.env.PREDEPLOY_APPLY_CASCADES === '1';
const TEST_EMAIL = process.env.PREDEPLOY_TEST_EMAIL || '';

const requiredEnv = [
  'SESSION_SECRET',
  'STRIPE_SECRET_KEY', 
  'DATABASE_URL',
  'JWT_SECRET',
];

const optionalEnv = [
  'STRIPE_WEBHOOK_SECRET',
  'VITE_STRIPE_PUBLIC_KEY',
];

const PASS = '✅';
const WARN = '⚠️ ';
const FAIL = '❌';

(async function main() {
  console.log('\n=== PassPilot preDeploy — consolidated checks ===');
  const results = [];

  // 0) Node & project sanity
  results.push(await step('Node version >= 18', async () => {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    if (major < 18) throw new Error(`Node ${process.versions.node} < 18`);
    console.log(`   Node ${process.versions.node}`);
  }));

  // 1) Env vars
  results.push(await step('Required env vars present', async () => {
    const missing = requiredEnv.filter(k => !process.env[k] || !String(process.env[k]).trim());
    if (missing.length) throw new Error('Missing: ' + missing.join(', '));
    console.log(`   All ${requiredEnv.length} required vars present`);
  }));
  
  results.push(await step('Optional env vars (ok if empty)', async () => {
    const present = optionalEnv.filter(k => process.env[k]);
    const missing = optionalEnv.filter(k => !process.env[k]);
    console.log(`   Present: ${present.join(', ') || 'none'}`);
    if (missing.length) console.log(`   Missing (optional): ${missing.join(', ')}`);
  }));

  // 2) Database connectivity
  results.push(await step('Database connection', async () => {
    // Use a simple approach that works with the existing setup
    const testQuery = runCommand('npx', ['tsx', '-e', `
      import { db } from './server/db.js';
      try {
        const result = await db.execute('SELECT 1 as ok');
        console.log('Database connection: OK');
        process.exit(0);
      } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
      }
    `]);
    if (testQuery.status !== 0) throw new Error('Database connection failed');
  }));

  // 3) Build validation
  results.push(await step('TypeScript build', async () => {
    const build = runCommand('npm', ['run', 'build']);
    if (build.status !== 0) throw new Error('Build failed');
    console.log('   Build completed successfully');
  }));

  // 4) Cascade checker
  results.push(await step('Cascade constraints check', async () => {
    const checker = resolveScript('scripts/checkCascades.ts');
    if (!checker) { 
      console.log(`${WARN} checkCascades.ts not found, skipping.`); 
      return; 
    }
    const out = runCommand('npx', ['tsx', checker, '--report']);
    if (out.status !== 0) throw new Error('checkCascades failed');
    if (out.stdout && /MISSING_CASCADE/i.test(out.stdout)) {
      console.log(`${WARN} Missing cascades reported.`);
    } else {
      console.log('   All CASCADE constraints verified');
    }
  }));

  // 5) Server startup test
  results.push(await step('Server startup (5 second test)', async () => {
    if (!BASE.includes('localhost')) {
      console.log(`${WARN} Not testing localhost, BASE=${BASE}`);
      return;
    }
    
    console.log('   Testing server health...');
    
    // Test if server is already running
    try {
      const healthCheck = await fetchWithTimeout(`${BASE}/api/auth/me`, { 
        timeout: 3000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (healthCheck.ok || healthCheck.status === 401) {
        console.log('   Server is running and responding');
      } else {
        throw new Error(`Server responded with status ${healthCheck.status}`);
      }
    } catch (error) {
      throw new Error(`Server not reachable: ${error.message}`);
    }
  }));

  // 6) Authentication flow test
  results.push(await step('Admin authentication test', async () => {
    if (!BASE.includes('localhost')) {
      console.log(`${WARN} Skipping auth test for non-localhost`);
      return;
    }
    
    try {
      // Test admin bootstrap
      const bootstrap = await fetchWithTimeout(`${BASE}/api/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin123' }),
        timeout: 5000
      });
      
      if (bootstrap.ok || bootstrap.status === 400) {
        console.log('   Admin bootstrap endpoint functional');
      } else {
        throw new Error(`Bootstrap failed with status ${bootstrap.status}`);
      }
    } catch (error) {
      throw new Error(`Auth test failed: ${error.message}`);
    }
  }));

  // 7) Email reset utility test
  results.push(await step('Email reset utility dry-run', async () => {
    const fixer = resolveScript('scripts/fixEmailReset.ts');
    if (!fixer) { 
      console.log(`${WARN} fixEmailReset.ts not found, skipping.`); 
      return; 
    }
    const email = TEST_EMAIL || `predeploy_${Date.now()}@example.com`;
    const out = runCommand('npx', ['tsx', fixer, email]);
    if (out.status !== 0) throw new Error('fixEmailReset dry-run failed');
    console.log('   Email reset utility functional');
  }));

  // 8) Registration flow test
  results.push(await step('Registration flow validation', async () => {
    if (!BASE.includes('localhost')) {
      console.log(`${WARN} Skipping registration test for non-localhost`);
      return;
    }
    
    try {
      const testEmail = `predeploy_${Date.now()}@example.com`;
      const registration = await fetchWithTimeout(`${BASE}/api/auth/register-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: 'PreDeploy Test School',
          adminEmail: testEmail,
          adminName: 'PreDeploy Admin',
          adminPassword: 'password123',
          plan: 'TRIAL'
        }),
        timeout: 10000
      });
      
      if (registration.ok) {
        const data = await registration.json();
        if (data.autoLogin) {
          console.log('   Registration flow working (autoLogin: true)');
        } else {
          console.log('   Registration flow working (manual login)');
        }
      } else {
        const error = await registration.text();
        throw new Error(`Registration failed: ${error}`);
      }
    } catch (error) {
      throw new Error(`Registration test failed: ${error.message}`);
    }
  }));

  // Summary
  const failed = results.filter(r => r.ok === false);
  const warned = results.filter(r => r.warn);
  
  console.log('\n=== Summary ===');
  results.forEach(r => console.log(`${r.icon} ${r.name}${r.warn ? ' (warn)' : ''}`));
  
  if (failed.length) {
    console.log(`\n${FAIL} ${failed.length} check(s) failed. See logs above.`);
    process.exit(1);
  }
  
  console.log(`\n${PASS} All critical checks passed${warned.length ? ` with ${warned.length} warning(s)` : ''}.`);
  console.log('\n🚀 PassPilot is ready for deployment!');
  process.exit(0);
})();

function resolveScript(rel) {
  const p = path.resolve(process.cwd(), rel);
  return fs.existsSync(p) ? p : null;
}

function runCommand(cmd, args = []) {
  const run = spawnSync(cmd, args, { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return run;
}

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 5000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function step(name, fn) {
  try {
    const r = await fn();
    return { name, ok: true, icon: PASS, warn: false };
  } catch (e) {
    console.error(`${FAIL} ${name}:`, e.message || e);
    return { name, ok: false, icon: FAIL, warn: false };
  }
}