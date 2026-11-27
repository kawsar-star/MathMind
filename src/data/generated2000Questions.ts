import { DifficultyTier, MathQuestion } from '../types/mathmind';

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_NUMS[Number(d)]);
}

const NAMES_EN = [
  'Rafi',
  'Mina',
  'Tariq',
  'Nadia',
  'Sadia',
  'Farhan',
  'Tasnim',
  'Ritu',
  'Siam',
  'Rifa',
  'Arif',
  'Nusrat',
  'Tahmid',
  'Amina',
  'Hasan',
  'Lamia',
];

const NAMES_BN = [
  'রাফি',
  'মিনা',
  'তারিক',
  'নাদিয়া',
  'সাদিয়া',
  'ফারহান',
  'তাসনিম',
  'রিতু',
  'সিয়াম',
  'রিফা',
  'আরিফ',
  'নুসরাত',
  'তাহমিদ',
  'আমিনা',
  'হাসান',
  'লামিয়া',
];

const ITEMS_EN = [
  'mangoes',
  'apples',
  'marbles',
  'pencils',
  'books',
  'stickers',
  'oranges',
  'flowers',
  'chocolates',
  'candies',
];

const ITEMS_BN = [
  'আম',
  'আপেল',
  'মার্বেল',
  'পেন্সিল',
  'বই',
  'স্টিকার',
  'কমলা',
  'ফুল',
  'চকলেট',
  'মিষ্টি',
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
      const altNum = ans + step;
      const altStr = fmt(altNum);
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
  const seen = new Set<string>([correct]);
  const pairs: [string, string][] = [[correct, correctBn]];
  for (let i = 0; i < pool.length && pairs.length < 4; i++) {
    const item = pool[(i + seed) % pool.length];
    if (!seen.has(item[0])) {
      seen.add(item[0]);
      pairs.push(item);
    }
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
  visualSvg?: MathQuestion['visualSvg'];
  visualData?: MathQuestion['visualData'];
}

function buildQuestion(idx: number, spec: Spec): MathQuestion {
  return {
    id: `q2k_${String(idx + 1).padStart(4, '0')}`,
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
    const a = 1 + (k % 9);
    const b = 1 + ((k * 3 + 1) % 6);
    const ans = a + b;
    const itemIdx = k % ITEMS_EN.length;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add two small groups within 15',
      prompt: `Count together: ${a} ${ITEMS_EN[itemIdx]} and ${b} more ${ITEMS_EN[itemIdx]} make how many?`,
      promptBn: `একসাথে গোনো: ${toBn(a)}টি ${ITEMS_BN[itemIdx]} এবং আরও ${toBn(b)}টি ${ITEMS_BN[itemIdx]} মিলে মোট কয়টি হয়?`,
      ...mc,
      explanation: `${a} + ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} + ${toBn(b)} = ${toBn(ans)}টি।`,
      ...(a <= 8 && b <= 6 ? { visualSvg: 'counting_dots', visualData: { groupA: a, groupB: b } } : {}),
    };
  },
  (k) => {
    const total = 4 + (k % 8);
    const eat = 1 + ((k * 2) % (total - 1));
    const ans = total - eat;
    const nIdx = k % NAMES_EN.length;
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
      learningObjective: 'Subtract within 12 using everyday items',
      prompt: `${NAMES_EN[nIdx]} had ${total} balloons, and ${eat} flew away. How many balloons are left?`,
      promptBn: `${NAMES_BN[nIdx]}-এর কাছে ${toBn(total)}টি বেলুন ছিল, ${toBn(eat)}টি উড়ে গেল। আর কয়টি রইল?`,
      ...mc,
      explanation: `${total} − ${eat} = ${ans}.`,
      explanationBn: `${toBn(total)} - ${toBn(eat)} = ${toBn(ans)}টি বাকি রইল।`,
    };
  },
  (k) => {
    const n = 2 + (k % 17);
    const askAfter = k % 2 === 0;
    const ans = askAfter ? n + 1 : n - 1;
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
      learningObjective: 'Find the number immediately before or after',
      prompt: askAfter
        ? `Which number comes right AFTER ${n} when counting?`
        : `Which number comes right BEFORE ${n} when counting?`,
      promptBn: askAfter
        ? `গণনা করলে ${toBn(n)}-এর ঠিক পরের সংখ্যাটি কোনটি?`
        : `গণনা করলে ${toBn(n)}-এর ঠিক আগের সংখ্যাটি কোনটি?`,
      ...mc,
      explanation: askAfter ? `${n} + 1 = ${ans}.` : `${n} − 1 = ${ans}.`,
      explanationBn: askAfter
        ? `${toBn(n)}-এর ঠিক পরে ${toBn(ans)} আসে।`
        : `${toBn(n)}-এর ঠিক আগে ${toBn(ans)} আসে।`,
    };
  },
  (k) => {
    const a = 2 + (k % 12);
    const b = a + 1 + ((k * 3) % 7);
    const askGreater = k % 2 === 0;
    const ans = askGreater ? b : a;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Number comparison',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compare two numbers within 20',
      prompt: askGreater
        ? `Between ${a} and ${b}, which number is BIGGER?`
        : `Between ${a} and ${b}, which number is SMALLER?`,
      promptBn: askGreater
        ? `${toBn(a)} এবং ${toBn(b)}-এর মধ্যে কোন সংখ্যাটি বড়?`
        : `${toBn(a)} এবং ${toBn(b)}-এর মধ্যে কোন সংখ্যাটি ছোট?`,
      ...mc,
      explanation: `${b} is greater than ${a}.`,
      explanationBn: `${toBn(b)}, ${toBn(a)}-এর চেয়ে বড়।`,
    };
  },
  (k) => {
    const a = 1 + (k % 7);
    const target = a + 2 + ((k * 2) % 6);
    const ans = target - a;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find missing addend within 15',
      prompt: `Fill in the missing number: ${a} + ___ = ${target}`,
      promptBn: `খালি ঘরে কোন সংখ্যা বসবে: ${toBn(a)} + ___ = ${toBn(target)}?`,
      ...mc,
      explanation: `${target} − ${a} = ${ans}, so ${a} + ${ans} = ${target}.`,
      explanationBn: `${toBn(target)} - ${toBn(a)} = ${toBn(ans)}।`,
    };
  },

  // =========================================================================
  // 6-10: GRADE 1 (minGradeLevel: 1, maxGradeLevel: 2)
  // =========================================================================
  (k) => {
    const tens = 1 + (k % 9);
    const ones = (k * 7) % 10;
    const num = tens * 10 + ones;
    const askTens = k % 2 === 0;
    const ans = askTens ? tens : ones;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Place value',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Identify tens or ones digit in a 2-digit number',
      prompt: askTens
        ? `How many TENS are in the number ${num}?`
        : `What is the ONES digit in the number ${num}?`,
      promptBn: askTens
        ? `${toBn(num)} সংখ্যাটিতে কয়টি দশক আছে?`
        : `${toBn(num)} সংখ্যাটিতে এককের ঘরে কোন অঙ্কটি আছে?`,
      ...mc,
      explanation: `${num} = ${tens} Tens and ${ones} Ones.`,
      explanationBn: `${toBn(num)} = ${toBn(tens)} দশক ${toBn(ones)} একক।`,
    };
  },
  (k) => {
    const a = 11 + (k % 25);
    const b = 10 + ((k * 3) % 24);
    const ans = a + b;
    const nIdx = k % NAMES_EN.length;
    const iIdx = (k + 2) % ITEMS_EN.length;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Add two-digit numbers within 60',
      prompt: `${NAMES_EN[nIdx]} collected ${a} ${ITEMS_EN[iIdx]} on Sunday and ${b} on Monday. How many in total?`,
      promptBn: `${NAMES_BN[nIdx]} রবিবারে ${toBn(a)}টি ও সোমবারে ${toBn(b)}টি ${ITEMS_BN[iIdx]} সংগ্রহ করল। মোট কয়টি হলো?`,
      ...mc,
      explanation: `${a} + ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} + ${toBn(b)} = ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const a = 25 + (k % 25);
    const b = 11 + ((k * 3) % 13);
    const ans = a - b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Subtract 2-digit numbers within 50',
      prompt: `Subtract: ${a} − ${b} = ?`,
      promptBn: `বিয়োগ করো: ${toBn(a)} - ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} − ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} থেকে ${toBn(b)} বাদ দিলে ${toBn(ans)} থাকে।`,
    };
  },
  (k) => {
    const step = [2, 5, 10][k % 3];
    const start = step * (1 + (k % 5));
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const ans = start + 4 * step;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Skip count by 2s, 5s, and 10s',
      prompt: `Skip count to find the next number: ${seq.join(', ')}, ___`,
      promptBn: `ধারার পরবর্তী সংখ্যাটি বলো: ${seq.map(toBn).join(', ')}, ___`,
      ...mc,
      explanation: `Each number increases by ${step}: ${seq[3]} + ${step} = ${ans}.`,
      explanationBn: `প্রতি ধাপে ${toBn(step)} করে বাড়ছে: ${toBn(seq[3])} + ${toBn(step)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const noteA = [10, 20, 50][k % 3];
    const noteB = [2, 5, 10][Math.floor(k / 3) % 3];
    const coinC = 1 + (k % 4);
    const ans = noteA + noteB + coinC;
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Add three Bangladeshi Taka notes/coins',
      prompt: `Add the money: ${noteA} Taka + ${noteB} Taka + ${coinC} Taka = ?`,
      promptBn: `টাকা যোগ করো: ${toBn(noteA)} টাকা + ${toBn(noteB)} টাকা + ${toBn(coinC)} টাকা = কত?`,
      ...mc,
      explanation: `${noteA} + ${noteB} + ${coinC} = ${ans} Taka.`,
      explanationBn: `${toBn(noteA)} + ${toBn(noteB)} + ${toBn(coinC)} = ${toBn(ans)} টাকা।`,
    };
  },

  // =========================================================================
  // 11-15: GRADE 2 (minGradeLevel: 2, maxGradeLevel: 3)
  // =========================================================================
  (k) => {
    const h = 1 + (k % 8);
    const t = (k * 3) % 10;
    const o = 1 + ((k * 7) % 9);
    const val = h * 100 + t * 10 + o;
    const ans = h * 100;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Place value',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find hundreds place value in a 3-digit number',
      prompt: `In the number ${val}, what is the place value of the digit ${h}?`,
      promptBn: `${toBn(val)} সংখ্যাটিতে ${toBn(h)} অঙ্কটির স্থানীয় মান কত?`,
      ...mc,
      explanation: `${h} is in the Hundreds place, so its value is ${ans}.`,
      explanationBn: `${toBn(h)} শতকের ঘরে থাকায় এর স্থানীয় মান ${toBn(ans)}।`,
    };
  },
  (k) => {
    const m1 = 2 + (k % 4);
    const m2 = 2 + ((k * 3) % 8);
    const ans = m1 * m2;
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
      learningObjective: 'Recall 2–5 multiplication tables',
      prompt: `Multiply: ${m1} × ${m2} = ?`,
      promptBn: `গুণ করো: ${toBn(m1)} × ${toBn(m2)} = কত?`,
      ...mc,
      explanation: `${m1} groups of ${m2} equal ${ans}.`,
      explanationBn: `${toBn(m1)} × ${toBn(m2)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 128 + (k * 13) % 240;
    const b = 115 + (k * 17) % 210;
    const ans = a + b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Add 3-digit numbers with carrying',
      prompt: `Find the sum: ${a} + ${b} = ?`,
      promptBn: `যোগ করো: ${toBn(a)} + ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} + ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} + ${toBn(b)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const groups = 3 + (k % 5);
    const each = 3 + ((k * 2) % 7);
    const total = groups * each;
    const iIdx = k % ITEMS_EN.length;
    const mc = buildNumericOptions(each, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Solve equal sharing division word problems',
      prompt: `${total} ${ITEMS_EN[iIdx]} are shared equally among ${groups} children. How many does each child get?`,
      promptBn: `${toBn(total)}টি ${ITEMS_BN[iIdx]} সমানভাবে ${toBn(groups)} জন শিশুকে ভাগ করে দিলে প্রত্যেকে কয়টি করে পাবে?`,
      ...mc,
      explanation: `${total} ÷ ${groups} = ${each}.`,
      explanationBn: `${toBn(total)} ÷ ${toBn(groups)} = ${toBn(each)}টি।`,
    };
  },
  (k) => {
    const price = 6 + (k % 9);
    const qty = 2 + (k % 4);
    const paid = 50;
    const ans = paid - price * qty;
    const nIdx = (k + 3) % NAMES_EN.length;
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Word problems',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute change from a 50-Taka note after buying multiple items',
      prompt: `${NAMES_EN[nIdx]} bought ${qty} erasers at ${price} Taka each and paid with a 50-Taka note. How much change came back?`,
      promptBn: `${NAMES_BN[nIdx]} ${toBn(price)} টাকা দামের ${toBn(qty)}টি রাবার কিনে ৫০ টাকার নোট দিল। সে কত টাকা ফেরত পাবে?`,
      ...mc,
      explanation: `Cost = ${qty} × ${price} = ${qty * price} Taka. Change = 50 − ${qty * price} = ${ans} Taka.`,
      explanationBn: `মোট দাম = ${toBn(qty * price)} টাকা। ফেরত = ৫০ - ${toBn(qty * price)} = ${toBn(ans)} টাকা।`,
    };
  },

  // =========================================================================
  // 16-20: GRADE 3 (minGradeLevel: 3, maxGradeLevel: 4)
  // =========================================================================
  (k) => {
    const m1 = 6 + (k % 4);
    const m2 = 4 + ((k * 3) % 6);
    const ans = m1 * m2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Master 6–9 times tables',
      prompt: `What is ${m1} × ${m2}?`,
      promptBn: `${toBn(m1)} × ${toBn(m2)} সমান কত?`,
      ...mc,
      explanation: `${m1} × ${m2} = ${ans}.`,
      explanationBn: `${toBn(m1)} × ${toBn(m2)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const divisor = 4 + (k % 6);
    const quotient = 5 + ((k * 2) % 8);
    const rem = 1 + (k % (divisor - 1));
    const dividend = divisor * quotient + rem;
    const mc = buildNumericOptions(rem, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find remainder in division',
      prompt: `What is the remainder when ${dividend} is divided by ${divisor}?`,
      promptBn: `${toBn(dividend)}-কে ${toBn(divisor)} দিয়ে ভাগ করলে ভাগশেষ কত থাকবে?`,
      ...mc,
      explanation: `${divisor} × ${quotient} = ${divisor * quotient}, and ${dividend} − ${divisor * quotient} = ${rem}.`,
      explanationBn: `${toBn(divisor)} × ${toBn(quotient)} = ${toBn(divisor * quotient)}, ভাগশেষ = ${toBn(rem)}।`,
    };
  },
  (k) => {
    const den = [4, 5, 6, 8][k % 4];
    const a = 1 + (k % Math.max(1, den - 2));
    const b = 1 + ((k + 1) % (den - a));
    const numSum = a + b;
    const ansStr = `${numSum}/${den}`;
    const ansStrBn = `${toBn(numSum)}/${toBn(den)}`;
    const pool: [string, string][] = [
      [`${numSum}/${den * 2}`, `${toBn(numSum)}/${toBn(den * 2)}`],
      [`${Math.max(1, numSum - 1)}/${den}`, `${toBn(Math.max(1, numSum - 1))}/${toBn(den)}`],
      [`${Math.min(den, numSum + 1)}/${den}`, `${toBn(Math.min(den, numSum + 1))}/${toBn(den)}`],
      [`1/${den}`, `১/${toBn(den)}`],
    ];
    const mc = buildStringOptions(ansStr, ansStrBn, pool, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Fraction operations',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Add fractions with matching denominators',
      prompt: `Add the fractions: $\\frac{${a}}{${den}} + \\frac{${b}}{${den}} = ?$`,
      promptBn: `যোগ করো: ${toBn(a)}/${toBn(den)} + ${toBn(b)}/${toBn(den)} = কত?`,
      ...mc,
      explanation: `(${a} + ${b})/${den} = ${numSum}/${den}.`,
      explanationBn: `হর সমান থাকায় (${toBn(a)} + ${toBn(b)})/${toBn(den)} = ${ansStrBn}।`,
    };
  },
  (k) => {
    const l = 6 + (k % 12);
    const w = 3 + ((k * 2) % 7);
    const ans = 2 * (l + w);
    const mc = buildNumericOptions(ans, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Perimeter',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate perimeter of a rectangle',
      prompt: `A rectangle has length ${l} cm and width ${w} cm. What is its perimeter?`,
      promptBn: `একটি আয়তের দৈর্ঘ্য ${toBn(l)} সেমি ও প্রস্থ ${toBn(w)} সেমি হলে এর পরিসীমা কত?`,
      ...mc,
      explanation: `Perimeter = 2 × (${l} + ${w}) = ${ans} cm.`,
      explanationBn: `পরিসীমা = ২ × (${toBn(l)} + ${toBn(w)}) = ${toBn(ans)} সেমি।`,
    };
  },
  (k) => {
    const hrs = 1 + (k % 4);
    const mins = 5 + ((k * 5) % 50);
    const ans = hrs * 60 + mins;
    const mc = buildNumericOptions(ans, k, false, ' min', ' মিনিট');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Convert hours and minutes to minutes',
      prompt: `Convert ${hrs} hours ${mins} minutes into total minutes.`,
      promptBn: `${toBn(hrs)} ঘণ্টা ${toBn(mins)} মিনিট সমান মোট কত মিনিট?`,
      ...mc,
      explanation: `${hrs} × 60 + ${mins} = ${hrs * 60} + ${mins} = ${ans} min.`,
      explanationBn: `${toBn(hrs)} × ৬০ + ${toBn(mins)} = ${toBn(ans)} মিনিট।`,
    };
  },

  // =========================================================================
  // 21-25: GRADE 4 (minGradeLevel: 4, maxGradeLevel: 6)
  // =========================================================================
  (k) => {
    const a = 12 + (k % 25);
    const b = 11 + ((k * 3) % 19);
    const ans = a * b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Multiply two 2-digit numbers',
      prompt: `Calculate: ${a} × ${b} = ?`,
      promptBn: `গুণ করো: ${toBn(a)} × ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} × ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} × ${toBn(b)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const num = 1 + (k % 9);
    const whole = k % 5;
    const ans = Number((whole + num / 10).toFixed(1));
    const mc = buildNumericOptions(ans, k, false, '', '', 1);
    const second = Number((0.2 + ((k % 4) * 0.1)).toFixed(1));
    const sumAns = Number((ans + second).toFixed(1));
    const mcSum = buildNumericOptions(sumAns, k, false, '', '', 1);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal operations',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add decimals to tenths place',
      prompt: `Add the decimals: ${ans.toFixed(1)} + ${second.toFixed(1)} = ?`,
      promptBn: `দশমিক যোগ করো: ${toBn(ans.toFixed(1))} + ${toBn(second.toFixed(1))} = কত?`,
      ...mcSum,
      explanation: `${ans.toFixed(1)} + ${second.toFixed(1)} = ${sumAns.toFixed(1)}. (${mc.correctAnswer} base)`,
      explanationBn: `দশমিক বিন্দু মিলিয়ে যোগ করলে ${toBn(sumAns.toFixed(1))} হয়।`,
    };
  },
  (k) => {
    const mult = 3 + (k % 7);
    const box = 4 + ((k * 2) % 12);
    const shift = 5 + (k % 11);
    const rhs = mult * box + shift;
    const mc = buildNumericOptions(box, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve open sentence with multiplication and addition',
      prompt: `Find the missing value in $\\square \\times ${mult} + ${shift} = ${rhs}$.`,
      promptBn: `খোলা বাক্যে □-এর মান কত: □ × ${toBn(mult)} + ${toBn(shift)} = ${toBn(rhs)}?`,
      ...mc,
      explanation: `□ × ${mult} = ${rhs} − ${shift} = ${rhs - shift}, so □ = ${box}.`,
      explanationBn: `□ × ${toBn(mult)} = ${toBn(rhs - shift)}, অতএব □ = ${toBn(box)}।`,
    };
  },
  (k) => {
    const side = 4 + (k % 15);
    const ans = side * side;
    const mc = buildNumericOptions(ans, k, false, ' sq cm', ' বর্গ সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate area of a square',
      prompt: `A square garden tile has each side ${side} cm. What is its area?`,
      promptBn: `একটি বর্গাকার টালির প্রতি বাহু ${toBn(side)} সেমি হলে এর ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area = ${side} × ${side} = ${ans} sq cm.`,
      explanationBn: `ক্ষেত্রফল = ${toBn(side)} × ${toBn(side)} = ${toBn(ans)} বর্গ সেমি।`,
    };
  },
  (k) => {
    const km = 2 + (k % 9);
    const m = 150 + ((k * 50) % 800);
    const ans = km * 1000 + m;
    const mc = buildNumericOptions(ans, k, false, ' m', ' মিটার');
    return {
      domain: 'Measurement',
      subskill: 'Length & distance',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Convert kilometers and meters to meters',
      prompt: `Express ${km} km ${m} m in meters.`,
      promptBn: `${toBn(km)} কিমি ${toBn(m)} মিটারকে মোট মিটারে প্রকাশ করো।`,
      ...mc,
      explanation: `${km} × 1000 + ${m} = ${ans} m.`,
      explanationBn: `${toBn(km)} × ১০০০ + ${toBn(m)} = ${toBn(ans)} মিটার।`,
    };
  },

  // =========================================================================
  // 26-30: GRADE 5 (minGradeLevel: 5, maxGradeLevel: 7)
  // =========================================================================
  (k) => {
    const a = 6 + (k % 12);
    const b = 3 + ((k * 2) % 8);
    const c = 2 + (k % 7);
    const ans = a + b * c;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Apply BODMAS order of operations',
      prompt: `Simplify: $${a} + ${b} \\times ${c}$`,
      promptBn: `সরল করো: ${toBn(a)} + ${toBn(b)} × ${toBn(c)}`,
      ...mc,
      explanation: `Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${ans}.`,
      explanationBn: `আগে গুণ: ${toBn(b)} × ${toBn(c)} = ${toBn(b * c)}, তারপর ${toBn(a)} + ${toBn(b * c)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const g = 2 + (k % 6);
    const x = g * (2 + (k % 4));
    const y = g * (3 + ((k + 1) % 5));
    const askHcf = k % 2 === 0;
    const ans = askHcf ? gcd(x, y) : lcm(x, y);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Factors & multiples',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute HCF and LCM of two positive integers',
      prompt: askHcf
        ? `Find the Highest Common Factor (HCF) of ${x} and ${y}.`
        : `Find the Least Common Multiple (LCM) of ${x} and ${y}.`,
      promptBn: askHcf
        ? `${toBn(x)} এবং ${toBn(y)}-এর গ.সা.গু. কত?`
        : `${toBn(x)} এবং ${toBn(y)}-এর ল.সা.গু. কত?`,
      ...mc,
      explanation: askHcf
        ? `HCF(${x}, ${y}) = ${ans}.`
        : `LCM(${x}, ${y}) = ${ans}.`,
      explanationBn: askHcf
        ? `${toBn(x)} ও ${toBn(y)}-এর গ.সা.গু. = ${toBn(ans)}।`
        : `${toBn(x)} ও ${toBn(y)}-এর ল.সা.গু. = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const pct = [10, 15, 20, 25, 30, 40][k % 6];
    const base = 100 + ((k * 40) % 500);
    const ans = (pct * base) / 100;
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Percentage conversion',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute percentage of a Taka amount',
      prompt: `What is ${pct}% of ${base} Taka?`,
      promptBn: `${toBn(base)} টাকার ${toBn(pct)}% সমান কত টাকা?`,
      ...mc,
      explanation: `(${pct}/100) × ${base} = ${ans} Taka.`,
      explanationBn: `(${toBn(pct)}/১০০) × ${toBn(base)} = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const baseAvg = 12 + (k % 18);
    const nums = [baseAvg - 4, baseAvg - 1, baseAvg + 2, baseAvg + 3];
    const mc = buildNumericOptions(baseAvg, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mean & median',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate arithmetic mean of 4 values',
      prompt: `Find the average (mean) of: ${nums.join(', ')}.`,
      promptBn: `${nums.map(toBn).join(', ')} সংখ্যাগুলোর গড় কত?`,
      ...mc,
      explanation: `Sum = ${nums.reduce((s, n) => s + n, 0)}. Average = ${nums.reduce((s, n) => s + n, 0)} ÷ 4 = ${baseAvg}.`,
      explanationBn: `যোগফল ÷ ৪ = ${toBn(baseAvg)}।`,
    };
  },
  (k) => {
    const unitPrice = 15 + (k % 20);
    const q1 = 3 + (k % 4);
    const q2 = q1 + 2 + (k % 5);
    const total1 = unitPrice * q1;
    const ans = unitPrice * q2;
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Unit rate',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve unitary method cost problems',
      prompt: `If ${q1} notebooks cost ${total1} Taka, how much do ${q2} notebooks cost?`,
      promptBn: `${toBn(q1)}টি খাতার দাম ${toBn(total1)} টাকা হলে ${toBn(q2)}টি খাতার দাম কত?`,
      ...mc,
      explanation: `1 notebook = ${total1} ÷ ${q1} = ${unitPrice} Taka; ${q2} notebooks = ${ans} Taka.`,
      explanationBn: `১টির দাম ${toBn(unitPrice)} টাকা, তাই ${toBn(q2)}টির দাম ${toBn(ans)} টাকা।`,
    };
  },

  // =========================================================================
  // 31-35: GRADE 6 (minGradeLevel: 6, maxGradeLevel: 8)
  // =========================================================================
  (k) => {
    const a = -12 + (k % 9);
    const b = 4 + ((k * 3) % 15);
    const ans = a + b;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add positive and negative integers',
      prompt: `Compute: $(${a}) + ${b} = ?$`,
      promptBn: `মান নির্ণয় করো: (${toBn(a)}) + ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} + ${b} = ${ans}.`,
      explanationBn: `(${toBn(a)}) + ${toBn(b)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 2 + (k % 5);
    const b = 3 + ((k * 2) % 6);
    const x = 1 + (k % 5);
    const y = 2 + ((k + 1) % 4);
    const ans = a * x + b * y;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Algebraic expressions',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate linear two-variable expressions',
      prompt: `If $x = ${x}$ and $y = ${y}$, find the value of $${a}x + ${b}y$.`,
      promptBn: `$x = ${x}$ এবং $y = ${y}$ হলে, $${a}x + ${b}y$-এর মান কত?`,
      ...mc,
      explanation: `${a}(${x}) + ${b}(${y}) = ${a * x} + ${b * y} = ${ans}.`,
      explanationBn: `${toBn(a)}(${toBn(x)}) + ${toBn(b)}(${toBn(y)}) = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const ang1 = 25 + (k % 60);
    const ans = 180 - ang1;
    const mc = buildNumericOptions(ans, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find supplementary angles on a straight line',
      prompt: `Two angles on a straight line add to $180^\\circ$. If one angle is $${ang1}^\\circ$, what is the other?`,
      promptBn: `একটি সরলরেখার উপর দুটি সন্নিহিত কোণের একটি ${toBn(ang1)}° হলে অপরটি কত ডিগ্রি?`,
      ...mc,
      explanation: `180° − ${ang1}° = ${ans}°.`,
      explanationBn: `১৮০° - ${toBn(ang1)}° = ${toBn(ans)}°।`,
    };
  },
  (k) => {
    const p = 2 + (k % 4);
    const q = p + 1 + (k % 3);
    const mult = 100 * (1 + (k % 5));
    const total = (p + q) * mult;
    const ans = q * mult;
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Equivalent ratios',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Divide an amount into a given ratio',
      prompt: `${total} Taka is divided between A and B in the ratio $${p} : ${q}$. How much does B receive?`,
      promptBn: `${toBn(total)} টাকা ক ও খ-এর মধ্যে ${toBn(p)} : ${toBn(q)} অনুপাতে ভাগ করলে খ কত টাকা পাবে?`,
      ...mc,
      explanation: `Total parts = ${p + q}. One part = ${mult} Taka. B gets ${q} × ${mult} = ${ans} Taka.`,
      explanationBn: `মোট অংশ = ${toBn(p + q)}। খ পাবে ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const l = 4 + (k % 6);
    const w = 2 + ((k * 2) % 4);
    const h = 2 + (k % 5);
    const ans = l * w * h;
    const mc = buildNumericOptions(ans, k, false, ' m³', ' ঘনমিটার');
    return {
      domain: 'Measurement',
      subskill: 'Unit conversion',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute volume of a rectangular tank',
      prompt: `A rectangular water tank has length ${l} m, width ${w} m, and height ${h} m. Find its volume.`,
      promptBn: `একটি আয়তাকার পানির ট্যাঙ্কের দৈর্ঘ্য ${toBn(l)} মি., প্রস্থ ${toBn(w)} মি. ও উচ্চতা ${toBn(h)} মি.। এর আয়তন কত?`,
      ...mc,
      explanation: `Volume = ${l} × ${w} × ${h} = ${ans} m³.`,
      explanationBn: `আয়তন = ${toBn(l)} × ${toBn(w)} × ${toBn(h)} = ${toBn(ans)} ঘনমিটার।`,
    };
  },

  // =========================================================================
  // 36-40: GRADE 7 (minGradeLevel: 6, maxGradeLevel: 9)
  // =========================================================================
  (k) => {
    const x = 2 + (k % 9);
    const a = 3 + (k % 4);
    const c = 1 + ((k * 2) % 3);
    const b = 4 + (k % 7);
    const d = (a - c) * x - b;
    const eqRhs = d >= 0 ? `${c}x + ${d}` : `${c}x - ${Math.abs(d)}`;
    const mc = buildNumericOptions(x, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve linear equations with variables on both sides',
      prompt: `Solve for $x$: $${a}x - ${b} = ${eqRhs}$`,
      promptBn: `সমাধান করো: $${a}x - ${b} = ${eqRhs}$`,
      ...mc,
      explanation: `Subtract ${c}x and add ${b}: ${a - c}x = ${d + b} → x = ${x}.`,
      explanationBn: `পক্ষান্তর করে সমাধান করলে $x = ${x}$ (${toBn(x)}) পাওয়া যায়।`,
    };
  },
  (k) => {
    const a = 30 + (k % 50);
    const b = 40 + ((k * 3) % 50);
    const c = 180 - a - b;
    const mc = buildNumericOptions(c, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Apply triangle interior angle sum theorem',
      prompt: `In a triangle, two angles measure $${a}^\\circ$ and $${b}^\\circ$. Find the third angle.`,
      promptBn: `একটি ত্রিভুজের দুটি কোণ ${toBn(a)}° ও ${toBn(b)}° হলে তৃতীয় কোণটি কত?`,
      ...mc,
      explanation: `180° − (${a}° + ${b}°) = ${c}°.`,
      explanationBn: `১৮০° - (${toBn(a)}° + ${toBn(b)}°) = ${toBn(c)}°।`,
      visualSvg: 'angle_triangle',
      visualData: { angleA: a, angleB: b },
    };
  },
  (k) => {
    const step = 2 + (k % 5);
    const shift = 1 + ((k * 2) % 6);
    const nTerm = 10 + (k % 12);
    const ans = step * nTerm + shift;
    const seq = [1, 2, 3, 4].map((n) => step * n + shift);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Rule generalization',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute nth term of an arithmetic sequence',
      prompt: `Find the ${nTerm}th term of the pattern: ${seq.join(', ')}, ...`,
      promptBn: `${seq.map(toBn).join(', ')}, ... ধারাটির ${toBn(nTerm)}-তম পদ কত?`,
      ...mc,
      explanation: `Rule is ${step}n + ${shift}. For n = ${nTerm}: ${step}(${nTerm}) + ${shift} = ${ans}.`,
      explanationBn: `বীজগাণিতিক রাশি ${toBn(step)}n + ${toBn(shift)}; তাই ${toBn(nTerm)}-তম পদ = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const mid = 12 + (k % 20);
    const nums = [mid - 7, mid - 3, mid, mid + 4, mid + 9];
    const rotated = [nums[3], nums[0], nums[4], nums[1], nums[2]];
    const mc = buildNumericOptions(mid, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mode & range',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute median of 5 unsorted data values',
      prompt: `Find the MEDIAN of: ${rotated.join(', ')}.`,
      promptBn: `${rotated.map(toBn).join(', ')} উপাত্তগুলোর মধ্যক কত?`,
      ...mc,
      explanation: `Sorted order: ${nums.join(', ')}. The middle value is ${mid}.`,
      explanationBn: `ক্রমানুসারে সাজালে মাঝের সংখ্যাটি ${toBn(mid)}।`,
    };
  },
  (k) => {
    const r = 2 + (k % 5);
    const bl = 3 + ((k * 2) % 5);
    const g = 2 + (k % 4);
    const total = r + bl + g;
    const d = gcd(r, total);
    const num = r / d;
    const den = total / d;
    const ansStr = `${num}/${den}`;
    const ansBn = `${toBn(num)}/${toBn(den)}`;
    const pool: [string, string][] = [
      [`${bl}/${total}`, `${toBn(bl)}/${toBn(total)}`],
      [`${g}/${total}`, `${toBn(g)}/${toBn(total)}`],
      [`1/${total}`, `১/${toBn(total)}`],
      [`${total - r}/${total}`, `${toBn(total - r)}/${toBn(total)}`],
      [`${r + g}/${total}`, `${toBn(r + g)}/${toBn(total)}`],
      [`${Math.min(den - 1, num + 1)}/${den}`, `${toBn(Math.min(den - 1, num + 1))}/${toBn(den)}`],
      [`${r}/${total + 1}`, `${toBn(r)}/${toBn(total + 1)}`],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Probability',
      subskill: 'Simple probability',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 6,
      maxGradeLevel: 9,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find simplified theoretical probability from a bag',
      prompt: `A bag holds ${r} red, ${bl} blue, and ${g} green balls. Probability of picking a RED ball at random?`,
      promptBn: `একটি ব্যাগে ${toBn(r)}টি লাল, ${toBn(bl)}টি নীল ও ${toBn(g)}টি সবুজ বল আছে। দৈবভাবে একটি লাল বল পাওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `Total = ${total} balls. P(red) = ${r}/${total} = ${ansStr}.`,
      explanationBn: `মোট ${toBn(total)}টির মধ্যে ${toBn(r)}টি লাল; সম্ভাবনা = ${ansBn}।`,
    };
  },

  // =========================================================================
  // 41-45: GRADE 8 (minGradeLevel: 8, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const sum = 5 + (k % 9);
    const prod = 2 + (k % Math.max(2, Math.floor((sum * sum) / 4) - 2));
    const ans = sum * sum - 2 * prod;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Algebraic expressions',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply $(a+b)^2 - 2ab = a^2 + b^2$ identity',
      prompt: `If $a + b = ${sum}$ and $ab = ${prod}$, find $a^2 + b^2$.`,
      promptBn: `$a + b = ${sum}$ এবং $ab = ${prod}$ হলে, $a^2 + b^2$-এর মান কত?`,
      ...mc,
      explanation: `a² + b² = (${sum})² − 2(${prod}) = ${sum * sum} − ${2 * prod} = ${ans}.`,
      explanationBn: `$a^2 + b^2 = (${sum})^2 - 2(${prod}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const triples = [
      [3, 4, 5],
      [5, 12, 13],
      [6, 8, 10],
      [8, 15, 17],
      [9, 12, 15],
      [7, 24, 25],
      [12, 16, 20],
    ];
    const scale = 1 + Math.floor(k / triples.length) % 3;
    const [a0, b0, c0] = triples[k % triples.length];
    const a = a0 * scale;
    const b = b0 * scale;
    const c = c0 * scale;
    const mc = buildNumericOptions(c, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute hypotenuse using Pythagorean theorem',
      prompt: `A right triangle has perpendicular legs $${a}\\text{ cm}$ and $${b}\\text{ cm}$. What is the hypotenuse?`,
      promptBn: `একটি সমকোণী ত্রিভুজের লম্ব ${toBn(a)} সেমি ও ভূমি ${toBn(b)} সেমি হলে অতিভুজ কত সেমি?`,
      ...mc,
      explanation: `√(${a}² + ${b}²) = √(${a * a + b * b}) = ${c} cm.`,
      explanationBn: `পিথাগোরাসের উপপাদ্য: $\\sqrt{${a}^2 + ${b}^2} = ${c}$ সেমি।`,
    };
  },
  (k) => {
    const r = 2 + (k % 11);
    const ans = r * r;
    const ansStr = `${ans}π`;
    const pool: [string, string][] = [
      [`${2 * r}π`, `${2 * r}π`],
      [`${ans + r}π`, `${ans + r}π`],
      [`${Math.max(2, ans - 4)}π`, `${Math.max(2, ans - 4)}π`],
      [`${4 * r}π`, `${4 * r}π`],
    ];
    const mc = buildStringOptions(ansStr, ansStr, pool, k);
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Compute circle area in terms of pi',
      prompt: `Find the area of a circle with radius $${r}\\text{ cm}$ (in terms of $\\pi$).`,
      promptBn: `${toBn(r)} সেমি ব্যাসার্ধবিশিষ্ট একটি বৃত্তের ক্ষেত্রফল $\\pi$-এর মাধ্যমে কত?`,
      ...mc,
      explanation: `Area = πr² = π(${r})² = ${ans}π.`,
      explanationBn: `বৃত্তের ক্ষেত্রফল = $\\pi r^2 = ${ans}\\pi$।`,
    };
  },
  (k) => {
    const w1 = 6 + (k % 7);
    const d1 = 4 + ((k * 2) % 9);
    const totalWork = w1 * d1;
    // Find a valid divisor w2 != w1
    let w2 = w1 + 2;
    for (let d = 2; d <= totalWork / 2; d++) {
      if (totalWork % d === 0 && d !== w1) {
        w2 = d;
        break;
      }
    }
    const ans = totalWork / w2;
    const mc = buildNumericOptions(ans, k, false, ' days', ' দিন');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Direct proportion',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve inverse proportion worker-days problems',
      prompt: `${w1} workers can complete a task in ${d1} days. How many days will ${w2} workers take?`,
      promptBn: `${toBn(w1)} জন শ্রমিক একটি কাজ ${toBn(d1)} দিনে করতে পারে। ${toBn(w2)} জন শ্রমিক ঐ কাজ কত দিনে করবে?`,
      ...mc,
      explanation: `Total work = ${w1} × ${d1} = ${totalWork} worker-days. ${totalWork} ÷ ${w2} = ${ans} days.`,
      explanationBn: `মোট কাজ = ${toBn(totalWork)} শ্রমদিন; সময় = ${toBn(ans)} দিন।`,
    };
  },
  (k) => {
    const p = 1000 * (1 + (k % 8));
    const rate = [10, 20][k % 2];
    const mult = rate === 10 ? 1.21 : 1.44;
    const ans = Math.round(p * mult);
    const mc = buildNumericOptions(ans, k, false, ' Taka', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Calculate 2-year compound amount',
      prompt: `Find the compound amount of ${p} Taka at ${rate}% annual compound profit after 2 years.`,
      promptBn: `বার্ষিক ${toBn(rate)}% চক্রবৃদ্ধি মুনাফায় ${toBn(p)} টাকার ২ বছরের চক্রবৃদ্ধি মূলধন কত?`,
      ...mc,
      explanation: `C = ${p} × (1 + ${rate}/100)² = ${ans} Taka.`,
      explanationBn: `সবৃদ্ধিমূল C = ${toBn(p)} × (১ + ${toBn(rate)}/১০০)² = ${toBn(ans)} টাকা।`,
    };
  },

  // =========================================================================
  // 46-50: GRADE 9–10 (minGradeLevel: 8, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const x = 4 + (k % 12);
    const y = 1 + ((k * 2) % (x - 1));
    const sum = x + y;
    const diff = x - y;
    const ans = x * y;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve simultaneous linear equations for product',
      prompt: `If $x + y = ${sum}$ and $x - y = ${diff}$, find the value of $xy$.`,
      promptBn: `$x + y = ${sum}$ এবং $x - y = ${diff}$ হলে, $xy$-এর মান কত?`,
      ...mc,
      explanation: `x = (${sum} + ${diff})/2 = ${x}, y = ${y}. Thus xy = ${ans}.`,
      explanationBn: `সমাধান করে x = ${x} ও y = ${y} পাওয়া যায়; তাই xy = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const r1 = 2 + (k % 7);
    const r2 = r1 + 1 + (k % 5);
    const b = r1 + r2;
    const c = r1 * r2;
    const ansStr = `${r1} and ${r2}`;
    const ansBn = `${toBn(r1)} ও ${toBn(r2)}`;
    const pool: [string, string][] = [
      [`-${r1} and -${r2}`, `-${toBn(r1)} ও -${toBn(r2)}`],
      [`${r1 + 1} and ${r2 - 1}`, `${toBn(r1 + 1)} ও ${toBn(r2 - 1)}`],
      [`1 and ${c}`, `১ ও ${toBn(c)}`],
      [`${r1} and ${r2 + 2}`, `${toBn(r1)} ও ${toBn(r2 + 2)}`],
    ];
    const mc = buildStringOptions(ansStr, ansBn, pool, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Quadratic roots',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find roots of factorable quadratic equations',
      prompt: `What are the roots of $x^2 - ${b}x + ${c} = 0$?`,
      promptBn: `$x^2 - ${b}x + ${c} = 0$ সমীকরণের মূল দুটি কী কী?`,
      ...mc,
      explanation: `(x − ${r1})(x − ${r2}) = 0 gives x = ${r1} and x = ${r2}.`,
      explanationBn: `উৎপাদকে বিশ্লেষণ করে $(x - ${r1})(x - ${r2}) = 0$, তাই মূল ${ansBn}।`,
    };
  },
  (k) => {
    const speedKmh = 18 * (2 + (k % 7));
    const ans = (speedKmh * 5) / 18;
    const mc = buildNumericOptions(ans, k, false, ' m/s', ' মি./সে.');
    return {
      domain: 'Measurement',
      subskill: 'Unit conversion',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert km/h to m/s accurately',
      prompt: `A train moves at ${speedKmh} km/h. Express its speed in m/s.`,
      promptBn: `একটি ট্রেনের বেগ ঘণ্টায় ${toBn(speedKmh)} কিমি। মিটার/সেকেন্ডে বেগ কত?`,
      ...mc,
      explanation: `${speedKmh} × (5/18) = ${ans} m/s.`,
      explanationBn: `${toBn(speedKmh)} × (৫/১৮) = ${toBn(ans)} মি./সে.।`,
    };
  },
  (k) => {
    const n = 10 + (k % 25);
    const ans = (n * (n + 1)) / 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Geometric sequences',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Sum the first n natural numbers',
      prompt: `Compute the sum: $1 + 2 + 3 + \\dots + ${n}$.`,
      promptBn: `প্রথম ${toBn(n)}টি স্বাভাবিক সংখ্যার সমষ্টি নির্ণয় করো: ১ + ২ + ... + ${toBn(n)}।`,
      ...mc,
      explanation: `n(n+1)/2 = ${n} × ${n + 1} / 2 = ${ans}.`,
      explanationBn: `সূত্র $\\frac{n(n+1)}{2} = \\frac{${n}\\times ${n + 1}}{2} = ${ans}$।`,
    };
  },
  (k) => {
    const x1 = 1 + (k % 5);
    const y1 = 1 + ((k * 2) % 5);
    const pairs = [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
    ];
    const [dx, dy, dist] = pairs[k % pairs.length];
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const mc = buildNumericOptions(dist, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 8,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate Euclidean distance between two points',
      prompt: `Find the distance between $A(${x1}, ${y1})$ and $B(${x2}, ${y2})$.`,
      promptBn: `$A(${x1}, ${y1})$ এবং $B(${x2}, ${y2})$ বিন্দু দুটির মধ্যবর্তী দূরত্ব কত একক?`,
      ...mc,
      explanation: `√((${x2}−${x1})² + (${y2}−${y1})²) = √(${dx}² + ${dy}²) = ${dist}.`,
      explanationBn: `দূরত্ব = $\\sqrt{${dx}^2 + ${dy}^2} = ${dist}$ (${toBn(dist)})।`,
      visualSvg: 'coordinate_point',
      visualData: { x: x1, y: y1 },
    };
  },
];

function create2000Questions(): MathQuestion[] {
  const result: MathQuestion[] = [];
  const seenPrompts = new Set<string>();
  const genCounters = Array(GENERATORS.length).fill(0);

  let guard = 0;
  while (result.length < 2000 && guard < 10000) {
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

export const GENERATED_2000_QUESTIONS: MathQuestion[] = create2000Questions();
