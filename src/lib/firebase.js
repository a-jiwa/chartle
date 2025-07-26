import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyAsv8TV5YSdGLup4nImBjaaaEKbwe9lRm8',
    authDomain: 'chartle-c4a68.firebaseapp.com',
    projectId: 'chartle-c4a68',
    storageBucket: 'chartle-c4a68.appspot.com',
    messagingSenderId: '1031120307533',
    appId: '1:1031120307533:web:a51ef04dabbcecd020e304',
    measurementId: 'G-SCBHLT03DM',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);                  // ← NEW
