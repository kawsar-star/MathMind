import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Download,
  Info,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import {
  getAgeBandLabel,
  getAssessmentModeLabel,
  getConfidenceLabel,
  getDomainLabel,
  getErrorCategoryLabel,
  getGradeLabel,
  getInterventionLevelLabel,
  getTierLabel,
  t,
  toBnNum,
} from '../../i18n/translations';
import { exportAssessmentPdf } from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { CommunityBenchmarks } from './CommunityBenchmarks';

const CHART_PALETTE = [
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
  '#f43f5e',
  '#0ea5e9',
];

interface IntelligenceDashboardProps {
  onStartAssessment: () => void;
  onOpenRemedial: () => void;
  onPracticeDomain: (domain: string) => void;
  onOpenWeaknessGuide?: () => void;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({
  onStartAssessment,
  onOpenRemedial,
  onPracticeDomain,
  onOpenWeaknessGuide,
}) => {
  const { assessments, remedialPlans, studentProfile, language } = useAuth();
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedDomainDrill, setSelectedDomainDrill] = useState<string | null>(null);

  const activeAssessment = useMemo(() => {
    if (assessments.length === 0) return null;
    if (selectedId) {
      const found = assessments.find((a) => a.id === selectedId);
      if (found) return found;
    }
    return assessments[0];
  }, [assessments, selectedId]);

  const activePlan = useMemo(() => {
    if (!activeAssessment) return remedialPlans[0] || null;
    return remedialPlans.find((p) => p.assessmentId === activeAssessment.id) || remedialPlans[0] || null;
  }, [remedialPlans, activeAssessment]);

  if (!activeAssessment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-2xl border glass-panel-3d p-10 text-center">
          <Brain className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-display">
            {language === 'bn'
              ? 'এখনো কোনো গণিত বিশ্লেষণ তথ্য নেই'
              : 'No Mathematical Intelligence Data Yet'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-6">
            {language === 'bn'
              ? '১২টি ডোমেইনের রাডার প্রোফাইল, প্রমাণভিত্তিক ভুল বিশ্লেষণ এবং ব্যক্তিগত শেখার পথ পেতে প্রথম অ্যাডাপ্টিভ মূল্যায়ন সম্পন্ন করুন।'
              : 'Complete your first Computer Adaptive Assessment to unlock your 12-domain radar profile, evidence-based error diagnosis, and personalized remedial path.'}
          </p>
          <button
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
          >
            {t(language, 'startAssessment')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isBn = language === 'bn';

  const radarData = activeAssessment.domainScores.map((d) => ({
    domain: isBn
      ? getDomainLabel(d.domain, language)
          .replace('ভগ্নাংশ, দশমিক ও শতকরা', 'ভগ্নাংশ ও %')
          .replace('উপাত্ত ও পরিসংখ্যান', 'পরিসংখ্যান')
          .replace('স্থানিক ও দৃশ্যমান যুক্তি', 'স্থানিক যুক্তি')
          .replace('অনুপাত ও সমানুপাত', 'অনুপাত')
      : d.domain
          .replace('Fractions, Decimals and Percentages', 'Fractions & %')
          .replace('Data Handling and Statistics', 'Statistics')
          .replace('Spatial and Visual Reasoning', 'Spatial')
          .replace('Mathematical Reasoning', 'Reasoning'),
    fullDomain: d.domain,
    score: d.score,
    accuracy: d.accuracyPercent,
  }));

  const speedAccuracyData = activeAssessment.responses.map((r, idx) => ({
    item: isBn ? `প্র${toBnNum(idx + 1)}` : `Q${idx + 1}`,
    timeSec: r.timeSpentSec,
    difficulty: r.difficulty,
    correct: r.isCorrect ? 100 : 0,
    domain: getDomainLabel(r.domain, language),
  }));

  const historyData = [...assessments]
    .reverse()
    .map((a, idx) => ({
      attempt: isBn ? `#${toBnNum(idx + 1)}` : `#${idx + 1}`,
      score: a.overallScore,
      accuracy: a.accuracyPercent,
    }));

  const drillDomainObj = selectedDomainDrill
    ? activeAssessment.domainScores.find((d) => d.domain === selectedDomainDrill)
    : null;

  const remedialCompletion = activePlan?.overallProgress ?? 0;
  const predictedNextScore = Math.min(
    99,
    Math.round(activeAssessment.overallScore + (100 - activeAssessment.overallScore) * (0.25 + remedialCompletion / 200))
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {isBn
              ? 'এআই গাণিতিক দক্ষতা ও সাইকোমেট্রিক প্রোফাইল'
              : 'AI Mathematical Intelligence & Psychometric Profile'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {activeAssessment.studentName} · {isBn ? 'দক্ষতা বিশ্লেষণ' : 'Competency Intelligence'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            {t(language, 'observedPerformanceNote')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {assessments.length > 1 && (
            <select
              value={activeAssessment.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
            >
              {assessments.map((a, idx) => (
                <option key={a.id} value={a.id}>
                  {isBn
                    ? `প্রচেষ্টা #${toBnNum(assessments.length - idx)} · ${toBnNum(a.overallScore)}% (${getAssessmentModeLabel(a.mode, 'bn')})`
                    : `Attempt #${assessments.length - idx} · ${a.overallScore}% (${getAssessmentModeLabel(a.mode, 'en')})`}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => exportAssessmentPdf(activeAssessment, activePlan)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500/60 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            {t(language, 'exportPdf')}
          </button>
          {onOpenWeaknessGuide && (
            <button
              onClick={onOpenWeaknessGuide}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/12 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Target className="w-3.5 h-3.5" />
              {isBn ? 'দুর্বলতা ও গাইড উইন্ডো' : 'Weakness & Practice Guide'}
            </button>
          )}
          <button
            onClick={onOpenRemedial}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-semibold glass-btn-violet transition-colors whitespace-nowrap"
          >
            {isBn ? 'শেখার পথ দেখুন' : 'Open Remedial Path'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-sky-400/35 bg-gradient-to-br from-sky-500/12 via-cyan-500/5 to-transparent glass-panel-3d">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
            {isBn ? 'সামগ্রিক দক্ষতা' : 'Overall Competency'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
              {isBn ? `${toBnNum(activeAssessment.overallScore)}%` : `${activeAssessment.overallScore}%`}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {getTierLabel(activeAssessment.competencyCategory, language)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {getGradeLabel(studentProfile?.grade || activeAssessment.grade, language)} ·{' '}
            {getAgeBandLabel(activeAssessment.ageBand, language)}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-violet-400/35 bg-gradient-to-br from-violet-500/12 via-fuchsia-500/5 to-transparent glass-panel-3d">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
            {isBn ? 'নির্ভুলতা ও গতি' : 'Accuracy & Fluency'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              {isBn ? `${toBnNum(activeAssessment.accuracyPercent)}%` : `${activeAssessment.accuracyPercent}%`}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {isBn
                ? `${toBnNum(activeAssessment.averageTimeSec || 0)}সে. / প্রশ্ন`
                : `${activeAssessment.averageTimeSec || 0}s / item`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {isBn
              ? `${toBnNum(activeAssessment.totalQuestions)}টি অ্যাডাপ্টিভ প্রশ্ন মূল্যায়িত`
              : `${activeAssessment.totalQuestions} adaptive questions evaluated`}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 via-orange-500/5 to-transparent glass-panel-3d">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
            {isBn ? 'শেখার পথ অগ্রগতি' : 'Remedial Completion'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {isBn ? `${toBnNum(remedialCompletion)}%` : `${remedialCompletion}%`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{isBn ? 'অগ্রগতি' : 'path progress'}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {activePlan?.interventionLevel
              ? getInterventionLevelLabel(activePlan.interventionLevel, language)
              : isBn
              ? 'ব্যক্তিগত পরিকল্পনা প্রস্তুত'
              : 'Personalized plan ready'}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/12 via-teal-500/5 to-transparent glass-panel-3d">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
            {isBn ? 'পরবর্তী সম্ভাব্য স্কোর' : 'Projected Next Score'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {isBn ? `${toBnNum(predictedNextScore)}%` : `${predictedNextScore}%`}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {isBn
              ? 'বর্তমান লক্ষ্যগুলো সম্পন্ন করলে আনুমানিক স্কোর'
              : 'Estimated after completing current objectives'}
          </p>
        </div>
      </div>

      {/* Main Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Domain Radar Chart */}
        <div className="lg:col-span-6 p-6 rounded-2xl border glass-panel-3d">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isBn ? 'ডোমেইন দক্ষতা রাডার' : 'Domain Competency Radar'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'প্রতিটি ডোমেইনের কাঠিন্য-সমন্বিত স্কোর'
                  : 'Difficulty-adjusted score across assessed domains'}
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" strokeOpacity={0.35} />
                <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar
                  name={isBn ? 'দক্ষতা %' : 'Competency %'}
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#06b6d4"
                  fillOpacity={0.32}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clickable Strength vs Weakness Bar Chart */}
        <div className="lg:col-span-6 p-6 rounded-2xl border glass-panel-3d">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isBn ? 'সবলতা ও দুর্বলতা বিশ্লেষণ' : 'Strength vs Weakness Drill-Down'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'বিস্তারিত দুর্বলতা দেখতে যেকোনো ডোমেইন বারে ক্লিক করুন'
                  : 'Click any domain bar to inspect subskill gaps'}
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={radarData}
                onClick={(state: any) => {
                  if (state?.activePayload?.[0]?.payload?.fullDomain) {
                    setSelectedDomainDrill(state.activePayload[0].payload.fullDomain);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
                <XAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar
                  dataKey="score"
                  name={isBn ? 'স্কোর %' : 'Score %'}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                >
                  {radarData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Domain Drill-Down Drawer */}
      {drillDomainObj && (
        <div className="p-5 rounded-xl border border-cyan-500/40 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-cyan-500 mb-1">
              {isBn ? 'ডোমেইন বিস্তারিত' : 'Domain Drill-Down'} · {getDomainLabel(drillDomainObj.domain, language)}
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              {isBn ? 'স্কোর' : 'Score'}:{' '}
              <strong className="font-mono">
                {isBn ? `${toBnNum(drillDomainObj.score)}%` : `${drillDomainObj.score}%`}
              </strong>{' '}
              ({getTierLabel(drillDomainObj.competencyCategory, language)}) ·{' '}
              {isBn ? 'সবল অংশ' : 'Strong subskills'}:{' '}
              {drillDomainObj.strongSubskills.join(', ') || (isBn ? 'এখনো নেই' : 'None yet')} ·{' '}
              {isBn ? 'অগ্রাধিকার ঘাটতি' : 'Priority gaps'}:{' '}
              {drillDomainObj.weakSubskills.join(', ') || (isBn ? 'কোনো ভুল ধরা পড়েনি' : 'No errors observed')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPracticeDomain(drillDomainObj.domain)}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              {isBn ? `${getDomainLabel(drillDomainObj.domain, language)} অনুশীলন` : `Practice ${drillDomainObj.domain}`}
            </button>
            <button
              onClick={() => setSelectedDomainDrill(null)}
              className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Skill Mastery Heatmap + Speed vs Accuracy + History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Skill Mastery Heatmap */}
        <div className="lg:col-span-5 p-6 rounded-2xl border glass-panel-3d">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {isBn ? 'ডোমেইন দক্ষতা হিটম্যাপ' : 'Domain Mastery Heatmap'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {isBn ? 'বিস্তারিত দেখতে যেকোনো টাইল ক্লিক করুন' : 'Click a tile to launch targeted practice'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeAssessment.domainScores.map((d) => {
              const tone =
                d.score >= 85
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : d.score >= 65
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                  : d.score >= 45
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300';
              return (
                <button
                  key={d.domain}
                  onClick={() => setSelectedDomainDrill(d.domain)}
                  className={`p-3 rounded-xl border text-left transition-transform hover:-translate-y-0.5 ${tone}`}
                >
                  <div className="text-[11px] font-medium truncate">{getDomainLabel(d.domain, language)}</div>
                  <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                    {isBn ? `${toBnNum(d.score)}%` : `${d.score}%`}
                  </div>
                  <div className="text-[10px] opacity-80">{getTierLabel(d.competencyCategory, language)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Response Time vs Accuracy Scatter */}
        <div className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {isBn ? 'উত্তর দেওয়ার সময় ও মান' : 'Response Time vs Difficulty'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {isBn ? 'প্রতি প্রশ্নে ব্যয়িত সময় (সেকেন্ডে)' : 'Fluency observation (seconds per item)'}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
                <XAxis
                  type="number"
                  dataKey="timeSec"
                  name={isBn ? 'সময় (সেকেন্ড)' : 'Time (s)'}
                  unit={isBn ? 'সে.' : 's'}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <YAxis type="number" dataKey="difficulty" name={isBn ? 'স্তর' : 'Level'} domain={[1, 5]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <ZAxis type="number" dataKey="correct" range={[50, 140]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Scatter name={isBn ? 'উত্তর' : 'Responses'} data={speedAccuracyData} fill="#ec4899" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assessment Progress Timeline */}
        <div className="lg:col-span-3 p-6 rounded-2xl border glass-panel-3d">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {isBn ? 'অগ্রগতির ধারা' : 'Progress Timeline'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {isBn ? 'বিভিন্ন মূল্যায়নের তুলনামূলক অগ্রগতি' : 'Historical trend across attempts'}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
                <XAxis dataKey="attempt" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name={isBn ? 'স্কোর %' : 'Score %'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#06b6d4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anonymized Community Benchmarks & Percentile Rankings */}
      <CommunityBenchmarks
        domainScores={activeAssessment.domainScores}
        overallScore={activeAssessment.overallScore}
        grade={studentProfile?.grade || activeAssessment.grade}
        language={language}
        onPracticeDomain={onPracticeDomain}
      />

      {/* AI Evidence-Based Error Diagnosis Panel */}
      {activeAssessment.aiDiagnosis && (
        <div className="p-6 rounded-2xl border glass-panel-3d space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                {isBn ? 'এআই গাণিতিক ভুল নির্ণায়ক' : 'AI Mathematical Error Diagnostician'}
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isBn ? 'প্রমাণভিত্তিক শেখার ঘাটতি বিশ্লেষণ' : 'Evidence-Based Learning Gap Analysis'}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {isBn
                ? `প্রস্তাবিত সময়: ${toBnNum(activeAssessment.aiDiagnosis.suggestedDurationWeeks || 2)} সপ্তাহ`
                : `Suggested plan: ${activeAssessment.aiDiagnosis.suggestedDurationWeeks || 2} weeks`}
            </span>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {activeAssessment.aiDiagnosis.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                {isBn ? 'গতি বনাম নির্ভুলতা ও ধারাবাহিকতা' : 'Speed vs Accuracy & Consistency'}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {activeAssessment.aiDiagnosis.speedAccuracyObservation} {activeAssessment.aiDiagnosis.consistencyAssessment}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                {isBn ? 'পূর্বশর্ত ঘাটতি ও পরবর্তী যাচাই' : 'Missing Prerequisites & Next Check'}
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {activeAssessment.aiDiagnosis.missingPrerequisites?.join(' · ') ||
                  (isBn ? 'বড় কোনো পূর্বশর্ত ঘাটতি পাওয়া যায়নি।' : 'No major prerequisite gaps detected.')}{' '}
                — {activeAssessment.aiDiagnosis.nextAssessmentRecommendation}
              </p>
            </div>
          </div>

          {activeAssessment.aiDiagnosis.errorFindings?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'চিহ্নিত ভুলের ধরন (উত্তরের প্রমাণসহ)' : 'Diagnosed Error Patterns (With Response Evidence)'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAssessment.aiDiagnosis.errorFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-rose-400/25 bg-rose-500/5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                      <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getErrorCategoryLabel(finding.category, language)}
                      </span>
                      <span className="font-mono text-slate-500">
                        {getConfidenceLabel(finding.confidence, language)} {isBn ? 'নিশ্চয়তা' : 'confidence'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-1.5">
                      {getDomainLabel(finding.domain, language)} · {finding.subskill}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                      <MathRenderer content={finding.explanation} />
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {isBn ? 'প্রমাণ' : 'Evidence'}: {finding.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeAssessment.aiDiagnosis.recommendedObjectives?.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-500" />
                {isBn ? 'পরবর্তী প্রস্তাবিত শিখন লক্ষ্য' : 'Recommended Next Learning Objectives'}
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {activeAssessment.aiDiagnosis.recommendedObjectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-cyan-500">{isBn ? `${toBnNum(idx + 1)}.` : `${idx + 1}.`}</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
