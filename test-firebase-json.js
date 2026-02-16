// Test Firebase using full service account JSON
require('dotenv').config();
const admin = require('firebase-admin');

console.log('Testing Firebase with full service account JSON...\n');

// Build the full service account object
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

console.log('Service Account Info:');
console.log('- Project:', serviceAccount.project_id);
console.log('- Email:', serviceAccount.client_email);
console.log('- Client ID:', serviceAccount.client_id);
console.log();

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase initialized with full service account');
  
  const db = admin.firestore();
  console.log('✅ Firestore instance created\n');
  
  console.log('Attempting to read from users collection...');
  db.collection('users').limit(1).get()
    .then(snapshot => {
      console.log('✅ SUCCESS! Read from Firestore!');
      console.log(`Found ${snapshot.size} document(s)`);
      
      if (snapshot.size > 0) {
        snapshot.forEach(doc => {
          console.log(`  Document ID: ${doc.id}`);
        });
      }
      
      console.log('\nAttempting to write...');
      return db.collection('_test').doc('connection_test').set({
        test: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log('✅ Successfully wrote to Firestore!');
      console.log('\n🎉 Firebase is fully operational!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
