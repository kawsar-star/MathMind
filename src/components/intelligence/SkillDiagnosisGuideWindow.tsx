import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  FlaskConical,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAgeBandLabel,
  getDomainLabel,
  getGradeLabel,
  getTierLabel,
  toBnNum,
} from '../../i18n/translations';
import { DifficultyTier, DomainScore } from '../../types/mathmind';
import { MathRenderer } from '../common/MathRenderer';

interface SkillDiagnosisGuideWindowProps {
  onStartAssessment: () => void;
  onPracticeDomain: (domain: string, tier?: DifficultyTier) => void;
  onOpenLabTool: (toolId: string) => void;
  onOpenLessons: () => void;
  onOpenTutor: () => void;
  onOpenFullAnalytics: () => void;
}

function pickLabToolForDomain(domain: string): string {
  if (domain.includes('Fraction') || domain.includes('Ratio')) return 'fraction-lab';
  if (domain.includes('Algebra') || domain.includes('Pattern')) return 'algebra-balance';
  if (domain.includes('Geometry') || domain.includes('Measurement') || domain.includes('Spatial')) {
    return 'geometry-board';
  }
  if (domain.includes('Coordinate')) return 'coordinate-plane';
  if (domain.includes('Probability') || domain.includes('Data')) return 'probability-sim';
  return 'number-line';
}

function recommendTierForScore(score: number): DifficultyTier {
  if (score < 55) return 'easy';
  if (score < 80) return 'medium';
  return 'hard';
}

export const SkillDiagnosisGuideWindow: React.FC<SkillDiagnosisGuideWindowProps> = ({
  onStartAssessment,
  onPracticeDomain,
  onOpenLabTool,
  onOpenLessons,
  onOpenTutor,
  onOpenFullAnalytics,
}) => {
  const { assessments, remedialPlans, studentProfile, language } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const isBn = language === 'bn';

  const activeAssessment = assessments[0] || null;
  const activePlan = useMemo(() => {
    if (!activeAssessment) return remedialPlans[0] || null;
    return (
      remedialPlans.find((p) => p.assessmentId === activeAssessment.id) ||
      remedialPlans[0] ||
      null
    );
  }, [assessments, activeAssessment, remedialPlans]);

  if (!activeAssessment) {
    const gradeLabel = getGradeLabel(studentProfile?.grade || 'Grade 6', language);
    const age = studentProfile?.age ?? 11;
    return (
      <div className="max-w-4xl mx-auto py-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border glass-panel-3d student-hero-gradient p-8 sm:p-10 text-center space-y-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-500 flex items-center justify-center mx-auto shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              {isBn
                ? `বয়স ${toBnNum(age)} বছর · ${gradeLabel}`
                : `Age ${age} yrs · ${gradeLabel}`}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
              {isBn
                ? 'প্রথমে ১০০টি MCQ-এর দক্ষতা যাচাই টেস্ট দিন'
                : 'Take Your 100-MCQ Placement Test First'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'বিভিন্ন গণিত ডোমেইন থেকে বয়স-ভিত্তিক ১০০টি MCQ সম্পন্ন করলেই আপনি কোথায় শক্তিশালী এবং কোথায় দুর্বলতা আছে তা নির্ণয় হয়ে যাবে এবং আপনার জন্য ব্যক্তিগত অনুশীলন গাইড তৈরি হবে।'
                : 'Complete this age-matched 100-MCQ test across math domains to discover your skill level, pinpoint your weak areas, and unlock personalized practice suggestions.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold glass-btn-3d whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            {isBn ? '১০০টি MCQ টেস্ট শুরু করুন' : 'Start 100-MCQ Entry Test'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  const sortedDomains = [...activeAssessment.domainScores].sort((a, b) => a.score - b.score);
  const weakDomains: DomainScore[] = sortedDomains.filter((d) => d.score < 75);
  const priorityAreas: DomainScore[] =
    weakDomains.length > 0 ? weakDomains : sortedDomains.slice(0, Math.min(2, sortedDomains.length));
  const strongAreas: DomainScore[] = sortedDomains
    .filter((d) => d.score >= 75)
    .sort((a, b) => b.score - a.score);

  const marksOutOf100 = activeAssessment.accuracyPercent;
  const totalQ = Math.max(1, activeAssessment.totalQuestions);
  const correctCount = activeAssessment.responses.filter((r) => r.isCorrect).length;
  const tierLabel = getTierLabel(activeAssessment.competencyCategory, language);
  const gradeLabel = getGradeLabel(studentProfile?.grade || activeAssessment.grade, language);

  return (
    <div className="space-y-6">
      {/* 1. 100-Mark Competency Verdict & Guidance Window Header */}
      <motion.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border glass-panel-3d student-hero-gradient p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              {isBn
                ? '১০০ নম্বরের স্মার্ট MCQ মূল্যায়ন ফলাফল ও ব্যক্তিগত শেখার গাইড'
                : '100-Mark Smart MCQ Result & Personal Study Guide'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
              {isBn
                ? `${activeAssessment.studentName}-এর গণিত দক্ষতা ও অনুশীলন গাইড`
                : `${activeAssessment.studentName}'s Math Skill & Practice Guide`}
            </h1>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {activeAssessment.aiDiagnosis?.executiveSummary ||
                (weakDomains.length > 0
                  ? isBn
                    ? `আপনার ১০০ নম্বরের টেস্টে ${toBnNum(weakDomains.length)}টি অধ্যায়ে উন্নতির সুযোগ পাওয়া গেছে। নিচের প্রস্তাবিত অনুশীলনগুলো ধাপে ধাপে করলে দ্রুত উন্নতি হবে।`
                    : `Your 100-mark test identified ${weakDomains.length} priority areas to strengthen. Follow the tailored practice suggestions below step by step.`
                  : isBn
                  ? 'অভিনন্দন! আপনি সবগুলো অধ্যায়েই চমৎকার দক্ষতা দেখিয়েছেন। নিচের উচ্চতর অনুশীলনগুলো দিয়ে নিজেকে আরও শাণিত করুন।'
                  : 'Great work! You demonstrated strong command across your grade domains. Use the enrichment steps below to push even higher.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenFullAnalytics}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 transition-colors whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
              {isBn ? 'বিস্তারিত চার্ট দেখুন' : 'Full Charts'}
            </button>
            <button
              type="button"
              onClick={onStartAssessment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold glass-btn-3d whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isBn ? 'আবার ১০০ নম্বরের টেস্ট দিন' : 'Retake 100-MCQ Test'}
            </button>
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="p-4 rounded-xl border border-sky-400/35 bg-sky-500/10 glass-tile-3d">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isBn ? 'প্রাপ্ত নম্বর (১০০-তে)' : 'Test Score (out of 100)'}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {isBn ? `${toBnNum(marksOutOf100)} / ১০০` : `${marksOutOf100} / 100`}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {isBn
                ? `${toBnNum(totalQ)}টি MCQ-এর মধ্যে ${toBnNum(correctCount)}টি সঠিক`
                : `${correctCount} of ${totalQ} MCQs correct`}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-violet-400/35 bg-violet-500/10 glass-tile-3d">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isBn ? 'দক্ষতার স্তর' : 'Discovered Skill Level'}
            </p>
            <p className="text-xl font-bold text-violet-700 dark:text-violet-300 mt-1">{tierLabel}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {isBn
                ? `দক্ষতা সূচক: ${toBnNum(activeAssessment.overallScore)}%`
                : `Competency Index: ${activeAssessment.overallScore}%`}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-400/35 bg-amber-500/10 glass-tile-3d">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isBn ? 'দুর্বলতা চিহ্নিত' : 'Priority Focus Areas'}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {isBn ? toBnNum(weakDomains.length) : weakDomains.length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {weakDomains.length > 0
                ? isBn
                  ? 'নিচে অনুশীলনের সাজেশন দেখুন'
                  : 'Action guide ready below'
                : isBn
                ? 'বড় কোনো দুর্বলতা নেই'
                : 'All domains above 75%'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 glass-tile-3d">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isBn ? 'শ্রেণি ও বয়স-স্তর' : 'Grade & Age Alignment'}
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate">
              {gradeLabel}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {getAgeBandLabel(activeAssessment.ageBand, language)}
            </p>
          </div>
        </div>
      </motion.section>

      {/* 2. "Your Weak Areas" Window + Direct Tailored Practice Launchers */}
      <section className="rounded-2xl border glass-panel-3d p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white inline-flex items-center gap-2 font-display">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              {weakDomains.length > 0
                ? isBn
                  ? 'তোমার যে জায়গাগুলোতে দুর্বলতা আছে'
                  : 'Areas Where You Need Extra Practice'
                : isBn
                ? 'আরও নিখুঁত করার ক্ষেত্রসমূহ'
                : 'Areas to Polish Even Further'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'প্রতিটি দুর্বল অধ্যায়ের জন্য নিচের বাটন থেকে সরাসরি সঠিক স্তরের অনুশীলন বা ম্যাথ ল্যাব শুরু করো।'
                : 'Start targeted practice at the right difficulty tier or explore visual models for each priority area.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {priorityAreas.map((dom) => {
            const recTier = recommendTierForScore(dom.score);
            const tierBn = recTier === 'easy' ? 'সহজ' : recTier === 'medium' ? 'মধ্যম' : 'কঠিন';
            const labId = pickLabToolForDomain(dom.domain);
            const matchingFinding = activeAssessment.aiDiagnosis?.errorFindings?.find(
              (f) => f.domain === dom.domain
            );
            const isCritical = dom.score < 55;

            return (
              <div
                key={dom.domain}
                className={`p-5 rounded-2xl border glass-tile-3d flex flex-col justify-between gap-4 ${
                  isCritical
                    ? 'border-rose-500/35 bg-rose-500/5'
                    : 'border-amber-500/35 bg-amber-500/5'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {getDomainLabel(dom.domain, language)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {getTierLabel(dom.competencyCategory, language)} ·{' '}
                        {isBn
                          ? `${toBnNum(dom.questionsAttempted)}টি প্রশ্নে নির্ভুলতা ${toBnNum(dom.accuracyPercent)}%`
                          : `${dom.accuracyPercent}% accuracy across ${dom.questionsAttempted} items`}
                      </p>
                    </div>
                    <span
                      className={`text-xl font-bold font-mono tabular-nums shrink-0 ${
                        isCritical
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isBn ? `${toBnNum(dom.score)}%` : `${dom.score}%`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isCritical ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${dom.score}%` }}
                    />
                  </div>

                  {/* Specific weak subskills */}
                  {dom.weakSubskills.length > 0 && (
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">
                        {isBn ? 'দুর্বল অংশ: ' : 'Specific topics to practice: '}
                      </span>
                      {dom.weakSubskills.join(', ')}
                    </p>
                  )}

                  {/* Diagnostic explanation */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {matchingFinding ? (
                      <MathRenderer content={matchingFinding.explanation} />
                    ) : isBn ? (
                      `এই অধ্যায়ে প্রাথমিক ধারণা ও নিয়মিত ছোট কুইজ অনুশীলনের মাধ্যমে ভুলগুলো ঠিক করা জরুরি। প্রথমে "${tierBn}" স্তরের প্রশ্ন দিয়ে শুরু করো।`
                    ) : (
                      `Focus on core concepts here first. Begin with ${recTier.toUpperCase()} level practice questions to build accuracy before moving up.`
                    )}
                  </div>
                </div>

                {/* Action Prescriptions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => onPracticeDomain(dom.domain, recTier)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold glass-btn-3d whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isBn ? `${tierBn} অনুশীলন শুরু করো` : `Practice (${recTier})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenLabTool(labId)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 transition-colors whitespace-nowrap"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-500" />
                    {isBn ? 'ম্যাথ ল্যাব' : 'Math Lab'}
                  </button>

                  <button
                    type="button"
                    onClick={onOpenTutor}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 transition-colors whitespace-nowrap"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-500" />
                    {isBn ? 'এআই শিক্ষক' : 'Ask Tutor'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Tailored Practice Suggestions Roadmap + Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step-by-Step Personalized Practice Suggestions */}
        <section className="lg:col-span-7 rounded-2xl border glass-panel-3d p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2 font-display">
                <Compass className="w-4 h-4 text-cyan-500" />
                {isBn
                  ? 'তোমার জন্য তৈরি অনুশীলন সাজেশন'
                  : 'Personalized Practice Suggestions For You'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBn
                  ? 'ধাপে ধাপে নিচের কাজগুলো করলে তোমার গণিত দক্ষতা দ্রুত বাড়বে।'
                  : 'Follow these tailored steps to turn weak areas into strengths.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLessons}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {isBn ? 'সব পাঠ দেখো' : 'All Lessons'}
            </button>
          </div>

          <div className="space-y-3">
            {activePlan && activePlan.objectives.length > 0 ? (
              activePlan.objectives.slice(0, 4).map((obj, idx) => (
                <div
                  key={obj.id || idx}
                  className="p-4 rounded-xl glass-tile-3d border flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                      <span className="font-mono tabular-nums">
                        {isBn ? `ধাপ ${toBnNum(idx + 1)}` : `Step ${idx + 1}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{getDomainLabel(obj.domain, language)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {isBn ? `${toBnNum(obj.estimatedMinutes || 15)} মিনিট` : `${obj.estimatedMinutes || 15} min`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {obj.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {obj.explanation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPracticeDomain(obj.domain, 'easy')}
                    className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold glass-btn-violet transition-colors whitespace-nowrap shrink-0"
                  >
                    {isBn ? 'অনুশীলন করো' : 'Practice Now'}
                  </button>
                </div>
              ))
            ) : (
              priorityAreas.map((dom, idx) => (
                <div
                  key={dom.domain}
                  className="p-4 rounded-xl glass-tile-3d border flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                      {isBn ? `ধাপ ${toBnNum(idx + 1)}` : `Step ${idx + 1}`} ·{' '}
                      {getDomainLabel(dom.domain, language)}
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isBn
                        ? `${getDomainLabel(dom.domain, language)} — মৌলিক ধারণা ও ১০টি অনুশীলন`
                        : `${getDomainLabel(dom.domain, language)} — Core Concepts & 10 Practice Items`}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {dom.weakSubskills.length > 0
                        ? isBn
                          ? `বিশেষ ফোকাস: ${dom.weakSubskills.join(', ')}`
                          : `Focus on: ${dom.weakSubskills.join(', ')}`
                        : isBn
                        ? 'সহজ থেকে মধ্যম মানের অনুশীলন দিয়ে দক্ষতা বাড়ান।'
                        : 'Build confidence with Easy-to-Medium guided practice.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onPracticeDomain(dom.domain, recommendTierForScore(dom.score))
                    }
                    className="px-3.5 py-2 rounded-xl text-white text-xs font-semibold glass-btn-violet transition-colors whitespace-nowrap shrink-0"
                  >
                    {isBn ? 'অনুশীলন করো' : 'Practice Now'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Strong Domains Celebration */}
        <section className="lg:col-span-5 rounded-2xl border glass-panel-3d p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2 font-display">
              <Trophy className="w-4 h-4 text-emerald-500" />
              {isBn ? 'তোমার সবল দিকসমূহ' : 'Your Mathematical Strengths'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'এই অধ্যায়গুলোতে তুমি চমৎকার করেছ — কঠিন বা অলিম্পিয়াড প্রশ্নে চেষ্টা করো!'
                : 'You performed strongly here — challenge yourself with Hard problems!'}
            </p>
          </div>

          {strongAreas.length === 0 ? (
            <div className="p-4 rounded-xl glass-tile-3d border text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'দুর্বল অধ্যায়গুলোতে কয়েকটি সহজ কুইজ অনুশীলন করলেই দ্রুতই এখানে তোমার সবল অধ্যায়গুলো যুক্ত হবে।'
                : 'Complete a few guided practice sets in your focus areas and your strong domains will appear here soon!'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {strongAreas.map((dom) => (
                <div
                  key={dom.domain}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {getDomainLabel(dom.domain, language)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {dom.strongSubskills.slice(0, 2).join(', ') ||
                          getTierLabel(dom.competencyCategory, language)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {isBn ? `${toBnNum(dom.score)}%` : `${dom.score}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPracticeDomain(dom.domain, 'hard')}
                      className="px-2.5 py-1 rounded-lg border border-emerald-500/35 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors whitespace-nowrap"
                    >
                      {isBn ? 'চ্যালেঞ্জ' : 'Challenge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
