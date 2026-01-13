// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfD0tGzMzlYAm5UKnA36-QA_8CYMPG6Q0",
  authDomain: "project-5315288396987479343.firebaseapp.com",
  projectId: "project-5315288396987479343",
  storageBucket: "project-5315288396987479343.firebasestorage.app",
  messagingSenderId: "411586332517",
  appId: "1:411586332517:web:6b5499587f1b4e9e1a038c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, googleProvider, db };
