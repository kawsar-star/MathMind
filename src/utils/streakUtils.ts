import { Language, UserAccount } from '../types/mathmind';

export const STREAK_MILESTONES = [3, 5, 7, 14, 30, 50, 100];

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return getLocalDateKey(prev);
}

export interface DayActivitySlot {
  dateKey: string;
  dayShort: string;
  dayNum: string;
  isToday: boolean;
  isActive: boolean;
}

const BN_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const BN_DIGITS_MAP = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function getLastNDaysWindow(
  streakDates: string[] = [],
  n = 7,
  language: Language = 'en',
  referenceDate: Date = new Date()
): DayActivitySlot[] {
  const activeSet = new Set(streakDates);
  const todayKey = getLocalDateKey(referenceDate);
  const slots: DayActivitySlot[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - i
    );
    const key = getLocalDateKey(d);
    const dayShort =
      language === 'bn'
        ? BN_WEEKDAYS[d.getDay()]
        : d.toLocaleDateString('en-US', { weekday: 'short' });
    const rawNum = String(d.getDate());
    const dayNum =
      language === 'bn'
        ? rawNum.replace(/\d/g, (ch) => BN_DIGITS_MAP[Number(ch)])
        : rawNum;
    slots.push({
      dateKey: key,
      dayShort,
      dayNum,
      isToday: key === todayKey,
      isActive: activeSet.has(key),
    });
  }
  return slots;
}

export interface StreakStatusSummary {
  displayStreak: number;
  longestStreak: number;
  completedToday: boolean;
  isAtRisk: boolean;
  isBroken: boolean;
  lastActiveDate: string | null;
  streakDates: string[];
  nextMilestone: number;
  daysToNextMilestone: number;
}

export function evaluateStreakStatus(
  userAccount: UserAccount | null,
  referenceDate: Date = new Date()
): StreakStatusSummary {
  const todayKey = getLocalDateKey(referenceDate);
  const yesterdayKey = getYesterdayDateKey(referenceDate);
  const lastActive = userAccount?.lastActiveDate || null;
  const rawStreak = userAccount?.streak || 0;
  const rawLongest = userAccount?.longestStreak || 0;

  let displayStreak = 0;
  let completedToday = false;
  let isAtRisk = false;
  let isBroken = false;

  if (!lastActive) {
    // Legacy accounts created before daily tracking with zero XP start at 0 until first activity
    displayStreak = (userAccount?.xp || 0) > 0 ? Math.max(1, rawStreak) : 0;
    isAtRisk = displayStreak > 0;
  } else if (lastActive === todayKey) {
    displayStreak = Math.max(1, rawStreak);
    completedToday = true;
  } else if (lastActive === yesterdayKey) {
    displayStreak = Math.max(1, rawStreak);
    isAtRisk = true;
  } else {
    displayStreak = 0;
    isBroken = rawStreak > 0;
  }

  const longestStreak = Math.max(rawLongest, displayStreak, rawStreak);
  const streakDates = Array.isArray(userAccount?.streakDates)
    ? userAccount!.streakDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : completedToday
    ? [todayKey]
    : [];

  const nextMilestone =
    STREAK_MILESTONES.find((m) => m > displayStreak) ||
    Math.ceil((displayStreak + 1) / 50) * 50;

  return {
    displayStreak,
    longestStreak,
    completedToday,
    isAtRisk,
    isBroken,
    lastActiveDate: lastActive,
    streakDates,
    nextMilestone,
    daysToNextMilestone: Math.max(1, nextMilestone - displayStreak),
  };
}

export type StreakTransition = 'started' | 'incremented' | 'already_active_today' | 'reset';

export interface NextStreakComputation {
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakDates: string[];
  transition: StreakTransition;
  milestoneReached: number | null;
}

export function computeNextStreakState(
  userAccount: UserAccount | null,
  referenceDate: Date = new Date()
): NextStreakComputation {
  const todayKey = getLocalDateKey(referenceDate);
  const yesterdayKey = getYesterdayDateKey(referenceDate);
  const lastActive = userAccount?.lastActiveDate || null;
  const prevStreak = userAccount?.streak || 0;
  const prevLongest = userAccount?.longestStreak || 0;
  const existingDates = Array.isArray(userAccount?.streakDates)
    ? userAccount!.streakDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  const mergedDates = Array.from(new Set([...existingDates, todayKey]))
    .sort()
    .slice(-14);

  if (!lastActive) {
    // First tracked daily activity (or migrating an account with prior XP)
    const migratedBase = (userAccount?.xp || 0) > 0 && prevStreak > 0 ? prevStreak : 0;
    const nextStreak = migratedBase > 0 ? migratedBase : 1;
    return {
      streak: nextStreak,
      longestStreak: Math.max(prevLongest, nextStreak),
      lastActiveDate: todayKey,
      streakDates: mergedDates,
      transition: 'started',
      milestoneReached: STREAK_MILESTONES.includes(nextStreak) ? nextStreak : null,
    };
  }

  if (lastActive === todayKey) {
    const nextStreak = Math.max(1, prevStreak);
    return {
      streak: nextStreak,
      longestStreak: Math.max(prevLongest, nextStreak),
      lastActiveDate: todayKey,
      streakDates: mergedDates,
      transition: 'already_active_today',
      milestoneReached: null,
    };
  }

  if (lastActive === yesterdayKey) {
    const nextStreak = Math.max(1, prevStreak) + 1;
    return {
      streak: nextStreak,
      longestStreak: Math.max(prevLongest, nextStreak),
      lastActiveDate: todayKey,
      streakDates: mergedDates,
      transition: 'incremented',
      milestoneReached: STREAK_MILESTONES.includes(nextStreak) ? nextStreak : null,
    };
  }

  // Missed at least one full calendar day -> reset streak to Day 1
  return {
    streak: 1,
    longestStreak: Math.max(prevLongest, prevStreak, 1),
    lastActiveDate: todayKey,
    streakDates: mergedDates,
    transition: 'reset',
    milestoneReached: null,
  };
}

export function buildStreakNotificationCopy(
  computation: NextStreakComputation,
  activityLabel: string,
  language: Language
): { title: string; message: string } | null {
  const { transition, streak, longestStreak, milestoneReached } = computation;

  if (transition === 'already_active_today') {
    return null;
  }

  if (language === 'bn') {
    if (transition === 'started') {
      return {
        title: `১ম দিনের স্ট্রিক শুরু হয়েছে!`,
        message: `দারুণ শুরু! আজ আপনি ${activityLabel} সম্পন্ন করেছেন। ২ দিনের স্ট্রিক গড়তে আগামীকাল আবার অনুশীলন করুন।`,
      };
    }
    if (transition === 'reset') {
      return {
        title: `নতুন স্ট্রিক শুরু — ১ম দিন!`,
        message: `স্বাগতম! ${activityLabel} সম্পন্ন করে আপনি আবার শুরু করেছেন। আপনার সর্বোচ্চ রেকর্ড ${longestStreak} দিন অতিক্রম করুন!`,
      };
    }
    if (milestoneReached) {
      return {
        title: `${milestoneReached} দিনের স্ট্রিক মাইলফলক!`,
        message: `অসাধারণ ধারাবাহিকতা! টানা ${milestoneReached} দিন গণিত অনুশীলন (${activityLabel}) সম্পন্ন করেছেন।`,
      };
    }
    return {
      title: `${streak} দিনের স্ট্রিক বজায় রয়েছে!`,
      message: `${activityLabel} সম্পন্ন করার জন্য অভিনন্দন! টানা ${streak} দিন ধরে আপনি গণিতে চর্চা করছেন।`,
    };
  }

  if (transition === 'started') {
    return {
      title: 'Day 1 Streak Started!',
      message: `Great start! You completed ${activityLabel} today. Return tomorrow to build a 2-day mathematics streak.`,
    };
  }

  if (transition === 'reset') {
    return {
      title: 'Fresh Streak Started — Day 1!',
      message: `Welcome back! After completing ${activityLabel}, you're back on track. Aim to beat your personal best of ${longestStreak} days!`,
    };
  }

  if (milestoneReached) {
    return {
      title: `${milestoneReached}-Day Streak Milestone!`,
      message: `Outstanding consistency! You have practiced mathematics for ${milestoneReached} consecutive days (${activityLabel}). Keep the momentum going!`,
    };
  }

  return {
    title: `${streak}-Day Streak Kept Alive!`,
    message: `Nice work completing ${activityLabel}! You've practiced ${streak} days in a row — personal best: ${longestStreak} days.`,
  };
}
