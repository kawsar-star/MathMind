import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDomainsForStudent } from '../../data/domainsAndCurriculum';
import { getDomainLabel, getGradeLabel, t, toBnNum } from '../../i18n/translations';
import {
  DifficultyTier,
  Language,
  MathQuestion,
  StudyMedium,
  WorksheetDoc,
} from '../../types/mathmind';
import {
  AiBackendUnavailableError,
  requestAiPracticeGeneration,
} from '../../services/aiService';
import {
  recordLearningActivity,
  saveQuizAttempt,
  saveWorksheetDoc,
  updateUserPreferences,
} from '../../services/firestoreService';
import {
  checkAnswerDeterministic,
  difficultyTierToNumeric,
  exportWorksheetPdf,
  filterQuestionsForStudent,
  getLocalizedQuestion,
  getQuestionDifficultyTier,
  parseGradeLevel,
} from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { QuestionVisualDiagram } from '../common/QuestionVisualDiagram';
import { useToast } from '../common/ToastContext';

interface PracticeProps {
  initialView?: 'quiz' | 'worksheets';
  initialDomain?: string;
  initialDifficultyTier?: DifficultyTier;
}

const TIER_LABELS: Record<DifficultyTier, { en: string; bn: string }> = {
  easy: { en: 'Easy', bn: 'সহজ (Easy)' },
  medium: { en: 'Medium', bn: 'মধ্যম (Medium)' },
  hard: { en: 'Hard', bn: 'কঠিন (Hard)' },
};

export const PracticeAndWorksheets: React.FC<PracticeProps> = ({
  initialView = 'quiz',
  initialDomain,
  initialDifficultyTier,
}) => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    allQuestions,
    worksheets,
    language,
    setLanguage,
    studyMedium,
    setStudyMedium,
  } = useAuth();
  const { showToast } = useToast();

  const [view, setView] = useState<'quiz' | 'worksheets'>(initialView);
  const [showAllDomains, setShowAllDomains] = useState(false);

  const studentGradeLevel = parseGradeLevel(studentProfile?.grade);
  const { primaryDomains, allDomains, stageLabel, stageLabelBn } = getDomainsForStudent(
    studentProfile?.age ?? 11,
    studentProfile?.grade
  );
  const displayedDomains = showAllDomains ? allDomains : primaryDomains;

  // Quiz state
  const [quizDomain, setQuizDomain] = useState(
    initialDomain || primaryDomains[0]?.id || 'Number Sense'
  );
  const [quizMode, setQuizMode] = useState<
    'daily' | 'topic' | 'adaptive' | 'revision' | 'challenge' | 'timed'
  >('topic');
  const [quizTier, setQuizTier] = useState<DifficultyTier>(initialDifficultyTier || 'easy');
  const [quizCount, setQuizCount] = useState<number>(5);
  const [quizQuestions, setQuizQuestions] = useState<MathQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  // Worksheet Studio state
  const [wsDomain, setWsDomain] = useState(
    initialDomain || primaryDomains[1]?.id || primaryDomains[0]?.id || 'Number Operations'
  );
  const [wsType, setWsType] = useState<
    'practice' | 'remedial' | 'revision' | 'advanced' | 'olympiad'
  >('practice');
  const [wsTier, setWsTier] = useState<DifficultyTier>('easy');
  const [wsCount, setWsCount] = useState(5);
  const [wsLoading, setWsLoading] = useState(false);
  const [activeWorksheet, setActiveWorksheet] = useState<WorksheetDoc | null>(
    worksheets[0] || null
  );
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    if (
      !showAllDomains &&
      !initialDomain &&
      primaryDomains.length > 0 &&
      !primaryDomains.some((d) => d.id === quizDomain)
    ) {
      setQuizDomain(primaryDomains[0].id);
    }
  }, [studentProfile?.grade, studentProfile?.age, showAllDomains]);

  const handleMediumSwitch = async (nextMedium: StudyMedium) => {
    const nextLang: Language = nextMedium === 'bangla_medium' ? 'bn' : 'en';
    setStudyMedium(nextMedium);
    setLanguage(nextLang);
    if (firebaseUser) {
      try {
        await updateUserPreferences(firebaseUser.uid, {
          studyMedium: nextMedium,
          preferredLanguage: nextLang,
        });
      } catch {
        // non-blocking
      }
    }
  };

  const launchCuratedQuiz = () => {
    const matchingPool = filterQuestionsForStudent({
      pool: allQuestions,
      studentGradeLevel,
      domain: quizDomain,
      difficultyTier: quizTier,
      includeAllDomains: quizMode === 'daily',
    });
    const shuffled = [...matchingPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQuizQuestions(shuffled.slice(0, quizCount));
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const generateAiQuiz = async () => {
    setQuizLoading(true);
    try {
      const domainObj = allDomains.find((d) => d.id === quizDomain);
      const res = await requestAiPracticeGeneration({
        domain: quizDomain,
        subskill: domainObj?.subskills[0] || 'Core Skills',
        grade: studentProfile?.grade || 'Grade 1',
        ageBand: studentProfile?.ageBand || '5–6 years',
        difficulty: difficultyTierToNumeric(quizTier),
        difficultyTier: quizTier,
        studyMedium,
        curriculum: studentProfile?.curriculum,
        count: quizCount,
        mode: quizMode,
        language,
      });
      setQuizQuestions(res.questions as MathQuestion[]);
      setQuizAnswers({});
      setQuizSubmitted(false);
      showToast(
        studyMedium === 'bangla_medium'
          ? 'এআই অনুশীলন কুইজ তৈরি হয়েছে।'
          : 'Generated NCTB-aligned AI practice quiz.',
        'success'
      );
    } catch (err) {
      if (err instanceof AiBackendUnavailableError) {
        launchCuratedQuiz();
        showToast(
          studyMedium === 'bangla_medium'
            ? 'স্ট্যাটিক হোস্টিং মোডে NCTB কিউরেটেড কুইজ চালু করা হয়েছে।'
            : 'Loaded curated NCTB quiz for static hosting mode.',
          'info'
        );
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : language === 'bn'
            ? 'কুইজ তৈরি করা যায়নি।'
            : 'Quiz generation failed.';
        showToast(msg, 'error');
      }
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (quizQuestions.length === 0) return;
    setQuizSubmitted(true);
    let correct = 0;
    quizQuestions.forEach((q) => {
      if (
        checkAnswerDeterministic(
          quizAnswers[q.id] || '',
          q.correctAnswer,
          q.correctAnswerBn
        )
      ) {
        correct++;
      }
    });
    const pct = Math.round((correct / quizQuestions.length) * 100);
    const xp = correct * 15 + 10;

    if (firebaseUser) {
      try {
        await saveQuizAttempt(firebaseUser.uid, {
          domain: quizDomain,
          mode: quizMode,
          score: pct,
          totalQuestions: quizQuestions.length,
          accuracyPercent: pct,
          xpEarned: xp,
        });
        const streakRes = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: xp,
          activityLabel:
            language === 'bn'
              ? `${getDomainLabel(quizDomain, 'bn')} (${TIER_LABELS[quizTier].bn.split(' ')[0]}) কুইজ`
              : `${quizDomain} (${TIER_LABELS[quizTier].en}) Quiz`,
          language,
        });
        showToast(
          language === 'bn'
            ? streakRes.notificationTitle
              ? `কুইজ সংরক্ষিত হয়েছে: ${toBnNum(pct)}% (+${toBnNum(xp)} XP) · ${streakRes.notificationTitle}`
              : `কুইজ সংরক্ষিত হয়েছে: ${toBnNum(pct)}% (+${toBnNum(xp)} XP)`
            : streakRes.notificationTitle
            ? `Quiz recorded: ${pct}% (+${xp} XP) · ${streakRes.notificationTitle}`
            : `Quiz recorded: ${pct}% (+${xp} XP)`,
          'success'
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const generateWorksheet = async () => {
    if (!firebaseUser) return;
    setWsLoading(true);
    try {
      const domainObj = allDomains.find((d) => d.id === wsDomain);
      const numericDiff = difficultyTierToNumeric(wsTier);
      const res = await requestAiPracticeGeneration({
        domain: wsDomain,
        subskill: domainObj?.subskills[0] || 'Core Concepts',
        grade: studentProfile?.grade || 'Grade 1',
        ageBand: studentProfile?.ageBand || '5–6 years',
        difficulty: numericDiff,
        difficultyTier: wsTier,
        studyMedium,
        curriculum: studentProfile?.curriculum,
        count: wsCount,
        mode: `${wsType} worksheet`,
        language,
      });

      const wsPayload: Omit<WorksheetDoc, 'id' | 'ownerId' | 'createdAt'> = {
        title:
          res.title ||
          (language === 'bn'
            ? `${getDomainLabel(wsDomain, 'bn')} — ${TIER_LABELS[wsTier].bn.split(' ')[0]} ওয়ার্কশিট`
            : `${wsDomain} — ${TIER_LABELS[wsTier].en} Worksheet`),
        domain: wsDomain,
        grade: studentProfile?.grade || 'Grade 1',
        difficulty: numericDiff,
        worksheetType: wsType,
        questions: (res.questions || []).map((q: any, i: number) => {
          const loc = getLocalizedQuestion(q, language, studyMedium);
          return {
            id: q.id || `wsq_${i}`,
            prompt: loc.prompt,
            options: loc.options || [],
            correctAnswer: loc.correctAnswer,
            explanation: loc.explanation,
          };
        }),
      };

      const id = await saveWorksheetDoc(firebaseUser.uid, wsPayload);
      setActiveWorksheet({ ...wsPayload, id, ownerId: firebaseUser.uid });
      showToast(
        language === 'bn'
          ? 'ওয়ার্কশিট তৈরি ও ফায়ারস্টোরে সংরক্ষণ করা হয়েছে।'
          : 'Worksheet generated & saved to Firestore.',
        'success'
      );
    } catch (err) {
      if (err instanceof AiBackendUnavailableError) {
        let fallbackQuestions = filterQuestionsForStudent({
          pool: allQuestions,
          studentGradeLevel,
          domain: wsDomain,
          difficultyTier: wsTier,
          includeAllDomains: false,
        }).slice(0, wsCount);

        if (fallbackQuestions.length < Math.min(3, wsCount)) {
          fallbackQuestions = filterQuestionsForStudent({
            pool: allQuestions,
            studentGradeLevel,
            domain: wsDomain,
            difficultyTier: wsTier,
            includeAllDomains: true,
          }).slice(0, wsCount);
        }

        const numericDiff = difficultyTierToNumeric(wsTier);
        const wsPayload: Omit<WorksheetDoc, 'id' | 'ownerId' | 'createdAt'> = {
          title:
            studyMedium === 'bangla_medium'
              ? `${getDomainLabel(wsDomain, 'bn')} — ${TIER_LABELS[wsTier].bn.split(' ')[0]} NCTB ওয়ার্কশিট`
              : `${wsDomain} — ${TIER_LABELS[wsTier].en} NCTB Worksheet`,
          domain: wsDomain,
          grade: studentProfile?.grade || 'Grade 1',
          difficulty: numericDiff,
          worksheetType: wsType,
          questions: fallbackQuestions.map((q, i) => {
            const loc = getLocalizedQuestion(q, language, studyMedium);
            return {
              id: q.id || `wsq_${i}`,
              prompt: loc.prompt,
              options: loc.options || [],
              correctAnswer: loc.correctAnswer,
              explanation: loc.explanation,
            };
          }),
        };

        try {
          const id = await saveWorksheetDoc(firebaseUser.uid, wsPayload);
          setActiveWorksheet({ ...wsPayload, id, ownerId: firebaseUser.uid });
          showToast(
            studyMedium === 'bangla_medium'
              ? 'NCTB কিউরেটেড ওয়ার্কশিট তৈরি ও সংরক্ষণ করা হয়েছে।'
              : 'NCTB curated worksheet generated & saved to Firestore.',
            'success'
          );
        } catch (saveErr) {
          const saveMsg =
            saveErr instanceof Error
              ? saveErr.message
              : language === 'bn'
              ? 'ওয়ার্কশিট সংরক্ষণ করা যায়নি।'
              : 'Unable to save worksheet.';
          showToast(saveMsg, 'error');
        }
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : language === 'bn'
            ? 'ওয়ার্কশিট তৈরি করা যায়নি।'
            : 'Worksheet generation failed.';
        showToast(msg, 'error');
      }
    } finally {
      setWsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {getGradeLabel(studentProfile?.grade || 'Grade 1', language)} ·{' '}
            {language === 'bn' ? stageLabelBn : stageLabel} ·{' '}
            {t(language, 'gradeAlignedNote')}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {language === 'bn'
              ? 'স্মার্ট অনুশীলন ও ওয়ার্কশিট স্টুডিও'
              : 'Smart Quiz Center & AI Worksheet Studio'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bangla Medium / English Version Switch Panel */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/70 dark:bg-slate-900/75 border border-cyan-500/25">
            <button
              type="button"
              onClick={() => handleMediumSwitch('bangla_medium')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                studyMedium === 'bangla_medium'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              বাংলা মাধ্যম
            </button>
            <button
              type="button"
              onClick={() => handleMediumSwitch('english_version')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                studyMedium === 'english_version'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English Version
            </button>
          </div>

          {/* Quiz / Worksheets Tab Switch */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/70 dark:bg-slate-900/75 border border-violet-500/25">
            <button
              onClick={() => setView('quiz')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                view === 'quiz'
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {language === 'bn' ? 'স্মার্ট কুইজ' : 'Smart Quiz Center'}
            </button>
            <button
              onClick={() => setView('worksheets')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                view === 'worksheets'
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {language === 'bn' ? 'ওয়ার্কশিট স্টুডিও' : 'AI Worksheet Studio'}
            </button>
          </div>
        </div>
      </div>

      {view === 'quiz' ? (
        <div className="space-y-6">
          {/* Quiz Generator Controls */}
          <div className="p-5 rounded-2xl border glass-panel-3d space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {language === 'bn'
                  ? 'বয়স অনুযায়ী ডোমেইন ও ৩টি প্রশ্নের মান (সহজ, মধ্যম, কঠিন)'
                  : 'Age-Matched Domains & 3 Student Difficulty Levels (Easy, Medium, Hard)'}
              </span>
              {primaryDomains.length < 12 && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllDomains}
                    onChange={(e) => setShowAllDomains(e.target.checked)}
                    className="rounded border-slate-400 text-cyan-600"
                  />
                  {t(language, 'showAllDomains')}
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'গণিত ডোমেইন' : 'Domain'}
                </label>
                <select
                  value={quizDomain}
                  onChange={(e) => setQuizDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  {displayedDomains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {language === 'bn' ? d.displayNameBn : d.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {language === 'bn' ? 'কুইজের ধরন' : 'Quiz Mode'}
                </label>
                <select
                  value={quizMode}
                  onChange={(e) => setQuizMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value="topic">{language === 'bn' ? 'বিষয়ভিত্তিক' : 'Topic-Based'}</option>
                  <option value="daily">{language === 'bn' ? 'দৈনিক অনুশীলন' : 'Daily Practice'}</option>
                  <option value="revision">{language === 'bn' ? 'পুনরালোচনা' : 'Revision Quiz'}</option>
                  <option value="challenge">{language === 'bn' ? 'চ্যালেঞ্জ' : 'Challenge Quiz'}</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t(language, 'diffLevelLabel')}
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {(['easy', 'medium', 'hard'] as DifficultyTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setQuizTier(tier)}
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-colors ${
                        quizTier === tier
                          ? tier === 'easy'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : tier === 'medium'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {language === 'bn' ? TIER_LABELS[tier].bn.split(' ')[0] : TIER_LABELS[tier].en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 flex gap-2">
                <button
                  onClick={launchCuratedQuiz}
                  className="flex-1 py-2 px-3 rounded-xl glass-btn-emerald text-white text-xs font-semibold whitespace-nowrap"
                >
                  {language === 'bn' ? 'পাঠ্যক্রম প্রশ্ন' : 'Curated Bank'}
                </button>
                <button
                  onClick={generateAiQuiz}
                  disabled={quizLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-btn-violet text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {quizLoading
                    ? language === 'bn'
                      ? 'তৈরি হচ্ছে...'
                      : 'Generating...'
                    : language === 'bn'
                    ? 'এআই কুইজ'
                    : 'AI Quiz'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  {language === 'bn' ? 'প্রশ্ন সংখ্যা:' : 'Questions per quiz:'}
                </span>
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuizCount(cnt)}
                    className={`px-2.5 py-1 rounded-md font-mono font-semibold border transition-colors tabular-nums ${
                      quizCount === cnt
                        ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {toBnNum(cnt, language)}
                  </button>
                ))}
              </div>
              <span className="font-mono text-slate-500 tabular-nums">
                {language === 'bn'
                  ? `মোট প্রশ্ন ব্যাংক: ${toBnNum(allQuestions.length, language)}টি যাচাইকৃত প্রশ্ন`
                  : `Bank pool: ${allQuestions.length} verified curriculum items`}
              </span>
            </div>
          </div>

          {quizQuestions.length === 0 ? (
            <div className="p-10 rounded-2xl border glass-panel-3d text-center text-sm text-slate-500">
              {language === 'bn'
                ? 'ডোমেইন ও সহজ/মধ্যম/কঠিন লেভেল বেছে নিয়ে "পাঠ্যক্রম প্রশ্ন" অথবা "এআই কুইজ" বাটনে ক্লিক করুন।'
                : 'Select your domain and Easy / Medium / Hard level, then click Curated Bank or AI Quiz to begin.'}
            </div>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => {
                const loc = getLocalizedQuestion(q, language, studyMedium);
                const tier = getQuestionDifficultyTier(q);
                const chosen = quizAnswers[q.id] || '';
                const isOk =
                  quizSubmitted &&
                  checkAnswerDeterministic(chosen, q.correctAnswer, q.correctAnswerBn);
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border glass-panel-3d space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {language === 'bn'
                          ? `প্রশ্ন ${toBnNum(idx + 1, language)} · ${getDomainLabel(q.domain, language)} · `
                          : `Q${idx + 1} · ${q.domain} · ${q.subskill} · `}
                        <strong
                          className={
                            tier === 'easy'
                              ? 'text-emerald-500'
                              : tier === 'medium'
                              ? 'text-cyan-500'
                              : 'text-amber-500'
                          }
                        >
                          {language === 'bn' ? TIER_LABELS[tier].bn.split(' ')[0] : TIER_LABELS[tier].en}
                        </strong>
                      </span>
                      <span className="font-mono">
                        {q.source === 'ai_generated'
                          ? language === 'bn'
                            ? 'এআই-তৈরি প্রশ্ন'
                            : 'AI-Generated Practice'
                          : language === 'bn'
                          ? 'এনসিটিবি প্রশ্ন ব্যাংক'
                          : 'NCTB Curriculum Bank'}
                      </span>
                    </div>

                    <div className="text-base font-medium text-slate-900 dark:text-white">
                      <MathRenderer content={loc.prompt} />
                    </div>

                    <QuestionVisualDiagram q={q} language={language} />

                    {loc.options && loc.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {loc.options.map((opt, optIdx) => {
                          const badgeLetters = language === 'bn' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];
                          const badgeColors = [
                            'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40',
                            'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-400/40',
                            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
                            'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40',
                          ];
                          return (
                            <button
                              key={opt}
                              disabled={quizSubmitted}
                              onClick={() => setQuizAnswers((p) => ({ ...p, [q.id]: opt }))}
                              className={`p-3 rounded-xl border text-left text-sm transition-all flex items-center gap-2.5 ${
                                chosen === opt
                                  ? 'border-cyan-500 bg-gradient-to-r from-cyan-500/15 to-violet-500/15 font-semibold shadow-sm'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/60'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 ${
                                  chosen === opt
                                    ? 'bg-cyan-600 text-white border-cyan-500'
                                    : badgeColors[optIdx % badgeColors.length]
                                }`}
                              >
                                {badgeLetters[optIdx % badgeLetters.length]}
                              </span>
                              <MathRenderer content={opt} interactiveGlossary={false} />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        disabled={quizSubmitted}
                        value={chosen}
                        onChange={(e) => setQuizAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder={language === 'bn' ? 'উত্তর লিখো...' : 'Enter answer...'}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono"
                      />
                    )}

                    {quizSubmitted && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div
                          className={`font-semibold flex items-center gap-1.5 ${
                            isOk ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isOk ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {isOk
                            ? language === 'bn'
                              ? 'সঠিক উত্তর!'
                              : 'Correct!'
                            : `${
                                language === 'bn' ? 'ভুল হয়েছে — সঠিক উত্তর:' : 'Incorrect — Correct answer:'
                              } ${loc.correctAnswer}`}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                          <MathRenderer content={loc.explanation} />
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {!quizSubmitted && (
                <div className="flex justify-end">
                  <button
                    onClick={submitQuiz}
                    className="px-6 py-2.5 rounded-xl glass-btn-3d text-white text-sm font-semibold"
                  >
                    {language === 'bn'
                      ? 'কুইজ জমা দিন ও ব্যাখ্যা দেখুন'
                      : 'Submit Quiz & View Explanations'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* AI Worksheet Studio */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl border glass-panel-3d space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
                {language === 'bn' ? 'ওয়ার্কশিট সেটিংস' : 'Worksheet Parameters'}
              </h3>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {language === 'bn' ? 'গণিত ডোমেইন' : 'Mathematics Domain'}
                </label>
                <select
                  value={wsDomain}
                  onChange={(e) => setWsDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  {displayedDomains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {language === 'bn' ? d.displayNameBn : d.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {language === 'bn' ? 'ধরন' : 'Type'}
                  </label>
                  <select
                    value={wsType}
                    onChange={(e) => setWsType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  >
                    <option value="practice">{language === 'bn' ? 'অনুশীলন (Practice)' : 'Practice'}</option>
                    <option value="remedial">{language === 'bn' ? 'সংশোধনমূলক (Remedial)' : 'Remedial'}</option>
                    <option value="revision">{language === 'bn' ? 'পুনরালোচনা (Revision)' : 'Revision'}</option>
                    <option value="advanced">{language === 'bn' ? 'উচ্চতর (Advanced)' : 'Advanced'}</option>
                    <option value="olympiad">{language === 'bn' ? 'অলিম্পিয়াড (Olympiad)' : 'Olympiad'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {t(language, 'diffLevelLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {(['easy', 'medium', 'hard'] as DifficultyTier[]).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setWsTier(tier)}
                        className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          wsTier === tier
                            ? tier === 'easy'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : tier === 'medium'
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {language === 'bn' ? TIER_LABELS[tier].bn.split(' ')[0] : TIER_LABELS[tier].en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{language === 'bn' ? 'প্রশ্ন সংখ্যা' : 'Questions'}</span>
                  <span className="font-mono tabular-nums">{toBnNum(wsCount, language)}</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={wsCount}
                  onChange={(e) => setWsCount(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              <button
                onClick={generateWorksheet}
                disabled={wsLoading}
                className="w-full py-2.5 rounded-xl glass-btn-violet text-white text-xs font-semibold disabled:opacity-50"
              >
                {wsLoading
                  ? language === 'bn'
                    ? 'ওয়ার্কশিট তৈরি হচ্ছে...'
                    : 'Generating Worksheet...'
                  : language === 'bn'
                  ? 'ওয়ার্কশিট তৈরি ও সংরক্ষণ করুন'
                  : 'Generate & Save Worksheet'}
              </button>
            </div>

            {worksheets.length > 0 && (
              <div className="p-5 rounded-2xl border glass-panel-3d space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  {language === 'bn' ? 'সংরক্ষিত ওয়ার্কশিট' : 'Saved Worksheets'}
                </h4>
                {worksheets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setActiveWorksheet(w)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs ${
                      activeWorksheet?.id === w.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{w.title}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {getDomainLabel(w.domain, language)} · {toBnNum(w.questions.length, language)}{' '}
                      {language === 'bn' ? 'টি প্রশ্ন' : 'Qs'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            {!activeWorksheet ? (
              <div className="text-center py-14 text-sm text-slate-500">
                {language === 'bn'
                  ? 'বাম পাশ থেকে বিষয় ও স্তর বেছে "ওয়ার্কশিট তৈরি ও সংরক্ষণ করুন" বাটনে ক্লিক করুন।'
                  : 'Generate a customized worksheet to preview problems, toggle the separate answer key, and export printable PDF.'}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeWorksheet.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {getDomainLabel(activeWorksheet.domain, language)} ·{' '}
                      {getGradeLabel(activeWorksheet.grade, language)} ·{' '}
                      {language === 'bn'
                        ? activeWorksheet.difficulty <= 1
                          ? TIER_LABELS.easy.bn.split(' ')[0]
                          : activeWorksheet.difficulty <= 3
                          ? TIER_LABELS.medium.bn.split(' ')[0]
                          : TIER_LABELS.hard.bn.split(' ')[0]
                        : activeWorksheet.difficulty <= 1
                        ? TIER_LABELS.easy.en
                        : activeWorksheet.difficulty <= 3
                        ? TIER_LABELS.medium.en
                        : TIER_LABELS.hard.en}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAnswerKey((s) => !s)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                    >
                      {showAnswerKey
                        ? language === 'bn'
                          ? 'উত্তর লুকাও'
                          : 'Hide Answer Key'
                        : language === 'bn'
                        ? 'উত্তরমালা দেখো'
                        : 'Show Answer Key'}
                    </button>
                    <button
                      onClick={() => exportWorksheetPdf(activeWorksheet)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-btn-3d text-white text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'প্রিন্ট / PDF ডাউনলোড' : 'Printable PDF'}
                    </button>
                  </div>
                </div>

                <ol className="space-y-4">
                  {activeWorksheet.questions.map((q, idx) => (
                    <li
                      key={q.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                        <span className="font-mono text-cyan-500 mr-2 tabular-nums">
                          {toBnNum(idx + 1, language)}.
                        </span>
                        <MathRenderer content={q.prompt} />
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pl-5">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx}>
                              {language === 'bn'
                                ? `${['ক', 'খ', 'গ', 'ঘ'][oIdx % 4]})`
                                : `${String.fromCharCode(65 + oIdx)})`}{' '}
                              <MathRenderer content={opt} />
                            </div>
                          ))}
                        </div>
                      )}
                      {showAnswerKey && (
                        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-emerald-600 dark:text-emerald-400">
                          <strong>{language === 'bn' ? 'উত্তর:' : 'Answer:'}</strong> {q.correctAnswer} —{' '}
                          <MathRenderer content={q.explanation} />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
