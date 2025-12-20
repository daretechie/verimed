const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const generateKey = () => crypto.randomBytes(32).toString('base64');

console.log('\n--- VERIMED SECRETS ROTATOR ---');

const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.log('⚠️ No .env file found. Generating new secrets for your template:');
  console.log('\nAPI_KEY=' + generateKey());
  console.log('JWT_SECRET=' + generateKey());
  console.log('\n---------------------------------\n');
  process.exit(0);
}

console.log('✅ Current .env file detected.');
console.log('Generating new keys for rotation...\n');

const newApiKey = generateKey();
const newJwtSecret = generateKey();

console.log('NEW API_KEY:    ' + newApiKey);
console.log('NEW JWT_SECRET: ' + newJwtSecret);

console.log('\n[IMPORTANT] To complete rotation:');
console.log('1. Update your .env file with these new values.');
console.log('2. Restart the VeriMed API service.');
console.log('3. Update all client applications with the new API_KEY.');
console.log('4. Note: Existing JWT sessions will be invalidated.\n');

console.log('---------------------------------\n');
