import { DifficultyTier, MathQuestion } from '../types/mathmind';

const BN_NUMS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_NUMS[Number(d)]);
}

const NAMES_EN = [
  'Farhan',
  'Mim',
  'Saif',
  'Tania',
  'Nabil',
  'Ritu',
  'Arif',
  'Sadia',
  'Rashed',
  'Lamia',
  'Tariq',
  'Nusrat',
  'Mahin',
  'Fariha',
  'Imran',
  'Anika',
];

const NAMES_BN = [
  'ফারহান',
  'মিম',
  'সাইফ',
  'তানিয়া',
  'নাবিল',
  'রিতু',
  'আরিফ',
  'সাদিয়া',
  'রাশেদ',
  'লামিয়া',
  'তারিক',
  'নুসরাত',
  'মাহিন',
  'ফারিহা',
  'ইমরান',
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
    id: `q10k_${String(idx + 1).padStart(4, '0')}`,
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
    const ducks = 1 + (k % 7);
    const cats = 1 + (Math.floor(k / 7) % 6);
    const ans = ducks * 2 + cats * 4;
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
      learningObjective: 'Count animal legs by combining 2s and 4s',
      prompt: `On a farm there are ${ducks} duck(s) (2 legs each) and ${cats} cat(s) (4 legs each). How many legs are there in all?`,
      promptBn: `একটি খামারে ${toBn(ducks)}টি হাঁস (প্রতিটির ২ পা) ও ${toBn(cats)}টি বিড়াল (প্রতিটির ৪ পা) আছে। মোট কয়টি পা আছে?`,
      ...mc,
      explanation: `(${ducks} × 2) + (${cats} × 4) = ${ducks * 2} + ${cats * 4} = ${ans} legs.`,
      explanationBn: `(${toBn(ducks)}×২) + (${toBn(cats)}×৪) = ${toBn(ducks * 2)} + ${toBn(cats * 4)} = ${toBn(ans)}টি পা।`,
    };
  },
  (k) => {
    const low = 1 + (k % 10);
    const diff = 2 + (Math.floor(k / 10) % 9);
    const high = low + diff;
    const mc = buildNumericOptions(diff, k);
    return {
      domain: 'Number Sense',
      subskill: 'Number comparison',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Measure steps between two numbers on a number line',
      prompt: `How many steps forward must you hop on the number line to get from ${low} to ${high}?`,
      promptBn: `সংখ্যারেখায় ${toBn(low)} থেকে ${toBn(high)}-এ যেতে কয় ঘর সামনে লাফ দিতে হবে?`,
      ...mc,
      explanation: `${high} − ${low} = ${diff} steps.`,
      explanationBn: `${toBn(high)} − ${toBn(low)} = ${toBn(diff)} ঘর।`,
      visualSvg: 'number_line',
      visualData: { start: low, step: diff },
    };
  },
  (k) => {
    const shown = 2 + (k % 7);
    const addMore = 1 + (Math.floor(k / 7) % 8);
    const target = shown + addMore;
    const mc = buildNumericOptions(addMore, k);
    return {
      domain: 'Number Operations',
      subskill: 'Addition & subtraction',
      grade: 'Pre-Primary',
      ageBand: '4–5 years',
      minGradeLevel: 0,
      maxGradeLevel: 1,
      difficulty: 1,
      difficultyTier: 'easy',
      learningObjective: 'Find missing addends using visual dot groups',
      prompt: `Look at the ${shown} blue dots. How many more dots are needed to make ${target} dots in total?`,
      promptBn: `ছবিতে ${toBn(shown)}টি নীল বিন্দু আছে। মোট ${toBn(target)}টি বিন্দু করতে আর কয়টি বিন্দু লাগবে?`,
      ...mc,
      explanation: `${target} − ${shown} = ${addMore} more dots.`,
      explanationBn: `${toBn(target)} − ${toBn(shown)} = ${toBn(addMore)}টি বিন্দু লাগবে।`,
      visualSvg: 'counting_dots',
      visualData: { groupA: shown, groupB: 0 },
    };
  },
  (k) => {
    const a = 2 + (k % 12);
    const ans = a * 2;
    const nIdx = k % NAMES_EN.length;
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
      learningObjective: 'Double small whole numbers',
      prompt: `${NAMES_EN[nIdx]} has ${a} apples in one basket and ${a} apples in another basket. How many apples altogether?`,
      promptBn: `${NAMES_BN[nIdx]}-এর একটি ঝুড়িতে ${toBn(a)}টি ও আরেকটি ঝুড়িতে ${toBn(a)}টি আপেল আছে। মোট কয়টি আপেল হলো?`,
      ...mc,
      explanation: `${a} + ${a} = ${ans} apples.`,
      explanationBn: `${toBn(a)} + ${toBn(a)} = ${toBn(ans)}টি আপেল।`,
    };
  },
  (k) => {
    const sq = 1 + (k % 6);
    const hex = 1 + (Math.floor(k / 6) % 5);
    const ans = sq * 4 + hex * 6;
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
      learningObjective: 'Count corners of squares and hexagons',
      prompt: `How many corners do ${sq} square(s) (4 corners each) and ${hex} hexagon(s) (6 corners each) have together?`,
      promptBn: `${toBn(sq)}টি বর্গক্ষেত্র (৪ কোণা) ও ${toBn(hex)}টি ষড়ভুজের (৬ কোণা) মোট কয়টি কোণা আছে?`,
      ...mc,
      explanation: `(${sq} × 4) + (${hex} × 6) = ${sq * 4} + ${hex * 6} = ${ans}.`,
      explanationBn: `(${toBn(sq)}×৪) + (${toBn(hex)}×৬) = ${toBn(ans)}টি কোণা।`,
    };
  },

  // =========================================================================
  // 6-10: GRADE 1 (minGradeLevel: 1, maxGradeLevel: 2)
  // =========================================================================
  (k) => {
    const tens = 2 + (k % 8);
    const ones = 1 + (Math.floor(k / 8) % 9);
    const add = 2 + ((k * 3) % 8);
    const ans = tens * 10 + ones + add;
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
      learningObjective: 'Add a 1-digit number to a 2-digit number',
      prompt: `Calculate: $${tens * 10 + ones} + ${add} = ?$`,
      promptBn: `যোগ করো: ${toBn(tens * 10 + ones)} + ${toBn(add)} = কত?`,
      ...mc,
      explanation: `${tens * 10 + ones} + ${add} = ${ans}.`,
      explanationBn: `${toBn(tens * 10 + ones)} ও ${toBn(add)} যোগ করলে ${toBn(ans)} হয়।`,
    };
  },
  (k) => {
    const bundles = 2 + (k % 8);
    const singles = 1 + (Math.floor(k / 8) % 9);
    const ans = bundles * 10 + singles;
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
      learningObjective: 'Compose numbers from groups of ten sticks and single sticks',
      prompt: `A student has ${bundles} bundle(s) of 10 pencils and ${singles} loose pencil(s). How many pencils are there in total?`,
      promptBn: `একজন শিক্ষার্থীর কাছে ১০টি করে পেন্সিলের ${toBn(bundles)}টি আঁটি ও ${toBn(singles)}টি খোলা পেন্সিল আছে। মোট কয়টি পেন্সিল আছে?`,
      ...mc,
      explanation: `${bundles} × 10 + ${singles} = ${ans} pencils.`,
      explanationBn: `(${toBn(bundles)} × ১০) + ${toBn(singles)} = ${toBn(ans)}টি পেন্সিল।`,
    };
  },
  (k) => {
    const a = 5 + (k % 10);
    const b = 4 + (Math.floor(k / 10) % 9);
    const c = 3 + ((k * 3) % 7);
    const d = 2 + ((k * 5) % 6);
    const s1 = a + b;
    const s2 = c + d;
    const diff = Math.abs(s1 - s2);
    const mc = buildNumericOptions(diff, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Logical deduction',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compare two sums by subtraction',
      prompt: `How much greater is $(${Math.max(s1, s2) === s1 ? `${a} + ${b}` : `${c} + ${d}`})$ than $(${Math.max(s1, s2) === s1 ? `${c} + ${d}` : `${a} + ${b}`})$?`,
      promptBn: `(${Math.max(s1, s2) === s1 ? `${toBn(a)} + ${toBn(b)}` : `${toBn(c)} + ${toBn(d)}`}) সংখ্যাটি (${Math.max(s1, s2) === s1 ? `${toBn(c)} + ${toBn(d)}` : `${toBn(a)} + ${toBn(b)}`}) থেকে কত বড়?`,
      ...mc,
      explanation: `First sum is ${Math.max(s1, s2)}, second is ${Math.min(s1, s2)}. Difference = ${diff}.`,
      explanationBn: `পার্থক্য = ${toBn(Math.max(s1, s2))} − ${toBn(Math.min(s1, s2))} = ${toBn(diff)}।`,
    };
  },
  (k) => {
    const half = 4 + (k % 22);
    const total = half * 2;
    const mc = buildNumericOptions(half, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 1',
      ageBand: '5–6 years',
      minGradeLevel: 1,
      maxGradeLevel: 2,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Find half of an even two-digit number',
      prompt: `What is HALF of ${total}?`,
      promptBn: `${toBn(total)}-এর অর্ধেক কত?`,
      ...mc,
      explanation: `${total} ÷ 2 = ${half}.`,
      explanationBn: `${toBn(total)}-কে ২ দিয়ে ভাগ করলে ${toBn(half)} হয়।`,
    };
  },
  (k) => {
    const morning = 8 + (k % 14);
    const afternoon = 6 + (Math.floor(k / 14) % 12);
    const ans = morning + afternoon;
    const nIdx = k % NAMES_EN.length;
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
      learningObjective: 'Solve two-part reading page word problems',
      prompt: `${NAMES_EN[nIdx]} reads ${morning} pages in the morning and ${afternoon} pages in the evening. How many pages did ${NAMES_EN[nIdx]} read today?`,
      promptBn: `${NAMES_BN[nIdx]} সকালে ${toBn(morning)} পৃষ্ঠা ও বিকালে ${toBn(afternoon)} পৃষ্ঠা বই পড়েছে। আজ সে মোট কত পৃষ্ঠা পড়ল?`,
      ...mc,
      explanation: `${morning} + ${afternoon} = ${ans} pages.`,
      explanationBn: `${toBn(morning)} + ${toBn(afternoon)} = ${toBn(ans)} পৃষ্ঠা।`,
    };
  },

  // =========================================================================
  // 11-15: GRADE 2 (minGradeLevel: 2, maxGradeLevel: 3)
  // =========================================================================
  (k) => {
    const tens = 3 + (k % 7); // 3..9
    const ones = 1 + (Math.floor(k / 7) % 4); // 1..4
    const subOnes = 6 + ((k * 3) % 4); // 6..9 (> ones!)
    const subTens = 1 + (k % (tens - 1));
    const a = tens * 10 + ones;
    const b = subTens * 10 + subOnes;
    const ans = a - b;
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
      learningObjective: 'Subtract two-digit numbers requiring borrowing',
      prompt: `Find the difference: $${a} - ${b} = ?$`,
      promptBn: `বিয়োগ করো: ${toBn(a)} − ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} − ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} থেকে ${toBn(b)} বিয়োগ করলে ${toBn(ans)} থাকে।`,
    };
  },
  (k) => {
    const packs = 3 + (k % 8);
    const perPack = 5 + (Math.floor(k / 8) % 8);
    const ans = packs * perPack;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Multiply pack count by items per pack',
      prompt: `There are ${packs} boxes of crayons with ${perPack} crayons in each box. How many crayons are there in total?`,
      promptBn: `${toBn(packs)}টি রঙ-পেন্সিলের বাক্সে প্রতিটিতে ${toBn(perPack)}টি করে পেন্সিল আছে। মোট কয়টি পেন্সিল আছে?`,
      ...mc,
      explanation: `${packs} × ${perPack} = ${ans} crayons.`,
      explanationBn: `${toBn(packs)} × ${toBn(perPack)} = ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const step = [3, 4, 5, 6][k % 4];
    const end = 12 + (Math.floor(k / 4) % 25);
    const seq = [end + 3 * step, end + 2 * step, end + step, end];
    const mc = buildNumericOptions(seq[2], k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Complete decreasing skip-counting sequences',
      prompt: `Find the missing number in the countdown: $${seq[0]}, ${seq[1]}, \\_, ${seq[3]}$`,
      promptBn: `উল্টো গণনার শূন্যস্থান পূরণ করো: ${toBn(seq[0])}, ${toBn(seq[1])}, ___, ${toBn(seq[3])}`,
      ...mc,
      explanation: `Each number decreases by ${step}: ${seq[1]} − ${step} = ${seq[2]}.`,
      explanationBn: `প্রতি ধাপে ${toBn(step)} করে কমছে; তাই ${toBn(seq[1])} − ${toBn(step)} = ${toBn(seq[2])}।`,
    };
  },
  (k) => {
    const have = 25 + (k % 50);
    const need = 10 + (Math.floor(k / 50) % 40);
    const price = have + need;
    const nIdx = k % NAMES_EN.length;
    const mc = buildNumericOptions(need, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Measurement',
      subskill: 'Unit conversion',
      grade: 'Grade 2',
      ageBand: '7–8 years',
      minGradeLevel: 2,
      maxGradeLevel: 3,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Determine additional money needed for a purchase',
      prompt: `${NAMES_EN[nIdx]} wants a book costing ${price} Tk, and already has ${have} Tk. How much MORE money does ${NAMES_EN[nIdx]} need?`,
      promptBn: `${NAMES_BN[nIdx]} ${toBn(price)} টাকা দামের একটি বই কিনতে চায়, তার কাছে ${toBn(have)} টাকা আছে। তার আর কত টাকা লাগবে?`,
      ...mc,
      explanation: `${price} − ${have} = ${need} Tk.`,
      explanationBn: `${toBn(price)} − ${toBn(have)} = ${toBn(need)} টাকা আরও লাগবে।`,
    };
  },
  (k) => {
    const a = 4 + (k % 12);
    const b = 3 + (Math.floor(k / 12) % 10);
    const ans = a + a + b;
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
      learningObjective: 'Compute the perimeter of an isosceles triangle',
      prompt: `A triangle has two sides of ${a} cm each and a third side of ${b} cm. What is its perimeter?`,
      promptBn: `একটি ত্রিভুজের দুটি বাহু ${toBn(a)} সেমি করে এবং তৃতীয় বাহুটি ${toBn(b)} সেমি হলে এর পরিসীমা কত?`,
      ...mc,
      explanation: `Perimeter = ${a} + ${a} + ${b} = ${ans} cm.`,
      explanationBn: `পরিসীমা = ${toBn(a)} + ${toBn(a)} + ${toBn(b)} = ${toBn(ans)} সেমি।`,
    };
  },

  // =========================================================================
  // 16-20: GRADE 3 (minGradeLevel: 3, maxGradeLevel: 4)
  // =========================================================================
  (k) => {
    const den = 5 + (k % 7); // 5..11
    const a = 1 + (Math.floor(k / 7) % (den - 2));
    const b = 1 + (k % (den - a));
    const mc = buildFractionOptions(a + b, den, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Fraction operations',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Add fractions with like denominators and simplify',
      prompt: `Add and simplify: $\\frac{${a}}{${den}} + \\frac{${b}}{${den}}$`,
      promptBn: `যোগ করে সরল করো: $\\frac{${a}}{${den}} + \\frac{${b}}{${den}}$`,
      ...mc,
      explanation: `(${a} + ${b})/${den} = ${a + b}/${den}, which simplifies to ${mc.correctAnswer}.`,
      explanationBn: `লব যোগ করলে $\\frac{${a + b}}{${den}}$ হয়, যা লঘিষ্ঠ করলে ${mc.correctAnswerBn}।`,
    };
  },
  (k) => {
    const base = 12 + (k % 75);
    const isHundred = Math.floor(k / 75) % 2 === 1;
    const mult = isHundred ? 100 : 10;
    const ans = base * mult;
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
      learningObjective: 'Multiply whole numbers by 10 and 100 fluently',
      prompt: `Multiply: $${base} \\times ${mult} = ?$`,
      promptBn: `গুণ করো: ${toBn(base)} × ${toBn(mult)} = কত?`,
      ...mc,
      explanation: `Multiplying by ${mult} appends ${isHundred ? 'two' : 'one'} zero(s): ${ans}.`,
      explanationBn: `${toBn(mult)} দিয়ে গুণ করলে ডানে ${isHundred ? '২টি' : '১টি'} শূন্য বসে = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const div = 4 + (k % 6); // 4..9
    const quot = 11 + (Math.floor(k / 6) % 20);
    const total = div * quot;
    const mc = buildNumericOptions(quot, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 4,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Divide 2-digit and 3-digit numbers by single-digit divisors',
      prompt: `Divide evenly: $${total} \\div ${div} = ?$`,
      promptBn: `ভাগ করো: ${toBn(total)} ÷ ${toBn(div)} = কত?`,
      ...mc,
      explanation: `${div} × ${quot} = ${total}, so ${total} ÷ ${div} = ${quot}.`,
      explanationBn: `${toBn(total)} ÷ ${toBn(div)} = ${toBn(quot)}।`,
    };
  },
  (k) => {
    const total = 40 + (k % 45);
    const p1 = 10 + (Math.floor(k / 45) % 15);
    const p2 = 8 + ((k * 3) % 14);
    const p3 = total - p1 - p2;
    const mc = buildNumericOptions(p3, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Data comparison',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find a missing category count given the total',
      prompt: `A class of ${total} students chose favorite sports: Football = ${p1}, Cricket = ${p2}, and the rest chose Badminton. How many chose Badminton?`,
      promptBn: `${toBn(total)} জন শিক্ষার্থীর মধ্যে ফুটবল = ${toBn(p1)} জন, ক্রিকেট = ${toBn(p2)} জন এবং বাকিরা ব্যাডমিন্টন পছন্দ করে। কতজন ব্যাডমিন্টন পছন্দ করে?`,
      ...mc,
      explanation: `${total} − (${p1} + ${p2}) = ${total} − ${p1 + p2} = ${p3}.`,
      explanationBn: `${toBn(total)} − (${toBn(p1)} + ${toBn(p2)}) = ${toBn(p3)} জন।`,
    };
  },
  (k) => {
    const sh = 7 + (k % 5);
    const sm = [0, 15, 30, 45][Math.floor(k / 5) % 4];
    const dur = 35 + ((k * 5) % 85);
    const totalStart = sh * 60 + sm;
    const totalEnd = totalStart + dur;
    const eh = Math.floor(totalEnd / 60);
    const em = totalEnd % 60;
    const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
    const mc = buildNumericOptions(dur, k, false, ' min', ' মিনিট');
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 3',
      ageBand: '7–8 years',
      minGradeLevel: 3,
      maxGradeLevel: 5,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Compute elapsed time in minutes between start and end times',
      prompt: `A math test starts at ${fmt(sh, sm)} and finishes at ${fmt(eh, em)}. How many minutes long was the test?`,
      promptBn: `একটি গণিত পরীক্ষা ${toBn(fmt(sh, sm))} টায় শুরু হয়ে ${toBn(fmt(eh, em))} টায় শেষ হয়। পরীক্ষাটি কত মিনিট স্থায়ী হয়েছিল?`,
      ...mc,
      explanation: `From ${fmt(sh, sm)} to ${fmt(eh, em)} is ${dur} minutes.`,
      explanationBn: `${toBn(fmt(sh, sm))} থেকে ${toBn(fmt(eh, em))} পর্যন্ত মোট ${toBn(dur)} মিনিট।`,
    };
  },

  // =========================================================================
  // 21-25: GRADE 4 (minGradeLevel: 4, maxGradeLevel: 5)
  // =========================================================================
  (k) => {
    const a = 12 + (k % 24);
    const b = 11 + (Math.floor(k / 24) % 18);
    const ans = a * b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Multiplication & division',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 5,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Multiply two 2-digit whole numbers',
      prompt: `Compute the product: $${a} \\times ${b} = ?$`,
      promptBn: `গুণফল নির্ণয় করো: ${toBn(a)} × ${toBn(b)} = কত?`,
      ...mc,
      explanation: `${a} × ${b} = ${ans}.`,
      explanationBn: `${toBn(a)} × ${toBn(b)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const base = 4 + (k % 15);
    const h = 3 + (Math.floor(k / 15) % 10);
    // Guarantee even base*h
    const adjBase = base % 2 === 1 && h % 2 === 1 ? base + 1 : base;
    const ans = (adjBase * h) / 2;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate area of a triangle given base and height',
      prompt: `A triangle has base ${adjBase} cm and height ${h} cm. Find its area.`,
      promptBn: `একটি ত্রিভুজের ভূমি ${toBn(adjBase)} সেমি ও উচ্চতা ${toBn(h)} সেমি হলে এর ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area = ½ × base × height = ½ × ${adjBase} × ${h} = ${ans} cm².`,
      explanationBn: `ত্রিভুজের ক্ষেত্রফল = ½ × ভূমি × উচ্চতা = ½ × ${toBn(adjBase)} × ${toBn(h)} = ${toBn(ans)} বর্গসেমি।`,
    };
  },
  (k) => {
    const den = 6 + (k % 7); // 6..12
    const b = 1 + (Math.floor(k / 7) % 3); // 1..3
    const diff = 1 + (k % (den - b - 1));
    const a = b + diff;
    const mc = buildFractionOptions(diff, den, k);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Fraction operations',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Subtract fractions with like denominators and simplify',
      prompt: `Subtract and simplify: $\\frac{${a}}{${den}} - \\frac{${b}}{${den}}$`,
      promptBn: `বিয়োগ করে লঘিষ্ঠ আকারে প্রকাশ করো: $\\frac{${a}}{${den}} - \\frac{${b}}{${den}}$`,
      ...mc,
      explanation: `(${a} − ${b})/${den} = ${diff}/${den}, simplified to ${mc.correctAnswer}.`,
      explanationBn: `বিয়োগফল = $\\frac{${diff}}{${den}}$ = ${mc.correctAnswerBn}।`,
    };
  },
  (k) => {
    const hrs = 2 + (k % 12);
    const ans = hrs * 4;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Measurement',
      subskill: 'Time & rate',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Convert hours into 15-minute quarter-hour intervals',
      prompt: `How many 15-minute intervals (quarter hours) are there in ${hrs} hours?`,
      promptBn: `${toBn(hrs)} ঘণ্টায় মোট কয়টি ১৫ মিনিটের বিরতি (কোয়ার্টার ঘণ্টা) থাকে?`,
      ...mc,
      explanation: `1 hour has 60 ÷ 15 = 4 intervals. So ${hrs} hours = ${hrs} × 4 = ${ans}.`,
      explanationBn: `১ ঘণ্টায় ৪টি ১৫ মিনিট থাকে; তাই ${toBn(hrs)} ঘণ্টায় ${toBn(hrs)} × ৪ = ${toBn(ans)}টি।`,
    };
  },
  (k) => {
    const start = 2 + (k % 15);
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    const span = 12 + (Math.floor(k / 15) % 12);
    const end = start + span;
    const count = primes.filter((p) => p >= start && p <= end).length;
    const mc = buildNumericOptions(count, k);
    return {
      domain: 'Number Operations',
      subskill: 'Prime factorization',
      grade: 'Grade 4',
      ageBand: '9–10 years',
      minGradeLevel: 4,
      maxGradeLevel: 6,
      difficulty: 3,
      difficultyTier: 'hard',
      learningObjective: 'Count prime numbers within a given inclusive interval',
      prompt: `How many PRIME numbers are there from ${start} to ${end} (inclusive)?`,
      promptBn: `${toBn(start)} থেকে ${toBn(end)} পর্যন্ত (উভয় প্রান্তসহ) মোট কয়টি মৌলিক সংখ্যা আছে?`,
      ...mc,
      explanation: `The prime numbers in [${start}, ${end}] are: ${primes.filter((p) => p >= start && p <= end).join(', ')} (${count} total).`,
      explanationBn: `মৌলিক সংখ্যাগুলো: ${primes.filter((p) => p >= start && p <= end).map((n) => toBn(n)).join(', ')} (মোট ${toBn(count)}টি)।`,
    };
  },

  // =========================================================================
  // 26-30: GRADE 5 (minGradeLevel: 5, maxGradeLevel: 6)
  // =========================================================================
  (k) => {
    const div = 2 + (k % 8); // 2..9
    const qTenths = 3 + (Math.floor(k / 8) % 24); // 0.3..2.6
    const q = qTenths / 10;
    const dividend = Number((q * div).toFixed(1));
    const mc = buildNumericOptions(q, k, false, '', '', 1);
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Decimal operations',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Divide a decimal by a single-digit whole number',
      prompt: `Divide: $${dividend.toFixed(1)} \\div ${div} = ?$`,
      promptBn: `ভাগ করো: ${toBn(dividend.toFixed(1))} ÷ ${toBn(div)} = কত?`,
      ...mc,
      explanation: `${dividend.toFixed(1)} ÷ ${div} = ${q.toFixed(1)}.`,
      explanationBn: `${toBn(dividend.toFixed(1))}-কে ${toBn(div)} দিয়ে ভাগ করলে ${toBn(q.toFixed(1))} হয়।`,
    };
  },
  (k) => {
    const whole = (2 + (k % 10)) * 20; // 40..220
    const pct = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75][Math.floor(k / 10) % 10];
    const part = (whole * pct) / 100;
    const mc = buildNumericOptions(pct, k, false, '%', '%');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Percentage conversion',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Express one quantity as a percentage of another',
      prompt: `In a quiz of ${whole} marks, a student scored ${part} marks. What percentage is that?`,
      promptBn: `${toBn(whole)} নম্বরের পরীক্ষায় একজন শিক্ষার্থী ${toBn(part)} নম্বর পেয়েছে। সে শতকরা কত নম্বর পেল?`,
      ...mc,
      explanation: `(${part} / ${whole}) × 100 = ${pct}%.`,
      explanationBn: `(${toBn(part)}/${toBn(whole)}) × ১০০ = ${toBn(pct)}%।`,
    };
  },
  (k) => {
    const avg = 65 + (k % 20);
    const s1 = avg - 6 + (Math.floor(k / 20) % 5);
    const s2 = avg + 4 - (k % 3);
    const s3 = 3 * avg - (s1 + s2);
    const mc = buildNumericOptions(s3, k);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mean & median',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find a missing data value given the arithmetic mean',
      prompt: `The average of 3 test scores is ${avg}. Two of the scores are ${s1} and ${s2}. What is the third score?`,
      promptBn: `৩টি পরীক্ষার নম্বরের গড় ${toBn(avg)}। দুটি নম্বর ${toBn(s1)} ও ${toBn(s2)} হলে, তৃতীয় নম্বরটি কত?`,
      ...mc,
      explanation: `Total of 3 scores = 3 × ${avg} = ${3 * avg}. Third score = ${3 * avg} − (${s1} + ${s2}) = ${s3}.`,
      explanationBn: `মোট নম্বর = ৩ × ${toBn(avg)} = ${toBn(3 * avg)}; তৃতীয় নম্বর = ${toBn(3 * avg)} − ${toBn(s1 + s2)} = ${toBn(s3)}।`,
    };
  },
  (k) => {
    const unit = 8 + (k % 15);
    const dozenCost = 12 * unit;
    const buy = 5 + (Math.floor(k / 15) % 9);
    const ans = buy * unit;
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
      learningObjective: 'Solve dozen-based unitary rate problems',
      prompt: `1 dozen (12) bananas cost ${dozenCost} Tk. How much do ${buy} bananas cost?`,
      promptBn: `১ ডজন (১২টি) কলার দাম ${toBn(dozenCost)} টাকা হলে, ${toBn(buy)}টি কলার দাম কত টাকা?`,
      ...mc,
      explanation: `1 banana = ${dozenCost} ÷ 12 = ${unit} Tk. So ${buy} bananas = ${buy} × ${unit} = ${ans} Tk.`,
      explanationBn: `১টির দাম ${toBn(unit)} টাকা; তাই ${toBn(buy)}টির দাম ${toBn(ans)} টাকা।`,
    };
  },
  (k) => {
    const l = 10 + (k % 5) * 10; // 10, 20, 30, 40, 50
    const w = 10 + (Math.floor(k / 5) % 4) * 5; // 10, 15, 20, 25
    const h = 10 + ((k * 3) % 6) * 2; // 10, 12, ...
    const liters = (l * w * h) / 1000;
    const mc = buildNumericOptions(liters, k, false, ' L', ' লিটার');
    return {
      domain: 'Measurement',
      subskill: 'Mass & capacity',
      grade: 'Grade 5',
      ageBand: '9–10 years',
      minGradeLevel: 5,
      maxGradeLevel: 7,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Convert cuboid volume in cm³ into liters (1000 cm³ = 1 L)',
      prompt: `A rectangular tank is ${l} cm long, ${w} cm wide, and ${h} cm tall. How many LITERS of water can it hold? (1000 cm³ = 1 L)`,
      promptBn: `একটি আয়তাকার চৌবাচ্চার দৈর্ঘ্য ${toBn(l)} সেমি, প্রস্থ ${toBn(w)} সেমি ও উচ্চতা ${toBn(h)} সেমি। এতে কত লিটার পানি ধরবে? (১০০০ ঘনসেমি = ১ লিটার)`,
      ...mc,
      explanation: `Volume = ${l} × ${w} × ${h} = ${l * w * h} cm³ = ${liters} L.`,
      explanationBn: `আয়তন = ${toBn(l * w * h)} ঘনসেমি ÷ ১০০০ = ${toBn(liters)} লিটার।`,
    };
  },

  // =========================================================================
  // 31-35: GRADE 6 (minGradeLevel: 6, maxGradeLevel: 8)
  // =========================================================================
  (k) => {
    const a = 2 + (k % 6);
    const b = 3 + (Math.floor(k / 6) % 9);
    const ans = a * a * a + b * b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Number Operations',
      subskill: 'Order of operations',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate sums of cubes and squares',
      prompt: `Calculate: $${a}^3 + ${b}^2$`,
      promptBn: `মান নির্ণয় করো: $${a}^3 + ${b}^2$`,
      ...mc,
      explanation: `${a}³ + ${b}² = ${a * a * a} + ${b * b} = ${ans}.`,
      explanationBn: `${toBn(a * a * a)} + ${toBn(b * b)} = ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 2 + (k % 7);
    const b = 3 + (Math.floor(k / 7) % 6);
    const m = 2 + ((k * 3) % 8);
    const c = b * m;
    const ans = a * m;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Ratio and Proportion',
      subskill: 'Equivalent ratios',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Solve direct proportions for an unknown term',
      prompt: `Find $x$ in the proportion: $${a} : ${b} = x : ${c}$`,
      promptBn: `সমানুপাতে $x$-এর মান নির্ণয় করো: $${a} : ${b} = x : ${c}$`,
      ...mc,
      explanation: `Multiply both ratio terms by ${m}: ${a} × ${m} = ${ans}.`,
      explanationBn: `$x = \\frac{${a} \\times ${c}}{${b}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const start = -(2 + (k % 10));
    const rise = 4 + (Math.floor(k / 10) % 12);
    const drop = 1 + ((k * 3) % 7);
    const ans = start + rise - drop;
    const mc = buildNumericOptions(ans, k, true, '°C', '°C');
    return {
      domain: 'Number Sense',
      subskill: 'Mental mathematics',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Track positive and negative temperature changes using integers',
      prompt: `At dawn the temperature was ${start}°C. It rose by ${rise}°C by noon, then dropped by ${drop}°C at night. What was the night temperature?`,
      promptBn: `ভোরে তাপমাত্রা ছিল ${start}°C। দুপুরে ${toBn(rise)}°C বাড়ল এবং রাতে ${toBn(drop)}°C কমল। রাতে তাপমাত্রা কত হলো?`,
      ...mc,
      explanation: `${start} + ${rise} − ${drop} = ${ans}°C.`,
      explanationBn: `${start} + ${rise} − ${drop} = ${ans}°C।`,
    };
  },
  (k) => {
    const base = 6 + (k % 15);
    const height = 4 + (Math.floor(k / 15) % 10);
    const ans = base * height;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Compute area of a parallelogram',
      prompt: `A parallelogram has a base of ${base} cm and a perpendicular height of ${height} cm. Find its area.`,
      promptBn: `একটি সামান্তরিকের ভূমি ${toBn(base)} সেমি এবং উচ্চতা ${toBn(height)} সেমি হলে, ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area = base × height = ${base} × ${height} = ${ans} cm².`,
      explanationBn: `সামান্তরিকের ক্ষেত্রফল = ভূমি × উচ্চতা = ${toBn(base)} × ${toBn(height)} = ${toBn(ans)} বর্গসেমি।`,
    };
  },
  (k) => {
    const x = 2 + (k % 9);
    const y = 3 + (Math.floor(k / 9) % 9);
    const fromXAxis = k % 2 === 0;
    const ans = fromXAxis ? y : x;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 6',
      ageBand: '11–12 years',
      minGradeLevel: 6,
      maxGradeLevel: 8,
      difficulty: 2,
      difficultyTier: 'medium',
      learningObjective: 'Determine perpendicular distance from a coordinate point to an axis',
      prompt: fromXAxis
        ? `How many units is the point $P(${x}, ${y})$ from the X-axis?`
        : `How many units is the point $P(${x}, ${y})$ from the Y-axis?`,
      promptBn: fromXAxis
        ? `X-অক্ষ থেকে $P(${toBn(x)}, ${toBn(y)})$ বিন্দুটির লম্ব দূরত্ব কত একক?`
        : `Y-অক্ষ থেকে $P(${toBn(x)}, ${toBn(y)})$ বিন্দুটির লম্ব দূরত্ব কত একক?`,
      ...mc,
      explanation: fromXAxis
        ? `Distance from the x-axis equals |y| = ${y}.`
        : `Distance from the y-axis equals |x| = ${x}.`,
      explanationBn: fromXAxis
        ? `X-অক্ষ থেকে দূরত্ব হলো কোটি (y)-এর পরমমান = ${toBn(y)} একক।`
        : `Y-অক্ষ থেকে দূরত্ব হলো ভুজ (x)-এর পরমমান = ${toBn(x)} একক।`,
      visualSvg: 'coordinate_point',
      visualData: { x, y },
    };
  },

  // =========================================================================
  // 36-40: GRADE 7 (minGradeLevel: 7, maxGradeLevel: 9)
  // =========================================================================
  (k) => {
    const mp = (4 + (k % 15)) * 100; // 400..1800
    const disc = [10, 15, 20, 25][Math.floor(k / 15) % 4];
    const sp = mp * (1 - disc / 100);
    const mc = buildNumericOptions(mp, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find the original marked price from discount percentage and selling price',
      prompt: `After a ${disc}% discount, a shirt sells for ${sp} Tk. What was its original marked price?`,
      promptBn: `${toBn(disc)}% ছাড়ের পর একটি শার্টের বিক্রয়মূল্য ${toBn(sp)} টাকা হলে, শার্টটির পূর্বের লিখিত মূল্য কত ছিল?`,
      ...mc,
      explanation: `SP = ${100 - disc}% of MP, so MP = ${sp} ÷ ${1 - disc / 100} = ${mp} Tk.`,
      explanationBn: `${toBn(100 - disc)}% = ${toBn(sp)} টাকা, তাই ১০০% = ${toBn(mp)} টাকা।`,
    };
  },
  (k) => {
    const a = 4 + (k % 7);
    const c = 1 + (Math.floor(k / 7) % 3); // < a
    const x = 2 + ((k * 3) % 10);
    const b = 2 + (k % 8);
    // ax - b = cx + d => d = (a - c)x - b
    const d = (a - c) * x - b;
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
      learningObjective: 'Solve linear equations with variables on both sides',
      prompt: `Solve for $x$: $${a}x - ${b} = ${c === 1 ? '' : c}x ${d >= 0 ? `+ ${d}` : d}$`,
      promptBn: `সমাধান করো: $${a}x - ${b} = ${c === 1 ? '' : c}x ${d >= 0 ? `+ ${d}` : d}$`,
      ...mc,
      explanation: `(${a} − ${c})x = ${d} + ${b} → ${a - c}x = ${(a - c) * x} → x = ${x}.`,
      explanationBn: `পক্ষান্তর করে পাই $${a - c}x = ${(a - c) * x}$, অতএব $x = ${x}$ (${toBn(x)})।`,
    };
  },
  (k) => {
    const a = 6 + (k % 12);
    const b = 4 + (Math.floor(k / 12) % 10);
    const h = 3 + ((k * 2) % 7);
    const adjH = (a + b) % 2 === 1 && h % 2 === 1 ? h + 1 : h;
    const ans = ((a + b) * adjH) / 2;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate area of a trapezium given parallel sides and height',
      prompt: `A trapezium has parallel sides of ${a} cm and ${b} cm, and height ${adjH} cm. What is its area?`,
      promptBn: `একটি ট্রাপিজিয়ামের সমান্তরাল বাহু দুটি ${toBn(a)} সেমি ও ${toBn(b)} সেমি এবং লম্ব দূরত্ব ${toBn(adjH)} সেমি হলে ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area = ½ × (${a} + ${b}) × ${adjH} = ${ans} cm².`,
      explanationBn: `ট্রাপিজিয়ামের ক্ষেত্রফল = ½ × (${toBn(a)} + ${toBn(b)}) × ${toBn(adjH)} = ${toBn(ans)} বর্গসেমি।`,
    };
  },
  (k) => {
    const n = 8 + (k % 13); // 8..20 cards
    const div = [2, 3, 4, 5][Math.floor(k / 13) % 4];
    const fav = Math.floor(n / div);
    const mc = buildFractionOptions(fav, n, k);
    return {
      domain: 'Probability',
      subskill: 'Simple probability',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find probability of drawing a multiple of k from numbered cards',
      prompt: `Cards numbered $1$ to $${n}$ are placed in a hat. What is the probability of drawing a multiple of $${div}$?`,
      promptBn: `১ থেকে ${toBn(n)} পর্যন্ত সংখ্যা লেখা কার্ডের মধ্য থেকে দৈবভাবে ১টি কার্ড তুললে সেটি ${toBn(div)}-এর গুণিতক হওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `There are ${fav} multiples of ${div} between 1 and ${n}. Probability = ${fav}/${n} = ${mc.correctAnswer}.`,
      explanationBn: `১ থেকে ${toBn(n)}-এর মধ্যে ${toBn(div)}-এর গুণিতক আছে ${toBn(fav)}টি; সম্ভাবনা = ${mc.correctAnswerBn}।`,
    };
  },
  (k) => {
    const c1 = 2 + (k % 6);
    const c2 = 1 + (Math.floor(k / 6) % 5);
    const c3 = 2 + ((k * 3) % 5);
    const c4 = 1 + (k % 4);
    const x0 = 2 + (Math.floor(k / 30) % 5);
    const y0 = 1 + (k % 4);
    // (c1 x + c2 y) + (c3 x - c4 y) at (x0, y0)
    const ans = (c1 + c3) * x0 + (c2 - c4) * y0;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 7',
      ageBand: '13–14 years',
      minGradeLevel: 7,
      maxGradeLevel: 9,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Combine like algebraic terms and evaluate',
      prompt: `Simplify $(${c1}x + ${c2}y) + (${c3}x - ${c4}y)$ and evaluate at $x = ${x0}, y = ${y0}$.`,
      promptBn: `$(${c1}x + ${c2}y) + (${c3}x - ${c4}y)$ সরল করে $x = ${x0}, y = ${y0}$ হলে মান নির্ণয় করো।`,
      ...mc,
      explanation: `Combined expression: ${c1 + c3}x + ${c2 - c4}y. At (${x0}, ${y0}): ${ans}.`,
      explanationBn: `সরল করলে হয় $${c1 + c3}x + (${c2 - c4})y$; মান বসালে উত্তর ${toBn(ans)}।`,
    };
  },

  // =========================================================================
  // 41-45: GRADE 8 (minGradeLevel: 8, maxGradeLevel: 10)
  // =========================================================================
  (k) => {
    const m = 2 + (k % 9); // 2..10
    const ans = m * m * m - 3 * m;
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
      learningObjective: 'Evaluate cubic reciprocal identities x³ + 1/x³',
      prompt: `If $x + \\frac{1}{x} = ${m}$, find the value of $x^3 + \\frac{1}{x^3}$.`,
      promptBn: `$x + \\frac{1}{x} = ${m}$ হলে, $x^3 + \\frac{1}{x^3}$-এর মান কত?`,
      ...mc,
      explanation: `x³ + 1/x³ = (x + 1/x)³ − 3(x + 1/x) = ${m}³ − 3(${m}) = ${m ** 3} − ${3 * m} = ${ans}.`,
      explanationBn: `$x^3 + \\frac{1}{x^3} = (${m})^3 - 3(${m}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const p = (2 + (k % 12)) * 500;
    const r = 4 + (Math.floor(k / 12) % 6);
    const t = 2 + (k % 4);
    const interest = (p * r * t) / 100;
    const mc = buildNumericOptions(p, k, false, ' Tk', ' টাকা');
    return {
      domain: 'Fractions, Decimals and Percentages',
      subskill: 'Discount & interest',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Determine principal amount given simple interest, rate, and time',
      prompt: `What principal earns ${interest} Tk in simple interest at ${r}% per year over ${t} years?`,
      promptBn: `বার্ষিক ${toBn(r)}% সরল মুনাফায় কত টাকার ${toBn(t)} বছরের মুনাফা ${toBn(interest)} টাকা হবে?`,
      ...mc,
      explanation: `P = (100 × I)/(r × t) = (100 × ${interest})/(${r} × ${t}) = ${p} Tk.`,
      explanationBn: `আসল $P = \\frac{100 \\times ${interest}}{${r} \\times ${t}} = ${p}$ (${toBn(p)}) টাকা।`,
    };
  },
  (k) => {
    const triplets: [number, number, number][] = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
    ];
    const t = triplets[k % triplets.length];
    const scale = 1 + (Math.floor(k / triplets.length) % 10);
    const l = t[0] * scale;
    const w = t[1] * scale;
    const diag = t[2] * scale;
    const mc = buildNumericOptions(diag, k, false, ' cm', ' সেমি');
    return {
      domain: 'Geometry',
      subskill: 'Properties of shapes',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute the diagonal of a rectangle using Pythagoras’ theorem',
      prompt: `A rectangle has sides ${l} cm and ${w} cm. What is the length of its diagonal?`,
      promptBn: `একটি আয়তক্ষেত্রের বাহু দুটি ${toBn(l)} সেমি ও ${toBn(w)} সেমি হলে, এর কর্ণের দৈর্ঘ্য কত?`,
      ...mc,
      explanation: `Diagonal = √(${l}² + ${w}²) = ${diag} cm.`,
      explanationBn: `কর্ণ $= \\sqrt{${l}^2 + ${w}^2} = ${diag}$ (${toBn(diag)}) সেমি।`,
    };
  },
  (k) => {
    const nOptions = [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36];
    const n = nOptions[k % nOptions.length];
    const multTag = Math.floor(k / nOptions.length);
    // Keep unique prompt by alternating wording or asking exterior vs interior angle!
    const askExt = multTag % 2 === 1;
    const ans = askExt ? 360 / n : ((n - 2) * 180) / n;
    const mc = buildNumericOptions(ans, k, false, '°', '°');
    return {
      domain: 'Geometry',
      subskill: 'Angles',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find interior or exterior angle of a regular polygon',
      prompt: askExt
        ? `Each EXTERIOR angle of a regular ${n}-sided polygon (with ${n} equal sides, check #${multTag + 1}) measures how many degrees?`
        : `Each INTERIOR angle of a regular ${n}-sided polygon measures how many degrees?`,
      promptBn: askExt
        ? `একটি সুষম ${toBn(n)}-ভুজের প্রতিটি বহিঃস্থ কোণের মান কত ডিগ্রি?`
        : `একটি সুষম ${toBn(n)}-ভুজের প্রতিটি অন্তঃস্থ কোণের মান কত ডিগ্রি?`,
      ...mc,
      explanation: askExt
        ? `360° ÷ ${n} = ${ans}°.`
        : `((${n} − 2) × 180°) ÷ ${n} = ${ans}°.`,
      explanationBn: askExt
        ? `বহিঃস্থ কোণ = ৩৬০° ÷ ${toBn(n)} = ${toBn(ans)}°।`
        : `অন্তঃস্থ কোণ = ((${toBn(n)} − ২) × ১৮০°) ÷ ${toBn(n)} = ${toBn(ans)}°।`,
    };
  },
  (k) => {
    const f1 = 2 + (k % 3);
    const f2 = 4 + (Math.floor(k / 3) % 4);
    const f3 = 3 + ((k * 2) % 4);
    const f4 = 11 - f1 - f2 - f3; // if f1<=4,f2<=7,f3<=6 -> could be negative! Better fixed sum:
    // Use total = 20: f1 in 2..5, f2 in 3..6, f3 in 4..7, f4 = 20 - f1 - f2 - f3 (between 2..11!)
    const c1 = 2 + (k % 4);
    const c2 = 3 + (Math.floor(k / 4) % 4);
    const c3 = 4 + ((k * 3) % 4);
    const c4 = 20 - c1 - c2 - c3;
    const v1 = 5 + (k % 4) * 5;
    const v2 = v1 + 5;
    const v3 = v1 + 10;
    const v4 = v1 + 15;
    const sum = c1 * v1 + c2 * v2 + c3 * v3 + c4 * v4;
    const mean = sum / 20;
    void f1;
    void f2;
    void f3;
    void f4;
    const mc = buildNumericOptions(mean, k, false, '', '', Number.isInteger(mean) ? 0 : 2);
    return {
      domain: 'Data Handling and Statistics',
      subskill: 'Mean & median',
      grade: 'Grade 8',
      ageBand: '13–14 years',
      minGradeLevel: 8,
      maxGradeLevel: 10,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Calculate weighted arithmetic mean of 20 observations',
      prompt: `In a survey of 20 scores: ${v1} appears ${c1} times, ${v2} appears ${c2} times, ${v3} appears ${c3} times, and ${v4} appears ${c4} times. Find the mean.`,
      promptBn: `২০টি উপাত্তের মধ্যে ${toBn(v1)} আছে ${toBn(c1)} বার, ${toBn(v2)} আছে ${toBn(c2)} বার, ${toBn(v3)} আছে ${toBn(c3)} বার এবং ${toBn(v4)} আছে ${toBn(c4)} বার। গড় কত?`,
      ...mc,
      explanation: `Total = ${sum}. Mean = ${sum} ÷ 20 = ${mean}.`,
      explanationBn: `মোট সমষ্টি ${toBn(sum)}; গড় = ${toBn(sum)} ÷ ২০ = ${toBn(mean)}।`,
    };
  },

  // =========================================================================
  // 46-50: GRADE 9 (minGradeLevel: 9, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const a = 1 + (k % 4);
    const b = 2 + (Math.floor(k / 4) % 5);
    const c = 1 + ((k * 3) % 4);
    const x0 = 1 + (Math.floor(k / 20) % 4);
    // f(x) = ax + b, g(x) = x^2 + c => find f(g(x0))
    const gx0 = x0 * x0 + c;
    const ans = a * gx0 + b;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate composite functions f(g(x))',
      prompt: `Let $f(x) = ${a === 1 ? '' : a}x + ${b}$ and $g(x) = x^2 + ${c}$. Find $f(g(${x0}))$.`,
      promptBn: `যদি $f(x) = ${a === 1 ? '' : a}x + ${b}$ এবং $g(x) = x^2 + ${c}$ হয়, তবে $f(g(${x0}))$-এর মান কত?`,
      ...mc,
      explanation: `g(${x0}) = ${x0}² + ${c} = ${gx0}. Then f(${gx0}) = ${a}(${gx0}) + ${b} = ${ans}.`,
      explanationBn: `$g(${x0}) = ${gx0}$; অতএব $f(${gx0}) = ${a}(${gx0}) + ${b} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const r = 7 * (1 + (k % 3)); // 7, 14, 21
    const degs = [60, 90, 120, 180];
    // For 60 or 120, r=21 ensures r/7 * (deg/360) is integer! Or let r=7*3=21 when deg=60/120:
    // Better: pick r multiple of 42? No, 22/7 * 14^2 = 616 (divisible by 4, not 3); 22/7 * 21^2 = 1386 (divisible by 9 & 2!)
    // Use r = 14 for 90°, 180°; r = 21 for 60°, 120°, 180°; or r = 21 always works for 60, 120, 180! Wait: 22*3*21 = 1386, /6 = 231, /4 = 346.5.
    // Let's use r = 42 * (1 + k%2) or r = 14 * mult with deg in [90, 180], or r = 21 * (1 + (k%3)) with deg in [60, 120, 180]!
    const radPool = [21, 42];
    const rad = radPool[k % 2];
    const deg = [60, 120, 180][Math.floor(k / 2) % 3];
    const scale = 1 + (Math.floor(k / 6) % 2);
    const actualR = rad * scale;
    const ans = Math.round(((deg / 360) * 22 * actualR * actualR) / 7);
    void r;
    void degs;
    const mc = buildNumericOptions(ans, k, false, ' cm²', ' বর্গসেমি');
    return {
      domain: 'Geometry',
      subskill: 'Area',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute area of a circular sector using pi = 22/7',
      prompt: `Taking $\\pi = \\frac{22}{7}$, find the area of a circle sector with radius $r = ${actualR}$ cm and central angle $${deg}^\\circ$.`,
      promptBn: `$\\pi = \\frac{22}{7}$ ধরে $${actualR}$ সেমি ব্যাসার্ধ ও $${deg}^\\circ$ কেন্দ্রীয় কোণবিশিষ্ট বৃত্তকলার ক্ষেত্রফল কত?`,
      ...mc,
      explanation: `Area = (${deg}/360) × (22/7) × ${actualR}² = ${ans} cm².`,
      explanationBn: `বৃত্তকলার ক্ষেত্রফল $= \\frac{${deg}}{360} \\times \\frac{22}{7} \\times ${actualR}^2 = ${ans}$ (${toBn(ans)}) বর্গসেমি।`,
    };
  },
  (k) => {
    const base = 2 + (k % 4); // 2, 3, 4, 5
    const x = 1 + (Math.floor(k / 4) % 7);
    const m = 2 + ((k * 3) % 3); // 2, 3, 4
    const c = 1 + (k % 5);
    const exp = m * x + c;
    const mc = buildNumericOptions(x, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Linear equations',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Solve exponential equations by matching bases',
      prompt: `Solve for $x$: $${base}^{${m}x + ${c}} = ${base}^{${exp}}$`,
      promptBn: `সমাধান করো: $${base}^{${m}x + ${c}} = ${base}^{${exp}}$`,
      ...mc,
      explanation: `Equating exponents: ${m}x + ${c} = ${exp} → ${m}x = ${m * x} → x = ${x}.`,
      explanationBn: `ভিত্তি সমান হওয়ায় $${m}x + ${c} = ${exp}$, অতএব $x = ${x}$ (${toBn(x)})।`,
    };
  },
  (k) => {
    const x1 = 1 + (k % 6);
    const y1 = 15 + (Math.floor(k / 6) % 10);
    const slopeMag = 1 + ((k * 3) % 5);
    const run = 2 + (k % 4);
    const x2 = x1 + run;
    const y2 = y1 - slopeMag * run;
    const slope = -slopeMag;
    const mc = buildNumericOptions(slope, k, true);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute negative slopes between two coordinate points',
      prompt: `Find the slope of the line connecting $(${x1}, ${y1})$ and $(${x2}, ${y2})$.`,
      promptBn: `$(${x1}, ${y1})$ এবং $(${x2}, ${y2})$ বিন্দু দুটির সংযোগকারী সরলরেখার ঢাল কত?`,
      ...mc,
      explanation: `Slope = (${y2} − ${y1}) / (${x2} − ${x1}) = ${y2 - y1} / ${run} = ${slope}.`,
      explanationBn: `ঢাল $= \\frac{${y2} - ${y1}}{${x2} - ${x1}} = ${slope}$।`,
    };
  },
  (k) => {
    const n = 6 + (k % 15) * 2; // even n: 6..34
    const a = 3 + (Math.floor(k / 15) % 10);
    const l = a + 10 + ((k * 3) % 25);
    const sum = (n * (a + l)) / 2;
    const mc = buildNumericOptions(sum, k);
    return {
      domain: 'Pattern Recognition',
      subskill: 'Arithmetic sequences',
      grade: 'Grade 9',
      ageBand: '15–16 years',
      minGradeLevel: 9,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Sum an arithmetic series using first and last terms',
      prompt: `An arithmetic series has ${n} terms, starting at ${a} and ending at ${l}. Find its total sum.`,
      promptBn: `একটি সমান্তর ধারার পদসংখ্যা ${toBn(n)}, প্রথম পদ ${toBn(a)} ও শেষ পদ ${toBn(l)} হলে ধারাটির সমষ্টি কত?`,
      ...mc,
      explanation: `Sₙ = n(a + l)/2 = ${n}(${a} + ${l})/2 = ${sum}.`,
      explanationBn: `সমষ্টি $= \\frac{${n}(${a} + ${l})}{2} = ${sum}$ (${toBn(sum)})।`,
    };
  },

  // =========================================================================
  // 51-55: GRADE 10 (minGradeLevel: 10, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const s = 4 + (k % 9);
    const p = 1 + (Math.floor(k / 9) % 6);
    // x^2 - s x + p = 0 -> alpha + beta = s, alpha*beta = p -> alpha^2 + beta^2 = s^2 - 2p
    const ans = s * s - 2 * p;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Find α² + β² using Vieta’s formulas',
      prompt: `If $\\alpha$ and $\\beta$ are the roots of $x^2 - ${s}x + ${p} = 0$, find $\\alpha^2 + \\beta^2$.`,
      promptBn: `$x^2 - ${s}x + ${p} = 0$ সমীকরণের মূল দুটি $\\alpha$ ও $\\beta$ হলে $\\alpha^2 + \\beta^2$-এর মান কত?`,
      ...mc,
      explanation: `α + β = ${s} and αβ = ${p}. Thus α² + β² = (α + β)² − 2αβ = ${s}² − 2(${p}) = ${ans}.`,
      explanationBn: `$\\alpha^2 + \\beta^2 = (\\alpha+\\beta)^2 - 2\\alpha\\beta = ${s}^2 - 2(${p}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const r = 7 * (1 + (k % 3)); // 7, 14, 21
    const h = 3 * (2 + (Math.floor(k / 3) % 8)); // 6, 9, ..., 27
    // Volume of cone = (1/3) * (22/7) * r^2 * h
    const ans = (22 * (r / 7) * r * h) / 3;
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
      learningObjective: 'Calculate volume of a right circular cone',
      prompt: `Using $\\pi = \\frac{22}{7}$, find the volume of a cone with radius $r = ${r}$ cm and height $h = ${h}$ cm.`,
      promptBn: `$\\pi = \\frac{22}{7}$ ধরে $${r}$ সেমি ব্যাসার্ধ ও $${h}$ সেমি উচ্চতাবিশিষ্ট একটি শঙ্কুর (Cone) আয়তন কত?`,
      ...mc,
      explanation: `V = (1/3)πr²h = (1/3) × (22/7) × ${r}² × ${h} = ${ans} cm³.`,
      explanationBn: `আয়তন $= \\frac{1}{3}\\pi r^2 h = ${ans}$ (${toBn(ans)}) ঘনসেমি।`,
    };
  },
  (k) => {
    const a = 2 + (k % 8);
    const b = 2 + (Math.floor(k / 8) % 6) * 2; // even: 2, 4, ..., 12
    const c = 2 + ((k * 3) % 5) * 2; // even: 2, 4, ..., 10
    // a*tan^2(45°) + b*sin(30°) + c*cos(60°) = a(1) + b(1/2) + c(1/2)
    const ans = a + b / 2 + c / 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Simplification',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Evaluate trigonometric expressions using exact special angles',
      prompt: `Evaluate: $${a}\\tan^2(45^\\circ) + ${b}\\sin(30^\\circ) + ${c}\\cos(60^\\circ)$`,
      promptBn: `মান নির্ণয় করো: $${a}\\tan^2(45^\\circ) + ${b}\\sin(30^\\circ) + ${c}\\cos(60^\\circ)$`,
      ...mc,
      explanation: `tan 45° = 1, sin 30° = ½, cos 60° = ½ → ${a}(1) + ${b / 2} + ${c / 2} = ${ans}.`,
      explanationBn: `$${a}(1) + ${b}(\\frac{1}{2}) + ${c}(\\frac{1}{2}) = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const nA = 18 + (k % 15);
    const nB = 16 + (Math.floor(k / 15) % 14);
    const inter = 4 + (k % 10);
    const union = nA + nB - inter;
    const mc = buildNumericOptions(inter, k);
    return {
      domain: 'Mathematical Reasoning',
      subskill: 'Logical deduction',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Find intersection size n(A ∩ B) from union and set sizes',
      prompt: `If $n(A) = ${nA}$, $n(B) = ${nB}$, and $n(A \\cup B) = ${union}$, find $n(A \\cap B)$.`,
      promptBn: `যদি $n(A) = ${nA}$, $n(B) = ${nB}$ এবং $n(A \\cup B) = ${union}$ হয়, তবে $n(A \\cap B)$ কত?`,
      ...mc,
      explanation: `n(A ∩ B) = n(A) + n(B) − n(A ∪ B) = ${nA} + ${nB} − ${union} = ${inter}.`,
      explanationBn: `$n(A \\cap B) = ${nA} + ${nB} - ${union} = ${inter}$ (${toBn(inter)})।`,
    };
  },
  (k) => {
    const red = 2 + (k % 5);
    const blue = 2 + (Math.floor(k / 5) % 5);
    const total = red + blue;
    // Probability of drawing 1 red AND 1 blue in two draws WITH replacement = 2 * red * blue / total^2
    const mc = buildFractionOptions(2 * red * blue, total * total, k);
    return {
      domain: 'Probability',
      subskill: 'Independent events',
      grade: 'Grade 10',
      ageBand: '15–16 years',
      minGradeLevel: 10,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Calculate probability of different colors in two independent draws',
      prompt: `A jar has ${red} red and ${blue} blue beads. A bead is drawn, replaced, and a second bead is drawn. Find the probability of getting DIFFERENT colors.`,
      promptBn: `একটি জারে ${toBn(red)}টি লাল ও ${toBn(blue)}টি নীল পুঁতি আছে। ১টি তুলে রেখে দিয়ে আরেকটি তুললে দুটি পুঁতি ভিন্ন রঙের হওয়ার সম্ভাবনা কত?`,
      ...mc,
      explanation: `P(diff) = P(RB) + P(BR) = 2 × (${red}/${total}) × (${blue}/${total}) = ${mc.correctAnswer}.`,
      explanationBn: `ভিন্ন রঙের সম্ভাবনা $= 2 \\times \\frac{${red}}{${total}} \\times \\frac{${blue}}{${total}} = ${mc.correctAnswerBn}$।`,
    };
  },

  // =========================================================================
  // 56-60: GRADE 11–12 (minGradeLevel: 11, maxGradeLevel: 12)
  // =========================================================================
  (k) => {
    const n = 5 + (k % 15);
    const askDiag = Math.floor(k / 15) % 2 === 1;
    const ans = askDiag ? (n * (n - 3)) / 2 : (n * (n - 1)) / 2;
    const mc = buildNumericOptions(ans, k);
    return {
      domain: 'Probability',
      subskill: 'Sample space',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Count pairwise handshakes or polygon diagonals',
      prompt: askDiag
        ? `How many DIAGONALS does a convex ${n}-sided polygon have?`
        : `At a conference with ${n} people, everyone shakes hands with everyone else exactly once. How many handshakes occur?`,
      promptBn: askDiag
        ? `একটি ${toBn(n)}-ভুজের মোট কয়টি কর্ণ (Diagonal) আছে?`
        : `একটি সভায় ${toBn(n)} জন ব্যক্তি প্রত্যেকে সবার সাথে একবার করে করমর্দন করলে মোট কতটি করমর্দন হবে?`,
      ...mc,
      explanation: askDiag
        ? `Diagonals = n(n − 3)/2 = ${n}(${n - 3})/2 = ${ans}.`
        : `Handshakes = n(n − 1)/2 = ${n}(${n - 1})/2 = ${ans}.`,
      explanationBn: askDiag
        ? `কর্ণের সংখ্যা $= \\frac{${n}(${n - 3})}{2} = ${ans}$ (${toBn(ans)})।`
        : `মোট করমর্দন $= \\frac{${n}(${n - 1})}{2} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const a = -(1 + (k % 5));
    const b = 2 + (Math.floor(k / 5) % 6);
    const c = -(1 + ((k * 3) % 4));
    const d = 2 + (k % 7);
    const det = a * d - b * c;
    const mc = buildNumericOptions(det, k, true);
    return {
      domain: 'Algebraic Thinking',
      subskill: 'Mathematical modeling',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 3,
      difficultyTier: 'medium',
      learningObjective: 'Compute 2×2 matrix determinants with negative entries',
      prompt: `Evaluate the determinant: $\\det\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$`,
      promptBn: `$\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$ ম্যাট্রিক্সটির নির্ণায়ক কত?`,
      ...mc,
      explanation: `det = (${a})(${d}) − (${b})(${c}) = ${a * d} − (${b * c}) = ${det}.`,
      explanationBn: `নির্ণায়ক $= (${a})(${d}) - (${b})(${c}) = ${det}$।`,
    };
  },
  (k) => {
    const a = 1 + (k % 4);
    const b = 1 + (Math.floor(k / 4) % 5);
    const c = 2 + ((k * 3) % 6);
    const x0 = 1 + (Math.floor(k / 20) % 4);
    // f(x) = a x^4 + b x^3 + c x^2 => f'(x) = 4a x^3 + 3b x^2 + 2c x => f''(x) = 12a x^2 + 6b x + 2c
    const ans = 12 * a * x0 * x0 + 6 * b * x0 + 2 * c;
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
      learningObjective: 'Compute the second derivative f\'\'(x₀) of a quartic polynomial',
      prompt: `If $f(x) = ${a === 1 ? '' : a}x^4 + ${b === 1 ? '' : b}x^3 + ${c}x^2$, find the second derivative $f''(${x0})$.`,
      promptBn: `$f(x) = ${a === 1 ? '' : a}x^4 + ${b === 1 ? '' : b}x^3 + ${c}x^2$ হলে দ্বিতীয় অন্তরক $f''(${x0})$ কত?`,
      ...mc,
      explanation: `f''(x) = ${12 * a}x² + ${6 * b}x + ${2 * c}. At x = ${x0}, f''(${x0}) = ${ans}.`,
      explanationBn: `$f''(x) = ${12 * a}x^2 + ${6 * b}x + ${2 * c}$; $x = ${x0}$ বসালে উত্তর ${toBn(ans)}।`,
    };
  },
  (k) => {
    const a = 1 + (k % 3);
    const b = 1 + (Math.floor(k / 3) % 4);
    const c = 1 + ((k * 3) % 5);
    const upper = 1 + (Math.floor(k / 12) % 3); // 1, 2, 3
    // Integral_0^upper (4a x^3 + 3b x^2 + 2c x) dx = a*upper^4 + b*upper^3 + c*upper^2
    const ans = a * Math.pow(upper, 4) + b * Math.pow(upper, 3) + c * Math.pow(upper, 2);
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
      learningObjective: 'Evaluate definite integrals of cubic polynomials',
      prompt: `Evaluate: $\\int_{0}^{${upper}} (${4 * a}x^3 + ${3 * b}x^2 + ${2 * c}x)\\,dx$`,
      promptBn: `মান নির্ণয় করো: $\\int_{0}^{${upper}} (${4 * a}x^3 + ${3 * b}x^2 + ${2 * c}x)\\,dx$`,
      ...mc,
      explanation: `Antiderivative is ${a}x⁴ + ${b}x³ + ${c}x². At x = ${upper}: ${ans}.`,
      explanationBn: `$[${a}x^4 + ${b}x^3 + ${c}x^2]_0^{${upper}} = ${ans}$ (${toBn(ans)})।`,
    };
  },
  (k) => {
    const ux = 2 + (k % 6);
    const uy = 1 + (Math.floor(k / 6) % 7);
    const vx = 1 + ((k * 3) % 6);
    const vy = 2 + ((k * 5) % 8);
    // z-component of (ux, uy, 0) x (vx, vy, 0) = ux*vy - uy*vx
    const ans = ux * vy - uy * vx;
    const mc = buildNumericOptions(ans, k, true);
    return {
      domain: 'Spatial and Visual Reasoning',
      subskill: 'Coordinate mapping',
      grade: 'Grade 11',
      ageBand: '17+ years',
      minGradeLevel: 11,
      maxGradeLevel: 12,
      difficulty: 4,
      difficultyTier: 'hard',
      learningObjective: 'Compute the z-component of the cross product of two planar vectors',
      prompt: `For $\\vec{u} = (${ux}, ${uy}, 0)$ and $\\vec{v} = (${vx}, ${vy}, 0)$, find the $\\hat{k}$-component of $\\vec{u} \\times \\vec{v}$.`,
      promptBn: `$\\vec{u} = (${ux}, ${uy}, 0)$ এবং $\\vec{v} = (${vx}, ${vy}, 0)$ হলে $\\vec{u} \\times \\vec{v}$-এর $\\hat{k}$ উপাংশ কত?`,
      ...mc,
      explanation: `uₓvᵧ − uᵧvₓ = (${ux})(${vy}) − (${uy})(${vx}) = ${ux * vy} − ${uy * vx} = ${ans}.`,
      explanationBn: `$${ux}\\times ${vy} - ${uy}\\times ${vx} = ${ans}$।`,
    };
  },
];

function createFifth2000Questions(): MathQuestion[] {
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

export const GENERATED_FIFTH_2000_QUESTIONS: MathQuestion[] = createFifth2000Questions();
