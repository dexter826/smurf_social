import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCNmxniAL5vcKcVJN-PaywlD9uPRRj4DHo",
  authDomain: "smurf-social.firebaseapp.com",
  projectId: "smurf-social",
  storageBucket: "smurf-social.firebasestorage.app",
  messagingSenderId: "517846344524",
  appId: "1:517846344524:web:7ee2038e9ab9d24a41a5e9",
  measurementId: "G-VRZXWBZFPT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
