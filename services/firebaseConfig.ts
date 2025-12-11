
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD544YXHyLyGgX5_HCFfdhxC3OMFLq628s",
  authDomain: "jirvinho-app.firebaseapp.com",
  projectId: "jirvinho-app",
  storageBucket: "jirvinho-app.firebasestorage.app",
  messagingSenderId: "418457921586",
  appId: "1:418457921586:web:28b61b48857657aecb342b"
};

// Initialize Firebase
// We use the compat app for Auth, but pass it to getFirestore which supports it
const app = firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = getFirestore(app);
export default app;
