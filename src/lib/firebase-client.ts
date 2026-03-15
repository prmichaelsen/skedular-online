import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  sendPasswordResetEmail,
  type User,
  type Auth,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  }
}

export function initializeFirebase(): { auth: Auth; db: Firestore } {
  if (auth && db) return { auth, db }
  if (getApps().length === 0) {
    app = initializeApp(getFirebaseConfig())
  } else {
    app = getApps()[0]
  }
  auth = getAuth(app)
  db = getFirestore(app)
  return { auth, db }
}

export function getFirebaseAuth(): Auth {
  return initializeFirebase().auth
}

export function getFirebaseDb(): Firestore {
  return initializeFirebase().db
}

export async function signIn(email: string, password: string) {
  const { auth } = initializeFirebase()
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signUp(email: string, password: string) {
  const { auth } = initializeFirebase()
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  const { auth } = initializeFirebase()
  return signOut(auth)
}

export async function signInAsGuest() {
  const { auth } = initializeFirebase()
  return signInAnonymously(auth)
}

export function onAuthChange(callback: (user: User | null) => void) {
  const { auth } = initializeFirebase()
  return onAuthStateChanged(auth, callback)
}

export async function getIdToken(): Promise<string | null> {
  const { auth } = initializeFirebase()
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

export async function resetPassword(email: string) {
  const { auth } = initializeFirebase()
  return sendPasswordResetEmail(auth, email)
}

// Re-export Firestore utilities
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
}
export type { User, Auth, Firestore }
