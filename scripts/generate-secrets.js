const crypto = require('crypto');

const generateKey = () => crypto.randomBytes(32).toString('base64');

console.log('\n--- VERIMED SECRET GENERATOR ---');
console.log('Use these values in your .env file:\n');
console.log(`API_KEY=${generateKey()}`);
console.log(`JWT_SECRET=${generateKey()}`);
console.log('\n---------------------------------\n');
