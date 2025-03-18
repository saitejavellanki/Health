import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDzk7SvyBr6AI9CiH8WVWFrKm9f77OdRl0",
    authDomain: "fitfuel-5abf9.firebaseapp.com",
    projectId: "fitfuel-5abf9",
    storageBucket: "fitfuel-5abf9.firebasestorage.app",
    messagingSenderId: "7920256560",
    appId: "1:7920256560:web:16fb296a586c0a27b1cff5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, auth, storage };
