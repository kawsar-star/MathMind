import jsPDF from 'jspdf';
import {
  AssessmentRecord,
  CompetencyCategory,
  DifficultyTier,
  DomainScore,
  Language,
  MathQuestion,
  QuestionResponseRecord,
  RemedialPlan,
  StudyMedium,
  WorksheetDoc,
} from '../types/mathmind';

/**
 * Safe deterministic client-side numeric expression evaluator.
 */
export function evaluateClientMath(raw: string): number | null {
  try {
    const cleaned = raw.trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    if (!cleaned || cleaned.length > 150) return null;

    const mixedMatch = cleaned.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      if (den === 0) return null;
      return whole >= 0 ? whole + num / den : whole - num / den;
    }

    // Tokenize
    const tokens: { type: 'num' | 'op' | 'lp' | 'rp'; val: string }[] = [];
    let i = 0;
    while (i < cleaned.length) {
      const c = cleaned[i];
      if (/\s/.test(c)) {
        i++;
        continue;
      }
      if (/[0-9.]/.test(c)) {
        let num = '';
        while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) num += cleaned[i++];
        if (cleaned[i] === '%') {
          i++;
          tokens.push({ type: 'num', val: String(parseFloat(num) / 100) });
        } else {
          tokens.push({ type: 'num', val: num });
        }
        continue;
      }
      if ('+-*/^'.includes(c)) {
        tokens.push({ type: 'op', val: c });
        i++;
        continue;
      }
      if (c === '(') {
        tokens.push({ type: 'lp', val: c });
        i++;
        continue;
      }
      if (c === ')') {
        tokens.push({ type: 'rp', val: c });
        i++;
        continue;
      }
      return null;
    }

    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parseExpr = (): number => {
      let left = parseTerm();
      while (peek()?.type === 'op' && (peek().val === '+' || peek().val === '-')) {
        const op = consume().val;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };

    const parseTerm = (): number => {
      let left = parsePow();
      while (peek()?.type === 'op' && (peek().val === '*' || peek().val === '/')) {
        const op = consume().val;
        const right = parsePow();
        if (op === '/' && Math.abs(right) < 1e-12) throw new Error('div0');
        left = op === '*' ? left * right : left / right;
      }
      return left;
    };

    const parsePow = (): number => {
      let base = parseUnary();
      if (peek()?.type === 'op' && peek().val === '^') {
        consume();
        base = Math.pow(base, parsePow());
      }
      return base;
    };

    const parseUnary = (): number => {
      if (peek()?.type === 'op' && (peek().val === '+' || peek().val === '-')) {
        const op = consume().val;
        const v = parseUnary();
        return op === '-' ? -v : v;
      }
      return parsePrimary();
    };

    const parsePrimary = (): number => {
      const tok = peek();
      if (!tok) throw new Error('eof');
      if (tok.type === 'num') {
        consume();
        return parseFloat(tok.val);
      }
      if (tok.type === 'lp') {
        consume();
        const v = parseExpr();
        if (peek()?.type !== 'rp') throw new Error('rp');
        consume();
        return v;
      }
      throw new Error('tok');
    };

    const val = parseExpr();
    if (pos !== tokens.length || !Number.isFinite(val)) return null;
    return val;
  } catch {
    return null;
  }
}

const BN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function normalizeBengaliDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_DIGITS[d] || d);
}

export function checkAnswerDeterministic(
  submitted: string,
  expected: string,
  expectedBn?: string
): boolean {
  const norm = (s: string) =>
    normalizeBengaliDigits(s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/^[a-z]=/, '');

  const a = norm(submitted);
  const b = norm(expected);
  const bBn = expectedBn ? norm(expectedBn) : '';
  if (!a || (!b && !bBn)) return false;
  if (a === b || (bBn && a === bBn)) return true;

  // Multi-select comma-separated normalization
  if (expected.includes(',') && submitted.includes(',')) {
    const setA = a.split(',').sort().join(',');
    const setB = b.split(',').sort().join(',');
    if (setA === setB) return true;
  }

  const cleanSub = normalizeBengaliDigits(submitted).replace(/^[a-zA-Z]\s*=\s*/, '');
  const cleanExp = normalizeBengaliDigits(expected).replace(/^[a-zA-Z]\s*=\s*/, '');
  const numA = evaluateClientMath(cleanSub);
  const numB = evaluateClientMath(cleanExp);
  if (numA !== null && numB !== null) {
    return Math.abs(numA - numB) <= 1e-4;
  }
  return false;
}

export function calculateAgeFromDob(dob: string): number {
  if (!dob) return 11;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 11;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(3, Math.min(99, age));
}

export function mapAgeToBand(age: number): string {
  if (age <= 5) return '4–5 years';
  if (age <= 6) return '5–6 years';
  if (age <= 8) return '7–8 years';
  if (age <= 10) return '9–10 years';
  if (age <= 12) return '11–12 years';
  if (age <= 14) return '13–14 years';
  if (age <= 16) return '15–16 years';
  return '17+ years';
}

export function parseGradeLevel(grade?: string | null): number {
  if (!grade) return 6;
  const normalized = grade.trim().toLowerCase();
  if (
    normalized.includes('pre-primary') ||
    normalized.includes('preprimary') ||
    normalized.includes('pre primary') ||
    normalized.includes('nursery') ||
    normalized.includes('kg') ||
    normalized.includes('প্রি-প্রাইমারি')
  ) {
    return 0;
  }
  const match = normalizeBengaliDigits(normalized).match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return Math.max(0, Math.min(12, val));
  }
  return 6;
}

export function difficultyTierToNumeric(tier: DifficultyTier): 1 | 3 | 4 {
  if (tier === 'easy') return 1;
  if (tier === 'medium') return 3;
  return 4;
}

export function getQuestionDifficultyTier(q: MathQuestion): DifficultyTier {
  if (q.difficultyTier) return q.difficultyTier;
  if (q.difficulty <= 1) return 'easy';
  if (q.difficulty <= 3) return 'medium';
  return 'hard';
}

export function isQuestionAppropriateForGrade(
  q: MathQuestion,
  studentGradeLevel: number
): boolean {
  const qMin = q.minGradeLevel ?? parseGradeLevel(q.grade);
  const qMax = q.maxGradeLevel ?? (qMin <= 1 ? qMin + 1 : 12);
  return studentGradeLevel >= qMin && studentGradeLevel <= qMax;
}

export function filterQuestionsForStudent(params: {
  pool: MathQuestion[];
  studentGradeLevel: number;
  domain?: string;
  difficultyTier?: DifficultyTier;
  includeAllDomains?: boolean;
}): MathQuestion[] {
  const {
    pool,
    studentGradeLevel,
    domain,
    difficultyTier,
    includeAllDomains = false,
  } = params;

  const approved = pool.filter((q) => q.validationStatus === 'approved');
  const domainMatched =
    includeAllDomains || !domain
      ? approved
      : approved.filter((q) => q.domain === domain);

  // Strict grade filter first
  let gradeMatched = domainMatched.filter((q) =>
    isQuestionAppropriateForGrade(q, studentGradeLevel)
  );

  // If no items in strict domain + grade, look across all domains within grade (never jump to Grade 6+ for Pre-Primary/Grade 1!)
  if (gradeMatched.length === 0) {
    gradeMatched = approved.filter((q) =>
      isQuestionAppropriateForGrade(q, studentGradeLevel)
    );
  }

  // Only widen by +/- 1 grade if still empty (never expose Grade 5+ concepts to Grade 0-1)
  if (gradeMatched.length === 0) {
    const maxSafe = studentGradeLevel <= 1 ? studentGradeLevel + 1 : studentGradeLevel + 2;
    const minSafe = Math.max(0, studentGradeLevel - 2);
    gradeMatched = approved.filter((q) => {
      const qLevel = q.minGradeLevel ?? parseGradeLevel(q.grade);
      return qLevel >= minSafe && qLevel <= maxSafe;
    });
  }

  if (difficultyTier) {
    const tierMatches = gradeMatched.filter(
      (q) => getQuestionDifficultyTier(q) === difficultyTier
    );
    if (tierMatches.length > 0) {
      return tierMatches;
    }
  }

  return gradeMatched.length > 0 ? gradeMatched : approved;
}

export function getLocalizedQuestion(
  q: MathQuestion,
  language: Language,
  studyMedium?: StudyMedium
): {
  prompt: string;
  options?: string[];
  explanation: string;
  correctAnswer: string;
} {
  const useBangla = studyMedium === 'bangla_medium' || language === 'bn';
  return {
    prompt: useBangla && q.promptBn ? q.promptBn : q.prompt,
    options: useBangla && q.optionsBn?.length ? q.optionsBn : q.options,
    explanation: useBangla && q.explanationBn ? q.explanationBn : q.explanation,
    correctAnswer:
      useBangla && q.correctAnswerBn ? q.correctAnswerBn : q.correctAnswer,
  };
}

export function classifyCompetencyTier(score: number): CompetencyCategory {
  if (score < 40) return 'Beginner';
  if (score < 60) return 'Developing';
  if (score < 78) return 'Proficient';
  if (score < 90) return 'Advanced';
  return 'Expert';
}

export interface AdaptiveSelectorOptions {
  mcqOnly?: boolean;
  askedSubskills?: Set<string>;
  missedSubskills?: Set<string>;
  domainAccuracy?: Record<string, { right: number; total: number }>;
}

function hasMcqOptions(q: MathQuestion): boolean {
  return (Array.isArray(q.options) && q.options.length >= 2) ||
    (Array.isArray(q.optionsBn) && q.optionsBn.length >= 2);
}

/**
 * Computer Adaptive Testing (CAT) question selector:
 * - Filters out already-asked questions
 * - Optionally enforces strict MCQ format (for 100-MCQ assessment)
 * - Respects student's grade/age appropriateness
 * - Targets current adaptive difficulty (1-5)
 * - Balances coverage across requested domains & probes untested/weak subskills dynamically
 */
export function selectNextAdaptiveQuestion(
  pool: MathQuestion[],
  askedIds: Set<string>,
  targetDifficulty: number,
  targetDomains: string[],
  domainCounts: Record<string, number>,
  studentGradeLevel?: number,
  options?: AdaptiveSelectorOptions
): MathQuestion | null {
  const mcqOnly = Boolean(options?.mcqOnly);

  const baseAvailable = pool.filter(
    (q) =>
      !askedIds.has(q.id) &&
      q.validationStatus === 'approved' &&
      (!mcqOnly || hasMcqOptions(q)) &&
      (targetDomains.length === 0 || targetDomains.includes(q.domain))
  );

  let available = baseAvailable;
  if (typeof studentGradeLevel === 'number') {
    const gradeScoped = baseAvailable.filter((q) =>
      isQuestionAppropriateForGrade(q, studentGradeLevel)
    );
    if (gradeScoped.length > 0) {
      available = gradeScoped;
    } else {
      // Fall back within grade-safe pool even across target domains before crossing into higher grades
      const maxSafe = studentGradeLevel <= 1 ? studentGradeLevel + 1 : 12;
      const safeScoped = pool.filter(
        (q) =>
          !askedIds.has(q.id) &&
          q.validationStatus === 'approved' &&
          (!mcqOnly || hasMcqOptions(q)) &&
          (q.minGradeLevel ?? parseGradeLevel(q.grade)) <= maxSafe
      );
      if (safeScoped.length > 0) available = safeScoped;
    }
  }

  if (available.length === 0) return null;

  // 1. Balance coverage across domains (prefer domains with fewest questions asked so far)
  const minDomainCount = Math.min(...available.map((q) => domainCounts[q.domain] || 0));
  const underrepresented = available.filter((q) => (domainCounts[q.domain] || 0) === minDomainCount);

  // 2. If multiple domains tie for fewest asked, prioritize domains showing lower accuracy to probe deeper
  let domainPool = underrepresented;
  if (options?.domainAccuracy) {
    const accFor = (dom: string) => {
      const stats = options.domainAccuracy?.[dom];
      if (!stats || stats.total === 0) return 0.5;
      return stats.right / stats.total;
    };
    const lowestAcc = Math.min(...underrepresented.map((q) => accFor(q.domain)));
    const focusCandidates = underrepresented.filter((q) => accFor(q.domain) <= lowestAcc + 0.15);
    if (focusCandidates.length > 0) domainPool = focusCandidates;
  }

  // 3. Score candidates: difficulty closeness + subskill novelty / missed-subskill follow-up
  const askedSubskills = options?.askedSubskills;
  const missedSubskills = options?.missedSubskills;
  const scored = domainPool.map((q) => {
    const diffGap = Math.abs(q.difficulty - targetDifficulty);
    const subKey = `${q.domain}::${q.subskill}`;
    const isMissedProbe = missedSubskills?.has(subKey) ? -0.6 : 0;
    const isNewSubskill = askedSubskills && !askedSubskills.has(subKey) ? -0.4 : 0;
    return { q, rank: diffGap + isMissedProbe + isNewSubskill };
  });

  scored.sort((a, b) => a.rank - b.rank);
  const bestRank = scored[0].rank;
  const topCandidates = scored.filter((item) => item.rank <= bestRank + 0.35).slice(0, 6);
  const picked = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  return picked?.q || available[0];
}

/**
 * Deterministic difficulty-weighted scoring engine.
 * Never judges mathematical ability by speed alone; response time is tracked separately as fluency telemetry.
 */
export function computeAssessmentMetrics(responses: QuestionResponseRecord[]): {
  overallScore: number;
  accuracyPercent: number;
  averageTimeSec: number;
  competencyCategory: CompetencyCategory;
  domainScores: DomainScore[];
} {
  if (responses.length === 0) {
    return {
      overallScore: 0,
      accuracyPercent: 0,
      averageTimeSec: 0,
      competencyCategory: 'Beginner',
      domainScores: [],
    };
  }

  let totalWeightedEarned = 0;
  let totalWeightedPossible = 0;
  let correctCount = 0;
  let totalTime = 0;

  const byDomain = new Map<string, QuestionResponseRecord[]>();

  for (const r of responses) {
    const weight = 0.7 + r.difficulty * 0.25; // Level 1: 0.95 -> Level 5: 1.95
    totalWeightedPossible += weight;
    if (r.isCorrect) {
      totalWeightedEarned += weight;
      correctCount++;
    }
    totalTime += r.timeSpentSec;
    const arr = byDomain.get(r.domain) || [];
    arr.push(r);
    byDomain.set(r.domain, arr);
  }

  const overallScore = Math.round((totalWeightedEarned / totalWeightedPossible) * 100);
  const accuracyPercent = Math.round((correctCount / responses.length) * 100);
  const averageTimeSec = Math.round(totalTime / responses.length);

  const domainScores: DomainScore[] = Array.from(byDomain.entries()).map(([domain, items]) => {
    let wEarned = 0;
    let wPoss = 0;
    let dCorrect = 0;
    let dDiff = 0;
    let dTime = 0;
    const weakSet = new Set<string>();
    const strongSet = new Set<string>();

    for (const item of items) {
      const w = 0.7 + item.difficulty * 0.25;
      wPoss += w;
      dDiff += item.difficulty;
      dTime += item.timeSpentSec;
      if (item.isCorrect) {
        wEarned += w;
        dCorrect++;
        strongSet.add(item.subskill);
      } else {
        weakSet.add(item.subskill);
      }
    }
    // Remove subskill from strong if student also missed it
    weakSet.forEach((s) => strongSet.delete(s));

    const score = Math.round((wEarned / wPoss) * 100);
    return {
      domain,
      score,
      accuracyPercent: Math.round((dCorrect / items.length) * 100),
      questionsAttempted: items.length,
      averageDifficulty: Number((dDiff / items.length).toFixed(1)),
      averageTimeSec: Math.round(dTime / items.length),
      competencyCategory: classifyCompetencyTier(score),
      weakSubskills: Array.from(weakSet),
      strongSubskills: Array.from(strongSet),
    };
  });

  return {
    overallScore,
    accuracyPercent,
    averageTimeSec,
    competencyCategory: classifyCompetencyTier(overallScore),
    domainScores,
  };
}

export function exportAssessmentPdf(assessment: AssessmentRecord, remedialPlan?: RemedialPlan | null) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(18);
  doc.text('MATHMIND AI — Mathematical Competency Report', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Student: ${assessment.studentName} | Grade: ${assessment.grade} (${assessment.ageBand})`, 14, y);
  y += 5;
  doc.text(`Curriculum: ${assessment.curriculum} | Mode: ${assessment.mode}`, 14, y);
  y += 5;
  doc.text(
    'Note: Observed assessment scores reflect curriculum performance and are not standardized IQ norms.',
    14,
    y
  );
  y += 10;

  doc.setTextColor(20);
  doc.setFontSize(13);
  doc.text(
    `Overall Competency: ${assessment.overallScore}% (${assessment.competencyCategory}) — Accuracy: ${assessment.accuracyPercent}%`,
    14,
    y
  );
  y += 9;

  doc.setFontSize(11);
  doc.text('Domain-Wise Breakdown:', 14, y);
  y += 6;
  doc.setFontSize(9.5);
  for (const ds of assessment.domainScores) {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    doc.text(
      `• ${ds.domain}: ${ds.score}% (${ds.competencyCategory}) | Accuracy ${ds.accuracyPercent}% | Avg Difficulty L${ds.averageDifficulty}`,
      16,
      y
    );
    y += 5.5;
  }

  if (assessment.aiDiagnosis) {
    y += 5;
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(11);
    doc.text('AI Diagnostic Summary:', 14, y);
    y += 6;
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(assessment.aiDiagnosis.executiveSummary || '', 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.8 + 4;

    if (assessment.aiDiagnosis.errorFindings?.length) {
      doc.setFontSize(10.5);
      doc.text('Evidence-Based Error Findings:', 14, y);
      y += 5.5;
      doc.setFontSize(9);
      for (const f of assessment.aiDiagnosis.errorFindings.slice(0, 6)) {
        if (y > 268) {
          doc.addPage();
          y = 18;
        }
        const txt = doc.splitTextToSize(
          `[${f.confidence.toUpperCase()} CONFIDENCE] ${f.category} (${f.domain} · ${f.subskill}): ${f.explanation}`,
          176
        );
        doc.text(txt, 16, y);
        y += txt.length * 4.5 + 2;
      }
    }
  }

  if (remedialPlan?.objectives?.length) {
    y += 4;
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(11);
    doc.text(`Remedial Plan (${remedialPlan.interventionLevel}):`, 14, y);
    y += 6;
    doc.setFontSize(9);
    for (const obj of remedialPlan.objectives) {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
      const txt = doc.splitTextToSize(
        `${obj.order}. [${obj.status.toUpperCase()}] ${obj.title} (${obj.domain}) — Target ${obj.targetMasteryPercent}%`,
        176
      );
      doc.text(txt, 16, y);
      y += txt.length * 4.5 + 2;
    }
  }

  doc.save(`mathmind_report_${assessment.studentName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function exportWorksheetPdf(worksheet: WorksheetDoc) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(16);
  doc.text(worksheet.title, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(
    `Domain: ${worksheet.domain} | Grade: ${worksheet.grade} | Difficulty: Level ${worksheet.difficulty} | Type: ${worksheet.worksheetType}`,
    14,
    y
  );
  y += 10;

  doc.setFontSize(10.5);
  worksheet.questions.forEach((q, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 18;
    }
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.prompt}`, 180);
    doc.text(qLines, 14, y);
    y += qLines.length * 5 + 2;
    if (q.options?.length) {
      q.options.forEach((opt, oIdx) => {
        const label = String.fromCharCode(65 + oIdx);
        doc.text(`   ${label}) ${opt}`, 16, y);
        y += 5;
      });
    } else {
      doc.text('   Answer: ______________________________', 16, y);
      y += 7;
    }
    y += 3;
  });

  // Answer Key on separate page
  doc.addPage();
  y = 18;
  doc.setFontSize(15);
  doc.text('Answer Key & Step-by-Step Solutions', 14, y);
  y += 9;
  doc.setFontSize(9.5);
  worksheet.questions.forEach((q, idx) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.text(`${idx + 1}. Correct Answer: ${q.correctAnswer}`, 14, y);
    y += 5;
    const expLines = doc.splitTextToSize(`   Explanation: ${q.explanation}`, 178);
    doc.text(expLines, 14, y);
    y += expLines.length * 4.5 + 4;
  });

  doc.save(`${worksheet.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function exportCsvRows(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (v: string | number) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
