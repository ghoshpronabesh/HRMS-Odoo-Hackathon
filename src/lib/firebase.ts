import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCd07pQ1WXUd5HL3tlG3Yh8SFPVHxNxGUo",
  authDomain: typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "icee-penguin.firebaseapp.com"
    : "accounts.icepenguin.in",
  projectId: "icee-penguin",
  storageBucket: "icee-penguin.firebasestorage.app",
  messagingSenderId: "937040803816",
  appId: "1:937040803816:web:e79aa5cf52115049ced65d",
  measurementId: "G-BGWVSWJQ6K"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth, firebaseConfig };
