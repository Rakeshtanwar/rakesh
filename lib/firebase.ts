import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEidvg8i6mVzLJFm8nbDp6WQl6cqLhhVM",
  authDomain: "chronos-app-15378.firebaseapp.com",
  projectId: "chronos-app-15378",
  storageBucket: "chronos-app-15378.firebasestorage.app",
  messagingSenderId: "352478911502",
  appId: "1:352478911502:web:bc94a675c8333779fd305f",
  measurementId: "G-FBH76HEMTQ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
