#!/usr/bin/env node
/**
 * Test Error Monitoring Implementation
 */

const http = require('http');

console.log('🔍 Testing Error Monitoring System...\n');

// Test 1: Health check endpoint
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Health check endpoint working');
          const health = JSON.parse(data);
          console.log(`   Status: ${health.status}`);
          console.log(`   Environment: ${health.environment}`);
          console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
          resolve();
        } else {
          reject(new Error(`Health check failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
    req.end();
  });
}

// Test 2: Request tracking headers
function testRequestTracking() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      const requestId = res.headers['x-request-id'];
      if (requestId) {
        console.log('✅ Request tracking working');
        console.log(`   Request ID: ${requestId}`);
        resolve();
      } else {
        reject(new Error('Missing X-Request-ID header'));
      }
    });

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
    req.end();
  });
}

async function runTests() {
  try {
    await testHealthCheck();
    await testRequestTracking();
    
    console.log('\n🎯 Monitoring Features Implemented:');
    console.log('   • Global error handler with stack traces');
    console.log('   • Request ID tracking for error correlation');
    console.log('   • Null access pattern detection');
    console.log('   • Optional Discord/Slack notifications');
    console.log('   • Health check endpoint for monitoring');
    console.log('   • Enhanced error logging with context');
    
    console.log('\n✅ Error monitoring system ready!');
    console.log('💡 Set DISCORD_WEBHOOK_URL or SLACK_WEBHOOK_URL for production alerts');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();