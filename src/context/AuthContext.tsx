import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sortByCreatedAtDesc,
  testFirestoreConnection,
} from '../firebase/config';
import { ensureDailyStreakReminderNotification } from '../services/firestoreService';
import {
  AssessmentRecord,
  AuditLog,
  ClassRoom,
  CurriculumConfig,
  Language,
  MathQuestion,
  NotificationItem,
  OlympiadAttempt,
  QuizAttempt,
  RemedialPlan,
  StudentProfile,
  StudyMedium,
  SystemSettings,
  ThemeMode,
  UserAccount,
  UserRole,
  WorksheetDoc,
} from '../types/mathmind';
import {
  CURATED_QUESTION_BANK,
  DEFAULT_AGE_BANDS,
  DEFAULT_MASTERY_THRESHOLDS,
} from '../data/domainsAndCurriculum';

interface AuthContextValue {
  firebaseUser: User | null;
  userAccount: UserAccount | null;
  studentProfile: StudentProfile | null;
  assessments: AssessmentRecord[];
  remedialPlans: RemedialPlan[];
  quizAttempts: QuizAttempt[];
  olympiadAttempts: OlympiadAttempt[];
  worksheets: WorksheetDoc[];
  notifications: NotificationItem[];
  customQuestions: MathQuestion[];
  allQuestions: MathQuestion[];
  classes: ClassRoom[];
  curricula: CurriculumConfig[];
  systemSettings: SystemSettings;
  auditLogs: AuditLog[];
  allUsers: UserAccount[];
  authReady: boolean;
  studentDataLoaded: boolean;
  firestoreOnline: boolean;
  activePortal: UserRole;
  setActivePortal: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  studyMedium: StudyMedium;
  setStudyMedium: (medium: StudyMedium) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [remedialPlans, setRemedialPlans] = useState<RemedialPlan[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [olympiadAttempts, setOlympiadAttempts] = useState<OlympiadAttempt[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [customQuestions, setCustomQuestions] = useState<MathQuestion[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [curricula, setCurricula] = useState<CurriculumConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    ...DEFAULT_MASTERY_THRESHOLDS,
    ageBands: DEFAULT_AGE_BANDS,
    updatedBy: 'system',
  });

  const [authReady, setAuthReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [assessmentsLoaded, setAssessmentsLoaded] = useState(false);
  const [firestoreOnline, setFirestoreOnline] = useState(true);
  const [activePortal, setActivePortal] = useState<UserRole>('student');
  const [language, setLanguageState] = useState<Language>('en');
  const [studyMedium, setStudyMediumState] = useState<StudyMedium>('english_version');
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  // Keep <html> dark class synchronized
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Keep localStorage language preference synchronized for ErrorBoundary
  useEffect(() => {
    try {
      window.localStorage.setItem('mathmind_lang', language);
    } catch {
      // ignore storage restriction
    }
  }, [language]);

  // Startup Firestore connection check
  useEffect(() => {
    testFirestoreConnection().then((res) => {
      setFirestoreOnline(!res.offlineError);
    });
  }, []);

  // Auth listener & user bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserAccount(null);
        setStudentProfile(null);
        setAssessments([]);
        setRemedialPlans([]);
        setQuizAttempts([]);
        setOlympiadAttempts([]);
        setWorksheets([]);
        setNotifications([]);
        setClasses([]);
        setAuditLogs([]);
        setAllUsers([]);
        setProfileLoaded(false);
        setAssessmentsLoaded(false);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const isBootstrappedAdmin =
          user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified;

        if (!snap.exists()) {
          const initialRole: UserRole = isBootstrappedAdmin ? 'super_admin' : 'student';
          const newAccount: Omit<UserAccount, 'createdAt' | 'updatedAt'> = {
            uid: user.uid,
            displayName: user.displayName || 'MathMind Learner',
            role: initialRole,
            preferredLanguage: 'en',
            studyMedium: 'english_version',
            theme: 'dark',
            onboardingCompleted: false,
            xp: 0,
            streak: 0,
            longestStreak: 0,
            streakDates: [],
          };
          await setDoc(userRef, {
            ...newAccount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          // Store PII strictly in isolated private subcollection
          await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
            uid: user.uid,
            email: user.email || 'unknown@mathmind.local',
            guardianConsent: false,
            updatedAt: serverTimestamp(),
          });
          setActivePortal(initialRole);
        } else {
          const data = snap.data() as UserAccount;
          setActivePortal(data.role);
          const resolvedLang = data.preferredLanguage || 'en';
          setLanguageState(resolvedLang);
          setStudyMediumState(
            data.studyMedium || (resolvedLang === 'bn' ? 'bangla_medium' : 'english_version')
          );
          setThemeState(data.theme || 'dark');
        }
      } catch (err) {
        console.error('Auth bootstrap error:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Live Firestore subscriptions ONLY after auth is ready & user is signed in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const acct = snap.data() as UserAccount;
            setUserAccount(acct);
            if (acct.preferredLanguage) setLanguageState(acct.preferredLanguage);
            if (acct.studyMedium) {
              setStudyMediumState(acct.studyMedium);
            } else if (acct.preferredLanguage) {
              setStudyMediumState(
                acct.preferredLanguage === 'bn' ? 'bangla_medium' : 'english_version'
              );
            }
            if (acct.theme) setThemeState(acct.theme);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'studentProfiles', uid),
        (snap) => {
          if (snap.exists()) {
            const prof = { id: snap.id, ...(snap.data() as Omit<StudentProfile, 'id'>) };
            setStudentProfile(prof);
            if (prof.studyMedium) {
              setStudyMediumState(prof.studyMedium);
            }
          } else {
            setStudentProfile(null);
          }
          setProfileLoaded(true);
        },
        (err) => {
          setProfileLoaded(true);
          handleFirestoreError(err, OperationType.GET, `studentProfiles/${uid}`);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'assessments'), where('userId', '==', uid), limit(30)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssessmentRecord, 'id'>) }));
          setAssessments(sortByCreatedAtDesc(rows).slice(0, 20));
          setAssessmentsLoaded(true);
        },
        (err) => {
          setAssessmentsLoaded(true);
          handleFirestoreError(err, OperationType.LIST, 'assessments');
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'remedialPlans'), where('userId', '==', uid), limit(20)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RemedialPlan, 'id'>) }));
          setRemedialPlans(sortByCreatedAtDesc(rows).slice(0, 10));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'remedialPlans')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'quizAttempts'), where('userId', '==', uid), limit(40)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuizAttempt, 'id'>) }));
          setQuizAttempts(sortByCreatedAtDesc(rows).slice(0, 30));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'quizAttempts')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'olympiadAttempts'), where('userId', '==', uid), limit(40)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OlympiadAttempt, 'id'>) }));
          setOlympiadAttempts(sortByCreatedAtDesc(rows).slice(0, 30));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'olympiadAttempts')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'worksheets'), where('ownerId', '==', uid), limit(35)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorksheetDoc, 'id'>) }));
          setWorksheets(sortByCreatedAtDesc(rows).slice(0, 25));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'worksheets')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid), limit(30)),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }));
          setNotifications(sortByCreatedAtDesc(rows).slice(0, 20));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'questions'),
          where('validationStatus', 'in', ['approved', 'pending_review']),
          limit(80)
        ),
        (snap) => {
          setCustomQuestions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MathQuestion, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'questions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'curricula'), where('status', 'in', ['active', 'draft']), limit(20)),
        (snap) => {
          setCurricula(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CurriculumConfig, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'curricula')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'systemSettings', 'global'),
        (snap) => {
          if (snap.exists()) {
            setSystemSettings(snap.data() as SystemSettings);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'systemSettings/global')
      )
    );

    // Teacher & Admin scoped collections
    const isAdminUser = firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL && firebaseUser.emailVerified;
    unsubs.push(
      onSnapshot(
        isAdminUser
          ? query(collection(db, 'classes'), limit(30))
          : query(collection(db, 'classes'), where('teacherId', '==', uid), limit(30)),
        (snap) => {
          setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassRoom, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'classes')
      )
    );

    if (isAdminUser) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'users'), limit(50)),
          (snap) => {
            setAllUsers(snap.docs.map((d) => d.data() as UserAccount));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(40)),
          (snap) => {
            setAuditLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) })));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, firebaseUser]);

  // Daily motivational streak reminder check (once per day per user)
  useEffect(() => {
    if (!authReady || !firebaseUser || !userAccount) return;
    if (activePortal !== 'student') return;
    ensureDailyStreakReminderNotification(
      firebaseUser.uid,
      userAccount,
      notifications,
      language
    ).catch((err) => console.warn('Daily streak reminder skipped:', err));
  }, [authReady, firebaseUser?.uid, userAccount?.lastActiveDate, activePortal, notifications.length]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setStudyMediumState(lang === 'bn' ? 'bangla_medium' : 'english_version');
  };

  const setStudyMedium = (medium: StudyMedium) => {
    setStudyMediumState(medium);
    setLanguageState(medium === 'bangla_medium' ? 'bn' : 'en');
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
  };

  const allQuestions = [...CURATED_QUESTION_BANK, ...customQuestions];

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userAccount,
        studentProfile,
        assessments,
        remedialPlans,
        quizAttempts,
        olympiadAttempts,
        worksheets,
        notifications,
        customQuestions,
        allQuestions,
        classes,
        curricula,
        systemSettings,
        auditLogs,
        allUsers,
        authReady,
        studentDataLoaded: profileLoaded && assessmentsLoaded,
        firestoreOnline,
        activePortal,
        setActivePortal,
        language,
        setLanguage,
        studyMedium,
        setStudyMedium,
        theme,
        setTheme,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
