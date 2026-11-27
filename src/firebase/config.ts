import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultAppletConfig from '../../firebase-applet-config.json';

const customProjectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID?.trim();
const customApiKey = import.meta.env?.VITE_FIREBASE_API_KEY?.trim();
const isCustomFirebaseEnv = Boolean(customProjectId && customApiKey);

const resolvedFirebaseConfig = isCustomFirebaseEnv
  ? {
      apiKey: customApiKey!,
      authDomain:
        import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
        `${customProjectId}.firebaseapp.com`,
      projectId: customProjectId!,
      storageBucket:
        import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
        `${customProjectId}.firebasestorage.app`,
      messagingSenderId:
        import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
      appId: import.meta.env?.VITE_FIREBASE_APP_ID?.trim() || '',
      measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID?.trim() || '',
    }
  : defaultAppletConfig;

const resolvedDatabaseId = isCustomFirebaseEnv
  ? import.meta.env?.VITE_FIREBASE_DATABASE_ID?.trim() || undefined
  : defaultAppletConfig.firestoreDatabaseId?.trim() || undefined;

const app = initializeApp(resolvedFirebaseConfig);
export const db = resolvedDatabaseId
  ? getFirestore(app, resolvedDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firebaseRuntimeInfo = {
  projectId: resolvedFirebaseConfig.projectId,
  authDomain: resolvedFirebaseConfig.authDomain,
  databaseId: resolvedDatabaseId || '(default)',
  isCustomEnv: isCustomFirebaseEnv,
};

function getTimestampMillis(value: unknown): number {
  if (value === null || value === undefined) {
    // Pending local serverTimestamp() writes should sort to the top immediately
    return Number.MAX_SAFE_INTEGER;
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object') {
    const obj = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') {
      return obj.seconds * 1000 + Math.floor((obj.nanoseconds || 0) / 1e6);
    }
  }
  return 0;
}

export function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
}

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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{ connected: boolean; offlineError: boolean }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, offlineError: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration — Firestore client is offline.');
      return { connected: false, offlineError: true };
    }
    // Permission error before auth sign-in still indicates online connectivity
    return { connected: true, offlineError: false };
  }
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'pd.emu2028@gmail.com';
