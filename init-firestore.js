// Initialize Firestore database by creating the first collection
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Initializing Firestore database...\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  
  const db = admin.firestore();
  
  // Create the users collection with a placeholder document
  db.collection('users').doc('_init').set({
    _placeholder: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    message: 'This is a placeholder document to initialize the database'
  })
    .then(() => {
      console.log('✅ Created users collection');
      
      // Create the assessments collection
      return db.collection('assessments').doc('_init').set({
        _placeholder: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        message: 'This is a placeholder document to initialize the database'
      });
    })
    .then(() => {
      console.log('✅ Created assessments collection');
      console.log('\n🎉 Firestore database initialized successfully!');
      console.log('\nYou can now:');
      console.log('1. Run "node test-firebase.js" to verify the connection');
      console.log('2. Restart your bot to start using Firestore\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to initialize Firestore:', error.message);
      console.log('\nError details:', error);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
