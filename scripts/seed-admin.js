const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const { auth, db } = require('../server/config/firebase');

async function seedAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/seed-admin.js <email>');
    process.exit(1);
  }

  try {
    // Get or create the user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`Found existing user: ${userRecord.uid}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.error(`No Firebase Auth user found with email ${email}.`);
        console.error('Please sign up first, then run this script.');
        process.exit(1);
      }
      throw err;
    }

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    // Update Firestore
    await db.collection('users').doc(userRecord.uid).set(
      { role: 'admin' },
      { merge: true }
    );

    console.log(`Successfully set ${email} as admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
