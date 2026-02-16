// Test Firebase with explicit database specification for Enterprise edition
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase Enterprise edition connection...\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  
  // For Enterprise edition, try accessing with explicit database
  const db = admin.firestore();
  
  console.log('✅ Firestore instance created');
  console.log('Attempting to access default database...\n');
  
  // Try listing collections first (this is a lighter operation)
  db.listCollections()
    .then(collections => {
      console.log('✅ Successfully connected to Firestore!');
      console.log(`Found ${collections.length} collection(s):`);
      collections.forEach(col => console.log(`  - ${col.id}`));
      
      // Now try to read from users collection
      console.log('\nReading from users collection...');
      return db.collection('users').limit(1).get();
    })
    .then(snapshot => {
      console.log(`✅ Read ${snapshot.size} document(s) from users collection`);
      
      // Try to write
      console.log('\nWriting test document...');
      return db.collection('_test').doc('test').set({
        test: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log('✅ Successfully wrote to Firestore!');
      console.log('\n🎉 Firebase is fully working!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      console.error('Error code:', error.code);
      console.error('\nFull error object:', JSON.stringify(error, null, 2));
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
