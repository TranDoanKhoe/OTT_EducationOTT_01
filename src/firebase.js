import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey:
        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
        'AIzaSyDbLo1HFVw-k6u3LwNcF-lZdXLKtzbiaH4',
    authDomain:
        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        'otteducation-62124.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'otteducation-62124',
    storageBucket:
        process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        'otteducation-62124.firebasestorage.app',
    messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '126292312881',
    appId:
        process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
        '1:126292312881:web:19123d3793aeab4e81e610',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

