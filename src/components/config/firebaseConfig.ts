// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics"; // Optionnel

const firebaseConfig = {
    apiKey: "AIzaSyAXVE5O6zZ5M7INP3qH1TKqOS8r0W99oJ8", // Assurez-vous que c'est celle de netgold-714e5
    authDomain: "netgold-714e5.firebaseapp.com",
    projectId: "netgold-714e5",
    storageBucket: "netgold-714e5.firebasestorage.app",
    messagingSenderId: "1003237523147",
    appId: "1:1003237523147:web:dd56caede8e67ead30e54e",
    measurementId: "G-DT00BJPL84" // Optionnel
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app); // Optionnel