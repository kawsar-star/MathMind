import { DifficultyTier, MathQuestion } from '../types/mathmind';

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_NUMS[Number(d)]);
}

const NAMES_EN = [
  'Nabil',
  'Sumi',
  'Rakib',
  'Mim',
  'Tamim',
  'Nusrat',
  'Sakib',
  'Tania',
  'Rifat',
  'Orpa',
  'Jubayer',
  'Fariha',
  'Mehedi',
  'Raisa',
  'Hasib',
  'Tasnia',
];

const NAMES_BN = [
  'নাবিল',
  'সুমি',
  'রাকিব',
  'মিম',
  'তামিম',
  'নুসরাত',
  'সাকিব',
  'তানিয়া',
  'রিফাত',
  'অর্পা',
  'জুবায়ের',
  'ফারিহা',
  'মেহেদী',
  'রাইসা',
  'হাসিব',
  'তাসনিয়া',
];

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let num = 1;
  let den = 1;
  for (let i = 0; i < r; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return Math.round(num / den);
}

function buildNumericOptions(
  ans: number,
  seed: number,
  allowNegative = false,
  suffixEn = '',
  suffixBn = '',
  decimals = 0
): {
  options: string[];
  optionsBn: string[];
  correctAnswer: string;
  correctAnswerBn: string;
} {
  const fmt = (n: number) => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)));
  const ansStr = fmt(ans);
  const chosen = new Set<string>([ansStr]);
  const belowTarget = seed % 4;
  let belowCount = 0;

  const stepCandidates =
    decimals >= 2
      ? [0.05, 0.1, 0.25, 0.5, 0.15, 0.2, 1.0]
      : decimals === 1
      ? [0.1, 0.2, 0.3, 0.5, 0.4, 0.6, 1.0]
      : Math.abs(ans) >= 100
      ? [10, 20, 5, 15, 30, 1, 25, 40]
      : Math.abs(ans) >= 20
      ? [2, 3, 4, 5, 6, 1, 10, 8]
      : [1, 2, 3, 4, 5, 6];

  for (let i = 0; i < stepCandidates.length && chosen.size < 4; i++) {
    const step = stepCandidates[(i + seed) % stepCandidates.length];
    const tryBelow = belowCount < belowTarget;
    const candNum = tryBelow ? ans - step : ans + step;
    if (!allowNegative && candNum < 0) {
      const altStr = fmt(ans + step);
      if (!chosen.has(altStr)) chosen.add(altStr);
      continue;
    }
    const candStr = fmt(candNum);
    if (!chosen.has(candStr)) {
      chosen.add(candStr);
      if (tryBelow) belowCount++;
    }
  }

  let fallbackOffset = decimals >= 2 ? 0.05 : decimals === 1 ? 0.1 : 1;
  while (chosen.size < 4) {
    const candStr = fmt(ans + fallbackOffset);
    chosen.add(candStr);
    fallbackOffset += decimals >= 2 ? 0.05 : decimals === 1 ? 0.1 : 1;
  }

  const sorted = Array.from(chosen).sort((a, b) => Number(a) - Number(b));
  return {
    options: sorted.map((s) => `${s}${suffixEn}`),
    optionsBn: sorted.map((s) => `${toBn(s)}${suffixBn}`),
    correctAnswer: `${ansStr}${suffixEn}`,
    correctAnswerBn: `${toBn(ansStr)}${suffixBn}`,
  };
}

function buildStringOptions(
  correct: string,
  correctBn: string,
  pool: [string, string][],
  seed: number
): {
  options: string[];
  optionsBn: string[];
  correctAnswer: string;
  correctAnswerBn: string;
} {
  const seenEn = new Set<string>([correct]);
  const seenBn = new Set<string>([correctBn]);
  const pairs: [string, string][] = [[correct, correctBn]];
  for (let i = 0; i < pool.length && pairs.length < 4; i++) {
    const item = pool[(i + seed) % pool.length];
    if (!seenEn.has(item[0]) && !seenBn.has(item[1])) {
      seenEn.add(item[0]);
      seenBn.add(item[1]);
      pairs.push(item);
    }
  }
  let extra = 1;
  while (pairs.length < 4) {
    const candEn = `${correct} (${extra})`;
    const candBn = `${correctBn} (${toBn(extra)})`;
    if (!seenEn.has(candEn) && !seenBn.has(candBn)) {
      seenEn.add(candEn);
      seenBn.add(candBn);
      pairs.push([candEn, candBn]);
    }
    extra++;
  }
  const shift = seed % pairs.length;
  const rotated = [...pairs.slice(shift), ...pairs.slice(0, shift)];
  return {
    options: rotated.map((p) => p[0]),
    optionsBn: rotated.map((p) => p[1]),
    correctAnswer: correct,
    correctAnswerBn: correctBn,
  };
}

function buildFractionOptions(
  num: number,
  den: number,
  seed: number
): {
  options: string[];
  optionsBn: string[];
  correctAnswer: string;
  correctAnswerBn: string;
} {
  const g = gcd(num, den);
  const rn = num / g;
  const rd = den / g;
  const correct = rd === 1 ? `${rn}` : `${rn}/${rd}`;
  const correctBn = toBn(correct);

  const candidates: [string, string][] = [
    [`${rn + 1}/${rd + 1}`, `${toBn(rn + 1)}/${toBn(rd + 1)}`],
    [`${Math.max(1, rn - 1)}/${rd}`, `${toBn(Math.max(1, rn - 1))}/${toBn(rd)}`],
    [`${rn}/${rd + 1}`, `${toBn(rn)}/${toBn(rd + 1)}`],
    [`${rn + 1}/${rd}`, `${toBn(rn + 1)}/${toBn(rd)}`],
    [`${rn}/${Math.max(2, rd - 1)}`, `${toBn(rn)}/${toBn(Math.max(2, rd - 1))}`],
    [`${rn + 2}/${rd + 3}`, `${toBn(rn + 2)}/${toBn(rd + 3)}`],
  ];
  return buildStringOptions(correct, correctBn, candidates, seed);
}

interface Spec {
  domain: string;
  subskill: string;
  grade: string;
  ageBand: string;
  minGradeLevel: number;
  maxGradeLevel: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  difficultyTier: DifficultyTier;
  learningObjective: string;
  prompt: string;
  promptBn: string;
  options: string[];
  optionsBn: string[];
  correctAnswer: string;
  correctAnswerBn: string;
  explanation: string;
  explanationBn: string;
  visualSvg?: MathQuestion['visualSvg'];
  visualData?: MathQuestion['visualData'];
}

function buildQuestion(idx: number, spec: Spec): MathQuestion {
  return {
    id: `q8k_${String(idx + 1).padStart(4, '0')}`,
    domain: spec.domain,
    subskill: spec.subskill,
    ageBand: spec.ageBand,
    grade: spec.grade,
    minGradeLevel: spec.minGradeLevel,
    maxGradeLevel: spec.maxGradeLevel,
    curriculum:
      spec.minGradeLevel <= 5
        ? 'NCTB Bangladesh (Bangla Medium)'
        : 'NCTB Bangladesh (English Version)',
    learningObjective: spec.learningObjective,
    difficulty: spec.difficulty,
    difficultyTier: spec.difficultyTier,
    type: 'mcq',
    prompt: spec.prompt,
    promptBn: spec.promptBn,
    options: spec.options,
    optionsBn: spec.optionsBn,
    correctAnswer: spec.correctAnswer,
    correctAnswerBn: spec.correctAnswerBn,
    explanation: spec.explanation,
    explanationBn: spec.explanationBn,
    estimatedSeconds: spec.difficulty * 8 + 14,
    source: 'curated',
    validationStatus: 'approved',
    ...(spec.visualSvg ? { visualSvg: spec.visualSvg, visualData: spec.visualData } : {}),
  };
}

type GeneratorFn = (k: number) => Spec;

const GENERATORS: GeneratorFn[] = [
  // =========================================================================
  // 1-5: PRE-PRIMARY (Grade 0, maxGradeLevel: 1)
  // =========================================================================
  (k) => {
    const b = 1 + (k % 6);
    const diff = 1 + (Math.floor(k / 6) % 8);
    const a = b + diff;
    const mc = buildNumericOptions(diff, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Compare counts between two visual groups',
      prompt: `There are ${a} blue dots and ${b} green dots. How many MORE blue dots than green dots are there?`,
      promptBn: `এখানে ${toBn(a)}টি নীল বিন্দু এবং ${toBn(b)}টি সবুজ বিন্দু আছে। সবুজের চেয়ে নীল বিন্দু কয়টি বেশি আছে?`,
      ...mc,
      explanation: `${a} − ${b} = ${diff} more blue dots.`,
      explanationBn: `${toBn(a)} − ${toBn(b)} = ${toBn(diff)}টি নীল বিন্দু বেশি।`,
      visualSvg: 'counting_dots',
      visualData: { groupA: a, groupB: b },
    };
  },
  (k) => {
    const start = 8 + (k % 15);
    const back = 1 + (Math.floor(k / 15) % 7);
    const ans = start - back;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Number ordering',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Hop backward on a number line',
      prompt: `Start at ${start} on the number line and jump ${back} steps to the LEFT. What number do you reach?`,
      promptBn: `সংখ্যারেখায় ${toBn(start)} থেকে বামে ${toBn(back)} ঘর পিছনে গেলে কোন সংখ্যায় পৌঁছাবে?`,
      ...mc,
      explanation: `Moving left ${back} steps from ${start} gives ${start} − ${back} = ${ans}.`,
      explanationBn: `${toBn(start)} থেকে ${toBn(back)} ঘর বামে গেলে ${toBn(ans)} হয়।`,
      visualSvg: 'number_line',
      visualData: { start, step: -back },
    };
  },
  (k) => {
    const count = 2 + (k % 9);
    const isTrike = Math.floor(k / 9) % 2 === 0;
    const wheelsEach = isTrike ? 3 : 2;
    const ans = count * wheelsEach;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Count equal groups of wheels',
      prompt: isTrike
        ? `A toy shop has ${count} tricycles (3 wheels each). How many wheels are there in total?`
        : `A park has ${count} bicycles (2 wheels each). How many wheels are there altogether?`,
      promptBn: isTrike
        ? `${toBn(count)}টি তিন-চাকার খেলনা গাড়ির (প্রতিটিতে ৩টি চাকা) মোট কয়টি চাকা আছে?`
        : `${toBn(count)}টি বাইসাইকেলের (প্রতিটিতে ২টি চাকা) মোট কয়টি চাকা আছে?`,
      ...mc,
      explanation: `${count} × ${wheelsEach} = ${ans} wheels.`,
      explanationBn: `${toBn(count)} × ${toBn(wheelsEach)} = ${toBn(ans)}টি চাকা।`,
    };
  },
  (k) => {
    const given = 1 + (k % 18);
    const target = 20;
    const ans = target - given;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Complete number bonds to 20',
      prompt: `You already have ${given} stars. How many more stars do you need to make 20 stars?`,
      promptBn: `তোমার কাছে ${toBn(given)}টি তারা আছে। মোট ২০টি তারা বানাতে আরও কয়টি তারা লাগবে?`,
      ...mc,
      explanation: `20 − ${given} = ${ans}.`,
      explanationBn: `২০ − ${toBn(given)} = ${toBn(ans)}টি তারা লাগবে।`,
    };
  },
  (k) => {
    const pent = 1 + (k % 6);
    const tri = 1 + (Math.floor(k / 6) % 8);
    const ans = pent * 5 + tri * 3;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Geometry',
      subskill: 'Properties of shapes',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Count combined sides of pentagons and triangles',
      prompt: `Count all sides together: ${pent} pentagon(s) (5 sides each) and ${tri} triangle(s) (3 sides each).`,
      promptBn: `${toBn(pent)}টি পঞ্চভুজ (প্রতিটিতে ৫ বাহু) ও ${toBn(tri)}টি ত্রিভুজের (প্রতিটিতে ৩ বাহু) মোট কয়টি বাহু আছে?`,
      ...mc,
      explanation: `(${pent} × 5) + (${tri} × 3) = ${pent * 5} + ${tri * 3} = ${ans}.`,
      explanationBn: `(${toBn(pent)}×৫) + (${toBn(tri)}×৩) = ${toBn(ans)}টি বাহু।`,
    };
  },

  // =========================================================================
  // 6-10: GRADE 1 (minGradeLevel: 1, maxGradeLevel: 2)
  // =========================================================================
  (k) => {
    const a = 2 + (k % 9);
    const b = 3 + (Math.floor(k / 9) % 8);
    const c = 1 + ((k * 3) % 9);
    const ans = a + b + c;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add three single-digit numbers accurately',
      prompt: `Add the three numbers: $${a} + ${b} + ${c} = ?$`,
      promptBn: `তিনটি সংখ্যা যোগ করো: ${toBn(a)} + ${toBn(b)} + ${toBn(c)} = কত?`,
      ...mc,
      explanation: `${a} + ${b} = ${a + b}, then ${a + b} + ${c} = ${ans}.`,
      explanationBn: `${toBn(a)} + ${toBn(b)} = ${toBn(a + b)}, সাথে ${toBn(c)} যোগ করলে ${toBn(ans)}।`,
    };
  },
  (k) => {
    const base = 15 + (k % 60);
    const delta = 3 + (Math.floor(k / 60) % 15);
    const isMore = k % 2 === 0;
    const ans = isMore ? base + delta : base - delta;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Mental mathematics',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find a number K more or K less than a given number',
      prompt: isMore
        ? `What number is ${delta} MORE than ${base}?`
        : `What number is ${delta} LESS than ${base}?`,
      promptBn: isMore
        ? `${toBn(base)}-এর চেয়ে ${toBn(delta)} বেশি কোন সংখ্যা?`
        : `${toBn(base)}-এর চেয়ে ${toBn(delta)} কম কোন সংখ্যা?`,
      ...mc,
      explanation: isMore ? `${base} + ${delta} = ${ans}.` : `${base} − ${delta} = ${ans}.`,
      explanationBn: isMore
        ? `${toBn(base)} + ${toBn(delta)} = ${toBn(ans)}।`
        : `${toBn(base)} − ${toBn(delta)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const half = 3 + (k % 18);
    const total = half * 2;
    const extra = 1 + (Math.floor(k / 18) % 6);
    const ans = half + extra;
    const nIdx = k % NAMES_EN.length;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Word problems',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 3,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find half of an even quantity and add an offset',
      prompt: `${NAMES_EN[nIdx]} has ${total} marbles and gives HALF of them away, then buys ${extra} new marbles. How many marbles does ${NAMES_EN[nIdx]} have now?`,
      promptBn: `${NAMES_BN[nIdx]}-এর কাছে ${toBn(total)}টি মার্বেল ছিল। অর্ধেক দিয়ে দেওয়ার পর সে আরও ${toBn(extra)}টি মার্বেল কিনল। এখন তার কাছে কয়টি মার্বেল আছে?`,
      ...mc,
      explanation: `Half of ${total} is ${half}. Then ${half} + ${extra} = ${ans}.`,
      explanationBn: `${toBn(total)}-এর অর্ধেক ${toBn(half)}; এর সাথে ${toBn(extra)} যোগ করলে ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const n5 = 1 + (k % 6);
    const n2 = 1 + (Math.floor(k / 6) % 7);
    const n1 = 1 + ((k * 3) % 5);
    const ans = n5 * 5 + n2 * 2 + n1;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Measurement',
      subskill: 'Unit conversion',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Count mixed small Taka coins',
      prompt: `Find the total amount: ${n5} coins of 5 Tk, ${n2} coins of 2 Tk, and ${n1} coin(s) of 1 Tk.`,
      promptBn: `মোট কত টাকা হবে: ${toBn(n5)}টি ৫ টাকার কয়েন, ${toBn(n2)}টি ২ টাকার কয়েন এবং ${toBn(n1)}টি ১ টাকার কয়েন?`,
      ...mc,
      explanation: `(${n5}×5) + (${n2}×2) + ${n1} = ${n5 * 5} + ${n2 * 2} + ${n1} = ${ans} Tk.`,
      explanationBn: `মোট = ${toBn(n5 * 5)} + ${toBn(n2 * 2)} + ${toBn(n1)} = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const day = 1 + (k % 18);
    const wait = 2 + (Math.floor(k / 18) % 10);
    const ans = day + wait;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find a future calendar date within the same month',
      prompt: `Today is day ${day} of the month. What date will it be ${wait} days from today?`,
      promptBn: `আজ মাসের ${toBn(day)} তারিখ। আজ থেকে ${toBn(wait)} দিন পর মাসের কত তারিখ হবে?`,
      ...mc,
      explanation: `${day} + ${wait} = ${ans}.`,
      explanationBn: `${toBn(day)} + ${toBn(wait)} = ${toBn(ans)} তারিখ।`,
    };
  },

  // =========================================================================
  // 11-15: GRADE 2 (minGradeLevel: 2, maxGradeLevel: 3)
  // =========================================================================
  (k) => {
    const sub = 12 + (k % 75);
    const ans = 100 - sub;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Subtract 2-digit numbers from 100 mentally',
      prompt: `Subtract from 100: $100 - ${sub} = ?$`,
      promptBn: `১০০ থেকে বিয়োগ করো: ১০০ − ${toBn(sub)} = কত?`,
      ...mc,
      explanation: `100 − ${sub} = ${ans}.`,
      explanationBn: `১০০ − ${toBn(sub)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 1 + (k % 7);
    const b = a + 1 + (Math.floor(k / 7) % 2);
    const c = b + 1 + (k % 2);
    // Ensure a < b < c <= 9 cleanly: let's clamp/step cleanly
    const d1 = 1 + (k % 3); // 1..3
    const d2 = d1 + 1 + (Math.floor(k / 3) % 3); // 2..6
    const d3 = d2 + 1 + (Math.floor(k / 9) % 2); // 3..8
    const askSmallest = k % 2 === 0;
    const ans = askSmallest ? d1 * 100 + d2 * 10 + d3 : d3 * 100 + d2 * 10 + d1;
    void a;
    void b;
    void c;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Place value',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Form the smallest or largest 3-digit number from given digits',
      prompt: askSmallest
        ? `Using the digits ${d3}, ${d1}, ${d2} once each, what is the SMALLEST 3-digit number you can build?`
        : `Using the digits ${d1}, ${d3}, ${d2} once each, what is the LARGEST 3-digit number you can build?`,
      promptBn: askSmallest
        ? `${toBn(d3)}, ${toBn(d1)}, ${toBn(d2)} অঙ্ক তিনটি একবার করে ব্যবহার করে গঠিত সবচেয়ে ছোট ৩ অঙ্কের সংখ্যা কোনটি?`
        : `${toBn(d1)}, ${toBn(d3)}, ${toBn(d2)} অঙ্ক তিনটি একবার করে ব্যবহার করে গঠিত সবচেয়ে বড় ৩ অঙ্কের সংখ্যা কোনটি?`,
      ...mc,
      explanation: askSmallest
        ? `Arrange digits ascending: ${d1}, ${d2}, ${d3} → ${ans}.`
        : `Arrange digits descending: ${d3}, ${d2}, ${d1} → ${ans}.`,
      explanationBn: askSmallest
        ? `ছোট থেকে বড় অঙ্ক সাজালে সংখ্যাটি হয় ${toBn(ans)}।`
        : `বড় থেকে ছোট অঙ্ক সাজালে সংখ্যাটি হয় ${toBn(ans)}।`,
    };
  },
  (k) => {
    const val = 3 + (k % 9);
    const times = 3 + (Math.floor(k / 9) % 7);
    const ans = val * times;
    const repeated = Array(times).fill(val).join(' + ');
    const repeatedBn = Array(times).fill(toBn(val)).join(' + ');
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Relate repeated addition to multiplication',
      prompt: `Find the total using multiplication: $${repeated}$`,
      promptBn: `গুণনের সাহায্যে যোগফল বের করো: ${repeatedBn}`,
      ...mc,
      explanation: `${val} added ${times} times equals ${times} × ${val} = ${ans}.`,
      explanationBn: `${toBn(val)} সংখ্যাটি ${toBn(times)} বার যোগ করলে হয় ${toBn(times)} × ${toBn(val)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const hrs = 1 + (k % 5);
    const mins = 5 + (Math.floor(k / 5) % 11) * 5;
    const ans = hrs * 60 + mins;
    const mc = buildNumericOptions(ans, k, false, ' min', ' মিনিট');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert hours and minutes into total minutes',
      prompt: `Convert ${hrs} hour(s) and ${mins} minutes into total minutes.`,
      promptBn: `${toBn(hrs)} ঘণ্টা ${toBn(mins)} মিনিট সমান মোট কত মিনিট?`,
      ...mc,
      explanation: `1 hour = 60 minutes, so (${hrs} × 60) + ${mins} = ${ans} min.`,
      explanationBn: `১ ঘণ্টা = ৬০ মিনিট; তাই (${toBn(hrs)} × ৬০) + ${toBn(mins)} = ${toBn(ans)} মিনিট।`,
    };
  },
  (k) => {
    const low = 10 + (k % 35) * 2;
    const gap = 2 + (Math.floor(k / 35) % 8);
    const high = low + 2 * gap;
    const mid = low + gap;
    const mc = buildNumericOptions(mid, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find the number exactly halfway between two numbers',
      prompt: `Which number sits EXACTLY halfway between ${low} and ${high}?`,
      promptBn: `${toBn(low)} এবং ${toBn(high)}-এর ঠিক মাঝখানের সংখ্যাটি কোনটি?`,
      ...mc,
      explanation: `(${low} + ${high}) ÷ 2 = ${mid}.`,
      explanationBn: `(${toBn(low)} + ${toBn(high)}) ÷ ২ = ${toBn(mid)}।`,
    };
  },

  // =========================================================================
  // 16-20: GRADE 3 (minGradeLevel: 3, maxGradeLevel: 4)
  // =========================================================================
  (k) => {
    const den = 4 + (k % 7); // 4..10
    const shaded = 1 + (Math.floor(k / 7) % (den - 1));
    const unshaded = den - shaded;
    const mc = buildFractionOptions(unshaded, den, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Equivalent fractions',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Identify the unshaded complementary fraction of a visual bar',
      prompt: `${shaded} out of ${den} equal parts of a bar are shaded. What fraction (in simplest form) is UNSHADED?`,
      promptBn: `একটি দণ্ডের সমান ${toBn(den)} ভাগের ${toBn(shaded)} ভাগ রঙ করা আছে। কত অংশ রঙ করা নেই (লঘিষ্ঠ আকারে)?`,
      ...mc,
      explanation: `Unshaded parts = ${den} − ${shaded} = ${unshaded}, giving ${unshaded}/${den} = ${mc.correctAnswer}.`,
      explanationBn: `রঙবিহীন অংশ = ${toBn(den)} − ${toBn(shaded)} = ${toBn(unshaded)} ভাগ; অর্থাৎ ${mc.correctAnswerBn}।`,
      visualSvg: 'fraction_bar',
      visualData: { numerator: shaded, denominator: den },
    };
  },
  (k) => {
    const liters = 1 + (k % 9);
    const ml = 50 + (Math.floor(k / 9) % 18) * 50;
    const ans = liters * 1000 + ml;
    const mc = buildNumericOptions(ans, k, false, ' ml', ' মিলি');
    return {
      domain: 'Measurement',
      subskill: 'Mass & capacity',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert liters and milliliters to milliliters',
      prompt: `A bottle holds ${liters} liter(s) and ${ml} milliliters of juice. How many milliliters (ml) is that in total?`,
      promptBn: `একটি বোতলে ${toBn(liters)} লিটার ${toBn(ml)} মিলিলিটার জুস আছে। মোট কত মিলিলিটার (মিলি) জুস আছে?`,
      ...mc,
      explanation: `1 L = 1000 ml, so (${liters} × 1000) + ${ml} = ${ans} ml.`,
      explanationBn: `১ লিটার = ১০০০ মিলি; তাই (${toBn(liters)} × ১০০০) + ${toBn(ml)} = ${toBn(ans)} মিলি।`,
    };
  },
  (k) => {
    const divisor = 3 + (k % 9);
    const quotient = 4 + (Math.floor(k / 9) % 11);
    const dividend = divisor * quotient;
    const mc = buildNumericOptions(divisor, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find an unknown divisor in basic division equations',
      prompt: `Find the missing divisor: $${dividend} \\div \\_ = ${quotient}$`,
      promptBn: `খালি ঘরে কত বসবে: ${toBn(dividend)} ÷ ___ = ${toBn(quotient)}?`,
      ...mc,
      explanation: `${dividend} ÷ ${quotient} = ${divisor}.`,
      explanationBn: `${toBn(dividend)} ÷ ${toBn(quotient)} = ${toBn(divisor)}।`,
    };
  },
  (k) => {
    const l = 10 + (k % 20);
    const w = 5 + (Math.floor(k / 20) % 12);
    const rounds = 1 + (k % 2);
    const perim = 2 * (l + w);
    const ans = perim * rounds;
    const mc = buildNumericOptions(ans, k, false, ' m', ' মিটার');
    return {
      domain: 'Geometry',
      subskill: 'Perimeter',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Solve real-world perimeter fencing/running problems',
      prompt: `A rectangular field is ${l} m long and ${w} m wide. A runner goes around it ${rounds} time(s). What total distance did they run?`,
      promptBn: `একটি আয়তাকার মাঠের দৈর্ঘ্য ${toBn(l)} মিটার এবং প্রস্থ ${toBn(w)} মিটার। এক ব্যক্তি মাঠটির চারপাশে ${toBn(rounds)} বার চক্কর দিলে মোট কত মিটার দৌড়াবেন?`,
      ...mc,
      explanation: `Perimeter = 2 × (${l} + ${w}) = ${perim} m. Total for ${rounds} lap(s) = ${ans} m.`,
      explanationBn: `মাঠের পরিসীমা = ২ × (${toBn(l)} + ${toBn(w)}) = ${toBn(perim)} মিটার; ${toBn(rounds)} বারে মোট ${toBn(ans)} মিটার।`,
    };
  },
  (k) => {
    const jan = 12 + (k % 15);
    const feb = 14 + (Math.floor(k / 15) % 12);
    const mar = 10 + ((k * 3) % 14);
    const ans = jan + feb + mar;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Chart interpretation',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Total data across three bar chart categories',
      prompt: `A reading chart shows books read: Jan = ${jan}, Feb = ${feb}, Mar = ${mar}. How many books were read in all 3 months?`,
      promptBn: `পড়ার তালিকায় বইয়ের সংখ্যা: জানুয়ারি = ${toBn(jan)}, ফেব্রুয়ারি = ${toBn(feb)}, মার্চ = ${toBn(mar)}। তিন মাসে মোট কয়টি বই পড়া হয়েছে?`,
      ...mc,
      explanation: `${jan} + ${feb} + ${mar} = ${ans} books.`,
      explanationBn: `${toBn(jan)} + ${toBn(feb)} + ${toBn(mar)} = ${toBn(ans)}টি বই।`,
    };
  },

  // =========================================================================
  // 21-25: GRADE 4 (minGradeLevel: 4, maxGradeLevel: 5)
  // =========================================================================
  (k) => {
    const a = 3 + (k % 10);
    const b = 4 + (Math.floor(k / 10) % 11);
    const ans = lcm(a, b);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Factors & multiples',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the Least Common Multiple (LCM) of two whole numbers',
      prompt: `Find the Least Common Multiple (LCM / ল.সা.গু.) of ${a} and ${b}.`,
      promptBn: `${toBn(a)} এবং ${toBn(b)}-এর ল.সা.গু. (ক্ষুদ্রতম সাধারণ গুণিতক) কত?`,
      ...mc,
      explanation: `The smallest positive multiple shared by ${a} and ${b} is ${ans}.`,
      explanationBn: `${toBn(a)} এবং ${toBn(b)} উভয় দ্বারা বিভাজ্য ক্ষুদ্রতম সংখ্যা ${toBn(ans)}।`,
    };
  },
  (k) => {
    const aInt = 4 + (k % 15);
    const aDec = 5 + ((k * 3) % 5); // .5.. .9
    const bInt = 1 + (Math.floor(k / 15) % 4);
    const bDec = 1 + (k % 4); // .1.. .4
    const valA = aInt + aDec / 10;
    const valB = bInt + bDec / 10;
    const ans = Number((valA - valB).toFixed(1));
    const mc = buildNumericOptions(ans, k, false, '', '', 1);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal operations',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Subtract tenths decimals accurately',
      prompt: `Subtract the decimals: $${valA.toFixed(1)} - ${valB.toFixed(1)} = ?$`,
      promptBn: `দশমিক বিয়োগ করো: ${toBn(valA.toFixed(1))} − ${toBn(valB.toFixed(1))} = কত?`,
      ...mc,
      explanation: `${valA.toFixed(1)} − ${valB.toFixed(1)} = ${ans.toFixed(1)}.`,
      explanationBn: `${toBn(valA.toFixed(1))} থেকে ${toBn(valB.toFixed(1))} বিয়োগ করলে ${toBn(ans.toFixed(1))} হয়।`,
    };
  },
  (k) => {
    const div = [4, 5, 6, 7, 8, 9][k % 6];
    const num = 35 + (Math.floor(k / 6) % 90);
    const rem = num % div;
    const mc = buildNumericOptions(rem, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute division remainders fluently',
      prompt: `What is the remainder when ${num} is divided by ${div}?`,
      promptBn: `${toBn(num)}-কে ${toBn(div)} দিয়ে ভাগ করলে ভাগশেষ কত হবে?`,
      ...mc,
      explanation: `${num} = ${div} × ${Math.floor(num / div)} + ${rem}, so the remainder is ${rem}.`,
      explanationBn: `${toBn(num)} = ${toBn(div)} × ${toBn(Math.floor(num / div))} + ${toBn(rem)}, তাই ভাগশেষ ${toBn(rem)}।`,
    };
  },
  (k) => {
    const side = 3 + (k % 18);
    const perim = 4 * side;
    const area = side * side;
    const mc = buildNumericOptions(area, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Deduce square area from its perimeter',
      prompt: `The perimeter of a square is ${perim} cm. What is its AREA?`,
      promptBn: `একটি বর্গক্ষেত্রের পরিসীমা ${toBn(perim)} সেমি হলে, এর ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Side = ${perim} ÷ 4 = ${side} cm. Area = ${side} × ${side} = ${area} cm².`,
      explanationBn: `এক বাহু = ${toBn(perim)} ÷ ৪ = ${toBn(side)} সেমি; ক্ষেত্রফল = ${toBn(side)} × ${toBn(side)} = ${toBn(area)} বর্গসেমি।`,
    };
  },
  (k) => {
    const hrs = 1 + (k % 6);
    const ans = hrs * 30;
    const mc = buildNumericOptions(ans, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Measure clock hand angles in degrees',
      prompt: `How many degrees does the hour hand of a clock turn in ${hrs} hour(s)? (A full 12-hour turn is 360°.)`,
      promptBn: `একটি ঘড়ির ঘণ্টার কাঁটা ${toBn(hrs)} ঘণ্টায় কত ডিগ্রি কোণ ঘোরে? (১২ ঘণ্টায় ৩৬০° ঘোরে)`,
      ...mc,
      explanation: `360° ÷ 12 = 30° per hour. In ${hrs} hour(s), it turns ${hrs} × 30° = ${ans}°.`,
      explanationBn: `প্রতি ঘণ্টায় ৩০° ঘোরে; তাই ${toBn(hrs)} ঘণ্টায় ${toBn(hrs)} × ৩০° = ${toBn(ans)}° ঘোরে।`,
    };
  },

  // =========================================================================
  // 26-30: GRADE 5 (minGradeLevel: 5, maxGradeLevel: 6)
  // =========================================================================
  (k) => {
    const tenths = 1 + (k % 19); // 0.1..1.9
    const mult = 2 + (Math.floor(k / 19) % 12);
    const dec = tenths / 10;
    const ans = Number((dec * mult).toFixed(1));
    const mc = buildNumericOptions(ans, k, false, '', '', 1);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Multiply a decimal by a whole number',
      prompt: `Multiply: $${dec.toFixed(1)} \\times ${mult} = ?$`,
      promptBn: `গুণ করো: ${toBn(dec.toFixed(1))} × ${toBn(mult)} = কত?`,
      ...mc,
      explanation: `${tenths} × ${mult} = ${tenths * mult}; placing one decimal digit gives ${ans.toFixed(1)}.`,
      explanationBn: `${toBn(tenths)} × ${toBn(mult)} = ${toBn(tenths * mult)}; এক ঘর আগে দশমিক বসালে ${toBn(ans.toFixed(1))} হয়।`,
    };
  },
  (k) => {
    const a = 2 + (k % 6); // 2..7
    const b = a + 1 + (Math.floor(k / 6) % 6); // 3..13
    const mc = buildFractionOptions(a + b, a * b, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Fraction operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Add two unit fractions with unlike denominators',
      prompt: `Add and simplify: $\\frac{1}{${a}} + \\frac{1}{${b}}$`,
      promptBn: `যোগ করে লঘিষ্ঠ আকারে প্রকাশ করো: $\\frac{1}{${a}} + \\frac{1}{${b}}$`,
      ...mc,
      explanation: `1/${a} + 1/${b} = (${b} + ${a}) / (${a * b}) = ${a + b}/${a * b}, simplified to ${mc.correctAnswer}.`,
      explanationBn: `হর ${toBn(a * b)} করে যোগ করলে হয় ${toBn(a + b)}/${toBn(a * b)}, যা সরল করলে ${mc.correctAnswerBn}।`,
    };
  },
  (k) => {
    const price = (3 + (k % 15)) * 100;
    const pct = [10, 15, 20, 25, 30, 40][Math.floor(k / 15) % 6];
    const saved = (price * pct) / 100;
    const mc = buildNumericOptions(saved, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate discount savings in Taka',
      prompt: `A school bag costs ${price} Tk and is offered at a ${pct}% discount. How much money do you SAVE?`,
      promptBn: `${toBn(price)} টাকা দামের একটি স্কুলব্যাগে ${toBn(pct)}% ছাড় দেওয়া হয়েছে। এতে কত টাকা সাশ্রয় হবে?`,
      ...mc,
      explanation: `Savings = ${pct}% of ${price} = ${saved} Tk.`,
      explanationBn: `সাশ্রয় = ${toBn(price)}-এর ${toBn(pct)}% = ${toBn(saved)} টাকা।`,
    };
  },
  (k) => {
    const side = 2 + (k % 11);
    const ans = side * side * side;
    const mc = buildNumericOptions(ans, k, false, ' cm³', ' ঘনসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Volume',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate the volume of a cube given edge length',
      prompt: `What is the volume of a cube with edge length ${side} cm?`,
      promptBn: `${toBn(side)} সেমি ধারবিশিষ্ট একটি ঘনকের আয়তন কত?`,
      ...mc,
      explanation: `Volume = s³ = ${side} × ${side} × ${side} = ${ans} cm³.`,
      explanationBn: `ঘনকের আয়তন = ${toBn(side)} × ${toBn(side)} × ${toBn(side)} = ${toBn(ans)} ঘনসেমি।`,
    };
  },
  (k) => {
    const machines1 = 2 + (k % 6);
    const perMachine = 5 + (Math.floor(k / 6) % 10);
    const toys1 = machines1 * perMachine;
    const machines2 = machines1 + 2 + (k % 5);
    const ans = machines2 * perMachine;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Direct proportion',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve direct proportion production problems',
      prompt: `${machines1} identical machines produce ${toys1} bottles in an hour. How many bottles do ${machines2} machines produce in an hour?`,
      promptBn: `${toBn(machines1)}টি একই ধরনের যন্ত্র ১ ঘণ্টায় ${toBn(toys1)}টি বোতল তৈরি করে। ${toBn(machines2)}টি যন্ত্র ১ ঘণ্টায় কতটি বোতল তৈরি করবে?`,
      ...mc,
      explanation: `1 machine makes ${toys1} ÷ ${machines1} = ${perMachine} bottles/hr. So ${machines2} machines make ${machines2} × ${perMachine} = ${ans}.`,
      explanationBn: `১টি যন্ত্র তৈরি করে ${toBn(perMachine)}টি; অতএব ${toBn(machines2)}টি যন্ত্র তৈরি করবে ${toBn(ans)}টি।`,
    };
  },

  // =========================================================================
  // 31-35: GRADE 6 (minGradeLevel: 6, maxGradeLevel: 8)
  // =========================================================================
  (k) => {
    const a = 2 + (k % 6);
    const b = 1 + (Math.floor(k / 6) % 5);
    const x = 3 + ((k * 3) % 7);
    const y = 1 + ((k * 5) % 4);
    const c = 2 + (k % 8);
    const ans = a * x - b * y + c;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Algebraic expressions',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate two-variable linear algebraic expressions',
      prompt: `Find the value of $${a}x - ${b}y + ${c}$ when $x = ${x}$ and $y = ${y}$.`,
      promptBn: `$x = ${x}$ এবং $y = ${y}$ হলে $${a}x - ${b}y + ${c}$-এর মান কত?`,
      ...mc,
      explanation: `${a}(${x}) − ${b}(${y}) + ${c} = ${a * x} − ${b * y} + ${c} = ${ans}.`,
      explanationBn: `মান বসিয়ে পাই: ${toBn(a * x)} − ${toBn(b * y)} + ${toBn(c)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = -(2 + (k % 8));
    const b = -(1 + (Math.floor(k / 8) % 7));
    const c = 3 + ((k * 3) % 10);
    const ans = a * b + c;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Multiply negative integers and add a positive integer',
      prompt: `Evaluate: $(${a}) \\times (${b}) + ${c}$`,
      promptBn: `মান নির্ণয় করো: $(${a}) \\times (${b}) + ${c}$`,
      ...mc,
      explanation: `Negative times negative is positive: (${a})×(${b}) = ${a * b}. Then ${a * b} + ${c} = ${ans}.`,
      explanationBn: `দুটি ঋণাত্মক সংখ্যার গুণফল ধনাত্মক: ${toBn(a * b)} + ${toBn(c)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const scaleKm = 5 + (k % 12) * 5; // 5..60
    const mapCm = 2 + (Math.floor(k / 12) % 9);
    const ans = scaleKm * mapCm;
    const mc = buildNumericOptions(ans, k, false, ' km', ' কিমি');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Scale drawings',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert map distances to actual distances using scale ratios',
      prompt: `On a map, $1$ cm represents $${scaleKm}$ km. Two towns are $${mapCm}$ cm apart on the map. What is the actual distance?`,
      promptBn: `একটি মানচিত্রে ১ সেমি সমান ${toBn(scaleKm)} কিমি ধরা হয়েছে। মানচিত্রে দুটি শহরের দূরত্ব ${toBn(mapCm)} সেমি হলে প্রকৃত দূরত্ব কত?`,
      ...mc,
      explanation: `Actual distance = ${mapCm} × ${scaleKm} = ${ans} km.`,
      explanationBn: `প্রকৃত দূরত্ব = ${toBn(mapCm)} × ${toBn(scaleKm)} = ${toBn(ans)} কিমি।`,
    };
  },
  (k) => {
    const sides = 5 + (k % 8); // 5..12
    const ans = (sides - 2) * 180;
    const mc = buildNumericOptions(ans, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find the sum of interior angles of an n-sided polygon',
      prompt: `What is the sum of the interior angles of a ${sides}-sided polygon?`,
      promptBn: `একটি ${toBn(sides)}-ভুজের অভ্যন্তরীণ কোণগুলোর সমষ্টি কত ডিগ্রি?`,
      ...mc,
      explanation: `Sum = (n − 2) × 180° = (${sides} − 2) × 180° = ${ans}°.`,
      explanationBn: `অন্তঃস্থ কোণের সমষ্টি $= (n - 2) \\times 180^\\circ = (${sides} - 2) \\times 180^\\circ = ${ans}^\\circ$ (${toBn(ans)}°)।`,
    };
  },
  (k) => {
    const x = 1 + (k % 9);
    const y = 1 + (Math.floor(k / 9) % 9);
    const acrossX = k % 2 === 0;
    const correct = acrossX ? `(${x}, -${y})` : `(-${x}, ${y})`;
    const pool: [string, string][] = [
      [`(${x}, -${y})`, `(${toBn(x)}, -${toBn(y)})`],
      [`(-${x}, ${y})`, `(-${toBn(x)}, ${toBn(y)})`],
      [`(-${x}, -${y})`, `(-${toBn(x)}, -${toBn(y)})`],
      [`(${y}, ${x})`, `(${toBn(y)}, ${toBn(x)})`],
    ];
    const mc = buildStringOptions(correct, toBn(correct), pool, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Transformations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Reflect a coordinate point across the x-axis or y-axis',
      prompt: acrossX
        ? `What are the coordinates of $P(${x}, ${y})$ after reflecting it across the X-axis?`
        : `What are the coordinates of $P(${x}, ${y})$ after reflecting it across the Y-axis?`,
      promptBn: acrossX
        ? `$P(${toBn(x)}, ${toBn(y)})$ বিন্দুটিকে X-অক্ষের সাপেক্ষে প্রতিফলিত (Reflect) করলে নতুন স্থানাঙ্ক কী হবে?`
        : `$P(${toBn(x)}, ${toBn(y)})$ বিন্দুটিকে Y-অক্ষের সাপেক্ষে প্রতিফলিত (Reflect) করলে নতুন স্থানাঙ্ক কী হবে?`,
      ...mc,
      explanation: acrossX
        ? `Reflecting across the x-axis negates y: (${x}, -${y}).`
        : `Reflecting across the y-axis negates x: (-${x}, ${y}).`,
      explanationBn: acrossX
        ? `X-অক্ষের সাপেক্ষে প্রতিফলনে y-এর চিহ্ন বদলায়: ${toBn(correct)}।`
        : `Y-অক্ষের সাপেক্ষে প্রতিফলনে x-এর চিহ্ন বদলায়: ${toBn(correct)}।`,
      visualSvg: 'coordinate_point',
      visualData: { x, y },
    };
  },

  // =========================================================================
  // 36-40: GRADE 7 (minGradeLevel: 7, maxGradeLevel: 9)
  // =========================================================================
  (k) => {
    const cp = (2 + (k % 15)) * 100;
    const lossPct = [5, 10, 12, 15, 20, 25][Math.floor(k / 15) % 6];
    const sp = cp - (cp * lossPct) / 100;
    const mc = buildNumericOptions(lossPct, k, false, '%', '%');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute loss percentage from cost and selling prices',
      prompt: `An item bought for ${cp} Tk is sold for ${sp} Tk. What is the loss percentage?`,
      promptBn: `${toBn(cp)} টাকায় কেনা একটি জিনিস ${toBn(sp)} টাকায় বিক্রি করা হলে শতকরা ক্ষতির হার কত?`,
      ...mc,
      explanation: `Loss = ${cp} − ${sp} = ${cp - sp} Tk. Loss % = (${cp - sp}/${cp}) × 100 = ${lossPct}%.`,
      explanationBn: `ক্ষতি = ${toBn(cp - sp)} টাকা; শতকরা ক্ষতি = ${toBn(lossPct)}%।`,
    };
  },
  (k) => {
    const a = 2 + (k % 5);
    const x = 1 + (Math.floor(k / 5) % 10);
    const b = 1 + ((k * 3) % 7);
    const rhs = a * (x + b);
    const mc = buildNumericOptions(x, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve linear equations involving parentheses',
      prompt: `Solve for $x$: $${a}(x + ${b}) = ${rhs}$`,
      promptBn: `সমাধান করো: $${a}(x + ${b}) = ${rhs}$`,
      ...mc,
      explanation: `Divide both sides by ${a}: x + ${b} = ${x + b}, so x = ${x}.`,
      explanationBn: `উভয় পক্ষকে ${toBn(a)} দিয়ে ভাগ করলে $x + ${b} = ${x + b}$, অতএব $x = ${x}$ (${toBn(x)})।`,
    };
  },
  (k) => {
    const kmh = 18 * (1 + (k % 10)); // 18, 36, ..., 180
    const ms = (kmh * 5) / 18;
    const mc = buildNumericOptions(ms, k, false, ' m/s', ' মি/সে');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Convert speed from km/h to m/s',
      prompt: `Convert a speed of ${kmh} km/h into meters per second (m/s).`,
      promptBn: `ঘণ্টায় ${toBn(kmh)} কিমি বেগকে মিটার/সেকেন্ডে (মি/সে) প্রকাশ করো।`,
      ...mc,
      explanation: `Multiply by 5/18: ${kmh} × (5/18) = ${ms} m/s.`,
      explanationBn: `৫/১৮ দিয়ে গুণ করলে ${toBn(kmh)} × (৫/১৮) = ${toBn(ms)} মি/সে।`,
    };
  },
  (k) => {
    const a = 35 + (k % 45);
    const b = 30 + (Math.floor(k / 45) % 45);
    const ext = a + b;
    const mc = buildNumericOptions(ext, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply the exterior angle theorem of a triangle',
      prompt: `Two interior opposite angles of a triangle measure ${a}° and ${b}°. What is the measure of the exterior angle at the third vertex?`,
      promptBn: `একটি ত্রিভুজের দুটি অন্তঃস্থ বিপরীত কোণ ${toBn(a)}° ও ${toBn(b)}° হলে, তৃতীয় শীর্ষের বহিঃস্থ কোণটির মান কত?`,
      ...mc,
      explanation: `An exterior angle equals the sum of the two opposite interior angles: ${a}° + ${b}° = ${ext}°.`,
      explanationBn: `বহিঃস্থ কোণ = বিপরীত অন্তঃস্থ কোণদ্বয়ের সমষ্টি = ${toBn(a)}° + ${toBn(b)}° = ${toBn(ext)}°।`,
      visualSvg: 'angle_triangle',
      visualData: { angleA: a, angleB: b },
    };
  },
  (k) => {
    const a = 2 + (k % 5);
    const b = 3 + (Math.floor(k / 5) % 5);
    const c = 4 + ((k * 3) % 7);
    const mult = 2 + (k % 6);
    // A:B = a:b, B:C = b:c -> if A = a*mult, find C = c*mult
    const valA = a * mult;
    const ans = c * mult;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Equivalent ratios',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Link consecutive ratios A:B and B:C',
      prompt: `If $A : B = ${a} : ${b}$ and $B : C = ${b} : ${c}$, and $A = ${valA}$, find $C$.`,
      promptBn: `যদি $A : B = ${a} : ${b}$ এবং $B : C = ${b} : ${c}$ হয়, তবে $A = ${valA}$ হলে $C$ কত?`,
      ...mc,
      explanation: `Since B matches (${b}), A : B : C = ${a} : ${b} : ${c}. With A = ${a}×${mult}, C = ${c}×${mult} = ${ans}.`,
      explanationBn: `$A:B:C = ${a}:${b}:${c}$; এখানে $A = ${valA}$ ($${mult}$ গুণ), তাই $C = ${c}\\times ${mult} = ${ans}$ (${toBn(ans)})।`,
    };
  },

  // =========================================================================
  // 41-45: GRADE 8 (minGradeLevel: 8, maxGradeLevel: 10)
  // =========================================================================
  (k) => {
    const m = 3 + (k % 15);
    const ans = m * m - 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find x² + 1/x² given x + 1/x',
      prompt: `If $x + \\frac{1}{x} = ${m}$, find the value of $x^2 + \\frac{1}{x^2}$.`,
      promptBn: `$x + \\frac{1}{x} = ${m}$ হলে, $x^2 + \\frac{1}{x^2}$-এর মান কত?`,
      ...mc,
      explanation: `(x + 1/x)² = x² + 2 + 1/x², so x² + 1/x² = ${m}² − 2 = ${m * m} − 2 = ${ans}.`,
      explanationBn: `$x^2 + \\frac{1}{x^2} = (${m})^2 - 2 = ${m * m} - 2 = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const p = (2 + (k % 10)) * 500; // 1000..5500
    const r = [10, 20][Math.floor(k / 10) % 2];
    // 2-year compound interest: P * ((1 + r/100)^2 - 1)
    const amount = p * (1 + r / 100) * (1 + r / 100);
    const ci = Math.round(amount - p);
    const mc = buildNumericOptions(ci, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute 2-year compound interest',
      prompt: `Find the COMPOUND INTEREST on ${p} Tk at ${r}% per annum for 2 years (compounded yearly).`,
      promptBn: `বার্ষিক ${toBn(r)}% চক্রবৃদ্ধি মুনাফায় ${toBn(p)} টাকার ২ বছরের চক্রবৃদ্ধি মুনাফা কত টাকা?`,
      ...mc,
      explanation: `Amount = ${p} × (1.${r / 10})² = ${Math.round(amount)} Tk. Compound Interest = ${Math.round(amount)} − ${p} = ${ci} Tk.`,
      explanationBn: `সবৃদ্ধিমূল = ${toBn(Math.round(amount))} টাকা; চক্রবৃদ্ধি মুনাফা = ${toBn(ci)} টাকা।`,
    };
  },
  (k) => {
    const d1 = 4 + (k % 12) * 2;
    const d2 = 3 + (Math.floor(k / 12) % 10);
    const ans = (d1 * d2) / 2;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate the area of a rhombus from its diagonals',
      prompt: `The diagonals of a rhombus measure ${d1} cm and ${d2} cm. What is its area?`,
      promptBn: `একটি রম্বসের কর্ণদ্বয় ${toBn(d1)} সেমি ও ${toBn(d2)} সেমি হলে, রম্বসটির ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area of a rhombus = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${ans} cm².`,
      explanationBn: `রম্বসের ক্ষেত্রফল = ½ × কর্ণদ্বয়ের গুণফল = ½ × ${toBn(d1)} × ${toBn(d2)} = ${toBn(ans)} বর্গসেমি।`,
    };
  },
  (k) => {
    const base = 2 + (k % 4); // 2..5
    const e1 = 4 + (Math.floor(k / 4) % 6);
    const e2 = 3 + ((k * 3) % 5);
    const e3 = 2 + (k % 4);
    const ans = e1 + e2 - e3;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Simplify powers using product and quotient rules of exponents',
      prompt: `Simplify $${base}^{${e1}} \\times ${base}^{${e2}} \\div ${base}^{${e3}} = ${base}^{n}$. What is $n$?`,
      promptBn: `$${base}^{${e1}} \\times ${base}^{${e2}} \\div ${base}^{${e3}} = ${base}^{n}$ হলে, $n$-এর মান কত?`,
      ...mc,
      explanation: `Add exponents for multiplication and subtract for division: ${e1} + ${e2} − ${e3} = ${ans}.`,
      explanationBn: `সূচকের নিয়মে $n = ${e1} + ${e2} - ${e3} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const mode = 10 + (k % 15);
    const a = mode - 4;
    const b = mode - 2;
    const c = mode + 3;
    const d = mode + 5;
    const list = [a, mode, c, b, mode, d, mode];
    const mc = buildNumericOptions(mode, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mode & range',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Identify the mode of a numeric dataset',
      prompt: `Find the MODE of the scores: ${list.join(', ')}.`,
      promptBn: `${list.map((v) => toBn(v)).join(', ')} উপাত্তগুলোর প্রচুরক (Mode) কত?`,
      ...mc,
      explanation: `The value ${mode} appears 3 times, more frequently than any other number.`,
      explanationBn: `${toBn(mode)} সংখ্যাটি সর্বাধিক ৩ বার আছে, তাই প্রচুরক হলো ${toBn(mode)}।`,
    };
  },

  // =========================================================================
  // 46-50: GRADE 9 (minGradeLevel: 9, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const m = 2 + (k % 6);
    const xInt = 2 + (Math.floor(k / 6) % 9);
    const c = -(m * xInt); // y = m x - m*xInt => x-intercept is xInt
    const mc = buildNumericOptions(xInt, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find the x-intercept of a linear function',
      prompt: `Find the x-intercept (value of $x$ when $y = 0$) of the line $y = ${m}x ${c}$.`,
      promptBn: `$y = ${m}x ${c}$ সরলরেখাটির x-ছেদক (অর্থাৎ $y = 0$ হলে $x$-এর মান) কত?`,
      ...mc,
      explanation: `Set y = 0: ${m}x ${c} = 0 → ${m}x = ${-c} → x = ${xInt}.`,
      explanationBn: `$y = 0$ বসালে $${m}x = ${-c}$, অতএব $x = ${xInt}$ (${toBn(xInt)})।`,
    };
  },
  (k) => {
    const r = 7 * (1 + (k % 3)); // 7, 14, 21
    const h = 3 + (Math.floor(k / 3) % 15);
    // Total surface area of closed cylinder = 2 * (22/7) * r * (r + h)
    const ans = 2 * 22 * (r / 7) * (r + h);
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Volume',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute total surface area of a closed cylinder',
      prompt: `Taking $\\pi = \\frac{22}{7}$, find the total surface area of a closed cylinder with radius $r = ${r}$ cm and height $h = ${h}$ cm.`,
      promptBn: `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধ ও $${h}$ সেমি উচ্চতা বিশিষ্ট বেলনের সমগ্রতলের ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `TSA = 2πr(r + h) = 2 × (22/7) × ${r} × (${r} + ${h}) = ${ans} cm².`,
      explanationBn: `সমগ্রতলের ক্ষেত্রফল $= 2\\pi r(r+h) = ${ans}$ (${toBn(ans)}) বর্গসেমি।`,
    };
  },
  (k) => {
    const triplets: [number, number, number][] = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
    ];
    const t = triplets[k % triplets.length];
    const scale = 1 + (Math.floor(k / triplets.length) % 6);
    const x1 = 1 + (k % 5);
    const y1 = 1 + ((k * 2) % 5);
    const x2 = x1 + t[0] * scale;
    const y2 = y1 + t[1] * scale;
    const dist = t[2] * scale;
    const mc = buildNumericOptions(dist, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute Euclidean distance between two coordinate points',
      prompt: `Find the distance between the points $A(${x1}, ${y1})$ and $B(${x2}, ${y2})$.`,
      promptBn: `$A(${x1}, ${y1})$ এবং $B(${x2}, ${y2})$ বিন্দু দুটির মধ্যবর্তী দূরত্ব কত একক?`,
      ...mc,
      explanation: `d = √((${x2}−${x1})² + (${y2}−${y1})²) = √(${(t[0] * scale) ** 2} + ${(t[1] * scale) ** 2}) = ${dist}.`,
      explanationBn: `দূরত্ব $= \\sqrt{(${x2 - x1})^2 + (${y2 - y1})^2} = ${dist}$ (${toBn(dist)})।`,
    };
  },
  (k) => {
    const a = 2 + (k % 6);
    const r = 2 + (Math.floor(k / 6) % 2); // 2 or 3
    const n = 4 + (Math.floor(k / 12) % 2); // 4 or 5
    const ans = Math.round((a * (Math.pow(r, n) - 1)) / (r - 1));
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Geometric sequences',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Sum the first n terms of a finite geometric series',
      prompt: `Find the sum of the first ${n} terms of the geometric series: $${a} + ${a * r} + ${a * r * r} + \\dots$`,
      promptBn: `$${a} + ${a * r} + ${a * r * r} + \\dots$ গুণোত্তর ধারাটির প্রথম ${toBn(n)}টি পদের সমষ্টি কত?`,
      ...mc,
      explanation: `Sₙ = a(rⁿ − 1)/(r − 1) = ${a}(${r}^${n} − 1)/(${r} − 1) = ${ans}.`,
      explanationBn: `সমষ্টি $= \\frac{${a}(${r}^{${n}}-1)}{${r}-1} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const coeff = 2 + (k % 10);
    const extra = 1 + (Math.floor(k / 10) % 12);
    const ans = coeff + extra;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply the Pythagorean trigonometric identity sin²θ + cos²θ = 1',
      prompt: `Simplify for any angle $\\theta$: $${coeff}\\sin^2\\theta + ${coeff}\\cos^2\\theta + ${extra}$`,
      promptBn: `যেকোনো কোণ $\\theta$-এর জন্য মান নির্ণয় করো: $${coeff}\\sin^2\\theta + ${coeff}\\cos^2\\theta + ${extra}$`,
      ...mc,
      explanation: `Factor ${coeff}: ${coeff}(sin²θ + cos²θ) + ${extra} = ${coeff}(1) + ${extra} = ${ans}.`,
      explanationBn: `$${coeff}(\\sin^2\\theta + \\cos^2\\theta) + ${extra} = ${coeff}(1) + ${extra} = ${ans}$ (${toBn(ans)})।`,
    };
  },

  // =========================================================================
  // 51-55: GRADE 10 (minGradeLevel: 10, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const r = 7 * (1 + (k % 6)); // 7, 14, 21, 28, 35, 42
    const isHemi = Math.floor(k / 6) % 2 === 0;
    const ans = isHemi ? 3 * 22 * (r / 7) * r : 4 * 22 * (r / 7) * r;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find surface area of a sphere or solid hemisphere',
      prompt: isHemi
        ? `Taking $\\pi = \\frac{22}{7}$, find the total surface area ($3\\pi r^2$) of a solid hemisphere of radius $r = ${r}$ cm.`
        : `Taking $\\pi = \\frac{22}{7}$, find the surface area ($4\\pi r^2$) of a sphere of radius $r = ${r}$ cm.`,
      promptBn: isHemi
        ? `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধের একটি নিরেট অর্ধগোলকের সমগ্রতলের ক্ষেত্রফল ($3\\pi r^2$) কত?`
        : `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধের একটি গোলকের পৃষ্ঠতলের ক্ষেত্রফল ($4\\pi r^2$) কত?`,
      ...mc,
      explanation: isHemi
        ? `3 × (22/7) × ${r}² = ${ans} cm².`
        : `4 × (22/7) × ${r}² = ${ans} cm².`,
      explanationBn: `ক্ষেত্রফল $= ${ans}$ (${toBn(ans)}) বর্গসেমি।`,
    };
  },
  (k) => {
    const a = 1 + (k % 5);
    const b = 2 + (Math.floor(k / 5) % 6);
    const c = 1 + ((k * 3) % 7);
    const r = 1 + (Math.floor(k / 30) % 4);
    const ans = a * r * r + b * r + c;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Algebraic expressions',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply the polynomial remainder theorem',
      prompt: `Find the remainder when $P(x) = ${a === 1 ? '' : a}x^2 + ${b}x + ${c}$ is divided by $(x - ${r})$.`,
      promptBn: `$P(x) = ${a === 1 ? '' : a}x^2 + ${b}x + ${c}$-কে $(x - ${r})$ দিয়ে ভাগ করলে ভাগশেষ কত হবে?`,
      ...mc,
      explanation: `By the Remainder Theorem, remainder = P(${r}) = ${a}(${r}²) + ${b}(${r}) + ${c} = ${ans}.`,
      explanationBn: `ভাগশেষ উপপাদ্য অনুসারে ভাগশেষ $= P(${r}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const green = 2 + (k % 6);
    const yellow = 3 + (Math.floor(k / 6) % 7);
    const total = green + yellow;
    const mc = buildFractionOptions(yellow, total, k);
    return {
      domain: 'Probability',
      subskill: 'Complementary events',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate probability of a complementary event',
      prompt: `A box holds ${green} green pens and ${yellow} yellow pens. If 1 pen is picked at random, what is the probability that it is NOT green?`,
      promptBn: `একটি বাক্সে ${toBn(green)}টি সবুজ ও ${toBn(yellow)}টি হলুদ কলম আছে। দৈবভাবে একটি কলম তুললে সেটি সবুজ না হওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `P(not green) = 1 − ${green}/${total} = ${yellow}/${total} = ${mc.correctAnswer}.`,
      explanationBn: `সবুজ না হওয়ার সম্ভাবনা $= \\frac{${yellow}}{${total}} = ${mc.correctAnswerBn}$।`,
    };
  },
  (k) => {
    const a = 4 + (k % 10);
    const d = 2 + (Math.floor(k / 10) % 7);
    const p = 3;
    const q = 7 + (k % 4);
    const tp = a + (p - 1) * d;
    const tq = a + (q - 1) * d;
    const mc = buildNumericOptions(d, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Determine common difference from two terms of an AP',
      prompt: `In an arithmetic progression, the ${p}rd term is ${tp} and the ${q}th term is ${tq}. Find the common difference $d$.`,
      promptBn: `একটি সমান্তর ধারার ${toBn(p)}-তম পদ ${toBn(tp)} এবং ${toBn(q)}-তম পদ ${toBn(tq)} হলে সাধারণ অন্তর $d$ কত?`,
      ...mc,
      explanation: `d = (T_${q} − T_${p}) / (${q} − ${p}) = (${tq} − ${tp}) / ${q - p} = ${d}.`,
      explanationBn: `সাধারণ অন্তর $d = \\frac{${tq} - ${tp}}{${q - p}} = ${d}$ (${toBn(d)})।`,
    };
  },
  (k) => {
    const x1 = 2 + (k % 8);
    const y1 = 6 + (Math.floor(k / 8) % 9);
    // Construct clean x2 dividing x1*y1: let x2 = x1 * 2, or let k_prod = x1 * y1, pick factor
    const mult = 2 + (k % 4);
    const adjX1 = mult * (2 + (k % 5));
    const adjY1 = 3 + (Math.floor(k / 5) % 8);
    const adjX2 = 2 + (k % 5);
    const ans = mult * adjY1;
    void x1;
    void y1;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Direct proportion',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve inverse variation problems using x₁y₁ = x₂y₂',
      prompt: `$y$ varies INVERSELY with $x$. When $x = ${adjX1}$, $y = ${adjY1}$. Find $y$ when $x = ${adjX2}$.`,
      promptBn: `$y$, $x$-এর সাথে ব্যস্তানুপাতে পরিবর্তিত হয়। যখন $x = ${adjX1}$ তখন $y = ${adjY1}$ হলে, $x = ${adjX2}$ হলে $y$-এর মান কত?`,
      ...mc,
      explanation: `For inverse variation, x₁y₁ = x₂y₂ → (${adjX1})(${adjY1}) = (${adjX2})y₂ → y₂ = ${ans}.`,
      explanationBn: `$x_1 y_1 = x_2 y_2$ অনুযায়ী $y = \\frac{${adjX1} \\times ${adjY1}}{${adjX2}} = ${ans}$ (${toBn(ans)})।`,
    };
  },

  // =========================================================================
  // 56-60: GRADE 11–12 (minGradeLevel: 11, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const n = 4 + (k % 5); // 4..8
    const r = 1 + (Math.floor(k / 5) % (n - 1));
    const a = 1 + ((k * 2) % 3); // 1, 2, 3
    // Coefficient of x^(n-r) in (x + a)^n is nCr(n, r) * a^r
    const ans = nCr(n, r) * Math.pow(a, r);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find specific term coefficients using the Binomial Theorem',
      prompt: `Find the coefficient of $x^{${n - r}}$ in the binomial expansion of $(x + ${a})^{${n}}$.`,
      promptBn: `$(x + ${a})^{${n}}$-এর দ্বিপদী বিস্তৃতিতে $x^{${n - r}}$-এর সহগ কত?`,
      ...mc,
      explanation: `Coefficient = C(${n}, ${r}) × ${a}^${r} = ${nCr(n, r)} × ${Math.pow(a, r)} = ${ans}.`,
      explanationBn: `সহগ $= ^{${n}}C_{${r}} \\cdot ${a}^{${r}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const x = 1 + (k % 7);
    const y = 2 + (Math.floor(k / 7) % 6);
    const z = 1 + ((k * 3) % 5);
    const ans = x * x + y * y + z * z;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute squared Euclidean norm ||v||² of a 3D vector',
      prompt: `Let $\\vec{v} = (${x}, ${y}, ${z})$. Find $\\|\\vec{v}\\|^2$ (the square of its magnitude).`,
      promptBn: `$\\vec{v} = (${x}, ${y}, ${z})$ ভেক্টরের মানের বর্গ $\\|\\vec{v}\\|^2$ কত?`,
      ...mc,
      explanation: `||v||² = ${x}² + ${y}² + ${z}² = ${x * x} + ${y * y} + ${z * z} = ${ans}.`,
      explanationBn: `$\\|\\vec{v}\\|^2 = ${x}^2 + ${y}^2 + ${z}^2 = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a = 1 + (k % 5);
    const b = 1 + (Math.floor(k / 5) % 6);
    const c = 1 + ((k * 3) % 5);
    const d = 1 + (k % 4);
    const x0 = 1 + (Math.floor(k / 20) % 5);
    // f(x) = (ax + b)(cx + d) = ac x^2 + (ad + bc)x + bd => f'(x) = 2ac x + (ad + bc)
    const ans = 2 * a * c * x0 + (a * d + b * c);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Analytical thinking',
      grade: 'Grade 12',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Differentiate a product of two linear factors using the product rule',
      prompt: `If $f(x) = (${a === 1 ? '' : a}x + ${b})(${c === 1 ? '' : c}x + ${d})$, find $f'(${x0})$.`,
      promptBn: `$f(x) = (${a === 1 ? '' : a}x + ${b})(${c === 1 ? '' : c}x + ${d})$ হলে $f'(${x0})$ কত?`,
      ...mc,
      explanation: `By the product rule: f'(x) = ${a}(${c}x+${d}) + ${c}(${a}x+${b}). At x = ${x0}, f'(${x0}) = ${ans}.`,
      explanationBn: `গুণের অন্তরক সূত্রে $f'(${x0}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a = 1 + (k % 4);
    const b = a + 2 + (Math.floor(k / 4) % 5);
    const m = 1 + ((k * 3) % 4);
    const c = 1 + (k % 5);
    // Integral_a^b (2m x + c) dx = [m x^2 + c x]_a^b
    const ans = m * (b * b - a * a) + c * (b - a);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Analytical thinking',
      grade: 'Grade 12',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 5,
      difficultyTier: 'hard',
      learningObjective: 'Evaluate definite integrals over non-zero lower bounds',
      prompt: `Compute the definite integral: $\\int_{${a}}^{${b}} (${2 * m}x + ${c})\\,dx$`,
      promptBn: `মান নির্ণয় করো: $\\int_{${a}}^{${b}} (${2 * m}x + ${c})\\,dx$`,
      ...mc,
      explanation: `Antiderivative is ${m}x² + ${c}x. From ${a} to ${b}: (${m * b * b + c * b}) − (${m * a * a + c * a}) = ${ans}.`,
      explanationBn: `$[${m}x^2 + ${c}x]_{${a}}^{${b}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a11 = 1 + (k % 5);
    const a12 = 1 + (Math.floor(k / 5) % 6);
    const b11 = 2 + ((k * 3) % 5);
    const b21 = 1 + ((k * 7) % 6);
    // (AB)_11 = a11*b11 + a12*b21
    const ans = a11 * b11 + a12 * b21;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the top-left entry of a 2×2 matrix product',
      prompt: `Given $A = \\begin{pmatrix} ${a11} & ${a12} \\\\ 2 & 1 \\end{pmatrix}$ and $B = \\begin{pmatrix} ${b11} & 3 \\\\ ${b21} & 4 \\end{pmatrix}$, find the top-left entry $(AB)_{1,1}$ of $AB$.`,
      promptBn: `$A = \\begin{pmatrix} ${a11} & ${a12} \\\\ 2 & 1 \\end{pmatrix}$ ও $B = \\begin{pmatrix} ${b11} & 3 \\\\ ${b21} & 4 \\end{pmatrix}$ হলে গুণফল $AB$-এর প্রথম সারি ও প্রথম কলামের ভুক্তি $(AB)_{1,1}$ কত?`,
      ...mc,
      explanation: `(AB)₁,₁ = (${a11})(${b11}) + (${a12})(${b21}) = ${a11 * b11} + ${a12 * b21} = ${ans}.`,
      explanationBn: `$(${a11}\\times ${b11}) + (${a12}\\times ${b21}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
];

function createFourth2000Questions(): MathQuestion[] {
  const result: MathQuestion[] = [];
  const seenPrompts = new Set<string>();
  const genCounters = Array(GENERATORS.length).fill(0);

  let guard = 0;
  while (result.length < 2000 && guard < 20000) {
    const gIdx = guard % GENERATORS.length;
    const k = genCounters[gIdx]++;
    guard++;

    const spec = GENERATORS[gIdx](k);
    if (seenPrompts.has(spec.prompt)) continue;
    seenPrompts.add(spec.prompt);
    result.push(buildQuestion(result.length, spec));
  }

  return result;
}

export const GENERATED_FOURTH_2000_QUESTIONS: MathQuestion[] = createFourth2000Questions();
