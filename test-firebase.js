// Quick test to verify Firebase connection
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase connection...\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // Try to write a test document
  db.collection('_test').doc('test').set({ test: true, timestamp: new Date() })
    .then(() => {
      console.log('✅ Successfully wrote test document to Firestore!');
      console.log('\n🎉 Firebase is working correctly!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to write to Firestore:', error.message);
      console.log('\nThis usually means:');
      console.log('1. The Firestore API is still propagating (wait 2-5 minutes)');
      console.log('2. Or there\'s a permissions issue with your service account\n');
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
