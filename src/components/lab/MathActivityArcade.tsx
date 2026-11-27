import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Gamepad2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getGradeLabel, toBnNum } from '../../i18n/translations';
import { recordLearningActivity, saveQuizAttempt } from '../../services/firestoreService';
import { checkAnswerDeterministic, evaluateClientMath, parseGradeLevel } from '../../utils/mathUtils';
import { useToast } from '../common/ToastContext';

type ArcadeGame = 'sprint' | 'target' | 'detective';

interface SprintItem {
  prompt: string;
  promptBn: string;
  options: string[];
  answer: string;
}

interface TargetPuzzle {
  id: string;
  target: number;
  cards: number[];
  allowedOps: ('+' | '-' | '×' | '÷')[];
  hint: string;
  hintBn: string;
}

interface DetectiveItem {
  id: string;
  kind: 'sequence' | 'operator';
  prompt: string;
  promptBn: string;
  options: string[];
  answer: string;
  explanation: string;
  explanationBn: string;
}

function buildSprintDeck(gradeLevel: number): SprintItem[] {
  const items: SprintItem[] = [];
  for (let i = 0; i < 10; i++) {
    let prompt = '';
    let promptBn = '';
    let ans = 0;

    if (gradeLevel === 0) {
      const a = 1 + ((i * 3) % 6);
      const b = 1 + ((i * 2 + 1) % 4);
      if (i % 3 === 0 && a > b) {
        ans = a - b;
        prompt = `${a} − ${b} = ?`;
        promptBn = `${a} − ${b} = কত?`;
      } else {
        ans = a + b;
        prompt = `${a} + ${b} = ?`;
        promptBn = `${a} + ${b} = কত?`;
      }
    } else if (gradeLevel <= 2) {
      const a = 6 + ((i * 5) % 19);
      const b = 3 + ((i * 4 + 2) % 14);
      if (i % 4 === 2) {
        const m1 = 2 + (i % 4);
        const m2 = 3 + (i % 5);
        ans = m1 * m2;
        prompt = `${m1} × ${m2} = ?`;
        promptBn = `${m1} × ${m2} = কত?`;
      } else if (i % 2 === 1 && a > b) {
        ans = a - b;
        prompt = `${a} − ${b} = ?`;
        promptBn = `${a} − ${b} = কত?`;
      } else {
        ans = a + b;
        prompt = `${a} + ${b} = ?`;
        promptBn = `${a} + ${b} = কত?`;
      }
    } else if (gradeLevel <= 5) {
      const mode = i % 4;
      if (mode === 0) {
        const m1 = 6 + (i % 7);
        const m2 = 4 + ((i * 3) % 8);
        ans = m1 * m2;
        prompt = `${m1} × ${m2} = ?`;
        promptBn = `${m1} × ${m2} = কত?`;
      } else if (mode === 1) {
        const d = 3 + (i % 7);
        const q = 5 + ((i * 2) % 9);
        ans = q;
        prompt = `${d * q} ÷ ${d} = ?`;
        promptBn = `${d * q} ÷ ${d} = কত?`;
      } else if (mode === 2) {
        const a = 24 + i * 7;
        const b = 18 + i * 5;
        ans = a + b;
        prompt = `${a} + ${b} = ?`;
        promptBn = `${a} + ${b} = কত?`;
      } else {
        const a = 75 + i * 6;
        const b = 28 + i * 3;
        ans = a - b;
        prompt = `${a} − ${b} = ?`;
        promptBn = `${a} − ${b} = কত?`;
      }
    } else {
      const mode = i % 4;
      if (mode === 0) {
        const a = -8 + (i % 5) * 3;
        const b = 5 + i * 2;
        ans = a + b;
        prompt = `(${a}) + ${b} = ?`;
        promptBn = `(${a}) + ${b} = কত?`;
      } else if (mode === 1) {
        const pct = [10, 20, 25, 50][i % 4];
        const base = 40 + (i % 5) * 40;
        ans = (pct * base) / 100;
        prompt = `${pct}% of ${base} = ?`;
        promptBn = `${base}-এর ${pct}% = কত?`;
      } else if (mode === 2) {
        const n = 4 + i;
        ans = n * n;
        prompt = `${n}² = ?`;
        promptBn = `${n}² = কত?`;
      } else {
        const x = 3 + i;
        const rhs = 2 * x + 5;
        ans = x;
        prompt = `2x + 5 = ${rhs}, x = ?`;
        promptBn = `2x + 5 = ${rhs} হলে, x = কত?`;
      }
    }

    const distractors = new Set<number>([ans]);
    const offsets = [1, -1, 2, -2, 4, 10, -3];
    for (const off of offsets) {
      if (distractors.size >= 4) break;
      const cand = ans + off;
      if (gradeLevel >= 6 || cand >= 0) distractors.add(cand);
    }
    const opts = Array.from(distractors)
      .slice(0, 4)
      .sort((a, b) => a - b)
      .map(String);

    items.push({ prompt, promptBn, options: opts, answer: String(ans) });
  }
  return items;
}

function getTargetPuzzles(gradeLevel: number): TargetPuzzle[] {
  if (gradeLevel <= 2) {
    return [
      {
        id: 't_e1',
        target: 10,
        cards: [2, 3, 5, 4],
        allowedOps: ['+', '-'],
        hint: 'Try adding 5 + 3 + 2 or 4 + 3 + 5 − 2.',
        hintBn: '৫ + ৩ + ২ যোগ করে দেখো!',
      },
      {
        id: 't_e2',
        target: 12,
        cards: [6, 4, 2, 1],
        allowedOps: ['+', '-'],
        hint: 'Add 6 + 4 + 2!',
        hintBn: '৬ + ৪ + ২ যোগ করো!',
      },
      {
        id: 't_e3',
        target: 9,
        cards: [8, 5, 4, 2],
        allowedOps: ['+', '-'],
        hint: 'Try 8 + 5 − 4.',
        hintBn: '৮ + ৫ − ৪ চেষ্টা করে দেখো।',
      },
      {
        id: 't_e4',
        target: 15,
        cards: [7, 5, 3, 2],
        allowedOps: ['+', '-'],
        hint: '7 + 5 + 3 = 15!',
        hintBn: '৭ + ৫ + ৩ = ১৫!',
      },
    ];
  }
  if (gradeLevel <= 5) {
    return [
      {
        id: 't_m1',
        target: 24,
        cards: [3, 4, 6, 2],
        allowedOps: ['+', '-', '×'],
        hint: 'Think of 6 × 4 or 3 × 8!',
        hintBn: '৬ × ৪ বা ৩ × (৬ + ২) ভেবে দেখো!',
      },
      {
        id: 't_m2',
        target: 30,
        cards: [5, 4, 2, 3],
        allowedOps: ['+', '-', '×'],
        hint: 'Try 5 × (4 + 2) or 5 × 3 × 2.',
        hintBn: '৫ × ৩ × ২ গুণ করে দেখো!',
      },
      {
        id: 't_m3',
        target: 18,
        cards: [7, 3, 2, 4],
        allowedOps: ['+', '-', '×'],
        hint: 'Try 7 × 2 + 4.',
        hintBn: '৭ × ২ + ৪ চেষ্টা করো।',
      },
      {
        id: 't_m4',
        target: 35,
        cards: [8, 5, 1, 3],
        allowedOps: ['+', '-', '×'],
        hint: 'Think of 5 × 7 = 5 × (8 − 1)!',
        hintBn: '৫ × (৮ − ১) অথবা ৫ × (৮ − ৩ + ২)?',
      },
    ];
  }
  return [
    {
      id: 't_h1',
      target: 24,
      cards: [8, 6, 4, 2],
      allowedOps: ['+', '-', '×', '÷'],
      hint: 'Try 6 × 4 or 8 × (6 ÷ 2).',
      hintBn: '৬ × ৪ অথবা ৮ × (৬ ÷ ২) ব্যবহার করো!',
    },
    {
      id: 't_h2',
      target: 36,
      cards: [9, 6, 3, 2],
      allowedOps: ['+', '-', '×', '÷'],
      hint: 'Try 9 × (6 − 2) or 6 × 6.',
      hintBn: '৯ × (৬ − ২) চেষ্টা করে দেখো!',
    },
    {
      id: 't_h3',
      target: 45,
      cards: [9, 7, 3, 2],
      allowedOps: ['+', '-', '×', '÷'],
      hint: '9 × (7 − 2) = 45!',
      hintBn: '৯ × (৭ − ২) = ৪৫!',
    },
    {
      id: 't_h4',
      target: 21,
      cards: [12, 4, 7, 3],
      allowedOps: ['+', '-', '×', '÷'],
      hint: 'Try 7 × (12 ÷ 4)!',
      hintBn: '৭ × (১২ ÷ ৪) হিসাব করো!',
    },
  ];
}

function getDetectiveItems(gradeLevel: number): DetectiveItem[] {
  if (gradeLevel <= 2) {
    return [
      {
        id: 'det_e1',
        kind: 'sequence',
        prompt: 'What number comes next: 2, 4, 6, 8, ___?',
        promptBn: 'পরের সংখ্যাটি কী: ২, ৪, ৬, ৮, ___?',
        options: ['9', '10', '11', '12'],
        answer: '10',
        explanation: 'Add 2 each step: 8 + 2 = 10.',
        explanationBn: 'প্রতি ধাপে ২ করে বাড়ছে: ৮ + ২ = ১০।',
      },
      {
        id: 'det_e2',
        kind: 'operator',
        prompt: 'Which sign makes it true: 9 [ ? ] 4 = 5',
        promptBn: 'কোন চিহ্ন বসলে বাক্যটি সত্য হবে: ৯ [ ? ] ৪ = ৫',
        options: ['+', '−', '×', '÷'],
        answer: '−',
        explanation: '9 − 4 = 5.',
        explanationBn: '৯ − ৪ = ৫।',
      },
      {
        id: 'det_e3',
        kind: 'sequence',
        prompt: 'Find the missing number: 5, 10, 15, ___, 25',
        promptBn: 'খালি ঘরে কী বসবে: ৫, ১০, ১৫, ___, ২৫',
        options: ['18', '20', '22', '30'],
        answer: '20',
        explanation: 'Skip counting by 5s gives 20.',
        explanationBn: '৫ করে গুনলে ১৫-এর পর ২০ হয়।',
      },
      {
        id: 'det_e4',
        kind: 'operator',
        prompt: 'Which sign makes it true: 7 [ ? ] 6 = 13',
        promptBn: 'কোন চিহ্ন বসলে সত্য হবে: ৭ [ ? ] ৬ = ১৩',
        options: ['+', '−', '×', '÷'],
        answer: '+',
        explanation: '7 + 6 = 13.',
        explanationBn: '৭ + ৬ = ১৩।',
      },
    ];
  }
  if (gradeLevel <= 5) {
    return [
      {
        id: 'det_m1',
        kind: 'sequence',
        prompt: 'What comes next in the doubling pattern: 3, 6, 12, 24, ___?',
        promptBn: 'দ্বিগুণ ধারায় পরের সংখ্যা কত: ৩, ৬, ১২, ২৪, ___?',
        options: ['36', '42', '48', '30'],
        answer: '48',
        explanation: 'Multiply by 2 each step: 24 × 2 = 48.',
        explanationBn: 'প্রতি ধাপে ২ দিয়ে গুণ: ২৪ × ২ = ৪৮।',
      },
      {
        id: 'det_m2',
        kind: 'operator',
        prompt: 'Mystery symbol: 48 [ ? ] 6 = 8',
        promptBn: 'গোপন চিহ্নটি কী: ৪৮ [ ? ] ৬ = ৮',
        options: ['+', '−', '×', '÷'],
        answer: '÷',
        explanation: '48 ÷ 6 = 8.',
        explanationBn: '৪৮ ÷ ৬ = ৮।',
      },
      {
        id: 'det_m3',
        kind: 'sequence',
        prompt: 'Find the missing term: 1, 4, 9, 16, ___, 36',
        promptBn: 'খালি ঘরের বর্গসংখ্যা কী হবে: ১, ৪, ৯, ১৬, ___, ৩৬',
        options: ['20', '24', '25', '28'],
        answer: '25',
        explanation: 'Square numbers: 1², 2², 3², 4², 5² = 25.',
        explanationBn: 'ক্রমিক বর্গসংখ্যা: 5² = ২৫।',
      },
      {
        id: 'det_m4',
        kind: 'operator',
        prompt: 'Mystery symbol: 9 [ ? ] 7 = 63',
        promptBn: 'গোপন চিহ্নটি কী: ৯ [ ? ] ৭ = ৬৩',
        options: ['+', '−', '×', '÷'],
        answer: '×',
        explanation: '9 × 7 = 63.',
        explanationBn: '৯ × ৭ = ৬৩।',
      },
    ];
  }
  return [
    {
      id: 'det_h1',
      kind: 'sequence',
      prompt: 'Find the next number: 2, 5, 11, 23, 47, ___',
      promptBn: 'পরবর্তী সংখ্যাটি নির্ণয় করো: ২, ৫, ১১, ২৩, ৪৭, ___',
      options: ['71', '94', '95', '96'],
      answer: '95',
      explanation: 'Rule: (previous × 2) + 1. So 47 × 2 + 1 = 95.',
      explanationBn: 'নিয়ম: (পূর্বের সংখ্যা × ২) + ১। তাই ৪৭ × ২ + ১ = ৯৫।',
    },
    {
      id: 'det_h2',
      kind: 'sequence',
      prompt: 'Fibonacci puzzle: 1, 1, 2, 3, 5, 8, 13, ___',
      promptBn: 'ফিবোনাচ্চি ধারা: ১, ১, ২, ৩, ৫, ৮, ১৩, ___',
      options: ['18', '20', '21', '26'],
      answer: '21',
      explanation: 'Sum of the previous two terms: 8 + 13 = 21.',
      explanationBn: 'আগের দুটি পদের সমষ্টি: ৮ + ১৩ = ২১।',
    },
    {
      id: 'det_h3',
      kind: 'operator',
      prompt: 'Find the missing operator: (−24) [ ? ] (−4) = 6',
      promptBn: 'সঠিক চিহ্ন বসাও: (−২৪) [ ? ] (−৪) = ৬',
      options: ['+', '−', '×', '÷'],
      answer: '÷',
      explanation: '(−24) ÷ (−4) = +6.',
      explanationBn: '(−২৪) ÷ (−৪) = +৬।',
    },
    {
      id: 'det_h4',
      kind: 'sequence',
      prompt: 'Growing differences: 3, 6, 11, 18, 27, ___',
      promptBn: 'ধারাটির পরের সংখ্যা: ৩, ৬, ১১, ১৮, ২৭, ___',
      options: ['36', '38', '40', '42'],
      answer: '38',
      explanation: 'Differences are +3, +5, +7, +9, so next is +11 → 27 + 11 = 38.',
      explanationBn: 'পার্থক্য +৩, +৫, +৭, +৯; তাই পরের ধাপে ২৭ + ১১ = ৩৮।',
      },
  ];
}

export const MathActivityArcade: React.FC = () => {
  const { firebaseUser, userAccount, studentProfile, language } = useAuth();
  const { showToast } = useToast();
  const gradeLevel = parseGradeLevel(studentProfile?.grade);

  const [activeGame, setActiveGame] = useState<ArcadeGame>('sprint');

  // 1. Speed Sprint state
  const [sprintSeed, setSprintSeed] = useState(0);
  const sprintDeck = useMemo(
    () => buildSprintDeck(gradeLevel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gradeLevel, sprintSeed]
  );
  const [sprintIdx, setSprintIdx] = useState(0);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintCombo, setSprintCombo] = useState(0);
  const [sprintBestCombo, setSprintBestCombo] = useState(0);
  const [sprintFinished, setSprintFinished] = useState(false);
  const [sprintFeedback, setSprintFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timerOn, setTimerOn] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (activeGame !== 'sprint' || !timerOn || sprintFinished) return;
    const t = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setSprintFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activeGame, timerOn, sprintFinished]);

  const finishSprint = async (finalScore: number, totalAsked: number) => {
    setSprintFinished(true);
    if (!firebaseUser || totalAsked === 0) return;
    const pct = Math.round((finalScore / totalAsked) * 100);
    const xp = finalScore * 12 + 10;
    try {
      await saveQuizAttempt(firebaseUser.uid, {
        domain: 'Number Operations',
        subskill: 'Mental Math Speed Sprint',
        mode: 'challenge',
        score: pct,
        totalQuestions: totalAsked,
        accuracyPercent: pct,
        xpEarned: xp,
      });
      const res = await recordLearningActivity({
        uid: firebaseUser.uid,
        fallbackAccount: userAccount,
        hasStudentProfile: Boolean(studentProfile),
        xpGain: xp,
        activityLabel: language === 'bn' ? 'গণিত আর্কেড: দ্রুত মানসাঙ্ক' : 'Math Arcade: Speed Sprint',
        language,
      });
      showToast(
        language === 'bn'
          ? `স্প্রিন্ট সম্পন্ন! স্কোর ${toBnNum(finalScore, language)}/${toBnNum(totalAsked, language)} (+${toBnNum(xp, language)} XP)${
              res.notificationTitle ? ` · ${res.notificationTitle}` : ''
            }`
          : `Sprint complete! ${finalScore}/${totalAsked} (+${xp} XP)${
              res.notificationTitle ? ` · ${res.notificationTitle}` : ''
            }`,
        'success'
      );
    } catch {
      // non-blocking
    }
  };

  const handleSprintPick = (opt: string) => {
    if (sprintFinished || sprintFeedback) return;
    const cur = sprintDeck[sprintIdx];
    const ok = checkAnswerDeterministic(opt, cur.answer);
    const nextScore = ok ? sprintScore + 1 : sprintScore;
    if (ok) {
      const nextCombo = sprintCombo + 1;
      setSprintScore(nextScore);
      setSprintCombo(nextCombo);
      setSprintBestCombo((b) => Math.max(b, nextCombo));
      setSprintFeedback('correct');
    } else {
      setSprintCombo(0);
      setSprintFeedback('wrong');
    }

    setTimeout(() => {
      setSprintFeedback(null);
      if (sprintIdx + 1 >= sprintDeck.length) {
        void finishSprint(nextScore, sprintDeck.length);
      } else {
        setSprintIdx((i) => i + 1);
      }
    }, 550);
  };

  const restartSprint = () => {
    setSprintSeed((s) => s + 1);
    setSprintIdx(0);
    setSprintScore(0);
    setSprintCombo(0);
    setSprintBestCombo(0);
    setSprintFinished(false);
    setSprintFeedback(null);
    setSecondsLeft(60);
  };

  // 2. Target Number Builder state
  const targetPuzzles = useMemo(() => getTargetPuzzles(gradeLevel), [gradeLevel]);
  const [targetIdx, setTargetIdx] = useState(0);
  const currentPuzzle = targetPuzzles[targetIdx % targetPuzzles.length];
  const [tokens, setTokens] = useState<{ label: string; value: string; cardIdx?: number }[]>([]);
  const [solvedTargets, setSolvedTargets] = useState<Record<string, boolean>>({});
  const [showTargetHint, setShowTargetHint] = useState(false);

  const usedCardIndices = new Set(
    tokens.map((t) => t.cardIdx).filter((v): v is number => typeof v === 'number')
  );
  const exprString = tokens.map((t) => t.value).join(' ');
  const exprValue = exprString ? evaluateClientMath(exprString) : null;

  const appendCardToken = (num: number, cardIdx: number) => {
    if (usedCardIndices.has(cardIdx)) return;
    const last = tokens[tokens.length - 1];
    if (last && typeof last.cardIdx === 'number') return; // expect operator between cards
    setTokens((prev) => [...prev, { label: String(num), value: String(num), cardIdx }]);
  };

  const appendOpToken = (op: string) => {
    if (tokens.length === 0 && op !== '(') return;
    setTokens((prev) => [...prev, { label: op, value: op }]);
  };

  const verifyTargetPuzzle = async () => {
    if (exprValue === null) {
      showToast(
        language === 'bn'
          ? 'একটি বৈধ গাণিতিক রাশি তৈরি করো!'
          : 'Build a valid math expression first!',
        'info'
      );
      return;
    }
    if (Math.abs(exprValue - currentPuzzle.target) < 1e-6) {
      if (!solvedTargets[currentPuzzle.id]) {
        setSolvedTargets((prev) => ({ ...prev, [currentPuzzle.id]: true }));
        if (firebaseUser) {
          try {
            const res = await recordLearningActivity({
              uid: firebaseUser.uid,
              fallbackAccount: userAccount,
              hasStudentProfile: Boolean(studentProfile),
              xpGain: 25,
              activityLabel:
                language === 'bn'
                  ? `টার্গেট সংখ্যা: ${toBnNum(currentPuzzle.target, language)}`
                  : `Target Builder: ${currentPuzzle.target}`,
              language,
            });
            showToast(
              language === 'bn'
                ? `দারুণ! লক্ষ্য ${toBnNum(currentPuzzle.target, language)} তৈরি হয়েছে (+২৫ XP)${
                    res.notificationTitle ? ` · ${res.notificationTitle}` : ''
                  }`
                : `Target ${currentPuzzle.target} built! +25 XP${
                    res.notificationTitle ? ` · ${res.notificationTitle}` : ''
                  }`,
              'success'
            );
          } catch {
            // non-blocking
          }
        } else {
          showToast(
            language === 'bn'
              ? `সঠিক! ${toBnNum(exprString, language)} = ${toBnNum(currentPuzzle.target, language)}`
              : `Exact match! ${exprString} = ${currentPuzzle.target}`,
            'success'
          );
        }
      } else {
        showToast(
          language === 'bn' ? 'সঠিক উত্তর!' : 'Exact target matched!',
          'success'
        );
      }
    } else {
      showToast(
        language === 'bn'
          ? `বর্তমান মান ${toBnNum(exprValue, language)} — লক্ষ্য ${toBnNum(currentPuzzle.target, language)}-এর সাথে মেলেনি। আবার চেষ্টা করো!`
          : `Current value is ${exprValue}, target is ${currentPuzzle.target}. Try adjusting!`,
        'info'
      );
    }
  };

  // 3. Pattern & Logic Detective state
  const detectiveDeck = useMemo(() => getDetectiveItems(gradeLevel), [gradeLevel]);
  const [detIdx, setDetIdx] = useState(0);
  const [detChoice, setDetChoice] = useState<string | null>(null);
  const [detSolvedCount, setDetSolvedCount] = useState(0);
  const currentDet = detectiveDeck[detIdx % detectiveDeck.length];

  const handleDetectiveAnswer = async (opt: string) => {
    if (detChoice) return;
    setDetChoice(opt);
    const ok = opt === currentDet.answer;
    if (ok) {
      const nextCount = detSolvedCount + 1;
      setDetSolvedCount(nextCount);
      if (firebaseUser) {
        try {
          await recordLearningActivity({
            uid: firebaseUser.uid,
            fallbackAccount: userAccount,
            hasStudentProfile: Boolean(studentProfile),
            xpGain: 15,
            activityLabel: language === 'bn' ? 'প্যাটার্ন গোয়েন্দা খেলা' : 'Pattern Detective Activity',
            language,
          });
        } catch {
          // non-blocking
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Arcade Header & Game Selector */}
      <div className="p-5 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm flex items-center justify-center">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {language === 'bn'
                ? `${studentProfile?.grade ? getGradeLabel(studentProfile.grade, 'bn') : 'সব শ্রেণি'} · হাতে-কলমে গণিত খেলা`
                : `${studentProfile?.grade || 'Adaptive'} · Hands-On Math Activities`}
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'মজার গণিত অ্যাক্টিভিটি আর্কেড' : 'Interactive Math Activity Arcade'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/75 dark:bg-slate-900/75 border border-amber-500/25">
          {[
            {
              id: 'sprint' as const,
              label: language === 'bn' ? '১. দ্রুত মানসাঙ্ক' : '1. Speed Sprint',
              icon: Zap,
              activeCls: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm',
            },
            {
              id: 'target' as const,
              label: language === 'bn' ? '২. টার্গেট সংখ্যা' : '2. Target Builder',
              icon: Sparkles,
              activeCls: 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm',
            },
            {
              id: 'detective' as const,
              label: language === 'bn' ? '৩. প্যাটার্ন গোয়েন্দা' : '3. Pattern Detective',
              icon: Trophy,
              activeCls: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm',
            },
          ].map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGame(g.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeGame === g.id
                    ? g.activeCls
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* GAME 1: MENTAL MATH SPEED SPRINT */}
      {activeGame === 'sprint' && (
        <div className="p-6 rounded-2xl border glass-panel-3d space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold">
                {language === 'bn' ? 'প্রশ্ন' : 'Q'}{' '}
                {toBnNum(Math.min(sprintIdx + 1, sprintDeck.length), language)}/
                {toBnNum(sprintDeck.length, language)}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                <Flame className="w-4 h-4" />
                {language === 'bn' ? 'কম্বো' : 'Combo'}: {toBnNum(sprintCombo, language)}×
              </span>
              <span className="text-emerald-500 font-bold">
                {language === 'bn' ? 'সঠিক' : 'Score'}: {toBnNum(sprintScore, language)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTimerOn((t) => !t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono tabular-nums ${
                  timerOn
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                {timerOn
                  ? language === 'bn'
                    ? `${toBnNum(secondsLeft, language)} সে.`
                    : `${secondsLeft}s`
                  : language === 'bn'
                  ? 'টাইমার বন্ধ'
                  : 'Timer Off'}
              </button>
              <button
                onClick={restartSprint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-cyan-500"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {language === 'bn' ? 'নতুন গেম' : 'New Round'}
              </button>
            </div>
          </div>

          {sprintFinished ? (
            <div className="py-8 text-center space-y-4">
              <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'স্প্রিন্ট চ্যালেঞ্জ সম্পন্ন!' : 'Sprint Challenge Complete!'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                {language === 'bn' ? 'স্কোর' : 'Score'}: {toBnNum(sprintScore, language)}/
                {toBnNum(sprintDeck.length, language)} ·{' '}
                {language === 'bn' ? 'সর্বোচ্চ কম্বো' : 'Best Combo'}:{' '}
                {toBnNum(sprintBestCombo, language)}×
              </p>
              <button
                onClick={restartSprint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
              >
                <Play className="w-4 h-4" />
                {language === 'bn' ? 'আবার খেলো' : 'Play Again'}
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-6 py-2">
              <div
                className={`p-8 rounded-2xl border text-center transition-colors ${
                  sprintFeedback === 'correct'
                    ? 'border-emerald-500 bg-emerald-500/12'
                    : sprintFeedback === 'wrong'
                    ? 'border-rose-500 bg-rose-500/12'
                    : 'border-amber-500/25 bg-gradient-to-br from-amber-500/8 via-cyan-500/8 to-violet-500/8'
                }`}
              >
                <p className="text-xs text-slate-500 mb-2">
                  {language === 'bn' ? 'দ্রুত সঠিক উত্তরটি বাছাই করো' : 'Pick the fastest accurate answer'}
                </p>
                <div className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {language === 'bn'
                    ? toBnNum(sprintDeck[sprintIdx].promptBn, language)
                    : sprintDeck[sprintIdx].prompt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sprintDeck[sprintIdx].options.map((opt, idx) => {
                  const optStyles = [
                    'border-sky-400/40 hover:border-sky-500 hover:bg-sky-500/10',
                    'border-violet-400/40 hover:border-violet-500 hover:bg-violet-500/10',
                    'border-emerald-400/40 hover:border-emerald-500 hover:bg-emerald-500/10',
                    'border-amber-400/40 hover:border-amber-500 hover:bg-amber-500/10',
                  ];
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSprintPick(opt)}
                      className={`py-4 px-5 rounded-xl border bg-white/80 dark:bg-slate-900 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white transition-all ${
                        optStyles[idx % optStyles.length]
                      }`}
                    >
                      {toBnNum(opt, language)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: TARGET NUMBER BUILDER */}
      {activeGame === 'target' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-violet-500 tabular-nums">
                  {language === 'bn'
                    ? `লেভেল ${toBnNum((targetIdx % targetPuzzles.length) + 1, language)} / ${toBnNum(targetPuzzles.length, language)}`
                    : `Puzzle ${(targetIdx % targetPuzzles.length) + 1} of ${targetPuzzles.length}`}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'bn'
                    ? `কার্ডগুলো দিয়ে ${toBnNum(currentPuzzle.target, language)} তৈরি করো`
                    : `Build Target Number: ${currentPuzzle.target}`}
                </h3>
              </div>
              <div className="px-4 py-2 rounded-xl bg-violet-500/12 border border-violet-500/35 font-mono text-xl font-bold text-violet-600 dark:text-violet-300 tabular-nums">
                {language === 'bn' ? 'লক্ষ্য' : 'Target'}: {toBnNum(currentPuzzle.target, language)}
              </div>
            </div>

            {/* Expression Canvas */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 min-h-[72px] flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {tokens.length > 0
                  ? toBnNum(exprString, language)
                  : language === 'bn'
                  ? 'নিচের সংখ্যা ও চিহ্ন ট্যাপ করে রাশি বানাও...'
                  : 'Tap number cards & operators below...'}
              </div>
              <div className="font-mono text-sm font-semibold text-violet-500 tabular-nums">
                = {exprValue !== null ? toBnNum(Number(exprValue.toFixed(2)), language) : '?'}
              </div>
            </div>

            {/* Number Cards */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                {language === 'bn' ? 'সংখ্যা কার্ড (প্রতিটি একবার ব্যবহারযোগ্য)' : 'Number Cards (use once each)'}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {currentPuzzle.cards.map((num, idx) => {
                  const used = usedCardIndices.has(idx);
                  const cardPalette = [
                    'border-sky-500/40 bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300',
                    'border-violet-500/40 bg-violet-500/12 hover:bg-violet-500/20 text-violet-600 dark:text-violet-300',
                    'border-emerald-500/40 bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
                    'border-amber-500/40 bg-amber-500/12 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300',
                  ];
                  return (
                    <button
                      key={`${num}_${idx}`}
                      disabled={used}
                      onClick={() => appendCardToken(num, idx)}
                      className={`py-4 rounded-xl border text-2xl font-bold font-mono tabular-nums transition-colors ${
                        used
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-slate-400 opacity-50'
                          : cardPalette[idx % cardPalette.length]
                      }`}
                    >
                      {toBnNum(num, language)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Operators */}
            <div className="flex flex-wrap items-center gap-2">
              {[...currentPuzzle.allowedOps, '(', ')'].map((op) => (
                <button
                  key={op}
                  onClick={() => appendOpToken(op)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-violet-500 font-mono text-base font-bold"
                >
                  {op}
                </button>
              ))}
              <button
                onClick={() => setTokens((prev) => prev.slice(0, -1))}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {language === 'bn' ? 'পিছনে' : 'Undo'}
              </button>
              <button
                onClick={() => setTokens([])}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {language === 'bn' ? 'মুছুন' : 'Clear'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowTargetHint((h) => !h)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:underline"
              >
                <HelpCircle className="w-4 h-4" />
                {language === 'bn' ? 'ইঙ্গিত দেখো' : 'Show Hint'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={verifyTargetPuzzle}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl glass-btn-emerald text-white text-xs font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'bn' ? 'উত্তর যাচাই করো' : 'Check Expression'}
                </button>
                <button
                  onClick={() => {
                    setTargetIdx((i) => (i + 1) % targetPuzzles.length);
                    setTokens([]);
                    setShowTargetHint(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  {language === 'bn' ? 'পরবর্তী পাজল →' : 'Next Puzzle →'}
                </button>
              </div>
            </div>

            {showTargetHint && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-slate-700 dark:text-slate-300">
                {language === 'bn' ? currentPuzzle.hintBn : currentPuzzle.hint}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'bn' ? 'পাজল অগ্রগতি' : 'Challenge Progress'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'bn'
                ? 'সংখ্যা কার্ড এবং গাণিতিক চিহ্ন মিলিয়ে ঠিক লক্ষ্য সংখ্যাটি তৈরি করলে প্রতিটি পাজলে +২৫ XP পাবে।'
                : 'Combine number tiles and operations to hit the exact target value and earn +25 XP per puzzle.'}
            </p>
            <div className="space-y-2">
              {targetPuzzles.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTargetIdx(idx);
                    setTokens([]);
                    setShowTargetHint(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold tabular-nums ${
                    targetIdx % targetPuzzles.length === idx
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>
                    {language === 'bn'
                      ? `পাজল ${toBnNum(idx + 1, language)}: লক্ষ্য ${toBnNum(p.target, language)}`
                      : `Puzzle ${idx + 1}: Target ${p.target}`}
                  </span>
                  {solvedTargets[p.id] && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GAME 3: PATTERN & MYSTERY OPERATOR DETECTIVE */}
      {activeGame === 'detective' && (
        <div className="p-6 rounded-2xl border glass-panel-3d space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-emerald-500 tabular-nums">
                {language === 'bn'
                  ? `ধাঁধা ${toBnNum((detIdx % detectiveDeck.length) + 1, language)} / ${toBnNum(detectiveDeck.length, language)}`
                  : `Case ${(detIdx % detectiveDeck.length) + 1} of ${detectiveDeck.length}`}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'bn'
                  ? 'প্যাটার্ন ও গোপন চিহ্ন গোয়েন্দা'
                  : 'Pattern & Mystery Symbol Detective'}
              </h3>
            </div>
            <div className="font-mono text-xs font-semibold text-emerald-500 tabular-nums">
              {language === 'bn' ? 'সমাধানকৃত' : 'Solved'}: {toBnNum(detSolvedCount, language)}
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-5 py-2">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/8 via-cyan-500/8 to-violet-500/8 border border-emerald-500/25 text-center">
              <p className="text-xs text-slate-500 mb-2">
                {currentDet.kind === 'sequence'
                  ? language === 'bn'
                    ? 'ধারার নিয়ম খুঁজে বের করো'
                    : 'Crack the sequence rule'
                  : language === 'bn'
                  ? 'সঠিক গাণিতিক চিহ্নটি বেছে নাও'
                  : 'Find the hidden operator'}
              </p>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {language === 'bn' ? currentDet.promptBn : currentDet.prompt}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentDet.options.map((opt) => {
                const isSelected = detChoice === opt;
                const isRight = detChoice && opt === currentDet.answer;
                const isWrong = isSelected && opt !== currentDet.answer;
                return (
                  <button
                    key={opt}
                    disabled={Boolean(detChoice)}
                    onClick={() => handleDetectiveAnswer(opt)}
                    className={`py-4 rounded-xl border text-lg font-bold font-mono tabular-nums transition-colors ${
                      isRight
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : isWrong
                        ? 'border-rose-500 bg-rose-500/15 text-rose-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                    }`}
                  >
                    {toBnNum(opt, language)}
                  </button>
                );
              })}
            </div>

            {detChoice && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <strong
                    className={
                      detChoice === currentDet.answer ? 'text-emerald-500 mr-2' : 'text-rose-500 mr-2'
                    }
                  >
                    {detChoice === currentDet.answer
                      ? language === 'bn'
                        ? 'সঠিক! (+১৫ XP)'
                        : 'Correct! (+15 XP)'
                      : language === 'bn'
                      ? `সঠিক উত্তর: ${toBnNum(currentDet.answer, language)}`
                      : `Answer: ${currentDet.answer}`}
                  </strong>
                  {language === 'bn' ? currentDet.explanationBn : currentDet.explanation}
                </div>
                <button
                  onClick={() => {
                    setDetIdx((i) => (i + 1) % detectiveDeck.length);
                    setDetChoice(null);
                  }}
                  className="px-4 py-2 rounded-xl glass-btn-emerald text-white text-xs font-semibold whitespace-nowrap"
                >
                  {language === 'bn' ? 'পরবর্তী ধাঁধা →' : 'Next Case →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
