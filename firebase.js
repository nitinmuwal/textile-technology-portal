// ================================================================
// 🔥 FIREBASE CONFIGURATION
// ================================================================

// 🔑 APNI FIREBASE PROJECT KI CONFIG YAHAN PASTE KAREIN
// Firebase Console → Project Settings → Your apps → Config

const firebaseConfig = {
  apiKey: "AIzaSyAGMpCKmRfP22bv71eCKiVf6FJG2-2X5bY",
  authDomain: "jugveer-sir-textile-class.firebaseapp.com",
  projectId: "jugveer-sir-textile-class",
  storageBucket: "jugveer-sir-textile-class.firebasestorage.app",
  messagingSenderId: "216994525566",
  appId: "1:216994525566:web:a93470aaa87c0bab02432f",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export services (global)
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence (optional)
db.enablePersistence()
    .catch(err => console.warn('Firestore persistence error:', err));

console.log('✅ Firebase initialized successfully!');