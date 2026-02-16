// Detailed Firebase connection test with better error reporting
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase connection with detailed diagnostics...\n');

console.log('Environment variables:');
console.log('- Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('- Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);
console.log('- Private Key length:', process.env.FIREBASE_PRIVATE_KEY?.length);
console.log();

try {
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  console.log('App name:', app.name);
  console.log();
  
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  console.log();
  
  // Try to get a specific document from the users collection you created
  console.log('Attempting to read from users collection...');
  db.collection('users').limit(1).get()
    .then(snapshot => {
      console.log('✅ Successfully read from Firestore!');
      console.log(`Found ${snapshot.size} document(s)`);
      
      if (snapshot.size > 0) {
        snapshot.forEach(doc => {
          console.log(`  Document ID: ${doc.id}`);
        });
      }
      
      // Now try to write
      console.log('\nAttempting to write a test document...');
      return db.collection('_test').doc('connection_test').set({
        test: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: 'Connection test successful'
      });
    })
    .then(() => {
      console.log('✅ Successfully wrote to Firestore!');
      
      // Clean up test document
      return db.collection('_test').doc('connection_test').delete();
    })
    .then(() => {
      console.log('✅ Successfully deleted test document');
      console.log('\n🎉 Firebase is fully operational!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Operation failed');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details || 'No additional details');
      
      if (error.code === 5) {
        console.log('\nPossible causes for error code 5 (NOT_FOUND):');
        console.log('1. Database doesn\'t exist (but we can see it does)');
        console.log('2. Service account lacks permissions');
        console.log('3. Database is in wrong project');
        console.log('4. Database location mismatch');
        console.log('\nNext steps:');
        console.log('- Verify service account has "Cloud Datastore User" role');
        console.log('- Check IAM permissions in Firebase Console');
      }
      
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Initialization error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
