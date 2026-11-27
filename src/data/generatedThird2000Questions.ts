import { DifficultyTier, MathQuestion } from '../types/mathmind';

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_NUMS[Number(d)]);
}

const NAMES_EN = [
  'Ayan',
  'Mahi',
  'Shuvo',
  'Nadia',
  'Rohan',
  'Tania',
  'Zayan',
  'Faria',
  'Emon',
  'Niha',
  'Rayan',
  'Sadia',
  'Tanmoy',
  'Lamia',
  'Rafid',
  'Anika',
];

const NAMES_BN = [
  'আয়ান',
  'মাহি',
  'শুভ',
  'নাদিয়া',
  'রোহান',
  'তানিয়া',
  'জায়ান',
  'ফারিয়া',
  'ইমন',
  'নিহা',
  'রায়ান',
  'সাদিয়া',
  'তন্ময়',
  'লামিয়া',
  'রাফিদ',
  'আনিকা',
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

function nPr(n: number, r: number): number {
  let res = 1;
  for (let i = 0; i < r; i++) {
    res *= n - i;
  }
  return res;
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
    id: `q6k_${String(idx + 1).padStart(4, '0')}`,
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
    const a = 1 + (k % 8);
    const b = 1 + (Math.floor(k / 8) % 8);
    const ans = a + b;
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
      learningObjective: 'Count and combine two visual dot groups',
      prompt: `Look at the dots: ${a} blue dots and ${b} green dots. How many dots are there in total?`,
      promptBn: `ছবিটি দেখো: ${toBn(a)}টি নীল বিন্দু ও ${toBn(b)}টি সবুজ বিন্দু মিলে মোট কয়টি বিন্দু হলো?`,
      ...mc,
      explanation: `Counting together: ${a} + ${b} = ${ans} dots.`,
      explanationBn: `একসাথে গুনলে: ${toBn(a)} + ${toBn(b)} = ${toBn(ans)}টি বিন্দু।`,
      visualSvg: 'counting_dots',
      visualData: { groupA: a, groupB: b },
    };
  },
  (k) => {
    const start = 2 + (k % 12);
    const jump = 1 + (Math.floor(k / 12) % 7);
    const ans = start + jump;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Number patterns',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Jump forward along a number line',
      prompt: `Start at ${start} on the number line and hop ${jump} steps to the right. Where do you land?`,
      promptBn: `সংখ্যারেখায় ${toBn(start)} থেকে ডানে ${toBn(jump)} ঘর এগিয়ে গেলে কোন সংখ্যায় পৌঁছাবে?`,
      ...mc,
      explanation: `Moving ${jump} steps right from ${start} lands on ${start} + ${jump} = ${ans}.`,
      explanationBn: `${toBn(start)} থেকে ডানে ${toBn(jump)} ধাপ গেলে ${toBn(ans)} পাওয়া যায়।`,
      visualSvg: 'number_line',
      visualData: { start, step: jump },
    };
  },
  (k) => {
    const total = 6 + (k % 14);
    const given = 1 + (Math.floor(k / 14) % 5);
    const ans = total - given;
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
      learningObjective: 'Subtract small items in everyday stories',
      prompt: `${NAMES_EN[nIdx]} has ${total} balloons and gives ${given} away to friends. How many balloons are left?`,
      promptBn: `${NAMES_BN[nIdx]}-এর কাছে ${toBn(total)}টি বেলুন ছিল, সে ${toBn(given)}টি বন্ধুদের দিয়ে দিল। আর কয়টি রইল?`,
      ...mc,
      explanation: `${total} − ${given} = ${ans} balloons remaining.`,
      explanationBn: `${toBn(total)} − ${toBn(given)} = ${toBn(ans)}টি বেলুন বাকি রইল।`,
    };
  },
  (k) => {
    const base = 10 + (k % 30);
    const diff = 2 + (Math.floor(k / 30) % 6);
    const n1 = base;
    const n2 = base + diff;
    const n3 = base + 2 * diff;
    const n4 = base + 3 * diff;
    const askLargest = k % 2 === 0;
    const ans = askLargest ? n4 : n1;
    const opts = [n2, n1, n4, n3];
    const rot = k % 4;
    const rotated = [...opts.slice(rot), ...opts.slice(0, rot)];
    return {
      domain: 'Number Sense',
      subskill: 'Number comparison',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Identify the greatest or least among four numbers',
      prompt: askLargest
        ? `Which number is the LARGEST among ${n2}, ${n1}, ${n4}, ${n3}?`
        : `Which number is the SMALLEST among ${n2}, ${n1}, ${n4}, ${n3}?`,
      promptBn: askLargest
        ? `${toBn(n2)}, ${toBn(n1)}, ${toBn(n4)}, ${toBn(n3)} — এদের মধ্যে সবচেয়ে বড় সংখ্যা কোনটি?`
        : `${toBn(n2)}, ${toBn(n1)}, ${toBn(n4)}, ${toBn(n3)} — এদের মধ্যে সবচেয়ে ছোট সংখ্যা কোনটি?`,
      options: rotated.map(String),
      optionsBn: rotated.map((v) => toBn(v)),
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      explanation: askLargest
        ? `${n4} is greater than ${n1}, ${n2}, and ${n3}.`
        : `${n1} is smaller than ${n2}, ${n3}, and ${n4}.`,
      explanationBn: askLargest
        ? `${toBn(n4)} বাকি সব সংখ্যার চেয়ে বড়।`
        : `${toBn(n1)} বাকি সব সংখ্যার চেয়ে ছোট।`,
    };
  },
  (k) => {
    const rects = 1 + (k % 7);
    const circles = 2 + (Math.floor(k / 7) % 8);
    const ans = rects * 4;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Geometry',
      subskill: 'Shape recognition',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Distinguish shapes with corners from circles',
      prompt: `There are ${rects} rectangle(s) and ${circles} circle(s) on a table. How many corners are there in total?`,
      promptBn: `টেবিলে ${toBn(rects)}টি আয়তক্ষেত্র এবং ${toBn(circles)}টি বৃত্ত আছে। মোট কয়টি কোণা আছে?`,
      ...mc,
      explanation: `Each rectangle has 4 corners and circles have 0 corners: ${rects} × 4 + ${circles} × 0 = ${ans}.`,
      explanationBn: `আয়তের ৪টি কোণা ও বৃত্তের ০টি কোণা; তাই মোট ${toBn(rects)} × ৪ = ${toBn(ans)}টি কোণা।`,
    };
  },

  // =========================================================================
  // 6-10: GRADE 1 (minGradeLevel: 1, maxGradeLevel: 2)
  // =========================================================================
  (k) => {
    const total = 12 + (k % 25);
    const left = 3 + (Math.floor(k / 25) % 9);
    const taken = total - left;
    const mc = buildNumericOptions(taken, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Solve missing subtrahend equations',
      prompt: `Find the missing number: $${total} - \\_ = ${left}$`,
      promptBn: `খালি ঘরে কোন সংখ্যা বসবে: $${toBn(total)} - \\_ = ${toBn(left)}$?`,
      ...mc,
      explanation: `${total} − ${left} = ${taken}, so ${total} − ${taken} = ${left}.`,
      explanationBn: `${toBn(total)} থেকে ${toBn(left)} বিয়োগ করলে ${toBn(taken)} পাওয়া যায়।`,
    };
  },
  (k) => {
    const ahead = 2 + (k % 12);
    const behind = 2 + (Math.floor(k / 12) % 10);
    const ans = ahead + 1 + behind;
    const nIdx = k % NAMES_EN.length;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Logical deduction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 3,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find total people in a queue using ordinal positions',
      prompt: `In a line, ${ahead} students stand in front of ${NAMES_EN[nIdx]} and ${behind} stand behind. How many students are in the line altogether?`,
      promptBn: `একটি সারিতে ${NAMES_BN[nIdx]}-এর সামনে ${toBn(ahead)} জন ও পেছনে ${toBn(behind)} জন দাঁড়িয়ে আছে। সারিতে মোট কতজন আছে?`,
      ...mc,
      explanation: `Count those in front + ${NAMES_EN[nIdx]} + those behind: ${ahead} + 1 + ${behind} = ${ans}.`,
      explanationBn: `সামনে ${toBn(ahead)} + নিজে ১ + পেছনে ${toBn(behind)} = মোট ${toBn(ans)} জন।`,
    };
  },
  (k) => {
    const p50 = 1 + (k % 3);
    const p10 = 1 + (Math.floor(k / 3) % 4);
    const p2 = 1 + ((k * 3) % 4);
    const ans = p50 * 50 + p10 * 10 + p2 * 2;
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
      learningObjective: 'Calculate total value of Bangladeshi Taka notes',
      prompt: `How much money is ${p50} fifty-Taka note(s), ${p10} ten-Taka note(s), and ${p2} two-Taka note(s)?`,
      promptBn: `${toBn(p50)}টি ৫০ টাকার নোট, ${toBn(p10)}টি ১০ টাকার নোট ও ${toBn(p2)}টি ২ টাকার নোট মিলে মোট কত টাকা?`,
      ...mc,
      explanation: `${p50}×50 + ${p10}×10 + ${p2}×2 = ${p50 * 50} + ${p10 * 10} + ${p2 * 2} = ${ans} Tk.`,
      explanationBn: `মোট = ${toBn(p50 * 50)} + ${toBn(p10 * 10)} + ${toBn(p2 * 2)} = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const a = 4 + (k % 15);
    const b = 3 + (Math.floor(k / 15) % 12);
    const step = 2 + (k % 4);
    const seq = [a, a + b, a + b - step, a + 2 * b - step, a + 2 * b - 2 * step];
    const ans = seq[4];
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 3,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Identify alternating add/subtract number rules',
      prompt: `Follow the rule (+${b}, then −${step}): ${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ___`,
      promptBn: `নিয়ম অনুযায়ী (+${toBn(b)}, তারপর −${toBn(step)}) পরের সংখ্যাটি কত: ${toBn(seq[0])}, ${toBn(seq[1])}, ${toBn(seq[2])}, ${toBn(seq[3])}, ___?`,
      ...mc,
      explanation: `The step after +${b} is −${step}: ${seq[3]} − ${step} = ${ans}.`,
      explanationBn: `${toBn(seq[3])} থেকে ${toBn(step)} বিয়োগ করলে ${toBn(ans)} হয়।`,
    };
  },
  (k) => {
    const startH = 1 + (k % 10);
    const addH = 1 + (Math.floor(k / 10) % 5);
    const raw = startH + addH;
    const endH = raw > 12 ? raw - 12 : raw;
    const mc = buildNumericOptions(endH, k, false, ':00', ':০০');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Add whole hours on a 12-hour clock',
      prompt: `A clock shows ${startH}:00. What time will it show ${addH} hour(s) later?`,
      promptBn: `ঘড়িতে এখন ${toBn(startH)}:০০ বাজে। ${toBn(addH)} ঘণ্টা পর ঘড়িতে কয়টা বাজবে?`,
      ...mc,
      explanation: `Counting ${addH} hour(s) after ${startH}:00 reaches ${endH}:00.`,
      explanationBn: `${toBn(startH)}:০০ থেকে ${toBn(addH)} ঘণ্টা পর ${toBn(endH)}:০০ বাজবে।`,
    };
  },

  // =========================================================================
  // 11-15: GRADE 2 (minGradeLevel: 2, maxGradeLevel: 3)
  // =========================================================================
  (k) => {
    const h = 1 + (k % 9);
    const t = (k * 3 + 2) % 10;
    const o = 1 + (Math.floor(k / 9) % 9);
    const ans = h * 100 + t * 10 + o;
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
      learningObjective: 'Convert expanded form into standard 3-digit numbers',
      prompt: `Write the number in standard form: $${h * 100} + ${t * 10} + ${o}$`,
      promptBn: `বিস্তারিত রূপ থেকে মূল সংখ্যাটি লেখো: ${toBn(h * 100)} + ${toBn(t * 10)} + ${toBn(o)}`,
      ...mc,
      explanation: `${h} hundreds + ${t} tens + ${o} ones = ${ans}.`,
      explanationBn: `${toBn(h)} শতক + ${toBn(t)} দশক + ${toBn(o)} একক = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const tens = 1 + (k % 9);
    const onesPool = [1, 2, 3, 4, 6, 7, 8, 9];
    const ones = onesPool[Math.floor(k / 9) % onesPool.length];
    const num = tens * 10 + ones;
    const ans = ones >= 5 ? (tens + 1) * 10 : tens * 10;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Sense',
      subskill: 'Estimation',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Round 2-digit numbers to the nearest ten',
      prompt: `Round ${num} to the nearest ten.`,
      promptBn: `${toBn(num)} সংখ্যাটিকে নিকটতম দশকে (nearest 10) আসন্ন মান করো।`,
      ...mc,
      explanation: `Because the ones digit is ${ones} (${ones >= 5 ? '5 or more' : 'less than 5'}), ${num} rounds to ${ans}.`,
      explanationBn: `এককের অঙ্ক ${toBn(ones)} হওয়ায় নিকটতম দশক হলো ${toBn(ans)}।`,
    };
  },
  (k) => {
    const groups = 3 + (k % 7);
    const perGroup = 4 + (Math.floor(k / 7) % 6);
    const rem = 1 + (k % (groups - 1));
    const total = groups * perGroup + rem;
    const mc = buildNumericOptions(rem, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Find the remainder in equal-sharing problems',
      prompt: `${total} sweets are packed equally into ${groups} boxes (as many as possible per box). How many sweets are left over?`,
      promptBn: `${toBn(total)}টি মিষ্টি ${toBn(groups)}টি বাক্সে সমানভাবে ভাগ করে রাখলে কয়টি মিষ্টি অবশিষ্ট (ভাগশেষ) থাকবে?`,
      ...mc,
      explanation: `${groups} × ${perGroup} = ${groups * perGroup}; remainder = ${total} − ${groups * perGroup} = ${rem}.`,
      explanationBn: `প্রতি বাক্সে ${toBn(perGroup)}টি করে রাখলে ${toBn(groups * perGroup)}টি লাগে; অবশিষ্ট = ${toBn(rem)}টি।`,
    };
  },
  (k) => {
    const side = 3 + (k % 15);
    const isSquare = Math.floor(k / 15) % 2 === 0;
    const ans = isSquare ? side * 4 : side * 3;
    const mc = buildNumericOptions(ans, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Perimeter',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find the perimeter of regular polygons',
      prompt: isSquare
        ? `Each side of a square tile is ${side} cm. What is its perimeter?`
        : `All 3 sides of an equilateral triangle measure ${side} cm each. What is its perimeter?`,
      promptBn: isSquare
        ? `একটি বর্গাকার টাইলসের প্রতিটি বাহু ${toBn(side)} সেমি হলে এর পরিসীমা কত?`
        : `একটি সমবাহু ত্রিভুজের প্রতিটি বাহু ${toBn(side)} সেমি হলে এর পরিসীমা কত?`,
      ...mc,
      explanation: isSquare
        ? `A square has 4 equal sides: 4 × ${side} = ${ans} cm.`
        : `An equilateral triangle has 3 equal sides: 3 × ${side} = ${ans} cm.`,
      explanationBn: isSquare
        ? `বর্গের ৪টি সমান বাহু: ৪ × ${toBn(side)} = ${toBn(ans)} সেমি।`
        : `ত্রিভুজের ৩টি সমান বাহু: ৩ × ${toBn(side)} = ${toBn(ans)} সেমি।`,
    };
  },
  (k) => {
    const red = 6 + (k % 15);
    const blue = 5 + (Math.floor(k / 15) % 14);
    const green = 4 + ((k * 3) % 10);
    const ans = red + blue - green;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Data comparison',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compare combined counts from a data table',
      prompt: `A class vote shows Red = ${red}, Blue = ${blue}, Green = ${green}. How many MORE votes did Red and Blue get together than Green?`,
      promptBn: `ভোটের তালিকায় লাল = ${toBn(red)}, নীল = ${toBn(blue)}, সবুজ = ${toBn(green)}। সবুজের চেয়ে লাল ও নীল একত্রে কত বেশি ভোট পেয়েছে?`,
      ...mc,
      explanation: `Red + Blue = ${red + blue}. Difference = ${red + blue} − ${green} = ${ans}.`,
      explanationBn: `লাল + নীল = ${toBn(red + blue)}; পার্থক্য = ${toBn(red + blue)} − ${toBn(green)} = ${toBn(ans)}।`,
    };
  },

  // =========================================================================
  // 16-20: GRADE 3 (minGradeLevel: 3, maxGradeLevel: 4)
  // =========================================================================
  (k) => {
    const den = 3 + (k % 7); // 3..9
    const num = 1 + (Math.floor(k / 7) % (den - 1));
    const mc = buildFractionOptions(num, den, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Equivalent fractions',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Write a simplified fraction from shaded parts',
      prompt: `A bar is divided into ${den} equal parts and ${num} parts are shaded. What fraction (in simplest form) is shaded?`,
      promptBn: `একটি দণ্ডকে সমান ${toBn(den)} ভাগে ভাগ করে ${toBn(num)} ভাগ রঙ করা হলো। রঙ করা অংশের লঘিষ্ঠ ভগ্নাংশ কত?`,
      ...mc,
      explanation: `Shaded parts / Total parts = ${num}/${den}, simplified to ${mc.correctAnswer}.`,
      explanationBn: `মোট ${toBn(den)} ভাগের মধ্যে ${toBn(num)} ভাগ রঙ করা, সরল করলে হয় ${mc.correctAnswerBn}।`,
      visualSvg: 'fraction_bar',
      visualData: { numerator: num, denominator: den },
    };
  },
  (k) => {
    const m = 2 + (k % 9);
    const cm = 15 + (Math.floor(k / 9) % 75);
    const ans = m * 100 + cm;
    const mc = buildNumericOptions(ans, k, false, ' cm', ' সেমি');
    return {
      domain: 'Measurement',
      subskill: 'Length & distance',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert meters and centimeters to centimeters',
      prompt: `Convert ${m} m ${cm} cm entirely into centimeters (cm).`,
      promptBn: `${toBn(m)} মিটার ${toBn(cm)} সেন্টিমিটারকে সেন্টিমিটারে (সেমি) প্রকাশ করো।`,
      ...mc,
      explanation: `1 m = 100 cm, so (${m} × 100) + ${cm} = ${ans} cm.`,
      explanationBn: `১ মিটার = ১০০ সেমি; তাই (${toBn(m)} × ১০০) + ${toBn(cm)} = ${toBn(ans)} সেমি।`,
    };
  },
  (k) => {
    const rows = 6 + (k % 12);
    const cols = 7 + (Math.floor(k / 12) % 11);
    const ans = rows * cols;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Multiply two numbers using row-column arrays',
      prompt: `A hall has ${rows} rows of chairs with ${cols} chairs in each row. How many chairs are there in total?`,
      promptBn: `একটি হলরুমে ${toBn(rows)}টি সারিতে প্রতিটিতে ${toBn(cols)}টি করে চেয়ার আছে। মোট কয়টি চেয়ার আছে?`,
      ...mc,
      explanation: `${rows} × ${cols} = ${ans} chairs.`,
      explanationBn: `${toBn(rows)} × ${toBn(cols)} = ${toBn(ans)}টি চেয়ার।`,
    };
  },
  (k) => {
    const a = 240 + (k % 350);
    const b = 125 + (Math.floor(k / 350) % 200) + (k % 7) * 15;
    const ans = a - b;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Subtract 3-digit currency amounts',
      prompt: `A jacket costs ${a} Tk and a sweater costs ${b} Tk. How much more does the jacket cost?`,
      promptBn: `একটি জ্যাকেটের দাম ${toBn(a)} টাকা ও একটি সোয়েটারের দাম ${toBn(b)} টাকা। জ্যাকেটটির দাম কত টাকা বেশি?`,
      ...mc,
      explanation: `${a} − ${b} = ${ans} Tk.`,
      explanationBn: `${toBn(a)} − ${toBn(b)} = ${toBn(ans)} টাকা বেশি।`,
    };
  },
  (k) => {
    const scale = [2, 3, 4, 5, 10][k % 5];
    const icons = 3 + (Math.floor(k / 5) % 12);
    const ans = scale * icons;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Chart interpretation',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Interpret scaled pictographs',
      prompt: `In a pictograph, 1 tree icon represents ${scale} trees planted. How many trees do ${icons} icons represent?`,
      promptBn: `একটি চিত্রলেখের ১টি গাছ চিহ্ন দ্বারা ${toBn(scale)}টি গাছ বোঝায়। ${toBn(icons)}টি চিহ্ন দ্বারা কয়টি গাছ বোঝাবে?`,
      ...mc,
      explanation: `${icons} × ${scale} = ${ans} trees.`,
      explanationBn: `${toBn(icons)} × ${toBn(scale)} = ${toBn(ans)}টি গাছ।`,
    };
  },

  // =========================================================================
  // 21-25: GRADE 4 (minGradeLevel: 4, maxGradeLevel: 5)
  // =========================================================================
  (k) => {
    const g = 2 + (k % 12);
    const m1 = 2 + (Math.floor(k / 12) % 4);
    const m2 = m1 + 1 + (k % 3); // coprime pairs when needed, check exact gcd
    const num1 = g * m1;
    const num2 = g * m2;
    const ans = gcd(num1, num2);
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
      learningObjective: 'Find the greatest common factor (GCF/HCF) of two numbers',
      prompt: `Find the Greatest Common Factor (HCF / গ.সা.গু.) of ${num1} and ${num2}.`,
      promptBn: `${toBn(num1)} এবং ${toBn(num2)}-এর গ.সা.গু. (সবচেয়ে বড় সাধারণ গুণনীয়ক) কত?`,
      ...mc,
      explanation: `The largest integer dividing both ${num1} and ${num2} evenly is ${ans}.`,
      explanationBn: `${toBn(num1)} ও ${toBn(num2)} উভয়কে নিঃশেষে ভাগ করা যায় এমন বৃহত্তম সংখ্যা ${toBn(ans)}।`,
    };
  },
  (k) => {
    const baseNum = 1 + (k % 5);
    const baseDen = baseNum + 1 + (Math.floor(k / 5) % 4);
    const mult = 2 + ((k * 3) % 8);
    const ans = baseNum * mult;
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
      learningObjective: 'Find missing numerator in equivalent fractions',
      prompt: `Fill in the missing numerator: $\\frac{${baseNum}}{${baseDen}} = \\frac{?}{${baseDen * mult}}$`,
      promptBn: `সমতুল ভগ্নাংশ পূরণ করো: $\\frac{${baseNum}}{${baseDen}} = \\frac{?}{${baseDen * mult}}$`,
      ...mc,
      explanation: `Multiply top and bottom by ${mult}: ${baseNum} × ${mult} = ${ans}.`,
      explanationBn: `লব ও হরকে ${toBn(mult)} দিয়ে গুণ করলে লব = ${toBn(baseNum)} × ${toBn(mult)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const l = 6 + (k % 18);
    const w = 3 + (Math.floor(k / 18) % 10);
    const askArea = k % 2 === 0;
    const ans = askArea ? l * w : 2 * (l + w);
    const mc = buildNumericOptions(ans, k, false, askArea ? ' sq cm' : ' cm', askArea ? ' বর্গসেমি' : ' সেমি');
    return {
      domain: 'Geometry',
      subskill: askArea ? 'Area' : 'Perimeter',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Distinguish and compute rectangle area and perimeter',
      prompt: askArea
        ? `A rectangle is ${l} cm long and ${w} cm wide. Find its AREA.`
        : `A rectangle is ${l} cm long and ${w} cm wide. Find its PERIMETER.`,
      promptBn: askArea
        ? `একটি আয়তক্ষেত্রের দৈর্ঘ্য ${toBn(l)} সেমি এবং প্রস্থ ${toBn(w)} সেমি হলে এর ক্ষেত্রফল কত?`
        : `একটি আয়তক্ষেত্রের দৈর্ঘ্য ${toBn(l)} সেমি এবং প্রস্থ ${toBn(w)} সেমি হলে এর পরিসীমা কত?`,
      ...mc,
      explanation: askArea
        ? `Area = length × width = ${l} × ${w} = ${ans} sq cm.`
        : `Perimeter = 2 × (length + width) = 2 × (${l} + ${w}) = ${ans} cm.`,
      explanationBn: askArea
        ? `ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ = ${toBn(l)} × ${toBn(w)} = ${toBn(ans)} বর্গসেমি।`
        : `পরিসীমা = ২ × (দৈর্ঘ্য + প্রস্থ) = ২ × (${toBn(l)} + ${toBn(w)}) = ${toBn(ans)} সেমি।`,
    };
  },
  (k) => {
    const startH = 7 + (k % 5);
    const startM = [10, 15, 20, 30, 45][Math.floor(k / 5) % 5];
    const durM = 25 + ((k * 7) % 65);
    const totalM = startH * 60 + startM + durM;
    const endH = Math.floor(totalM / 60);
    const endM = totalM % 60;
    const fmtTime = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
    const correct = fmtTime(endH, endM);
    const pool: [string, string][] = [
      [fmtTime(endH, (endM + 10) % 60), toBn(fmtTime(endH, (endM + 10) % 60))],
      [fmtTime(endH + 1, endM), toBn(fmtTime(endH + 1, endM))],
      [fmtTime(Math.max(1, endH - 1), (endM + 15) % 60), toBn(fmtTime(Math.max(1, endH - 1), (endM + 15) % 60))],
      [fmtTime(endH, (endM + 20) % 60), toBn(fmtTime(endH, (endM + 20) % 60))],
    ];
    const mc = buildStringOptions(correct, toBn(correct), pool, k);
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute end times with minute regrouping',
      prompt: `A class begins at ${fmtTime(startH, startM)} and lasts ${durM} minutes. When does it end?`,
      promptBn: `একটি ক্লাস ${toBn(fmtTime(startH, startM))} টায় শুরু হয়ে ${toBn(durM)} মিনিট চলে। ক্লাসটি কয়টায় শেষ হবে?`,
      ...mc,
      explanation: `Adding ${durM} minutes to ${fmtTime(startH, startM)} gives ${correct}.`,
      explanationBn: `${toBn(fmtTime(startH, startM))} এর সাথে ${toBn(durM)} মিনিট যোগ করলে ${toBn(correct)} হয়।`,
    };
  },
  (k) => {
    const kg = 1 + (k % 8);
    const g = 50 + (Math.floor(k / 8) % 18) * 50;
    const ans = kg * 1000 + g;
    const mc = buildNumericOptions(ans, k, false, ' g', ' গ্রাম');
    return {
      domain: 'Measurement',
      subskill: 'Mass & capacity',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert kilograms and grams to grams',
      prompt: `How many grams are in ${kg} kg ${g} g?`,
      promptBn: `${toBn(kg)} কেজি ${toBn(g)} গ্রামে মোট কত গ্রাম হয়?`,
      ...mc,
      explanation: `1 kg = 1,000 g. So (${kg} × 1000) + ${g} = ${ans} g.`,
      explanationBn: `১ কেজি = ১০০০ গ্রাম; তাই (${toBn(kg)} × ১০০০) + ${toBn(g)} = ${toBn(ans)} গ্রাম।`,
    };
  },

  // =========================================================================
  // 26-30: GRADE 5 (minGradeLevel: 5, maxGradeLevel: 6)
  // =========================================================================
  (k) => {
    const aInt = 1 + (k % 12);
    const aDec = 15 + ((k * 7) % 80);
    const bInt = 1 + (Math.floor(k / 12) % 9);
    const bDec = 10 + ((k * 11) % 85);
    const valA = aInt + aDec / 100;
    const valB = bInt + bDec / 100;
    const ans = Number((valA + valB).toFixed(2));
    const mc = buildNumericOptions(ans, k, false, '', '', 2);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Add decimals to the hundredths place accurately',
      prompt: `Add the decimals: $${valA.toFixed(2)} + ${valB.toFixed(2)} = ?$`,
      promptBn: `দশমিক যোগ করো: ${toBn(valA.toFixed(2))} + ${toBn(valB.toFixed(2))} = কত?`,
      ...mc,
      explanation: `Align the decimal points: ${valA.toFixed(2)} + ${valB.toFixed(2)} = ${ans.toFixed(2)}.`,
      explanationBn: `দশমিক বিন্দু নিচে নিচে রেখে যোগ করলে হয় ${toBn(ans.toFixed(2))}।`,
    };
  },
  (k) => {
    const base = 60 + (k % 25);
    const d1 = 2 + (Math.floor(k / 25) % 5);
    const s1 = base - d1;
    const s2 = base;
    const s3 = base + d1;
    const s4 = base + 2 * d1;
    const s5 = base - 2 * d1;
    const mc = buildNumericOptions(base, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mean & median',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate the arithmetic mean of 5 numbers',
      prompt: `Find the average (mean) of the scores: ${s1}, ${s2}, ${s3}, ${s4}, ${s5}.`,
      promptBn: `${toBn(s1)}, ${toBn(s2)}, ${toBn(s3)}, ${toBn(s4)}, ${toBn(s5)} সংখ্যাগুলোর গড় কত?`,
      ...mc,
      explanation: `Sum = ${base * 5}. Average = ${base * 5} ÷ 5 = ${base}.`,
      explanationBn: `যোগফল = ${toBn(base * 5)}; গড় = ${toBn(base * 5)} ÷ ৫ = ${toBn(base)}।`,
    };
  },
  (k) => {
    const pct = [10, 15, 20, 25, 30, 40, 50, 75][k % 8];
    const mult = 2 + (Math.floor(k / 8) % 24);
    const whole = mult * 20;
    const ans = (pct * whole) / 100;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Percentage conversion',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute percentages of whole quantities',
      prompt: `What is ${pct}% of ${whole}?`,
      promptBn: `${toBn(whole)}-এর ${toBn(pct)}% কত?`,
      ...mc,
      explanation: `${pct}% of ${whole} = (${pct}/100) × ${whole} = ${ans}.`,
      explanationBn: `${toBn(whole)} × ${toBn(pct)}/১০০ = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const n1 = 3 + (k % 6);
    const unitCost = 12 + (Math.floor(k / 6) % 15);
    const cost1 = n1 * unitCost;
    const n2 = n1 + 2 + (k % 5);
    const ans = n2 * unitCost;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Unit rate',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve unitary method cost problems',
      prompt: `If ${n1} notebooks cost ${cost1} Tk, how much will ${n2} identical notebooks cost?`,
      promptBn: `যদি ${toBn(n1)}টি খাতার দাম ${toBn(cost1)} টাকা হয়, তবে এরূপ ${toBn(n2)}টি খাতার দাম কত টাকা হবে?`,
      ...mc,
      explanation: `1 notebook = ${cost1} ÷ ${n1} = ${unitCost} Tk. So ${n2} notebooks = ${n2} × ${unitCost} = ${ans} Tk.`,
      explanationBn: `১টি খাতার দাম ${toBn(unitCost)} টাকা; তাই ${toBn(n2)}টি খাতার দাম ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const a = 2 + (k % 8);
    const b = 3 + (Math.floor(k / 8) % 9);
    const c = 2 + ((k * 3) % 7);
    const d = 1 + ((k * 5) % 9);
    const ans = (a + b) * c - d;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Apply BODMAS with parentheses, multiplication, and subtraction',
      prompt: `Evaluate: $(${a} + ${b}) \\times ${c} - ${d}$`,
      promptBn: `সরল করো: $(${toBn(a)} + ${toBn(b)}) \\times ${toBn(c)} - ${toBn(d)}$`,
      ...mc,
      explanation: `Parentheses first: ${a + b} × ${c} − ${d} = ${(a + b) * c} − ${d} = ${ans}.`,
      explanationBn: `প্রথমে বন্ধনী: ${toBn(a + b)} × ${toBn(c)} − ${toBn(d)} = ${toBn((a + b) * c)} − ${toBn(d)} = ${toBn(ans)}।`,
    };
  },

  // =========================================================================
  // 31-35: GRADE 6 (minGradeLevel: 6, maxGradeLevel: 8)
  // =========================================================================
  (k) => {
    const r1 = 2 + (k % 5);
    const r2 = r1 + 1 + (Math.floor(k / 5) % 4);
    const unit = 5 + ((k * 3) % 15);
    const total = (r1 + r2) * unit;
    const askLarger = k % 2 === 0;
    const ans = askLarger ? r2 * unit : r1 * unit;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Direct proportion',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Divide an amount into a given two-part ratio',
      prompt: askLarger
        ? `Divide ${total} Tk in the ratio ${r1} : ${r2}. What is the LARGER share?`
        : `Divide ${total} Tk in the ratio ${r1} : ${r2}. What is the SMALLER share?`,
      promptBn: askLarger
        ? `${toBn(total)} টাকাকে ${toBn(r1)} : ${toBn(r2)} অনুপাতে ভাগ করলে বড় অংশ কত টাকা হবে?`
        : `${toBn(total)} টাকাকে ${toBn(r1)} : ${toBn(r2)} অনুপাতে ভাগ করলে ছোট অংশ কত টাকা হবে?`,
      ...mc,
      explanation: `Total parts = ${r1 + r2}. Each part = ${total} ÷ ${r1 + r2} = ${unit} Tk. Target share = ${ans} Tk.`,
      explanationBn: `অনুপাতের যোগফল ${toBn(r1 + r2)}; ১ ভাগ = ${toBn(unit)} টাকা; নির্ণেয় অংশ = ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const a = -15 + (k % 25);
    const b = 4 + (Math.floor(k / 25) % 15);
    const c = 2 + ((k * 3) % 12);
    const ans = a + b - (-c);
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Number Sense',
      subskill: 'Mental mathematics',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Add and subtract positive and negative integers',
      prompt: `Simplify the integer expression: $(${a}) + ${b} - (-${c})$`,
      promptBn: `পূর্ণসংখ্যার মান নির্ণয় করো: $(${a}) + ${b} - (-${c})$`,
      ...mc,
      explanation: `Subtracting a negative adds it: ${a} + ${b} + ${c} = ${ans}.`,
      explanationBn: `$-(-${c}) = +${c}$; তাই ${a} + ${b} + ${c} = ${ans} (${toBn(ans)})।`,
    };
  },
  (k) => {
    const angle = 15 + (k % 65);
    const isSupp = Math.floor(k / 65) % 2 === 0;
    const ans = isSupp ? 180 - angle : 90 - angle;
    const mc = buildNumericOptions(ans, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find supplementary and complementary angles',
      prompt: isSupp
        ? `What is the SUPPLEMENT of a ${angle}° angle?`
        : `What is the COMPLEMENT of a ${angle}° angle?`,
      promptBn: isSupp
        ? `${toBn(angle)}° কোণের সম্পূরক কোণ কত ডিগ্রি?`
        : `${toBn(angle)}° কোণের পূরক কোণ কত ডিগ্রি?`,
      ...mc,
      explanation: isSupp
        ? `Supplementary angles sum to 180°: 180° − ${angle}° = ${ans}°.`
        : `Complementary angles sum to 90°: 90° − ${angle}° = ${ans}°.`,
      explanationBn: isSupp
        ? `সম্পূরক কোণদ্বয়ের সমষ্টি ১৮০°; ১৮০° − ${toBn(angle)}° = ${toBn(ans)}°।`
        : `পূরক কোণদ্বয়ের সমষ্টি ৯০°; ৯০° − ${toBn(angle)}° = ${toBn(ans)}°।`,
    };
  },
  (k) => {
    const a = 2 + (k % 7);
    const x = 2 + (Math.floor(k / 7) % 12);
    const b = 3 + ((k * 2) % 11);
    const c = a * x + b;
    const mc = buildNumericOptions(x, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve two-step linear equations in one variable',
      prompt: `Solve for $x$: $${a}x + ${b} = ${c}$`,
      promptBn: `সমাধান করে $x$-এর মান বের করো: $${a}x + ${b} = ${c}$`,
      ...mc,
      explanation: `${a}x = ${c} − ${b} = ${c - b}, so x = ${c - b} ÷ ${a} = ${x}.`,
      explanationBn: `$${a}x = ${c - b}$, তাই $x = \\frac{${c - b}}{${a}} = ${x}$ (${toBn(x)})।`,
    };
  },
  (k) => {
    const x = 1 + (k % 8);
    const y = 1 + (Math.floor(k / 8) % 8);
    const dx = 2 + (k % 5);
    const ansX = x + dx;
    const correct = `(${ansX}, ${y})`;
    const pool: [string, string][] = [
      [`(${x}, ${y + dx})`, `(${toBn(x)}, ${toBn(y + dx)})`],
      [`(${Math.max(0, x - dx)}, ${y})`, `(${toBn(Math.max(0, x - dx))}, ${toBn(y)})`],
      [`(${ansX}, ${y + 1})`, `(${toBn(ansX)}, ${toBn(y + 1)})`],
      [`(${y}, ${ansX})`, `(${toBn(y)}, ${toBn(ansX)})`],
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
      learningObjective: 'Translate a coordinate point horizontally on a plane',
      prompt: `The point $P(${x}, ${y})$ is shifted ${dx} units to the RIGHT. What are its new coordinates?`,
      promptBn: `$P(${toBn(x)}, ${toBn(y)})$ বিন্দুটিকে ডানদিকে ${toBn(dx)} একক সরালে নতুন স্থানাঙ্ক কী হবে?`,
      ...mc,
      explanation: `Moving right adds ${dx} to the x-coordinate: (${x} + ${dx}, ${y}) = ${correct}.`,
      explanationBn: `ডানে সরালে ভুজ (x) এর সাথে ${toBn(dx)} যোগ হয়: (${toBn(ansX)}, ${toBn(y)})।`,
      visualSvg: 'coordinate_point',
      visualData: { x, y },
    };
  },

  // =========================================================================
  // 36-40: GRADE 7 (minGradeLevel: 7, maxGradeLevel: 9)
  // =========================================================================
  (k) => {
    const cp = (2 + (k % 15)) * 100;
    const profitPct = [5, 10, 12, 15, 20, 25, 30][Math.floor(k / 15) % 7];
    const sp = cp + (cp * profitPct) / 100;
    const mc = buildNumericOptions(profitPct, k, false, '%', '%');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute percentage profit from cost and selling price',
      prompt: `A shopkeeper buys an item for ${cp} Tk and sells it for ${sp} Tk. What is the profit percentage?`,
      promptBn: `একজন বিক্রেতা একটি পণ্য ${toBn(cp)} টাকায় কিনে ${toBn(sp)} টাকায় বিক্রি করলেন। শতকরা লাভের হার কত?`,
      ...mc,
      explanation: `Profit = ${sp} − ${cp} = ${sp - cp} Tk. Profit % = (${sp - cp}/${cp}) × 100 = ${profitPct}%.`,
      explanationBn: `লাভ = ${toBn(sp - cp)} টাকা; শতকরা লাভ = (${toBn(sp - cp)}/${toBn(cp)}) × ১০০ = ${toBn(profitPct)}%।`,
    };
  },
  (k) => {
    const p = (5 + (k % 12)) * 200; // 1000..3200
    const r = 4 + (Math.floor(k / 12) % 6); // 4..9%
    const t = 2 + (k % 4); // 2..5 yrs
    const ans = (p * r * t) / 100;
    const mc = buildNumericOptions(ans, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply the simple interest formula I = Prt',
      prompt: `Find the simple interest on ${p} Tk at ${r}% per year for ${t} years.`,
      promptBn: `বার্ষিক ${toBn(r)}% সরল মুনাফায় ${toBn(p)} টাকার ${toBn(t)} বছরের মুনাফা কত টাকা?`,
      ...mc,
      explanation: `I = (P × r × t) / 100 = (${p} × ${r} × ${t}) / 100 = ${ans} Tk.`,
      explanationBn: `সরল মুনাফা $I = \\frac{${p}\\times ${r}\\times ${t}}{100} = ${ans}$ (${toBn(ans)}) টাকা।`,
    };
  },
  (k) => {
    const a = 35 + (k % 50);
    const b = 30 + (Math.floor(k / 50) % 45);
    const c = 180 - (a + b);
    const mc = buildNumericOptions(c, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Use triangle angle sum (180°) to find an unknown angle',
      prompt: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`,
      promptBn: `একটি ত্রিভুজের দুটি কোণ ${toBn(a)}° এবং ${toBn(b)}° হলে তৃতীয় কোণটি কত ডিগ্রি?`,
      ...mc,
      explanation: `The sum of angles in a triangle is 180°: 180° − (${a}° + ${b}°) = ${c}°.`,
      explanationBn: `ত্রিভুজের তিন কোণের সমষ্টি ১৮০°; তাই তৃতীয় কোণ = ১৮০° − (${toBn(a)}° + ${toBn(b)}°) = ${toBn(c)}°।`,
      visualSvg: 'angle_triangle',
      visualData: { angleA: a, angleB: b },
    };
  },
  (k) => {
    const a = 3 + (k % 10);
    const b = 2 + (Math.floor(k / 10) % 9);
    const c = 2 + ((k * 3) % 7);
    const ans = a * a + b * b - c * c;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate expressions involving integer squares',
      prompt: `Evaluate: $${a}^2 + ${b}^2 - ${c}^2$`,
      promptBn: `মান নির্ণয় করো: $${a}^2 + ${b}^2 - ${c}^2$`,
      ...mc,
      explanation: `${a}² + ${b}² − ${c}² = ${a * a} + ${b * b} − ${c * c} = ${ans}.`,
      explanationBn: `${toBn(a * a)} + ${toBn(b * b)} − ${toBn(c * c)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const speed = 36 + (k % 8) * 6;
    const hrs = 2 + (Math.floor(k / 8) % 6);
    const half = k % 2 === 1 ? 0.5 : 0;
    const t = hrs + half;
    const ans = speed * t;
    const mc = buildNumericOptions(ans, k, false, ' km', ' কিমি');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Calculate distance from speed and time',
      prompt: `A train travels at a steady speed of ${speed} km/h for ${t} hours. How far does it travel?`,
      promptBn: `একটি ট্রেন ঘণ্টায় ${toBn(speed)} কিমি বেগে ${toBn(t)} ঘণ্টা চললে কত দূরত্ব অতিক্রম করবে?`,
      ...mc,
      explanation: `Distance = Speed × Time = ${speed} × ${t} = ${ans} km.`,
      explanationBn: `দূরত্ব = বেগ × সময় = ${toBn(speed)} × ${toBn(t)} = ${toBn(ans)} কিমি।`,
    };
  },

  // =========================================================================
  // 41-45: GRADE 8 (minGradeLevel: 8, maxGradeLevel: 10)
  // =========================================================================
  (k) => {
    const a = 12 + (k % 25);
    const b = 3 + (Math.floor(k / 25) % 9);
    const ans = (a + b) * (a - b);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply difference of squares identity a² − b² = (a+b)(a−b)',
      prompt: `Using algebraic identities, evaluate: $${a}^2 - ${b}^2$`,
      promptBn: `বীজগাণিতিক সূত্র ব্যবহার করে মান নির্ণয় করো: $${a}^2 - ${b}^2$`,
      ...mc,
      explanation: `a² − b² = (a + b)(a − b) = (${a + b})(${a - b}) = ${ans}.`,
      explanationBn: `$(a+b)(a-b) = (${toBn(a + b)})\\times(${toBn(a - b)}) = ${toBn(ans)}$।`,
    };
  },
  (k) => {
    const triplets: [number, number, number][] = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ];
    const tIdx = k % triplets.length;
    const scale = 1 + (Math.floor(k / triplets.length) % 10);
    const a = triplets[tIdx][0] * scale;
    const b = triplets[tIdx][1] * scale;
    const c = triplets[tIdx][2] * scale;
    const mc = buildNumericOptions(c, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Properties of shapes',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 11,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Use the Pythagorean theorem to find the hypotenuse',
      prompt: `A right-angled triangle has legs of length ${a} cm and ${b} cm. Find the length of its hypotenuse.`,
      promptBn: `একটি সমকোণী ত্রিভুজের সমকোণ সংলগ্ন বাহু দুটি ${toBn(a)} সেমি ও ${toBn(b)} সেমি হলে অতিভুজের দৈর্ঘ্য কত?`,
      ...mc,
      explanation: `c = √(${a}² + ${b}²) = √(${a * a + b * b}) = ${c} cm.`,
      explanationBn: `পিথাগোরাসের উপপাদ্য: $\\sqrt{${a}^2 + ${b}^2} = ${c}$ (${toBn(c)}) সেমি।`,
    };
  },
  (k) => {
    const l = 4 + (k % 8);
    const w = 3 + (Math.floor(k / 8) % 6);
    const h = 2 + ((k * 3) % 7);
    const askVol = k % 2 === 0;
    const ans = askVol ? l * w * h : 2 * (l * w + w * h + h * l);
    const mc = buildNumericOptions(
      ans,
      k,
      false,
      askVol ? ' cm³' : ' cm²',
      askVol ? ' ঘনসেমি' : ' বর্গসেমি'
    );
    return {
      domain: 'Geometry',
      subskill: 'Volume',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute volume or surface area of a rectangular prism',
      prompt: askVol
        ? `Find the VOLUME of a cuboid with dimensions ${l} cm × ${w} cm × ${h} cm.`
        : `Find the total SURFACE AREA of a cuboid with dimensions ${l} cm × ${w} cm × ${h} cm.`,
      promptBn: askVol
        ? `${toBn(l)} সেমি × ${toBn(w)} সেমি × ${toBn(h)} সেমি মাপের একটি আয়তাকার ঘনবস্তুর আয়তন কত?`
        : `${toBn(l)} সেমি × ${toBn(w)} সেমি × ${toBn(h)} সেমি মাপের একটি আয়তাকার ঘনবস্তুর সমগ্র পৃষ্ঠতলের ক্ষেত্রফল কত?`,
      ...mc,
      explanation: askVol
        ? `Volume = l × w × h = ${l} × ${w} × ${h} = ${ans} cm³.`
        : `Surface area = 2(lw + wh + hl) = ${ans} cm².`,
      explanationBn: askVol
        ? `আয়তন = দৈর্ঘ্য × প্রস্থ × উচ্চতা = ${toBn(ans)} ঘনসেমি।`
        : `সমগ্র তলের ক্ষেত্রফল = ২(lw + wh + hl) = ${toBn(ans)} বর্গসেমি।`,
    };
  },
  (k) => {
    const price = (4 + (k % 12)) * 250; // 1000..3750
    const d1 = 10;
    const d2 = [10, 20, 25][Math.floor(k / 12) % 3];
    const finalPrice = price * (1 - d1 / 100) * (1 - d2 / 100);
    const mc = buildNumericOptions(finalPrice, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute final price after two successive percentage discounts',
      prompt: `A jacket marked at ${price} Tk gets a ${d1}% discount, followed by an extra ${d2}% off the reduced price. What is the final price?`,
      promptBn: `${toBn(price)} টাকা দামের একটি জ্যাকেটে প্রথমে ${toBn(d1)}% ও পরে হ্রাসকৃত মূল্যের ওপর আরও ${toBn(d2)}% ছাড় দেওয়া হলে বিক্রয়মূল্য কত হবে?`,
      ...mc,
      explanation: `After ${d1}% off: ${price * 0.9} Tk. After another ${d2}% off: ${price * 0.9} × ${1 - d2 / 100} = ${finalPrice} Tk.`,
      explanationBn: `${toBn(d1)}% ছাড়ে ${toBn(price * 0.9)} টাকা; এরপর ${toBn(d2)}% ছাড়ে ${toBn(finalPrice)} টাকা।`,
    };
  },
  (k) => {
    const v1 = 10 + (k % 12);
    const v2 = v1 + 3 + (Math.floor(k / 12) % 5);
    const v3 = v2 + 2 + (k % 6);
    const v4 = v3 + 4 + (Math.floor(k / 6) % 5);
    const v5 = v4 + 3 + (k % 4);
    const askMedian = k % 2 === 0;
    const ans = askMedian ? v3 : v5 - v1;
    // unsorted display order
    const list = [v4, v1, v5, v2, v3];
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: askMedian ? 'Mean & median' : 'Mode & range',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find the median or range of an unsorted data set',
      prompt: askMedian
        ? `Find the MEDIAN of the data set: ${list.join(', ')}.`
        : `Find the RANGE of the data set: ${list.join(', ')}.`,
      promptBn: askMedian
        ? `${list.map((n) => toBn(n)).join(', ')} উপাত্তগুলোর মধ্যক (Median) কত?`
        : `${list.map((n) => toBn(n)).join(', ')} উপাত্তগুলোর পরিসর (Range) কত?`,
      ...mc,
      explanation: askMedian
        ? `Sorted: ${v1}, ${v2}, ${v3}, ${v4}, ${v5}. The middle value is ${v3}.`
        : `Range = Max − Min = ${v5} − ${v1} = ${ans}.`,
      explanationBn: askMedian
        ? `মানের ক্রমে সাজালে মধ্যম পদটি হলো ${toBn(v3)}।`
        : `পরিসর = সর্বোচ্চ − সর্বনিম্ন = ${toBn(v5)} − ${toBn(v1)} = ${toBn(ans)}।`,
    };
  },

  // =========================================================================
  // 46-50: GRADE 9 (minGradeLevel: 9, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const r = 7 * (1 + (k % 10)); // 7, 14, ..., 70
    const askArea = Math.floor(k / 10) % 2 === 0;
    const ans = askArea ? 22 * (r / 7) * r : 2 * 22 * (r / 7);
    const mc = buildNumericOptions(
      ans,
      k,
      false,
      askArea ? ' cm²' : ' cm',
      askArea ? ' বর্গসেমি' : ' সেমি'
    );
    return {
      domain: 'Geometry',
      subskill: askArea ? 'Area' : 'Perimeter',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute circle circumference or area using pi = 22/7',
      prompt: askArea
        ? `Taking $\\pi = \\frac{22}{7}$, find the AREA of a circle with radius $r = ${r}$ cm.`
        : `Taking $\\pi = \\frac{22}{7}$, find the CIRCUMFERENCE of a circle with radius $r = ${r}$ cm.`,
      promptBn: askArea
        ? `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধের বৃত্তের ক্ষেত্রফল কত?`
        : `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধের বৃত্তের পরিধি কত?`,
      ...mc,
      explanation: askArea
        ? `Area = πr² = (22/7) × ${r} × ${r} = ${ans} cm².`
        : `Circumference = 2πr = 2 × (22/7) × ${r} = ${ans} cm.`,
      explanationBn: askArea
        ? `ক্ষেত্রফল $= \\frac{22}{7} \\times ${r}^2 = ${ans}$ (${toBn(ans)}) বর্গসেমি।`
        : `পরিধি $= 2 \\times \\frac{22}{7} \\times ${r} = ${ans}$ (${toBn(ans)}) সেমি।`,
    };
  },
  (k) => {
    const x = 3 + (k % 12);
    const y = 2 + (Math.floor(k / 12) % 10);
    const sum = x + y;
    const diff = x - y;
    const ans = x * y;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve simultaneous linear equations and compute xy',
      prompt: `If $x + y = ${sum}$ and $x - y = ${diff}$, find the value of $xy$.`,
      promptBn: `$x + y = ${sum}$ এবং $x - y = ${diff}$ হলে, $xy$-এর মান কত?`,
      ...mc,
      explanation: `Adding gives 2x = ${sum + diff} → x = ${x}, so y = ${y}. Thus xy = ${x} × ${y} = ${ans}.`,
      explanationBn: `যোগ করে $x = ${x}$ ও $y = ${y}$ পাই; অতএব $xy = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const base1 = 2 + (k % 4); // 2, 3, 4, 5
    const exp1 = 2 + (Math.floor(k / 4) % 4); // 2..5
    const base2 = 2 + ((k * 3) % 4);
    const exp2 = 1 + ((k * 5) % 4);
    const val1 = Math.pow(base1, exp1);
    const val2 = Math.pow(base2, exp2);
    const ans = exp1 + exp2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Evaluate sums of basic logarithms',
      prompt: `Evaluate: $\\log_{${base1}}(${val1}) + \\log_{${base2}}(${val2})$`,
      promptBn: `মান নির্ণয় করো: $\\log_{${base1}}(${val1}) + \\log_{${base2}}(${val2})$`,
      ...mc,
      explanation: `Since ${base1}^${exp1} = ${val1} and ${base2}^${exp2} = ${val2}, the sum is ${exp1} + ${exp2} = ${ans}.`,
      explanationBn: `${toBn(exp1)} + ${toBn(exp2)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 2 + (k % 7);
    const r = 2 + (Math.floor(k / 7) % 3); // 2, 3, 4
    const n = 4 + (k % 3); // 4, 5, 6
    const ans = a * Math.pow(r, n - 1);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Geometric sequences',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find the n-th term of a geometric progression',
      prompt: `Find the ${n}th term of the geometric sequence: $${a}, ${a * r}, ${a * r * r}, \\dots$`,
      promptBn: `$${a}, ${a * r}, ${a * r * r}, \\dots$ গুণোত্তর ধারাটির ${toBn(n)}-তম পদ কত?`,
      ...mc,
      explanation: `Common ratio r = ${r}. The ${n}th term = ${a} × ${r}^(${n}−1) = ${ans}.`,
      explanationBn: `সাধারণ অনুপাত $r = ${r}$; ${toBn(n)}-তম পদ $= ${a} \\times ${r}^{${n - 1}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const adj = 3 + (k % 12);
    const deg = 45;
    const hypSide = adj;
    void hypSide;
    const mult = 2 + (Math.floor(k / 12) % 10);
    // Use 30-60-90 or 45-45-90 right triangle: if angle = 45, tan(45) = 1 -> opposite = adjacent
    // For variety: sec/tan or cos(60)=1/2 -> hypotenuse = 2*adj
    const use60 = k % 2 === 0;
    const ans = use60 ? mult * 2 : mult;
    const mc = buildNumericOptions(ans, k, false, ' m', ' মিটার');
    return {
      domain: 'Geometry',
      subskill: 'Properties of shapes',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Solve right-triangle problems using special trig angles (45° and 60°)',
      prompt: use60
        ? `A ladder leans against a wall making a $60^\\circ$ angle with the ground. If the foot of the ladder is $${mult}$ m from the wall, how long is the ladder?`
        : `From a point $${mult}$ m away from the base of a pole, the angle of elevation to its top is $${deg}^\\circ$. How tall is the pole?`,
      promptBn: use60
        ? `একটি মই ভূমির সাথে $60^\\circ$ কোণ উৎপন্ন করে দেয়ালে হেলানো আছে। মইয়ের গোড়া দেয়াল থেকে $${mult}$ মিটার দূরে থাকলে মইয়ের দৈর্ঘ্য কত?`
        : `একটি খুঁটির গোড়া থেকে $${mult}$ মিটার দূরে মাটিতে উন্নতি কোণ $${deg}^\\circ$ হলে খুঁটিটির উচ্চতা কত?`,
      ...mc,
      explanation: use60
        ? `cos(60°) = 1/2 = adjacent/hypotenuse, so ladder length = 2 × ${mult} = ${ans} m.`
        : `tan(45°) = 1 = height/base, so height = ${mult} m.`,
      explanationBn: use60
        ? `$\\cos 60^\\circ = \\frac{1}{2}$ হওয়ায় মইয়ের দৈর্ঘ্য $= 2 \\times ${mult} = ${ans}$ (${toBn(ans)}) মিটার।`
        : `$\\tan 45^\\circ = 1$ হওয়ায় খুঁটির উচ্চতা $= ${mult}$ (${toBn(mult)}) মিটার।`,
    };
  },

  // =========================================================================
  // 51-55: GRADE 10 (minGradeLevel: 10, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const r1 = 2 + (k % 9);
    const r2 = 1 + (Math.floor(k / 9) % 8);
    const b = -(r1 + r2);
    const c = r1 * r2;
    const askProduct = k % 2 === 0;
    const ans = askProduct ? c : r1 + r2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Use Vieta’s formulas for sum and product of quadratic roots',
      prompt: askProduct
        ? `For the quadratic equation $x^2 ${b}x + ${c} = 0$, find the PRODUCT of its roots ($\\alpha\\beta$).`
        : `For the quadratic equation $x^2 ${b}x + ${c} = 0$, find the SUM of its roots ($\\alpha + \\beta$).`,
      promptBn: askProduct
        ? `$x^2 ${b}x + ${c} = 0$ দ্বিঘাত সমীকরণের মূলদ্বয়ের গুণফল ($\\alpha\\beta$) কত?`
        : `$x^2 ${b}x + ${c} = 0$ দ্বিঘাত সমীকরণের মূলদ্বয়ের যোগফল ($\\alpha + \\beta$) কত?`,
      ...mc,
      explanation: askProduct
        ? `Product of roots = c/a = ${c}/1 = ${ans}.`
        : `Sum of roots = −b/a = −(${b})/1 = ${ans}.`,
      explanationBn: askProduct
        ? `মূলদ্বয়ের গুণফল $= c/a = ${ans}$ (${toBn(ans)})।`
        : `মূলদ্বয়ের যোগফল $= -b/a = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const r = 7 * (1 + (k % 3)); // 7, 14, 21
    const h = 3 + (Math.floor(k / 3) % 15);
    const ans = (22 / 7) * r * r * h;
    const mc = buildNumericOptions(ans, k, false, ' cm³', ' ঘনসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Volume',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Calculate volume of a right circular cylinder',
      prompt: `Using $\\pi = \\frac{22}{7}$, find the volume of a cylinder with radius $r = ${r}$ cm and height $h = ${h}$ cm.`,
      promptBn: `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধ ও $${h}$ সেমি উচ্চতা বিশিষ্ট বেলনের (Cylinder) আয়তন কত?`,
      ...mc,
      explanation: `V = πr²h = (22/7) × ${r}² × ${h} = ${ans} cm³.`,
      explanationBn: `আয়তন $V = \\pi r^2 h = \\frac{22}{7} \\times ${r}^2 \\times ${h} = ${ans}$ (${toBn(ans)}) ঘনসেমি।`,
    };
  },
  (k) => {
    const both = 4 + (k % 12);
    const onlyA = 6 + (Math.floor(k / 12) % 15);
    const onlyB = 5 + ((k * 3) % 14);
    const nA = onlyA + both;
    const nB = onlyB + both;
    const ans = nA + nB - both;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Logical deduction',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Apply inclusion-exclusion principle for two sets',
      prompt: `In a survey, $n(A) = ${nA}$, $n(B) = ${nB}$, and $n(A \\cap B) = ${both}$. Find $n(A \\cup B)$.`,
      promptBn: `যদি $n(A) = ${nA}$, $n(B) = ${nB}$ এবং $n(A \\cap B) = ${both}$ হয়, তবে $n(A \\cup B)$ কত?`,
      ...mc,
      explanation: `n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = ${nA} + ${nB} − ${both} = ${ans}.`,
      explanationBn: `$n(A \\cup B) = ${nA} + ${nB} - ${both} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a = 3 + (k % 8);
    const d = 2 + (Math.floor(k / 8) % 6);
    const n = 8 + ((k * 3) % 16);
    const target = a + (n - 1) * d;
    const mc = buildNumericOptions(n, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Rule generalization',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Determine term index n in an arithmetic sequence',
      prompt: `Which term of the arithmetic progression $${a}, ${a + d}, ${a + 2 * d}, \\dots$ is equal to $${target}$?`,
      promptBn: `$${a}, ${a + d}, ${a + 2 * d}, \\dots$ সমান্তর ধারাটির কততম পদ $${target}$?`,
      ...mc,
      explanation: `${a} + (n − 1)(${d}) = ${target} → (n − 1) = ${n - 1} → n = ${n}.`,
      explanationBn: `$n = \\frac{${target} - ${a}}{${d}} + 1 = ${n}$ (${toBn(n)}-তম পদ)।`,
    };
  },
  (k) => {
    const red = 2 + (k % 5);
    const blue = 2 + (Math.floor(k / 5) % 5);
    const total = red + blue;
    // Probability of drawing 2 red WITH replacement = (red/total)^2
    const mc = buildFractionOptions(red * red, total * total, k);
    return {
      domain: 'Probability',
      subskill: 'Independent events',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute compound probability of independent draws with replacement',
      prompt: `A bag has ${red} red and ${blue} blue balls. One ball is drawn, replaced, and a second ball is drawn. What is the probability BOTH are red?`,
      promptBn: `একটি ব্যাগে ${toBn(red)}টি লাল ও ${toBn(blue)}টি নীল বল আছে। প্রথম বলটি তুলে দেখে আবার রেখে দ্বিতীয় বল তোলা হলে দুটিই লাল হওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `P(both red) = (${red}/${total}) × (${red}/${total}) = ${red * red}/${total * total} = ${mc.correctAnswer}.`,
      explanationBn: `সম্ভাবনা = (${toBn(red)}/${toBn(total)}) × (${toBn(red)}/${toBn(total)}) = ${mc.correctAnswerBn}।`,
    };
  },

  // =========================================================================
  // 56-60: GRADE 11–12 (minGradeLevel: 11, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const n = 5 + (k % 8);
    const r = 2 + (Math.floor(k / 8) % 2); // 2 or 3
    const ans = nPr(n, r);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Probability',
      subskill: 'Sample space',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute permutations nPr for ordered arrangements',
      prompt: `How many different ${r}-digit codes with NO repeated digits can be formed from ${n} distinct digits?`,
      promptBn: `${toBn(n)}টি ভিন্ন অঙ্ক থেকে কোনো অঙ্ক পুনরাবৃত্তি না করে ${toBn(r)} অঙ্কের কতটি ভিন্ন কোড তৈরি করা যাবে?`,
      ...mc,
      explanation: `Using permutations: P(${n}, ${r}) = ${ans}.`,
      explanationBn: `বিন্যাস সূত্র $^${n}P_${r} = ${ans}$ (${toBn(ans)}) উপায়ে।`,
    };
  },
  (k) => {
    const x1 = 1 + (k % 6);
    const y1 = 2 + (Math.floor(k / 6) % 5);
    const z1 = 1 + ((k * 2) % 4);
    const x2 = 2 + ((k * 3) % 5);
    const y2 = 1 + ((k * 5) % 6);
    const z2 = 1 + (k % 5);
    const ans = x1 * x2 + y1 * y2 + z1 * z2;
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
      learningObjective: 'Compute the scalar dot product of two 3D vectors',
      prompt: `Find the dot product $\\vec{u} \\cdot \\vec{v}$ for $\\vec{u} = (${x1}, ${y1}, ${z1})$ and $\\vec{v} = (${x2}, ${y2}, ${z2})$.`,
      promptBn: `$\\vec{u} = (${x1}, ${y1}, ${z1})$ এবং $\\vec{v} = (${x2}, ${y2}, ${z2})$ হলে $\\vec{u} \\cdot \\vec{v}$ (ডট গুণন) কত?`,
      ...mc,
      explanation: `u · v = (${x1})(${x2}) + (${y1})(${y2}) + (${z1})(${z2}) = ${ans}.`,
      explanationBn: `ডট গুণন = ${x1 * x2} + ${y1 * y2} + ${z1 * z2} = ${ans} (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a = 1 + (k % 4);
    const c = 1 + (Math.floor(k / 4) % 6);
    const b = 2 + ((k * 3) % 5);
    // Integral_0^b (3a x^2 + 2c x) dx = a b^3 + c b^2
    const ans = a * b * b * b + c * b * b;
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
      learningObjective: 'Evaluate definite integrals of polynomials',
      prompt: `Evaluate the definite integral: $\\int_{0}^{${b}} (${3 * a}x^2 + ${2 * c}x)\\,dx$`,
      promptBn: `নির্দিষ্ট যোগজটির মান নির্ণয় করো: $\\int_{0}^{${b}} (${3 * a}x^2 + ${2 * c}x)\\,dx$`,
      ...mc,
      explanation: `Antiderivative is ${a}x³ + ${c}x². Evaluating from 0 to ${b}: ${a}(${b}³) + ${c}(${b}²) = ${ans}.`,
      explanationBn: `যোগজীকরণ $[${a}x^3 + ${c}x^2]_0^{${b}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const r = 2 + (k % 8);
    const shift = 1 + (Math.floor(k / 8) % 9);
    // lim_{x->r} (x^2 - r^2)/(x - r) + shift = 2r + shift
    const ans = 2 * r + shift;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 12',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Evaluate removable-discontinuity limits by factoring',
      prompt: `Evaluate: $\\lim_{x \\to ${r}} \\left(\\frac{x^2 - ${r * r}}{x - ${r}} + ${shift}\\right)$`,
      promptBn: `সীমা (Limit) নির্ণয় করো: $\\lim_{x \\to ${r}} \\left(\\frac{x^2 - ${r * r}}{x - ${r}} + ${shift}\\right)$`,
      ...mc,
      explanation: `Factor (x − ${r})(x + ${r})/(x − ${r}) = x + ${r}. At x = ${r}: (${r} + ${r}) + ${shift} = ${ans}.`,
      explanationBn: `$\\frac{x^2-${r * r}}{x-${r}} = x+${r}$; $x\\to ${r}$ বসালে ${2 * r} + ${shift} = ${ans} (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a11 = 1 + (k % 5);
    const a22 = 2 + (Math.floor(k / 5) % 6);
    const b11 = 1 + ((k * 3) % 5);
    const b22 = 1 + ((k * 7) % 5);
    // Trace(2A + B) = 2(a11 + a22) + (b11 + b22)
    const ans = 2 * (a11 + a22) + (b11 + b22);
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Algebraic expressions',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the trace (sum of main diagonal entries) of a matrix combination',
      prompt: `Let $A = \\begin{pmatrix} ${a11} & 3 \\\\ 1 & ${a22} \\end{pmatrix}$ and $B = \\begin{pmatrix} ${b11} & 2 \\\\ 4 & ${b22} \\end{pmatrix}$. Find the sum of the main diagonal entries (trace) of $2A + B$.`,
      promptBn: `$A = \\begin{pmatrix} ${a11} & 3 \\\\ 1 & ${a22} \\end{pmatrix}$ এবং $B = \\begin{pmatrix} ${b11} & 2 \\\\ 4 & ${b22} \\end{pmatrix}$ হলে $2A + B$ ম্যাট্রিক্সের প্রধান কর্ণের ভুক্তিগুলোর সমষ্টি কত?`,
      ...mc,
      explanation: `Diagonal entries of 2A + B are (2×${a11} + ${b11}) = ${2 * a11 + b11} and (2×${a22} + ${b22}) = ${2 * a22 + b22}. Sum = ${ans}.`,
      explanationBn: `প্রধান কর্ণের ভুক্তি দুটি ${toBn(2 * a11 + b11)} ও ${toBn(2 * a22 + b22)}; সমষ্টি = ${toBn(ans)}।`,
    };
  },
];

function createThird2000Questions(): MathQuestion[] {
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

export const GENERATED_THIRD_2000_QUESTIONS: MathQuestion[] = createThird2000Questions();
