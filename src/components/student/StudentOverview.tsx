import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  Compass,
  Flame,
  FlaskConical,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  GRADE_OPTIONS,
  OLYMPIAD_PROBLEM_BANK,
  getDomainsForStudent,
} from '../../data/domainsAndCurriculum';
import {
  formatNum,
  getGradeLabel,
  getTierLabel,
  t,
  toBnNum,
} from '../../i18n/translations';
import { markNotificationRead, upsertStudentProfile } from '../../services/firestoreService';
import { parseGradeLevel } from '../../utils/mathUtils';
import { evaluateStreakStatus, getLastNDaysWindow } from '../../utils/streakUtils';
import { GlassSurface3D } from '../common/GlassSurface3D';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

interface StudentOverviewProps {
  onNavigate: (viewId: string, opts?: { domain?: string; labTool?: string }) => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({ onNavigate }) => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    assessments,
    remedialPlans,
    quizAttempts,
    olympiadAttempts,
    notifications,
    language,
    studyMedium,
  } = useAuth();
  const { showToast } = useToast();

  const [showAllTopics, setShowAllTopics] = useState(false);
  const [updatingGrade, setUpdatingGrade] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const latestAssessment = assessments[0] || null;
  const latestPlan = remedialPlans[0] || null;
  const currentObjective =
    latestPlan?.objectives.find((o) => o.status === 'current' || o.status === 'reteach') ||
    latestPlan?.objectives[0] ||
    null;

  const studentGradeLevel = parseGradeLevel(studentProfile?.grade);
  const studentAge = studentProfile?.age ?? 11;
  const matchedOlympiads = OLYMPIAD_PROBLEM_BANK.filter((p) => {
    if (typeof p.minGradeLevel === 'number' && typeof p.maxGradeLevel === 'number') {
      return studentGradeLevel >= p.minGradeLevel && studentGradeLevel <= p.maxGradeLevel;
    }
    if (typeof p.minAge === 'number' && typeof p.maxAge === 'number') {
      return studentAge >= p.minAge && studentAge <= p.maxAge;
    }
    return true;
  });
  const qotdPool = matchedOlympiads.length > 0 ? matchedOlympiads : OLYMPIAD_PROBLEM_BANK;
  const daySeed = Math.floor(Date.now() / 86400000);
  const qotd =
    qotdPool.find((p) => p.isQuestionOfTheDay) ||
    qotdPool[(daySeed * 37 + studentGradeLevel * 13) % qotdPool.length] ||
    OLYMPIAD_PROBLEM_BANK[0];

  const xp = userAccount?.xp || 0;
  const level = Math.floor(xp / 250) + 1;
  const solvedOlympiads = olympiadAttempts.filter((a) => a.isCorrect).length;

  const streakStatus = evaluateStreakStatus(userAccount);
  const last7Days = getLastNDaysWindow(streakStatus.streakDates, 7, language);
  const unreadStreakNotifs = notifications.filter(
    (n) => n.category === 'streak' && !n.read
  );
  const latestStreakNotif = unreadStreakNotifs[0] || null;

  const displayName =
    studentProfile?.name ||
    userAccount?.displayName ||
    (language === 'bn' ? 'শিক্ষার্থী' : 'Learner');
  const currentGrade = studentProfile?.grade || 'Grade 1';

  const { primaryDomains, allDomains, stageLabel, stageLabelBn } = getDomainsForStudent(
    studentProfile?.age ?? 11,
    currentGrade
  );
  const visibleDomains = showAllTopics ? allDomains : primaryDomains.slice(0, 8);

  const handleQuickGradeChange = async (nextGrade: string) => {
    if (!firebaseUser || !studentProfile || nextGrade === currentGrade) return;
    setUpdatingGrade(true);
    try {
      const { id, userId, createdAt, updatedAt, ...rest } = studentProfile;
      void id;
      void userId;
      void createdAt;
      void updatedAt;
      await upsertStudentProfile(
        firebaseUser.uid,
        {
          ...rest,
          grade: nextGrade,
        },
        false
      );
      showToast(
        language === 'bn'
          ? `শ্রেণি পরিবর্তন হয়ে ${getGradeLabel(nextGrade, 'bn')} হয়েছে`
          : `Class updated to ${nextGrade}`,
        'success'
      );
    } catch {
      showToast(
        language === 'bn' ? 'শ্রেণি পরিবর্তন করা যায়নি' : 'Could not update class',
        'error'
      );
    } finally {
      setUpdatingGrade(false);
    }
  };

  const quickActions = [
    {
      id: 'quiz',
      title: language === 'bn' ? 'অনুশীলন ও কুইজ' : 'Practice & Quiz',
      desc:
        language === 'bn'
          ? '১০,২০০+ প্রশ্নে সহজ, মধ্যম ও কঠিন ধাপে অনুশীলন'
          : '10,200+ problems across Easy, Medium & Hard levels',
      icon: Sparkles,
      accent: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-400/40',
      cardTint: 'border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent hover:border-sky-500/55',
    },
    {
      id: 'math-lab',
      title: language === 'bn' ? 'গণিত ল্যাব ও গেম' : 'Math Lab & Games',
      desc:
        language === 'bn'
          ? 'ভগ্নাংশ, সংখ্যা ও জ্যামিতি হাতে-কলমে খেলায় শেখা'
          : '8 visual simulators, 16 missions & 3 math games',
      icon: FlaskConical,
      accent: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-400/40',
      cardTint: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-500/55',
    },
    {
      id: 'learning-path',
      title: language === 'bn' ? 'ধাপে ধাপে পাঠ' : 'Guided Lessons',
      desc:
        language === 'bn'
          ? '১২টি সহজ পাঠ ও প্রয়োজন অনুযায়ী শেখার ধাপ'
          : '12 step-by-step lessons matched to your level',
      icon: Compass,
      accent: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-400/40',
      cardTint: 'border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent hover:border-amber-500/55',
    },
    {
      id: 'tutor',
      title: language === 'bn' ? 'এআই গণিত শিক্ষক' : 'AI Math Tutor',
      desc:
        language === 'bn'
          ? 'যেকোনো অঙ্ক বা ছবির ধাপে ধাপে সহজ সমাধান'
          : 'Step-by-step hints & photo problem solver',
      icon: Bot,
      accent: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-400/40',
      cardTint: 'border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent hover:border-violet-500/55',
    },
  ];

  const domainTileColors = [
    'border-sky-500/25 bg-gradient-to-br from-sky-500/8 to-transparent hover:border-sky-500/55',
    'border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 to-transparent hover:border-emerald-500/55',
    'border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-transparent hover:border-violet-500/55',
    'border-amber-500/25 bg-gradient-to-br from-amber-500/8 to-transparent hover:border-amber-500/55',
    'border-rose-500/25 bg-gradient-to-br from-rose-500/8 to-transparent hover:border-rose-500/55',
    'border-teal-500/25 bg-gradient-to-br from-teal-500/8 to-transparent hover:border-teal-500/55',
    'border-indigo-500/25 bg-gradient-to-br from-indigo-500/8 to-transparent hover:border-indigo-500/55',
    'border-orange-500/25 bg-gradient-to-br from-orange-500/8 to-transparent hover:border-orange-500/55',
  ];

  return (
    <div className="space-y-8">
      {/* 1. Clean Welcome Header & Quick Class Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {studyMedium === 'bangla_medium'
                ? language === 'bn'
                  ? 'বাংলা মাধ্যম (এনসিটিবি)'
                  : 'Bangla Medium (NCTB)'
                : language === 'bn'
                ? 'ইংলিশ ভার্সন (এনসিটিবি)'
                : 'English Version (NCTB)'}
            </span>
            <span aria-hidden="true">·</span>
            {studentProfile ? (
              <label className="inline-flex items-center gap-1.5">
                <span>{language === 'bn' ? 'শ্রেণি:' : 'Class:'}</span>
                <select
                  value={currentGrade}
                  disabled={updatingGrade}
                  onChange={(e) => handleQuickGradeChange(e.target.value)}
                  className="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-50"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {getGradeLabel(g, language)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span>{getGradeLabel(currentGrade, language)}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
            {language === 'bn' ? `স্বাগতম, ${displayName}` : `Welcome, ${displayName}`}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {language === 'bn'
              ? 'তোমার শ্রেণি অনুযায়ী নিচের যেকোনো একটি সহজ ধাপ দিয়ে আজকের পড়া শুরু করো।'
              : 'Pick a simple activity below matched to your class and learning pace.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="px-4 py-3 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/12 to-indigo-500/5 glass-tile-3d">
            <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              {language === 'bn' ? `স্তর ${toBnNum(level)}` : `Level ${level}`}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {formatNum(xp, language)} XP
            </p>
          </div>
          <div className="px-4 py-3 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/12 to-orange-500/5 glass-tile-3d">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              {language === 'bn' ? 'দৈনিক স্ট্রিক' : 'Streak'}
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 inline-flex items-center gap-1">
              <Flame className="w-4 h-4 shrink-0" />
              {formatNum(streakStatus.displayStreak, language)} {language === 'bn' ? 'দিন' : 'd'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/12 to-cyan-500/5 glass-tile-3d">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {language === 'bn' ? 'কুইজ' : 'Quizzes'}
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatNum(quizAttempts.length, language)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary Focal Hero: Entry 100-Mark Test (if new) or Weakness Guide + Practice */}
      {!latestAssessment ? (
        <section className="rounded-2xl border border-cyan-500/40 student-hero-gradient glass-panel-3d p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-bold text-indigo-600 dark:text-cyan-300">
              {language === 'bn'
                ? 'শুরুর ধাপ · বয়স অনুযায়ী ১০০টি MCQ (১০০ নম্বর) স্মার্ট দক্ষতা যাচাই'
                : 'First Step · 100-MCQ (100-Mark) Age-Matched Skill Check'}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
              {language === 'bn'
                ? 'তোমার বয়স অনুযায়ী ১০০টি MCQ-এর স্মার্ট গণিত টেস্ট দিয়ে শুরু করো'
                : 'Take Your 100-MCQ Age-Matched Smart Math Placement Test'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {language === 'bn'
                ? 'বিভিন্ন গণিত অধ্যায় থেকে ১০০টি স্মার্ট MCQ-এর উত্তর দিলেই তোমার দক্ষতা মাপা হবে এবং কোন জায়গায় দুর্বলতা আছে ও কী অনুশীলন করবে তার ব্যক্তিগত গাইড উইন্ডো তৈরি হবে।'
                : 'Answer 100 adaptive MCQs across your math domains to measure your competency, pinpoint weak subskills, and generate your personal practice guide.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('assessment')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold glass-btn-3d whitespace-nowrap shrink-0"
          >
            <Brain className="w-4 h-4" />
            {language === 'bn' ? '১০০টি MCQ টেস্ট শুরু করো' : 'Start 100-MCQ Test'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-indigo-500/30 student-hero-gradient glass-panel-3d p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-600 dark:text-cyan-300">
              {language === 'bn'
                ? `সর্বশেষ ১০০ নম্বরের টেস্ট স্কোর: ${toBnNum(latestAssessment.accuracyPercent)}/১০০ (${getTierLabel(
                    latestAssessment.competencyCategory,
                    'bn'
                  )})`
                : `Latest 100-Mark Score: ${latestAssessment.accuracyPercent}/100 (${latestAssessment.competencyCategory})`}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
              {language === 'bn'
                ? 'তোমার ব্যক্তিগত দুর্বলতা ও অনুশীলন গাইড উইন্ডো প্রস্তুত'
                : 'Your Personal Weakness & Practice Guide Window is Ready'}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('weakness-guide')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold glass-btn-violet whitespace-nowrap shrink-0"
          >
            <Target className="w-4 h-4" />
            {language === 'bn' ? 'দুর্বলতা ও অনুশীলন গাইড দেখো' : 'Open Weakness & Practice Guide'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* 3. Quick Learning Actions */}
      <section className="rounded-2xl border glass-panel-3d p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'আজ কোথা থেকে শুরু করবে?' : 'Ready to learn? Start in one click'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'bn'
                ? 'সহজ থেকে কঠিন — নিজের পছন্দমতো স্তর বেছে নিয়ে গণিত অনুশীলন করো অথবা গেম খেলো।'
                : 'Practice curated questions at Easy, Medium, or Hard pace, or explore visual math labs.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('quiz')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold glass-btn-emerald whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {language === 'bn' ? 'অনুশীলন শুরু করো' : 'Start Quick Practice'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
          {quickActions.map((card, idx) => {
            const Icon = card.icon;
            return (
              <GlassSurface3D
                key={card.id}
                asButton
                ariaLabel={card.title}
                delay={idx * 0.04}
                tiltMaxDeg={4}
                onClick={() => onNavigate(card.id)}
                className={`text-left p-4 rounded-xl group ${card.cardTint}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner ${card.iconBg}`}>
                    <Icon className={`w-5 h-5 ${card.accent}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{card.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {card.desc}
                </p>
              </GlassSurface3D>
            );
          })}
        </div>
      </section>

      {/* 3. Topics Matched to Your Class */}
      <section className="rounded-2xl border glass-panel-3d p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-500" />
              {language === 'bn' ? 'তোমার শ্রেণির গণিত অধ্যায়' : t(language, 'ageDomainsTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'bn'
                ? `${stageLabelBn} — যেকোনো অধ্যায়ে ক্লিক করে সরাসরি অনুশীলন করো`
                : `${stageLabel} — click any topic to start practicing right away`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllTopics((prev) => !prev)}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
          >
            {showAllTopics
              ? language === 'bn'
                ? 'শুধু শ্রেণির অধ্যায় দেখাও'
                : 'Show class topics only'
              : language === 'bn'
              ? 'সব ১২টি অধ্যায় দেখো'
              : 'Show all 12 topics'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleDomains.map((dom, idx) => {
            const found = latestAssessment?.domainScores.find((d) => d.domain === dom.id);
            const score = found ? found.score : null;
            const tileTint = domainTileColors[idx % domainTileColors.length];
            return (
              <motion.button
                key={dom.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.025 }}
                onClick={() => onNavigate('quiz', { domain: dom.id })}
                className={`text-left p-3.5 rounded-xl border glass-tile-3d group ${tileTint}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                    {language === 'bn' ? dom.displayNameBn : dom.displayName}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                    {score !== null
                      ? `${formatNum(score, language)}%`
                      : language === 'bn'
                      ? 'শুরু →'
                      : 'Go →'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800/90 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score === null
                        ? 'w-0'
                        : score >= 75
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : score >= 50
                        ? 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                        : 'bg-gradient-to-r from-amber-400 to-rose-500'
                    }`}
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 4. Balanced Progress & Daily Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Consistency & Next Step */}
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/6 via-transparent to-emerald-500/6 glass-panel-3d p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                {language === 'bn' ? 'সাপ্তাহিক নিয়মিত অনুশীলন' : 'Weekly Practice Consistency'}
              </h2>
              {streakStatus.completedToday ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'bn' ? 'আজকের কাজ সম্পন্ন' : 'Completed today'}
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {language === 'bn'
                    ? `সর্বোচ্চ: ${toBnNum(streakStatus.longestStreak)} দিন`
                    : `Best: ${streakStatus.longestStreak} days`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((day) => (
                <div
                  key={day.dateKey}
                  className={`p-2 rounded-xl border text-center transition-colors ${
                    day.isActive
                      ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/18 to-orange-500/10 text-amber-700 dark:text-amber-300'
                      : day.isToday
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <p className="text-[11px] font-medium">
                    {day.isToday ? (language === 'bn' ? 'আজ' : 'Today') : day.dayShort}
                  </p>
                  <div className="mt-1 flex items-center justify-center h-5">
                    {day.isActive ? (
                      <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <span className="text-xs font-mono tabular-nums">{day.dayNum}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {latestStreakNotif && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {latestStreakNotif.title}
                  </p>
                </div>
                <button
                  onClick={() => markNotificationRead(latestStreakNotif.id)}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
                >
                  {language === 'bn' ? 'ঠিক আছে' : 'Got it'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {currentObjective
                  ? language === 'bn'
                    ? `পরবর্তী পাঠ: ${currentObjective.title}`
                    : `Next lesson: ${currentObjective.title}`
                  : latestAssessment
                  ? language === 'bn'
                    ? `সর্বশেষ মূল্যায়ন স্কোর: ${toBnNum(latestAssessment.overallScore)}/১০০`
                    : `Latest exam score: ${latestAssessment.overallScore}/100`
                  : language === 'bn'
                  ? 'নিজের দক্ষতা যাচাই করতে একটি ছোট পরীক্ষা দিতে পারো'
                  : 'Take a quick placement check to find your strengths'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate(currentObjective ? 'learning-path' : 'assessment')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-400/50 bg-indigo-500/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              >
                {currentObjective ? (
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <Brain className="w-3.5 h-3.5 text-cyan-500" />
                )}
                {currentObjective
                  ? language === 'bn'
                    ? 'পাঠ দেখো'
                    : 'Open Lesson'
                  : language === 'bn'
                  ? 'মূল্যায়ন পরীক্ষা'
                  : 'Take Exam'}
              </button>
            </div>
          </div>
        </div>

        {/* Today's Brain Challenge */}
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/6 via-transparent to-amber-500/6 glass-panel-3d p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Trophy className="w-4 h-4" />
                {language === 'bn' ? 'আজকের মজার চ্যালেঞ্জ' : 'Question of the Day'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {language === 'bn' ? `${toBnNum(solvedOlympiads)}টি সমাধান` : `${solvedOlympiads} solved`}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'bn' && qotd.titleBn ? qotd.titleBn : qotd.title}
            </h3>

            <div className="p-4 rounded-xl glass-tile-3d border text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <MathRenderer
                content={language === 'bn' && qotd.promptBn ? qotd.promptBn : qotd.prompt}
              />
            </div>
          </div>

          <button
            onClick={() => onNavigate('olympiad')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-sm font-semibold glass-btn-amber transition-all shadow-md"
          >
            {language === 'bn' ? 'অলিম্পিয়াডে সমাধান করো' : 'Solve Challenge'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
