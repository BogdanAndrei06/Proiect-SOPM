// src/firebase.js
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAuth,
  GoogleAuthProvider,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBfD0tGzMzlYAm5UKnA36-QA_8CYMPG6Q0",
  authDomain: "project-5315288396987479343.firebaseapp.com",
  projectId: "project-5315288396987479343",
  storageBucket: "project-5315288396987479343.firebasestorage.app",
  messagingSenderId: "411586332517",
  appId: "1:411586332517:web:6b5499587f1b4e9e1a038c",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth cu persistence pe AsyncStorage ca sa pastram login-ul intre restart-uri.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Fast Refresh / reimport -> auth deja inițializat
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
