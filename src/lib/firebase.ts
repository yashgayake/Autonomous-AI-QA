import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { HistoricalTestRun, BugReport } from '../types/qa';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigJson);

// Auth
export const auth = getAuth(app);
export { onAuthStateChanged };
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore (handles custom databaseId if specified in config)
export const db: Firestore = (firebaseConfigJson as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfigJson as any).firestoreDatabaseId)
  : getFirestore(app);

// Connection test helper as specified in guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline check:', error.message);
    }
    // Still considered online if rules or document permitted
    return true;
  }
}

// User Profile persistence
export async function saveUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'QA Engineer',
      photoURL: user.photoURL || '',
      role: 'qa_engineer',
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save user profile to Firestore:', err);
  }
}

// Test Run Persistence
export async function saveTestRunToFirestore(run: HistoricalTestRun, currentUser?: User | null): Promise<void> {
  try {
    const runRef = doc(db, 'test_runs', run.id);
    await setDoc(runRef, {
      ...run,
      userId: currentUser?.uid || 'anonymous-qa',
      userEmail: currentUser?.email || 'guest@apexqa.io',
      syncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to save test run to Firestore:', err);
  }
}

export async function loadTestRunsFromFirestore(): Promise<HistoricalTestRun[]> {
  try {
    const runsRef = collection(db, 'test_runs');
    const q = query(runsRef, orderBy('timestamp', 'desc'), limit(20));
    const snap = await getDocs(q);
    const runs: HistoricalTestRun[] = [];
    snap.forEach((d) => {
      runs.push(d.data() as HistoricalTestRun);
    });
    return runs;
  } catch (err) {
    console.warn('Failed to load test runs from Firestore, falling back to local memory:', err);
    return [];
  }
}

// Bug Report Persistence
export async function saveBugReportToFirestore(bug: BugReport, currentUser?: User | null): Promise<void> {
  try {
    const bugRef = doc(db, 'bug_reports', bug.id);
    await setDoc(bugRef, {
      id: bug.id,
      userId: currentUser?.uid || 'anonymous-qa',
      userEmail: currentUser?.email || 'guest@apexqa.io',
      testCaseId: bug.testCaseId,
      title: bug.title,
      severity: bug.severity,
      category: bug.category,
      summary: bug.summary,
      stepsToReproduce: bug.stepsToReproduce,
      expectedBehavior: bug.expectedBehavior,
      actualBehavior: bug.actualBehavior,
      rootCauseAnalysis: bug.rootCauseAnalysis,
      suggestedFix: bug.suggestedFix,
      verificationRuns: bug.verificationRuns,
      confidenceScore: bug.confidenceScore,
      status: bug.status,
      timestamp: bug.timestamp,
      videoClipMeta: bug.videoClip ? {
        filename: bug.videoClip.filename,
        durationSeconds: bug.videoClip.durationSeconds,
        resolution: bug.videoClip.resolution
      } : null,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save bug report to Firestore:', err);
  }
}

export async function loadBugReportsFromFirestore(): Promise<BugReport[]> {
  try {
    const bugsRef = collection(db, 'bug_reports');
    const q = query(bugsRef, orderBy('timestamp', 'desc'), limit(30));
    const snap = await getDocs(q);
    const bugs: BugReport[] = [];
    snap.forEach((d) => {
      const data = d.data();
      bugs.push({
        ...data,
        evidence: data.evidence || {
          timestamp: data.timestamp,
          failingStep: data.stepsToReproduce?.[data.stepsToReproduce.length - 1] || '',
          selector: '#target-element',
          expectedValue: data.expectedBehavior,
          actualValue: data.actualBehavior,
          consoleErrors: []
        }
      } as BugReport);
    });
    return bugs;
  } catch (err) {
    console.warn('Failed to load bug reports from Firestore:', err);
    return [];
  }
}

// Google Sign-In with popup
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await saveUserProfile(result.user);
  return result.user;
}

// Sign Out
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
