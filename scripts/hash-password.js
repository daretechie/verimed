const bcrypt = require('bcrypt');
const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

const saltRounds = 10;
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('\n--- BCRYPT HASH ---');
  console.log(hash);
  console.log('-------------------\n');
  console.log('Copy the hash above into your .env file as ADMIN_PASS');
});
