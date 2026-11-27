import React, { useMemo, useState } from 'react';
import { CheckCircle2, Gamepad2, RotateCcw, Sparkles, Target } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { toBnNum } from '../../i18n/translations';
import { recordLearningActivity } from '../../services/firestoreService';
import { useToast } from '../common/ToastContext';
import { MathActivityArcade } from './MathActivityArcade';

interface MathLabProps {
  initialTool?: string;
}

interface LabMission {
  id: string;
  toolId: string;
  title: string;
  titleBn: string;
  goal: string;
  goalBn: string;
  check: () => boolean;
}

const GRID_ROWS = 6;
const GRID_COLS = 8;

export const InteractiveMathLab: React.FC<MathLabProps> = ({ initialTool = 'fraction-lab' }) => {
  const { firebaseUser, userAccount, studentProfile, language } = useAuth();
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState(initialTool);

  // 1. Number Line state
  const [nlStart, setNlStart] = useState(-3);
  const [nlDelta, setNlDelta] = useState(7);

  // 2. Fraction & Decimal Visualizer state
  const [numA, setNumA] = useState(2);
  const [denA, setDenA] = useState(6);
  const [numB, setNumB] = useState(1);
  const [denB, setDenB] = useState(3);

  // 3. Algebra Balance state
  const [coefA, setCoefA] = useState(2);
  const [constB, setConstB] = useState(4);
  const [rhsC, setRhsC] = useState(14);

  // 4. Geometry Board state
  const [ax, setAx] = useState(60);
  const [ay, setAy] = useState(220);
  const [bx, setBx] = useState(300);
  const [by, setBy] = useState(220);
  const [cx, setCx] = useState(180);
  const [cy, setCy] = useState(55);

  // 5. Coordinate Plotter state
  const [slopeM, setSlopeM] = useState(1.5);
  const [interceptB, setInterceptB] = useState(1);
  const [quadA, setQuadA] = useState(0);

  // 6. Probability Simulator state
  const [dieCounts, setDieCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const totalRolls = dieCounts.reduce((s, c) => s + c, 0);

  // 7. Place Value Block Builder state (Tens & Ones 0..99)
  const [pvTens, setPvTens] = useState(3);
  const [pvOnes, setPvOnes] = useState(4);

  // 8. Area & Perimeter Grid state (6x8 boolean cells)
  const [tileGrid, setTileGrid] = useState<boolean[]>(() => {
    const g = Array(GRID_ROWS * GRID_COLS).fill(false);
    // Initial 3x4 rectangle at rows 1..3, cols 2..5
    for (let r = 1; r <= 3; r++) {
      for (let c = 2; c <= 5; c++) {
        g[r * GRID_COLS + c] = true;
      }
    }
    return g;
  });

  // Mission completion tracking
  const [activeMissionIdx, setActiveMissionIdx] = useState<Record<string, number>>({});
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({});

  const gridMetrics = useMemo(() => {
    let area = 0;
    let perimeter = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!tileGrid[r * GRID_COLS + c]) continue;
        area++;
        const up = r > 0 && tileGrid[(r - 1) * GRID_COLS + c];
        const down = r < GRID_ROWS - 1 && tileGrid[(r + 1) * GRID_COLS + c];
        const left = c > 0 && tileGrid[r * GRID_COLS + (c - 1)];
        const right = c < GRID_COLS - 1 && tileGrid[r * GRID_COLS + (c + 1)];
        if (!up) perimeter++;
        if (!down) perimeter++;
        if (!left) perimeter++;
        if (!right) perimeter++;
      }
    }
    return { area, perimeter };
  }, [tileGrid]);

  const toggleGridCell = (idx: number) => {
    setTileGrid((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const applyGridPreset = (preset: 'rect3x4' | 'square4x4' | 'lshape' | 'clear') => {
    const g = Array(GRID_ROWS * GRID_COLS).fill(false);
    if (preset === 'rect3x4') {
      for (let r = 1; r <= 3; r++) for (let c = 2; c <= 5; c++) g[r * GRID_COLS + c] = true;
    } else if (preset === 'square4x4') {
      for (let r = 1; r <= 4; r++) for (let c = 2; c <= 5; c++) g[r * GRID_COLS + c] = true;
    } else if (preset === 'lshape') {
      for (let r = 1; r <= 4; r++) g[r * GRID_COLS + 2] = true;
      for (let c = 2; c <= 4; c++) g[4 * GRID_COLS + c] = true;
    }
    setTileGrid(g);
  };

  // Geometry Calculations
  const geoMetrics = useMemo(() => {
    const dist = (x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1);
    const sideC = dist(ax, ay, bx, by);
    const sideA = dist(bx, by, cx, cy);
    const sideB = dist(ax, ay, cx, cy);

    const clampCos = (v: number) => Math.max(-1, Math.min(1, v));
    const angA =
      (Math.acos(clampCos((sideB * sideB + sideC * sideC - sideA * sideA) / (2 * sideB * sideC || 1))) *
        180) /
      Math.PI;
    const angB =
      (Math.acos(clampCos((sideA * sideA + sideC * sideC - sideB * sideB) / (2 * sideA * sideC || 1))) *
        180) /
      Math.PI;
    const angC = Math.max(0, 180 - angA - angB);
    const areaPx = Math.abs((ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2);
    return {
      sideA: (sideA / 20).toFixed(1),
      sideB: (sideB / 20).toFixed(1),
      sideC: (sideC / 20).toFixed(1),
      angA: angA.toFixed(1),
      angB: angB.toFixed(1),
      angC: angC.toFixed(1),
      area: (areaPx / 400).toFixed(2),
      perimeter: ((sideA + sideB + sideC) / 20).toFixed(1),
    };
  }, [ax, ay, bx, by, cx, cy]);

  const rollDice = (times: number) => {
    setDieCounts((prev) => {
      const next = [...prev];
      for (let i = 0; i < times; i++) {
        const face = Math.floor(Math.random() * 6);
        next[face]++;
      }
      return next;
    });
  };

  const probChartData = dieCounts.map((count, i) => ({
    face: language === 'bn' ? `পিঠ ${toBnNum(i + 1, 'bn')}` : `Face ${i + 1}`,
    Experimental: totalRolls > 0 ? Number(((count / totalRolls) * 100).toFixed(1)) : 0,
    Theoretical: 16.7,
  }));

  const solvedX = coefA !== 0 ? (rhsC - constB) / coefA : 0;

  // 16 Hands-On Guided Lab Missions (2 per visual simulator)
  const missions: LabMission[] = [
    {
      id: 'm_nl_1',
      toolId: 'number-line',
      title: 'Zero Crossing Hop',
      titleBn: 'শূন্য পার হওয়া লাফ',
      goal: 'Start at −4 and make a jump so you land on +3.',
      goalBn: '−৪ থেকে শুরু করে এমন একটি লাফ দাও যাতে ফলাফল +৩ হয়।',
      check: () => nlStart === -4 && nlStart + nlDelta === 3,
    },
    {
      id: 'm_nl_2',
      toolId: 'number-line',
      title: 'Negative Target',
      titleBn: 'ঋণাত্মক ফলাফল তৈরি',
      goal: 'Choose any negative jump so the final result equals −5.',
      goalBn: 'ঋণাত্মক লাফ ব্যবহার করে মোট ফলাফল −৫ বানাও।',
      check: () => nlDelta < 0 && nlStart + nlDelta === -5,
    },
    {
      id: 'm_pv_1',
      toolId: 'place-value-blocks',
      title: 'Build 47 with Blocks',
      titleBn: 'ব্লক দিয়ে ৪৭ তৈরি করো',
      goal: 'Arrange Tens rods and Ones cubes to represent the number 47.',
      goalBn: 'দশকের দণ্ড ও এককের ব্লক ব্যবহার করে ৪৭ সংখ্যাটি তৈরি করো।',
      check: () => pvTens === 4 && pvOnes === 7,
    },
    {
      id: 'm_pv_2',
      toolId: 'place-value-blocks',
      title: 'Make 80 (Zero Ones)',
      titleBn: '৮০ তৈরি করো (০ একক)',
      goal: 'Represent 80 using only Tens rods (0 Ones).',
      goalBn: 'শুধুমাত্র দশকের দণ্ড (০ একক) দিয়ে ৮০ তৈরি করো।',
      check: () => pvTens === 8 && pvOnes === 0,
    },
    {
      id: 'm_fr_1',
      toolId: 'fraction-lab',
      title: 'Equivalent Half Pair',
      titleBn: 'সমতুল অর্ধেক জুটি',
      goal: 'Set Fraction A and Fraction B to TWO DIFFERENT equivalent fractions that both equal 50% (0.5).',
      goalBn: 'ভগ্নাংশ A ও B-তে দুটি ভিন্ন ভগ্নাংশ বসাও যেন দুটির মানই ৫০% (০.৫) হয়।',
      check: () =>
        Math.abs(numA / denA - 0.5) < 1e-6 &&
        Math.abs(numB / denB - 0.5) < 1e-6 &&
        denA !== denB,
    },
    {
      id: 'm_fr_2',
      toolId: 'fraction-lab',
      title: 'Three-Quarters Match',
      titleBn: 'তিন-চতুর্থাংশ মিলানো',
      goal: 'Make Fraction A equal 75% using denominator 8 or 12.',
      goalBn: 'হর ৮ অথবা ১২ ব্যবহার করে ভগ্নাংশ A-এর মান ৭৫% বানাও।',
      check: () => Math.abs(numA / denA - 0.75) < 1e-6 && (denA === 8 || denA === 12),
    },
    {
      id: 'm_ap_1',
      toolId: 'area-perimeter-grid',
      title: 'Area 10 Square Grid',
      titleBn: '১০ ক্ষেত্রফলের আকৃতি',
      goal: 'Toggle tiles on the grid to build ANY connected shape with Area = 10 unit².',
      goalBn: 'গ্রিডের ঘরগুলোতে ক্লিক করে ১০ বর্গ একক ক্ষেত্রফলের একটি আকৃতি বানাও।',
      check: () => gridMetrics.area === 10,
    },
    {
      id: 'm_ap_2',
      toolId: 'area-perimeter-grid',
      title: 'Perimeter Challenge 16',
      titleBn: '১৬ পরিসীমার চ্যালেঞ্জ',
      goal: 'Build a shape that has Area = 12 AND Perimeter = 16.',
      goalBn: 'এমন একটি আকৃতি তৈরি করো যার ক্ষেত্রফল ১২ এবং পরিসীমা ১৬।',
      check: () => gridMetrics.area === 12 && gridMetrics.perimeter === 16,
    },
    {
      id: 'm_alg_1',
      toolId: 'algebra-balance',
      title: 'Balance Solution x = 5',
      titleBn: 'সমীকরণ সমাধান x = ৫',
      goal: 'Adjust a, b, and c (with a ≥ 2) so that the solution is x = 5.',
      goalBn: 'a ≥ ২ রেখে এমন মান বসাও যাতে সমাধান x = ৫ হয়।',
      check: () => coefA >= 2 && Math.abs(solvedX - 5) < 1e-6,
    },
    {
      id: 'm_alg_2',
      toolId: 'algebra-balance',
      title: 'Negative Solution',
      titleBn: 'ঋণাত্মক সমাধান তৈরি',
      goal: 'Configure the balance equation so x equals −2.',
      goalBn: 'সমীকরণটি এমনভাবে সাজাও যাতে x = −২ হয়।',
      check: () => Math.abs(solvedX - -2) < 1e-6,
    },
    {
      id: 'm_geo_1',
      toolId: 'geometry-board',
      title: 'Symmetrical Peak',
      titleBn: 'সমদ্বিবাহু ত্রিভুজ',
      goal: 'Move vertices so Angle A and Angle B are within 2° of each other (isosceles)!',
      goalBn: 'শীর্ষবিন্দু সরিয়ে কোণ A এবং কোণ B-কে প্রায় সমান (২°-এর মধ্যে) বানাও!',
      check: () => Math.abs(Number(geoMetrics.angA) - Number(geoMetrics.angB)) <= 2,
    },
    {
      id: 'm_geo_2',
      toolId: 'geometry-board',
      title: 'Wide Obtuse Angle',
      titleBn: 'স্থূলকোণী ত্রিভুজ',
      goal: 'Drag Apex C downward/outward until one interior angle exceeds 100°.',
      goalBn: 'শীর্ষ C সরিয়ে ত্রিভুজের যেকোনো একটি কোণ ১০০°-এর বেশি বানাও।',
      check: () =>
        Math.max(Number(geoMetrics.angA), Number(geoMetrics.angB), Number(geoMetrics.angC)) > 100,
    },
    {
      id: 'm_cp_1',
      toolId: 'coordinate-plane',
      title: 'Parallel Steep Line',
      titleBn: 'খাড়া সরলরেখা',
      goal: 'Set quadratic term a = 0, slope m = 2, and y-intercept b = −3.',
      goalBn: 'দ্বিঘাত পদ a = ০, ঢাল m = ২ এবং y-ছেদক b = −৩ সেট করো।',
      check: () => quadA === 0 && slopeM === 2 && interceptB === -3,
    },
    {
      id: 'm_cp_2',
      toolId: 'coordinate-plane',
      title: 'Downward Parabola',
      titleBn: 'নিম্নমুখী পরাবৃত্ত',
      goal: 'Turn on a negative quadratic curve (a < 0) passing through (0, 2).',
      goalBn: 'ঋণাত্মক দ্বিঘাত পদ (a < ০) এবং y-ছেদক b = ২ দিয়ে বক্ররেখা তৈরি করো।',
      check: () => quadA < 0 && interceptB === 2,
    },
    {
      id: 'm_pr_1',
      toolId: 'probability-sim',
      title: 'Law of Large Numbers',
      titleBn: 'বৃহৎ সংখ্যার সূত্র',
      goal: 'Run at least 100 dice trials and compare Experimental vs Theoretical 16.7%.',
      goalBn: 'অন্তত ১০০ বার ছক্কা চালিয়ে পরীক্ষামূলক ও তাত্ত্বিক সম্ভাবনা তুলনা করো।',
      check: () => totalRolls >= 100,
    },
    {
      id: 'm_pr_2',
      toolId: 'probability-sim',
      title: 'Deep Convergence Test',
      titleBn: '৩০০ ট্রায়াল পর্যবেক্ষণ',
      goal: 'Reach 300+ total rolls to observe all 6 bars leveling near 16.7%.',
      goalBn: 'মোট ৩০০+ ট্রায়াল চালিয়ে ৬টি স্তম্ভের সমতা পর্যবেক্ষণ করো।',
      check: () => totalRolls >= 300,
    },
  ];

  const toolMissions = missions.filter((m) => m.toolId === activeTool);
  const currentMissionIdx = activeMissionIdx[activeTool] ?? 0;
  const activeMission = toolMissions[currentMissionIdx % Math.max(1, toolMissions.length)];

  const verifyActiveMission = async () => {
    if (!activeMission) return;
    if (!activeMission.check()) {
      showToast(
        language === 'bn'
          ? 'লক্ষ্য এখনো পূরণ হয়নি! স্লাইডার বা ব্লক সামঞ্জস্য করে আবার যাচাই করো।'
          : 'Not quite there yet — adjust the simulator values to match the mission goal!',
        'info'
      );
      return;
    }
    const alreadyDone = Boolean(completedMissions[activeMission.id]);
    setCompletedMissions((prev) => ({ ...prev, [activeMission.id]: true }));
    if (!alreadyDone && firebaseUser) {
      try {
        const res = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: 20,
          activityLabel:
            language === 'bn'
              ? `গণিত ল্যাব মিশন: ${activeMission.titleBn}`
              : `Math Lab Mission: ${activeMission.title}`,
          language,
        });
        showToast(
          language === 'bn'
            ? `মিশন সম্পন্ন! (+২০ XP)${res.notificationTitle ? ` · ${res.notificationTitle}` : ''}`
            : `Mission verified! +20 XP${res.notificationTitle ? ` · ${res.notificationTitle}` : ''}`,
          'success'
        );
        return;
      } catch {
        // fallback toast below
      }
    }
    showToast(
      language === 'bn' ? 'দারুণ! মিশনটি সঠিকভাবে সম্পন্ন হয়েছে!' : 'Great job! Mission state verified!',
      'success'
    );
  };

  const tools = [
    { id: 'place-value-blocks', label: language === 'bn' ? 'দশক ও একক' : 'Tens & Ones' },
    { id: 'number-line', label: language === 'bn' ? 'সংখ্যারেখা' : 'Number Line' },
    { id: 'fraction-lab', label: language === 'bn' ? 'ভগ্নাংশ ও দশমিক' : 'Fraction & Decimal' },
    { id: 'area-perimeter-grid', label: language === 'bn' ? 'ক্ষেত্রফল গ্রিড' : 'Area & Perimeter' },
    { id: 'algebra-balance', label: language === 'bn' ? 'বীজগণিত ভারসাম্য' : 'Algebra Balance' },
    { id: 'geometry-board', label: language === 'bn' ? 'জ্যামিতি ও কোণ' : 'Geometry & Angles' },
    { id: 'coordinate-plane', label: language === 'bn' ? 'স্থানাঙ্ক লেখচিত্র' : 'Coordinate Plotter' },
    { id: 'probability-sim', label: language === 'bn' ? 'সম্ভাবনা ল্যাব' : 'Probability Sim' },
    {
      id: 'activity-arcade',
      label: language === 'bn' ? 'অ্যাক্টিভিটি আর্কেড' : 'Activity Arcade',
      isArcade: true,
    },
  ];

  const completedCount = Object.values(completedMissions).filter(Boolean).length;

  const toolActiveColors: Record<string, string> = {
    'place-value-blocks': 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm',
    'number-line': 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm',
    'fraction-lab': 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm',
    'area-perimeter-grid': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm',
    'algebra-balance': 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm',
    'geometry-board': 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm',
    'coordinate-plane': 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm',
    'probability-sim': 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-sm',
    'activity-arcade': 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm',
  };

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {language === 'bn'
              ? 'ইন্টারেক্টিভ গণিত ল্যাব ও অ্যাক্টিভিটি স্টুডিও'
              : 'Interactive Mathematics Laboratory & Activity Arcade'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {language === 'bn'
              ? '৮টি ভিজ্যুয়াল সিমুলেটর, ১৬টি মিশন ও ৩টি গেম'
              : 'Visual Simulators, Guided Missions & Math Games'}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="px-3.5 py-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold">
            {language === 'bn'
              ? `সম্পন্ন মিশন: ${toBnNum(completedCount, language)}/${toBnNum(missions.length, language)}`
              : `Missions: ${completedCount}/${missions.length}`}
          </span>
        </div>
      </div>

      {/* Tool Selector Strip */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTool === tool.id
                ? toolActiveColors[tool.id] || 'bg-cyan-600 text-white shadow-sm'
                : tool.isArcade
                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tool.isArcade && <Gamepad2 className="w-3.5 h-3.5" />}
            {tool.label}
          </button>
        ))}
      </div>

      {/* Guided Hands-On Mission Bar for Simulators */}
      {activeTool !== 'activity-arcade' && activeMission && (
        <div className="p-4 rounded-xl border border-violet-500/30 bg-gradient-to-r from-cyan-500/8 via-violet-500/8 to-emerald-500/8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400">
                <Target className="w-3.5 h-3.5" />
                {language === 'bn' ? 'হাতে-কলমে মিশন' : 'Lab Mission'}{' '}
                {toBnNum((currentMissionIdx % toolMissions.length) + 1, language)}/
                {toBnNum(toolMissions.length, language)}:{' '}
                {language === 'bn' ? activeMission.titleBn : activeMission.title}
              </span>
              {completedMissions[activeMission.id] && (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'সম্পন্ন' : 'Completed'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {language === 'bn' ? activeMission.goalBn : activeMission.goal}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() =>
                setActiveMissionIdx((prev) => ({
                  ...prev,
                  [activeTool]: ((prev[activeTool] ?? 0) + 1) % toolMissions.length,
                }))
              }
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-violet-500"
            >
              {language === 'bn' ? 'অন্য মিশন' : 'Switch Mission'}
            </button>
            <button
              onClick={verifyActiveMission}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl glass-btn-emerald text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {language === 'bn' ? 'ল্যাব যাচাই করো (+২০ XP)' : 'Verify Lab State (+20 XP)'}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVITY ARCADE */}
      {activeTool === 'activity-arcade' && <MathActivityArcade />}

      {/* 7. PLACE VALUE BLOCK BUILDER (Pre-Primary to Grade 4) */}
      {activeTool === 'place-value-blocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'bn' ? 'দশক (১০) ও একক (১) ব্লক বোর্ড' : 'Tens Rods (10) & Ones Cubes (1) Mat'}
              </h3>
              <div className="font-mono text-2xl font-bold text-cyan-500 tabular-nums">
                {toBnNum(pvTens * 10 + pvOnes, language)} = {toBnNum(pvTens * 10, language)} +{' '}
                {toBnNum(pvOnes, language)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tens Column */}
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/25">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-500 mb-3 tabular-nums">
                  <span>
                    {language === 'bn'
                      ? `দশক (Tens): ${toBnNum(pvTens, language)}`
                      : `Tens Rods: ${pvTens}`}
                  </span>
                  <span className="font-mono">= {toBnNum(pvTens * 10, language)}</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[120px] items-end">
                  {Array.from({ length: pvTens }).map((_, tIdx) => (
                    <div key={tIdx} className="flex flex-col gap-0.5 p-1 rounded bg-indigo-500/15 border border-indigo-400/40">
                      {Array.from({ length: 10 }).map((_, bIdx) => (
                        <div key={bIdx} className="w-3.5 h-2 rounded-[2px] bg-indigo-500" />
                      ))}
                    </div>
                  ))}
                  {pvTens === 0 && (
                    <span className="text-xs text-slate-400">
                      {language === 'bn' ? '০টি দশকের দণ্ড' : '0 Tens rods'}
                    </span>
                  )}
                </div>
              </div>

              {/* Ones Column */}
              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/25">
                <div className="flex items-center justify-between text-xs font-semibold text-cyan-500 mb-3 tabular-nums">
                  <span>
                    {language === 'bn'
                      ? `একক (Ones): ${toBnNum(pvOnes, language)}`
                      : `Ones Cubes: ${pvOnes}`}
                  </span>
                  <span className="font-mono">= {toBnNum(pvOnes, language)}</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[120px] items-start content-start">
                  {Array.from({ length: pvOnes }).map((_, oIdx) => (
                    <div
                      key={oIdx}
                      className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-sky-500 border border-cyan-300 shadow-sm"
                    />
                  ))}
                  {pvOnes === 0 && (
                    <span className="text-xs text-slate-400">
                      {language === 'bn' ? '০টি এককের ব্লক' : '0 Ones cubes'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-5">
            <h3 className="text-sm font-semibold">
              {language === 'bn' ? 'ব্লক সংখ্যা পরিবর্তন করো' : 'Adjust Place Value Blocks'}
            </h3>
            <div>
              <label className="flex justify-between text-xs font-medium mb-1.5">
                <span>{language === 'bn' ? 'দশকের ঘর (Tens)' : 'Tens (×10)'}</span>
                <span className="font-mono text-indigo-400 tabular-nums">{toBnNum(pvTens, language)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={9}
                value={pvTens}
                onChange={(e) => setPvTens(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-medium mb-1.5">
                <span>{language === 'bn' ? 'এককের ঘর (Ones)' : 'Ones (×1)'}</span>
                <span className="font-mono text-cyan-500 tabular-nums">{toBnNum(pvOnes, language)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={9}
                value={pvOnes}
                onChange={(e) => setPvOnes(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const total = Math.min(99, pvTens * 10 + pvOnes + 1);
                  setPvTens(Math.floor(total / 10));
                  setPvOnes(total % 10);
                }}
                className="py-2 rounded-xl glass-btn-3d text-white text-xs font-semibold"
              >
                {language === 'bn' ? '+১ একক' : '+1 One'}
              </button>
              <button
                onClick={() => {
                  const total = Math.max(0, pvTens * 10 + pvOnes - 1);
                  setPvTens(Math.floor(total / 10));
                  setPvOnes(total % 10);
                }}
                className="py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {language === 'bn' ? '−১ একক' : '−1 One'}
              </button>
              <button
                onClick={() => {
                  setPvTens((t) => Math.min(9, t + 1));
                }}
                className="py-2 rounded-xl glass-btn-violet text-white text-xs font-semibold"
              >
                {language === 'bn' ? '+১০ দশক' : '+10 Ten'}
              </button>
              <button
                onClick={() => {
                  setPvTens(0);
                  setPvOnes(0);
                }}
                className="py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {language === 'bn' ? 'শূন্য করো' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. AREA & PERIMETER UNIT TILE GRID */}
      {activeTool === 'area-perimeter-grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'bn'
                  ? 'ক্লিকেবল ১×১ একক বর্গ টাইল গ্রিড'
                  : 'Clickable 1×1 Unit Tile Grid (Click tiles to paint or erase)'}
              </h3>
              <div className="flex items-center gap-4 font-mono text-sm tabular-nums">
                <span className="text-emerald-500 font-bold">
                  {language === 'bn'
                    ? `ক্ষেত্রফল: ${toBnNum(gridMetrics.area, language)} ব.একক`
                    : `Area: ${gridMetrics.area} u²`}
                </span>
                <span className="text-amber-500 font-bold">
                  {language === 'bn'
                    ? `পরিসীমা: ${toBnNum(gridMetrics.perimeter, language)} একক`
                    : `Perimeter: ${gridMetrics.perimeter} u`}
                </span>
              </div>
            </div>

            <div
              className="grid gap-1.5 max-w-lg mx-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
            >
              {tileGrid.map((filled, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleGridCell(idx)}
                  aria-label={
                    language === 'bn'
                      ? `টাইলস ${toBnNum(idx + 1, language)}`
                      : `Grid tile ${idx + 1}`
                  }
                  className={`aspect-square rounded-md border transition-all ${
                    filled
                      ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 border-emerald-300 shadow-sm scale-[0.98]'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h3 className="text-sm font-semibold">
              {language === 'bn' ? 'প্রস্তুত আকৃতি ও তুলনা' : 'Shape Presets & Comparison'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyGridPreset('rect3x4')}
                className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-emerald-500"
              >
                {language === 'bn' ? '৩×৪ আয়ত' : '3×4 Rect'}
              </button>
              <button
                onClick={() => applyGridPreset('square4x4')}
                className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-emerald-500"
              >
                {language === 'bn' ? '৪×৪ বর্গ' : '4×4 Square'}
              </button>
              <button
                onClick={() => applyGridPreset('lshape')}
                className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-emerald-500"
              >
                {language === 'bn' ? 'L-আকৃতি' : 'L-Shape'}
              </button>
              <button
                onClick={() => applyGridPreset('clear')}
                className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-rose-500"
              >
                {language === 'bn' ? 'সব মুছুন' : 'Clear Grid'}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'লক্ষ্য করো: সমান ১২টি টাইল দিয়ে আয়তাকার বানালে পরিসীমা ১৪ হয়, কিন্তু ছড়িয়ে রাখলে পরিসীমা বেড়ে যায়!'
                : 'Notice how Area counts the colored square tiles inside, while Perimeter counts only the exposed outside edges!'}
            </p>
          </div>
        </div>
      )}

      {/* 1. NUMBER LINE */}
      {activeTool === 'number-line' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              {language === 'bn' ? 'দিকনির্দেশিত পূর্ণসংখ্যার লাফ প্রদর্শক' : 'Directed Integer Hop Visualizer'}
            </h3>
            <svg viewBox="0 0 600 180" className="w-full h-48">
              <line x1="30" y1="115" x2="570" y2="115" stroke="#475569" strokeWidth="2" />
              {Array.from({ length: 21 }, (_, idx) => idx - 10).map((tick) => {
                const x = 30 + ((tick + 10) / 20) * 540;
                const isOrigin = tick === 0;
                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      y1={isOrigin ? 102 : 108}
                      x2={x}
                      y2={isOrigin ? 128 : 122}
                      stroke={isOrigin ? '#06b6d4' : '#64748b'}
                      strokeWidth={isOrigin ? 2.5 : 1.5}
                    />
                    <text x={x} y="145" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
                      {toBnNum(tick, language)}
                    </text>
                  </g>
                );
              })}
              {(() => {
                const clampedEnd = Math.max(-10, Math.min(10, nlStart + nlDelta));
                const sx = 30 + ((nlStart + 10) / 20) * 540;
                const ex = 30 + ((clampedEnd + 10) / 20) * 540;
                const mx = (sx + ex) / 2;
                return (
                  <>
                    <path
                      d={`M ${sx} 105 Q ${mx} 35 ${ex} 105`}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    />
                    <circle cx={sx} cy={115} r="6" fill="#8b5cf6" />
                    <circle cx={ex} cy={115} r="7" fill="#06b6d4" />
                  </>
                );
              })()}
            </svg>
            <div className="mt-4 text-center font-mono text-lg font-bold text-cyan-500 tabular-nums">
              {toBnNum(nlStart, language)}{' '}
              {nlDelta >= 0
                ? `+ ${toBnNum(nlDelta, language)}`
                : `- ${toBnNum(Math.abs(nlDelta), language)}`}{' '}
              = {toBnNum(nlStart + nlDelta, language)}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-5">
            <div>
              <label className="flex justify-between text-xs font-medium mb-1.5">
                <span>{language === 'bn' ? 'শুরুর অবস্থান' : 'Start Position'}</span>
                <span className="font-mono text-cyan-500 tabular-nums">{toBnNum(nlStart, language)}</span>
              </label>
              <input
                type="range"
                min={-10}
                max={10}
                value={nlStart}
                onChange={(e) => setNlStart(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-medium mb-1.5">
                <span>{language === 'bn' ? 'সরণ / ধাপ' : 'Jump Displacement'}</span>
                <span className="font-mono text-cyan-500 tabular-nums">
                  {nlDelta > 0 ? `+${toBnNum(nlDelta, language)}` : toBnNum(nlDelta, language)}
                </span>
              </label>
              <input
                type="range"
                min={-10}
                max={10}
                value={nlDelta}
                onChange={(e) => setNlDelta(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'ধনাত্মক মান যোগ করলে সংখ্যারেখায় ডানে যায়; ঋণাত্মক মান যোগ করলে বামে যায়।'
                : 'Adding a positive value moves right; adding a negative value moves left along the number line.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. FRACTION & DECIMAL */}
      {activeTool === 'fraction-lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d space-y-6">
            <div>
              <div className="flex justify-between text-xs font-mono mb-2 tabular-nums">
                <span>
                  {language === 'bn' ? 'ভগ্নাংশ ক' : 'Fraction A'}: {toBnNum(numA, language)}/{toBnNum(denA, language)}
                </span>
                <span>
                  {language === 'bn' ? 'দশমিক' : 'Decimal'}: {toBnNum((numA / denA).toFixed(3), language)} ·{' '}
                  {toBnNum(((numA / denA) * 100).toFixed(1), language)}%
                </span>
              </div>
              <div className="grid gap-1 h-14" style={{ gridTemplateColumns: `repeat(${denA}, minmax(0, 1fr))` }}>
                {Array.from({ length: denA }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-md border ${
                      i < numA
                        ? 'bg-gradient-to-b from-cyan-400 to-sky-500 border-cyan-400'
                        : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-2 tabular-nums">
                <span>
                  {language === 'bn' ? 'ভগ্নাংশ খ' : 'Fraction B'}: {toBnNum(numB, language)}/{toBnNum(denB, language)}
                </span>
                <span>
                  {language === 'bn' ? 'দশমিক' : 'Decimal'}: {toBnNum((numB / denB).toFixed(3), language)} ·{' '}
                  {toBnNum(((numB / denB) * 100).toFixed(1), language)}%
                </span>
              </div>
              <div className="grid gap-1 h-14" style={{ gridTemplateColumns: `repeat(${denB}, minmax(0, 1fr))` }}>
                {Array.from({ length: denB }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-md border ${
                      i < numB
                        ? 'bg-gradient-to-b from-violet-400 to-fuchsia-500 border-violet-400'
                        : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center font-mono text-sm tabular-nums">
              {Math.abs(numA / denA - numB / denB) < 1e-6 ? (
                <span className="text-emerald-500 font-bold">
                  {language === 'bn' ? 'সমতুল ভগ্নাংশ!' : 'Equivalent Fractions!'} {toBnNum(numA, language)}/
                  {toBnNum(denA, language)} = {toBnNum(numB, language)}/{toBnNum(denB, language)}
                </span>
              ) : numA / denA > numB / denB ? (
                <span className="text-cyan-500 font-semibold">
                  {toBnNum(numA, language)}/{toBnNum(denA, language)} &gt; {toBnNum(numB, language)}/
                  {toBnNum(denB, language)} ({language === 'bn' ? 'পার্থক্য' : 'Difference'}:{' '}
                  {toBnNum(((numA / denA - numB / denB) * 100).toFixed(1), language)}%)
                </span>
              ) : (
                <span className="text-violet-400 font-semibold">
                  {toBnNum(numA, language)}/{toBnNum(denA, language)} &lt; {toBnNum(numB, language)}/
                  {toBnNum(denB, language)} ({language === 'bn' ? 'পার্থক্য' : 'Difference'}:{' '}
                  {toBnNum(((numB / denB - numA / denA) * 100).toFixed(1), language)}%)
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h3 className="text-sm font-semibold">{language === 'bn' ? 'বার সমন্বয় করুন' : 'Adjust Bars'}</h3>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'লব (ক)' : 'Numerator A'}</span>
                <span className="font-mono tabular-nums">{toBnNum(numA, language)}</span>
              </label>
              <input type="range" min={0} max={denA} value={numA} onChange={(e) => setNumA(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'হর (ক)' : 'Denominator A'}</span>
                <span className="font-mono tabular-nums">{toBnNum(denA, language)}</span>
              </label>
              <input
                type="range"
                min={1}
                max={12}
                value={denA}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDenA(d);
                  if (numA > d) setNumA(d);
                }}
                className="w-full accent-cyan-500"
              />
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'লব (খ)' : 'Numerator B'}</span>
                <span className="font-mono tabular-nums">{toBnNum(numB, language)}</span>
              </label>
              <input type="range" min={0} max={denB} value={numB} onChange={(e) => setNumB(Number(e.target.value))} className="w-full accent-violet-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'হর (খ)' : 'Denominator B'}</span>
                <span className="font-mono tabular-nums">{toBnNum(denB, language)}</span>
              </label>
              <input
                type="range"
                min={1}
                max={12}
                value={denB}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDenB(d);
                  if (numB > d) setNumB(d);
                }}
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. ALGEBRA BALANCE */}
      {activeTool === 'algebra-balance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            <div className="text-center mb-4">
              <span className="text-xl font-bold font-mono text-cyan-500">
                {coefA}x {constB >= 0 ? `+ ${constB}` : `- ${Math.abs(constB)}`} = {rhsC}
              </span>
            </div>
            <svg viewBox="0 0 500 220" className="w-full h-56">
              <polygon points="230,200 270,200 250,165" fill="#334155" />
              <line x1="80" y1="165" x2="420" y2="165" stroke="#06b6d4" strokeWidth="4" />
              <rect x="70" y="155" width="130" height="8" rx="3" fill="#475569" />
              {Array.from({ length: Math.min(6, coefA) }).map((_, i) => (
                <g key={i}>
                  <rect x={76 + i * 21} y="122" width="18" height="30" rx="3" fill="#06b6d4" />
                  <text x={85 + i * 21} y="141" textAnchor="middle" className="fill-white text-[10px] font-mono font-bold">
                    x
                  </text>
                </g>
              ))}
              {constB !== 0 && <rect x="76" y="92" width="60" height="24" rx="4" fill="#6366f1" />}
              {constB !== 0 && (
                <text x="106" y="108" textAnchor="middle" className="fill-white text-[11px] font-mono">
                  {constB > 0 ? `+${constB}` : constB}
                </text>
              )}
              <rect x="300" y="155" width="130" height="8" rx="3" fill="#475569" />
              <rect x="325" y="114" width="80" height="38" rx="5" fill="#10b981" />
              <text x="365" y="138" textAnchor="middle" className="fill-white text-sm font-mono font-bold">
                {rhsC}
              </text>
            </svg>
            <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-xs font-mono tabular-nums">
              {language === 'bn' ? 'ধাপ ১' : 'Step 1'}: {toBnNum(coefA, language)}x ={' '}
              {toBnNum(rhsC - constB, language)} &nbsp;|&nbsp;{' '}
              {language === 'bn' ? 'ধাপ ২' : 'Step 2'}: x ={' '}
              {toBnNum(solvedX.toFixed(2).replace(/\.00$/, ''), language)}
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h3 className="text-sm font-semibold">{language === 'bn' ? 'সমীকরণের চলক ও মান' : 'Equation Parameters'}</h3>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'সহগ (a)' : 'Coefficient (a)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(coefA, language)}</span>
              </label>
              <input type="range" min={1} max={6} value={coefA} onChange={(e) => setCoefA(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'ধ্রুবক (b)' : 'Constant (b)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(constB, language)}</span>
              </label>
              <input type="range" min={-10} max={15} value={constB} onChange={(e) => setConstB(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'ডানপক্ষ (c)' : 'Right Side (c)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(rhsC, language)}</span>
              </label>
              <input type="range" min={-10} max={30} value={rhsC} onChange={(e) => setRhsC(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setRhsC((c) => c - constB);
                  setConstB(0);
                }}
                className="flex-1 py-2 rounded-xl glass-btn-3d text-white text-xs font-semibold"
              >
                {language === 'bn' ? `${toBnNum(coefA, language)}x আলাদা করুন` : `Isolate ${coefA}x`}
              </button>
              <button
                onClick={() => {
                  setCoefA(2);
                  setConstB(4);
                  setRhsC(14);
                }}
                aria-label={language === 'bn' ? 'রিসেট' : 'Reset'}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GEOMETRY BOARD */}
      {activeTool === 'geometry-board' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            <svg viewBox="0 0 380 260" className="w-full h-64 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <polygon
                points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
                fill="rgba(244,63,94,0.16)"
                stroke="#ec4899"
                strokeWidth="2.5"
              />
              <circle cx={ax} cy={ay} r="6" fill="#6366f1" />
              <circle cx={bx} cy={by} r="6" fill="#10b981" />
              <circle cx={cx} cy={cy} r="6" fill="#f43f5e" />
              <text x={ax - 12} y={ay + 18} className="fill-current text-[11px] font-mono">
                A ({toBnNum(geoMetrics.angA, language)}°)
              </text>
              <text x={bx - 16} y={by + 18} className="fill-current text-[11px] font-mono">
                B ({toBnNum(geoMetrics.angB, language)}°)
              </text>
              <text x={cx - 16} y={cy - 10} className="fill-rose-500 text-[11px] font-mono">
                C ({toBnNum(geoMetrics.angC, language)}°)
              </text>
            </svg>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center font-mono text-xs tabular-nums">
              <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/25">
                <div className="text-slate-500">{language === 'bn' ? 'কোণের সমষ্টি' : 'Angle Sum'}</div>
                <div className="font-bold text-emerald-500 text-sm">{toBnNum('180.0', language)}°</div>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/8 border border-cyan-500/25">
                <div className="text-slate-500">{language === 'bn' ? 'পরিসীমা' : 'Perimeter'}</div>
                <div className="font-bold text-cyan-500 text-sm">
                  {toBnNum(geoMetrics.perimeter, language)} {language === 'bn' ? 'একক' : 'u'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/8 border border-rose-500/25">
                <div className="text-slate-500">{language === 'bn' ? 'ক্ষেত্রফল' : 'Area'}</div>
                <div className="font-bold text-rose-500 text-sm">
                  {toBnNum(geoMetrics.area, language)} {language === 'bn' ? 'ব.একক' : 'u²'}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h3 className="text-sm font-semibold">
              {language === 'bn' ? 'ত্রিভুজের শীর্ষবিন্দু সরান' : 'Move Triangle Vertices'}
            </h3>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'শীর্ষ C (X-স্থানাঙ্ক)' : 'Apex C (X-coord)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(cx, language)}</span>
              </label>
              <input type="range" min={40} max={340} value={cx} onChange={(e) => setCx(Number(e.target.value))} className="w-full accent-rose-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'শীর্ষ C (Y-স্থানাঙ্ক)' : 'Apex C (Y-coord)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(cy, language)}</span>
              </label>
              <input type="range" min={25} max={180} value={cy} onChange={(e) => setCy(Number(e.target.value))} className="w-full accent-rose-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'বিন্দু B (X-স্থানাঙ্ক)' : 'Vertex B (X-coord)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(bx, language)}</span>
              </label>
              <input type="range" min={160} max={350} value={bx} onChange={(e) => setBx(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'বিন্দু A (X-স্থানাঙ্ক)' : 'Vertex A (X-coord)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(ax, language)}</span>
              </label>
              <input type="range" min={25} max={150} value={ax} onChange={(e) => setAx(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
          </div>
        </div>
      )}

      {/* 5. COORDINATE PLANE */}
      {activeTool === 'coordinate-plane' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            <div className="text-center font-mono text-sm font-semibold text-cyan-500 mb-3 tabular-nums">
              y = {quadA !== 0 ? `${toBnNum(quadA, language)}x² + ` : ''}
              {toBnNum(slopeM, language)}x{' '}
              {interceptB >= 0
                ? `+ ${toBnNum(interceptB, language)}`
                : `- ${toBnNum(Math.abs(interceptB), language)}`}
            </div>
            <svg viewBox="0 0 320 320" className="w-72 h-72 mx-auto rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              {Array.from({ length: 13 }, (_, i) => i - 6).map((g) => {
                const pos = 160 + g * 24;
                return (
                  <g key={g}>
                    <line x1={pos} y1="10" x2={pos} y2="310" stroke="#334155" strokeOpacity="0.25" />
                    <line x1="10" y1={pos} x2="310" y2={pos} stroke="#334155" strokeOpacity="0.25" />
                  </g>
                );
              })}
              <line x1="10" y1="160" x2="310" y2="160" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="160" y1="10" x2="160" y2="310" stroke="#94a3b8" strokeWidth="1.5" />
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                points={Array.from({ length: 61 }, (_, idx) => {
                  const x = -6 + idx * 0.2;
                  const y = quadA * x * x + slopeM * x + interceptB;
                  const px = 160 + x * 24;
                  const py = 160 - y * 24;
                  return `${px.toFixed(1)},${py.toFixed(1)}`;
                }).join(' ')}
              />
              <circle cx="160" cy={160 - interceptB * 24} r="4.5" fill="#f59e0b" />
            </svg>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4">
            <h3 className="text-sm font-semibold">{language === 'bn' ? 'ফাংশন নিয়ন্ত্রণ' : 'Function Controls'}</h3>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'ঢাল (m)' : 'Linear Slope (m)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(slopeM, language)}</span>
              </label>
              <input type="range" min={-4} max={4} step={0.5} value={slopeM} onChange={(e) => setSlopeM(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'Y-ছেদক (b)' : 'Y-Intercept (b)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(interceptB, language)}</span>
              </label>
              <input type="range" min={-5} max={5} step={0.5} value={interceptB} onChange={(e) => setInterceptB(Number(e.target.value))} className="w-full accent-amber-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1">
                <span>{language === 'bn' ? 'দ্বিঘাত পদ (a)' : 'Quadratic Term (a)'}</span>
                <span className="font-mono tabular-nums">{toBnNum(quadA, language)}</span>
              </label>
              <input type="range" min={-1} max={1} step={0.25} value={quadA} onChange={(e) => setQuadA(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
          </div>
        </div>
      )}

      {/* 6. PROBABILITY SIMULATOR */}
      {activeTool === 'probability-sim' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl border glass-panel-3d">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {language === 'bn'
                  ? 'পরীক্ষামূলক বনাম তাত্ত্বিক ছক্কা বিভাজন'
                  : 'Experimental vs Theoretical Die Distribution'}
              </h3>
              <span className="text-xs font-mono text-fuchsia-500 font-semibold tabular-nums">
                {language === 'bn' ? 'মোট নিক্ষেপ' : 'Total Trials'}: {toBnNum(totalRolls, language)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
                  <XAxis dataKey="face" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[0, 40]} unit="%" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="Experimental" name={language === 'bn' ? 'পরীক্ষামূলক %' : 'Experimental'} fill="#d946ef" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Theoretical" name={language === 'bn' ? 'তাত্ত্বিক %' : 'Theoretical'} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-3">
            <h3 className="text-sm font-semibold">{language === 'bn' ? 'ছক্কা নিক্ষেপ পরীক্ষা' : 'Run Monte Carlo Trials'}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'bn'
                ? 'দেখুন: যত বেশি বার ছক্কা ছোড়া হয়, পরীক্ষামূলক ফলাফল তাত্ত্বিক ১৬.৭%-এর তত কাছাকাছি আসে।'
                : 'Watch the Law of Large Numbers: as total rolls grow, experimental frequencies converge toward the theoretical 16.7% line.'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button onClick={() => rollDice(1)} className="py-2 rounded-xl glass-btn-3d text-white text-xs font-semibold">
                {language === 'bn' ? '১ বার চালুন' : 'Roll 1×'}
              </button>
              <button onClick={() => rollDice(10)} className="py-2 rounded-xl glass-btn-emerald text-white text-xs font-semibold">
                {language === 'bn' ? '১০ বার চালুন' : 'Roll 10×'}
              </button>
              <button onClick={() => rollDice(100)} className="py-2 rounded-xl glass-btn-violet text-white text-xs font-semibold">
                {language === 'bn' ? '১০০ বার চালুন' : 'Roll 100×'}
              </button>
              <button onClick={() => setDieCounts([0, 0, 0, 0, 0, 0])} className="py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                {language === 'bn' ? 'রিসেট' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
