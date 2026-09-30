import { initializeApp } from 'firebase/app';
import {
  getAuth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { UserSession, UserRole, CsvHistoryEntry } from '../types';

const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
};

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);

// Test Firestore Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// User Profile & Strict Role Locking
export async function checkAndRegisterUserRole(
  userId: string,
  session: UserSession
): Promise<{ allowed: boolean; registeredRole?: UserRole; error?: string }> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const existingRole = data.role as UserRole;
      if (existingRole && existingRole !== session.role) {
        return {
          allowed: false,
          registeredRole: existingRole,
          error: `This email (${session.email}) is already registered as an ${existingRole.toUpperCase()} account and cannot be used for ${session.role.toUpperCase()} login.`
        };
      }
    }

    // Save/update profile with locked role
    await setDoc(userRef, {
      userId,
      name: session.name,
      email: session.email,
      role: session.role,
      department: session.department,
      avatar: session.avatar,
      updatedAt: Date.now()
    }, { merge: true });

    return { allowed: true };
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${userId}`);
    return { allowed: true }; // Fallback to allow if offline
  }
}

export async function saveUserProfile(userId: string, session: UserSession) {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, {
      userId,
      name: session.name,
      email: session.email,
      role: session.role,
      department: session.department,
      avatar: session.avatar,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
  }
}

export async function getUserProfile(userId: string): Promise<UserSession | null> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        role: data.role as UserRole,
        name: data.name,
        email: data.email,
        department: data.department,
        avatar: data.avatar || (data.name ? data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'US')
      };
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${userId}`);
  }
  return null;
}

// Shared Institutional CSV History Operations (Syncs across Admin & Employee)
export async function fetchSharedCsvHistory(): Promise<CsvHistoryEntry[]> {
  const historyCol = collection(db, 'csv_history');
  try {
    const q = query(historyCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const items: CsvHistoryEntry[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as CsvHistoryEntry);
    });
    return items;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, 'csv_history');
    return [];
  }
}

export async function saveSharedCsvHistory(
  userId: string,
  userEmail: string,
  userName: string,
  entry: CsvHistoryEntry
) {
  const sharedRef = doc(db, 'csv_history', entry.id);
  const userHistoryRef = doc(db, 'users', userId, 'csv_history', entry.id);

  const payload = {
    ...entry,
    userId,
    userEmail,
    userName
  };

  try {
    await setDoc(sharedRef, payload);
    await setDoc(userHistoryRef, payload);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `csv_history/${entry.id}`);
  }
}

export async function deleteSharedCsvHistory(userId: string, historyId: string) {
  const sharedRef = doc(db, 'csv_history', historyId);
  const userHistoryRef = doc(db, 'users', userId, 'csv_history', historyId);

  try {
    await deleteDoc(sharedRef);
    await deleteDoc(userHistoryRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `csv_history/${historyId}`);
  }
}
