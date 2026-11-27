import { DifficultyTier, MathQuestion } from '../types/mathmind';

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_NUMS[Number(d)]);
}

const NAMES_EN = [
  'Nabil',
  'Zara',
  'Karim',
  'Sumaiya',
  'Tanvir',
  'Maliha',
  'Ashik',
  'Fariha',
  'Jisan',
  'Neha',
  'Mahin',
  'Sabiha',
  'Sakib',
  'Tania',
  'Imran',
  'Labiba',
];

const NAMES_BN = [
  'নাবিল',
  'জারা',
  'করিম',
  'সুমাইয়া',
  'তানভীর',
  'মালিহা',
  'আশিক',
  'ফারিহা',
  'জিসান',
  'নেহা',
  'মাহিন',
  'সাবিহা',
  'সাকিব',
  'তানিয়া',
  'ইমরান',
  'লাবিবা',
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
    decimals > 0
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

  let fallbackOffset = decimals > 0 ? 0.1 : 1;
  while (chosen.size < 4) {
    const candStr = fmt(ans + fallbackOffset);
    chosen.add(candStr);
    fallbackOffset += decimals > 0 ? 0.1 : 1;
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
}

function buildQuestion(idx: number, spec: Spec): MathQuestion {
  return {
    id: `q4k_${String(idx + 1).padStart(4, '0')}`,
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
  };
}

type GeneratorFn = (k: number) => Spec;

const GENERATORS: GeneratorFn[] = [
  // 1-4: PRE-PRIMARY
  (k) => {
    const start = 5 + (k % 45);
    const ans = start - 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Backward counting',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Count backwards by 1 cleanly',
      prompt: `Count backwards to fill the blank: ${start}, ${start - 1}, ___, ${start - 3}`,
      promptBn: `উল্টো দিকে গুনে শূন্যস্থান পূরণ করো: ${toBn(start)}, ${toBn(start - 1)}, ___, ${toBn(start - 3)}`,
      ...mc,
      explanation: `Subtracting 1 from ${start - 1} gives ${ans}.`,
      explanationBn: `${toBn(start - 1)} থেকে ১ কমালে ${toBn(ans)} হয়।`,
    };
  },
  (k) => {
    const num = 2 + (k % 85);
    const isBefore = k % 2 === 0;
    const ans = isBefore ? num - 1 : num + 1;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Number order',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Identify immediate predecessor and successor',
      prompt: isBefore
        ? `Which number comes IMMEDIATELY BEFORE ${num}?`
        : `Which number comes IMMEDIATELY AFTER ${num}?`,
      promptBn: isBefore
        ? `${toBn(num)}-এর ঠিক আগের সংখ্যাটি কোনটি?`
        : `${toBn(num)}-এর ঠিক পরের সংখ্যাটি কোনটি?`,
      ...mc,
      explanation: isBefore
        ? `The number just before ${num} is ${num} − 1 = ${ans}.`
        : `The number just after ${num} is ${num} + 1 = ${ans}.`,
      explanationBn: isBefore
        ? `${toBn(num)}-এর ঠিক আগের সংখ্যা ${toBn(ans)}।`
        : `${toBn(num)}-এর ঠিক পরের সংখ্যা ${toBn(ans)}।`,
    };
  },
  (k) => {
    const target = 10 + (k % 3) * 5;
    const given = 1 + (k % (target - 1));
    const ans = target - given;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Number bonds',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Complete number bonds to 10, 15, or 20',
      prompt: `How many more do you need to add to ${given} to make ${target}?`,
      promptBn: `${toBn(given)}-এর সাথে আর কত যোগ করলে ${toBn(target)} হবে?`,
      ...mc,
      explanation: `${target} − ${given} = ${ans}, so ${given} + ${ans} = ${target}.`,
      explanationBn: `${toBn(target)} − ${toBn(given)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const tris = 1 + (k % 6);
    const sqs = 1 + (Math.floor(k / 6) % 6);
    const ans = tris * 3 + sqs * 4;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Geometry',
      subskill: '2D shapes & corners',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Count total sides or corners across multiple 2D shapes',
      prompt: `Count all corners together: ${tris} triangle(s) and ${sqs} square(s) have how many corners in total?`,
      promptBn: `${toBn(tris)}টি ত্রিভুজ ও ${toBn(sqs)}টি বর্গক্ষেত্রের মোট কয়টি কোণা (শীর্ষবিন্দু) আছে?`,
      ...mc,
      explanation: `${tris} × 3 + ${sqs} × 4 = ${tris * 3} + ${sqs * 4} = ${ans} corners.`,
      explanationBn: `${toBn(tris)}×৩ + ${toBn(sqs)}×৪ = ${toBn(ans)}টি কোণা।`,
    };
  },

  // 5-8: GRADE 1
  (k) => {
    const tens = 1 + (k % 9);
    const ones = (k * 3 + 1) % 10;
    const ans = tens * 10 + ones;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Tens and ones',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Compose 2-digit numbers from tens and ones',
      prompt: `What number has ${tens} tens and ${ones} ones?`,
      promptBn: `${toBn(tens)}টি দশক ও ${toBn(ones)}টি একক মিলে কোন সংখ্যা হয়?`,
      ...mc,
      explanation: `${tens} tens = ${tens * 10}; ${tens * 10} + ${ones} = ${ans}.`,
      explanationBn: `${toBn(tens)} দশ = ${toBn(tens * 10)}, সাথে ${toBn(ones)} যোগ করলে ${toBn(ans)}।`,
    };
  },
  (k) => {
    const step = [2, 5, 10][k % 3];
    const start = 2 + (Math.floor(k / 3) % 25);
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const ans = seq[2];
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Skip counting',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Skip count by 2s, 5s, and 10s',
      prompt: `Complete the skip-counting pattern: ${seq[0]}, ${seq[1]}, ___, ${seq[3]}`,
      promptBn: `ধারাটি পূরণ করো: ${toBn(seq[0])}, ${toBn(seq[1])}, ___, ${toBn(seq[3])}`,
      ...mc,
      explanation: `Each number increases by ${step}: ${seq[1]} + ${step} = ${ans}.`,
      explanationBn: `প্রতি ধাপে ${toBn(step)} করে বাড়ছে; তাই ${toBn(seq[1])} + ${toBn(step)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const nIdx = k % NAMES_EN.length;
    const base = 3 + (k % 18);
    const askTotal = k % 2 === 0;
    const ans = askTotal ? base * 3 : base * 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Doubles & addition',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Solve doubling word problems',
      prompt: askTotal
        ? `${NAMES_EN[nIdx]} picks ${base} berries. A friend picks DOUBLE that amount. How many berries do they have TOGETHER?`
        : `${NAMES_EN[nIdx]} has ${base} toy cars. A friend has DOUBLE that number. How many toy cars does the friend have?`,
      promptBn: askTotal
        ? `${NAMES_BN[nIdx]} ${toBn(base)}টি ফল সংগ্রহ করলো। তার বন্ধু তার দ্বিগুণ ফল সংগ্রহ করলো। দুজনের মোট কয়টি ফল হলো?`
        : `${NAMES_BN[nIdx]}-এর কাছে ${toBn(base)}টি খেলনা গাড়ি আছে। তার বন্ধুর কাছে এর দ্বিগুণ গাড়ি আছে। বন্ধুর কাছে কয়টি গাড়ি আছে?`,
      ...mc,
      explanation: askTotal
        ? `Double of ${base} is ${base * 2}. Together: ${base} + ${base * 2} = ${ans}.`
        : `Double of ${base} is ${base} + ${base} = ${ans}.`,
      explanationBn: askTotal
        ? `${toBn(base)}-এর দ্বিগুণ ${toBn(base * 2)}; মোট ${toBn(base)} + ${toBn(base * 2)} = ${toBn(ans)}।`
        : `${toBn(base)}-এর দ্বিগুণ = ${toBn(base)} + ${toBn(base)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 6 + (k % 14);
    const b = 5 + ((k * 2) % 13);
    const c = 4 + ((k * 3) % 11);
    const sumL = a + b;
    const missing = sumL - c;
    const mc = buildNumericOptions(missing, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Equation balance',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 3,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Balance addition equations on both sides',
      prompt: `Find the missing number to make both sides equal: $${a} + ${b} = ${c} + ?$`,
      promptBn: `উভয় দিক সমান রাখতে শূন্যস্থানে কী বসবে? $${a} + ${b} = ${c} + ?$`,
      ...mc,
      explanation: `Left side is ${a} + ${b} = ${sumL}. So ? = ${sumL} − ${c} = ${missing}.`,
      explanationBn: `বাম দিক = ${toBn(sumL)}। তাই ? = ${toBn(sumL)} − ${toBn(c)} = ${toBn(missing)}।`,
    };
  },

  // 9-12: GRADE 2
  (k) => {
    const n20 = 1 + (k % 4);
    const n10 = 1 + ((k * 2) % 5);
    const n5 = 1 + (k % 4);
    const ans = n20 * 20 + n10 * 10 + n5 * 5;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Measurement',
      subskill: 'Money (Taka)',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Count mixed Bangladeshi Taka notes',
      prompt: `Count the total money: ${n20} notes of 20 Tk, ${n10} notes of 10 Tk, and ${n5} notes of 5 Tk.`,
      promptBn: `মোট কত টাকা হবে: ${toBn(n20)}টি ২০ টাকার নোট, ${toBn(n10)}টি ১০ টাকার নোট ও ${toBn(n5)}টি ৫ টাকার নোট?`,
      ...mc,
      explanation: `(${n20}×20) + (${n10}×10) + (${n5}×5) = ${n20 * 20} + ${n10 * 10} + ${n5 * 5} = ${ans} Tk.`,
      explanationBn: `মোট = ${toBn(n20 * 20)} + ${toBn(n10 * 10)} + ${toBn(n5 * 5)} = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const weeks = 2 + (k % 8);
    const extraDays = 1 + (Math.floor(k / 8) % 6);
    const ans = weeks * 7 + extraDays;
    const mc = buildNumericOptions(ans, k, false, ' days', ' দিন');
    return {
      domain: 'Measurement',
      subskill: 'Calendar & time',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Convert weeks and days into total days',
      prompt: `A school camp lasts ${weeks} weeks and ${extraDays} days. How many total days is that?`,
      promptBn: `একটি শিক্ষা সফর ${toBn(weeks)} সপ্তাহ ${toBn(extraDays)} দিন স্থায়ী হয়। মোট কত দিন?`,
      ...mc,
      explanation: `1 week = 7 days. Total = (${weeks} × 7) + ${extraDays} = ${ans} days.`,
      explanationBn: `১ সপ্তাহ = ৭ দিন। মোট = (${toBn(weeks)} × ৭) + ${toBn(extraDays)} = ${toBn(ans)} দিন।`,
    };
  },
  (k) => {
    const trays = 3 + (k % 8);
    const perTray = 4 + (Math.floor(k / 8) % 6);
    const loose = 1 + ((k * 3) % 7);
    const ans = trays * perTray + loose;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & addition',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Combine equal groups with extra items',
      prompt: `There are ${trays} trays with ${perTray} cupcakes on each tray, plus ${loose} extra cupcakes on a plate. Total cupcakes?`,
      promptBn: `${toBn(trays)}টি ট্রেতে প্রতিটিতে ${toBn(perTray)}টি করে কাপকেক আছে এবং প্লেটে বাড়তি ${toBn(loose)}টি আছে। মোট কয়টি কাপকেক?`,
      ...mc,
      explanation: `(${trays} × ${perTray}) + ${loose} = ${trays * perTray} + ${loose} = ${ans}.`,
      explanationBn: `(${toBn(trays)} × ${toBn(perTray)}) + ${toBn(loose)} = ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const start = 35 + (k % 45);
    const bought = 12 + ((k * 3) % 25);
    const gave = 10 + ((k * 5) % 20);
    const ans = start + bought - gave;
    const nIdx = k % NAMES_EN.length;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multi-step arithmetic',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Solve two-step addition and subtraction stories',
      prompt: `${NAMES_EN[nIdx]} had ${start} stamps, bought ${bought} more, and gave ${gave} away. How many stamps remain?`,
      promptBn: `${NAMES_BN[nIdx]}-এর কাছে ${toBn(start)}টি ডাকটিকিট ছিল। আরও ${toBn(bought)}টি কিনলো এবং ${toBn(gave)}টি বন্ধুকে দিলো। এখন কয়টি বাকি আছে?`,
      ...mc,
      explanation: `${start} + ${bought} = ${start + bought}; ${start + bought} − ${gave} = ${ans}.`,
      explanationBn: `${toBn(start)} + ${toBn(bought)} − ${toBn(gave)} = ${toBn(ans)}টি।`,
    };
  },

  // 13-17: GRADE 3 (heavily reinforced)
  (k) => {
    const th = 1 + (k % 8);
    const hu = 2 + ((k * 3) % 7);
    const te = 1 + ((k * 5) % 8);
    const on = 1 + ((k * 7) % 9);
    const digits = [th, hu, te, on];
    // Make sure digits are distinct so question is unambiguous
    const d0 = 1 + (k % 9);
    const d1 = ((d0 + 1 + (k % 3)) % 9) + 1;
    const d2 = ((d1 + 2) % 9) + 1;
    const d3 = ((d2 + 2) % 9) + 1;
    const num = d0 * 1000 + d1 * 100 + d2 * 10 + d3;
    const pos = k % 3; // 0: thousands, 1: hundreds, 2: tens
    const targetDigit = [d0, d1, d2][pos];
    const ans = targetDigit * [1000, 100, 10][pos];
    const mc = buildNumericOptions(ans, k + digits[0]);
    return {
      domain: 'Number Sense',
      subskill: '4-digit place value',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Identify the place value of a digit in a 4-digit number',
      prompt: `What is the place value of the digit ${targetDigit} in the number ${num}?`,
      promptBn: `${toBn(num)} সংখ্যাটিতে ${toBn(targetDigit)} অঙ্কটির স্থানীয় মান কত?`,
      ...mc,
      explanation: `In ${num}, ${targetDigit} is in the ${['thousands', 'hundreds', 'tens'][pos]} place, so its value is ${ans}.`,
      explanationBn: `${toBn(num)} সংখ্যায় ${toBn(targetDigit)}-এর স্থানীয় মান ${toBn(ans)}।`,
    };
  },
  (k) => {
    const friends = 3 + (k % 7);
    const each = 4 + (Math.floor(k / 7) % 9);
    const rem = 1 + (k % (friends - 1));
    const total = friends * each + rem;
    const mc = buildNumericOptions(rem, k);
    return {
      domain: 'Number Operations',
      subskill: 'Division with remainder',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find the remainder in fair sharing division',
      prompt: `${total} sweets are shared equally among ${friends} children. How many sweets are LEFT OVER?`,
      promptBn: `${toBn(total)}টি মিষ্টি ${toBn(friends)}জন শিশুর মধ্যে সমানভাবে ভাগ করে দিলে কয়টি মিষ্টি অবশিষ্ট থাকবে?`,
      ...mc,
      explanation: `${total} ÷ ${friends} = ${each} each with remainder ${rem} (since ${friends}×${each} = ${friends * each}).`,
      explanationBn: `${toBn(total)} ÷ ${toBn(friends)} করলে ভাগফল ${toBn(each)} ও ভাগশেষ ${toBn(rem)} থাকে।`,
    };
  },
  (k) => {
    const startH = 8 + (k % 4);
    const startM = [10, 15, 20, 25, 30][k % 5];
    const addM = 25 + ((k * 7) % 55);
    const totalMins = startH * 60 + startM + addM;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const fmtTime = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
    const ansStr = fmtTime(endH, endM);
    const ansBn = toBn(ansStr);
    const pool: [string, string][] = [
      [fmtTime(endH, (endM + 10) % 60), toBn(fmtTime(endH, (endM + 10) % 60))],
      [fmtTime(endH + 1, endM), toBn(fmtTime(endH + 1, endM))],
      [fmtTime(endH, (endM + 20) % 60), toBn(fmtTime(endH, (endM + 20) % 60))],
      [fmtTime(endH - 1, endM), toBn(fmtTime(endH - 1, endM))],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Measurement',
      subskill: 'Elapsed time',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Add minutes to a starting clock time',
      prompt: `A drawing class begins at ${fmtTime(startH, startM)} and lasts ${addM} minutes. At what time does it finish?`,
      promptBn: `একটি অঙ্কন ক্লাস ${toBn(fmtTime(startH, startM))} টায় শুরু হয়ে ${toBn(addM)} মিনিট চলে। ক্লাসটি কয়টায় শেষ হবে?`,
      ...mc,
      explanation: `Adding ${addM} minutes to ${fmtTime(startH, startM)} gives ${ansStr}.`,
      explanationBn: `${toBn(fmtTime(startH, startM))}-এর সাথে ${toBn(addM)} মিনিট যোগ করলে ${ansBn} হয়।`,
    };
  },
  (k) => {
    const den = 3 + (k % 6);
    const mult = 3 + (Math.floor(k / 6) % 12);
    const total = den * mult;
    const num = 1 + (k % (den - 1));
    const ans = num * mult;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Fraction of a quantity',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute a fractional part of a whole collection',
      prompt: `A basket holds ${total} guavas. What is $\\frac{${num}}{${den}}$ of the guavas?`,
      promptBn: `একটি ঝুড়িতে ${toBn(total)}টি পেয়ারা আছে। এর $\\frac{${num}}{${den}}$ অংশ সমান কয়টি পেয়ারা?`,
      ...mc,
      explanation: `(${total} ÷ ${den}) × ${num} = ${mult} × ${num} = ${ans}.`,
      explanationBn: `(${toBn(total)} ÷ ${toBn(den)}) × ${toBn(num)} = ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const mon = 12 + (k % 15);
    const tue = 16 + ((k * 3) % 18);
    const wed = 10 + ((k * 5) % 14);
    const ans = mon + tue + wed;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Reading tables & totals',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Sum categorical data across three days',
      prompt: `A library lent ${mon} books on Sunday, ${tue} on Monday, and ${wed} on Tuesday. Total books lent?`,
      promptBn: `একটি গ্রন্থাগার রবিবারে ${toBn(mon)}টি, সোমবারে ${toBn(tue)}টি এবং মঙ্গলবারে ${toBn(wed)}টি বই ধার দিয়েছে। মোট কতটি বই ধার দেওয়া হয়েছে?`,
      ...mc,
      explanation: `${mon} + ${tue} + ${wed} = ${ans} books.`,
      explanationBn: `${toBn(mon)} + ${toBn(tue)} + ${toBn(wed)} = ${toBn(ans)}টি বই।`,
    };
  },

  // 18-21: GRADE 4
  (k) => {
    const a = 4 + (k % 9);
    const b = a + 2 + (Math.floor(k / 9) % 7);
    const ans = lcm(a, b);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'LCM & multiples',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate the Least Common Multiple (LCM) of two numbers',
      prompt: `Find the Least Common Multiple (LCM) of ${a} and ${b}.`,
      promptBn: `${toBn(a)} এবং ${toBn(b)}-এর লঘিষ্ঠ সাধারণ গুণিতক (ল.সা.গু.) কত?`,
      ...mc,
      explanation: `The smallest positive multiple shared by ${a} and ${b} is ${ans}.`,
      explanationBn: `${toBn(a)} ও ${toBn(b)}-এর ল.সা.গু. = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
    const i1 = k % 10;
    const i2 = i1 + 1 + (Math.floor(k / 10) % 6);
    const ans = primes[i1] + primes[i2];
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Prime numbers',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Identify and sum prime numbers by position',
      prompt: `What is the sum of the ${i1 + 1}th prime number and the ${i2 + 1}th prime number?`,
      promptBn: `${toBn(i1 + 1)}-তম মৌলিক সংখ্যা এবং ${toBn(i2 + 1)}-তম মৌলিক সংখ্যার যোগফল কত?`,
      ...mc,
      explanation: `The ${i1 + 1}th prime is ${primes[i1]} and the ${i2 + 1}th prime is ${primes[i2]}. Sum = ${ans}.`,
      explanationBn: `${toBn(i1 + 1)}-তম মৌলিক সংখ্যা ${toBn(primes[i1])} ও ${toBn(i2 + 1)}-তম ${toBn(primes[i2])}; যোগফল = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const shapes: [string, string, number][] = [
      ['equilateral triangle', 'সমবাহু ত্রিভুজ', 3],
      ['square', 'বর্গক্ষেত্র', 4],
      ['regular pentagon', 'সুষম পঞ্চভুজ', 5],
      ['regular hexagon', 'সুষম ষড়ভুজ', 6],
      ['regular octagon', 'সুষম অষ্টভুজ', 8],
    ];
    const [sEn, sBn, sides] = shapes[k % shapes.length];
    const sideLen = 4 + (Math.floor(k / shapes.length) % 20);
    const ans = sides * sideLen;
    const mc = buildNumericOptions(ans, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Polygon perimeter',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find the perimeter of regular polygons',
      prompt: `Each side of a ${sEn} is ${sideLen} cm long. What is its perimeter?`,
      promptBn: `একটি ${sBn}-এর প্রতিটি বাহুর দৈর্ঘ্য ${toBn(sideLen)} সেমি হলে, এর পরিসীমা কত?`,
      ...mc,
      explanation: `A ${sEn} has ${sides} equal sides: ${sides} × ${sideLen} = ${ans} cm.`,
      explanationBn: `${sBn}-এর ${toBn(sides)}টি সমান বাহু: ${toBn(sides)} × ${toBn(sideLen)} = ${toBn(ans)} সেমি।`,
    };
  },
  (k) => {
    const n1 = 2 + (k % 6);
    const d1 = n1 + 1 + (k % 5);
    const mult = 2 + (Math.floor(k / 6) % 8);
    const d2 = d1 * mult;
    const ans = n1 * mult;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Equivalent fractions',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Scale numerator and denominator proportionally',
      prompt: `Find the missing numerator $?$ in the equivalent fractions: $\\frac{${n1}}{${d1}} = \\frac{?}{${d2}}$`,
      promptBn: `সমতুল ভগ্নাংশে লবের শূন্যস্থানে কী বসবে? $\\frac{${n1}}{${d1}} = \\frac{?}{${d2}}$`,
      ...mc,
      explanation: `Since ${d1} × ${mult} = ${d2}, multiply the numerator too: ${n1} × ${mult} = ${ans}.`,
      explanationBn: `${toBn(d1)} × ${toBn(mult)} = ${toBn(d2)}; তাই ${toBn(n1)} × ${toBn(mult)} = ${toBn(ans)}।`,
    };
  },

  // 22-25: GRADE 5
  (k) => {
    const avg = 72 + (k % 18);
    const s1 = avg - 6 + (k % 4);
    const s2 = avg + 4 - (k % 3);
    const s3 = avg - 2 + (k % 5);
    const s4 = 4 * avg - (s1 + s2 + s3);
    const mc = buildNumericOptions(s4, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Working backward from mean',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find a missing data value given the arithmetic mean',
      prompt: `The average of 4 test scores is ${avg}. Three of the scores are ${s1}, ${s2}, and ${s3}. What is the 4th score?`,
      promptBn: `৪টি পরীক্ষার নম্বরের গড় ${toBn(avg)}। তিনটি নম্বর যথাক্রমে ${toBn(s1)}, ${toBn(s2)} ও ${toBn(s3)} হলে, চতুর্থ নম্বরটি কত?`,
      ...mc,
      explanation: `Total of 4 scores = 4 × ${avg} = ${4 * avg}. Fourth score = ${4 * avg} − (${s1}+${s2}+${s3}) = ${s4}.`,
      explanationBn: `মোট নম্বর = ৪ × ${toBn(avg)} = ${toBn(4 * avg)}। চতুর্থ নম্বর = ${toBn(s4)}।`,
    };
  },
  (k) => {
    const unitPrice = 12 + (k % 19);
    const q1 = 3 + (k % 5);
    const q2 = q1 + 2 + (Math.floor(k / 5) % 6);
    const p1 = unitPrice * q1;
    const ans = unitPrice * q2;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Unitary method',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Apply the unitary method to direct proportion pricing',
      prompt: `If ${q1} notebooks cost ${p1} Tk, how much will ${q2} identical notebooks cost?`,
      promptBn: `${toBn(q1)}টি খাতার দাম ${toBn(p1)} টাকা হলে, অনুরূপ ${toBn(q2)}টি খাতার দাম কত?`,
      ...mc,
      explanation: `1 notebook = ${p1} ÷ ${q1} = ${unitPrice} Tk. So ${q2} notebooks = ${q2} × ${unitPrice} = ${ans} Tk.`,
      explanationBn: `১টি খাতার দাম ${toBn(unitPrice)} টাকা; অতএব ${toBn(q2)}টির দাম ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const tenths = 1 + (k % 9);
    const dec = tenths / 10;
    const whole = 3 + (Math.floor(k / 9) % 14);
    const ans = Math.round(dec * whole * 10) / 10;
    const mc = buildNumericOptions(ans, k, false, '', '', 1);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal multiplication',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Multiply a decimal by a whole number',
      prompt: `Multiply: $${dec.toFixed(1)} \\times ${whole}$`,
      promptBn: `গুণ করো: $${dec.toFixed(1)} \\times ${whole}$`,
      ...mc,
      explanation: `${tenths} × ${whole} = ${tenths * whole}, shifted 1 decimal place = ${ans.toFixed(1)}.`,
      explanationBn: `${toBn(tenths)} × ${toBn(whole)} = ${toBn(tenths * whole)}, এক ঘর আগে দশমিক বসালে ${toBn(ans.toFixed(1))}।`,
    };
  },
  (k) => {
    const l = 4 + (k % 9);
    const w = 3 + (Math.floor(k / 9) % 6);
    const h = 2 + ((k * 3) % 5);
    const ans = l * w * h;
    const mc = buildNumericOptions(ans, k, false, ' cm³', ' ঘন সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Volume of cuboid',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Compute the volume of a rectangular box',
      prompt: `Find the volume of a rectangular box measuring ${l} cm long, ${w} cm wide, and ${h} cm high.`,
      promptBn: `একটি আয়তাকার বাক্সের দৈর্ঘ্য ${toBn(l)} সেমি, প্রস্থ ${toBn(w)} সেমি ও উচ্চতা ${toBn(h)} সেমি হলে, আয়তন কত?`,
      ...mc,
      explanation: `Volume = ${l} × ${w} × ${h} = ${ans} cm³.`,
      explanationBn: `আয়তন = ${toBn(l)} × ${toBn(w)} × ${toBn(h)} = ${toBn(ans)} ঘন সেমি।`,
    };
  },

  // 26-29: GRADE 6
  (k) => {
    const startTemp = -(2 + (k % 14));
    const rise = 5 + (Math.floor(k / 14) % 18);
    const ans = startTemp + rise;
    const mc = buildNumericOptions(ans, k, true, '°C', '°সে.');
    return {
      domain: 'Number Operations',
      subskill: 'Integer operations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 7,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add positive change to a negative integer temperature',
      prompt: `At dawn, the temperature was $${startTemp}^\\circ\\text{C}$. By noon it rose by $${rise}^\\circ\\text{C}$. What is the noon temperature?`,
      promptBn: `ভোরে তাপমাত্রা ছিল $${startTemp}^\\circ$ সে.। দুপুরে তাপমাত্রা $${rise}^\\circ$ সে. বাড়লে, দুপুরের তাপমাত্রা কত?`,
      ...mc,
      explanation: `${startTemp} + ${rise} = ${ans}°C.`,
      explanationBn: `${toBn(startTemp)} + ${toBn(rise)} = ${toBn(ans)}°সে.।`,
    };
  },
  (k) => {
    const a = 2 + (k % 6);
    const b = 3 + ((k * 2) % 5);
    const x = 2 + (Math.floor(k / 6) % 7);
    const y = 1 + ((k * 3) % 6);
    const c = 4 + (k % 5);
    const ans = a * x + b * y - c;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Expression evaluation',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Substitute integer values into a two-variable expression',
      prompt: `Evaluate $${a}x + ${b}y - ${c}$ when $x = ${x}$ and $y = ${y}$.`,
      promptBn: `$x = ${x}$ এবং $y = ${y}$ হলে, $${a}x + ${b}y - ${c}$ রাশিটির মান কত?`,
      ...mc,
      explanation: `${a}(${x}) + ${b}(${y}) − ${c} = ${a * x} + ${b * y} − ${c} = ${ans}.`,
      explanationBn: `${toBn(a * x)} + ${toBn(b * y)} − ${toBn(c)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const p = 2 + (k % 5);
    const q = 3 + ((k * 2) % 5);
    const unit = 15 + (Math.floor(k / 5) % 16) * 5;
    const total = (p + q) * unit;
    const ans = p * unit;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Proportional sharing',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Divide an amount into a given two-part ratio',
      prompt: `Divide ${total} Tk between A and B in the ratio $${p}:${q}$. How much does A receive?`,
      promptBn: `${toBn(total)} টাকা ক ও খ-এর মধ্যে $${p}:${q}$ অনুপাতে ভাগ করে দিলে ক কত টাকা পাবে?`,
      ...mc,
      explanation: `Total parts = ${p} + ${q} = ${p + q}. One part = ${total} ÷ ${p + q} = ${unit}. A gets ${p} × ${unit} = ${ans} Tk.`,
      explanationBn: `মোট ভাগ = ${toBn(p + q)}; ক পায় (${toBn(p)}/${toBn(p + q)}) × ${toBn(total)} = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const x = 2 + (k % 12);
    const y = 3 + (Math.floor(k / 12) % 10);
    const acrossX = k % 2 === 0;
    const ansStr = acrossX ? `(${x}, -${y})` : `(-${x}, ${y})`;
    const ansBn = acrossX ? `(${toBn(x)}, -${toBn(y)})` : `(-${toBn(x)}, ${toBn(y)})`;
    const pool: [string, string][] = [
      [`(-${x}, -${y})`, `(-${toBn(x)}, -${toBn(y)})`],
      [`(${y}, ${x})`, `(${toBn(y)}, ${toBn(x)})`],
      [`(${x}, ${y})`, `(${toBn(x)}, ${toBn(y)})`],
      acrossX ? [`(-${x}, ${y})`, `(-${toBn(x)}, ${toBn(y)})`] : [`(${x}, -${y})`, `(${toBn(x)}, -${toBn(y)})`],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate reflections',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Reflect a coordinate point across the x-axis or y-axis',
      prompt: acrossX
        ? `What is the reflection of point $P(${x}, ${y})$ across the x-axis?`
        : `What is the reflection of point $P(${x}, ${y})$ across the y-axis?`,
      promptBn: acrossX
        ? `$P(${x}, ${y})$ বিন্দুটিকে x-অক্ষের সাপেক্ষে প্রতিফলিত করলে নতুন স্থানাঙ্ক কী হবে?`
        : `$P(${x}, ${y})$ বিন্দুটিকে y-অক্ষের সাপেক্ষে প্রতিফলিত করলে নতুন স্থানাঙ্ক কী হবে?`,
      ...mc,
      explanation: acrossX
        ? `Reflecting across the x-axis keeps x and negates y: (${x}, -${y}).`
        : `Reflecting across the y-axis negates x and keeps y: (-${x}, ${y}).`,
      explanationBn: acrossX
        ? `x-অক্ষে প্রতিফলনে x অপরিবর্তিত থাকে ও y-এর চিহ্ন বদলায়: ${ansBn}।`
        : `y-অক্ষে প্রতিফলনে x-এর চিহ্ন বদলায় ও y অপরিবর্তিত থাকে: ${ansBn}।`,
    };
  },

  // 30-33: GRADE 7
  (k) => {
    const base = [2, 3, 5][k % 3];
    const p1 = 2 + (k % 5);
    const p2 = 2 + ((k * 2) % 4);
    const p3 = 1 + (Math.floor(k / 3) % (p1 + p2 - 1));
    const netExp = p1 + p2 - p3;
    const ans = Math.pow(base, Math.min(netExp, 6));
    const clampedP3 = p1 + p2 - Math.min(netExp, 6);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Laws of exponents',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Simplify and evaluate products and quotients of powers',
      prompt: `Simplify and evaluate: $\\frac{${base}^{${p1}} \\times ${base}^{${p2}}}{${base}^{${clampedP3}}}$`,
      promptBn: `সরল করে মান বের করো: $\\frac{${base}^{${p1}} \\times ${base}^{${p2}}}{${base}^{${clampedP3}}}$`,
      ...mc,
      explanation: `Exponent = ${p1} + ${p2} − ${clampedP3} = ${Math.min(netExp, 6)}, so ${base}^${Math.min(netExp, 6)} = ${ans}.`,
      explanationBn: `সূচক = ${toBn(p1)} + ${toBn(p2)} − ${toBn(clampedP3)} = ${toBn(Math.min(netExp, 6))}; মান = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const cp = 200 + (k % 15) * 50;
    const pct = [10, 15, 20, 25, 30][k % 5];
    const isProfit = k % 2 === 0;
    const sp = isProfit ? cp + (cp * pct) / 100 : cp - (cp * pct) / 100;
    const mc = buildNumericOptions(pct, k, false, '%', '%');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Profit and loss %',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute percentage profit or loss from cost and selling price',
      prompt: `An item bought for ${cp} Tk is sold for ${sp} Tk. What is the ${isProfit ? 'profit' : 'loss'} percentage?`,
      promptBn: `${toBn(cp)} টাকায় কেনা একটি পণ্য ${toBn(sp)} টাকায় বিক্রি করা হলো। শতকরা কত ${isProfit ? 'লাভ' : 'ক্ষতি'} হলো?`,
      ...mc,
      explanation: `Difference = ${Math.abs(sp - cp)} Tk. Percentage = (${Math.abs(sp - cp)} / ${cp}) × 100% = ${pct}%.`,
      explanationBn: `মোট ${isProfit ? 'লাভ' : 'ক্ষতি'} ${toBn(Math.abs(sp - cp))} টাকা; শতকরা হার = ${toBn(pct)}%।`,
    };
  },
  (k) => {
    const p = 1 + (k % 5);
    const q = p + 1 + (Math.floor(k / 5) % 4);
    const totalSum = 180;
    const partVal = totalSum / (p + q);
    // Pick ratios whose sum divides 180 cleanly:
    const validPairs: [number, number][] = [
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 7],
      [3, 7],
      [4, 5],
      [5, 7],
      [7, 11],
      [1, 8],
      [1, 9],
      [3, 5],
      [1, 11],
      [7, 8],
    ];
    const [r1, r2] = validPairs[k % validPairs.length];
    const scale = [1, 1][0];
    const askSupp = k % 2 === 0;
    const baseAngle = askSupp ? 180 : 90;
    // Keep clean division for 90 and 180 by using factors of 90 for complementary
    const compPairs: [number, number][] = [
      [1, 2],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 7],
      [3, 7],
      [4, 5],
      [1, 8],
      [1, 9],
      [1, 14],
      [7, 8],
      [7, 11],
      [1, 17],
      [5, 13],
      [11, 19],
    ];
    const [a1, a2] = askSupp ? validPairs[k % validPairs.length] : compPairs[k % compPairs.length];
    const mult = 1 + (Math.floor(k / 15) % 4);
    const d1 = a1 * mult;
    const d2 = a2 * mult;
    const larger = Math.round((Math.max(a1, a2) / (a1 + a2)) * baseAngle);
    void partVal;
    void scale;
    const mc = buildNumericOptions(larger, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Supplementary & complementary angles',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Determine angle sizes from ratio in supplementary/complementary pairs',
      prompt: `Two ${askSupp ? 'supplementary' : 'complementary'} angles are in the ratio $${d1}:${d2}$. Find the LARGER angle.`,
      promptBn: `দুটি ${askSupp ? 'সম্পূরক' : 'পূরক'} কোণের অনুপাত $${d1}:${d2}$ হলে, বড় কোণটির মান কত ডিগ্রি?`,
      ...mc,
      explanation: `Total = ${baseAngle}°. Larger angle = (${Math.max(a1, a2)} / ${a1 + a2}) × ${baseAngle}° = ${larger}°.`,
      explanationBn: `মোট সমষ্টি ${toBn(baseAngle)}°। বড় কোণ = ${toBn(larger)}°।`,
    };
  },
  (k) => {
    const n = 6 + (k % 15);
    const kind = k % 3; // 0: even, 1: > threshold, 2: multiple of 3
    let fav = 0;
    let descEn = '';
    let descBn = '';
    if (kind === 0) {
      fav = Math.floor(n / 2);
      descEn = 'an EVEN number';
      descBn = 'একটি জোড় সংখ্যা';
    } else if (kind === 1) {
      const thresh = 2 + (k % Math.max(2, n - 3));
      fav = n - thresh;
      descEn = `a number greater than ${thresh}`;
      descBn = `${toBn(thresh)}-এর চেয়ে বড় সংখ্যা`;
    } else {
      fav = Math.floor(n / 3);
      descEn = 'a multiple of 3';
      descBn = '৩-এর গুণিতক';
    }
    const g = gcd(fav, n);
    const num = fav / g;
    const den = n / g;
    const ansStr = `${num}/${den}`;
    const ansBn = `${toBn(num)}/${toBn(den)}`;
    const pool: [string, string][] = [
      [`1/${n}`, `১/${toBn(n)}`],
      [`${Math.min(n - 1, fav + 1)}/${n}`, `${toBn(Math.min(n - 1, fav + 1))}/${toBn(n)}`],
      [`${Math.max(1, fav - 1)}/${n}`, `${toBn(Math.max(1, fav - 1))}/${toBn(n)}`],
      [`${num}/${den + 1}`, `${toBn(num)}/${toBn(den + 1)}`],
      [`${Math.max(1, num - 1)}/${den}`, `${toBn(Math.max(1, num - 1))}/${toBn(den)}`],
      [`${n - fav}/${n}`, `${toBn(n - fav)}/${toBn(n)}`],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Probability',
      subskill: 'Uniform sample spaces',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 10,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute simplified probability on an n-sided spinner',
      prompt: `A fair spinner numbered 1 to ${n} is spun once. What is the probability of landing on ${descEn}?`,
      promptBn: `১ থেকে ${toBn(n)} পর্যন্ত সংখ্যা লেখা একটি সুষম স্পিনার একবার ঘোরানো হলে ${descBn} পাওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `There are ${fav} favorable outcomes out of ${n}: ${fav}/${n} = ${ansStr}.`,
      explanationBn: `মোট ${toBn(n)}টির মধ্যে অনুকূল ফলাফল ${toBn(fav)}টি; সম্ভাবনা = ${ansBn}।`,
    };
  },

  // 34-38: GRADE 8 (heavily reinforced)
  (k) => {
    const P = (2 + (k % 9)) * 500;
    const R = [10, 20][k % 2];
    const rate = R / 100;
    const ci = Math.round(P * Math.pow(1 + rate, 2) - P);
    const mc = buildNumericOptions(ci, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Compound interest',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute 2-year annual compound interest',
      prompt: `Find the compound interest on ${P} Tk at ${R}% per annum for 2 years (compounded annually).`,
      promptBn: `বার্ষিক ${toBn(R)}% চক্রবৃদ্ধি মুনাফায় ${toBn(P)} টাকার ২ বছরের চক্রবৃদ্ধি মুনাফা কত টাকা?`,
      ...mc,
      explanation: `A = ${P} × (1.${R === 10 ? '10' : '20'})² = ${P + ci}. Compound interest = ${P + ci} − ${P} = ${ci} Tk.`,
      explanationBn: `সবৃদ্ধিমূল ${toBn(P + ci)} টাকা; চক্রবৃদ্ধি মুনাফা = ${toBn(P + ci)} − ${toBn(P)} = ${toBn(ci)} টাকা।`,
    };
  },
  (k) => {
    const diff = 2 + (k % 6);
    const prod = 2 + (Math.floor(k / 6) % 10);
    const ans = diff * diff * diff + 3 * diff * prod;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Cubic identities',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Evaluate $a^3 - b^3$ using $(a-b)^3 + 3ab(a-b)$',
      prompt: `If $a - b = ${diff}$ and $ab = ${prod}$, find the value of $a^3 - b^3$.`,
      promptBn: `$a - b = ${diff}$ এবং $ab = ${prod}$ হলে, $a^3 - b^3$-এর মান কত?`,
      ...mc,
      explanation: `a³ − b³ = (a − b)³ + 3ab(a − b) = ${diff}³ + 3(${prod})(${diff}) = ${diff ** 3} + ${3 * prod * diff} = ${ans}.`,
      explanationBn: `$a^3 - b^3 = (${diff})^3 + 3(${prod})(${diff}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const xSol = 3 + (k % 12);
    const a = 2 + (k % 5);
    const b = 1 + ((k * 2) % 7);
    const c = 1 + (Math.floor(k / 5) % 4);
    const rhs = a * (xSol + b) - c * xSol;
    const mc = buildNumericOptions(xSol, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Multi-step linear equations',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Solve linear equations with parentheses and variable on both sides',
      prompt: `Solve for $x$: $${a}(x + ${b}) = ${c}x + ${rhs}$`,
      promptBn: `সমাধান করে $x$-এর মান বের করো: $${a}(x + ${b}) = ${c}x + ${rhs}$`,
      ...mc,
      explanation: `${a}x + ${a * b} = ${c}x + ${rhs} ⇒ ${a - c}x = ${rhs - a * b} ⇒ x = ${xSol}.`,
      explanationBn: `${a}x + ${a * b} = ${c}x + ${rhs} থেকে পাই x = ${toBn(xSol)}।`,
    };
  },
  (k) => {
    const d1 = 6 + (k % 12) * 2;
    const d2 = 8 + (Math.floor(k / 12) % 10) * 2;
    const ans = (d1 * d2) / 2;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গ সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area of rhombus',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute the area of a rhombus from its diagonals',
      prompt: `The diagonals of a rhombus measure ${d1} cm and ${d2} cm. Find its area.`,
      promptBn: `একটি রম্বসের কর্ণ দুটি যথাক্রমে ${toBn(d1)} সেমি ও ${toBn(d2)} সেমি হলে, এর ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area of rhombus = ½ × d₁ × d₂ = ½ × ${d1} × ${d2} = ${ans} cm².`,
      explanationBn: `রম্বসের ক্ষেত্রফল = ½ × কর্ণদ্বয়ের গুণফল = ½ × ${toBn(d1)} × ${toBn(d2)} = ${toBn(ans)} বর্গ সেমি।`,
    };
  },
  (k) => {
    const inter = 4 + (k % 9);
    const nA = inter + 5 + (k % 12);
    const nB = inter + 4 + (Math.floor(k / 9) % 11);
    const ans = nA + nB - inter;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Sets & Venn diagrams',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 11,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Apply inclusion-exclusion principle for two finite sets',
      prompt: `If $n(A) = ${nA}$, $n(B) = ${nB}$, and $n(A \\cap B) = ${inter}$, find $n(A \\cup B)$.`,
      promptBn: `$n(A) = ${nA}$, $n(B) = ${nB}$ এবং $n(A \\cap B) = ${inter}$ হলে, $n(A \\cup B)$-এর মান কত?`,
      ...mc,
      explanation: `n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = ${nA} + ${nB} − ${inter} = ${ans}.`,
      explanationBn: `$n(A \\cup B) = ${nA} + ${nB} - ${inter} = ${ans}$ (${toBn(ans)})।`,
    };
  },

  // 39-44: GRADE 9 (heavily reinforced)
  (k) => {
    const a = 2 + (k % 10);
    const b = 2 + (Math.floor(k / 10) % 9);
    const sq1 = a * a;
    const sq2 = b * b;
    const ans = a + b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Radicals & square roots',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate sums of exact square roots',
      prompt: `Evaluate: $\\sqrt{${sq1}} + \\sqrt{${sq2}}$`,
      promptBn: `মান নির্ণয় করো: $\\sqrt{${sq1}} + \\sqrt{${sq2}}$`,
      ...mc,
      explanation: `√${sq1} = ${a} and √${sq2} = ${b}, so ${a} + ${b} = ${ans}.`,
      explanationBn: `$\\sqrt{${sq1}} = ${a}$ এবং $\\sqrt{${sq2}} = ${b}$; যোগফল = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const bases = [2, 3, 5, 10];
    const b1 = bases[k % bases.length];
    const e1 = 2 + (k % 5);
    const b2 = bases[(k + 1) % bases.length];
    const e2 = 1 + (Math.floor(k / 4) % 4);
    const v1 = Math.pow(b1, e1);
    const v2 = Math.pow(b2, e2);
    const ans = e1 + e2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Logarithms',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate sums of basic logarithms using $\\log_b(b^k) = k$',
      prompt: `Find the value of $\\log_{${b1}}(${v1}) + \\log_{${b2}}(${v2})$.`,
      promptBn: `$\\log_{${b1}}(${v1}) + \\log_{${b2}}(${v2})$-এর মান কত?`,
      ...mc,
      explanation: `Since ${b1}^${e1} = ${v1} and ${b2}^${e2} = ${v2}, log values are ${e1} + ${e2} = ${ans}.`,
      explanationBn: `$\\log_{${b1}}(${v1}) = ${e1}$ এবং $\\log_{${b2}}(${v2}) = ${e2}$; সমষ্টি = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const c1 = 2 + (k % 8);
    const c2 = 2 + (Math.floor(k / 8) % 8);
    const mode = k % 2;
    // mode 0: c1*sin(30°) + c2*cos(60°) = (c1 + c2)/2 (keep c1+c2 even)
    const evenC2 = mode === 0 && (c1 + c2) % 2 !== 0 ? c2 + 1 : c2;
    const ans = mode === 0 ? (c1 + evenC2) / 2 : c1 * 1 + evenC2 * 4; // c1*tan(45) + c2*sec^2(60)
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Geometry',
      subskill: 'Trigonometric values',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate expressions using standard angles (30°, 45°, 60°)',
      prompt:
        mode === 0
          ? `Evaluate: $${c1}\\sin 30^\\circ + ${evenC2}\\cos 60^\\circ$`
          : `Evaluate: $${c1}\\tan 45^\\circ + ${evenC2}\\sec^2 60^\\circ$`,
      promptBn:
        mode === 0
          ? `মান নির্ণয় করো: $${c1}\\sin 30^\\circ + ${evenC2}\\cos 60^\\circ$`
          : `মান নির্ণয় করো: $${c1}\\tan 45^\\circ + ${evenC2}\\sec^2 60^\\circ$`,
      ...mc,
      explanation:
        mode === 0
          ? `sin 30° = 1/2 and cos 60° = 1/2 ⇒ ${c1}(0.5) + ${evenC2}(0.5) = ${ans}.`
          : `tan 45° = 1 and sec 60° = 2 ⇒ ${c1}(1) + ${evenC2}(4) = ${ans}.`,
      explanationBn:
        mode === 0
          ? `$\\sin 30^\\circ = \\frac{1}{2}$ ও $\\cos 60^\\circ = \\frac{1}{2}$ বসালে মান ${toBn(ans)}।`
          : `$\\tan 45^\\circ = 1$ ও $\\sec 60^\\circ = 2$ বসালে মান ${toBn(ans)}।`,
    };
  },
  (k) => {
    const r = 2 + (k % 9);
    const h = 3 + (Math.floor(k / 9) % 12);
    const coef = r * r * h;
    const ansStr = `${coef}π`;
    const ansBn = `${toBn(coef)}π`;
    const pool: [string, string][] = [
      [`${2 * r * h}π`, `${toBn(2 * r * h)}π`],
      [`${r * h}π`, `${toBn(r * h)}π`],
      [`${coef + r}π`, `${toBn(coef + r)}π`],
      [`${Math.max(2, coef - r)}π`, `${toBn(Math.max(2, coef - r))}π`],
      [`${coef * 2}π`, `${toBn(coef * 2)}π`],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Measurement',
      subskill: 'Volume of cylinder',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Express the volume of a right circular cylinder in terms of $\\pi$',
      prompt: `A right circular cylinder has radius $r = ${r}\\text{ cm}$ and height $h = ${h}\\text{ cm}$. What is its volume in terms of $\\pi$?`,
      promptBn: `একটি সমবৃত্তভূমিক বেলনের ব্যাসার্ধ $r = ${r}$ সেমি ও উচ্চতা $h = ${h}$ সেমি হলে, $\\pi$-এর মাধ্যমে এর আয়তন কত?`,
      ...mc,
      explanation: `V = πr²h = π × ${r}² × ${h} = ${coef}π cm³.`,
      explanationBn: `আয়তন $V = \\pi r^2 h = \\pi \\times ${r}^2 \\times ${h} = ${coef}\\pi$ (${ansBn}) ঘন সেমি।`,
    };
  },
  (k) => {
    const targetSum = 2 + (k % 11); // 2..12
    const ways = 6 - Math.abs(7 - targetSum);
    const g = gcd(ways, 36);
    const num = ways / g;
    const den = 36 / g;
    const ansStr = `${num}/${den}`;
    const ansBn = `${toBn(num)}/${toBn(den)}`;
    const pool: [string, string][] = [
      [`1/6`, `১/৬`],
      [`1/12`, `১/১২`],
      [`${Math.min(35, ways + 1)}/36`, `${toBn(Math.min(35, ways + 1))}/৩৬`],
      [`${Math.max(1, ways - 1)}/36`, `${toBn(Math.max(1, ways - 1))}/৩৬`],
      [`1/9`, `১/৯`],
      [`5/36`, `৫/৩৬`],
    ];
    // Include specific variant with colored/numbered dice so prompts exceed 11 unique texts
    const diceColorsEn = ['red and blue', 'white and green', 'two fair 6-sided', 'two standard'];
    const diceColorsBn = ['একটি লাল ও একটি নীল', 'একটি সাদা ও একটি সবুজ', 'দুটি সুষম ছয়-তলের', 'দুটি সাধারণ'];
    const cIdx = Math.floor(k / 11) % diceColorsEn.length;
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Probability',
      subskill: 'Compound events (two dice)',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Determine probability of a sum on two rolled dice',
      prompt: `You roll ${diceColorsEn[cIdx]} dice (numbered 1–6). What is the probability that the sum is ${targetSum}?`,
      promptBn: `${diceColorsBn[cIdx]} ছক্কা (১–৬) একসাথে নিক্ষেপ করলে দুটি সংখ্যার যোগফল ${toBn(targetSum)} হওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `There are ${ways} pairs summing to ${targetSum} out of 36 outcomes: ${ways}/36 = ${ansStr}.`,
      explanationBn: `৩৬টি সম্ভাব্য ফলাফলের মধ্যে ${toBn(ways)}টির যোগফল ${toBn(targetSum)}; সম্ভাবনা = ${ansBn}।`,
    };
  },
  (k) => {
    const a = 2 + (k % 9);
    const d = 2 + ((k * 3) % 6);
    const n = 6 + (Math.floor(k / 9) % 10);
    const ans = (n * (2 * a + (n - 1) * d)) / 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic series sum',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Sum the first n terms of an arithmetic progression',
      prompt: `Find the sum of the first ${n} terms of the arithmetic series: $${a} + ${a + d} + ${a + 2 * d} + \\dots$`,
      promptBn: `$${a} + ${a + d} + ${a + 2 * d} + \\dots$ সমান্তর ধারাটির প্রথম ${toBn(n)}টি পদের সমষ্টি কত?`,
      ...mc,
      explanation: `Sₙ = n/2 [2a + (n−1)d] = ${n}/2 × [${2 * a} + ${(n - 1) * d}] = ${ans}.`,
      explanationBn: `সমষ্টি $S_n = \\frac{${n}}{2}[2(${a}) + (${n - 1})(${d})] = ${ans}$ (${toBn(ans)})।`,
    };
  },

  // 45-47: GRADE 10
  (k) => {
    const a = 1 + (k % 4);
    const b = 3 + ((k * 2) % 9);
    const c = 1 + (Math.floor(k / 4) % 8);
    const disc = b * b - 4 * a * c;
    const mc = buildNumericOptions(disc, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Quadratic discriminant',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the discriminant $b^2 - 4ac$ of a quadratic equation',
      prompt: `Find the discriminant ($b^2 - 4ac$) of $${a === 1 ? '' : a}x^2 + ${b}x + ${c} = 0$.`,
      promptBn: `$${a === 1 ? '' : a}x^2 + ${b}x + ${c} = 0$ দ্বিঘাত সমীকরণের নিশ্চায়ক ($b^2 - 4ac$) কত?`,
      ...mc,
      explanation: `b² − 4ac = (${b})² − 4(${a})(${c}) = ${b * b} − ${4 * a * c} = ${disc}.`,
      explanationBn: `নিশ্চায়ক = $(${b})^2 - 4(${a})(${c}) = ${disc}$ (${toBn(disc)})।`,
    };
  },
  (k) => {
    const w1 = 2 + (k % 5);
    const w2 = 3 + ((k * 2) % 4);
    const w3 = 5 - ((w1 + w2) % 5) + 5; // guarantees sum w1+w2+w3 = 10 or 15? Wait let's make sum clean 10:
    const f1 = 2 + (k % 4);
    const f2 = 3 + ((k * 2) % 4);
    const f3 = 10 - f1 - f2; // >= 2 when f1<=5, f2<=6 -> wait max f1=5, f2=6 => 10-11=-1! Fix:
    const n1 = 2 + (k % 3); // 2..4
    const n2 = 2 + ((k * 2) % 3); // 2..4
    const n3 = 10 - n1 - n2; // 2..6
    const v1 = 10 + (k % 6) * 2;
    const v2 = v1 + 10;
    const v3 = v1 + 20;
    void w1;
    void w2;
    void w3;
    void f1;
    void f2;
    void f3;
    const total = n1 * v1 + n2 * v2 + n3 * v3;
    const mean = total / 10;
    const mc = buildNumericOptions(mean, k, false, '', '', Number.isInteger(mean) ? 0 : 1);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Weighted mean',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the mean from a frequency table',
      prompt: `In a frequency table of 10 scores: value ${v1} occurs ${n1} times, ${v2} occurs ${n2} times, and ${v3} occurs ${n3} times. Find the mean.`,
      promptBn: `১০টি উপাত্তের গণসংখ্যা সারণিতে ${toBn(v1)} আছে ${toBn(n1)} বার, ${toBn(v2)} আছে ${toBn(n2)} বার এবং ${toBn(v3)} আছে ${toBn(n3)} বার। গাণিতিক গড় কত?`,
      ...mc,
      explanation: `Sum = (${v1}×${n1}) + (${v2}×${n2}) + (${v3}×${n3}) = ${total}. Mean = ${total} ÷ 10 = ${mean}.`,
      explanationBn: `মোট সমষ্টি ${toBn(total)}; গড় = ${toBn(total)} ÷ ১০ = ${toBn(mean)}।`,
    };
  },
  (k) => {
    const x1 = 1 + (k % 8);
    const y1 = 2 + ((k * 2) % 7);
    const slope = 1 + (Math.floor(k / 8) % 6);
    const run = 2 + (k % 5);
    const x2 = x1 + run;
    const y2 = y1 + slope * run;
    const mc = buildNumericOptions(slope, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate slope',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate the slope (gradient) between two coordinate points',
      prompt: `Find the slope of the line passing through $A(${x1}, ${y1})$ and $B(${x2}, ${y2})$.`,
      promptBn: `$A(${x1}, ${y1})$ এবং $B(${x2}, ${y2})$ বিন্দু দুটি দিয়ে যাওয়া সরলরেখার ঢাল (Slope) কত?`,
      ...mc,
      explanation: `m = (y₂ − y₁) / (x₂ − x₁) = (${y2} − ${y1}) / (${x2} − ${x1}) = ${slope * run} / ${run} = ${slope}.`,
      explanationBn: `ঢাল $m = \\frac{${y2} - ${y1}}{${x2} - ${x1}} = ${slope}$ (${toBn(slope)})।`,
    };
  },

  // 48-50: GRADE 11 & GRADE 12 (Higher Secondary NCTB)
  (k) => {
    const n = 5 + (k % 10);
    const r = 2 + (Math.floor(k / 10) % 3); // 2, 3, or 4
    const actualR = Math.min(r, n - 1);
    const ans = nCr(n, actualR);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Probability',
      subskill: 'Combinations (nCr)',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute combinations $^nC_r$ in counting problems',
      prompt: `In how many ways can a committee of ${actualR} students be chosen from ${n} candidates?`,
      promptBn: `${toBn(n)}জন প্রার্থীর মধ্য থেকে ${toBn(actualR)}জনের একটি কমিটি কতভাবে গঠন করা যায়?`,
      ...mc,
      explanation: `Using combinations: C(${n}, ${actualR}) = ${ans}.`,
      explanationBn: `সমাবেশ সূত্র $^{${n}}C_{${actualR}} = ${ans}$ (${toBn(ans)}) উপায়ে।`,
    };
  },
  (k) => {
    const a = 2 + (k % 8);
    const d = 2 + (Math.floor(k / 8) % 7);
    const b = 1 + ((k * 3) % 6);
    const c = 1 + ((k * 5) % 5);
    const det = a * d - b * c;
    const mc = buildNumericOptions(det, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: '2x2 Matrix determinant',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate the determinant of a $2 \\times 2$ matrix',
      prompt: `Find the determinant of the $2 \\times 2$ matrix $\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$.`,
      promptBn: `$\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$ ম্যাট্রিক্সটির নির্ণায়ক (Determinant) কত?`,
      ...mc,
      explanation: `det = (${a})(${d}) − (${b})(${c}) = ${a * d} − ${b * c} = ${det}.`,
      explanationBn: `নির্ণায়ক = $(${a}\\times ${d}) - (${b}\\times ${c}) = ${det}$ (${toBn(det)})।`,
    };
  },
  (k) => {
    const a = 1 + (k % 4);
    const b = 2 + ((k * 2) % 6);
    const c = 1 + (k % 5);
    const x0 = 1 + (Math.floor(k / 4) % 6);
    const ans = 3 * a * x0 * x0 + 2 * b * x0 + c;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Polynomial derivatives',
      grade: 'Grade 12',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Differentiate a cubic polynomial and evaluate $f\'(x_0)$',
      prompt: `If $f(x) = ${a === 1 ? '' : a}x^3 + ${b}x^2 + ${c}x$, find the derivative $f'(${x0})$.`,
      promptBn: `$f(x) = ${a === 1 ? '' : a}x^3 + ${b}x^2 + ${c}x$ হলে, $f'(${x0})$-এর মান কত?`,
      ...mc,
      explanation: `f'(x) = ${3 * a}x² + ${2 * b}x + ${c}. At x = ${x0}, f'(${x0}) = ${ans}.`,
      explanationBn: `$f'(x) = ${3 * a}x^2 + ${2 * b}x + ${c}$; $x = ${x0}$ বসালে মান ${toBn(ans)}।`,
    };
  },
];

function createMore2000Questions(): MathQuestion[] {
  const result: MathQuestion[] = [];
  const seenPrompts = new Set<string>();
  const genCounters = Array(GENERATORS.length).fill(0);

  let guard = 0;
  while (result.length < 2000 && guard < 15000) {
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

export const GENERATED_MORE_2000_QUESTIONS: MathQuestion[] = createMore2000Questions();
