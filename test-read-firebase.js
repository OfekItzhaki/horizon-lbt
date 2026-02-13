// Test reading from existing Firestore collection
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase READ access...\n');

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
  
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // Try to read from the users collection
  console.log('\nAttempting to read from users collection...');
  db.collection('users').get()
    .then(snapshot => {
      console.log('✅ Successfully read from Firestore!');
      console.log(`Found ${snapshot.size} document(s) in users collection`);
      
      snapshot.forEach(doc => {
        console.log(`  - Document ID: ${doc.id}`);
        console.log(`    Data:`, doc.data());
      });
      
      // Now try to write
      console.log('\nAttempting to write test document...');
      return db.collection('users').doc('test_user').set({
        telegramId: '123456',
        name: 'Test User',
        targetLanguage: 'en',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log('✅ Successfully wrote to Firestore!');
      console.log('\n🎉 Firebase is fully working!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      console.error('\nError code:', error.code);
      console.error('Error details:', error.details);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
