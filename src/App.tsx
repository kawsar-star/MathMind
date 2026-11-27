import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Check,
  Compass,
  Flame,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Target,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlossaryProvider, useGlossary } from './context/GlossaryContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AmbientGlassBackdrop } from './components/common/GlassSurface3D';
import { ToastProvider, useToast } from './components/common/ToastContext';
import { LandingAndAuth } from './components/auth/LandingAndAuth';
import { StudentOnboarding } from './components/onboarding/StudentOnboarding';
import { StudentOverview } from './components/student/StudentOverview';
import { AdaptiveAssessmentEngine } from './components/assessment/AdaptiveAssessmentEngine';
import { IntelligenceDashboard } from './components/intelligence/IntelligenceDashboard';
import { SkillDiagnosisGuideWindow } from './components/intelligence/SkillDiagnosisGuideWindow';
import { RemedialLearningView } from './components/remedial/RemedialLearningView';
import { AiTutorAndSolver } from './components/tutor/AiTutorAndSolver';
import { InteractiveMathLab } from './components/lab/InteractiveMathLab';
import { PracticeAndWorksheets } from './components/practice/PracticeAndWorksheets';
import { OlympiadArena } from './components/olympiad/OlympiadArena';
import { AchievementsAndReports } from './components/gamification/AchievementsAndReports';
import { TeacherPortal } from './components/portals/TeacherPortal';
import { ParentPortal } from './components/portals/ParentPortal';
import { AdminPortal } from './components/portals/AdminPortal';
import { getRoleLabel, t, toBnNum } from './i18n/translations';
import { DifficultyTier, Language, StudyMedium, ThemeMode, UserRole } from './types/mathmind';
import { markNotificationRead, updateUserPreferences } from './services/firestoreService';

type StudentNavId =
  | 'overview'
  | 'assessment'
  | 'weakness-guide'
  | 'intelligence'
  | 'learning-path'
  | 'tutor'
  | 'quiz'
  | 'math-lab'
  | 'worksheets'
  | 'olympiad'
  | 'achievements'
  | 'reports'
  | 'profile';

type TeacherSectionId = 'overview' | 'classes' | 'question_bank';
type AdminTabId = 'overview' | 'users' | 'curriculum' | 'settings' | 'review' | 'audit';

const ROLE_LABELS: Record<UserRole, { en: string; bn: string }> = {
  student: { en: 'Student Workspace', bn: 'শিক্ষার্থী ওয়ার্কস্পেস' },
  teacher: { en: 'Teacher Command', bn: 'শিক্ষক পোর্টাল' },
  parent: { en: 'Parent Portal', bn: 'অভিভাবক পোর্টাল' },
  school_admin: { en: 'School Admin', bn: 'স্কুল অ্যাডমিন' },
  super_admin: { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
};

const STUDENT_VIEW_LABELS: Record<StudentNavId, { en: string; bn: string }> = {
  overview: { en: 'Home', bn: 'হোম (শুরু)' },
  assessment: { en: '100-Mark Entry Test', bn: '১০০ নম্বরের মূল্যায়ন টেস্ট' },
  'weakness-guide': { en: 'Weakness & Practice Guide', bn: 'দুর্বলতা ও অনুশীলন গাইড' },
  intelligence: { en: 'Math Intelligence', bn: 'দক্ষতা বিশ্লেষণ' },
  'learning-path': { en: 'Guided Lessons', bn: 'ধাপে ধাপে পাঠ' },
  tutor: { en: 'AI Math Tutor', bn: 'এআই গণিত শিক্ষক' },
  quiz: { en: 'Practice & Worksheets', bn: 'অনুশীলন ও ওয়ার্কশিট' },
  worksheets: { en: 'Practice & Worksheets', bn: 'অনুশীলন ও ওয়ার্কশিট' },
  'math-lab': { en: 'Math Lab & Games', bn: 'গণিত ল্যাব ও গেম' },
  olympiad: { en: 'Olympiad Arena', bn: 'অলিম্পিয়াড চ্যালেঞ্জ' },
  achievements: { en: 'Awards & Reports', bn: 'অর্জন ও রিপোর্ট' },
  reports: { en: 'Awards & Reports', bn: 'অর্জন ও রিপোর্ট' },
  profile: { en: 'Class & Profile', bn: 'শ্রেণি ও প্রোফাইল' },
};

const MathMindShell: React.FC = () => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    assessments,
    studentDataLoaded,
    notifications,
    authReady,
    firestoreOnline,
    activePortal,
    setActivePortal,
    language,
    setLanguage,
    studyMedium,
    setStudyMedium,
    theme,
    setTheme,
    logout,
  } = useAuth();
  const { showToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [studentNav, setStudentNav] = useState<StudentNavId>('overview');
  const [practiceDomain, setPracticeDomain] = useState<string | undefined>(undefined);
  const [practiceTier, setPracticeTier] = useState<DifficultyTier | undefined>(undefined);
  const [labTool, setLabTool] = useState<string>('fraction-lab');
  const autoDirectedUidRef = useRef<string | null>(null);

  const [teacherSection, setTeacherSection] = useState<TeacherSectionId>('overview');
  const [adminTab, setAdminTab] = useState<AdminTabId>('overview');
  const prefersReducedMotion = useReducedMotion();
  const { openGlossary, setActiveViewLabel } = useGlossary();

  useEffect(() => {
    if (!firebaseUser) {
      autoDirectedUidRef.current = null;
      return;
    }
    if (
      studentDataLoaded &&
      activePortal === 'student' &&
      studentProfile &&
      assessments.length === 0 &&
      autoDirectedUidRef.current !== firebaseUser.uid
    ) {
      autoDirectedUidRef.current = firebaseUser.uid;
      setStudentNav('assessment');
    }
  }, [activePortal, assessments.length, firebaseUser, studentDataLoaded, studentProfile]);

  useEffect(() => {
    const label =
      activePortal === 'student'
        ? STUDENT_VIEW_LABELS[studentNav]?.[language] || ROLE_LABELS.student[language]
        : ROLE_LABELS[activePortal][language];
    setActiveViewLabel(label);
  }, [activePortal, adminTab, language, setActiveViewLabel, studentNav, teacherSection]);

  if (!authReady) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#070B14] text-slate-700 dark:text-slate-300">
        <AmbientGlassBackdrop />
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 glass-panel-3d border rounded-2xl px-8 py-6 flex flex-col items-center"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-3 shadow-inner">
            <Brain className="w-5 h-5 text-cyan-500" />
          </div>
          <p className="text-sm font-medium">{t(language, 'loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LandingAndAuth />;
  }

  const userRole: UserRole = userAccount?.role || 'student';
  const allowedPortals: UserRole[] =
    userRole === 'super_admin'
      ? ['student', 'teacher', 'parent', 'school_admin', 'super_admin']
      : userRole === 'school_admin'
      ? ['school_admin', 'teacher', 'student']
      : userRole === 'teacher'
      ? ['teacher', 'student']
      : [userRole];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSwitchMedium = async (nextMedium: StudyMedium) => {
    const nextLang: Language = nextMedium === 'bangla_medium' ? 'bn' : 'en';
    setStudyMedium(nextMedium);
    setLanguage(nextLang);
    try {
      await updateUserPreferences(firebaseUser.uid, {
        studyMedium: nextMedium,
        preferredLanguage: nextLang,
      });
    } catch {
      // non-blocking preference sync
    }
  };

  const handleToggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      await updateUserPreferences(firebaseUser.uid, { theme: next });
    } catch {
      // non-blocking preference sync
    }
  };

  const handleStudentNavigate = (
    viewId: string,
    opts?: { domain?: string; labTool?: string; tier?: DifficultyTier }
  ) => {
    if (opts?.domain) setPracticeDomain(opts.domain);
    if (opts?.tier) setPracticeTier(opts.tier);
    if (opts?.labTool) setLabTool(opts.labTool);
    setStudentNav(viewId as StudentNavId);
    setMobileMenuOpen(false);
  };

  const studentNavGroups: {
    groupLabel: string;
    items: {
      id: StudentNavId;
      matchIds?: StudentNavId[];
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badgeCls: string;
      activeCls: string;
    }[];
  }[] = [
    {
      groupLabel: language === 'bn' ? 'শেখা ও অনুশীলন' : 'Learn & Practice',
      items: [
        {
          id: 'overview',
          label: language === 'bn' ? 'হোম (শুরু)' : 'Home',
          icon: LayoutDashboard,
          badgeCls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
          activeCls: 'bg-sky-500/12 border-sky-500/35 text-sky-700 dark:text-sky-300',
        },
        {
          id: 'quiz',
          matchIds: ['quiz', 'worksheets'],
          label: language === 'bn' ? 'অনুশীলন ও ওয়ার্কশিট' : 'Practice & Worksheets',
          icon: Sparkles,
          badgeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          activeCls: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 'math-lab',
          label: language === 'bn' ? 'গণিত ল্যাব ও গেম' : 'Math Lab & Games',
          icon: FlaskConical,
          badgeCls: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
          activeCls: 'bg-violet-500/12 border-violet-500/35 text-violet-700 dark:text-violet-300',
        },
        {
          id: 'learning-path',
          label: language === 'bn' ? 'ধাপে ধাপে পাঠ' : 'Guided Lessons',
          icon: Compass,
          badgeCls: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
          activeCls: 'bg-teal-500/12 border-teal-500/35 text-teal-700 dark:text-teal-300',
        },
      ],
    },
    {
      groupLabel: language === 'bn' ? 'পরীক্ষা ও সহায়তা' : 'Tests & Help',
      items: [
        {
          id: 'assessment',
          label: language === 'bn' ? '১০০ নম্বরের টেস্ট' : '100-Mark Entry Test',
          icon: Brain,
          badgeCls: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
          activeCls: 'bg-cyan-500/12 border-cyan-500/35 text-cyan-700 dark:text-cyan-300',
        },
        {
          id: 'weakness-guide',
          label: language === 'bn' ? 'দুর্বলতা ও গাইড উইন্ডো' : 'Weakness & Guide',
          icon: Target,
          badgeCls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
          activeCls: 'bg-rose-500/12 border-rose-500/35 text-rose-700 dark:text-rose-300',
        },
        {
          id: 'tutor',
          label: language === 'bn' ? 'এআই গণিত শিক্ষক' : 'AI Math Tutor',
          icon: Bot,
          badgeCls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          activeCls: 'bg-indigo-500/12 border-indigo-500/35 text-indigo-700 dark:text-indigo-300',
        },
        {
          id: 'olympiad',
          label: language === 'bn' ? 'অলিম্পিয়াড চ্যালেঞ্জ' : 'Olympiad Arena',
          icon: Trophy,
          badgeCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          activeCls: 'bg-amber-500/12 border-amber-500/35 text-amber-700 dark:text-amber-300',
        },
      ],
    },
    {
      groupLabel: language === 'bn' ? 'অগ্রগতি ও প্রোফাইল' : 'Progress & Profile',
      items: [
        {
          id: 'intelligence',
          label: language === 'bn' ? 'দক্ষতা বিশ্লেষণ' : 'Math Intelligence',
          icon: BarChart3,
          badgeCls: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
          activeCls: 'bg-fuchsia-500/12 border-fuchsia-500/35 text-fuchsia-700 dark:text-fuchsia-300',
        },
        {
          id: 'achievements',
          matchIds: ['achievements', 'reports'],
          label: language === 'bn' ? 'অর্জন ও রিপোর্ট' : 'Awards & Reports',
          icon: Award,
          badgeCls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
          activeCls: 'bg-orange-500/12 border-orange-500/35 text-orange-700 dark:text-orange-300',
        },
        {
          id: 'profile',
          label: language === 'bn' ? 'শ্রেণি ও প্রোফাইল' : 'Class & Profile',
          icon: UserCheck,
          badgeCls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
          activeCls: 'bg-blue-500/12 border-blue-500/35 text-blue-700 dark:text-blue-300',
        },
      ],
    },
  ];

  const activeStudentTitle =
    studentNavGroups
      .flatMap((g) => g.items)
      .find((item) => item.id === studentNav || item.matchIds?.includes(studentNav))?.label ||
    ROLE_LABELS[activePortal][language];

  const teacherNavItems: { id: TeacherSectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: t(language, 'navTeacherAnalytics'), icon: BarChart3 },
    { id: 'classes', label: t(language, 'navClasses'), icon: Users },
    { id: 'question_bank', label: t(language, 'navQuestionBank'), icon: BookOpen },
  ];

  const adminNavItems: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: t(language, 'navSystemOverview'), icon: LayoutDashboard },
    { id: 'users', label: t(language, 'navUsers'), icon: Users },
    { id: 'curriculum', label: t(language, 'navCurriculum'), icon: GraduationCap },
    { id: 'settings', label: t(language, 'navAssessmentConfig'), icon: Sliders },
    { id: 'review', label: t(language, 'navContentReview'), icon: Check },
    { id: 'audit', label: t(language, 'navAudit'), icon: Shield },
  ];

  const needsOnboarding = activePortal === 'student' && !studentProfile;

  const renderMainContent = () => {
    if (needsOnboarding) {
      return (
        <div className="max-w-3xl mx-auto py-4">
          <StudentOnboarding
            onComplete={() => {
              autoDirectedUidRef.current = firebaseUser.uid;
              setStudentNav('assessment');
              showToast(
                language === 'bn'
                  ? 'প্রোফাইল সেভ হয়েছে! এবার বয়স অনুযায়ী ১০০ নম্বরের টেস্ট দিন।'
                  : 'Profile saved! Start your 100-mark age-matched test.',
                'success'
              );
            }}
          />
        </div>
      );
    }

    if (activePortal === 'teacher') {
      return <TeacherPortal key={teacherSection} initialSection={teacherSection} />;
    }

    if (activePortal === 'parent') {
      return <ParentPortal />;
    }

    if (activePortal === 'school_admin' || activePortal === 'super_admin') {
      return (
        <AdminPortal
          key={`${activePortal}-${adminTab}`}
          mode={activePortal}
          initialTab={adminTab}
        />
      );
    }

    // Student portal views
    switch (studentNav) {
      case 'overview':
        return <StudentOverview onNavigate={handleStudentNavigate} />;
      case 'assessment':
        return (
          <AdaptiveAssessmentEngine
            onAssessmentCompleted={() => {
              setStudentNav('weakness-guide');
            }}
          />
        );
      case 'weakness-guide':
        return (
          <SkillDiagnosisGuideWindow
            onStartAssessment={() => setStudentNav('assessment')}
            onPracticeDomain={(dom, tier) => {
              setPracticeDomain(dom);
              setPracticeTier(tier);
              setStudentNav('quiz');
            }}
            onOpenLabTool={(toolId) => {
              setLabTool(toolId);
              setStudentNav('math-lab');
            }}
            onOpenLessons={() => setStudentNav('learning-path')}
            onOpenTutor={() => setStudentNav('tutor')}
            onOpenFullAnalytics={() => setStudentNav('intelligence')}
          />
        );
      case 'intelligence':
        return (
          <IntelligenceDashboard
            onStartAssessment={() => setStudentNav('assessment')}
            onOpenRemedial={() => setStudentNav('learning-path')}
            onOpenWeaknessGuide={() => setStudentNav('weakness-guide')}
            onPracticeDomain={(dom) => {
              setPracticeDomain(dom);
              setPracticeTier(undefined);
              setStudentNav('quiz');
            }}
          />
        );
      case 'learning-path':
        return (
          <RemedialLearningView
            onOpenLabTool={(toolId) => {
              setLabTool(toolId);
              setStudentNav('math-lab');
            }}
            onStartAssessment={() => setStudentNav('assessment')}
          />
        );
      case 'tutor':
        return <AiTutorAndSolver />;
      case 'quiz':
        return (
          <PracticeAndWorksheets
            key={`quiz-${practiceDomain || 'default'}-${practiceTier || 'easy'}`}
            initialView="quiz"
            initialDomain={practiceDomain}
            initialDifficultyTier={practiceTier}
          />
        );
      case 'worksheets':
        return (
          <PracticeAndWorksheets
            key={`ws-${practiceDomain || 'default'}`}
            initialView="worksheets"
            initialDomain={practiceDomain}
          />
        );
      case 'math-lab':
        return <InteractiveMathLab key={labTool} initialTool={labTool} />;
      case 'olympiad':
        return <OlympiadArena />;
      case 'achievements':
        return <AchievementsAndReports key="achievements" initialTab="achievements" />;
      case 'reports':
        return <AchievementsAndReports key="reports" initialTab="reports" />;
      case 'profile':
        return (
          <div className="max-w-3xl mx-auto">
            <StudentOnboarding
              isEditing
              onComplete={() => {
                setStudentNav('overview');
              }}
            />
          </div>
        );
      default:
        return <StudentOverview onNavigate={handleStudentNavigate} />;
    }
  };

  const activeViewKey = needsOnboarding
    ? 'onboarding'
    : activePortal === 'teacher'
    ? `teacher-${teacherSection}`
    : activePortal === 'school_admin' || activePortal === 'super_admin'
    ? `${activePortal}-${adminTab}`
    : activePortal === 'parent'
    ? 'parent'
    : `student-${studentNav}`;

  return (
    <div className="relative min-h-screen flex bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100">
      <AmbientGlassBackdrop />

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Frosted 3D Glass Chrome) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col border-r border-slate-200/75 dark:border-slate-800/70 glass-chrome shadow-[8px_0_32px_-16px_rgba(15,23,42,0.12)] dark:shadow-[10px_0_36px_-14px_rgba(2,6,23,0.75)] transition-transform duration-200 lg:translate-x-0 print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/60">
          <button
            onClick={() => {
              setStudentNav('overview');
              setTeacherSection('overview');
              setAdminTab('overview');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-emerald-500 shadow-md shadow-cyan-500/25 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {t(language, 'brand')}
              </p>
              <p className="text-[11px] font-medium text-indigo-600 dark:text-cyan-300">
                {ROLE_LABELS[activePortal][language]}
              </p>
            </div>
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={language === 'bn' ? 'মেনু বন্ধ করুন' : 'Close menu'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portal Switcher (for multi-portal authorized roles like Super Admin / Teacher) */}
        {allowedPortals.length > 1 && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              {language === 'bn' ? 'পোর্টাল পরিবর্তন' : 'Active Portal'}
            </label>
            <select
              value={activePortal}
              onChange={(e) => {
                setActivePortal(e.target.value as UserRole);
                setMobileMenuOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {allowedPortals.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r][language]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {activePortal === 'student' &&
            studentNavGroups.map((group) => (
              <div key={group.groupLabel} className="space-y-1">
                <p className="px-3 pb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {group.groupLabel}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    !needsOnboarding &&
                    (studentNav === item.id || Boolean(item.matchIds?.includes(studentNav)));
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleStudentNavigate(item.id)}
                      className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/55 dark:hover:bg-slate-800/55 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="student-nav-glass-active"
                          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                          className={`absolute inset-0 rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-8px_rgba(6,182,212,0.35)] pointer-events-none ${item.activeCls}`}
                        />
                      )}
                      <span
                        className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform ${item.badgeCls}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="relative z-10 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

          {activePortal === 'teacher' &&
            teacherNavItems.map((item) => {
              const Icon = item.icon;
              const active = teacherSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTeacherSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

          {activePortal === 'parent' && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{t(language, 'navFamilyOverview')}</span>
            </button>
          )}

          {(activePortal === 'school_admin' || activePortal === 'super_admin') &&
            adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setAdminTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          {/* Mathematical Glossary Quick Launch */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openGlossary();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-violet-700 dark:text-violet-300 bg-gradient-to-r from-violet-500/12 via-fuchsia-500/10 to-cyan-500/12 hover:from-violet-500/20 hover:to-cyan-500/20 border border-violet-500/30 transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {language === 'bn' ? 'গাণিতিক শব্দকোষ' : 'Math Glossary'}
              </span>
            </button>
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800/60">
          <div className="px-3 py-2.5 rounded-xl glass-tile-3d border mb-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {studentProfile?.name ||
                userAccount?.displayName ||
                firebaseUser.displayName ||
                (language === 'bn' ? 'শিক্ষার্থী' : 'Learner')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {getRoleLabel(userRole, language)}
              {studentProfile?.studentCode ? ` · ${studentProfile.studentCode}` : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t(language, 'signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800/60 glass-chrome shadow-[0_6px_24px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_8px_28px_-12px_rgba(2,6,23,0.7)] sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              aria-label={language === 'bn' ? 'মেনু খুলুন' : 'Open navigation'}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activePortal === 'student' && !needsOnboarding
                  ? activeStudentTitle
                  : ROLE_LABELS[activePortal][language]}
              </p>
              {!firestoreOnline && (
                <p className="text-[11px] text-amber-500 truncate">
                  {language === 'bn'
                    ? 'অফলাইন মোড — সংযোগ ফিরলে ডেটা সিংক হবে'
                    : 'Offline cache mode — changes will sync when reconnected'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mathematical Glossary Trigger */}
            <button
              type="button"
              onClick={openGlossary}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/35 bg-violet-500/10 hover:bg-violet-500/20 text-xs font-semibold text-violet-700 dark:text-violet-300 transition-colors whitespace-nowrap"
              title={
                language === 'bn'
                  ? 'এআই গাণিতিক শব্দকোষ খুলুন'
                  : 'Open AI Mathematical Glossary'
              }
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {language === 'bn' ? 'শব্দকোষ' : 'Glossary'}
              </span>
            </button>

            {/* Bangla Medium / English Version Switch Panel */}
            <div
              role="group"
              aria-label={t(language, 'mediumSwitchLabel')}
              className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => handleSwitchMedium('bangla_medium')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  studyMedium === 'bangla_medium'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={language === 'bn' ? 'এনসিটিবি বাংলা মাধ্যম' : 'NCTB Bangla Medium'}
              >
                বাংলা মাধ্যম
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMedium('english_version')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  studyMedium === 'english_version'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={language === 'bn' ? 'এনসিটিবি ইংলিশ ভার্সন' : 'NCTB English Version'}
              >
                English Version
              </button>
            </div>

            {/* Theme Switcher */}
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              aria-label={language === 'bn' ? 'থিম পরিবর্তন করুন' : 'Toggle theme'}
              title={
                theme === 'dark'
                  ? language === 'bn'
                    ? 'লাইট থিম চালু করুন'
                    : 'Switch to light theme'
                  : language === 'bn'
                  ? 'ডার্ক থিম চালু করুন'
                  : 'Switch to dark theme'
              }
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-500/10 transition-colors"
                aria-label={language === 'bn' ? 'বিজ্ঞপ্তি' : 'Notifications'}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                    {language === 'bn' ? toBnNum(unreadCount) : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border glass-panel-3d p-3 z-50"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70 dark:border-slate-800/70">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {language === 'bn'
                          ? `বিজ্ঞপ্তি (${toBnNum(unreadCount)}টি অপঠিত)`
                          : `Notifications (${unreadCount} unread)`}
                      </span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                          {language === 'bn'
                            ? 'এখনো কোনো বিজ্ঞপ্তি নেই। অনুশীলন শুরু করলে আপডেট পাবেন।'
                            : 'No notifications yet. Complete an activity to receive updates.'}
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={async () => {
                              if (!n.read) {
                                await markNotificationRead(n.id);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border transition-colors ${
                              n.read
                                ? 'border-slate-200/70 dark:border-slate-800/70 opacity-75'
                                : n.category === 'streak'
                                ? 'border-amber-500/40 bg-amber-500/8'
                                : 'border-cyan-500/40 bg-cyan-500/8'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {n.category === 'streak' && (
                                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {n.title}
                              </p>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {n.message}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeViewKey}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.994 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.996 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderMainContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <GlossaryProvider>
            <MathMindShell />
          </GlossaryProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
