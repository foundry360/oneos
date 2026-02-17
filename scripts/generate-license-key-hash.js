#!/usr/bin/env node

/**
 * Generate License Key Hash Generator
 * 
 * This script helps generate SHA-256 hashes for license keys
 * to be added to VALID_LICENSE_KEY_HASHES environment variable
 * 
 * Usage:
 *   node scripts/generate-license-key-hash.js "LIC-XXXX-XXXX-XXXX"
 *   node scripts/generate-license-key-hash.js "LIC-XXXX-XXXX-XXXX" "LIC-YYYY-YYYY-YYYY"
 */

const crypto = require('crypto');

function hashLicenseKey(licenseKey) {
  return crypto.createHash('sha256').update(licenseKey).digest('hex');
}

// Get license keys from command line arguments
const licenseKeys = process.argv.slice(2);

if (licenseKeys.length === 0) {
  console.log('Usage: node scripts/generate-license-key-hash.js "LICENSE-KEY-1" ["LICENSE-KEY-2" ...]');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/generate-license-key-hash.js "LIC-ABC-123-XYZ-789"');
  console.log('');
  console.log('Multiple keys:');
  console.log('  node scripts/generate-license-key-hash.js "LIC-ABC-123" "LIC-DEF-456"');
  process.exit(1);
}

console.log('License Key Hash Generator\n');
console.log('='.repeat(60));

const hashes = [];

licenseKeys.forEach((key, index) => {
  const hash = hashLicenseKey(key);
  hashes.push(hash);
  
  console.log(`\nLicense Key ${index + 1}:`);
  console.log(`  Key:    ${key}`);
  console.log(`  Hash:   ${hash}`);
});

console.log('\n' + '='.repeat(60));
console.log('\nAdd to VALID_LICENSE_KEY_HASHES environment variable:');
console.log(`VALID_LICENSE_KEY_HASHES=${hashes.join(',')}`);
console.log('\nOr add to .env file:');
console.log(`VALID_LICENSE_KEY_HASHES=${hashes.join(',')}`);

