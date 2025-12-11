import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

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
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const auth = firebase.auth();
export const db = firebase.firestore();
export default app;