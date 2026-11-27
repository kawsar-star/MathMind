import React from 'react';
import { Award, Download, FileText, Flame, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBnNum } from '../../i18n/translations';
import { exportAssessmentPdf, exportCsvRows } from '../../utils/mathUtils';
import { evaluateStreakStatus } from '../../utils/streakUtils';
import { useToast } from '../common/ToastContext';
import {
  AchievementBadgeItem,
  AchievementBadgesShowcase,
} from './AchievementBadgesShowcase';

interface AchievementsProps {
  initialTab?: 'achievements' | 'reports';
}

export const AchievementsAndReports: React.FC<AchievementsProps> = ({
  initialTab = 'achievements',
}) => {
  const {
    userAccount,
    assessments,
    remedialPlans,
    quizAttempts,
    olympiadAttempts,
    language,
  } = useAuth();
  const { showToast } = useToast();
  const isBn = language === 'bn';

  const xp = userAccount?.xp || 0;
  const level = Math.floor(xp / 250) + 1;
  const levelProgressPct = Math.round(((xp % 250) / 250) * 100);
  const streakStatus = evaluateStreakStatus(userAccount);
  const streak = streakStatus.displayStreak;
  const solvedOlympiad = olympiadAttempts.filter((a) => a.isCorrect).length;
  const completedObjectives = remedialPlans.reduce(
    (sum, p) => sum + p.objectives.filter((o) => o.status === 'completed').length,
    0
  );

  const bestScore = assessments.reduce((max, a) => Math.max(max, a.overallScore), 0);

  const badges: AchievementBadgeItem[] = [
    {
      id: 'first_asmt',
      title: isBn ? 'মূল্যায়ন অগ্রদূত' : 'Diagnostic Pioneer',
      desc: isBn
        ? 'প্রথম অ্যাডাপ্টিভ গণিত মূল্যায়ন সম্পন্ন করেছেন।'
        : 'Completed your first Adaptive Mathematics Assessment.',
      earned: assessments.length >= 1,
      current: Math.min(assessments.length, 1),
      target: 1,
      metricText: isBn
        ? `${toBnNum(Math.min(assessments.length, 1), 'bn')}/১ মূল্যায়ন`
        : `${Math.min(assessments.length, 1)}/1 assessment`,
      formulaHint: 'Dx(1)',
      tierLabel: isBn ? 'ধাপ ১' : 'Tier I',
    },
    {
      id: 'remedial_master',
      title: isBn ? 'ঘাটতি পূরণকারী' : 'Gap Closer',
      desc: isBn
        ? 'একটি ব্যক্তিগত শেখার ধাপে দক্ষতা যাচাই সম্পন্ন করেছেন।'
        : 'Verified mastery on a personalized remedial objective.',
      earned: completedObjectives >= 1,
      current: Math.min(completedObjectives, 1),
      target: 1,
      metricText: isBn
        ? `${toBnNum(Math.min(completedObjectives, 1), 'bn')}/১ ধাপ`
        : `${Math.min(completedObjectives, 1)}/1 objective`,
      formulaHint: 'Δ → 0',
      tierLabel: isBn ? 'ধাপ ২' : 'Tier II',
    },
    {
      id: 'quiz_streak',
      title: isBn ? 'সাবলীলতা নির্মাতা' : 'Fluency Builder',
      desc: isBn
        ? 'ধারাবাহিক চেষ্টায় ৩+ অনুশীলন কুইজ সম্পন্ন করেছেন।'
        : 'Completed 3+ practice quizzes with persistent effort.',
      earned: quizAttempts.length >= 3,
      current: Math.min(quizAttempts.length, 3),
      target: 3,
      metricText: isBn
        ? `${toBnNum(Math.min(quizAttempts.length, 3), 'bn')}/৩ কুইজ`
        : `${Math.min(quizAttempts.length, 3)}/3 quizzes`,
      formulaHint: 'Σ n≥3',
      tierLabel: isBn ? 'ধাপ ২' : 'Tier II',
    },
    {
      id: 'olympiad_thinker',
      title: isBn ? 'প্রমাণ বিশারদ' : 'Proof Architect',
      desc: isBn
        ? 'লিখিত যুক্তিসহ একটি অলিম্পিয়াড চ্যালেঞ্জ সমাধান করেছেন।'
        : 'Solved an Olympiad challenge with written reasoning.',
      earned: solvedOlympiad >= 1,
      current: Math.min(completedObjectives ? solvedOlympiad : solvedOlympiad, 1),
      target: 1,
      metricText: isBn
        ? `${toBnNum(Math.min(solvedOlympiad, 1), 'bn')}/১ সমাধান`
        : `${Math.min(solvedOlympiad, 1)}/1 solved`,
      formulaHint: 'Q.E.D.',
      tierLabel: isBn ? 'ধাপ ৩' : 'Tier III',
    },
    {
      id: 'high_competency',
      title: isBn ? 'ডোমেইন কৃতিত্ব' : 'Domain Distinction',
      desc: isBn
        ? 'অ্যাডাপ্টিভ মূল্যায়নে ৮৫%+ সামগ্রিক দক্ষতা অর্জন করেছেন।'
        : 'Achieved 85%+ overall competency in an adaptive evaluation.',
      earned: assessments.some((a) => a.overallScore >= 85),
      current: Math.min(bestScore, 85),
      target: 85,
      metricText: isBn
        ? `সর্বোচ্চ ${toBnNum(bestScore, 'bn')}% / ৮৫%`
        : `Best ${bestScore}% / 85%`,
      formulaHint: 'μ ≥ 85%',
      tierLabel: isBn ? 'ধাপ ৩' : 'Tier III',
    },
    {
      id: 'persistence',
      title: isBn ? 'নিয়মিত শিক্ষার্থী' : 'Consistent Learner',
      desc: isBn
        ? 'মূল্যায়ন ও অনুশীলনের মাধ্যমে ৩০০+ XP অর্জন করেছেন।'
        : 'Earned 300+ XP through assessment, remedial work, and practice.',
      earned: xp >= 300,
      current: Math.min(xp, 300),
      target: 300,
      metricText: isBn
        ? `${toBnNum(Math.min(xp, 300), 'bn')}/৩০০ XP`
        : `${Math.min(xp, 300)}/300 XP`,
      formulaHint: '∞ XP',
      tierLabel: isBn ? 'ধাপ ২' : 'Tier II',
    },
    {
      id: 'three_day_streak',
      title: isBn ? '৩-দিনের ধারাবাহিকতা' : '3-Day Momentum',
      desc: isBn
        ? 'টানা ৩ দিন দৈনিক শেখার স্ট্রিক ধরে রেখেছেন।'
        : 'Maintained a 3-day consecutive daily learning streak.',
      earned: streakStatus.longestStreak >= 3,
      current: Math.min(streakStatus.longestStreak, 3),
      target: 3,
      metricText: isBn
        ? `${toBnNum(Math.min(streakStatus.longestStreak, 3), 'bn')}/৩ দিন`
        : `${Math.min(streakStatus.longestStreak, 3)}/3 days`,
      formulaHint: 't ≥ 3d',
      tierLabel: isBn ? 'ধাপ ২' : 'Tier II',
    },
  ];

  const downloadDomainCsv = () => {
    const latest = assessments[0];
    if (!latest) {
      showToast(
        isBn
          ? 'ডোমেইন রিপোর্ট এক্সপোর্ট করতে প্রথমে একটি মূল্যায়ন সম্পন্ন করুন।'
          : 'Take an assessment first to export domain metrics.',
        'info'
      );
      return;
    }
    exportCsvRows(
      `mathmind_domains_${latest.studentName.replace(/\s+/g, '_').toLowerCase()}.csv`,
      ['Domain', 'Score %', 'Accuracy %', 'Competency Tier', 'Avg Difficulty', 'Avg Time (s)', 'Weak Subskills'],
      latest.domainScores.map((d) => [
        d.domain,
        d.score,
        d.accuracyPercent,
        d.competencyCategory,
        d.averageDifficulty,
        d.averageTimeSec,
        d.weakSubskills.join('; '),
      ])
    );
    showToast(isBn ? 'ডোমেইন মূল্যায়ন CSV ডাউনলোড হয়েছে।' : 'Domain assessment CSV exported.', 'success');
  };

  const downloadOlympiadCsv = () => {
    if (olympiadAttempts.length === 0) {
      showToast(
        isBn ? 'এখনো কোনো অলিম্পিয়াড প্রচেষ্টা সংরক্ষিত নেই।' : 'No Olympiad attempts recorded yet.',
        'info'
      );
      return;
    }
    exportCsvRows(
      'mathmind_olympiad_performance.csv',
      ['Problem ID', 'Category', 'Difficulty', 'Correct', 'Reasoning Score', 'Hints Used', 'Time (s)', 'XP'],
      olympiadAttempts.map((a) => [
        a.problemId,
        a.category,
        a.difficulty,
        a.isCorrect ? 'Yes' : 'No',
        a.reasoningScore,
        a.hintsUsed,
        a.timeSpentSec,
        a.xpEarned,
      ])
    );
    showToast(isBn ? 'অলিম্পিয়াড ফলাফল CSV ডাউনলোড হয়েছে।' : 'Olympiad performance CSV exported.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient">
        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
          {initialTab === 'reports'
            ? isBn
              ? 'ডাউনলোডযোগ্য দক্ষতা রিপোর্ট'
              : 'Downloadable Intelligence Reports'
            : isBn
            ? 'নিয়মিত অনুশীলন ও দক্ষতার পুরস্কার'
            : 'Persistence & Mastery Rewards'}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          {initialTab === 'reports'
            ? isBn
              ? 'আমার একাডেমিক রিপোর্ট'
              : 'My Academic Reports'
            : isBn
            ? 'অর্জন, মাইলফলক ও রিপোর্ট'
            : 'Achievements, Milestones & Reports'}
        </h1>
      </div>

      {/* Gamification Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 glass-panel-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isBn ? 'শিক্ষার্থী লেভেল ও XP' : 'Learner Level & XP'}
            </span>
            <Award className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {isBn
              ? `লেভেল ${toBnNum(level, 'bn')} · ${toBnNum(xp, 'bn')} XP`
              : `Level ${level} · ${xp} XP`}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 mt-3 overflow-hidden">
            <div className="h-full colorful-progress-bar transition-all duration-500" style={{ width: `${levelProgressPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 glass-panel-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isBn ? 'শেখার স্ট্রিক' : 'Learning Streak'}
            </span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {isBn ? `${toBnNum(streak, 'bn')} দিন` : `${streak} Day${streak === 1 ? '' : 's'}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            {isBn
              ? `সর্বোচ্চ রেকর্ড: ${toBnNum(streakStatus.longestStreak, 'bn')} দিন · ${streakStatus.completedToday ? 'আজ সক্রিয়' : 'আজ অনুশীলন করুন'}`
              : `Personal Best: ${streakStatus.longestStreak}d · ${streakStatus.completedToday ? 'Active today' : 'Practice today'}`}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 glass-panel-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isBn ? 'দক্ষতা মাইলফলক' : 'Mastery Milestones'}
            </span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {toBnNum(badges.filter((b) => b.earned).length, language)} /{' '}
            {toBnNum(badges.length, language)} {isBn ? 'ব্যাজ' : 'Badges'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
            {isBn
              ? `${toBnNum(assessments.length, 'bn')}টি মূল্যায়ন · ${toBnNum(quizAttempts.length, 'bn')}টি কুইজ · ${toBnNum(solvedOlympiad, 'bn')}টি অলিম্পিয়াড`
              : `${assessments.length} assessments · ${quizAttempts.length} quizzes · ${solvedOlympiad} Olympiad solved`}
          </p>
        </div>
      </div>

      {/* Visual Achievement Badges Showcase */}
      <AchievementBadgesShowcase
        badges={badges}
        userId={userAccount?.uid}
        isBn={isBn}
      />

      {/* Downloadable Reports Center */}
      <div className="p-6 rounded-2xl border glass-panel-3d">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          {isBn ? 'এক্সপোর্টযোগ্য PDF ও CSV রিপোর্ট' : 'Exportable PDF & CSV Reports'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border glass-tile-3d flex flex-col justify-between gap-3">
            <div>
              <FileText className="w-5 h-5 text-cyan-500 mb-2" />
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'একক দক্ষতা ও শেখার পথ PDF' : 'Individual Competency & Remedial PDF'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isBn
                  ? 'সামগ্রিক স্তর, ডোমেইন বিশ্লেষণ, ভুল নির্ণয় ও শেখার পথ অন্তর্ভুক্ত থাকে।'
                  : 'Includes overall tier, domain breakdown, AI error diagnosis evidence, and remedial path.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (!assessments[0]) {
                  showToast(
                    isBn
                      ? 'PDF রিপোর্ট তৈরি করতে প্রথমে একটি মূল্যায়ন সম্পন্ন করুন।'
                      : 'Complete an assessment first to generate a PDF report.',
                    'info'
                  );
                  return;
                }
                exportAssessmentPdf(assessments[0], remedialPlans[0]);
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold glass-btn-3d"
            >
              <Download className="w-3.5 h-3.5" />
              {isBn ? 'PDF ডাউনলোড' : 'Download PDF'}
            </button>
          </div>

          <div className="p-4 rounded-xl border glass-tile-3d flex flex-col justify-between gap-3">
            <div>
              <FileText className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'ডোমেইন-ভিত্তিক মূল্যায়ন CSV' : 'Domain-Wise Assessment CSV'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn
                  ? 'ডোমেইন স্কোর, উত্তর দেওয়ার সময়, গড় কাঠিন্য ও দুর্বল অংশের তালিকা।'
                  : 'Structured CSV of domain scores, response latency, difficulty averages, and subskill gaps.'}
              </p>
            </div>
            <button
              onClick={downloadDomainCsv}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-cyan-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {isBn ? 'CSV এক্সপোর্ট' : 'Export CSV'}
            </button>
          </div>

          <div className="p-4 rounded-xl border glass-tile-3d flex flex-col justify-between gap-3">
            <div>
              <FileText className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'অলিম্পিয়াড পারফরম্যান্স CSV' : 'Olympiad Performance CSV'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isBn
                  ? 'সমস্যার ধরন, যুক্তি স্কোর, ব্যবহৃত ইঙ্গিত এবং অর্জিত XP এক্সপোর্ট করুন।'
                  : 'Export problem categories, reasoning quality scores, hint counts, and XP earned.'}
              </p>
            </div>
            <button
              onClick={downloadOlympiadCsv}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-cyan-500"
            >
              <Download className="w-3.5 h-3.5" />
              {isBn ? 'CSV এক্সপোর্ট' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
