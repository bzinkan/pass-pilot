// Firebase configuration
// This file is loaded before the main application to ensure Firebase is initialized
console.log('Loading Firebase configuration...');

// Global Firebase status flag - will be set by the main app when it loads
window.FIREBASE_ENABLED = false;

console.log('Firebase configuration ready for main app initialization');