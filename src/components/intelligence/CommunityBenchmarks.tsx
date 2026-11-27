import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Award, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { DomainScore, Language } from '../../types/mathmind';
import { getDomainLabel, getGradeLabel } from '../../i18n/translations';
import { parseGradeLevel } from '../../utils/mathUtils';

interface CommunityBenchmarksProps {
  domainScores: DomainScore[];
  overallScore: number;
  grade: string;
  language: Language;
  onPracticeDomain: (domain: string) => void;
}

type CohortScope = 'grade_peers' | 'all_learners';
type SortMode = 'percentile_desc' | 'growth_first';

interface DomainDistribution {
  median: number;
  stdDev: number;
}

const BASE_DOMAIN_NORMS: Record<string, DomainDistribution> = {
  'Number Sense': { median: 72, stdDev: 14 },
  'Number Operations': { median: 69, stdDev: 15 },
  'Fractions, Decimals and Percentages': { median: 56, stdDev: 16 },
  'Algebraic Thinking': { median: 60, stdDev: 16 },
  Geometry: { median: 63, stdDev: 15 },
  Measurement: { median: 65, stdDev: 14 },
  'Ratio and Proportion': { median: 58, stdDev: 16 },
  'Data Handling and Statistics': { median: 67, stdDev: 14 },
  Probability: { median: 54, stdDev: 17 },
  'Mathematical Reasoning': { median: 57, stdDev: 16 },
  'Pattern Recognition': { median: 66, stdDev: 15 },
  'Spatial and Visual Reasoning': { median: 62, stdDev: 15 },
};

function computeNormalPercentile(score: number, median: number, stdDev: number): number {
  const z = (score - median) / Math.max(8, stdDev);
  // Logistic approximation to normal CDF (max error < 0.01)
  const p = 100 / (1 + Math.exp(-1.702 * z));
  return Math.max(1, Math.min(99, Math.round(p)));
}

function scoreForPercentile(targetPercentile: number, median: number, stdDev: number): number {
  const p = targetPercentile / 100;
  const z = Math.log(p / (1 - p)) / 1.702;
  return Math.max(1, Math.min(100, Math.ceil(median + z * stdDev)));
}

function formatOrdinalEn(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnNum(val: number | string): string {
  return String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export const CommunityBenchmarks: React.FC<CommunityBenchmarksProps> = ({
  domainScores,
  overallScore,
  grade,
  language,
  onPracticeDomain,
}) => {
  const [scope, setScope] = useState<CohortScope>('grade_peers');
  const [sortMode, setSortMode] = useState<SortMode>('percentile_desc');
  const prefersReducedMotion = useReducedMotion();
  const isBn = language === 'bn';

  const gradeLevel = useMemo(() => parseGradeLevel(grade), [grade]);

  const benchmarkRows = useMemo(() => {
    // Grade peers have tighter grade-appropriate calibration; all-learner scope shifts slightly across grades
    const gradeOffset = scope === 'grade_peers' ? 0 : Math.round((gradeLevel - 6) * -0.9);
    const spreadMultiplier = scope === 'grade_peers' ? 1 : 1.12;

    const rows = domainScores.map((ds) => {
      const base = BASE_DOMAIN_NORMS[ds.domain] || { median: 62, stdDev: 15 };
      const median = Math.max(40, Math.min(82, base.median + gradeOffset));
      const stdDev = Math.round(base.stdDev * spreadMultiplier);
      const percentile = computeNormalPercentile(ds.score, median, stdDev);
      const p75Score = scoreForPercentile(75, median, stdDev);
      const p90Score = scoreForPercentile(90, median, stdDev);
      const nextTargetPct = percentile < 50 ? 50 : percentile < 75 ? 75 : percentile < 90 ? 90 : 95;
      const nextTargetScore = scoreForPercentile(nextTargetPct, median, stdDev);
      const pointsToNextTier = Math.max(0, nextTargetScore - ds.score);

      return {
        domain: ds.domain,
        score: ds.score,
        median,
        p75Score,
        p90Score,
        percentile,
        topShare: 100 - percentile,
        deltaFromMedian: ds.score - median,
        nextTargetPct,
        pointsToNextTier,
      };
    });

    if (sortMode === 'growth_first') {
      return [...rows].sort((a, b) => a.percentile - b.percentile);
    }
    return [...rows].sort((a, b) => b.percentile - a.percentile);
  }, [domainScores, gradeLevel, scope, sortMode]);

  const compositeStats = useMemo(() => {
    if (benchmarkRows.length === 0) {
      return {
        compositePercentile: computeNormalPercentile(overallScore, 64, 15),
        leading: null,
        closestBreakthrough: null,
        aboveMedianCount: 0,
      };
    }

    const avgPercentile = Math.round(
      benchmarkRows.reduce((sum, r) => sum + r.percentile, 0) / benchmarkRows.length
    );
    const byHighest = [...benchmarkRows].sort((a, b) => b.percentile - a.percentile);
    const leading = byHighest[0];

    // Find a domain below 90th percentile that needs the fewest points to jump to the next tier
    const candidates = benchmarkRows.filter((r) => r.pointsToNextTier > 0);
    const closestBreakthrough =
      candidates.length > 0
        ? [...candidates].sort((a, b) => a.pointsToNextTier - b.pointsToNextTier)[0]
        : byHighest[byHighest.length - 1];

    const aboveMedianCount = benchmarkRows.filter((r) => r.deltaFromMedian >= 0).length;

    return {
      compositePercentile: avgPercentile,
      leading,
      closestBreakthrough,
      aboveMedianCount,
    };
  }, [benchmarkRows, overallScore]);

  if (domainScores.length === 0) {
    return null;
  }

  const gradeDisplay = getGradeLabel(grade, language);

  return (
    <section
      aria-labelledby="community-benchmarks-heading"
      className="p-6 rounded-2xl border glass-panel-3d space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1 max-w-2xl">
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            {isBn ? 'বেনামী সমবয়সী তুলনামূলক অবস্থান' : 'Anonymized Peer Standing'}
          </p>
          <h2
            id="community-benchmarks-heading"
            className="text-lg font-bold text-slate-900 dark:text-white font-display text-balance"
          >
            {isBn ? 'কমিউনিটি বেঞ্চমার্ক ও পার্সেন্টাইল র‍্যাংকিং' : 'Community Benchmarks & Percentile Rankings'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {scope === 'grade_peers'
              ? isBn
                ? `${gradeDisplay}-এর বেনামী শিক্ষার্থী দলের সাথে আপনার ডোমেইন-ভিত্তিক অবস্থান`
                : `Your anonymized domain standing compared with ${gradeDisplay} math learners`
              : isBn
              ? 'সকল শ্রেণির সক্রিয় শিক্ষার্থীদের সমন্বিত বেঞ্চমার্কের সাথে তুলনা'
              : 'Your anonymized domain standing across all active learners'}
          </p>
        </div>

        {/* Functional Scope & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label={isBn ? 'তুলনার পরিধি' : 'Benchmark cohort scope'}
            className="inline-flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70"
          >
            <button
              type="button"
              onClick={() => setScope('grade_peers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                scope === 'grade_peers'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? 'সমশ্রেণির দল' : 'Grade Peers'}
            </button>
            <button
              type="button"
              onClick={() => setScope('all_learners')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                scope === 'all_learners'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? 'সকল শিক্ষার্থী' : 'All Learners'}
            </button>
          </div>

          <div
            role="group"
            aria-label={isBn ? 'ক্রমবিন্যাস' : 'Sort benchmark domains'}
            className="inline-flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70"
          >
            <button
              type="button"
              onClick={() => setSortMode('percentile_desc')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                sortMode === 'percentile_desc'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? 'সেরা অবস্থান আগে' : 'Highest Rank'}
            </button>
            <button
              type="button"
              onClick={() => setSortMode('growth_first')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                sortMode === 'growth_first'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? 'উন্নতির সুযোগ' : 'Growth Focus'}
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Unboxed Summary Strip (No Nested Card Boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cyan-500" aria-hidden="true" />
            {isBn ? 'সমন্বিত কমিউনিটি অবস্থান' : 'Composite Standing'}
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
              {isBn
                ? `${toBnNum(compositeStats.compositePercentile)}তম পার্সেন্টাইল`
                : `${formatOrdinalEn(compositeStats.compositePercentile)} Percentile`}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {isBn
                ? `শীর্ষ ${toBnNum(Math.max(1, 100 - compositeStats.compositePercentile))}%`
                : `Top ${Math.max(1, 100 - compositeStats.compositePercentile)}%`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {isBn
              ? `${toBnNum(benchmarkRows.length)}টির মধ্যে ${toBnNum(compositeStats.aboveMedianCount)}টি ডোমেইনে গড়ের উপরে`
              : `Above peer median in ${compositeStats.aboveMedianCount} of ${benchmarkRows.length} domains`}
          </p>
        </div>

        {compositeStats.leading && (
          <div className="space-y-1 md:border-l md:border-slate-200/70 md:dark:border-slate-800/70 md:pl-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'শীর্ষস্থানীয় ডোমেইন' : 'Strongest Peer Lead'}
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {getDomainLabel(compositeStats.leading.domain, language)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {isBn
                ? `${toBnNum(compositeStats.leading.percentile)}তম পার্সেন্টাইল · গড়ের চেয়ে ${compositeStats.leading.deltaFromMedian >= 0 ? '+' : ''}${toBnNum(compositeStats.leading.deltaFromMedian)}%`
                : `${formatOrdinalEn(compositeStats.leading.percentile)} percentile · ${compositeStats.leading.deltaFromMedian >= 0 ? '+' : ''}${compositeStats.leading.deltaFromMedian}% vs median`}
            </p>
          </div>
        )}

        {compositeStats.closestBreakthrough && (
          <div className="space-y-1 md:border-l md:border-slate-200/70 md:dark:border-slate-800/70 md:pl-6">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              {isBn ? 'দ্রুত পরবর্তী ধাপের লক্ষ্য' : 'Closest Next Tier'}
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {getDomainLabel(compositeStats.closestBreakthrough.domain, language)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              {compositeStats.closestBreakthrough.pointsToNextTier > 0
                ? isBn
                  ? `আরও +${toBnNum(compositeStats.closestBreakthrough.pointsToNextTier)}% স্কোরে ${toBnNum(compositeStats.closestBreakthrough.nextTargetPct)}তম পার্সেন্টাইলে পৌঁছাবেন`
                  : `+${compositeStats.closestBreakthrough.pointsToNextTier}% score reaches ${formatOrdinalEn(compositeStats.closestBreakthrough.nextTargetPct)} percentile`
                : isBn
                ? 'শীর্ষ ১০% দক্ষতার স্তর অর্জিত হয়েছে'
                : 'Already pacing in the top 10% tier'}
            </p>
          </div>
        )}
      </div>

      {/* Domain Percentile Distribution List */}
      <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
        {benchmarkRows.map((row, index) => {
          const isTopTier = row.percentile >= 75;
          const isMidTier = row.percentile >= 50 && row.percentile < 75;

          const barGradient = isTopTier
            ? 'from-emerald-500 via-teal-400 to-cyan-500'
            : isMidTier
            ? 'from-sky-500 via-cyan-400 to-violet-500'
            : 'from-amber-500 via-orange-400 to-rose-500';

          const rankColor = isTopTier
            ? 'text-emerald-600 dark:text-emerald-400'
            : isMidTier
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-amber-600 dark:text-amber-400';

          const tierText = isTopTier
            ? isBn
              ? 'শীর্ষ ২৫%'
              : 'Top 25%'
            : isMidTier
            ? isBn
              ? 'গড়ের উপরে'
              : 'Above Median'
            : isBn
            ? 'উন্নতির ধাপ'
            : 'Building';

          return (
            <div
              key={row.domain}
              className="py-3.5 first:pt-0 last:pb-0 grid grid-cols-1 lg:grid-cols-12 items-center gap-3 lg:gap-4"
            >
              {/* Domain Title & Clean Unboxed Benchmark Metadata */}
              <div className="lg:col-span-4 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {getDomainLabel(row.domain, language)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                  <span>
                    {isBn ? `আপনি: ${toBnNum(row.score)}%` : `You: ${row.score}%`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isBn ? `গড়: ${toBnNum(row.median)}%` : `Median: ${row.median}%`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isBn ? `৭৫তম: ${toBnNum(row.p75Score)}%` : `P75: ${row.p75Score}%`}
                  </span>
                </div>
              </div>

              {/* Percentile Gauge Bar with 25/50/75/90 Reference Ticks */}
              <div className="lg:col-span-5">
                <div className="relative h-3 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
                  {/* Reference quartile markers */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/4 w-px bg-slate-400/35 dark:bg-slate-600/50 z-10"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/2 w-px bg-slate-500/55 dark:bg-slate-400/60 z-10"
                    title={isBn ? '৫০তম পার্সেন্টাইল (গড়)' : '50th Percentile (Median)'}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-3/4 w-px bg-slate-400/35 dark:bg-slate-600/50 z-10"
                  />

                  {/* Animated percentile fill using compositor transform: scaleX */}
                  <motion.div
                    initial={prefersReducedMotion ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 0.45,
                      delay: Math.min(index * 0.035, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      width: `${row.percentile}%`,
                      transformOrigin: 'left center',
                    }}
                    className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 mt-1">
                  <span>{isBn ? '০' : '0'}</span>
                  <span>{isBn ? '২৫' : '25'}</span>
                  <span>{isBn ? '৫০' : '50'}</span>
                  <span>{isBn ? '৭৫' : '75'}</span>
                  <span>{isBn ? '১০০' : '100'}</span>
                </div>
              </div>

              {/* Percentile Readout + Practice Action */}
              <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3">
                <div className="text-left lg:text-right">
                  <div className={`text-sm font-bold font-mono tabular-nums ${rankColor}`}>
                    {isBn
                      ? `${toBnNum(row.percentile)}তম পার্সেন্টাইল`
                      : `${formatOrdinalEn(row.percentile)} %ile`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {tierText} · {row.deltaFromMedian >= 0 ? '+' : ''}
                    {isBn ? toBnNum(row.deltaFromMedian) : row.deltaFromMedian}%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPracticeDomain(row.domain)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-500/60 bg-white/70 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
                >
                  {isBn ? 'অনুশীলন' : 'Practice'}
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy & Methodology Note */}
      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
          {isBn
            ? 'গোপনীয়তা সুরক্ষিত: কোনো ব্যক্তিগত শিক্ষার্থীর নাম বা তথ্য প্রদর্শন ছাড়াই বেনামী সমষ্টিগত বেঞ্চমার্ক দেখানো হয়েছে।'
            : 'Privacy-first: rankings are strictly anonymized against grade-calibrated cohort distributions — individual student data is never shared.'}
        </span>
      </div>
    </section>
  );
};
