import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  sortByCreatedAtDesc,
} from '../firebase/config';
import {
  AssessmentRecord,
  ClassRoom,
  CurriculumConfig,
  Language,
  MathQuestion,
  NotificationItem,
  OlympiadAttempt,
  QuizAttempt,
  RemedialPlan,
  StudentProfile,
  SystemSettings,
  TutorSession,
  UserAccount,
  WorksheetDoc,
} from '../types/mathmind';
import {
  buildStreakNotificationCopy,
  computeNextStreakState,
  evaluateStreakStatus,
  getLocalDateKey,
  StreakTransition,
} from '../utils/streakUtils';

function safeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- User & Student Profile ---
export async function upsertStudentProfile(
  uid: string,
  profile: Omit<StudentProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `studentProfiles/${uid}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'studentProfiles', uid), {
        ...profile,
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'studentProfiles', uid), {
        ...profile,
        updatedAt: serverTimestamp(),
      });
    }
    await updateDoc(doc(db, 'users', uid), {
      displayName: profile.name,
      preferredLanguage: profile.preferredLanguage,
      ...(profile.studyMedium ? { studyMedium: profile.studyMedium } : {}),
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<
    Pick<
      UserAccount,
      | 'preferredLanguage'
      | 'studyMedium'
      | 'theme'
      | 'xp'
      | 'streak'
      | 'longestStreak'
      | 'lastActiveDate'
      | 'streakDates'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface RecordedActivityResult {
  streak: number;
  longestStreak: number;
  transition: StreakTransition;
  milestoneReached: number | null;
  notificationTitle: string | null;
  notificationMessage: string | null;
}

export async function recordLearningActivity(params: {
  uid: string;
  fallbackAccount: UserAccount | null;
  hasStudentProfile: boolean;
  xpGain?: number;
  activityLabel: string;
  language?: Language;
}): Promise<RecordedActivityResult> {
  const {
    uid,
    fallbackAccount,
    hasStudentProfile,
    xpGain = 0,
    activityLabel,
    language = 'en',
  } = params;
  const userPath = `users/${uid}`;

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    const freshAccount = userSnap.exists()
      ? (userSnap.data() as UserAccount)
      : fallbackAccount;

    const next = computeNextStreakState(freshAccount);
    const nextXp = Math.max(0, (freshAccount?.xp || 0) + Math.max(0, xpGain));

    await updateDoc(doc(db, 'users', uid), {
      xp: nextXp,
      streak: next.streak,
      longestStreak: next.longestStreak,
      lastActiveDate: next.lastActiveDate,
      streakDates: next.streakDates.slice(-14),
      updatedAt: serverTimestamp(),
    });

    if (hasStudentProfile) {
      await updateDoc(doc(db, 'studentProfiles', uid), {
        xp: nextXp,
        streak: next.streak,
        longestStreak: next.longestStreak,
        lastActiveDate: next.lastActiveDate,
        updatedAt: serverTimestamp(),
      });
    }

    const notifCopy = buildStreakNotificationCopy(next, activityLabel, language);
    if (notifCopy) {
      await createNotification(uid, {
        title: notifCopy.title.slice(0, 160),
        message: notifCopy.message.slice(0, 600),
        category: 'streak',
        read: false,
      });
    }

    return {
      streak: next.streak,
      longestStreak: next.longestStreak,
      transition: next.transition,
      milestoneReached: next.milestoneReached,
      notificationTitle: notifCopy?.title || null,
      notificationMessage: notifCopy?.message || null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function ensureDailyStreakReminderNotification(
  uid: string,
  userAccount: UserAccount | null,
  existingNotifications: NotificationItem[],
  language: Language
): Promise<void> {
  if (!userAccount) return;
  const todayKey = getLocalDateKey();
  const storageKey = `mathmind_streak_nudge_${uid}_${todayKey}`;

  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(storageKey)) {
      return;
    }
  } catch {
    // ignore storage restriction
  }

  const status = evaluateStreakStatus(userAccount);
  if (status.completedToday) return;

  // Avoid duplicate reminder if one already exists for today
  const expectedTitleEn =
    status.isAtRisk && status.displayStreak > 0
      ? `Keep Your ${status.displayStreak}-Day Streak Alive!`
      : 'Start Your Daily Math Streak Today';
  const expectedTitleBn =
    status.isAtRisk && status.displayStreak > 0
      ? `আপনার ${status.displayStreak} দিনের স্ট্রিক ধরে রাখুন!`
      : 'আজই আপনার দৈনিক গণিত স্ট্রিক শুরু করুন';

  const alreadyExists = existingNotifications.some(
    (n) =>
      n.category === 'streak' &&
      (n.title === expectedTitleEn || n.title === expectedTitleBn) &&
      !n.read
  );
  if (alreadyExists) return;

  if (status.isAtRisk && status.displayStreak > 0) {
    const title = language === 'bn' ? expectedTitleBn : expectedTitleEn;
    const message =
      language === 'bn'
        ? `গতকালের পর আজ এখনো কোনো অনুশীলন সম্পন্ন হয়নি। টানা ${status.displayStreak + 1} দিনে পৌঁছাতে আজ একটি কুইজ, রয়্যাল চ্যালেঞ্জ বা টিউটর অনুশীলন করুন।`
        : `You practiced yesterday and built a ${status.displayStreak}-day streak! Complete a quick quiz, remedial check, AI tutor question, or Olympiad challenge today to reach Day ${status.displayStreak + 1}.`;

    await createNotification(uid, {
      title: title.slice(0, 160),
      message: message.slice(0, 600),
      category: 'streak',
      read: false,
    });
  } else if (status.isBroken) {
    const title =
      language === 'bn'
        ? 'আবার শুরু করুন — নতুন স্ট্রিক অপেক্ষা করছে!'
        : 'Welcome Back — Start a Fresh Streak Today!';
    const message =
      language === 'bn'
        ? `আপনার সর্বোচ্চ রেকর্ড ${status.longestStreak} দিন। আজ মাত্র ৫ মিনিট অনুশীলন করে নতুন ১ম দিনের স্ট্রিক শুরু করুন।`
        : `Your personal best is ${status.longestStreak} days. Complete any short math activity today to spark a fresh Day 1 streak!`;

    await createNotification(uid, {
      title: title.slice(0, 160),
      message: message.slice(0, 600),
      category: 'streak',
      read: false,
    });
  } else {
    return;
  }

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1');
    }
  } catch {
    // ignore storage restriction
  }
}

// --- Assessments ---
export async function saveAssessmentRecord(
  uid: string,
  assessment: Omit<AssessmentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || safeId('asmt');
  const path = `assessments/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'assessments', id), {
        ...assessment,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'assessments', id), {
        ...assessment,
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function listUserAssessments(uid: string): Promise<AssessmentRecord[]> {
  const path = 'assessments';
  try {
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', uid),
      limit(30)
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssessmentRecord, 'id'>) }));
    return sortByCreatedAtDesc(rows).slice(0, 20);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// --- Remedial Plans ---
export async function saveRemedialPlan(
  uid: string,
  plan: Omit<RemedialPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || safeId('rem');
  const path = `remedialPlans/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'remedialPlans', id), {
        overallProgress: plan.overallProgress,
        objectives: plan.objectives,
        interventionLevel: plan.interventionLevel,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'remedialPlans', id), {
        ...plan,
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

// --- Quiz Attempts ---
export async function saveQuizAttempt(
  uid: string,
  attempt: Omit<QuizAttempt, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = safeId('quiz');
  const path = `quizAttempts/${id}`;
  try {
    await setDoc(doc(db, 'quizAttempts', id), {
      ...attempt,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Olympiad Attempts ---
export async function saveOlympiadAttempt(
  uid: string,
  attempt: Omit<OlympiadAttempt, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = safeId('oly');
  const path = `olympiadAttempts/${id}`;
  try {
    await setDoc(doc(db, 'olympiadAttempts', id), {
      ...attempt,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Worksheets ---
export async function saveWorksheetDoc(
  uid: string,
  ws: Omit<WorksheetDoc, 'id' | 'ownerId' | 'createdAt'>
): Promise<string> {
  const id = safeId('ws');
  const path = `worksheets/${id}`;
  try {
    await setDoc(doc(db, 'worksheets', id), {
      ...ws,
      ownerId: uid,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Tutor Sessions ---
export async function saveTutorSession(
  uid: string,
  session: Omit<TutorSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || safeId('tut');
  const path = `tutorSessions/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'tutorSessions', id), {
        mode: session.mode,
        topic: session.topic,
        messages: session.messages.slice(-50),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'tutorSessions', id), {
        ...session,
        messages: session.messages.slice(-50),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

// --- Question Bank ---
export async function saveQuestionToBank(
  uid: string,
  question: Omit<MathQuestion, 'id' | 'createdBy'>
): Promise<string> {
  const id = safeId('q');
  const path = `questions/${id}`;
  try {
    await setDoc(doc(db, 'questions', id), {
      ...question,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuestionStatus(
  questionId: string,
  validationStatus: 'approved' | 'pending_review' | 'rejected'
): Promise<void> {
  const path = `questions/${questionId}`;
  try {
    await updateDoc(doc(db, 'questions', questionId), {
      validationStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Classes (Teacher / Admin) ---
export async function createClassRoom(
  uid: string,
  teacherName: string,
  cls: { name: string; grade: string; curriculum: string }
): Promise<string> {
  const id = safeId('cls');
  const path = `classes/${id}`;
  try {
    await setDoc(doc(db, 'classes', id), {
      teacherId: uid,
      teacherName,
      name: cls.name,
      grade: cls.grade,
      curriculum: cls.curriculum,
      studentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteClassRoom(classId: string): Promise<void> {
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Notifications ---
export async function createNotification(
  userId: string,
  item: Omit<NotificationItem, 'id' | 'userId' | 'createdAt'>
): Promise<void> {
  const id = safeId('notif');
  const path = `notifications/${id}`;
  try {
    await setDoc(doc(db, 'notifications', id), {
      ...item,
      userId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Curricula & System Settings (Admin) ---
export async function saveCurriculumConfig(
  uid: string,
  curr: Omit<CurriculumConfig, 'id' | 'updatedBy' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || safeId('curr');
  const path = `curricula/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'curricula', id), {
        ...curr,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'curricula', id), {
        ...curr,
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function saveSystemSettings(
  uid: string,
  settings: Omit<SystemSettings, 'updatedBy' | 'updatedAt'>
): Promise<void> {
  const path = 'systemSettings/global';
  try {
    const existing = await getDoc(doc(db, 'systemSettings', 'global'));
    if (existing.exists()) {
      await updateDoc(doc(db, 'systemSettings', 'global'), {
        ...settings,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'systemSettings', 'global'), {
        ...settings,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Audit Logging ---
export async function writeAuditLog(
  actorUid: string,
  action: string,
  targetType: string,
  details: string,
  targetId?: string
): Promise<void> {
  const id = safeId('log');
  const path = `auditLogs/${id}`;
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid,
      action: action.slice(0, 120),
      targetType: targetType.slice(0, 80),
      ...(targetId ? { targetId: targetId.slice(0, 128) } : {}),
      details: details.slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Log but do not break non-critical flows
    console.warn('Audit log write skipped:', error);
  }
}

// --- Admin User Role Update ---
export async function adminUpdateUserRole(
  targetUid: string,
  role: UserAccount['role']
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
