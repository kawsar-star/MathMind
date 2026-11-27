import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDomainsForStudent } from '../../data/domainsAndCurriculum';
import {
  getAgeBandLabel,
  getCurriculumLabel,
  getDomainLabel,
  getGradeLabel,
  getTierLabel,
  toBnNum,
} from '../../i18n/translations';
import {
  AIDiagnosisReport,
  MathQuestion,
  QuestionResponseRecord,
} from '../../types/mathmind';
import {
  checkAnswerDeterministic,
  computeAssessmentMetrics,
  getLocalizedQuestion,
  getQuestionDifficultyTier,
  parseGradeLevel,
  selectNextAdaptiveQuestion,
} from '../../utils/mathUtils';
import {
  createNotification,
  recordLearningActivity,
  saveAssessmentRecord,
  saveRemedialPlan,
  writeAuditLog,
} from '../../services/firestoreService';
import {
  AiBackendUnavailableError,
  requestAssessmentDiagnosis,
  requestRemedialPlan,
} from '../../services/aiService';
import { MathRenderer } from '../common/MathRenderer';
import { QuestionVisualDiagram } from '../common/QuestionVisualDiagram';
import { useToast } from '../common/ToastContext';

interface AdaptiveAssessmentProps {
  onAssessmentCompleted: (assessmentId: string) => void;
}

interface SavedAssessmentSession {
  mode: 'comprehensive' | 'domain_focused' | 'diagnostic_recheck';
  targetCount: number;
  selectedDomains: string[];
  difficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  askedIds: string[];
  askedSubskills: string[];
  missedSubskills: string[];
  domainCounts: Record<string, number>;
  domainAccuracy: Record<string, { right: number; total: number }>;
  responses: QuestionResponseRecord[];
  elapsedSec: number;
  currentQuestionId: string;
  savedAt: number;
}

type AdaptationCue = {
  direction: 'up' | 'down' | 'probe' | 'steady';
  labelEn: string;
  labelBn: string;
};

function getSessionStorageKey(uid: string): string {
  return `mathmind_cat_session_${uid}`;
}

export const AdaptiveAssessmentEngine: React.FC<AdaptiveAssessmentProps> = ({
  onAssessmentCompleted,
}) => {
  const {
    firebaseUser,
    userAccount,
    studentProfile,
    assessments,
    allQuestions,
    language,
    studyMedium,
  } = useAuth();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const isBn = language === 'bn';

  const studentGradeLevel = parseGradeLevel(studentProfile?.grade);
  const { primaryDomains, allDomains, stageLabel, stageLabelBn } = getDomainsForStudent(
    studentProfile?.age ?? 11,
    studentProfile?.grade
  );

  const [phase, setPhase] = useState<'setup' | 'running' | 'analyzing'>('setup');
  const [mode, setMode] = useState<'comprehensive' | 'domain_focused' | 'diagnostic_recheck'>('comprehensive');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(
    primaryDomains.map((d) => d.id)
  );
  const [targetCount, setTargetCount] = useState<number>(100);
  const [quickAdvance, setQuickAdvance] = useState<boolean>(true);
  const [savedSession, setSavedSession] = useState<SavedAssessmentSession | null>(null);

  // Live Smart CAT state
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [askedSubskills, setAskedSubskills] = useState<Set<string>>(new Set());
  const [missedSubskills, setMissedSubskills] = useState<Set<string>>(new Set());
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [domainAccuracy, setDomainAccuracy] = useState<
    Record<string, { right: number; total: number }>
  >({});
  const [difficulty, setDifficulty] = useState<number>(studentGradeLevel <= 2 ? 1 : 2);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [responses, setResponses] = useState<QuestionResponseRecord[]>([]);
  const [answerInput, setAnswerInput] = useState('');
  const [reasoningNote, setReasoningNote] = useState('');
  const [questionStartMs, setQuestionStartMs] = useState<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [adaptationCue, setAdaptationCue] = useState<AdaptationCue>({
    direction: 'steady',
    labelEn: 'Calibrating to your age & grade baseline',
    labelBn: 'বয়স ও শ্রেণি অনুযায়ী প্রাথমিক স্তর যাচাই চলছে',
  });

  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedDomains(primaryDomains.map((d) => d.id));
  }, [studentProfile?.grade, studentProfile?.age]);

  // Load any saved in-progress 100-MCQ session from localStorage
  useEffect(() => {
    if (!firebaseUser) {
      setSavedSession(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getSessionStorageKey(firebaseUser.uid));
      if (!raw) {
        setSavedSession(null);
        return;
      }
      const parsed = JSON.parse(raw) as SavedAssessmentSession;
      if (
        parsed &&
        Array.isArray(parsed.responses) &&
        parsed.responses.length > 0 &&
        parsed.responses.length < parsed.targetCount
      ) {
        setSavedSession(parsed);
      } else {
        setSavedSession(null);
      }
    } catch {
      setSavedSession(null);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, paused]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const persistProgress = useCallback(
    (payload: SavedAssessmentSession) => {
      if (!firebaseUser) return;
      try {
        window.localStorage.setItem(
          getSessionStorageKey(firebaseUser.uid),
          JSON.stringify(payload)
        );
        setSavedSession(payload);
      } catch {
        // Ignore storage quota errors
      }
    },
    [firebaseUser]
  );

  const clearSavedProgress = useCallback(() => {
    if (!firebaseUser) return;
    try {
      window.localStorage.removeItem(getSessionStorageKey(firebaseUser.uid));
    } catch {
      // Ignore
    }
    setSavedSession(null);
  }, [firebaseUser]);

  const activeTargetDomains = useMemo(
    () => (mode === 'comprehensive' ? primaryDomains.map((d) => d.id) : selectedDomains),
    [mode, primaryDomains, selectedDomains]
  );

  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const startAssessment = () => {
    const startDiff = studentGradeLevel <= 2 ? 1 : studentGradeLevel >= 7 ? 3 : 2;
    const initialSet = new Set<string>();
    const initialSubskills = new Set<string>();
    const initialMissed = new Set<string>();
    const initialCounts: Record<string, number> = {};
    const initialAcc: Record<string, { right: number; total: number }> = {};
    const domainsToUse =
      mode === 'comprehensive' ? primaryDomains.map((d) => d.id) : selectedDomains;

    const first = selectNextAdaptiveQuestion(
      allQuestions,
      initialSet,
      startDiff,
      domainsToUse,
      initialCounts,
      studentGradeLevel,
      {
        mcqOnly: true,
        askedSubskills: initialSubskills,
        missedSubskills: initialMissed,
        domainAccuracy: initialAcc,
      }
    );
    if (!first) {
      showToast(
        isBn
          ? 'নির্বাচিত অধ্যায়গুলোতে অনুমোদিত MCQ প্রশ্ন পাওয়া যায়নি।'
          : 'No approved MCQ questions match the selected domains.',
        'error'
      );
      return;
    }

    clearSavedProgress();
    setDifficulty(startDiff);
    setAskedIds(initialSet);
    setAskedSubskills(initialSubskills);
    setMissedSubskills(initialMissed);
    setDomainCounts(initialCounts);
    setDomainAccuracy(initialAcc);
    setResponses([]);
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setCurrentQuestion(first);
    setAnswerInput('');
    setReasoningNote('');
    setElapsedSec(0);
    setPaused(false);
    setIsTransitioning(false);
    setAdaptationCue({
      direction: 'steady',
      labelEn: `Calibrated start at Level ${startDiff}/5 across ${domainsToUse.length} domains`,
      labelBn: `${toBnNum(domainsToUse.length)}টি অধ্যায়ে স্তর ${toBnNum(startDiff)}/৫ থেকে শুরু হয়েছে`,
    });
    setQuestionStartMs(Date.now());
    setPhase('running');
  };

  const resumeSavedAssessment = () => {
    if (!savedSession) return;
    const restoredAsked = new Set(savedSession.askedIds);
    const restoredSub = new Set(savedSession.askedSubskills);
    const restoredMissed = new Set(savedSession.missedSubskills);
    const foundQ =
      allQuestions.find((q) => q.id === savedSession.currentQuestionId) ||
      selectNextAdaptiveQuestion(
        allQuestions,
        restoredAsked,
        savedSession.difficulty,
        savedSession.selectedDomains,
        savedSession.domainCounts,
        studentGradeLevel,
        {
          mcqOnly: true,
          askedSubskills: restoredSub,
          missedSubskills: restoredMissed,
          domainAccuracy: savedSession.domainAccuracy,
        }
      );

    if (!foundQ) {
      clearSavedProgress();
      startAssessment();
      return;
    }

    setMode(savedSession.mode);
    setTargetCount(savedSession.targetCount);
    setSelectedDomains(savedSession.selectedDomains);
    setDifficulty(savedSession.difficulty);
    setConsecutiveCorrect(savedSession.consecutiveCorrect);
    setConsecutiveWrong(savedSession.consecutiveWrong);
    setAskedIds(restoredAsked);
    setAskedSubskills(restoredSub);
    setMissedSubskills(restoredMissed);
    setDomainCounts(savedSession.domainCounts);
    setDomainAccuracy(savedSession.domainAccuracy);
    setResponses(savedSession.responses);
    setElapsedSec(savedSession.elapsedSec);
    setCurrentQuestion(foundQ);
    setAnswerInput('');
    setReasoningNote('');
    setPaused(false);
    setIsTransitioning(false);
    setAdaptationCue({
      direction: 'probe',
      labelEn: `Resumed at Question ${savedSession.responses.length + 1} of ${savedSession.targetCount}`,
      labelBn: `${toBnNum(savedSession.targetCount)}টির মধ্যে ${toBnNum(savedSession.responses.length + 1)} নং প্রশ্ন থেকে পুনরায় শুরু হয়েছে`,
    });
    setQuestionStartMs(Date.now());
    setPhase('running');
  };

  const finishAndDiagnose = async (finalResponses: QuestionResponseRecord[]) => {
    if (!firebaseUser) return;
    clearSavedProgress();
    setPhase('analyzing');

    const metrics = computeAssessmentMetrics(finalResponses);
    let aiDiagnosis: AIDiagnosisReport | undefined;

    try {
      aiDiagnosis = await requestAssessmentDiagnosis({
        age: studentProfile?.age || 12,
        grade: studentProfile?.grade || 'Grade 6',
        curriculum: studentProfile?.curriculum || 'NCTB Bangladesh',
        language,
        domainScores: metrics.domainScores,
        responses: finalResponses,
      });
    } catch (err) {
      if (!(err instanceof AiBackendUnavailableError)) {
        console.warn('AI diagnosis fallback (saving deterministic metrics):', err);
        showToast(
          isBn
            ? 'ডোমেইন স্কোর সংরক্ষিত হয়েছে; এআই বিশ্লেষণে সাময়িক বিলম্ব হয়েছে।'
            : 'Saved deterministic domain scores; AI diagnostic enrichment encountered a temporary error.',
          'info'
        );
      }
    }

    try {
      const asmtId = await saveAssessmentRecord(firebaseUser.uid, {
        studentName:
          studentProfile?.name ||
          userAccount?.displayName ||
          (isBn ? 'শিক্ষার্থী' : 'Student'),
        ageBand: studentProfile?.ageBand || '11–12 years',
        grade: studentProfile?.grade || 'Grade 6',
        curriculum: studentProfile?.curriculum || 'NCTB Bangladesh',
        mode,
        status: 'completed',
        overallScore: metrics.overallScore,
        competencyCategory: metrics.competencyCategory,
        accuracyPercent: metrics.accuracyPercent,
        totalQuestions: finalResponses.length,
        averageTimeSec: metrics.averageTimeSec,
        domainScores: metrics.domainScores,
        responses: finalResponses,
        ...(aiDiagnosis ? { aiDiagnosis } : {}),
      });

      const weakDomains: string[] = metrics.domainScores
        .filter((d) => d.score < 70)
        .sort((a, b) => a.score - b.score)
        .map((d) => d.domain);

      try {
        const planData = await requestRemedialPlan({
          age: studentProfile?.age || 12,
          grade: studentProfile?.grade || 'Grade 6',
          overallScore: metrics.overallScore,
          domainScores: metrics.domainScores,
          weakDomains: weakDomains.length
            ? weakDomains
            : [metrics.domainScores[0]?.domain || 'Number Operations'],
          language,
        });

        await saveRemedialPlan(firebaseUser.uid, {
          assessmentId: asmtId,
          interventionLevel:
            (planData.interventionLevel as any) ||
            (metrics.overallScore < 55
              ? 'Level A: Foundational Support'
              : metrics.overallScore < 80
              ? 'Level B: Conceptual Reinforcement'
              : 'Level C: Advanced Development'),
          overallProgress: 0,
          objectives: (planData.objectives || []).map((obj: any, idx: number) => ({
            ...obj,
            id: obj.id || `obj_${idx + 1}`,
            order: obj.order || idx + 1,
            status: idx === 0 ? 'current' : 'upcoming',
          })),
        });
      } catch (planErr) {
        if (planErr instanceof AiBackendUnavailableError) {
          const priorityDomains = (
            weakDomains.length ? weakDomains : metrics.domainScores.map((d) => d.domain)
          ).slice(0, 4);
          const fallbackDomains = priorityDomains.length
            ? priorityDomains
            : [primaryDomains[0]?.id || 'Number Sense'];

          const pickLabTool = (dom: string) => {
            if (dom.includes('Fraction')) return 'fraction-lab';
            if (dom.includes('Algebra')) return 'algebra-balance';
            if (dom.includes('Geometry') || dom.includes('Measurement')) return 'geometry-board';
            if (dom.includes('Coordinate')) return 'coordinate-plane';
            if (dom.includes('Probability') || dom.includes('Data')) return 'probability-sim';
            return 'number-line';
          };

          const level =
            metrics.overallScore < 55
              ? ('Level A: Foundational Support' as const)
              : metrics.overallScore < 80
              ? ('Level B: Conceptual Reinforcement' as const)
              : ('Level C: Advanced Development' as const);

          await saveRemedialPlan(firebaseUser.uid, {
            assessmentId: asmtId,
            interventionLevel: level,
            overallProgress: 0,
            objectives: fallbackDomains.map((dom, idx) => ({
              id: `obj_${idx + 1}`,
              order: idx + 1,
              domain: dom,
              subskill: 'Core Foundations',
              title:
                language === 'bn'
                  ? `${getDomainLabel(dom, 'bn')} — ধাপে ধাপে অনুশীলন`
                  : `${dom} — Step-by-Step Reinforcement`,
              prerequisite:
                language === 'bn' ? 'প্রাথমিক সংখ্যা ও ধারণা' : 'Foundational Number Concepts',
              level,
              explanation:
                language === 'bn'
                  ? 'মূল্যায়নের ফলাফলের ওপর ভিত্তি করে এই ডোমেইনের মূল ধারণা ও সহজ থেকে মাঝারি প্রশ্ন অনুশীলন করুন।'
                  : 'Strengthen core understanding in this domain using guided examples and interactive lab models.',
              everydayExample:
                language === 'bn'
                  ? 'দৈনন্দিন হিসাব ও বাজারের সহজ সমস্যা সমাধান।'
                  : 'Everyday counting, sharing, and measurement scenarios.',
              workedExample:
                language === 'bn'
                  ? 'সহজ ধাপ অনুসরণ করে প্রথম উদাহরণটি যাচাই করুন এবং ম্যাথ ল্যাবে চেষ্টা করুন।'
                  : 'Break the problem into smaller steps and verify your answer visually in the Math Lab.',
              recommendedLabTool: pickLabTool(dom),
              targetMasteryPercent: 80,
              estimatedMinutes: 15,
              status: idx === 0 ? 'current' : 'upcoming',
            })),
          });
        } else {
          console.warn('Remedial plan generation deferred:', planErr);
        }
      }

      const xpGain = Math.min(2500, finalResponses.length * 10 + Math.round(metrics.overallScore));
      const streakRes = await recordLearningActivity({
        uid: firebaseUser.uid,
        fallbackAccount: userAccount,
        hasStudentProfile: Boolean(studentProfile),
        xpGain,
        activityLabel: isBn ? '১০০-MCQ স্মার্ট মূল্যায়ন' : '100-MCQ Smart Assessment',
        language,
      });

      await createNotification(firebaseUser.uid, {
        title: isBn ? '১০০ নম্বরের স্মার্ট টেস্ট সম্পন্ন' : '100-Mark Smart MCQ Assessment Completed',
        message: isBn
          ? `${toBnNum(finalResponses.length)}টি MCQ প্রশ্নে প্রাপ্ত নম্বর ${toBnNum(metrics.accuracyPercent)}/১০০ (${getTierLabel(metrics.competencyCategory, 'bn')})। আপনার দুর্বলতা ও অনুশীলন গাইড প্রস্তুত।`
          : `Scored ${metrics.accuracyPercent}/100 (${metrics.competencyCategory}) across ${finalResponses.length} smart MCQs. Your Weakness & Practice Guide is ready.`,
        category: 'assessment',
        read: false,
      });

      await writeAuditLog(
        firebaseUser.uid,
        'COMPLETE_ADAPTIVE_ASSESSMENT',
        'assessment',
        `Score ${metrics.overallScore}%, ${metrics.accuracyPercent}/100 marks across ${finalResponses.length} MCQs`,
        asmtId
      );

      showToast(
        streakRes.notificationTitle
          ? isBn
            ? `ফলাফল সংরক্ষিত! +${toBnNum(xpGain)} XP · ${streakRes.notificationTitle}`
            : `Assessment saved! +${xpGain} XP · ${streakRes.notificationTitle}`
          : isBn
          ? `ফলাফল সংরক্ষিত! +${toBnNum(xpGain)} XP অর্জিত।`
          : `Assessment saved! +${xpGain} XP earned.`,
        'success'
      );
      onAssessmentCompleted(asmtId);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isBn
          ? 'মূল্যায়ন সংরক্ষণ করা যায়নি।'
          : 'Failed to save assessment.';
      showToast(msg, 'error');
      setPhase('setup');
    }
  };

  const submitAnswer = useCallback(
    async (explicitAnswer?: string) => {
      if (!currentQuestion || isTransitioning) return;
      const chosen = (explicitAnswer ?? answerInput).trim();
      if (!chosen) {
        showToast(
          isBn ? 'এগিয়ে যাওয়ার আগে একটি উত্তর নির্বাচন করুন।' : 'Please select an answer before continuing.',
          'info'
        );
        return;
      }

      const timeSpentSec = Math.max(1, Math.round((Date.now() - questionStartMs) / 1000));
      const isCorrect = checkAnswerDeterministic(
        chosen,
        currentQuestion.correctAnswer,
        currentQuestion.correctAnswerBn
      );

      const record: QuestionResponseRecord = {
        questionId: currentQuestion.id,
        domain: currentQuestion.domain,
        subskill: currentQuestion.subskill,
        difficulty: currentQuestion.difficulty,
        prompt: currentQuestion.prompt,
        correctAnswer: currentQuestion.correctAnswer,
        studentAnswer: chosen,
        isCorrect,
        timeSpentSec,
        ...(reasoningNote.trim() ? { reasoningNote: reasoningNote.trim().slice(0, 400) } : {}),
      };

      const nextResponses = [...responses, record];
      const nextAsked = new Set(askedIds);
      nextAsked.add(currentQuestion.id);

      const subKey = `${currentQuestion.domain}::${currentQuestion.subskill}`;
      const nextAskedSubskills = new Set(askedSubskills);
      nextAskedSubskills.add(subKey);

      const nextMissedSubskills = new Set(missedSubskills);
      if (!isCorrect) {
        nextMissedSubskills.add(subKey);
      } else {
        nextMissedSubskills.delete(subKey);
      }

      const nextCounts = {
        ...domainCounts,
        [currentQuestion.domain]: (domainCounts[currentQuestion.domain] || 0) + 1,
      };

      const prevDomStats = domainAccuracy[currentQuestion.domain] || { right: 0, total: 0 };
      const nextDomainAccuracy = {
        ...domainAccuracy,
        [currentQuestion.domain]: {
          right: prevDomStats.right + (isCorrect ? 1 : 0),
          total: prevDomStats.total + 1,
        },
      };

      // Smart CAT Difficulty & Probing Adaptation Logic
      let nextDiff = difficulty;
      let nextStreakRight = isCorrect ? consecutiveCorrect + 1 : 0;
      let nextStreakWrong = !isCorrect ? consecutiveWrong + 1 : 0;
      let nextCue: AdaptationCue = {
        direction: 'steady',
        labelEn: `Balanced scan · ${getDomainLabel(currentQuestion.domain, 'en')}`,
        labelBn: `স্বাভাবিক গতি · ${getDomainLabel(currentQuestion.domain, 'bn')} যাচাই চলছে`,
      };

      // Fast confident streak steps up; struggle steps down immediately at 2 wrong (or 1 wrong if slow at high tier)
      if (nextStreakRight >= 2 && difficulty < 5) {
        nextDiff = difficulty + 1;
        nextStreakRight = 0;
        nextCue = {
          direction: 'up',
          labelEn: `Strong streak — stepping up to Level ${nextDiff}/5`,
          labelBn: `চমৎকার ধারাবাহিকতা — কঠিনতর স্তর ${toBnNum(nextDiff)}/৫-এ উন্নীত`,
        };
      } else if (
        (nextStreakWrong >= 2 || (!isCorrect && difficulty >= 4 && timeSpentSec >= 35)) &&
        difficulty > 1
      ) {
        nextDiff = difficulty - 1;
        nextStreakWrong = 0;
        nextCue = {
          direction: 'down',
          labelEn: `Adjusting to Level ${nextDiff}/5 to verify foundations`,
          labelBn: `ভিত্তি মজবুত করতে স্তর ${toBnNum(nextDiff)}/৫-এ সমন্বয় করা হচ্ছে`,
        };
      } else if (!isCorrect) {
        nextCue = {
          direction: 'probe',
          labelEn: `Noted subskill gap in ${currentQuestion.subskill} — probing further`,
          labelBn: `'${currentQuestion.subskill}'-এ দুর্বলতা চিহ্নিত — পরের ডোমেইনে যাওয়া হচ্ছে`,
        };
      }

      setResponses(nextResponses);
      setAskedIds(nextAsked);
      setAskedSubskills(nextAskedSubskills);
      setMissedSubskills(nextMissedSubskills);
      setDomainCounts(nextCounts);
      setDomainAccuracy(nextDomainAccuracy);
      setDifficulty(nextDiff);
      setConsecutiveCorrect(nextStreakRight);
      setConsecutiveWrong(nextStreakWrong);
      setAdaptationCue(nextCue);

      // Quarter Milestone Checkpoint Feedback (for 100 or 50 MCQ runs)
      if (
        targetCount >= 40 &&
        (nextResponses.length === Math.round(targetCount * 0.25) ||
          nextResponses.length === Math.round(targetCount * 0.5) ||
          nextResponses.length === Math.round(targetCount * 0.75))
      ) {
        const pctDone = Math.round((nextResponses.length / targetCount) * 100);
        const correctNow = nextResponses.filter((r) => r.isCorrect).length;
        const accNow = Math.round((correctNow / nextResponses.length) * 100);
        showToast(
          isBn
            ? `মাইলফলক ${toBnNum(pctDone)}% (${toBnNum(nextResponses.length)}/${toBnNum(targetCount)} MCQ) সম্পন্ন! চলমান নির্ভুলতা ${toBnNum(accNow)}%`
            : `Checkpoint ${pctDone}% (${nextResponses.length}/${targetCount} MCQs)! Current accuracy ${accNow}%`,
          'info'
        );
      }

      if (nextResponses.length >= targetCount) {
        await finishAndDiagnose(nextResponses);
        return;
      }

      const domainsToUse =
        mode === 'comprehensive' ? primaryDomains.map((d) => d.id) : selectedDomains;

      const nextQ = selectNextAdaptiveQuestion(
        allQuestions,
        nextAsked,
        nextDiff,
        domainsToUse,
        nextCounts,
        studentGradeLevel,
        {
          mcqOnly: true,
          askedSubskills: nextAskedSubskills,
          missedSubskills: nextMissedSubskills,
          domainAccuracy: nextDomainAccuracy,
        }
      );

      if (!nextQ) {
        await finishAndDiagnose(nextResponses);
        return;
      }

      persistProgress({
        mode,
        targetCount,
        selectedDomains: domainsToUse,
        difficulty: nextDiff,
        consecutiveCorrect: nextStreakRight,
        consecutiveWrong: nextStreakWrong,
        askedIds: Array.from(nextAsked),
        askedSubskills: Array.from(nextAskedSubskills),
        missedSubskills: Array.from(nextMissedSubskills),
        domainCounts: nextCounts,
        domainAccuracy: nextDomainAccuracy,
        responses: nextResponses,
        elapsedSec,
        currentQuestionId: nextQ.id,
        savedAt: Date.now(),
      });

      setCurrentQuestion(nextQ);
      setAnswerInput('');
      setReasoningNote('');
      setQuestionStartMs(Date.now());
    },
    [
      allQuestions,
      answerInput,
      askedIds,
      askedSubskills,
      consecutiveCorrect,
      consecutiveWrong,
      currentQuestion,
      difficulty,
      domainAccuracy,
      domainCounts,
      elapsedSec,
      isBn,
      isTransitioning,
      missedSubskills,
      mode,
      persistProgress,
      primaryDomains,
      questionStartMs,
      reasoningNote,
      responses,
      selectedDomains,
      showToast,
      studentGradeLevel,
      targetCount,
    ]
  );

  const handleOptionSelect = useCallback(
    (optionValue: string) => {
      if (isTransitioning || paused) return;
      setAnswerInput(optionValue);
      if (quickAdvance) {
        setIsTransitioning(true);
        advanceTimerRef.current = window.setTimeout(() => {
          setIsTransitioning(false);
          void submitAnswer(optionValue);
        }, 210);
      }
    },
    [isTransitioning, paused, quickAdvance, submitAnswer]
  );

  // Keyboard shortcuts (1-4 or A-D) during running MCQ phase
  useEffect(() => {
    if (phase !== 'running' || paused || !currentQuestion) return;
    const loc = getLocalizedQuestion(currentQuestion, language, studyMedium);
    const opts = loc.options || [];
    if (opts.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toUpperCase();
      let idx = -1;
      if (['1', '2', '3', '4'].includes(key)) idx = Number(key) - 1;
      if (['A', 'B', 'C', 'D'].includes(key)) idx = key.charCodeAt(0) - 65;

      if (idx >= 0 && idx < opts.length) {
        e.preventDefault();
        handleOptionSelect(opts[idx]);
      } else if (e.key === 'Enter' && answerInput.trim() && !quickAdvance) {
        e.preventDefault();
        void submitAnswer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    answerInput,
    currentQuestion,
    handleOptionSelect,
    language,
    paused,
    phase,
    quickAdvance,
    studyMedium,
    submitAnswer,
  ]);

  if (phase === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 text-center">
        <div className="rounded-2xl border glass-panel-3d student-hero-gradient p-10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-500 flex items-center justify-center mx-auto shadow-lg">
            <Brain className="w-9 h-9 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
            {isBn
              ? `${toBnNum(responses.length)}টি MCQ বিশ্লেষণ ও দুর্বলতার গাইড তৈরি হচ্ছে`
              : `Diagnosing ${responses.length} MCQs & Building Your Practice Guide`}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isBn
              ? 'প্রতিটি অধ্যায় ও উপ-দক্ষতার ওপর ভিত্তি করে ১০০ নম্বরের ফলাফল, দুর্বলতার তালিকা ও অনুশীলন সাজেশন তৈরি করা হচ্ছে...'
              : 'Computing domain competency scores, subskill error profiles, and personalized practice recommendations...'}
          </p>
          <div className="h-2.5 w-64 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full w-3/4 colorful-progress-bar rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    const marksPerQuestion = Math.round((100 / targetCount) * 100) / 100;
    const isFirstTimeEntry = assessments.length === 0;
    const perDomainApprox = Math.max(
      1,
      Math.round(targetCount / Math.max(1, activeTargetDomains.length))
    );

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Resumable Session Banner if student paused/left mid-100-MCQ test */}
        {savedSession && (
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 glass-panel-3d p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {isBn ? 'অসমাপ্ত মূল্যায়ন টেস্ট পাওয়া গেছে' : 'In-Progress Assessment Saved'}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn
                  ? `আপনার ${toBnNum(savedSession.targetCount)}টি MCQ-এর মধ্যে ${toBnNum(savedSession.responses.length)}টি উত্তর সংরক্ষিত আছে`
                  : `${savedSession.responses.length} of ${savedSession.targetCount} MCQs already answered`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSavedProgress}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors"
              >
                {isBn ? 'মুছে নতুন শুরু' : 'Discard'}
              </button>
              <button
                type="button"
                onClick={resumeSavedAssessment}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold glass-btn-amber whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                {isBn ? 'যেখান থেকে থেমেছিলেন শুরু করুন' : 'Resume Where You Left Off'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 Entry Banner for New Students */}
        {isFirstTimeEntry && !savedSession && (
          <div className="rounded-2xl border border-cyan-500/35 student-hero-gradient glass-panel-3d p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                {isBn
                  ? 'ধাপ ২ · বয়স ও শ্রেণি অনুযায়ী ১০০টি MCQ-তে ১০০ নম্বরের স্মার্ট প্রবেশ টেস্ট'
                  : 'Step 2 · 100-MCQ Smart Age-Matched Placement Test (100 Marks)'}
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
                {isBn
                  ? `বয়স ${toBnNum(studentProfile?.age ?? 11)} বছর (${getGradeLabel(studentProfile?.grade || 'Grade 6', 'bn')}) · ${toBnNum(targetCount)}টি MCQ = ১০০ নম্বর`
                  : `Age ${studentProfile?.age ?? 11} yrs (${getGradeLabel(studentProfile?.grade || 'Grade 6', 'en')}) · ${targetCount} MCQs = 100 Marks`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {isBn
                  ? `আপনার বয়সের উপযোগী ${toBnNum(primaryDomains.length)}টি গণিত অধ্যায় থেকে স্মার্ট অ্যাডাপ্টিভ ইঞ্জিন ${toBnNum(targetCount)}টি MCQ বেছে নেবে। উত্তর দেওয়ার সাথে সাথেই প্রশ্নের মান সমন্বয় হবে এবং শেষে আপনার দুর্বলতা ও অনুশীলনের গাইড উইন্ডো তৈরি হবে।`
                  : `Our adaptive engine selects ${targetCount} age-matched MCQs across ${primaryDomains.length} math domains, adjusting difficulty dynamically as you answer and generating your Weakness & Practice Guide at the end.`}
              </p>
            </div>
            <button
              type="button"
              onClick={startAssessment}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold glass-btn-3d whitespace-nowrap shrink-0"
            >
              <Zap className="w-4 h-4" />
              {isBn ? '১০০টি MCQ টেস্ট শুরু করুন' : 'Start 100-MCQ Test'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Smart Assessment Configuration Card */}
        <div className="rounded-2xl border glass-panel-3d p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">
                {isBn
                  ? 'স্মার্ট ও ডায়নামিক ১০০ নম্বরের গণিত মূল্যায়ন (অ্যাডাপ্টিভ ইঞ্জিন)'
                  : 'Smart Dynamic 100-Mark Math Competency Scan (CAT)'}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {isBn
                  ? 'বয়স-ভিত্তিক ১০০ নম্বরের MCQ দক্ষতা টেস্ট'
                  : '100-Mark Age-Matched MCQ Assessment'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {isBn
                  ? `মোট ${toBnNum(targetCount)}টি MCQ (প্রতি প্রশ্ন ${toBnNum(marksPerQuestion)} নম্বর = ১০০ নম্বর) · প্রতিটি উত্তরের পর ডোমেইন ও কঠিনতা স্বয়ংক্রিয়ভাবে সমন্বয় হয়।`
                  : `${targetCount} MCQs (${marksPerQuestion} mark${marksPerQuestion > 1 ? 's' : ''} each = 100 Marks) · Difficulty and subskill probing adapt dynamically after every answer.`}
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
              <div className="font-semibold text-sky-700 dark:text-sky-300">
                {getGradeLabel(studentProfile?.grade || 'Grade 6', language)} ·{' '}
                {getAgeBandLabel(studentProfile?.ageBand || '11–12 years', language)}
              </div>
              <div>
                {getCurriculumLabel(studentProfile?.curriculum || 'NCTB Bangladesh', language)}
              </div>
            </div>
          </div>

          {/* Assessment Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'comprehensive',
                title: isBn
                  ? `পূর্ণাঙ্গ ১০০-MCQ ডায়াগনস্টিক (${toBnNum(primaryDomains.length)}টি অধ্যায়)`
                  : `Full 100-MCQ Age Scan (${primaryDomains.length} Domains)`,
                desc: isBn ? stageLabelBn : stageLabel,
                activeCls:
                  'border-sky-500 bg-gradient-to-br from-sky-500/15 to-cyan-500/10',
              },
              {
                id: 'domain_focused',
                title: isBn ? 'নির্দিষ্ট অধ্যায় ভিত্তিক টেস্ট' : 'Domain-Focused Check',
                desc: isBn
                  ? 'নিচ থেকে আপনার পছন্দের নির্দিষ্ট অধ্যায়গুলোতে ফোকাস করুন।'
                  : 'Focus exclusively on domains you select below.',
                activeCls:
                  'border-violet-500 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10',
              },
              {
                id: 'diagnostic_recheck',
                title: isBn ? 'পুনঃমূল্যায়ন ও অগ্রগতি যাচাই' : 'Remedial Recheck',
                desc: isBn
                  ? 'অনুশীলন করার পর দুর্বল অধ্যায়গুলোতে কতটা উন্নতি হলো দেখুন।'
                  : 'Re-measure mastery growth after targeted practice.',
                activeCls:
                  'border-emerald-500 bg-gradient-to-br from-emerald-500/15 to-teal-500/10',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  mode === m.id
                    ? m.activeCls
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {m.title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Domain Coverage Preview */}
          <div className="rounded-xl glass-tile-3d border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-500" />
                {isBn
                  ? `যে অধ্যায়গুলোর দক্ষতা পরিমাপ করা হবে (${toBnNum(activeTargetDomains.length)}টি ডোমেইন · গড়ে ~${toBnNum(perDomainApprox)}টি MCQ/ডোমেইন)`
                  : `Domains Measured (${activeTargetDomains.length} Domains · ~${perDomainApprox} MCQs/domain)`}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {isBn
                  ? 'ক্লিক করলেই পরের MCQ আসবে (দ্রুত মোড)'
                  : 'Auto-save & Quick-Click MCQ mode enabled'}
              </span>
            </div>

            {mode !== 'comprehensive' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {allDomains.map((d) => {
                  const active = selectedDomains.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDomain(d.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-colors ${
                        active
                          ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300'
                          : d.recommendedForAge
                          ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          : 'border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isBn ? d.displayNameBn : d.displayName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {primaryDomains.map((d, dIdx) => {
                  const chipAccents = [
                    'border-sky-400/35 bg-sky-500/8 text-sky-700 dark:text-sky-300',
                    'border-violet-400/35 bg-violet-500/8 text-violet-700 dark:text-violet-300',
                    'border-emerald-400/35 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
                    'border-amber-400/35 bg-amber-500/8 text-amber-700 dark:text-amber-300',
                  ];
                  const cls = chipAccents[dIdx % chipAccents.length];
                  return (
                    <div
                      key={d.id}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${cls}`}
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {isBn ? d.displayNameBn : d.displayName}
                      </span>
                      <span className="font-mono text-[11px] font-bold tabular-nums shrink-0">
                        ~{isBn ? toBnNum(perDomainApprox) : perDomainApprox}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-violet-500 shrink-0" />
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {isBn ? 'MCQ প্রশ্নের সংখ্যা:' : 'MCQ Count:'}
              </label>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
              >
                <option value={100}>
                  {isBn
                    ? '১০০টি MCQ · প্রতি প্রশ্ন ১ নম্বর = ১০০ নম্বর (প্রস্তাবিত)'
                    : '100 MCQs · 1 Mark each = 100 Marks (Recommended)'}
                </option>
                <option value={50}>
                  {isBn
                    ? '৫০টি MCQ · প্রতি প্রশ্ন ২ নম্বর = ১০০ নম্বর'
                    : '50 MCQs · 2 Marks each = 100 Marks'}
                </option>
                <option value={25}>
                  {isBn
                    ? '২৫টি MCQ · দ্রুত যাচাই (প্রতি প্রশ্ন ৪ নম্বর = ১০০)'
                    : '25 MCQs · Quick Check (4 Marks each = 100)'}
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={startAssessment}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold glass-btn-violet transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              {isBn
                ? `${toBnNum(targetCount)}টি MCQ-এর ১০০ নম্বরের টেস্ট শুরু করুন`
                : `Start ${targetCount}-MCQ (100 Marks) Test`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Running Phase
  const q = currentQuestion!;
  const progressPct = Math.round((responses.length / targetCount) * 100);
  const loc = getLocalizedQuestion(q, language, studyMedium);
  const qTier = getQuestionDifficultyTier(q);
  const tierBnMap = { easy: 'সহজ', medium: 'মধ্যম', hard: 'কঠিন' };
  const marksPerQ = Math.round((100 / targetCount) * 100) / 100;
  const currentCorrectCount = responses.filter((r) => r.isCorrect).length;
  const currentMarks = Math.round(currentCorrectCount * marksPerQ * 10) / 10;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* 1. Smart Telemetry & Control Bar */}
      <div className="p-4 rounded-2xl border glass-panel-3d flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {isBn
              ? `প্রশ্ন ${toBnNum(responses.length + 1)} / ${toBnNum(targetCount)}`
              : `MCQ ${responses.length + 1} / ${targetCount}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
            {isBn
              ? `১০০ নম্বরের টেস্ট (${toBnNum(marksPerQ)} নম্বর/প্রশ্ন)`
              : `100-Mark Scale (${marksPerQ} pt/Q)`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
            {isBn
              ? `বর্তমান অর্জিত: ${toBnNum(currentMarks)} নম্বর`
              : `Earned so far: ${currentMarks} pts`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
            {isBn
              ? `${tierBnMap[qTier]} (স্তর ${toBnNum(difficulty)}/৫)`
              : `${qTier.toUpperCase()} (Level ${difficulty}/5)`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Auto-Advance Toggle */}
          <button
            type="button"
            onClick={() => setQuickAdvance((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
              quickAdvance
                ? 'border-emerald-500/50 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
            title={
              isBn
                ? 'চালু থাকলে অপশনে ক্লিক করলেই পরের প্রশ্ন আসবে'
                : 'When active, clicking an MCQ option advances automatically'
            }
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            {isBn
              ? quickAdvance
                ? 'দ্রুত মোড: চালু'
                : 'দ্রুত মোড: বন্ধ'
              : quickAdvance
              ? 'Auto-Next: ON'
              : 'Auto-Next: OFF'}
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/8 text-xs font-mono tabular-nums text-sky-700 dark:text-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            {isBn
              ? `${toBnNum(Math.floor(elapsedSec / 60))}:${toBnNum(String(elapsedSec % 60).padStart(2, '0'))}`
              : `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`}
          </div>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-cyan-500/60"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {paused ? (isBn ? 'চালু' : 'Resume') : isBn ? 'বিরতি' : 'Pause'}
          </button>

          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isBn ? 'সেটআপ' : 'Exit'}
          </button>
        </div>
      </div>

      {/* 2. Progress Bar + Smart Adaptation Signal */}
      <div className="space-y-2">
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full colorful-progress-bar transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            {adaptationCue.direction === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : adaptationCue.direction === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Brain className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            )}
            <span>{isBn ? adaptationCue.labelBn : adaptationCue.labelEn}</span>
          </span>
          <span className="tabular-nums font-mono font-semibold text-violet-600 dark:text-violet-300">
            {isBn ? `${toBnNum(progressPct)}% সম্পন্ন` : `${progressPct}% complete`}
          </span>
        </div>
      </div>

      {/* 3. Main Question Stage + Live Domain Coverage Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8">
          {paused ? (
            <div className="p-10 rounded-2xl border glass-panel-3d text-center space-y-4">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {isBn ? '১০০ নম্বরের পরীক্ষা বিরতিতে আছে' : 'Assessment Paused'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isBn
                  ? `আপনার ${toBnNum(responses.length)}টি MCQ উত্তর নিরাপদভাবে সংরক্ষিত আছে।`
                  : `All ${responses.length} MCQ answers are saved locally. Resume whenever ready.`}
              </p>
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold glass-btn-3d"
              >
                {isBn ? 'পুনরায় শুরু করুন' : 'Resume Assessment'}
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={q.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 sm:p-7 rounded-2xl border glass-panel-3d"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {getDomainLabel(q.domain, language)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{q.subskill}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {isBn ? `কঠিনতা ${toBnNum(difficulty)}/৫` : `Difficulty ${difficulty}/5`}
                  </span>
                </div>

                <div className="text-lg font-medium text-slate-900 dark:text-white mb-4 leading-relaxed">
                  <MathRenderer content={loc.prompt} />
                </div>

                <QuestionVisualDiagram q={q} language={language} />

                {/* MCQ Options (1-Click or Keyboard A-D / 1-4) */}
                {loc.options && loc.options.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
                    {loc.options.map((opt, idx) => {
                      const selected = answerInput === opt;
                      const letterStyles = [
                        'border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300',
                        'border-violet-400/50 bg-violet-500/15 text-violet-700 dark:text-violet-300',
                        'border-emerald-400/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                        'border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      ];
                      const bnLetters = ['ক', 'খ', 'গ', 'ঘ'];
                      return (
                        <button
                          key={`${q.id}-${idx}`}
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleOptionSelect(opt)}
                          className={`p-3.5 rounded-xl border text-left text-sm transition-all flex items-center gap-3 ${
                            selected
                              ? 'border-cyan-500 bg-gradient-to-r from-cyan-500/15 to-violet-500/15 text-slate-900 dark:text-white font-semibold scale-[0.99]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                              selected
                                ? 'border-cyan-500 bg-gradient-to-br from-sky-500 to-violet-600 text-white'
                                : letterStyles[idx % letterStyles.length]
                            }`}
                          >
                            {isBn ? bnLetters[idx] || String.fromCharCode(65 + idx) : String.fromCharCode(65 + idx)}
                          </span>
                          <MathRenderer content={opt} interactiveGlossary={false} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="my-5">
                    <input
                      type="text"
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitAnswer();
                      }}
                      placeholder={isBn ? 'উত্তর লিখুন...' : 'Type your answer...'}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-base font-mono focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>
                )}

                {/* Optional Reasoning Input (primarily when Auto-Next is OFF) */}
                {!quickAdvance && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      {isBn
                        ? 'ঐচ্ছিক: কীভাবে সমাধান করেছেন সংক্ষেপে লিখতে পারেন'
                        : 'Optional: Note your reasoning step'}
                    </label>
                    <input
                      type="text"
                      maxLength={400}
                      value={reasoningNote}
                      onChange={(e) => setReasoningNote(e.target.value)}
                      placeholder={
                        isBn
                          ? 'যেমন: প্রথমে হর সমান করেছি...'
                          : 'e.g., First I found the common denominator...'
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {isBn
                      ? `${toBnNum(responses.length)}টি সম্পন্ন · ${toBnNum(targetCount - responses.length)}টি বাকি · কীবোর্ড A–D বা 1–4`
                      : `${responses.length} answered · ${targetCount - responses.length} left · Keys A–D or 1–4`}
                  </span>

                  {!quickAdvance && (
                    <button
                      type="button"
                      onClick={() => void submitAnswer()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold glass-btn-3d transition-colors whitespace-nowrap"
                    >
                      {responses.length + 1 >= targetCount ? (
                        <>
                          {isBn ? 'সমাপ্ত ও ফলাফল দেখুন' : 'Complete & Analyze'}
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          {isBn ? 'জমা দিয়ে পরেরটি দেখুন' : 'Submit & Next'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Live Domain Coverage & Mastery Pulse Sidebar */}
        <aside className="lg:col-span-4 rounded-2xl border glass-panel-3d p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-800/70">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-500" />
              {isBn ? 'ডোমেইন-ভিত্তিক লাইভ মানচিত্র' : 'Live Domain Skill Map'}
            </h2>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {isBn
                ? `${toBnNum(activeTargetDomains.length)}টি অধ্যায়`
                : `${activeTargetDomains.length} domains`}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {activeTargetDomains.map((domId) => {
              const stats = domainAccuracy[domId] || { right: 0, total: 0 };
              const acc = stats.total > 0 ? Math.round((stats.right / stats.total) * 100) : null;
              const isActiveDom = q.domain === domId;
              return (
                <div
                  key={domId}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isActiveDom
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-slate-200/75 dark:border-slate-800/75 glass-tile-3d'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {getDomainLabel(domId, language)}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {stats.total > 0
                        ? isBn
                          ? `${toBnNum(stats.right)}/${toBnNum(stats.total)} (${toBnNum(acc ?? 0)}%)`
                          : `${stats.right}/${stats.total} (${acc}%)`
                        : isBn
                        ? '০'
                        : '0'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        acc === null
                          ? 'w-0'
                          : acc >= 75
                          ? 'bg-emerald-500'
                          : acc >= 50
                          ? 'bg-cyan-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${acc ?? 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
