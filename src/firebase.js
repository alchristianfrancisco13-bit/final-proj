import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKNtd0Jd0tAbIBfFw89wYuBtfxp62lF_4",
  authDomain: "final-proj-ed41d.firebaseapp.com",
  projectId: "final-proj-ed41d",
  storageBucket: "final-proj-ed41d.firebasestorage.app",
  messagingSenderId: "438303271829",
  appId: "1:438303271829:web:4beb4a89ef1cea0bb5249c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
