import * as crypto from 'crypto';

/**
 * Generates a license key for a customer.
 * Format: ENT-CUSTOMER_NAME-YEAR-RANDOM_HEX
 * Example: ENT-ACME_CORP-2025-A1B2C3D4
 */
function generateLicenseKey(customerName: string): string {
  const cleanName = customerName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  const key = `ENT-${cleanName}-${year}-${randomSuffix}`;
  console.log(`\n✅ Generated License Key: ${key}`);
  console.log(`👉 Send this to customer: ${customerName}\n`);
  return key;
}

// Get customer name from CLI argument
const customer = process.argv[2];

if (!customer) {
  console.error('❌ Usage: npm run generate-license <customer_name>');
  process.exit(1);
}

generateLicenseKey(customer);
