// Test Firebase with explicit database specification
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase connection with explicit database...\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
  
  // Try with default database explicitly
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // List collections to see what exists
  db.listCollections()
    .then(collections => {
      console.log('\nExisting collections:');
      collections.forEach(collection => {
        console.log('  -', collection.id);
      });
      
      // Try to write a test document
      console.log('\nAttempting to write test document...');
      return db.collection('_test').doc('test').set({ 
        test: true, 
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
      });
    })
    .then(() => {
      console.log('✅ Successfully wrote test document to Firestore!');
      console.log('\n🎉 Firebase is working correctly!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      console.error('\nFull error:', error);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}
