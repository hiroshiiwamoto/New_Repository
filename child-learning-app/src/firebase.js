import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4Dg6dUSUljW3lRZGMndbzSnsbcwkEuv8",
  authDomain: "studyapp-28e08.firebaseapp.com",
  projectId: "studyapp-28e08",
  storageBucket: "studyapp-28e08.firebasestorage.app",
  messagingSenderId: "929036775806",
  appId: "1:929036775806:web:50c21242a761566e31c32f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Google Drive API用のスコープを追加
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app)
