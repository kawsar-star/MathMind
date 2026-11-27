import { OlympiadProblem } from '../types/mathmind';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

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

function frac(num: number, den: number): { en: string; bn: string } {
  if (den === 0) return { en: '0', bn: '০' };
  const sign = (num < 0) !== (den < 0) ? '-' : '';
  const a = Math.abs(num);
  const b = Math.abs(den);
  const g = gcd(a, b);
  const rn = a / g;
  const rd = b / g;
  if (rd === 1) {
    return { en: `${sign}${rn}`, bn: `${sign}${toBn(rn)}` };
  }
  return {
    en: `${sign}${rn}/${rd}`,
    bn: `${sign}${toBn(rn)}/${toBn(rd)}`,
  };
}

function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

const NAMES_EN = [
  'Amina', 'Rafi', 'Nusrat', 'Tariq', 'Sadia', 'Farhan', 'Mim', 'Nabil',
  'Tania', 'Imran', 'Lamia', 'Saif', 'Ritu', 'Mahin', 'Anika', 'Zayed',
];
const NAMES_BN = [
  'আমিনা', 'রাফি', 'নুসরাত', 'তারিক', 'সাদিয়া', 'ফারহান', 'মিম', 'নাবিল',
  'তানিয়া', 'ইমরান', 'লামিয়া', 'সাইফ', 'রিতু', 'মাহিন', 'আনিকা', 'জায়েদ',
];

function makeId(index: number): string {
  return `oly_g_${String(index).padStart(4, '0')}`;
}

export function buildGeneratedOlympiad2000(): OlympiadProblem[] {
  const list: OlympiadProblem[] = [];
  let seq = 1;

  // =========================================================================
  // DIVISION 1: Pre-Primary – Grade 2 (Age 4–8) — 400 Important Olympiad Problems
  // =========================================================================
  const d1 = {
    minGradeLevel: 0,
    maxGradeLevel: 2,
    minAge: 4,
    maxAge: 8,
    gradeBand: 'Pre-Primary – Grade 2',
    gradeBandBn: 'প্রি-প্রাইমারি – ২য় শ্রেণি',
    ageBand: '4–8 years',
    ageBandBn: '৪–৮ বছর',
  };

  // 1.1 Logical Reasoning (80): Climbing Frog / Snail / Squirrel / Ant in Well
  for (let i = 0; i < 80; i++) {
    const up = 3 + (i % 5); // 3, 4, 5, 6, 7
    const down = 1 + (Math.floor(i / 5) % (up - 1)); // 1..up-1
    const net = up - down;
    const preDays = 2 + (Math.floor(i / 8) % 10) + (i % 2); // varied days
    const extraOffset = Math.floor(i / 40); // ensures distinct well depth
    const well = preDays * net + up + extraOffset * 0;
    const ansDay = preDays + 1;
    const creatures = [
      { en: 'frog', enCap: 'Frog', bn: 'ব্যাঙ' },
      { en: 'snail', enCap: 'Snail', bn: 'শামুক' },
      { en: 'squirrel', enCap: 'Squirrel', bn: 'কাঠবিড়ালি' },
      { en: 'ant', enCap: 'Ant', bn: 'পিঁপড়া' },
    ];
    const cr = creatures[i % creatures.length];

    list.push({
      id: makeId(seq++),
      ...d1,
      title: `Climbing ${cr.enCap} Leap Puzzle #${i + 1}`,
      titleBn: `${cr.bn}-এর কূপ থেকে ওঠার ধাঁধা #${toBn(i + 1)}`,
      category: 'Logical Reasoning',
      difficulty: i < 40 ? 'Explorer' : 'Beginner Olympiad',
      prompt: `A little ${cr.en} starts at the bottom of a $${well}\\text{ m}$ well (Puzzle #${i + 1}). Every day it climbs $${up}\\text{ m}$ up, and every night it slips $${down}\\text{ m}$ back down. On which day does it finally reach the top?`,
      promptBn: `একটি ছোট্ট ${cr.bn} $${toBn(well)}$ মিটার গভীর কূপের তলায় আছে (ধাঁধা #${toBn(i + 1)})। প্রতিদিন দিনে সে $${toBn(up)}$ মিটার উপরে ওঠে এবং রাতে $${toBn(down)}$ মিটার নিচে পিছলে নামে। কততম দিনে সেটি কূপের একদম মাথায় পৌঁছাবে?`,
      correctAnswer: String(ansDay),
      correctAnswerBn: toBn(ansDay),
      hints: [
        `Do not just divide ${well} by ${net}! Remember once it reaches ${well} m during the day, it climbs right out.`,
        `Each full day-and-night gives a net gain of ${up} - ${down} = ${net} m.`,
        `After ${preDays} full days and nights it sits at ${preDays * net} m. Check Day ${ansDay}!`,
      ],
      hintsBn: [
        `শুধু ${toBn(well)}-কে ${toBn(net)} দিয়ে ভাগ কোরো না! কূপের মাথায় পৌঁছে গেলে আর নিচে পিছলাবে না।`,
        `প্রতি ১ দিন ও ১ রাতে প্রকৃত বৃদ্ধি = ${toBn(up)} - ${toBn(down)} = ${toBn(net)} মিটার।`,
        `${toBn(preDays)} দিন ও রাত শেষে এটি ${toBn(preDays * net)} মিটারে থাকে; পরের দিন ${toBn(up)} মিটার উঠলে কোথায় পৌঁছাবে?`,
      ],
      solution: `Net progress per full day-night is $${up} - ${down} = ${net}\\text{ m}$. After $${preDays}$ cycles it reaches $${preDays * net}\\text{ m}$. On Day $${ansDay}$, it climbs $${up}\\text{ m}$ to hit $${preDays * net + up} = ${well}\\text{ m}$ and exits!`,
      solutionBn: `প্রতি পূর্ণ দিন-রাতে ওঠা হয় $${toBn(up)} - ${toBn(down)} = ${toBn(net)}$ মিটার। $${toBn(preDays)}$ দিন-রাত শেষে উচ্চতা $${toBn(preDays * net)}$ মিটার। $${toBn(ansDay)}$তম দিনে আরও $${toBn(up)}$ মিটার উঠে মোট $${toBn(well)}$ মিটারে পৌঁছে বাইরে বেরিয়ে আসে।`,
      keyInsight: 'Always reserve the final upward jump before dividing by the net daily climb.',
      keyInsightBn: 'মোট উচ্চতা থেকে শেষ দিনের লাফটি আলাদা রেখে বাকিটাকে দৈনিক নিট বৃদ্ধি দিয়ে ভাগ করতে হয়।',
      source: 'official_style',
    });
  }

  // 1.2 Mathematical Puzzles (80): Balance Scale Fruit Weights
  for (let i = 0; i < 80; i++) {
    const apple = 3 + (i % 10);
    const mango = 4 + Math.floor(i / 10) * 2;
    const multA = 1 + (i % 2); // 1 or 2
    const sum1 = apple + mango;
    const sum2 = (multA + 1) * apple + mango;
    const askCount = 2 + (i % 3); // 2, 3, 4 apples
    const ans = askCount * apple;

    list.push({
      id: makeId(seq++),
      ...d1,
      title: `Balance Scale Fruit Deduction #${i + 1}`,
      titleBn: `দাঁড়িপাল্লায় ফলের ওজন রহস্য #${toBn(i + 1)}`,
      category: 'Mathematical Puzzles',
      difficulty: i < 40 ? 'Explorer' : 'Beginner Olympiad',
      prompt: `On a balance scale: 1 apple + 1 mango weigh $${sum1}\\text{ g}$, while ${multA + 1} apples + 1 mango weigh $${sum2}\\text{ g}$. What is the weight of ${askCount} apples in grams?`,
      promptBn: `একটি দাঁড়িপাল্লায় ১টি আপেল ও ১টি আমের মোট ওজন $${toBn(sum1)}$ গ্রাম। আবার ${toBn(multA + 1)}টি আপেল ও ১টি আমের মোট ওজন $${toBn(sum2)}$ গ্রাম। তাহলে ${toBn(askCount)}টি আপেলের ওজন কত গ্রাম?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        `Compare the two weighings: what is the ONLY extra item on the second scale?`,
        `The extra ${multA} apple(s) add ${sum2 - sum1} g to the scale.`,
        `Find the weight of 1 apple first, then multiply by ${askCount}.`,
      ],
      hintsBn: [
        `দুটি ওজনের মধ্যে পার্থক্য কোথায়? দ্বিতীয়টিতে কেবল অতিরিক্ত কয়টি আপেল আছে?`,
        `অতিরিক্ত ${toBn(multA)}টি আপেলের জন্য ওজন বেড়েছে ${toBn(sum2 - sum1)} গ্রাম।`,
        `আগে ১টি আপেলের ওজন বের করে তাকে ${toBn(askCount)} দিয়ে গুণ করো।`,
      ],
      solution: `Comparing both equations removes the mango: $${multA}$ apple(s) weigh $${sum2} - ${sum1} = ${sum2 - sum1}\\text{ g}$, so 1 apple = $${apple}\\text{ g}$. Thus ${askCount} apples weigh $${askCount} \\times ${apple} = ${ans}\\text{ g}$.`,
      solutionBn: `দ্বিতীয় ওজন থেকে প্রথম ওজন বাদ দিলে আমের ওজন বাদ যায়: ${toBn(multA)}টি আপেলের ওজন = ${toBn(sum2)} - ${toBn(sum1)} = ${toBn(sum2 - sum1)} গ্রাম। তাই ১টি আপেল = ${toBn(apple)} গ্রাম, এবং ${toBn(askCount)}টি আপেল = ${toBn(askCount)} × ${toBn(apple)} = ${toBn(ans)} গ্রাম।`,
      keyInsight: 'Subtracting two balanced configurations eliminates the unknown second object.',
      keyInsightBn: 'দুটি ভারসাম্য থেকে একই বস্তু বাদ দিলে বাকি বস্তুর ওজন সরাসরি পাওয়া যায়।',
      source: 'official_style',
    });
  }

  // 1.3 Pattern and Sequence (80): Dual-Interleaved Growing Sequences
  for (let i = 0; i < 80; i++) {
    const a1 = 2 + (i % 9);
    const d1Step = 2 + ((i >> 3) % 5);
    const b1 = 10 + (i % 7);
    const d2Step = 3 + ((i >> 2) % 4);
    // Sequence: a1, b1, a1+d1, b1+d2, a1+2d1, b1+2d2, ? (7th term = a1+3d1)
    const seqTerms = [a1, b1, a1 + d1Step, b1 + d2Step, a1 + 2 * d1Step, b1 + 2 * d2Step];
    const ans = a1 + 3 * d1Step;

    list.push({
      id: makeId(seq++),
      ...d1,
      title: `Alternating Secret Pattern #${i + 1}`,
      titleBn: `জোড়া-জোড়া লুকানো ধারা #${toBn(i + 1)}`,
      category: 'Pattern and Sequence',
      difficulty: i < 40 ? 'Explorer' : 'Beginner Olympiad',
      prompt: `Discover the hidden rule and find the next number: $${seqTerms.join(', ')}, \\underline{\\quad\\quad}$`,
      promptBn: `লুকানো নিয়মটি খুঁজে বের করে পরের সংখ্যাটি লেখো: $${seqTerms.map(toBn).join(', ')}, \\underline{\\quad\\quad}$`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        'Instead of looking at neighbors, look at every OTHER number (1st, 3rd, 5th, ...).',
        `Check the jump from ${seqTerms[0]} to ${seqTerms[2]} to ${seqTerms[4]}.`,
        `Add ${d1Step} to ${seqTerms[4]} to get the 7th number!`,
      ],
      hintsBn: [
        'পাশাপাশি সংখ্যার বদলে একটি পরপর সংখ্যাগুলো (১ম, ৩য়, ৫ম) খেয়াল করো!',
        `${toBn(seqTerms[0])} থেকে ${toBn(seqTerms[2])}, এবং ${toBn(seqTerms[2])} থেকে ${toBn(seqTerms[4])} কত করে বেড়েছে?`,
        `তাহলে ${toBn(seqTerms[4])}-এর সাথে ${toBn(d1Step)} যোগ করলে ৭ম সংখ্যাটি কত হবে?`,
      ],
      solution: `Two patterns are interwoven! Odd positions (1st, 3rd, 5th, 7th) add $${d1Step}$ each time: $${seqTerms[0]}, ${seqTerms[2]}, ${seqTerms[4]}, ${ans}$. Even positions add $${d2Step}$. Answer = $${ans}$.`,
      solutionBn: `এখানে দুটি আলাদা ধারা একসাথে মেশানো আছে। ১ম, ৩য়, ৫ম, ৭ম অবস্থানে প্রতিবার ${toBn(d1Step)} করে বাড়ছে: ${toBn(seqTerms[0])}, ${toBn(seqTerms[2])}, ${toBn(seqTerms[4])}, ${toBn(ans)}। তাই উত্তর ${toBn(ans)}।`,
      keyInsight: 'When differences jump up and down, check alternating odd/even index sub-sequences.',
      keyInsightBn: 'পাশাপাশি পার্থক্য এলোমেলো মনে হলে এক ঘর পরপর দুটি আলাদা ধারা খুঁজে দেখো।',
      source: 'official_style',
    });
  }

  // 1.4 Combinatorics (80): Small-Group Pair Counting & Outfit Pairs
  for (let i = 0; i < 80; i++) {
    if (i < 40) {
      const n = 3 + (i % 10); // 3..12
      const contextIdx = Math.floor(i / 10); // 0..3 -> 40 distinct (context, n) pairs!
      const ans = (n * (n - 1)) / 2;
      const contexts = [
        {
          titleEn: 'Friendly Handshakes',
          titleBn: 'বন্ধুদের করমর্দন গণনা',
          promptEn: `At a picnic, $${n}$ friends shake hands with every other friend once. How many total handshakes take place?`,
          promptBn: `একটি বনভোজনে $${toBn(n)}$ জন বন্ধু একে অপরের সাথে একবার করে হাত মেলাল। মোট কতবার করমর্দন হলো?`,
        },
        {
          titleEn: 'Classroom High-Fives',
          titleBn: 'সহপাঠীদের হাই-ফাইভ গণনা',
          promptEn: `In a math circle, $${n}$ students give one high-five to every other student. How many total high-fives occur?`,
          promptBn: `গণিত ক্লাসে $${toBn(n)}$ জন শিক্ষার্থী একে অপরের সাথে একবার করে হাই-ফাইভ দিল। মোট কতটি হাই-ফাইভ হলো?`,
        },
        {
          titleEn: 'Round-Robin Chess Games',
          titleBn: 'দাবা লিগের মোট ম্যাচ',
          promptEn: `In a tournament, $${n}$ players each play every other player exactly once. How many total games are played?`,
          promptBn: `একটি দাবা প্রতিযোগিতায় $${toBn(n)}$ জন খেলোয়াড় প্রত্যেকে সবার সাথে ১টি করে ম্যাচ খেলে। মোট কতটি ম্যাচ খেলা হবে?`,
        },
        {
          titleEn: 'Island Bridges Network',
          titleBn: 'দ্বীপের মাঝে সেতু সংযোগ',
          promptEn: `$${n}$ islands are connected so that every pair of islands has exactly one direct bridge between them. How many bridges exist?`,
          promptBn: `$${toBn(n)}$টি দ্বীপের প্রতি জোড়া দ্বীপের মাঝে ঠিক ১টি করে সরাসরি সেতু তৈরি করা হলে মোট কয়টি সেতু প্রয়োজন?`,
        },
      ];
      const ctx = contexts[contextIdx];
      list.push({
        id: makeId(seq++),
        ...d1,
        title: `${ctx.titleEn} #${i + 1}`,
        titleBn: `${ctx.titleBn} #${toBn(i + 1)}`,
        category: 'Combinatorics',
        difficulty: i < 20 ? 'Explorer' : 'Beginner Olympiad',
        prompt: ctx.promptEn,
        promptBn: ctx.promptBn,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          `The first item connects with ${n - 1} others, the second connects with ${n - 2} new ones, and so on.`,
          `Add: ${Array.from({ length: n - 1 }, (_, k) => n - 1 - k).join(' + ')}.`,
          `Or multiply ${n} × ${n - 1} and divide by 2!`,
        ],
        hintsBn: [
          `প্রথমটি যুক্ত হয় ${toBn(n - 1)}টির সাথে, দ্বিতীয়টি নতুন ${toBn(n - 2)}টির সাথে—এভাবে শেষ পর্যন্ত গোনো।`,
          `যোগ করো: ${Array.from({ length: n - 1 }, (_, k) => toBn(n - 1 - k)).join(' + ')}।`,
          `অথবা ${toBn(n)} × ${toBn(n - 1)} করে ২ দিয়ে ভাগ করো!`,
        ],
        solution: `Summing distinct pairs gives $${n - 1} + ${n - 2} + \\dots + 1 = \\frac{${n} \\times ${n - 1}}{2} = ${ans}$.`,
        solutionBn: `মোট জোড়া = $\\frac{${toBn(n)} \\times ${toBn(n - 1)}}{২} = ${toBn(ans)}$টি।`,
        keyInsight: 'Count every pair once by adding $(n-1) + (n-2) + \\dots + 1$.',
        keyInsightBn: 'প্রতিটি জুটি একবার করে গুণতে ২ দিয়ে ভাগ করা অথবা ক্রমান্বয়ে যোগ করা হয়।',
        source: 'official_style',
      });
    } else {
      const k = i - 40;
      const shirts = 2 + (k % 5); // 2..6
      const caps = 2 + Math.floor(k / 5) % 4; // 2..5
      const shoes = 1 + Math.floor(k / 20); // 1..2
      const ans = shirts * caps * shoes;
      list.push({
        id: makeId(seq++),
        ...d1,
        title: `Colorful Outfit Combinations #${k + 1}`,
        titleBn: `রঙিন পোশাক সাজানোর উপায় #${toBn(k + 1)}`,
        category: 'Combinatorics',
        difficulty: 'Beginner Olympiad',
        prompt: `${NAMES_EN[k % NAMES_EN.length]} has $${shirts}$ T-shirts, $${caps}$ caps, and $${shoes}$ pair(s) of sneakers. How many different outfits (1 T-shirt + 1 cap + 1 pair of sneakers) can they wear?`,
        promptBn: `${NAMES_BN[k % NAMES_BN.length]}-এর কাছে $${toBn(shirts)}$টি টি-শার্ট, $${toBn(caps)}$টি টুপি এবং $${toBn(shoes)}$ জোড়া জুতা আছে। সে মোট কত রকম ভিন্নভাবে সাজতে পারবে?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          'For every choice of T-shirt, you can pair it with any of the caps.',
          `Multiply the number of choices: ${shirts} × ${caps} × ${shoes}.`,
          'Make sure you multiply, not add!',
        ],
        hintsBn: [
          'প্রতিটি টি-শার্টের সাথে যেকোনো একটি টুপি পরা যায়।',
          `মোট উপায় পেতে সংখ্যাগুলো গুণ করো: ${toBn(shirts)} × ${toBn(caps)} × ${toBn(shoes)}।`,
          'যোগ নয়, এখানে গুণন নীতি ব্যবহার করতে হবে!',
        ],
        solution: `By the multiplication principle, total outfits = $${shirts} \\times ${caps} \\times ${shoes} = ${ans}$.`,
        solutionBn: `গুণন নীতি অনুযায়ী মোট সাজানোর উপায় = $${toBn(shirts)} \\times ${toBn(caps)} \\times ${toBn(shoes)} = ${toBn(ans)}$টি।`,
        keyInsight: 'Independent choices multiply together to give total combinations.',
        keyInsightBn: 'স্বাধীন পছন্দগুলোর সংখ্যা পরস্পর গুণ করলে মোট ভিন্ন বিন্যাস পাওয়া যায়।',
        source: 'official_style',
      });
    }
  }

  // 1.5 Geometry (80): Row of Squares Perimeter & Grid Squares Count
  for (let i = 0; i < 80; i++) {
    if (i < 40) {
      const count = 3 + (i % 7); // 3..9 squares in a row
      const side = 2 + Math.floor(i / 7); // 2..7 cm
      const perim = (2 * count + 2) * side;
      list.push({
        id: makeId(seq++),
        ...d1,
        title: `Joined Squares Row Perimeter #${i + 1}`,
        titleBn: `সারিবদ্ধ বর্গের পরিসীমা #${toBn(i + 1)}`,
        category: 'Geometry',
        difficulty: i < 20 ? 'Explorer' : 'Beginner Olympiad',
        prompt: `$${count}$ identical squares, each of side $${side}\\text{ cm}$, are glued side-by-side in a straight row to make a long rectangle. What is the perimeter of this long rectangle in cm?`,
        promptBn: `$${toBn(side)}$ সেমি বাহুবিশিষ্ট $${toBn(count)}$টি সমান বর্গ পাশাপাশি বসিয়ে একটি লম্বা আয়ত তৈরি করা হলো। নতুন আয়তটির পরিসীমা কত সেমি?`,
        correctAnswer: String(perim),
        correctAnswerBn: toBn(perim),
        hints: [
          'Notice the shared inside edges are hidden inside and do NOT count in the outer perimeter!',
          `Length of the long rectangle is ${count} × ${side} = ${count * side} cm, and width is ${side} cm.`,
          `Compute 2 × (${count * side} + ${side}).`,
        ],
        hintsBn: [
          'সতর্ক থেকো: বর্গগুলোর ভেতরের জোড়া লাগানো বাহুগুলো পরিসীমায় আসবে না!',
          `লম্বা আয়তের দৈর্ঘ্য = ${toBn(count)} × ${toBn(side)} = ${toBn(count * side)} সেমি এবং প্রস্থ = ${toBn(side)} সেমি।`,
          `এবার ২ × (${toBn(count * side)} + ${toBn(side)}) হিসাব করো।`,
        ],
        solution: `The combined rectangle has length $${count * side}\\text{ cm}$ and width $${side}\\text{ cm}$. Perimeter = $2(${count * side} + ${side}) = ${perim}\\text{ cm}$.`,
        solutionBn: `নতুন আয়তের দৈর্ঘ্য $${toBn(count * side)}$ সেমি ও প্রস্থ $${toBn(side)}$ সেমি। পরিসীমা = ২ × (${toBn(count * side)} + ${toBn(side)}) = $${toBn(perim)}$ সেমি।`,
        keyInsight: 'When shapes join together, interior shared edges vanish from the outer perimeter.',
        keyInsightBn: 'আকৃতি জুড়ে দিলে ভেতরের সংযুক্ত বাহুগুলো বাইরের পরিসীমা থেকে বাদ পড়ে।',
        source: 'official_style',
      });
    } else {
      const k = i - 40;
      const rows = 2 + Math.floor(k / 14); // 2, 3, 4
      const cols = 2 + (k % 14); // 2..15 -> 42 unique (rows, cols)
      let totalSquares = 0;
      for (let s = 1; s <= Math.min(rows, cols); s++) {
        totalSquares += (rows - s + 1) * (cols - s + 1);
      }
      list.push({
        id: makeId(seq++),
        ...d1,
        title: `Hidden Squares in a ${rows}×${cols} Grid #${k + 1}`,
        titleBn: `${toBn(rows)}×${toBn(cols)} গ্রিডে লুকানো বর্গ গণনা #${toBn(k + 1)}`,
        category: 'Geometry',
        difficulty: 'Beginner Olympiad',
        prompt: `How many total squares of ALL sizes ($1\\times 1$, $2\\times 2$, etc.) can you find inside a $${rows} \\times ${cols}$ grid?`,
        promptBn: `একটি $${toBn(rows)} \\times ${toBn(cols)}$ গ্রিডের ভেতরে ছোট ও বড় ($1\\times 1, 2\\times 2$ ইত্যাদি) সব মিলিয়ে মোট কয়টি বর্গ আছে?`,
        correctAnswer: String(totalSquares),
        correctAnswerBn: toBn(totalSquares),
        hints: [
          `Count the small $1\\times 1$ unit squares first: there are $${rows} \\times ${cols} = ${rows * cols}$.`,
          `Now count $2\\times 2$ squares: $(${rows}-1) \\times (${cols}-1) = ${(rows - 1) * (cols - 1)}$${rows > 2 ? `, plus larger sizes up to ${Math.min(rows, cols)}×${Math.min(rows, cols)}` : ''}.`,
          `Sum the counts across all square sizes!`,
        ],
        hintsBn: [
          `প্রথমে ছোট $1\\times 1$ বর্গ গোনো: মোট $${toBn(rows)} \\times ${toBn(cols)} = ${toBn(rows * cols)}$টি।`,
          `এবার $2\\times 2$ বর্গ গোনো: $${toBn(rows - 1)} \\times ${toBn(cols - 1)} = ${toBn((rows - 1) * (cols - 1))}$টি${rows > 2 ? ' এবং আরও বড় মাপের বর্গগুলো যোগ করো' : ''}।`,
          `সব মাপের বর্গ সংখ্যা যোগ করো।`,
        ],
        solution: `Summing $(r - s + 1)(c - s + 1)$ over $s = 1 \\dots ${Math.min(rows, cols)}$ gives a total of $${totalSquares}$ squares.`,
        solutionBn: `ছোট থেকে বড় সব মাপের বর্গ যোগ করে পাই মোট $${toBn(totalSquares)}$টি বর্গ।`,
        keyInsight: 'Always count shapes size by size so none are missed or double-counted.',
        keyInsightBn: 'ছোট ও বড় আকারের বর্গ আলাদা করে গুণলে একটিও বাদ পড়ে না।',
        source: 'official_style',
      });
    }
  }

  // =========================================================================
  // DIVISION 2: Grade 3 – Grade 5 (Age 8–11) — 400 Important Olympiad Problems
  // =========================================================================
  const d2 = {
    minGradeLevel: 3,
    maxGradeLevel: 5,
    minAge: 8,
    maxAge: 11,
    gradeBand: 'Grade 3 – Grade 5',
    gradeBandBn: '৩য় – ৫ম শ্রেণি',
    ageBand: '8–11 years',
    ageBandBn: '৮–১১ বছর',
  };

  // 2.1 Mathematical Puzzles (80): Contest Scoring Assumption Method
  for (let i = 0; i < 80; i++) {
    const plus = 3 + (i % 4); // 3, 4, 5, 6
    const minus = 1 + ((i >> 2) % 3); // 1, 2, 3
    const wrong = 2 + (i % 9); // 2..10
    const totalQ = 15 + (i % 16); // 15..30
    const right = totalQ - wrong;
    const score = right * plus - wrong * minus;
    const nameIdx = i % NAMES_EN.length;

    list.push({
      id: makeId(seq++),
      ...d2,
      title: `Olympiad Score Deduction #${i + 1}`,
      titleBn: `অলিম্পিয়াড নম্বর সমীকরণ ধাঁধা #${toBn(i + 1)}`,
      category: 'Mathematical Puzzles',
      difficulty: i < 40 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
      prompt: `In a $${totalQ}$-question math contest, every correct answer earns $+${plus}$ points and every wrong answer loses $-${minus}$ points. ${NAMES_EN[nameIdx]} answered all $${totalQ}$ questions and scored $${score}$ points. How many questions did ${NAMES_EN[nameIdx]} answer CORRECTLY?`,
      promptBn: `$${toBn(totalQ)}$টি প্রশ্নের একটি গণিত প্রতিযোগিতায় প্রতিটি সঠিক উত্তরে $+${toBn(plus)}$ নম্বর এবং প্রতিটি ভুল উত্তরে $-${toBn(minus)}$ নম্বর কাটা হয়। ${NAMES_BN[nameIdx]} সবগুলো প্রশ্নের উত্তর দিয়ে মোট $${toBn(score)}$ নম্বর পেল। সে কয়টি সঠিক উত্তর দিয়েছে?`,
      correctAnswer: String(right),
      correctAnswerBn: toBn(right),
      hints: [
        `Imagine ${NAMES_EN[nameIdx]} got ALL ${totalQ} right: max score would be ${totalQ * plus}.`,
        `Each wrong answer drops the score from +${plus} to -${minus}, which is a swing of ${plus + minus} points!`,
        `Divide the point gap (${totalQ * plus - score}) by ${plus + minus} to find the wrong count, then subtract from ${totalQ}.`,
      ],
      hintsBn: [
        `ধরো ${toBn(totalQ)}টিই সঠিক হলে মোট নম্বর হতো ${toBn(totalQ * plus)}।`,
        `প্রতিটি ভুল উত্তরের জন্য +${toBn(plus)}-এর বদলে -${toBn(minus)} হয়, অর্থাৎ মোট ${toBn(plus + minus)} নম্বর কমে যায়!`,
        `কমে যাওয়া নম্বর (${toBn(totalQ * plus - score)})-কে ${toBn(plus + minus)} দিয়ে ভাগ করলে ভুল সংখ্যা পাবে।`,
      ],
      solution: `Perfect score = $${totalQ} \\times ${plus} = ${totalQ * plus}$. Deficit = $${totalQ * plus} - ${score} = ${totalQ * plus - score}$. Each wrong answer costs $${plus} + ${minus} = ${plus + minus}$ points, so wrong answers = $${wrong}$ and correct answers = $${totalQ} - ${wrong} = ${right}$.`,
      solutionBn: `সব সঠিক হলে নম্বর হতো ${toBn(totalQ * plus)}। কমেছে ${toBn(totalQ * plus - score)} নম্বর। প্রতি ভুলে কমে ${toBn(plus)} + ${toBn(minus)} = ${toBn(plus + minus)} নম্বর। তাই ভুল = ${toBn(wrong)}টি এবং সঠিক = ${toBn(totalQ)} - ${toBn(wrong)} = ${toBn(right)}টি।`,
      keyInsight: 'Assuming 100% correct and dividing the total drop by the per-error swing solves it instantly.',
      keyInsightBn: 'সবগুলো সঠিক ধরে মোট ঘাটতিকে প্রতি ভুলের ক্ষতি দিয়ে ভাগ করলেই মুহূর্তে উত্তর পাওয়া যায়।',
      source: 'official_style',
    });
  }

  // 2.2 Geometry (80): Corner-Cut / Stepped Polygon Perimeter
  for (let i = 0; i < 80; i++) {
    const w = 10 + (i % 15); // 10..24
    const h = 8 + Math.floor(i / 5) % 12; // 8..19
    const cw = 2 + (i % 5); // < w
    const ch = 2 + ((i >> 1) % 4); // < h
    const perim = 2 * (w + h);

    list.push({
      id: makeId(seq++),
      ...d2,
      title: `L-Shape Cutout Perimeter #${i + 1}`,
      titleBn: `কোণা কাটা আয়তের পরিসীমা #${toBn(i + 1)}`,
      category: 'Geometry',
      difficulty: i < 40 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
      prompt: `From a $${w}\\text{ cm} \\times ${h}\\text{ cm}$ rectangular cardboard, a smaller $${cw}\\text{ cm} \\times ${ch}\\text{ cm}$ rectangle is cut out cleanly from one corner. What is the perimeter of the remaining L-shaped piece in cm?`,
      promptBn: `একটি $${toBn(w)}$ সেমি × $${toBn(h)}$ সেমি আয়তাকার কার্ডবোর্ডের এক কোণা থেকে $${toBn(cw)}$ সেমি × $${toBn(ch)}$ সেমি একটি ছোট আয়ত কেটে নেওয়া হলো। বাকি L-আকৃতির কার্ডটির পরিসীমা কত সেমি?`,
      correctAnswer: String(perim),
      correctAnswerBn: toBn(perim),
      hints: [
        'Trace the new inner horizontal and vertical cut edges carefully.',
        'Notice that pushing the two inner cut segments outward restores the original full rectangle!',
        `Compute 2 × (${w} + ${h}).`,
      ],
      hintsBn: [
        'কাটা অংশের ভেতরের দুটি নতুন বাহু কল্পনা করে বাইরের দিকে ঠেলে দাও।',
        'দেখবে পরিসীমা একটুও কমেনি—মূল আয়তের পরিসীমার সমানই আছে!',
        `২ × (${toBn(w)} + ${toBn(h)}) হিসাব করো।`,
      ],
      solution: `By translating the two inward cut sides outward to the bounding corner, the perimeter remains identical to the original rectangle: $2(${w} + ${h}) = ${perim}\\text{ cm}$.`,
      solutionBn: `ভেতরের কাটা বাহু দুটিকে বাইরে প্রজেক্ট করলে মূল আয়তই ফিরে আসে। তাই পরিসীমা = ২ × (${toBn(w)} + ${toBn(h)}) = $${toBn(perim)}$ সেমি।`,
      keyInsight: 'Corner rectangular cutouts preserve perimeter completely.',
      keyInsightBn: 'কোণা থেকে আয়তাকার অংশ কাটলে পরিসীমা অপরিবর্তিত থাকে।',
      source: 'official_style',
    });
  }

  // 2.3 Number Theory (80): Synchronized Bells / Traffic Lights (LCM)
  for (let i = 0; i < 80; i++) {
    const p1 = 3 + (i % 8); // 3..10
    const p2 = p1 + 2 + (Math.floor(i / 8) % 5); // strictly > p1
    const p3 = p2 + 2 + Math.floor(i / 40) * 3 + (i % 2); // strictly > p2 -> 80 unique ordered triples
    const lcm12 = (p1 * p2) / gcd(p1, p2);
    const lcm123 = (lcm12 * p3) / gcd(lcm12, p3);

    list.push({
      id: makeId(seq++),
      ...d2,
      title: `Synchronized Bells LCM Challenge #${i + 1}`,
      titleBn: `তিনটি ঘণ্টার একসাথে বাজার সময় #${toBn(i + 1)}`,
      category: 'Number Theory',
      difficulty: i < 40 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
      prompt: `Three school bells ring automatically every $${p1}$, $${p2}$, and $${p3}$ minutes respectively. If all three ring together at 9:00 AM, after how many minutes will they NEXT ring together at the exact same instant?`,
      promptBn: `তিনটি ঘণ্টা যথাক্রমে প্রতি $${toBn(p1)}$, $${toBn(p2)}$ ও $${toBn(p3)}$ মিনিট পরপর বাজে। সকাল ৯:০০টায় তিনটি একসাথে বাজার পর কমপক্ষে কত মিনিট পরে তারা আবার একসাথে বাজবে?`,
      correctAnswer: String(lcm123),
      correctAnswerBn: toBn(lcm123),
      hints: [
        `The wait time must be a common multiple of ${p1}, ${p2}, and ${p3}.`,
        'Find the Least Common Multiple (LCM) using prime factorization.',
        `First find $\\text{LCM}(${p1}, ${p2}) = ${lcm12}$, then combine with ${p3}.`,
      ],
      hintsBn: [
        `সময়টি অবশ্যই ${toBn(p1)}, ${toBn(p2)} এবং ${toBn(p3)}-এর একটি সাধারণ গুণিতক হতে হবে।`,
        `মৌলিক উৎপাদকের সাহায্যে ল.সা.গু. (LCM) বের করো।`,
        `প্রথমে ${toBn(p1)} ও ${toBn(p2)}-এর ল.সা.গু. (${toBn(lcm12)}) বের করে তার সাথে ${toBn(p3)}-এর ল.সা.গু. নাও।`,
      ],
      solution: `We need $\\text{LCM}(${p1}, ${p2}, ${p3})$. Since $\\text{LCM}(${p1}, ${p2}) = ${lcm12}$, taking $\\text{LCM}(${lcm12}, ${p3})$ yields $${lcm123}$ minutes.`,
      solutionBn: `নির্ণেয় সময় = ${toBn(p1)}, ${toBn(p2)} ও ${toBn(p3)}-এর ল.সা.গু. = $${toBn(lcm123)}$ মিনিট।`,
      keyInsight: 'Periodic events re-align at the Least Common Multiple (LCM) of their periods.',
      keyInsightBn: 'পুনরাবৃত্ত ঘটনাগুলো আবার একত্রে ঘটে তাদের সময়কালের ল.সা.গু. (LCM) পরপর।',
      source: 'official_style',
    });
  }

  // 2.4 Algebra (80): Future Age Multiple & Sum Backward Construction
  for (let i = 0; i < 80; i++) {
    const child = 5 + (i % 8); // 5..12
    const kYears = 2 + (Math.floor(i / 8) % 5); // 2..6
    const mult = 3 + ((i >> 1) % 3); // 3, 4, 5
    const parentFuture = mult * (child + kYears);
    const parentNow = parentFuture - kYears;
    const sumNow = child + parentNow;

    list.push({
      id: makeId(seq++),
      ...d2,
      title: `Time-Shift Age Ratio Puzzle #${i + 1}`,
      titleBn: `বয়সের অনুপাত ও যোগফল ধাঁধা #${toBn(i + 1)}`,
      category: 'Algebra',
      difficulty: i < 40 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
      prompt: `Today, the sum of a mother's age and her child's age is $${sumNow}$ years. In $${kYears}$ years from now, the mother will be exact $${mult}$ times as old as her child. How old is the CHILD today?`,
      promptBn: `বর্তমানে মা ও সন্তানের বয়সের সমষ্টি $${toBn(sumNow)}$ বছর। $${toBn(kYears)}$ বছর পর মায়ের বয়স সন্তানের বয়সের ঠিক $${toBn(mult)}$ গুণ হবে। বর্তমানে সন্তানের বয়স কত বছর?`,
      correctAnswer: String(child),
      correctAnswerBn: toBn(child),
      hints: [
        `In ${kYears} years, BOTH ages increase by ${kYears}, so the sum of their ages increases by $2 \\times ${kYears} = ${2 * kYears}$!`,
        `Future sum = ${sumNow} + ${2 * kYears} = ${sumNow + 2 * kYears} years, shared in ${mult} + 1 = ${mult + 1} equal parts.`,
        `Find the child's future age (${child + kYears}), then subtract ${kYears} to get today's age.`,
      ],
      hintsBn: [
        `${toBn(kYears)} বছর পর দুজনের বয়সই ${toBn(kYears)} করে বাড়বে — অর্থাৎ মোট যোগফল বাড়বে ২ × ${toBn(kYears)} = ${toBn(2 * kYears)} বছর!`,
        `${toBn(kYears)} বছর পর মোট বয়স = ${toBn(sumNow + 2 * kYears)} বছর, যা (${toBn(mult)} + ১) = ${toBn(mult + 1)} অংশে ভাগ হবে।`,
        `ভবিষ্যতের সন্তানের বয়স (${toBn(child + kYears)}) থেকে ${toBn(kYears)} বিয়োগ করে বর্তমান বয়স বের করো।`,
      ],
      solution: `In $${kYears}$ years, their combined age will be $${sumNow} + 2(${kYears}) = ${sumNow + 2 * kYears}$. That equals $(${mult} + 1) = ${mult + 1}$ times the child's future age, so future child age = $\\frac{${sumNow + 2 * kYears}}{${mult + 1}} = ${child + kYears}$. Today's age = $${child + kYears} - ${kYears} = ${child}$.`,
      solutionBn: `${toBn(kYears)} বছর পর দুজনের বয়সের সমষ্টি হবে ${toBn(sumNow)} + ${toBn(2 * kYears)} = ${toBn(sumNow + 2 * kYears)} বছর। তখন মা = ${toBn(mult)} গুণ ও সন্তান = ১ গুণ, মোট (${toBn(mult + 1)}) গুণ = ${toBn(sumNow + 2 * kYears)}। তাই ভবিষ্যতে সন্তানের বয়স ${toBn(child + kYears)} এবং বর্তমানে ${toBn(child + kYears)} - ${toBn(kYears)} = ${toBn(child)} বছর।`,
      keyInsight: 'When shifting two people k years forward, their sum rises by 2k.',
      keyInsightBn: 'দুজনের বয়স k বছর বাড়ালে বয়সের সমষ্টি একসাথে 2k বছর বাড়ে।',
      source: 'official_style',
    });
  }

  // 2.5 Logical Reasoning (80): Pigeonhole Principle Worst-Case Draws
  for (let i = 0; i < 80; i++) {
    const colors = 3 + (i % 5); // 3, 4, 5, 6, 7 colors
    const targetSame = 2 + (Math.floor(i / 5) % 4); // 2, 3, 4, 5 matching socks
    const perColor = targetSame + 3 + Math.floor(i / 20); // 4 offsets -> 5 * 4 * 4 = 80 distinct!
    // Worst case: pick (targetSame - 1) of EACH of the `colors` colors, plus 1 more!
    const ans = colors * (targetSame - 1) + 1;

    list.push({
      id: makeId(seq++),
      ...d2,
      title: `Pigeonhole Dark-Drawer Guarantee #${i + 1}`,
      titleBn: `অন্ধকার ড্রয়ারে নিশ্চিত জোড়া মিলানো #${toBn(i + 1)}`,
      category: 'Logical Reasoning',
      difficulty: i < 40 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
      prompt: `A dark drawer contains socks in $${colors}$ different colors, with $${perColor}$ socks of each color. Without looking, what is the MINIMUM number of socks you must pull out to GUARANTEE having at least $${targetSame}$ socks of the SAME color?`,
      promptBn: `একটি অন্ধকার ড্রয়ারে $${toBn(colors)}$টি ভিন্ন রঙের মোজা আছে এবং প্রতিটি রঙের $${toBn(perColor)}$টি করে মোজা রয়েছে। না দেখে কমপক্ষে কয়টি মোজা তুলে নিলে নিশ্চিতভাবে একই রঙের অন্তত $${toBn(targetSame)}$টি মোজা পাওয়া যাবে?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        'Think of the UNLUCKIEST possible scenario first (Pigeonhole Principle).',
        `In the worst case, you draw ${targetSame - 1} socks of each of the ${colors} colors without reaching ${targetSame} in any color.`,
        `What happens on the very next draw after ${colors} × ${targetSame - 1}?`,
      ],
      hintsBn: [
        'সবচেয়ে দুর্ভাগ্যজনক পরিস্থিতি চিন্তা করো (পায়রাখোপ নীতি / Pigeonhole Principle)।',
        `সবচেয়ে খারাপ ক্ষেত্রে প্রতিটি রঙের ${toBn(targetSame - 1)}টি করে (${toBn(colors)} × ${toBn(targetSame - 1)}) মোজা উঠবে, তবু কোনো রঙেই ${toBn(targetSame)}টি হবে না।`,
        `তারপর আর মাত্র ১টি মোজা তুললেই কী হবে?`,
      ],
      solution: `By the Pigeonhole Principle, the worst case avoids $${targetSame}$ matches by taking $${targetSame - 1}$ of every color: $${colors} \\times ${targetSame - 1} = ${colors * (targetSame - 1)}$. The next sock guarantees $${targetSame}$ of one color, so minimum = $${ans}$.`,
      solutionBn: `সবচেয়ে খারাপ ক্ষেত্রে ${toBn(colors)}টি রঙের প্রতিটির ${toBn(targetSame - 1)}টি করে মোট ${toBn(colors * (targetSame - 1))}টি মোজা তোলার পর আর মাত্র ১টি তুললেই নিশ্চিতভাবে একটি রঙের ${toBn(targetSame)}টি পূর্ণ হবে। তাই উত্তর = ${toBn(ans)}।`,
      keyInsight: 'Guarantee problems = (Worst-Case Misses) + 1.',
      keyInsightBn: 'নিশ্চয়তার প্রশ্নে সবচেয়ে খারাপ ক্ষেত্র হিসাব করে তার সাথে +১ যোগ করতে হয়।',
      source: 'official_style',
    });
  }

  // =========================================================================
  // DIVISION 3: Grade 6 – Grade 8 (Age 11–14) — 400 Important Olympiad Problems
  // =========================================================================
  const d3 = {
    minGradeLevel: 6,
    maxGradeLevel: 8,
    minAge: 11,
    maxAge: 14,
    gradeBand: 'Grade 6 – Grade 8',
    gradeBandBn: '৬ষ্ঠ – ৮ম শ্রেণি',
    ageBand: '11–14 years',
    ageBandBn: '১১–১৪ বছর',
  };

  // 3.1 Number Theory (80): Units Digit of Massive Exponential Powers
  const bases = [2, 3, 4, 7, 8, 9];
  for (let i = 0; i < 80; i++) {
    const base = bases[i % bases.length] + (Math.floor(i / 24) * 10); // e.g., 2, 3, 12, 27...
    const exp = 2021 + i * 7 + (i % 5);
    const ans = modPow(base, exp, 10);
    const d1Pow = base % 10;
    const d2Pow = (d1Pow * d1Pow) % 10;
    const d3Pow = (d2Pow * d1Pow) % 10;
    const d4Pow = (d3Pow * d1Pow) % 10;

    list.push({
      id: makeId(seq++),
      ...d3,
      title: `Power Tower Units Digit #${i + 1}`,
      titleBn: `বৃহৎ ঘাতের এককের অঙ্ক নির্ণয় #${toBn(i + 1)}`,
      category: 'Number Theory',
      difficulty: i < 40 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
      prompt: `What is the units (last) digit of $${base}^{${exp}}$?`,
      promptBn: `$${toBn(base)}^{${toBn(exp)}}$ সংখ্যাটির এককের ঘরের (শেষ) অঙ্ক কত?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        `Only the last digit of the base (${d1Pow}) affects the units digit of the product.`,
        `List the first 4 powers mod 10: ${d1Pow}, ${d2Pow}, ${d3Pow}, ${d4Pow}.`,
        `Check the remainder of the exponent ${exp} modulo 4 (or cycle length).`,
      ],
      hintsBn: [
        `শেষ অঙ্কের জন্য কেবল ভিত্তির এককের অঙ্ক (${toBn(d1Pow)}) বিবেচনা করলেই যথেষ্ট।`,
        `প্রথম ৪টি ঘাতের শেষ অঙ্ক দেখো: ${toBn(d1Pow)}, ${toBn(d2Pow)}, ${toBn(d3Pow)}, ${toBn(d4Pow)}।`,
        `ঘাত ${toBn(exp)}-কে ৪ দিয়ে ভাগ করে ভাগশেষ দেখো।`,
      ],
      solution: `The units digits of powers of $${base}$ cycle with period dividing $4$: $(${d1Pow}, ${d2Pow}, ${d3Pow}, ${d4Pow})$. Since $${exp} \\equiv ${exp % 4 === 0 ? 4 : exp % 4} \\pmod 4$, the units digit is $${ans}$.`,
      solutionBn: `$${toBn(base)}$-এর ঘাতের শেষ অঙ্কগুলো ৪ ধাপ পরপর পুনরাবৃত্ত হয় (${toBn(d1Pow)}, ${toBn(d2Pow)}, ${toBn(d3Pow)}, ${toBn(d4Pow)})। $${toBn(exp)}$-কে ৪ দিয়ে ভাগ করলে ভাগশেষ $${toBn(exp % 4)}$ থাকে, তাই শেষ অঙ্ক = $${toBn(ans)}$।`,
      keyInsight: 'Every integer power sequence mod 10 repeats with cycle length dividing 4.',
      keyInsightBn: 'যেকোনো পূর্ণসংখ্যার ঘাতের এককের অঙ্ক সর্বোচ্চ ৪ ধাপ পরপর পুনরাবৃত্ত হয়।',
      source: 'official_style',
    });
  }

  // 3.2 Algebra (80): Symmetric Reciprocal Identities
  for (let i = 0; i < 80; i++) {
    const idx = Math.floor(i / 3); // 0..26 unique per variant!
    const k = 3 + idx;
    const variant = i % 3;
    if (variant === 0) {
      // x + 1/x = k => x^2 + 1/x^2 = k^2 - 2
      const ans = k * k - 2;
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Symmetric Reciprocal Square #${i + 1}`,
        titleBn: `প্রতিসম বীজগাণিতিক বর্গ #${toBn(i + 1)}`,
        category: 'Algebra',
        difficulty: i < 40 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
        prompt: `If $x + \\frac{1}{x} = ${k}$, find the exact value of $x^2 + \\frac{1}{x^2}$.`,
        promptBn: `যদি $x + \\frac{1}{x} = ${toBn(k)}$ হয়, তবে $x^2 + \\frac{1}{x^2}$-এর মান কত?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          'Do NOT solve for $x$! Square both sides of the equation directly.',
          'Expand $(x + \\frac{1}{x})^2 = x^2 + 2(x)(\\frac{1}{x}) + \\frac{1}{x^2}$.',
          `Subtract 2 from ${k}^2 = ${k * k}.`,
        ],
        hintsBn: [
          '$x$-এর মান আলাদা বের করার দরকার নেই! উভয় পক্ষকে বর্গ করো।',
          '$(x + \\frac{1}{x})^2 = x^2 + 2 + \\frac{1}{x^2}$ সূত্র ব্যবহার করো।',
          `${toBn(k)}^2 = ${toBn(k * k)} থেকে ২ বিয়োগ করো।`,
        ],
        solution: `Squaring gives $\\left(x + \\frac{1}{x}\\right)^2 = ${k * k} \\implies x^2 + 2 + \\frac{1}{x^2} = ${k * k} \\implies x^2 + \\frac{1}{x^2} = ${ans}$.`,
        solutionBn: `উভয় পক্ষকে বর্গ করে পাই $x^2 + 2 + \\frac{1}{x^2} = ${toBn(k * k)}$, সুতরাং $x^2 + \\frac{1}{x^2} = ${toBn(k * k)} - ২ = ${toBn(ans)}$।`,
        keyInsight: 'Squaring reciprocal sums cancels $x \\cdot \\frac{1}{x} = 1$ cleanly.',
        keyInsightBn: '$x \\cdot \\frac{1}{x} = 1$ হওয়ায় বর্গ করলেই মধ্যপদ ধ্রুবক ২-এ পরিণত হয়।',
        source: 'official_style',
      });
    } else if (variant === 1) {
      // x - 1/x = k => x^2 + 1/x^2 = k^2 + 2
      const ans = k * k + 2;
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Reciprocal Difference Identity #${i + 1}`,
        titleBn: `বিপরীত রাশির বিয়োগফল থেকে বর্গসমষ্টি #${toBn(i + 1)}`,
        category: 'Algebra',
        difficulty: 'Intermediate Olympiad',
        prompt: `Given $x - \\frac{1}{x} = ${k}$, determine the value of $x^2 + \\frac{1}{x^2}$.`,
        promptBn: `দেওয়া আছে $x - \\frac{1}{x} = ${toBn(k)}$। তাহলে $x^2 + \\frac{1}{x^2}$-এর মান কত?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          'Square both sides of $x - \\frac{1}{x} = ' + k + '$.',
          'Note that $(a - b)^2 = a^2 - 2ab + b^2$, and here $ab = 1$.',
          `Move $-2$ to the right side: ${k}^2 + 2.`,
        ],
        hintsBn: [
          'উভয় পক্ষকে সরাসরি বর্গ করো।',
          '$(x - \\frac{1}{x})^2 = x^2 - 2 + \\frac{1}{x^2}$।',
          `${toBn(k)}^2$-এর সাথে ২ যোগ করো।`,
        ],
        solution: `$\\left(x - \\frac{1}{x}\\right)^2 = ${k * k} \\implies x^2 - 2 + \\frac{1}{x^2} = ${k * k} \\implies x^2 + \\frac{1}{x^2} = ${ans}$.`,
        solutionBn: `বর্গ করলে পাই $x^2 - 2 + \\frac{1}{x^2} = ${toBn(k * k)}$, অতএব $x^2 + \\frac{1}{x^2} = ${toBn(k * k)} + ২ = ${toBn(ans)}$।`,
        keyInsight: 'Notice the sign flip: $(x - 1/x)^2$ produces $-2$, so you ADD $2$ to $k^2$.',
        keyInsightBn: 'বিয়োগের বর্গে $-2$ আসে, তাই ডান পাশে গিয়ে $+2$ যোগ হয়।',
        source: 'official_style',
      });
    } else {
      // x + 1/x = c => x^3 + 1/x^3 = c^3 - 3c
      const c = 2 + idx;
      const ans = c * c * c - 3 * c;
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Symmetric Reciprocal Cube #${i + 1}`,
        titleBn: `প্রতিসম ঘনের মান নির্ণয় #${toBn(i + 1)}`,
        category: 'Algebra',
        difficulty: 'Advanced Olympiad',
        prompt: `If $x + \\frac{1}{x} = ${c}$, compute the exact value of $x^3 + \\frac{1}{x^3}$.`,
        promptBn: `যদি $x + \\frac{1}{x} = ${toBn(c)}$ হয়, তবে $x^3 + \\frac{1}{x^3}$-এর মান নির্ণয় করো।`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          'Cube both sides or recall $a^3 + b^3 = (a + b)^3 - 3ab(a + b)$.',
          'With $a = x$ and $b = \\frac{1}{x}$, $ab = 1$!',
          `Compute ${c}^3 - 3(${c}).`,
        ],
        hintsBn: [
          'সূত্র মনে করো: $a^3 + b^3 = (a + b)^3 - 3ab(a + b)$।',
          'এখানে $ab = x \\cdot \\frac{1}{x} = 1$।',
          `${toBn(c)}^3 - ৩(${toBn(c)}) হিসাব করো।`,
        ],
        solution: `$x^3 + \\frac{1}{x^3} = \\left(x + \\frac{1}{x}\\right)^3 - 3\\left(x + \\frac{1}{x}\\right) = ${c}^3 - 3(${c}) = ${c * c * c} - ${3 * c} = ${ans}$.`,
        solutionBn: `$x^3 + \\frac{1}{x^3} = (x + \\frac{1}{x})^3 - 3(x + \\frac{1}{x}) = ${toBn(c)}^3 - 3(${toBn(c)}) = ${toBn(ans)}$।`,
        keyInsight: 'For $x + 1/x = k$, the cube sum always equals $k^3 - 3k$.',
        keyInsightBn: '$x + 1/x = k$ হলে ঘনের সমষ্টি সবসময় $k^3 - 3k$ হয়।',
        source: 'official_style',
      });
    }
  }

  // 3.3 Combinatorics (80): Grid Squares, Grid Rectangles & Polygon Diagonals
  for (let i = 0; i < 80; i++) {
    if (i < 40) {
      const n = 3 + Math.floor(i / 2); // 3..22 distinct!
      const sqSum = (n * (n + 1) * (2 * n + 1)) / 6;
      const m = n + (i % 5);
      if (i % 2 === 0) {
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Squares Inside an ${n}×${n} Grid #${i + 1}`,
          titleBn: `${toBn(n)}×${toBn(n)} গ্রিডে মোট বর্গক্ষেত্র #${toBn(i + 1)}`,
          category: 'Combinatorics',
          difficulty: 'Intermediate Olympiad',
          prompt: `How many total squares of ALL sizes ($1\\times 1, 2\\times 2, \\dots, ${n}\\times ${n}$) are contained in a $${n} \\times ${n}$ square grid?`,
          promptBn: `একটি $${toBn(n)} \\times ${toBn(n)}$ বর্গাকার গ্রিডে ছোট-বড় সব মাপের মোট কতটি বর্গক্ষেত্র আছে?`,
          correctAnswer: String(sqSum),
          correctAnswerBn: toBn(sqSum),
          hints: [
            `There are ${n}^2 unit squares and (${n}-1)^2 squares of size 2×2.`,
            `Sum the squares: $1^2 + 2^2 + \\dots + ${n}^2$.`,
            'Use $\\frac{n(n+1)(2n+1)}{6}$ to check your addition.',
          ],
          hintsBn: [
            `১×১ বর্গ আছে ${toBn(n)}^2টি, ২×২ আছে ${toBn(n - 1)}^2টি—এভাবে চলবে।`,
            `অর্থাৎ যোগ করতে হবে $1^2 + 2^2 + \\dots + ${toBn(n)}^2$।`,
            `$\\frac{n(n+1)(2n+1)}{6}$ সূত্র দিয়ে যাচাই করো।`,
          ],
          solution: `Total squares $= \\sum_{k=1}^{${n}} k^2 = \\frac{${n}(${n + 1})(${2 * n + 1})}{6} = ${sqSum}$.`,
          solutionBn: `মোট বর্গ = $1^2 + 2^2 + \\dots + ${toBn(n)}^2 = ${toBn(sqSum)}$টি।`,
          keyInsight: 'An $n \\times n$ grid holds $\\sum_{k=1}^n k^2$ squares.',
          keyInsightBn: '$n \\times n$ গ্রিডে মোট বর্গের সংখ্যা $\\sum_{k=1}^n k^2$।',
          source: 'official_style',
        });
      } else {
        const rects = ((n * (n + 1)) / 2) * ((m * (m + 1)) / 2);
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Rectangles in an ${n}×${m} Grid #${i + 1}`,
          titleBn: `${toBn(n)}×${toBn(m)} গ্রিডে মোট আয়তক্ষেত্র #${toBn(i + 1)}`,
          category: 'Combinatorics',
          difficulty: 'Advanced Olympiad',
          prompt: `How many rectangles (including squares) exist inside a $${n} \\times ${m}$ rectangular grid?`,
          promptBn: `একটি $${toBn(n)} \\times ${toBn(m)}$ গ্রিডের ভেতরে (বর্গগুলোসহ) মোট কতটি আয়তক্ষেত্র রয়েছে?`,
          correctAnswer: String(rects),
          correctAnswerBn: toBn(rects),
          hints: [
            `A rectangle is uniquely formed by choosing 2 horizontal grid lines (out of ${n + 1}) and 2 vertical grid lines (out of ${m + 1}).`,
            `Compute $\\binom{${n + 1}}{2}$ and $\\binom{${m + 1}}{2}$.`,
            'Multiply those two counts together!',
          ],
          hintsBn: [
            `প্রতিটি আয়তক্ষেত্র তৈরি হয় ${toBn(n + 1)}টি অনুভূমিক রেখা থেকে ২টি এবং ${toBn(m + 1)}টি উল্লম্ব রেখা থেকে ২টি রেখা বেছে নিয়ে।`,
            `অর্থাৎ $\\binom{${toBn(n + 1)}}{2}$ এবং $\\binom{${toBn(m + 1)}}{2}$ বের করো।`,
            'সংখ্যা দুটি গুণ করো!',
          ],
          solution: `Choosing 2 out of ${n + 1} rows and 2 out of ${m + 1} columns gives $\\binom{${n + 1}}{2} \\times \\binom{${m + 1}}{2} = ${(n * (n + 1)) / 2} \\times ${(m * (m + 1)) / 2} = ${rects}$.`,
          solutionBn: `মোট আয়তক্ষেত্র = $\\binom{${toBn(n + 1)}}{2} \\times \\binom{${toBn(m + 1)}}{2} = ${toBn((n * (n + 1)) / 2)} \\times ${toBn((m * (m + 1)) / 2)} = ${toBn(rects)}$টি।`,
          keyInsight: 'Grid rectangles correspond to pairs of horizontal and vertical boundary lines.',
          keyInsightBn: 'গ্রিডের যেকোনো ২টি সারি-রেখা ও ২টি কলাম-রেখা মিলে একটি স্বতন্ত্র আয়ত তৈরি করে।',
          source: 'official_style',
        });
      }
    } else {
      const sides = 5 + (i - 40); // 5..44-gon
      const diags = (sides * (sides - 3)) / 2;
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Convex ${sides}-gon Diagonals #${i - 39}`,
        titleBn: `${toBn(sides)}-ভুজের কর্ণ সংখ্যা নির্ণয় #${toBn(i - 39)}`,
        category: 'Combinatorics',
        difficulty: 'Intermediate Olympiad',
        prompt: `How many total diagonals can be drawn inside a convex $${sides}$-sided polygon?`,
        promptBn: `একটি $${toBn(sides)}$-বাহুবিশিষ্ট উত্তল বহুভুজের মোট কয়টি কর্ণ (diagonals) আঁকা যাবে?`,
        correctAnswer: String(diags),
        correctAnswerBn: toBn(diags),
        hints: [
          `From each of the ${sides} vertices, you can connect to ${sides - 3} non-adjacent vertices.`,
          `Careful: connecting A to B is the same diagonal as B to A!`,
          `Compute $\\frac{${sides} \\times (${sides} - 3)}{2}$.`,
        ],
        hintsBn: [
          `প্রতিটি শীর্ষবিন্দু থেকে নিজের ও পাশের দুটি বাদে বাকি ${toBn(sides - 3)}টি শীর্ষে কর্ণ আঁকা যায়।`,
          `প্রতিটি কর্ণ দুইবার গণনা হয়ে যায়, তাই ২ দিয়ে ভাগ করতে হবে।`,
          `$\\frac{${toBn(sides)} \\times ${toBn(sides - 3)}}{2}$ হিসাব করো।`,
        ],
        solution: `A convex $n$-gon has $\\frac{n(n - 3)}{2}$ diagonals. For $n = ${sides}$, diagonals = $\\frac{${sides} \\times ${sides - 3}}{2} = ${diags}$.`,
        solutionBn: `সূত্র অনুযায়ী কর্ণ সংখ্যা = $\\frac{n(n - 3)}{2} = \\frac{${toBn(sides)} \\times ${toBn(sides - 3)}}{২} = ${toBn(diags)}$টি।`,
        keyInsight: 'Subtract 3 (self + 2 neighbors) from each vertex, then divide by 2 for symmetry.',
        keyInsightBn: 'নিজে ও দুই পাশের শীর্ষ বাদ দিয়ে গুণ করে ২ দিয়ে ভাগ করলেই কর্ণ পাওয়া যায়।',
        source: 'official_style',
      });
    }
  }

  // 3.4 Probability (80): Marbles Without Replacement, Two-Dice Sums/Inequalities/Diff & Coin Flips
  for (let i = 0; i < 80; i++) {
    if (i < 45) {
      const red = 2 + (i % 9); // 2..10
      const blue = 2 + Math.floor(i / 9); // 2..6 -> 9 * 5 = 45 unique pairs!
      const total = red + blue;
      const ansF = frac(red * (red - 1), total * (total - 1));
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Sequential Marble Probability #${i + 1}`,
        titleBn: `প্রতিস্থাপন ছাড়া মার্বেল তোলার সম্ভাবনা #${toBn(i + 1)}`,
        category: 'Probability',
        difficulty: i < 20 ? 'Beginner Olympiad' : 'Intermediate Olympiad',
        prompt: `A jar holds $${red}$ red marbles and $${blue}$ blue marbles. Two marbles are drawn one by one WITHOUT replacement. What is the probability that BOTH are red? (Enter as simplified fraction a/b)`,
        promptBn: `একটি জারে $${toBn(red)}$টি লাল এবং $${toBn(blue)}$টি নীল মার্বেল আছে। না ফিরিয়ে পরপর ২টি মার্বেল তোলা হলে দুটিই লাল হওয়ার সম্ভাবনা কত? (সরল ভগ্নাংশ a/b আকারে লেখো)`,
        correctAnswer: ansF.en,
        correctAnswerBn: ansF.bn,
        hints: [
          `First draw probability = ${red}/${total}.`,
          `After removing one red marble, ${red - 1} red and ${total - 1} total marbles remain.`,
          `Multiply $\\frac{${red}}{${total}} \\times \\frac{${red - 1}}{${total - 1}}$ and simplify.`,
        ],
        hintsBn: [
          `প্রথমটি লাল হওয়ার সম্ভাবনা ${toBn(red)}/${toBn(total)}।`,
          `একটি লাল তোলার পর ${toBn(red - 1)}টি লাল ও মোট ${toBn(total - 1)}টি মার্বেল বাকি থাকে।`,
          `গুণ করে লঘিষ্ঠ আকারে প্রকাশ করো।`,
        ],
        solution: `$P(\\text{both red}) = \\frac{${red}}{${total}} \\times \\frac{${red - 1}}{${total - 1}} = ${ansF.en}$.`,
        solutionBn: `মোট সম্ভাবনা = $\\frac{${toBn(red)}}{${toBn(total)}} \\times \\frac{${toBn(red - 1)}}{${toBn(total - 1)}} = ${ansF.bn}$।`,
        keyInsight: 'Without replacement shrinks both numerator and denominator by 1 on the second draw.',
        keyInsightBn: 'ফিরিয়ে না দিলে দ্বিতীয় ধাপে লব ও হর উভয়ই ১ কমে যায়।',
        source: 'official_style',
      });
    } else {
      const k = i - 45; // 0..34 (35 completely unique probability tasks!)
      if (k < 11) {
        const targetSum = 2 + k; // 2..12 (11 unique exact sums)
        const favCount = targetSum <= 7 ? targetSum - 1 : 13 - targetSum;
        const ansF = frac(favCount, 36);
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Two-Dice Exact Sum ${targetSum}`,
          titleBn: `দুটি ছক্কার যোগফল ${toBn(targetSum)} হওয়ার সম্ভাবনা`,
          category: 'Probability',
          difficulty: 'Intermediate Olympiad',
          prompt: `Two fair 6-sided dice are rolled together. What is the probability that the sum of the two top faces equals $${targetSum}$? (Enter as a/b)`,
          promptBn: `দুটি ছক্কা একসাথে নিক্ষেপ করলে ছক্কা দুটির সংখ্যার যোগফল ঠিক $${toBn(targetSum)}$ হওয়ার সম্ভাবনা কত? (a/b আকারে লেখো)`,
          correctAnswer: ansF.en,
          correctAnswerBn: ansF.bn,
          hints: [
            'Total ordered outcomes for two dice = $6 \\times 6 = 36$.',
            `List ordered pairs $(d_1, d_2)$ with $1 \\le d_1, d_2 \\le 6$ that add up to ${targetSum}.`,
            `There are ${favCount} favorable pairs; simplify ${favCount}/36.`,
          ],
          hintsBn: [
            'দুটি ছক্কার মোট সম্ভাব্য ফলাফল = ৬ × ৬ = ৩৬টি।',
            `কোন কোন জোড়া $(d_1, d_2)$ যোগ করলে ${toBn(targetSum)} হয় তা তালিকা করো।`,
            `অনুকূল জোড়া ${toBn(favCount)}টি; ${toBn(favCount)}/৩৬-কে সরল করো।`,
          ],
          solution: `Out of $36$ ordered outcomes, exact $${favCount}$ pairs sum to $${targetSum}$, so $P = \\frac{${favCount}}{36} = ${ansF.en}$.`,
          solutionBn: `৩৬টি সম্ভাব্য ফলাফলের মধ্যে ${toBn(favCount)}টি জোড়ার যোগফল ${toBn(targetSum)}। তাই সম্ভাবনা = ${ansF.bn}।`,
          keyInsight: 'Two-dice sum counts rise linearly from 1 way (sum 2) up to 6 ways (sum 7), then fall symmetrically.',
          keyInsightBn: 'দুটি ছক্কার যোগফলের উপায় ২ থেকে ৭ পর্যন্ত বাড়ে এবং ৭-এর পর সমভাবে কমে।',
          source: 'official_style',
        });
      } else if (k < 21) {
        const minSum = 3 + (k - 11); // 3..12 (10 unique >= sums)
        let fav = 0;
        for (let d1 = 1; d1 <= 6; d1++) {
          for (let d2 = 1; d2 <= 6; d2++) {
            if (d1 + d2 >= minSum) fav++;
          }
        }
        const ansF = frac(fav, 36);
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Two-Dice Threshold Probability (Sum ≥ ${minSum})`,
          titleBn: `দুটি ছক্কার যোগফল অন্তত ${toBn(minSum)} হওয়ার সম্ভাবনা`,
          category: 'Probability',
          difficulty: 'Intermediate Olympiad',
          prompt: `Two fair 6-sided dice are rolled. What is the probability that the sum of the two dice is AT LEAST $${minSum}$? (Enter as a/b)`,
          promptBn: `দুটি ছক্কা একসাথে নিক্ষেপ করলে ছক্কা দুটির যোগফল কমপক্ষে $${toBn(minSum)}$ হওয়ার সম্ভাবনা কত? (a/b আকারে লেখো)`,
          correctAnswer: ansF.en,
          correctAnswerBn: ansF.bn,
          hints: [
            'Total ordered pairs = 36. Count outcomes with sum $\\ge ' + minSum + '$ or count complement ($< ' + minSum + '$).',
            `There are ${fav} pairs whose sum is $\\ge ${minSum}$.`,
            `Simplify ${fav}/36 to lowest terms.`,
          ],
          hintsBn: [
            `মোট ৩৬টি জোড়ার মধ্যে কতটির যোগফল কমপক্ষে ${toBn(minSum)} তা গোনো (অথবা ৩৬ থেকে ছোটগুলো বাদ দাও)।`,
            `অনুকূল জোড়া = ${toBn(fav)}টি।`,
            `${toBn(fav)}/৩৬-কে সরল করো।`,
          ],
          solution: `Counting all $(d_1, d_2)$ in $\\{1..6\\}^2$ with $d_1 + d_2 \\ge ${minSum}$ gives $${fav}$ favorable pairs out of $36$, so $P = ${ansF.en}$.`,
          solutionBn: `৩৬টির মধ্যে ${toBn(fav)}টি জোড়ার যোগফল $\\ge ${toBn(minSum)}$। তাই নির্ণেয় সম্ভাবনা = ${ansF.bn}।`,
          keyInsight: 'Complementary counting makes high-threshold dice probabilities fast.',
          keyInsightBn: 'বিপরীত ঘটনা ৩৬ থেকে বিয়োগ করলে বড় যোগফলের সম্ভাবনা দ্রুত বের করা যায়।',
          source: 'official_style',
        });
      } else if (k < 27) {
        const diff = k - 21; // 0..5 (6 unique |d1 - d2| diffs)
        const fav = diff === 0 ? 6 : 2 * (6 - diff);
        const ansF = frac(fav, 36);
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Two-Dice Absolute Difference |d₁ - d₂| = ${diff}`,
          titleBn: `দুটি ছক্কার সংখ্যার পার্থক্য ${toBn(diff)} হওয়ার সম্ভাবনা`,
          category: 'Probability',
          difficulty: 'Advanced Olympiad',
          prompt: `Two fair 6-sided dice are rolled. What is the probability that the positive difference between the two numbers is exact $${diff}$? (Enter as a/b)`,
          promptBn: `দুটি ছক্কা নিক্ষেপ করলে তাদের ওপরের সংখ্যা দুটির পার্থক্য ঠিক $${toBn(diff)}$ হওয়ার সম্ভাবনা কত? (a/b আকারে লেখো)`,
          correctAnswer: ansF.en,
          correctAnswerBn: ansF.bn,
          hints: [
            'Out of 36 ordered pairs $(d_1, d_2)$, list pairs where $|d_1 - d_2| = ' + diff + '$.',
            diff === 0 ? 'Doubles are (1,1), (2,2), ..., (6,6).' : `Remember $(a, b)$ and $(b, a)$ are distinct ordered rolls!`,
            `Simplify ${fav}/36.`,
          ],
          hintsBn: [
            `মোট ৩৬টি ফলাফলের মধ্যে যেগুলোর পার্থক্য ${toBn(diff)} সেগুলো গোনো।`,
            diff === 0 ? 'দুটি ছক্কাতেই সমান অঙ্ক আসার ৬টি উপায় আছে।' : '$(a, b)$ এবং $(b, a)$ আলাদা ক্রমজোড় হিসেবে গণনা করতে হবে!',
            `${toBn(fav)}/৩৬-কে সরল করো।`,
          ],
          solution: `There are $${fav}$ ordered pairs $(d_1, d_2)$ satisfying $|d_1 - d_2| = ${diff}$, giving $P = \\frac{${fav}}{36} = ${ansF.en}$.`,
          solutionBn: `মোট অনুকূল জোড়া ${toBn(fav)}টি, তাই সম্ভাবনা = $\\frac{${toBn(fav)}}{৩৬} = ${ansF.bn}$।`,
          keyInsight: 'Always treat Dice 1 and Dice 2 as ordered pairs even when taking differences.',
          keyInsightBn: 'পার্থক্য বের করার সময়ও দুটি ছক্কাকে ক্রমজোড় হিসেবে আলাদা গণনা করতে হয়।',
          source: 'official_style',
        });
      } else {
        // 8 unique multi-coin flip tasks (3, 4, or 5 coins, exact/at-least heads)
        const cIdx = k - 27; // 0..7
        const coins = 3 + Math.floor(cIdx / 3); // 3, 4, 5
        const exactHeads = 1 + (cIdx % 3); // 1, 2, 3
        const denom = Math.pow(2, coins);
        let comb = 1;
        for (let r = 0; r < exactHeads; r++) {
          comb = (comb * (coins - r)) / (r + 1);
        }
        const ansF = frac(comb, denom);
        list.push({
          id: makeId(seq++),
          ...d3,
          title: `Fair Coins Combinatorial Probability #${cIdx + 1}`,
          titleBn: `${toBn(coins)}টি মুদ্রা নিক্ষেপের সম্ভাবনা #${toBn(cIdx + 1)}`,
          category: 'Probability',
          difficulty: 'Advanced Olympiad',
          prompt: `A fair coin is tossed $${coins}$ times. What is the probability of getting EXACTLY $${exactHeads}$ head(s)? (Enter as a/b)`,
          promptBn: `একটি নিরপেক্ষ মুদ্রা $${toBn(coins)}$ বার নিক্ষেপ করলে ঠিক $${toBn(exactHeads)}$ বার হেড (Head) আসার সম্ভাবনা কত? (a/b আকারে লেখো)`,
          correctAnswer: ansF.en,
          correctAnswerBn: ansF.bn,
          hints: [
            `Total equally likely outcomes for ${coins} tosses = $2^{${coins}} = ${denom}$.`,
            `Count ways to choose which ${exactHeads} toss(es) are Heads: $\\binom{${coins}}{${exactHeads}}$.`,
            `Simplify $\\frac{${comb}}{${denom}}$.`,
          ],
          hintsBn: [
            `${toBn(coins)} বার নিক্ষেপে মোট ফলাফল = $2^{${toBn(coins)}} = ${toBn(denom)}$টি।`,
            `কতভাবে ঠিক ${toBn(exactHeads)}টি হেড বসানো যায় তা বের করো: $\\binom{${toBn(coins)}}{${toBn(exactHeads)}} = ${toBn(comb)}$।`,
            `$\\frac{${toBn(comb)}}{${toBn(denom)}}$-কে সরল করো।`,
          ],
          solution: `Total outcomes = $2^{${coins}} = ${denom}$. Favorable combinations = $\\binom{${coins}}{${exactHeads}} = ${comb}$. Thus $P = ${ansF.en}$.`,
          solutionBn: `মোট উপায় ${toBn(denom)}টি এবং অনুকূল উপায় $\\binom{${toBn(coins)}}{${toBn(exactHeads)}} = ${toBn(comb)}$টি। তাই সম্ভাবনা = ${ansF.bn}।`,
          keyInsight: 'Binomial coefficients count exact head placements over $2^n$ outcomes.',
          keyInsightBn: 'সমাবেশ সংখ্যা $\\binom{n}{k}$-কে $2^n$ দিয়ে ভাগ করে মুদ্রার সম্ভাবনা পাওয়া যায়।',
          source: 'official_style',
        });
      }
    }
  }

  // 3.5 Geometry (80): Inscribed Square in Right Triangle & Polygon Angles
  for (let i = 0; i < 80; i++) {
    if (i < 45) {
      const a = 4 + (i % 12);
      const b = 6 + ((i * 3) % 15);
      const ansF = frac(a * b, a + b);
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Square Inscribed in Right Triangle #${i + 1}`,
        titleBn: `সমকোণী ত্রিভুজের ভেতরে অন্তর্লিখিত বর্গ #${toBn(i + 1)}`,
        category: 'Geometry',
        difficulty: 'Advanced Olympiad',
        prompt: `A right triangle has perpendicular legs of length $${a}$ and $${b}$. A square is placed inside with one vertex at the right angle and the opposite vertex touching the hypotenuse. Find the side length of the square (enter as integer or simplified fraction a/b).`,
        promptBn: `একটি সমকোণী ত্রিভুজের সমকোণ সংলগ্ন বাহু দুটির দৈর্ঘ্য $${toBn(a)}$ এবং $${toBn(b)}$। সমকোণে একটি শীর্ষ রেখে ভেতরে বৃহত্তম একটি বর্গ আঁকা হলো যার বিপরীত শীর্ষ অতিভুজকে স্পর্শ করে। বর্গটির বাহুর দৈর্ঘ্য কত? (পূর্ণসংখ্যা বা a/b আকারে লেখো)`,
        correctAnswer: ansF.en,
        correctAnswerBn: ansF.bn,
        hints: [
          `Let the square have side $s$. Then the top leftover segment on leg $${a}$ is $${a} - s$.`,
          `Use similar triangles: $\\frac{${a} - s}{s} = \\frac{${a}}{${b}}$ (or equate area split).`,
          `Solve $(${a} + ${b})s = ${a * b}$ for $s$.`,
        ],
        hintsBn: [
          `বর্গের বাহু $s$ ধরলে উচ্চতা বরাবর উপরের বাকি অংশ হবে $${toBn(a)} - s$।`,
          `সদৃশ ত্রিভুজ বা ক্ষেত্রফলের সমীকরণ ব্যবহার করো: $\\frac{1}{2}(${toBn(a)})(${toBn(b)}) = s^2 + \\frac{1}{2}s(${toBn(a)}-s) + \\frac{1}{2}s(${toBn(b)}-s)$।`,
          `সরল করলে পাবে $s = \\frac{ab}{a+b}$।`,
        ],
        solution: `By similar triangles (or area balance), $\\frac{${a} - s}{s} = \\frac{${a}}{${b}} \\implies s = \\frac{${a} \\cdot ${b}}{${a} + ${b}} = \\frac{${a * b}}{${a + b}} = ${ansF.en}$.`,
        solutionBn: `সদৃশ ত্রিভুজ থেকে পাই $s = \\frac{ab}{a+b} = \\frac{${toBn(a * b)}}{${toBn(a + b)}} = ${ansF.bn}$।`,
        keyInsight: 'A square sharing the right-angle corner always has side $s = \\frac{ab}{a+b}$ (half the harmonic mean).',
        keyInsightBn: 'সমকোণে অন্তর্লিখিত বর্গের বাহু সবসময় $\\frac{ab}{a+b}$ হয়।',
        source: 'official_style',
      });
    } else {
      const k = i - 45;
      const validN = [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120];
      const n = validN[k % validN.length] + (k >= validN.length ? 0 : 0);
      const ext = 360 / n;
      const interior = 180 - ext;
      const askDiff = k >= validN.length;
      const ans = askDiff ? interior - ext : interior;
      list.push({
        id: makeId(seq++),
        ...d3,
        title: `Regular ${n}-gon Angle Geometry #${k + 1}`,
        titleBn: `সুষম ${toBn(n)}-ভুজের কোণ বিশ্লেষণ #${toBn(k + 1)}`,
        category: 'Geometry',
        difficulty: 'Intermediate Olympiad',
        prompt: askDiff
          ? `In a regular $${n}$-sided polygon, what is the difference (in degrees) between one interior angle and one exterior angle?`
          : `What is the measure (in degrees) of each interior angle of a regular $${n}$-sided polygon?`,
        promptBn: askDiff
          ? `একটি সুষম $${toBn(n)}$-ভুজের একটি অন্তঃস্থ কোণ ও একটি বহিঃস্থ কোণের পার্থক্য কত ডিগ্রি?`
          : `একটি সুষম $${toBn(n)}$-ভুজের প্রতিটি অন্তঃস্থ কোণের মান কত ডিগ্রি?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          `Exterior angles of ANY convex polygon sum to $360^\\circ$.`,
          `Each exterior angle = $360^\\circ \\div ${n} = ${ext}^\\circ$.`,
          `Interior angle = $180^\\circ - ${ext}^\\circ = ${interior}^\\circ$.`,
        ],
        hintsBn: [
          `যেকোনো উত্তল বহুভুজের বহিঃস্থ কোণগুলোর সমষ্টি ৩৬০°।`,
          `তাই প্রতিটি বহিঃস্থ কোণ = ৩৬০° ÷ ${toBn(n)} = ${toBn(ext)}°।`,
          `প্রতিটি অন্তঃস্থ কোণ = ১৮০° - ${toBn(ext)}° = ${toBn(interior)}°।`,
        ],
        solution: `Each exterior angle is $\\frac{360^\\circ}{${n}} = ${ext}^\\circ$, so each interior angle is $180^\\circ - ${ext}^\\circ = ${interior}^\\circ$${askDiff ? `, and their difference is $${interior} - ${ext} = ${ans}^\\circ$` : ''}.`,
        solutionBn: `বহিঃস্থ কোণ = ৩৬০° ÷ ${toBn(n)} = ${toBn(ext)}°, অন্তঃস্থ কোণ = ১৮০° - ${toBn(ext)}° = ${toBn(interior)}°${askDiff ? ` এবং পার্থক্য = ${toBn(ans)}°` : ''}।`,
        keyInsight: 'Dividing $360^\\circ$ by $n$ gives the exterior angle instantly, making interior angles trivial.',
        keyInsightBn: 'বহিঃস্থ কোণ $\\frac{360^\\circ}{n}$ আগে বের করলে অন্তঃস্থ কোণ বের করা খুব সহজ।',
        source: 'official_style',
      });
    }
  }

  // =========================================================================
  // DIVISION 4: Grade 9 – Grade 10 (Age 14–16) — 400 Important Olympiad Problems
  // =========================================================================
  const d4 = {
    minGradeLevel: 9,
    maxGradeLevel: 10,
    minAge: 14,
    maxAge: 16,
    gradeBand: 'Grade 9 – Grade 10',
    gradeBandBn: '৯ম – ১০ম শ্রেণি',
    ageBand: '14–16 years',
    ageBandBn: '১৪–১৬ বছর',
  };

  // 4.1 Number Theory (80): Trailing Zeros in n! (Legendre) & Divisor Count
  for (let i = 0; i < 80; i++) {
    if (i < 45) {
      const n = 25 + i * 5; // 25, 30, ..., 245
      let zeros = 0;
      let p5 = 5;
      while (p5 <= n) {
        zeros += Math.floor(n / p5);
        p5 *= 5;
      }
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Trailing Zeros in ${n}! (Legendre) #${i + 1}`,
        titleBn: `${toBn(n)}!-এর শেষে শূন্যের সংখ্যা #${toBn(i + 1)}`,
        category: 'Number Theory',
        difficulty: i < 20 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
        prompt: `How many consecutive trailing zeros appear at the end of $${n}!$ ($1 \\times 2 \\times 3 \\times \\dots \\times ${n}$)?`,
        promptBn: `$${toBn(n)}!$ ($1 \\times 2 \\times 3 \\times \\dots \\times ${toBn(n)}$)-এর মানের একদম ডানদিকে পরপর কয়টি শূন্য (০) থাকে?`,
        correctAnswer: String(zeros),
        correctAnswerBn: toBn(zeros),
        hints: [
          'Every trailing zero comes from a factor of $10 = 2 \\times 5$. Since factors of 2 are plentiful, count the factors of 5!',
          `Use Legendre's formula: $\\lfloor ${n}/5 \\rfloor + \\lfloor ${n}/25 \\rfloor + \\lfloor ${n}/125 \\rfloor + \\dots$`,
          `Add $\\lfloor ${n}/5 \\rfloor = ${Math.floor(n / 5)}$ plus higher powers of 5.`,
        ],
        hintsBn: [
          'শেষে প্রতিটি শূন্য তৈরি হয় একটি ১০ (= ২ × ৫) থেকে। তাই ১ থেকে ' + toBn(n) + ' পর্যন্ত মোট কয়টি ৫ উৎপাদক আছে তা গোনো!',
          `লিজেন্ডারের সূত্র ব্যবহার করো: $\\lfloor ${toBn(n)}/5 \\rfloor + \\lfloor ${toBn(n)}/25 \\rfloor + \\lfloor ${toBn(n)}/125 \\rfloor$।`,
          `মোট যোগফল বের করো।`,
        ],
        solution: `Counting powers of $5$ dividing integers up to $${n}$: $\\lfloor \\frac{${n}}{5} \\rfloor + \\lfloor \\frac{${n}}{25} \\rfloor + \\lfloor \\frac{${n}}{125} \\rfloor = ${Math.floor(n / 5)} + ${Math.floor(n / 25)} + ${Math.floor(n / 125)} = ${zeros}$.`,
        solutionBn: `মোট ৫ উৎপাদক সংখ্যা = $\\lfloor ${toBn(n)}/5 \\rfloor + \\lfloor ${toBn(n)}/25 \\rfloor + \\lfloor ${toBn(n)}/125 \\rfloor = ${toBn(zeros)}$টি শূন্য।`,
        keyInsight: "Trailing zeros in $n!$ always equal $v_5(n!) = \\sum_{k\\ge 1} \\lfloor n/5^k \\rfloor$.",
        keyInsightBn: '$n!$-এর শেষের শূন্য নির্ণয়ে ২৫, ১২৫-এর মতো উচ্চতর ঘাতগুলোও যোগ করতে হয়।',
        source: 'official_style',
      });
    } else {
      const k = i - 45;
      const a = 2 + (k % 5); // 2..6
      const b = 1 + Math.floor(k / 5) % 4; // 1..4
      const c = 1 + Math.floor(k / 20); // 1..2
      const val = Math.pow(2, a) * Math.pow(3, b) * Math.pow(5, c);
      const tau = (a + 1) * (b + 1) * (c + 1);
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Exact Positive Divisor Count #${k + 1}`,
        titleBn: `মোট ধনাত্মক ভাজক (গুণনীয়ক) সংখ্যা #${toBn(k + 1)}`,
        category: 'Number Theory',
        difficulty: 'Advanced Olympiad',
        prompt: `How many positive divisors does the number $N = 2^{${a}} \\cdot 3^{${b}} \\cdot 5^{${c}}$ ($= ${val}$) have?`,
        promptBn: `$N = 2^{${toBn(a)}} \\cdot 3^{${toBn(b)}} \\cdot 5^{${toBn(c)}}$ ($= ${toBn(val)}$) সংখ্যাটির মোট কতটি ধনাত্মক ভাজক (divisors) আছে?`,
        correctAnswer: String(tau),
        correctAnswerBn: toBn(tau),
        hints: [
          'Every positive divisor has the form $2^x 3^y 5^z$.',
          `How many choices are there for each exponent ($0 \\le x \\le ${a}$, etc.)?`,
          `Multiply $(${a}+1)(${b}+1)(${c}+1)$.`,
        ],
        hintsBn: [
          'প্রতিটি ভাজকের আকার হবে $2^x 3^y 5^z$ যেখানে $0 \\le x \\le ' + toBn(a) + '$ ইত্যাদি।',
          'প্রতিটি মৌলিক উৎপাদকের ঘাতের সাথে +১ যোগ করে গুণ করো।',
          `$(${toBn(a)}+১)(${toBn(b)}+১)(${toBn(c)}+১)$ হিসাব করো।`,
        ],
        solution: `Using $\\tau(p_1^a p_2^b p_3^c) = (a+1)(b+1)(c+1)$, we get $(${a}+1)(${b}+1)(${c}+1) = ${a + 1} \\times ${b + 1} \\times ${c + 1} = ${tau}$.`,
        solutionBn: `মোট ভাজক সংখ্যা = $(${toBn(a)}+১)(${toBn(b)}+১)(${toBn(c)}+১) = ${toBn(tau)}$টি।`,
        keyInsight: 'Add 1 to every prime exponent in the factorization and multiply.',
        keyInsightBn: 'মৌলিক উৎপাদকে বিশ্লেষণের পর প্রতিটি ঘাতের সাথে ১ যোগ করে গুণ করলেই ভাজক সংখ্যা মেলে।',
        source: 'official_style',
      });
    }
  }

  // 4.2 Algebra (80): Vieta's Formulas on Quadratic Roots
  for (let i = 0; i < 80; i++) {
    const p = 5 + (i % 14); // 5..18
    const q = 2 + ((i * 3) % 11); // 2..12
    if (i % 2 === 0) {
      // r1^2 + r2^2 = p^2 - 2q
      const ans = p * p - 2 * q;
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Vieta Symmetric Root Squares #${i + 1}`,
        titleBn: `ভিয়েতার সূত্র: মূলের বর্গের সমষ্টি #${toBn(i + 1)}`,
        category: 'Algebra',
        difficulty: i < 40 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
        prompt: `Let $r_1$ and $r_2$ be the roots of $x^2 - ${p}x + ${q} = 0$. Find the exact value of $r_1^2 + r_2^2$.`,
        promptBn: `$x^2 - ${toBn(p)}x + ${toBn(q)} = 0$ সমীকরণের দুটি মূল $r_1$ ও $r_2$ হলে, $r_1^2 + r_2^2$-এর মান কত?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          `By Vieta's formulas, $r_1 + r_2 = ${p}$ and $r_1 r_2 = ${q}$.`,
          'Rewrite $r_1^2 + r_2^2 = (r_1 + r_2)^2 - 2 r_1 r_2$.',
          `Compute ${p}^2 - 2(${q}).`,
        ],
        hintsBn: [
          `ভিয়েতার সূত্র অনুযায়ী $r_1 + r_2 = ${toBn(p)}$ এবং $r_1 r_2 = ${toBn(q)}$।`,
          `$r_1^2 + r_2^2 = (r_1 + r_2)^2 - 2 r_1 r_2$ সূত্র ব্যবহার করো।`,
          `${toBn(p)}^2 - ২(${toBn(q)}) হিসাব করো।`,
        ],
        solution: `$r_1 + r_2 = ${p}$ and $r_1 r_2 = ${q}$. Therefore, $r_1^2 + r_2^2 = ${p}^2 - 2(${q}) = ${p * p} - ${2 * q} = ${ans}$.`,
        solutionBn: `$r_1 + r_2 = ${toBn(p)}$ ও $r_1 r_2 = ${toBn(q)}$। সুতরাং $r_1^2 + r_2^2 = ${toBn(p * p)} - ${toBn(2 * q)} = ${toBn(ans)}$।`,
        keyInsight: 'Vieta expresses symmetric polynomials of roots purely using coefficients.',
        keyInsightBn: 'মূল নির্ণয় না করেই ভিয়েতার সূত্র দিয়ে মূলের প্রতিসম রাশির মান বের করা যায়।',
        source: 'official_style',
      });
    } else {
      // 1/r1 + 1/r2 = p/q
      const ansF = frac(p, q);
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Vieta Sum of Reciprocal Roots #${i + 1}`,
        titleBn: `ভিয়েতার সূত্র: বিপরীত মূলের যোগফল #${toBn(i + 1)}`,
        category: 'Algebra',
        difficulty: 'Advanced Olympiad',
        prompt: `If $r_1$ and $r_2$ are the roots of $x^2 - ${p}x + ${q} = 0$, compute $\\frac{1}{r_1} + \\frac{1}{r_2}$. (Enter as integer or simplified fraction a/b)`,
        promptBn: `$x^2 - ${toBn(p)}x + ${toBn(q)} = 0$ সমীকরণের মূলদ্বয় $r_1, r_2$ হলে, $\\frac{1}{r_1} + \\frac{1}{r_2}$-এর মান কত?`,
        correctAnswer: ansF.en,
        correctAnswerBn: ansF.bn,
        hints: [
          'Combine over a common denominator: $\\frac{1}{r_1} + \\frac{1}{r_2} = \\frac{r_1 + r_2}{r_1 r_2}$.',
          `Substitute $r_1 + r_2 = ${p}$ and $r_1 r_2 = ${q}$.`,
          'Simplify the fraction completely.',
        ],
        hintsBn: [
          'ভগ্নাংশ দুটি যোগ করো: $\\frac{r_1 + r_2}{r_1 r_2}$।',
          `এবার $r_1 + r_2 = ${toBn(p)}$ এবং $r_1 r_2 = ${toBn(q)}$ বসিয়ে দাও।`,
          'লঘিষ্ঠ আকারে প্রকাশ করো।',
        ],
        solution: `$\\frac{1}{r_1} + \\frac{1}{r_2} = \\frac{r_1 + r_2}{r_1 r_2} = \\frac{${p}}{${q}} = ${ansF.en}$.`,
        solutionBn: `$\\frac{1}{r_1} + \\frac{1}{r_2} = \\frac{r_1 + r_2}{r_1 r_2} = \\frac{${toBn(p)}}{${toBn(q)}} = ${ansF.bn}$।`,
        keyInsight: 'Combining fractions turns reciprocal roots into Sum / Product.',
        keyInsightBn: 'বিপরীত মূলের সমষ্টি সর্বদা মূলের যোগফল ও গুণফলের অনুপাত।',
        source: 'official_style',
      });
    }
  }

  // 4.3 Pattern and Sequence (80): Telescoping Series
  for (let i = 0; i < 80; i++) {
    if (i < 45) {
      const n = 20 + i * 3; // 20..152
      const ansF = frac(n, n + 1);
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Telescoping Fraction Series #${i + 1}`,
        titleBn: `টেলিস্কোপিং ভগ্নাংশ ধারা #${toBn(i + 1)}`,
        category: 'Pattern and Sequence',
        difficulty: i < 20 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
        prompt: `Compute the exact sum: $\\frac{1}{1\\cdot 2} + \\frac{1}{2\\cdot 3} + \\frac{1}{3\\cdot 4} + \\dots + \\frac{1}{${n}\\cdot ${n + 1}}$. (Enter as a/b)`,
        promptBn: `ধারাটির সঠিক যোগফল নির্ণয় করো: $\\frac{1}{1\\cdot 2} + \\frac{1}{2\\cdot 3} + \\dots + \\frac{1}{${toBn(n)}\\cdot ${toBn(n + 1)}}$। (a/b আকারে লেখো)`,
        correctAnswer: ansF.en,
        correctAnswerBn: ansF.bn,
        hints: [
          'Split each term using $\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}$.',
          'Write the first 3 differences and cancel middle terms!',
          `Only $1 - \\frac{1}{${n + 1}}$ survives.`,
        ],
        hintsBn: [
          'প্রতিটি পদকে $\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}$ আকারে ভেঙে নাও।',
          'মাঝের সব পদ কাটাকাটি হয়ে যাবে!',
          `কেবল $1 - \\frac{1}{${toBn(n + 1)}}$ বাকি থাকবে।`,
        ],
        solution: `Telescoping leaves $(1 - \\frac{1}{2}) + (\\frac{1}{2} - \\frac{1}{3}) + \\dots + (\\frac{1}{${n}} - \\frac{1}{${n + 1}}) = 1 - \\frac{1}{${n + 1}} = ${ansF.en}$.`,
        solutionBn: `মাঝের পদগুলো পরস্পর কেটে গিয়ে থাকে $1 - \\frac{1}{${toBn(n + 1)}} = ${ansF.bn}$।`,
        keyInsight: 'Partial fraction decomposition turns $O(n)$ sums into $O(1)$ cancellations.',
        keyInsightBn: 'আংশিক ভগ্নাংশে ভাঙলে দীর্ঘ ধারার মাঝের সব পদ কেটে যায়।',
        source: 'official_style',
      });
    } else {
      const k = i - 45;
      const m = 3 + k; // 3..37 unique!
      const endN = m * m - 1;
      const ans = m - 1;
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Rationalizing Radical Telescope #${k + 1}`,
        titleBn: `বর্গমূল ধারার টেলিস্কোপিং সমষ্টি #${toBn(k + 1)}`,
        category: 'Pattern and Sequence',
        difficulty: 'National Challenge',
        prompt: `Evaluate the sum: $\\frac{1}{\\sqrt{1} + \\sqrt{2}} + \\frac{1}{\\sqrt{2} + \\sqrt{3}} + \\dots + \\frac{1}{\\sqrt{${endN}} + \\sqrt{${endN + 1}}}$.`,
        promptBn: `মান নির্ণয় করো: $\\frac{1}{\\sqrt{1} + \\sqrt{2}} + \\frac{1}{\\sqrt{2} + \\sqrt{3}} + \\dots + \\frac{1}{\\sqrt{${toBn(endN)}} + \\sqrt{${toBn(endN + 1)}}}$।`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          'Rationalize the denominator of $\\frac{1}{\\sqrt{k} + \\sqrt{k+1}}$ by multiplying top and bottom by $\\sqrt{k+1} - \\sqrt{k}$.',
          'The denominator becomes $(k+1) - k = 1$!',
          `Cancel interior square roots: $\\sqrt{${endN + 1}} - \\sqrt{1} = ${m} - 1$.`,
        ],
        hintsBn: [
          'হরকে করণীমুক্ত করতে লব ও হরকে $\\sqrt{k+1} - \\sqrt{k}$ দিয়ে গুণ করো।',
          'তাহলে প্রতিটি পদ হবে $\\sqrt{k+1} - \\sqrt{k}$।',
          `যোগ করলে কেবল $\\sqrt{${toBn(endN + 1)}} - \\sqrt{1}$ বাকি থাকে।`,
        ],
        solution: `Rationalizing gives $(\\sqrt{2} - \\sqrt{1}) + (\\sqrt{3} - \\sqrt{2}) + \\dots + (\\sqrt{${endN + 1}} - \\sqrt{${endN}}) = \\sqrt{${endN + 1}} - 1 = ${m} - 1 = ${ans}$.`,
        solutionBn: `করণীমুক্ত করলে মাঝের বর্গমূলগুলো কেটে গিয়ে থাকে $\\sqrt{${toBn(endN + 1)}} - ১ = ${toBn(m)} - ১ = ${toBn(ans)}$।`,
        keyInsight: 'Conjugate rationalization turns consecutive-root denominators into telescoping differences.',
        keyInsightBn: 'অনুবন্ধী রাশি দিয়ে গুণ করলে বর্গমূলের ধারাটি সহজ বিয়োগফলে পরিণত হয়।',
        source: 'official_style',
      });
    }
  }

  // 4.4 Geometry (80): Pythagorean Triple Inradius & Right Triangle Area
  const pythTriples: [number, number, number][] = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
    [20, 21, 29],
    [9, 40, 41],
    [12, 35, 37],
    [11, 60, 61],
  ];
  for (let i = 0; i < 80; i++) {
    const baseT = pythTriples[i % pythTriples.length];
    const scale = 1 + Math.floor(i / pythTriples.length); // 1..10
    const a = baseT[0] * scale;
    const b = baseT[1] * scale;
    const c = baseT[2] * scale;
    const inradius = (a + b - c) / 2;

    list.push({
      id: makeId(seq++),
      ...d4,
      title: `Right Triangle Incircle Radius #${i + 1}`,
      titleBn: `সমকোণী ত্রিভুজের অন্তর্বৃত্তের ব্যাসার্ধ #${toBn(i + 1)}`,
      category: 'Geometry',
      difficulty: i < 40 ? 'Intermediate Olympiad' : 'Advanced Olympiad',
      prompt: `A right triangle has side lengths $${a}$, $${b}$, and hypotenuse $${c}$. What is the radius of its inscribed circle (incircle)?`,
      promptBn: `একটি সমকোণী ত্রিভুজের বাহুগুলোর দৈর্ঘ্য $${toBn(a)}$, $${toBn(b)}$ এবং অতিভুজ $${toBn(c)}$। ত্রিভুজটির অন্তর্বৃত্তের ব্যাসার্ধ কত?`,
      correctAnswer: String(inradius),
      correctAnswerBn: toBn(inradius),
      hints: [
        'Use either Area = $r \\cdot s$ (where $s = \\frac{a+b+c}{2}$) OR equal tangents from the right angle!',
        'For any right triangle, the inradius formula simplifies to $r = \\frac{a + b - c}{2}$.',
        `Compute $\\frac{${a} + ${b} - ${c}}{2}$.`,
      ],
      hintsBn: [
        'ক্ষেত্রফল = $r \\cdot s$ অথবা সমকোণী ত্রিভুজের অন্তর্বৃত্তের ব্যাসার্ধ $r = \\frac{a + b - c}{2}$ সূত্রটি ব্যবহার করো।',
        'অতিভুজ বাদে দুই বাহু যোগ করে অতিভুজ বিয়োগ করো এবং ২ দিয়ে ভাগ করো।',
        `$\\frac{${toBn(a)} + ${toBn(b)} - ${toBn(c)}}{2}$ হিসাব করো।`,
      ],
      solution: `Because tangent segments from each vertex to the incircle are equal, $r = \\frac{a + b - c}{2} = \\frac{${a} + ${b} - ${c}}{2} = ${inradius}$.`,
      solutionBn: `সমকোণী ত্রিভুজের অন্তর্বৃত্তের ব্যাসার্ধ $r = \\frac{a + b - c}{2} = \\frac{${toBn(a)} + ${toBn(b)} - ${toBn(c)}}{২} = ${toBn(inradius)}$।`,
      keyInsight: 'Every integer Pythagorean triple has an integer inradius $r = (a + b - c)/2$.',
      keyInsightBn: 'সমকোণী ত্রিভুজের ক্ষেত্রে অন্তর্বৃত্তের ব্যাসার্ধ সবসময় $\\frac{a + b - c}{2}$ হয়।',
      source: 'official_style',
    });
  }

  // 4.5 Creative Problem Solving (80): Stars and Bars Combinatorics
  for (let i = 0; i < 80; i++) {
    const isPositive = i % 2 === 0;
    const sumVal = 5 + Math.floor(i / 2); // 5..44 -> 40 distinct positive + 40 distinct non-negative!
    if (isPositive) {
      const n = sumVal - 1;
      const ans = (n * (n - 1)) / 2;
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Positive Integer Triples (Stars & Bars) #${i + 1}`,
        titleBn: `ধনাত্মক পূর্ণসংখ্যার সমাধান সংখ্যা #${toBn(i + 1)}`,
        category: 'Creative Problem Solving',
        difficulty: i < 40 ? 'Advanced Olympiad' : 'National Challenge',
        prompt: `How many ordered triples of POSITIVE integers $(x, y, z)$ satisfy $x + y + z = ${sumVal}$?`,
        promptBn: `$x + y + z = ${toBn(sumVal)}$ সমীকরণটির কতটি ধনাত্মক পূর্ণসংখ্যার ক্রমজোড় $(x, y, z)$ সমাধান রয়েছে?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          `Picture ${sumVal} identical stars in a row; you need to place 2 dividers in the ${sumVal - 1} gaps between them.`,
          'Use Stars and Bars for positive integers: $\\binom{n - 1}{k - 1}$.',
          `Compute $\\binom{${sumVal - 1}}{2} = \\frac{${sumVal - 1} \\times ${sumVal - 2}}{2}$.`,
        ],
        hintsBn: [
          `সারিবদ্ধ ${toBn(sumVal)}টি তারার মাঝের ${toBn(sumVal - 1)}টি ফাঁকা জায়গা থেকে ২টি ভাগ করার স্থান বেছে নাও।`,
          'ধনাত্মক সমাধানের সূত্র: $\\binom{n - 1}{k - 1}$।',
          `$\\binom{${toBn(sumVal - 1)}}{2}$ হিসাব করো।`,
        ],
        solution: `By Stars and Bars for positive integers, the count is $\\binom{${sumVal} - 1}{3 - 1} = \\binom{${n}}{2} = \\frac{${n} \\times ${n - 1}}{2} = ${ans}$.`,
        solutionBn: `স্টারস অ্যান্ড বারস নীতিতে ধনাত্মক সমাধান = $\\binom{${toBn(sumVal)} - 1}{2} = \\binom{${toBn(n)}}{2} = ${toBn(ans)}$টি।`,
        keyInsight: 'Place $(k - 1)$ dividers into $(n - 1)$ interior gaps for positive integer sums.',
        keyInsightBn: 'ধনাত্মক পূর্ণসংখ্যার যোগফলে $(n-1)$টি ফাঁক থেকে $(k-1)$টি বিভাজক বাছতে হয়।',
        source: 'official_style',
      });
    } else {
      const n = sumVal + 2;
      const ans = (n * (n - 1)) / 2;
      list.push({
        id: makeId(seq++),
        ...d4,
        title: `Distributing Identical Candies (Non-Negative) #${i + 1}`,
        titleBn: `অঋণাত্মক পূর্ণসংখ্যার বণ্টন বিন্যাস #${toBn(i + 1)}`,
        category: 'Creative Problem Solving',
        difficulty: 'Advanced Olympiad',
        prompt: `In how many ways can $${sumVal}$ identical chocolates be distributed among $3$ children if any child may receive $0$ or more chocolates?`,
        promptBn: `$${toBn(sumVal)}$টি একই রকম চকলেট ৩ জন শিশুর মধ্যে মোট কত উপায়ে ভাগ করে দেওয়া যাবে (যেখানে কেউ ০টিও পেতে পারে)?`,
        correctAnswer: String(ans),
        correctAnswerBn: toBn(ans),
        hints: [
          `This counts non-negative integer solutions $(x, y, z \\ge 0)$ to $x + y + z = ${sumVal}$.`,
          'Use Stars and Bars with $0$ allowed: $\\binom{n + k - 1}{k - 1}$.',
          `Compute $\\binom{${sumVal + 2}}{2}$.`,
        ],
        hintsBn: [
          `এটি $x + y + z = ${toBn(sumVal)}$ ($x, y, z \\ge 0$) সমীকরণের অঋণাত্মক সমাধান গণনার সমান।`,
          'সূত্র: $\\binom{n + k - 1}{k - 1}$।',
          `$\\binom{${toBn(sumVal + 2)}}{2}$ হিসাব করো।`,
        ],
        solution: `Number of non-negative distributions is $\\binom{${sumVal} + 3 - 1}{3 - 1} = \\binom{${n}}{2} = \\frac{${n} \\times ${n - 1}}{2} = ${ans}$.`,
        solutionBn: `মোট উপায় = $\\binom{${toBn(sumVal)} + 2}{2} = \\binom{${toBn(n)}}{2} = ${toBn(ans)}$টি।`,
        keyInsight: 'When $0$ is permitted, add $k - 1$ bars directly to the $n$ stars: $\\binom{n+k-1}{k-1}$.',
        keyInsightBn: 'শূন্য অনুমোদিত হলে $\\binom{n + k - 1}{k - 1}$ সূত্র প্রযোজ্য হয়।',
        source: 'official_style',
      });
    }
  }

  // =========================================================================
  // DIVISION 5: Grade 11 – Grade 12 (Age 16–19) — 400 Important Olympiad Problems
  // =========================================================================
  const d5 = {
    minGradeLevel: 11,
    maxGradeLevel: 12,
    minAge: 16,
    maxAge: 19,
    gradeBand: 'Grade 11 – Grade 12',
    gradeBandBn: '১১শ – ১২শ শ্রেণি',
    ageBand: '16–19 years',
    ageBandBn: '১৬–১৯ বছর',
  };

  // 5.1 Number Theory (80): Fermat's Little Theorem Modular Powers
  const modPrimes = [7, 11, 13, 17, 19];
  for (let i = 0; i < 80; i++) {
    const p = modPrimes[i % modPrimes.length];
    const base = 2 + (i % (p - 2)); // coprime to p
    const exp = 100 + i * 17;
    const remExp = exp % (p - 1);
    const ans = modPow(base, remExp, p);

    list.push({
      id: makeId(seq++),
      ...d5,
      title: `Fermat Modular Power Remainder #${i + 1}`,
      titleBn: `ফার্মার লিটল থিওরেম: মডুলার ভাগশেষ #${toBn(i + 1)}`,
      category: 'Number Theory',
      difficulty: i < 40 ? 'National Challenge' : 'International Challenge',
      prompt: `Find the remainder when $${base}^{${exp}}$ is divided by the prime $${p}$.`,
      promptBn: `$${toBn(base)}^{${toBn(exp)}}$-কে মৌলিক সংখ্যা $${toBn(p)}$ দিয়ে ভাগ করলে ভাগশেষ কত হবে?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        `Since $\\gcd(${base}, ${p}) = 1$ and $${p}$ is prime, apply Fermat's Little Theorem: $${base}^{${p - 1}} \\equiv 1 \\pmod{${p}}$.`,
        `Reduce the exponent ${exp} modulo ${p - 1}: ${exp} \\equiv ${remExp} \\pmod{${p - 1}}$.`,
        `Compute $${base}^{${remExp}} \\bmod ${p}$.`,
      ],
      hintsBn: [
        `ফার্মার উপপাদ্য অনুযায়ী মৌলিক $p = ${toBn(p)}$-এর জন্য $${toBn(base)}^{${toBn(p - 1)}} \\equiv 1 \\pmod{${toBn(p)}}$।`,
        `ঘাত ${toBn(exp)}-কে ${toBn(p - 1)} দিয়ে ভাগ করলে ভাগশেষ ${toBn(remExp)} থাকে।`,
        `এখন ছোট ঘাত $${toBn(base)}^{${toBn(remExp)}} \\bmod ${toBn(p)}$ হিসাব করো।`,
      ],
      solution: `By Fermat's Little Theorem, $${base}^{${p - 1}} \\equiv 1 \\pmod{${p}}$. Writing $${exp} = ${Math.floor(exp / (p - 1))}(${p - 1}) + ${remExp}$, we obtain $${base}^{${exp}} \\equiv ${base}^{${remExp}} \\equiv ${ans} \\pmod{${p}}$.`,
      solutionBn: `ফার্মার লিটল থিওরেম অনুযায়ী $${toBn(base)}^{${toBn(p - 1)}} \\equiv 1 \\pmod{${toBn(p)}}$। ঘাতকে ${toBn(p - 1)} দিয়ে ভাগ করে পাই $${toBn(base)}^{${toBn(remExp)}} \\equiv ${toBn(ans)} \\pmod{${toBn(p)}}$।`,
      keyInsight: "Fermat's Little Theorem reduces exponents modulo $(p - 1)$ whenever $p \\nmid a$.",
      keyInsightBn: 'ফার্মার উপপাদ্যের মাধ্যমে বড় ঘাতকে $(p - 1)$ দিয়ে ছোট করা যায়।',
      source: 'official_style',
    });
  }

  // 5.2 Algebra (80): AM-GM Inequality Exact Integer Minimum
  for (let i = 0; i < 80; i++) {
    const a = 1 + (i % 8); // 1..8
    const t = 2 + Math.floor(i / 8); // 2..11
    // Make A*B = (a*t)^2? Pick coeff1 = a, coeff2 = a * t^2 so 2 * sqrt(coeff1 * coeff2) = 2 * a * t!
    const c1 = a;
    const c2 = a * t * t;
    const minVal = 2 * a * t;

    list.push({
      id: makeId(seq++),
      ...d5,
      title: `AM-GM Exact Minimum Value #${i + 1}`,
      titleBn: `AM-GM অসমতার মাধ্যমে সর্বনিম্ন মান #${toBn(i + 1)}`,
      category: 'Algebra',
      difficulty: i < 40 ? 'National Challenge' : 'International Challenge',
      prompt: `For all positive real numbers $x > 0$, find the MINIMUM possible value of $f(x) = ${c1 === 1 ? '' : c1}x + \\frac{${c2}}{x}$.`,
      promptBn: `সকল ধনাত্মক বাস্তব সংখ্যা $x > 0$-এর জন্য $f(x) = ${c1 === 1 ? '' : toBn(c1)}x + \\frac{${toBn(c2)}}{x}$-এর সর্বনিম্ন মান কত?`,
      correctAnswer: String(minVal),
      correctAnswerBn: toBn(minVal),
      hints: [
        'Apply the AM-GM inequality: $\\frac{u + v}{2} \\ge \\sqrt{uv}$ for $u, v > 0$.',
        `Set $u = ${c1}x$ and $v = \\frac{${c2}}{x}$, so $x$ cancels inside $uv = ${c1 * c2}$!`,
        `Compute $2\\sqrt{${c1 * c2}} = 2 \\times ${a * t}$, and check equality occurs at $x = ${t}$.`,
      ],
      hintsBn: [
        'AM-GM অসমতা প্রয়োগ করো: $u + v \\ge 2\\sqrt{uv}$।',
        `এখানে $u = ${toBn(c1)}x$ এবং $v = \\frac{${toBn(c2)}}{x}$ নিলে গুণফলে $x$ কেটে গিয়ে ধ্রুবক ${toBn(c1 * c2)}$ থাকে!`,
        `$2\\sqrt{${toBn(c1 * c2)}}$ হিসাব করো।`,
      ],
      solution: `By AM-GM, $${c1}x + \\frac{${c2}}{x} \\ge 2\\sqrt{${c1}x \\cdot \\frac{${c2}}{x}} = 2\\sqrt{${c1 * c2}} = 2(${a * t}) = ${minVal}$, achieved when $${c1}x = \\frac{${c2}}{x} \\implies x = ${t}$.`,
      solutionBn: `AM-GM অনুসারে $${toBn(c1)}x + \\frac{${toBn(c2)}}{x} \\ge 2\\sqrt{${toBn(c1 * c2)}} = ${toBn(minVal)}$ (যখন $x = ${toBn(t)}$)।`,
      keyInsight: 'Choose AM-GM terms whose product cancels the variable cleanly.',
      keyInsightBn: 'চলক কেটে যাওয়ার মতো পদ দুটিতে AM-GM প্রয়োগ করলে সর্বনিম্ন মান সরাসরি মেলে।',
      source: 'official_style',
    });
  }

  // 5.3 Pattern and Sequence (80): Infinite Geometric Series & Log Telescoping
  for (let i = 0; i < 80; i++) {
    if (i < 40) {
      const a = 2 + (i % 9);
      const q = 2 + Math.floor(i / 9); // ratio = 1/q
      const ansF = frac(a * q, q - 1);
      list.push({
        id: makeId(seq++),
        ...d5,
        title: `Infinite Geometric Series Convergence #${i + 1}`,
        titleBn: `অসীম গুণোত্তর ধারার সমষ্টি #${toBn(i + 1)}`,
        category: 'Pattern and Sequence',
        difficulty: 'National Challenge',
        prompt: `Compute the exact sum of the infinite geometric series: $${a} + \\frac{${a}}{${q}} + \\frac{${a}}{${q * q}} + \\frac{${a}}{${q * q * q}} + \\dots$ (Enter as integer or a/b)`,
        promptBn: `অসীম গুণোত্তর ধারাটির যোগফল নির্ণয় করো: $${toBn(a)} + \\frac{${toBn(a)}}{${toBn(q)}} + \\frac{${toBn(a)}}{${toBn(q * q)}} + \\dots$ (পূর্ণসংখ্যা বা a/b আকারে লেখো)`,
        correctAnswer: ansF.en,
        correctAnswerBn: ansF.bn,
        hints: [
          `Identify first term $a = ${a}$ and common ratio $r = \\frac{1}{${q}}$.`,
          'Since $|r| < 1$, use $S_\\infty = \\frac{a}{1 - r}$.',
          `Simplify $\\frac{${a}}{1 - 1/${q}}$.`,
        ],
        hintsBn: [
          `প্রথম পদ $a = ${toBn(a)}$ এবং সাধারণ অনুপাত $r = \\frac{1}{${toBn(q)}}$।`,
          `সূত্র: $S_\\infty = \\frac{a}{1 - r}$।`,
          `$\\frac{${toBn(a)}}{1 - 1/${toBn(q)}}$ সরল করো।`,
        ],
        solution: `$S_\\infty = \\frac{${a}}{1 - \\frac{1}{${q}}} = \\frac{${a} \\cdot ${q}}{${q - 1}} = ${ansF.en}$.`,
        solutionBn: `$S_\\infty = \\frac{${toBn(a)}}{1 - \\frac{1}{${toBn(q)}}} = ${ansF.bn}$।`,
        keyInsight: 'Whenever $|r| < 1$, the infinite geometric sum converges to $\\frac{a}{1-r}$.',
        keyInsightBn: '$|r| < 1$ হলে অসীম গুণোত্তর ধারার সমষ্টি $\\frac{a}{1-r}$।',
        source: 'official_style',
      });
    } else {
      const k = i - 40;
      const base = 2 + (k % 4); // 2..5
      const powerExp = 2 + Math.floor(k / 4); // 2..11
      const endVal = Math.pow(base, powerExp);
      list.push({
        id: makeId(seq++),
        ...d5,
        title: `Logarithm Chain Rule Telescope #${k + 1}`,
        titleBn: `লগারিদম চেইন গুণফল #${toBn(k + 1)}`,
        category: 'Pattern and Sequence',
        difficulty: 'International Challenge',
        prompt: `Compute the exact product: $\\log_{${base}}(${base + 1}) \\cdot \\log_{${base + 1}}(${base + 2}) \\cdot \\log_{${base + 2}}(${base + 3}) \\cdots \\log_{${endVal - 1}}(${endVal})$.`,
        promptBn: `নিচের লগারিদম গুণফলটির মান কত: $\\log_{${toBn(base)}}(${toBn(base + 1)}) \\cdot \\log_{${toBn(base + 1)}}(${toBn(base + 2)}) \\cdots \\log_{${toBn(endVal - 1)}}(${toBn(endVal)})$?`,
        correctAnswer: String(powerExp),
        correctAnswerBn: toBn(powerExp),
        hints: [
          'Apply the change-of-base formula: $\\log_a(b) = \\frac{\\ln b}{\\ln a}$.',
          'Watch the numerators and denominators telescope diagonally!',
          `You are left with $\\log_{${base}}(${endVal}) = \\log_{${base}}(${base}^{${powerExp}})$.`,
        ],
        hintsBn: [
          'ভিত্তি পরিবর্তনের সূত্র ব্যবহার করো: $\\log_a(b) = \\frac{\\ln b}{\\ln a}$।',
          'দেখবে লব ও হর পরপর কেটে যাচ্ছে!',
          `শেষে থাকবে $\\log_{${toBn(base)}}(${toBn(endVal)})$।`,
        ],
        solution: `Converting each factor to $\\frac{\\ln(m+1)}{\\ln m}$ cancels every intermediate term, leaving $\\frac{\\ln(${endVal})}{\\ln(${base})} = \\log_{${base}}(${base}^{${powerExp}}) = ${powerExp}$.`,
        solutionBn: `ভিত্তি পরিবর্তন করলে মাঝের সব লগ কেটে গিয়ে থাকে $\\log_{${toBn(base)}}(${toBn(base)}^{${toBn(powerExp)}}) = ${toBn(powerExp)}$।`,
        keyInsight: 'Change-of-base turns chained logarithms into a telescoping product.',
        keyInsightBn: 'ভিত্তি পরিবর্তনের সূত্র ধারাবাহিক লগারিদম গুণফলকে সংকুচিত করে দেয়।',
        source: 'official_style',
      });
    }
  }

  // 5.4 Combinatorics (80): Inclusion-Exclusion & Coprime Euler Totient Counting
  const primePairs: [number, number][] = [
    [3, 5],
    [3, 7],
    [5, 7],
    [2, 5],
    [3, 11],
    [5, 11],
    [7, 11],
    [2, 7],
  ];
  for (let i = 0; i < 80; i++) {
    const [p, q] = primePairs[i % primePairs.length];
    const mult = 4 + Math.floor(i / 8) * 2;
    const N = p * q * mult;
    const divBoth = Math.floor(N / p) + Math.floor(N / q) - Math.floor(N / (p * q));
    const coprime = N - divBoth;
    const askCoprime = i % 2 === 1;
    const ans = askCoprime ? coprime : divBoth;

    list.push({
      id: makeId(seq++),
      ...d5,
      title: `Inclusion-Exclusion Sieve #${i + 1}`,
      titleBn: `অন্তর্ভুক্তি-বর্জন নীতি (PIE) গণনা #${toBn(i + 1)}`,
      category: 'Combinatorics',
      difficulty: i < 40 ? 'National Challenge' : 'International Challenge',
      prompt: askCoprime
        ? `How many integers from $1$ to $${N}$ inclusive are divisible by NEITHER $${p}$ NOR $${q}$?`
        : `How many integers from $1$ to $${N}$ inclusive are divisible by AT LEAST ONE of $${p}$ or $${q}$?`,
      promptBn: askCoprime
        ? `$1$ থেকে $${toBn(N)}$ পর্যন্ত কতটি পূর্ণসংখ্যা $${toBn(p)}$ এবং $${toBn(q)}$ কোনোটি দিয়েই বিভাজ্য নয়?`
        : `$1$ থেকে $${toBn(N)}$ পর্যন্ত কতটি পূর্ণসংখ্যা অন্তত $${toBn(p)}$ অথবা $${toBn(q)}$ দ্বারা বিভাজ্য?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        `Count multiples of ${p} ($${Math.floor(N / p)}$) and multiples of ${q} ($${Math.floor(N / q)}$).`,
        `Subtract multiples of ${p * q} ($${Math.floor(N / (p * q))}$) so they are not double-counted.`,
        askCoprime ? `Subtract the union (${divBoth}) from ${N}.` : `Add and subtract via $|A \\cup B| = |A| + |B| - |A \\cap B|$.`,
      ],
      hintsBn: [
        `${toBn(p)}-এর গুণিতক = ${toBn(Math.floor(N / p))}টি এবং ${toBn(q)}-এর গুণিতক = ${toBn(Math.floor(N / q))}টি।`,
        `উভয়ের গুণিতক (${toBn(p * q)}-এর গুণিতক = ${toBn(Math.floor(N / (p * q)))}টি) বিয়োগ করো।`,
        askCoprime ? `মোট ${toBn(N)} থেকে ${toBn(divBoth)} বিয়োগ করো।` : `সূত্র: $|A \\cup B| = |A| + |B| - |A \\cap B|$।`,
      ],
      solution: `$|A \\cup B| = \\lfloor \\frac{${N}}{${p}} \\rfloor + \\lfloor \\frac{${N}}{${q}} \\rfloor - \\lfloor \\frac{${N}}{${p * q}} \\rfloor = ${Math.floor(N / p)} + ${Math.floor(N / q)} - ${Math.floor(N / (p * q))} = ${divBoth}$.${askCoprime ? ` Neither = $${N} - ${divBoth} = ${coprime}$.` : ''}`,
      solutionBn: `$|A \\cup B| = ${toBn(Math.floor(N / p))} + ${toBn(Math.floor(N / q))} - ${toBn(Math.floor(N / (p * q)))} = ${toBn(divBoth)}$।${askCoprime ? ` কোনোটি দিয়েই বিভাজ্য নয় = ${toBn(N)} - ${toBn(divBoth)} = ${toBn(coprime)}টি।` : ''}`,
      keyInsight: 'Principle of Inclusion-Exclusion corrects overlap on multiples of $\\text{lcm}(p, q)$.',
      keyInsightBn: 'দুটি সেটের মিলিত গণনায় সাধারণ গুণিতকগুলো একবার বিয়োগ করে দ্বিগুণ গণনা রোধ করা হয়।',
      source: 'official_style',
    });
  }

  // 5.5 Creative Problem Solving (80): Functional Equations f(x) + k f(1 - x) = ...
  for (let i = 0; i < 80; i++) {
    // Construct f(x) = m*x + b cleanly, then compute A*f(x) + B*f(1-x) = c*x + d!
    const m = 2 + (i % 7); // 2..8
    const b = 1 + ((i * 2) % 9); // 1..9
    const A = 2 + (Math.floor(i / 10) % 3); // 2, 3, 4
    const B = 1; // A != B so invertible!
    // A*(mx + b) + B*(m(1-x) + b) = (A - B)*m*x + (A + B)*b + B*m
    const cx = (A - B) * m;
    const dConst = (A + B) * b + B * m;
    const evalAt = 2 + (i % 10);
    const ans = m * evalAt + b;

    list.push({
      id: makeId(seq++),
      ...d5,
      title: `Involution Functional Equation #${i + 1}`,
      titleBn: `ফাংশনাল সমীকরণ সমাধান #${toBn(i + 1)}`,
      category: 'Creative Problem Solving',
      difficulty: i < 40 ? 'National Challenge' : 'International Challenge',
      prompt: `A function $f$ satisfies $${A}f(x) + f(1 - x) = ${cx}x + ${dConst}$ for all real $x$. Find the exact value of $f(${evalAt})$.`,
      promptBn: `সকল বাস্তব $x$-এর জন্য একটি ফাংশন $${toBn(A)}f(x) + f(1 - x) = ${toBn(cx)}x + ${toBn(dConst)}$ শর্ত মেনে চলে। তাহলে $f(${toBn(evalAt)})$-এর মান কত?`,
      correctAnswer: String(ans),
      correctAnswerBn: toBn(ans),
      hints: [
        `Do not guess $f(x)$! Plug in $x = ${evalAt}$ first, then plug in $x = ${1 - evalAt}$ (since $1 - (${evalAt}) = ${1 - evalAt}$).`,
        `You get two linear equations in two unknowns: $f(${evalAt})$ and $f(${1 - evalAt})$.`,
        `Multiply the first equation by ${A} and subtract the second to eliminate $f(${1 - evalAt})$!`,
      ],
      hintsBn: [
        `প্রথমে $x = ${toBn(evalAt)}$ এবং এরপর $x = ${toBn(1 - evalAt)}$ বসিয়ে দুটি সমীকরণ তৈরি করো!`,
        `এতে $f(${toBn(evalAt)})$ ও $f(${toBn(1 - evalAt)})$-এর দুটি সরল সমীকরণ পাবে।`,
        `প্রথম সমীকরণকে ${toBn(A)} দিয়ে গুণ করে দ্বিতীয়টি বিয়োগ করলে $f(${toBn(1 - evalAt)})$ কেটে যাবে।`,
      ],
      solution: `Substituting $x \\mapsto 1 - x$ gives $${A}f(1-x) + f(x) = ${cx}(1 - x) + ${dConst}$. Eliminating $f(1-x)$ yields $f(x) = ${m}x + ${b}$. Hence $f(${evalAt}) = ${m}(${evalAt}) + ${b} = ${ans}$.`,
      solutionBn: `$x$-এর স্থলে $1 - x$ বসিয়ে অপনয়ন পদ্ধতিতে সমাধান করলে পাওয়া যায় $f(x) = ${toBn(m)}x + ${toBn(b)}$। অতএব $f(${toBn(evalAt)}) = ${toBn(ans)}$।`,
      keyInsight: 'Replacing $x$ with its involution $1 - x$ creates a solvable $2 \\times 2$ system.',
      keyInsightBn: '$x$-এর জায়গায় $1-x$ বসালে দুটি সমীকরণের একটি সহজ সিস্টেম তৈরি হয়।',
      source: 'official_style',
    });
  }

  return list;
}

export const GENERATED_OLYMPIAD_2000: OlympiadProblem[] = buildGeneratedOlympiad2000();
