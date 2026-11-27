import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Award,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Layers,
  Shuffle,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OLYMPIAD_PROBLEM_BANK } from '../../data/domainsAndCurriculum';
import { OlympiadProblem } from '../../types/mathmind';
import { requestOlympiadCoach } from '../../services/aiService';
import { recordLearningActivity, saveOlympiadAttempt } from '../../services/firestoreService';
import { checkAnswerDeterministic, parseGradeLevel } from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

const OLYMPIAD_EMBLEM = '/src/assets/images/olympiad_emblem_polyhedron_1795441765759.jpg';

const CATEGORIES = [
  'All',
  'Number Theory',
  'Algebra',
  'Geometry',
  'Combinatorics',
  'Logical Reasoning',
  'Mathematical Puzzles',
  'Pattern and Sequence',
  'Probability',
  'Creative Problem Solving',
] as const;

const DIFFICULTIES = [
  'All',
  'Explorer',
  'Beginner Olympiad',
  'Intermediate Olympiad',
  'Advanced Olympiad',
  'National Challenge',
  'International Challenge',
] as const;

export type OlympiadDivisionKey = 'matched' | 'g0_2' | 'g3_5' | 'g6_8' | 'g9_10' | 'g11_12' | 'all';

interface DivisionMeta {
  key: Exclude<OlympiadDivisionKey, 'matched' | 'all'>;
  minGrade: number;
  maxGrade: number;
  minAge: number;
  maxAge: number;
  labelEn: string;
  labelBn: string;
  shortEn: string;
  shortBn: string;
  ageEn: string;
  ageBn: string;
  defaultDifficulty: OlympiadProblem['difficulty'];
}

const DIVISIONS: DivisionMeta[] = [
  {
    key: 'g0_2',
    minGrade: 0,
    maxGrade: 2,
    minAge: 4,
    maxAge: 8,
    labelEn: 'Pre-Primary – Grade 2',
    labelBn: 'প্রি-প্রাইমারি – ২য় শ্রেণি',
    shortEn: 'Pre–Gr 2',
    shortBn: 'প্রি–২য়',
    ageEn: '4–8 years',
    ageBn: '৪–৮ বছর',
    defaultDifficulty: 'Explorer',
  },
  {
    key: 'g3_5',
    minGrade: 3,
    maxGrade: 5,
    minAge: 8,
    maxAge: 11,
    labelEn: 'Grade 3 – Grade 5',
    labelBn: '৩য় – ৫ম শ্রেণি',
    shortEn: 'Gr 3–5',
    shortBn: '৩য়–৫ম',
    ageEn: '8–11 years',
    ageBn: '৮–১১ বছর',
    defaultDifficulty: 'Beginner Olympiad',
  },
  {
    key: 'g6_8',
    minGrade: 6,
    maxGrade: 8,
    minAge: 11,
    maxAge: 14,
    labelEn: 'Grade 6 – Grade 8',
    labelBn: '৬ষ্ঠ – ৮ম শ্রেণি',
    shortEn: 'Gr 6–8',
    shortBn: '৬ষ্ঠ–৮ম',
    ageEn: '11–14 years',
    ageBn: '১১–১৪ বছর',
    defaultDifficulty: 'Intermediate Olympiad',
  },
  {
    key: 'g9_10',
    minGrade: 9,
    maxGrade: 10,
    minAge: 14,
    maxAge: 16,
    labelEn: 'Grade 9 – Grade 10',
    labelBn: '৯ম – ১০ম শ্রেণি',
    shortEn: 'Gr 9–10',
    shortBn: '৯ম–১০ম',
    ageEn: '14–16 years',
    ageBn: '১৪–১৬ বছর',
    defaultDifficulty: 'Advanced Olympiad',
  },
  {
    key: 'g11_12',
    minGrade: 11,
    maxGrade: 12,
    minAge: 16,
    maxAge: 19,
    labelEn: 'Grade 11 – Grade 12',
    labelBn: '১১শ – ১২শ শ্রেণি',
    shortEn: 'Gr 11–12',
    shortBn: '১১শ–১২শ',
    ageEn: '16–19 years',
    ageBn: '১৬–১৯ বছর',
    defaultDifficulty: 'National Challenge',
  },
];

const CAT_BN: Record<string, string> = {
  All: 'সব বিষয়',
  'Number Theory': 'সংখ্যার তত্ত্ব',
  Algebra: 'বীজগণিত',
  Geometry: 'জ্যামিতি',
  Combinatorics: 'সমাবেশ ও বিন্যাস',
  'Logical Reasoning': 'যৌক্তিক বিশ্লেষণ',
  'Mathematical Puzzles': 'গাণিতিক ধাঁধা',
  'Pattern and Sequence': 'প্যাটার্ন ও ধারা',
  Probability: 'সম্ভাবনা',
  'Creative Problem Solving': 'সৃজনশীল সমাধান',
};

const DIFF_BN: Record<string, string> = {
  All: 'সব স্তর',
  Explorer: 'এক্সপ্লোরার',
  'Beginner Olympiad': 'প্রারম্ভিক অলিম্পিয়াড',
  'Intermediate Olympiad': 'মধ্যম অলিম্পিয়াড',
  'Advanced Olympiad': 'উচ্চতর অলিম্পিয়াড',
  'National Challenge': 'জাতীয় চ্যালেঞ্জ',
  'International Challenge': 'আন্তর্জাতিক চ্যালেঞ্জ',
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnNum(val: number | string): string {
  return String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

function resolveDivisionForStudent(gradeStr?: string | null, age?: number | null): DivisionMeta {
  if (gradeStr) {
    const g = parseGradeLevel(gradeStr);
    const byGrade = DIVISIONS.find((d) => g >= d.minGrade && g <= d.maxGrade);
    if (byGrade) return byGrade;
  }
  const safeAge = typeof age === 'number' && !Number.isNaN(age) ? age : 11;
  if (safeAge <= 8) return DIVISIONS[0];
  if (safeAge <= 11) return DIVISIONS[1];
  if (safeAge <= 14) return DIVISIONS[2];
  if (safeAge <= 16) return DIVISIONS[3];
  return DIVISIONS[4];
}

function problemMatchesDivision(
  problem: OlympiadProblem,
  target: DivisionMeta | null
): boolean {
  if (!target) return true;
  if (
    typeof problem.minGradeLevel === 'number' &&
    typeof problem.maxGradeLevel === 'number'
  ) {
    return (
      problem.maxGradeLevel >= target.minGrade &&
      problem.minGradeLevel <= target.maxGrade
    );
  }
  if (typeof problem.minAge === 'number' && typeof problem.maxAge === 'number') {
    return problem.maxAge >= target.minAge && problem.minAge <= target.maxAge;
  }
  return true;
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const DECK_PAGE_SIZE = 24;

export const OlympiadArena: React.FC = () => {
  const { firebaseUser, userAccount, studentProfile, olympiadAttempts, language } = useAuth();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const studentDivision = useMemo(
    () => resolveDivisionForStudent(studentProfile?.grade, studentProfile?.age),
    [studentProfile?.grade, studentProfile?.age]
  );

  const [divisionFilter, setDivisionFilter] = useState<OlympiadDivisionKey>('matched');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [unsolvedOnly, setUnsolvedOnly] = useState(false);
  const [shuffleNonce, setShuffleNonce] = useState(1);
  const [visibleCount, setVisibleCount] = useState(DECK_PAGE_SIZE);

  const [problems, setProblems] = useState<OlympiadProblem[]>(OLYMPIAD_PROBLEM_BANK);

  const solvedProblemIds = useMemo(
    () => new Set(olympiadAttempts.filter((a) => a.isCorrect).map((a) => a.problemId)),
    [olympiadAttempts]
  );

  const activeDivisionMeta: DivisionMeta | null = useMemo(() => {
    if (divisionFilter === 'all') return null;
    if (divisionFilter === 'matched') return studentDivision;
    return DIVISIONS.find((d) => d.key === divisionFilter) || studentDivision;
  }, [divisionFilter, studentDivision]);

  const shuffledFilteredProblems = useMemo(() => {
    void shuffleNonce;
    const base = problems.filter((p) => {
      if (!problemMatchesDivision(p, activeDivisionMeta)) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
      if (unsolvedOnly && solvedProblemIds.has(p.id)) return false;
      return true;
    });
    // AI-generated problems stay pinned to top on creation; bank items dynamically randomize!
    const aiPins = base.filter((p) => p.source === 'ai_generated');
    const rest = fisherYatesShuffle(base.filter((p) => p.source !== 'ai_generated'));
    return [...aiPins, ...rest];
  }, [
    problems,
    activeDivisionMeta,
    categoryFilter,
    difficultyFilter,
    unsolvedOnly,
    solvedProblemIds,
    shuffleNonce,
  ]);

  const [selectedProblem, setSelectedProblem] = useState<OlympiadProblem>(
    () => shuffledFilteredProblems[0] || OLYMPIAD_PROBLEM_BANK[0]
  );
  const [answerInput, setAnswerInput] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [aiCoachHint, setAiCoachHint] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<{
    isCorrect: boolean;
    reasoningScore: number;
    approachFeedback: string;
    alternativeElegantApproach?: string;
  } | null>(null);
  const [timedMode, setTimedMode] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [generatingProblem, setGeneratingProblem] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const selectProblem = useCallback((p: OlympiadProblem) => {
    setSelectedProblem(p);
    setAnswerInput('');
    setReasoningText('');
    setRevealedHints([]);
    setAiCoachHint(null);
    setEvaluationResult(null);
    setSecondsElapsed(0);
  }, []);

  // Auto-sync selected problem when active grade/age filter shifts or no match remains
  useEffect(() => {
    if (shuffledFilteredProblems.length === 0) return;
    const stillVisible = shuffledFilteredProblems.some((p) => p.id === selectedProblem?.id);
    if (!stillVisible) {
      selectProblem(shuffledFilteredProblems[0]);
    }
  }, [shuffledFilteredProblems, selectedProblem?.id, selectProblem]);

  // Reset pagination when filters or shuffle change
  useEffect(() => {
    setVisibleCount(DECK_PAGE_SIZE);
  }, [divisionFilter, categoryFilter, difficultyFilter, unsolvedOnly, shuffleNonce]);

  useEffect(() => {
    if (!timedMode) return;
    const tmr = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(tmr);
  }, [timedMode]);

  const handleShuffleDeck = () => {
    setShuffleNonce((n) => n + 1);
    const pool = problems.filter((p) => problemMatchesDivision(p, activeDivisionMeta));
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      selectProblem(pick);
    }
    showToast(
      language === 'bn'
        ? 'আপনার শ্রেণি ও বয়স অনুযায়ী প্রশ্নগুলো র্যান্ডম শাফেল করা হয়েছে!'
        : 'Shuffled a fresh randomized Olympiad deck for your division!',
      'info'
    );
  };

  const handleNextRandomProblem = () => {
    const pool =
      shuffledFilteredProblems.length > 1
        ? shuffledFilteredProblems.filter((p) => p.id !== selectedProblem?.id)
        : shuffledFilteredProblems;
    if (pool.length === 0) return;
    const unsolvedPool = pool.filter((p) => !solvedProblemIds.has(p.id));
    const sourcePool = unsolvedPool.length > 0 ? unsolvedPool : pool;
    const randomPick = sourcePool[Math.floor(Math.random() * sourcePool.length)];
    selectProblem(randomPick);
  };

  const revealNextHint = async () => {
    const activeHints =
      language === 'bn' && selectedProblem.hintsBn?.length
        ? selectedProblem.hintsBn
        : selectedProblem.hints;
    const nextIdx = revealedHints.length;
    if (nextIdx < activeHints.length) {
      setRevealedHints((prev) => [...prev, activeHints[nextIdx]]);
      return;
    }
    setLoadingCoach(true);
    try {
      const res = await requestOlympiadCoach({
        action: 'hint',
        category: selectedProblem.category,
        difficulty: selectedProblem.difficulty,
        problemPrompt:
          language === 'bn' && selectedProblem.promptBn
            ? selectedProblem.promptBn
            : selectedProblem.prompt,
        hintNumber: Math.min(3, nextIdx + 1),
        language,
      });
      setAiCoachHint(`${res.hintText} (${res.guidingQuestion})`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'এআই ইঙ্গিত সেবা এই মুহূর্তে পাওয়া যাচ্ছে না।'
          : 'Hint service unavailable.';
      showToast(msg, 'error');
    } finally {
      setLoadingCoach(false);
    }
  };

  const submitSolution = async () => {
    if (!answerInput.trim()) {
      showToast(
        language === 'bn' ? 'প্রথমে তোমার চূড়ান্ত উত্তর লিখো।' : 'Enter your final answer first.',
        'info'
      );
      return;
    }
    setLoadingCoach(true);

    const deterministicCorrect = checkAnswerDeterministic(
      answerInput,
      selectedProblem.correctAnswer,
      selectedProblem.correctAnswerBn
    );
    let reasoningScore = deterministicCorrect
      ? reasoningText.trim().length > 25
        ? 85
        : 45
      : 15;
    let approachFeedback = deterministicCorrect
      ? language === 'bn'
        ? 'তোমার চূড়ান্ত উত্তর যাচাইকৃত সমাধানের সাথে মিলেছে।'
        : 'Your final answer matches the verified solution.'
      : language === 'bn'
      ? 'উত্তরটি এখনো মেলেনি। নিচের পূর্ণাঙ্গ সমাধান ও যুক্তি দেখে পুনরায় চেষ্টা করো।'
      : 'Your final answer does not match yet. Review the mathematical invariant and solution proof.';
    let alternativeElegantApproach =
      language === 'bn' && selectedProblem.keyInsightBn
        ? selectedProblem.keyInsightBn
        : selectedProblem.keyInsight;

    try {
      const evalRes = await requestOlympiadCoach({
        action: 'evaluate_reasoning',
        category: selectedProblem.category,
        difficulty: selectedProblem.difficulty,
        problemPrompt: selectedProblem.prompt,
        expectedAnswer: selectedProblem.correctAnswer,
        studentAnswer: answerInput,
        reasoningText,
        language,
      });
      reasoningScore = evalRes.reasoningScore ?? reasoningScore;
      approachFeedback = evalRes.approachFeedback || approachFeedback;
      alternativeElegantApproach = evalRes.alternativeElegantApproach || alternativeElegantApproach;
    } catch {
      // Keep deterministic score if AI reasoning evaluator is offline
    }

    setEvaluationResult({
      isCorrect: deterministicCorrect,
      reasoningScore,
      approachFeedback,
      alternativeElegantApproach,
    });

    if (firebaseUser) {
      const xpEarned = deterministicCorrect
        ? Math.max(25, Math.round(reasoningScore * 0.8) - revealedHints.length * 8)
        : 10;
      try {
        await saveOlympiadAttempt(firebaseUser.uid, {
          problemId: selectedProblem.id,
          category: selectedProblem.category,
          difficulty: selectedProblem.difficulty,
          submittedAnswer: answerInput.trim().slice(0, 300),
          ...(reasoningText.trim() ? { reasoningText: reasoningText.trim().slice(0, 3000) } : {}),
          isCorrect: deterministicCorrect,
          hintsUsed: revealedHints.length,
          timeSpentSec: secondsElapsed,
          reasoningScore,
          xpEarned,
        });
        const streakRes = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: xpEarned,
          activityLabel:
            language === 'bn'
              ? `অলিম্পিয়াড: ${CAT_BN[selectedProblem.category] || selectedProblem.category}`
              : `Olympiad: ${selectedProblem.category}`,
          language,
        });
        showToast(
          deterministicCorrect
            ? language === 'bn'
              ? `সঠিক সমাধান যাচাই হয়েছে! যুক্তি: ${toBnNum(reasoningScore)}/১০০ (+${toBnNum(xpEarned)} XP)${
                  streakRes.notificationTitle ? ` · ${streakRes.notificationTitle}` : ''
                }`
              : `Olympiad verified! Reasoning: ${reasoningScore}/100 (+${xpEarned} XP)${
                  streakRes.notificationTitle ? ` · ${streakRes.notificationTitle}` : ''
                }`
            : language === 'bn'
            ? `প্রচেষ্টা সংরক্ষিত হয়েছে।${
                streakRes.notificationTitle ? ` ${streakRes.notificationTitle}` : ' নিচের কোচ ফিডব্যাক দেখে সমাধানটি যাচাই করো।'
              }`
            : `Attempt saved.${
                streakRes.notificationTitle
                  ? ` ${streakRes.notificationTitle}`
                  : ' Inspect the coach feedback to refine your proof.'
              }`,
          deterministicCorrect ? 'success' : 'info'
        );
      } catch (err) {
        console.error(err);
      }
    }

    setLoadingCoach(false);
  };

  const generateOriginalProblem = async () => {
    setGeneratingProblem(true);
    try {
      const targetDiv = activeDivisionMeta || studentDivision;
      const cat =
        categoryFilter === 'All'
          ? ['Number Theory', 'Algebra', 'Geometry', 'Combinatorics', 'Logical Reasoning'][
              Math.floor(Math.random() * 5)
            ]
          : categoryFilter;
      const diff =
        difficultyFilter === 'All' ? targetDiv.defaultDifficulty : difficultyFilter;
      const res = await requestOlympiadCoach({
        action: 'generate_problem',
        category: cat,
        difficulty: `${diff} (Target audience: ${targetDiv.labelEn}, Age ${targetDiv.ageEn})`,
        language,
      });
      const newProb: OlympiadProblem = {
        id: `ai_oly_${Date.now()}`,
        title: res.title || `AI Challenge: ${cat}`,
        titleBn: language === 'bn' ? res.title || `এআই চ্যালেঞ্জ: ${CAT_BN[cat] || cat}` : undefined,
        category: cat as OlympiadProblem['category'],
        difficulty: diff as OlympiadProblem['difficulty'],
        prompt: res.prompt,
        promptBn: language === 'bn' ? res.prompt : undefined,
        correctAnswer: String(res.correctAnswer),
        hints: res.hints || [],
        hintsBn: language === 'bn' ? res.hints || [] : undefined,
        solution: res.solution || '',
        solutionBn: language === 'bn' ? res.solution || '' : undefined,
        keyInsight: res.keyInsight || '',
        keyInsightBn: language === 'bn' ? res.keyInsight || '' : undefined,
        source: 'ai_generated',
        minGradeLevel: targetDiv.minGrade,
        maxGradeLevel: targetDiv.maxGrade,
        minAge: targetDiv.minAge,
        maxAge: targetDiv.maxAge,
        gradeBand: targetDiv.labelEn,
        gradeBandBn: targetDiv.labelBn,
        ageBand: targetDiv.ageEn,
        ageBandBn: targetDiv.ageBn,
      };
      setProblems((prev) => [newProb, ...prev]);
      selectProblem(newProb);
      showToast(
        language === 'bn'
          ? `${targetDiv.labelBn} (${targetDiv.ageBn}) উপযোগী নতুন এআই অলিম্পিয়াড সমস্যা তৈরি হয়েছে!`
          : `New AI-Generated Olympiad problem created for ${targetDiv.labelEn} (${targetDiv.ageEn})!`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'সমস্যা তৈরি করা যায়নি।'
          : 'Problem generation failed.';
      showToast(msg, 'error');
    } finally {
      setGeneratingProblem(false);
    }
  };

  const solvedCount = solvedProblemIds.size;
  const bestReasoning = olympiadAttempts.reduce((max, a) => Math.max(max, a.reasoningScore || 0), 0);
  const visibleDeck = shuffledFilteredProblems.slice(0, visibleCount);
  const remainingDeck = Math.max(0, shuffledFilteredProblems.length - visibleDeck.length);

  return (
    <div className="space-y-6">
      {/* Arena Banner */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border glass-panel-3d student-hero-gradient p-6 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-400/50 shrink-0 bg-slate-900 shadow-lg">
            {!imgErr ? (
              <img
                src={OLYMPIAD_EMBLEM}
                alt={
                  language === 'bn'
                    ? 'জ্যামিতিক স্ফটিক গণিত অলিম্পিয়াড প্রতীক'
                    : 'Geometric crystal icosahedron Olympiad emblem'
                }
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
              {language === 'bn'
                ? `গণিত অলিম্পিয়াড এরিনা · ${
                    activeDivisionMeta
                      ? `${activeDivisionMeta.labelBn} (${activeDivisionMeta.ageBn})`
                      : 'সকল শ্রেণি ও বয়স'
                  }`
                : `Math Olympiad Arena · ${
                    activeDivisionMeta
                      ? `${activeDivisionMeta.labelEn} (${activeDivisionMeta.ageEn})`
                      : 'All Grades & Ages'
                  }`}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              {language === 'bn'
                ? 'শ্রেণি ও বয়সভিত্তিক ডায়নামিক অলিম্পিয়াড স্টুডিও'
                : 'Grade & Age-Adaptive Dynamic Olympiad Studio'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {language === 'bn'
                ? `${toBnNum(problems.length)}টি বাছাইকৃত গুরুত্বপূর্ণ অলিম্পিয়াড সমস্যা · র‍্যান্ডম ডেক, ধাপে ধাপে ইঙ্গিত ও যুক্তি মূল্যায়ন।`
                : `${problems.length.toLocaleString()} curated competition problems · auto-randomized by grade and age with progressive hints & proof grading.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono">
          <div className="px-3.5 py-2 rounded-xl bg-indigo-500/12 border border-indigo-500/30 text-right">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'সক্রিয় ডেক' : 'Active Deck'}
            </div>
            <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              {language === 'bn'
                ? toBnNum(shuffledFilteredProblems.length)
                : shuffledFilteredProblems.length}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-right">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'সমাধানকৃত' : 'Solved'}
            </div>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {language === 'bn' ? toBnNum(solvedCount) : solvedCount}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/12 border border-amber-500/30 text-right">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'সেরা যুক্তি' : 'Best Proof'}
            </div>
            <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {language === 'bn' ? `${toBnNum(bestReasoning)}/১০০` : `${bestReasoning}/100`}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dynamic Grade & Age Division Switcher */}
      <div className="rounded-2xl border glass-panel-3d p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <GraduationCap className="w-4 h-4 text-cyan-500" />
            <span>
              {language === 'bn'
                ? 'শ্রেণি ও বয়সভিত্তিক অলিম্পিয়াড ডিভিশন:'
                : 'Grade & Age Olympiad Division:'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShuffleDeck}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold glass-btn-3d whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {language === 'bn' ? 'র্যান্ডম শাফেল' : 'Shuffle Deck'}
            </button>

            <button
              type="button"
              onClick={handleNextRandomProblem}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold glass-btn-amber whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              {language === 'bn' ? 'র‍্যান্ডম চ্যালেঞ্জ' : 'Random Problem'}
            </button>

            <button
              type="button"
              onClick={generateOriginalProblem}
              disabled={generatingProblem}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold glass-btn-violet disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generatingProblem
                ? language === 'bn'
                  ? 'তৈরি হচ্ছে...'
                  : 'Composing...'
                : language === 'bn'
                ? 'নতুন এআই চ্যালেঞ্জ'
                : 'AI Original Challenge'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDivisionFilter('matched')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              divisionFilter === 'matched'
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {language === 'bn'
              ? `আমার শ্রেণি ও বয়স (${studentDivision.shortBn} · ${studentDivision.ageBn})`
              : `My Grade & Age (${studentDivision.shortEn} · ${studentDivision.ageEn})`}
          </button>

          {DIVISIONS.map((div) => (
            <button
              key={div.key}
              type="button"
              onClick={() => setDivisionFilter(div.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                divisionFilter === div.key
                  ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {language === 'bn'
                ? `${div.shortBn} (${div.ageBn})`
                : `${div.shortEn} (${div.ageEn})`}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setDivisionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              divisionFilter === 'all'
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {language === 'bn'
              ? `সবগুলো (${toBnNum(problems.length)})`
              : `All (${problems.length})`}
          </button>
        </div>

        {/* Category + Difficulty + Unsolved Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {language === 'bn' ? CAT_BN[cat] || cat : cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={language === 'bn' ? 'কঠিনতার স্তর' : 'Difficulty Tier'}
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1425] text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {DIFFICULTIES.map((diff) => (
                <option key={diff} value={diff}>
                  {language === 'bn' ? DIFF_BN[diff] || diff : diff}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setUnsolvedOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                unsolvedOnly
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'bn' ? 'শুধু অসমাধানকৃত' : 'Unsolved Only'}
            </button>
          </div>
        </div>
      </div>

      {/* Problem Deck & Active Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
          {visibleDeck.length === 0 ? (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 glass-tile-3d text-center space-y-2">
              <Layers className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {language === 'bn'
                  ? 'এই ফিল্টারে কোনো সমস্যা পাওয়া যায়নি। অন্য শ্রেণি বা বিষয় বেছে নিন।'
                  : 'No Olympiad problems match this exact filter combination.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All');
                  setDifficultyFilter('All');
                  setUnsolvedOnly(false);
                }}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 underline"
              >
                {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            <>
              {visibleDeck.map((p) => {
                const isSolved = solvedProblemIds.has(p.id);
                const isActive = selectedProblem?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProblem(p)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-200 dark:border-slate-800 glass-tile-3d hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="truncate">
                        {language === 'bn' ? CAT_BN[p.category] || p.category : p.category} ·{' '}
                        {language === 'bn' ? DIFF_BN[p.difficulty] || p.difficulty : p.difficulty}
                      </span>
                      {isSolved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : p.isQuestionOfTheDay ? (
                        <span className="text-amber-500 font-semibold shrink-0">
                          {language === 'bn' ? 'দৈনিক' : 'Daily'}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {language === 'bn' && p.titleBn ? p.titleBn : p.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>
                        {language === 'bn'
                          ? p.gradeBandBn || 'সকল শ্রেণি'
                          : p.gradeBand || 'All Grades'}
                      </span>
                      <span>·</span>
                      <span>
                        {language === 'bn' ? p.ageBandBn || '' : p.ageBand || ''}
                      </span>
                      {p.source === 'ai_generated' && (
                        <>
                          <span>·</span>
                          <span className="text-indigo-500 font-semibold">
                            {language === 'bn' ? 'এআই-তৈরি' : 'AI Challenge'}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}

              {remainingDeck > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + DECK_PAGE_SIZE)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/5 transition-colors tabular-nums"
                >
                  {language === 'bn'
                    ? `আরও ${toBnNum(Math.min(DECK_PAGE_SIZE, remainingDeck))}টি দেখুন (বাকি ${toBnNum(
                        remainingDeck
                      )}টি)`
                    : `Show ${Math.min(DECK_PAGE_SIZE, remainingDeck)} More (${remainingDeck} remaining)`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Active Problem Solver Workspace */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl border glass-panel-3d space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold flex flex-wrap items-center gap-1.5">
                <span>
                  {language === 'bn'
                    ? CAT_BN[selectedProblem.category] || selectedProblem.category
                    : selectedProblem.category}
                </span>
                <span>·</span>
                <span>
                  {language === 'bn'
                    ? DIFF_BN[selectedProblem.difficulty] || selectedProblem.difficulty
                    : selectedProblem.difficulty}
                </span>
                {(selectedProblem.gradeBand || selectedProblem.gradeBandBn) && (
                  <>
                    <span>·</span>
                    <span>
                      {language === 'bn'
                        ? `${selectedProblem.gradeBandBn || selectedProblem.gradeBand} (${
                            selectedProblem.ageBandBn || selectedProblem.ageBand || ''
                          })`
                        : `${selectedProblem.gradeBand} (${selectedProblem.ageBand || ''})`}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {language === 'bn' && selectedProblem.titleBn
                  ? selectedProblem.titleBn
                  : selectedProblem.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNextRandomProblem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold whitespace-nowrap"
              >
                <Shuffle className="w-3.5 h-3.5" />
                {language === 'bn' ? 'পরবর্তী র্যান্ডম সমস্যা' : 'Next Random'}
              </button>

              <button
                type="button"
                onClick={() => setTimedMode((t) => !t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono tabular-nums whitespace-nowrap ${
                  timedMode
                    ? 'border-violet-500/50 bg-violet-500/12 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                {timedMode
                  ? language === 'bn'
                    ? `${toBnNum(Math.floor(secondsElapsed / 60))}:${toBnNum(String(secondsElapsed % 60).padStart(2, '0'))}`
                    : `${Math.floor(secondsElapsed / 60)}:${String(secondsElapsed % 60).padStart(2, '0')}`
                  : language === 'bn'
                  ? 'টাইমার'
                  : 'Timer'}
              </button>
            </div>
          </div>

          <div className="text-base text-slate-900 dark:text-slate-100 leading-relaxed">
            <MathRenderer
              content={
                language === 'bn' && selectedProblem.promptBn
                  ? selectedProblem.promptBn
                  : selectedProblem.prompt
              }
            />
          </div>

          {/* Progressive Hints */}
          {revealedHints.length > 0 && (
            <div className="space-y-2">
              {revealedHints.map((h, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-slate-700 dark:text-slate-200"
                >
                  <strong className="text-amber-600 dark:text-amber-400">
                    {language === 'bn' ? `ইঙ্গিত ${toBnNum(idx + 1)}:` : `Hint ${idx + 1}:`}
                  </strong>{' '}
                  <MathRenderer content={h} />
                </div>
              ))}
            </div>
          )}
          {aiCoachHint && (
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-xs text-slate-700 dark:text-slate-200">
              <strong className="text-cyan-600 dark:text-cyan-400">
                {language === 'bn' ? 'এআই কোচ সূত্র:' : 'AI Coach Clue:'}
              </strong>{' '}
              <MathRenderer content={aiCoachHint} />
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {language === 'bn' ? 'চূড়ান্ত উত্তর' : 'Final Answer'}
              </label>
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'সঠিক সংখ্যা বা ভগ্নাংশ লিখুন (যেমন: 36/7 অথবা ৩৬/৭)...'
                    : 'Enter exact integer, fraction (e.g., 36/7), or choice...'
                }
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {language === 'bn'
                  ? 'আপনার গাণিতিক যুক্তি বা সমাধানের কৌশল লিখুন'
                  : 'Your Mathematical Reasoning / Proof Approach (Evaluated for Reasoning Quality)'}
              </label>
              <textarea
                rows={4}
                value={reasoningText}
                onChange={(e) => setReasoningText(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'আপনি কীভাবে উত্তরটি বের করলেন তা ধাপে ধাপে লিখুন...'
                    : 'Explain your strategy, invariants, modular cycles, or geometric similarity steps...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={revealNextHint}
                disabled={loadingCoach}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-amber-500/60"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                {language === 'bn'
                  ? `ধাপে ধাপে ইঙ্গিত (${toBnNum(revealedHints.length)}/৩)`
                  : `Progressive Hint (${revealedHints.length}/3)`}
              </button>

              <button
                type="button"
                onClick={submitSolution}
                disabled={loadingCoach}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-xs font-semibold glass-btn-3d disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                {loadingCoach
                  ? language === 'bn'
                    ? 'মূল্যায়ন করা হচ্ছে...'
                    : 'Evaluating Proof...'
                  : language === 'bn'
                  ? 'উত্তর ও যুক্তি জমা দিন'
                  : 'Submit Answer & Proof'}
              </button>
            </div>
          </div>

          {evaluationResult && (
            <div className="mt-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-sm font-bold flex items-center gap-1.5 ${
                    evaluationResult.isCorrect ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {evaluationResult.isCorrect
                    ? language === 'bn'
                      ? 'সঠিক উত্তর!'
                      : 'Verified Correct Answer'
                    : `${language === 'bn' ? 'প্রত্যাশিত উত্তর:' : 'Expected Answer:'} ${
                        language === 'bn' && selectedProblem.correctAnswerBn
                          ? selectedProblem.correctAnswerBn
                          : selectedProblem.correctAnswer
                      }`}
                </span>
                <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                  {language === 'bn'
                    ? `যুক্তি স্কোর: ${toBnNum(evaluationResult.reasoningScore)}/১০০`
                    : `Reasoning Quality: ${evaluationResult.reasoningScore}/100`}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <MathRenderer content={evaluationResult.approachFeedback} />
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <strong>{language === 'bn' ? 'পূর্ণাঙ্গ সমাধান:' : 'Full Verified Solution:'}</strong>{' '}
                <MathRenderer
                  content={
                    language === 'bn' && selectedProblem.solutionBn
                      ? selectedProblem.solutionBn
                      : selectedProblem.solution
                  }
                />
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextRandomProblem}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'পরবর্তী র্যান্ডম সমস্যা সমাধান করুন' : 'Solve Next Random Problem'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
