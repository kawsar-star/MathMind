import React, { useEffect, useState } from 'react';
import {
  BookPlus,
  Brain,
  Download,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_CURRICULA,
  MATH_DOMAINS,
  SAMPLE_CLASSROOM_COHORT,
} from '../../data/domainsAndCurriculum';
import {
  getCurriculumLabel,
  getDomainLabel,
  getGradeLabel,
  getTierLabel,
  getValidationStatusLabel,
  toBnNum,
} from '../../i18n/translations';
import { requestTeacherInsights } from '../../services/aiService';
import {
  createClassRoom,
  deleteClassRoom,
  saveQuestionToBank,
  writeAuditLog,
} from '../../services/firestoreService';
import {
  exportCsvRows,
  getLocalizedQuestion,
} from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

interface TeacherPortalProps {
  initialSection?: string;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ initialSection = 'overview' }) => {
  const { firebaseUser, userAccount, classes, allQuestions, language, studyMedium } = useAuth();
  const { showToast } = useToast();

  const [section, setSection] = useState(initialSection);
  const [bankLang, setBankLang] = useState<'en' | 'bn'>(
    studyMedium === 'bangla_medium' || language === 'bn' ? 'bn' : 'en'
  );
  const [bankGradeFilter, setBankGradeFilter] = useState<string>('All');
  const [bankPage, setBankPage] = useState<number>(1);
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState('Grade 6');
  const [classCurr, setClassCurr] = useState(DEFAULT_CURRICULA[0]);
  const [creatingClass, setCreatingClass] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setBankLang(studyMedium === 'bangla_medium' || language === 'bn' ? 'bn' : 'en');
  }, [language, studyMedium]);

  // AI Teaching Assistant state
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [teacherInsights, setTeacherInsights] = useState<{
    headlineInsight: string;
    sampleSizeNote: string;
    conceptsToReteach: string[];
    recommendedActivities: string[];
    groupingStrategy: string;
    enrichmentAdvice: string;
  } | null>(null);

  // Author new question state
  const [qDomain, setQDomain] = useState(MATH_DOMAINS[2].id);
  const [qSubskill, setQSubskill] = useState('Equivalent fractions');
  const [qGrade, setQGrade] = useState('Grade 6');
  const [qDifficulty, setQDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [qPrompt, setQPrompt] = useState('');
  const [qPromptBn, setQPromptBn] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [savingQ, setSavingQ] = useState(false);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !className.trim()) return;
    setCreatingClass(true);
    try {
      const id = await createClassRoom(
        firebaseUser.uid,
        userAccount?.displayName || (language === 'bn' ? 'শিক্ষক' : 'Educator'),
        {
          name: className.trim().slice(0, 120),
          grade: classGrade,
          curriculum: classCurr,
        }
      );
      await writeAuditLog(firebaseUser.uid, 'CREATE_CLASS', 'class', `Created class ${className}`, id);
      setClassName('');
      showToast(
        language === 'bn'
          ? 'নতুন শ্রেণি তৈরি ও ফায়ারস্টোরে সংরক্ষিত হয়েছে।'
          : 'Classroom created and persisted in Firestore.',
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'শ্রেণি তৈরি করা যায়নি (শিক্ষক/অ্যাডমিন অনুমতি প্রয়োজন)।'
          : 'Unable to create class (requires Teacher/Admin role).';
      showToast(msg, 'error');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await requestTeacherInsights({
        cohortName: SAMPLE_CLASSROOM_COHORT.className,
        studentCount: SAMPLE_CLASSROOM_COHORT.students.length,
        isSampleData: true,
        metrics: {
          domainAverages: SAMPLE_CLASSROOM_COHORT.domainAverages,
          studentsNeedingIntervention: SAMPLE_CLASSROOM_COHORT.students.filter((s) => s.overallScore < 65),
        },
        language,
      });
      setTeacherInsights(res);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'শ্রেণি বিশ্লেষণ তৈরি করা যায়নি।'
          : 'Failed to generate insights.';
      showToast(msg, 'error');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !qPrompt.trim() || !qAnswer.trim()) return;
    setSavingQ(true);
    try {
      await saveQuestionToBank(firebaseUser.uid, {
        domain: qDomain,
        subskill: qSubskill,
        ageBand: '11–12 years',
        grade: qGrade,
        curriculum: DEFAULT_CURRICULA[0],
        learningObjective: `${qDomain}: ${qSubskill}`,
        difficulty: qDifficulty,
        type: 'numerical',
        prompt: qPrompt.trim(),
        ...(qPromptBn.trim() ? { promptBn: qPromptBn.trim() } : {}),
        correctAnswer: qAnswer.trim(),
        explanation: qExplanation.trim() || 'Step-by-step verified teacher solution.',
        source: 'teacher_authored',
        validationStatus: 'pending_review',
      });
      setQPrompt('');
      setQPromptBn('');
      setQAnswer('');
      setQExplanation('');
      showToast(
        language === 'bn'
          ? 'প্রশ্নটি প্রশ্নভাণ্ডারে জমা দেওয়া হয়েছে (পর্যালোচনার জন্য)।'
          : 'Question submitted to Question Bank (Pending Review).',
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'প্রশ্ন সংরক্ষণ করা যায়নি।'
          : 'Could not save question.';
      showToast(msg, 'error');
    } finally {
      setSavingQ(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    // Expected CSV: domain,subskill,grade,difficulty,prompt,correctAnswer,explanation
    let imported = 0;
    for (const line of lines.slice(1, 15)) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 6 && cols[4] && cols[5]) {
        try {
          await saveQuestionToBank(firebaseUser.uid, {
            domain: cols[0] || 'Number Operations',
            subskill: cols[1] || 'Core Skills',
            ageBand: '11–12 years',
            grade: cols[2] || 'Grade 6',
            curriculum: DEFAULT_CURRICULA[0],
            learningObjective: cols[1] || 'Imported objective',
            difficulty: Math.min(5, Math.max(1, Number(cols[3]) || 2)) as any,
            type: 'numerical',
            prompt: cols[4],
            correctAnswer: cols[5],
            explanation: cols[6] || 'Imported solution.',
            source: 'teacher_authored',
            validationStatus: 'pending_review',
          });
          imported++;
        } catch {
          // continue
        }
      }
    }
    showToast(
      language === 'bn'
        ? `${toBnNum(imported, 'bn')}টি প্রশ্ন পর্যালোচনা তালিকায় যুক্ত হয়েছে।`
        : `Imported ${imported} question(s) into Pending Review queue.`,
      imported > 0 ? 'success' : 'info'
    );
  };

  const isBn = language === 'bn';
  const localizeInterventionStatus = (status: string) => {
    if (!isBn) return status;
    const lower = status.toLowerCase();
    if (lower.includes('intensive')) return 'নিবিড় সহায়তা প্রয়োজন';
    if (lower.includes('developing')) return 'বিকাশমান — লক্ষ্যভিত্তিক অনুশীলন';
    if (lower.includes('enrichment') || lower.includes('olympiad')) return 'সমৃদ্ধি — অলিম্পিয়াড ধারা';
    if (lower.includes('track')) return 'সঠিক ধারায় এগোচ্ছে';
    return status;
  };
  const localizedCohortChartData = SAMPLE_CLASSROOM_COHORT.domainAverages.map((d) => ({
    ...d,
    domainLabel: getDomainLabel(d.domain, language),
  }));

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {isBn ? 'শিক্ষক কমান্ড সেন্টার ও বিশ্লেষণ' : 'Teacher Command Center & Intervention Analytics'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {isBn ? 'শ্রেণিকক্ষ, সহায়তা ও প্রশ্নভাণ্ডার' : 'Classrooms, Interventions & Question Bank'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/75 dark:bg-slate-900/75 border border-cyan-500/25">
          {[
            { id: 'overview', label: isBn ? 'বিশ্লেষণ ও এআই সহায়ক' : 'Analytics & AI Assistant' },
            { id: 'classes', label: isBn ? 'আমার শ্রেণি' : 'My Classes' },
            { id: 'question_bank', label: isBn ? 'প্রশ্নভাণ্ডার' : 'Question Bank' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                section === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'overview' && (
        <div className="space-y-6">
          {/* Explicit Sample Data Banner */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-amber-600 dark:text-amber-300 font-medium">
              {isBn
                ? `নমুনা শ্রেণিকক্ষ তথ্য (${SAMPLE_CLASSROOM_COHORT.className}) — প্রকৃত শিক্ষার্থীর রেকর্ডের সাথে মিশ্রিত নয়।`
                : `Sample Classroom Reference Cohort (${SAMPLE_CLASSROOM_COHORT.className}) — strictly separated from live Firestore student records.`}
            </span>
            <button
              onClick={() =>
                exportCsvRows(
                  'sample_class_report.csv',
                  ['Student', 'Grade', 'Score %', 'Competency', 'Priority Domain', 'Intervention'],
                  SAMPLE_CLASSROOM_COHORT.students.map((s) => [
                    s.name,
                    s.grade,
                    s.overallScore,
                    s.competency,
                    s.weakDomain,
                    s.interventionStatus,
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 font-semibold hover:bg-amber-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              {isBn ? 'শ্রেণি CSV এক্সপোর্ট' : 'Export Class CSV'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-2xl border glass-panel-3d">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                {isBn ? 'ডোমেইন-ভিত্তিক শ্রেণি ফলাফল (নমুনা)' : 'Domain-Wise Class Performance (Sample Cohort)'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {isBn ? 'গড় দক্ষতা % বনাম মানদণ্ডের নিচে থাকা শিক্ষার্থী %' : 'Average mastery % vs % of students below benchmark'}
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedCohortChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
                    <XAxis dataKey="domainLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} />
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
                    <Bar dataKey="avgScore" name={isBn ? 'শ্রেণির গড় %' : 'Class Avg %'} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="belowBenchmarkPct" name={isBn ? 'মানদণ্ডের নিচে %' : 'Below Benchmark %'} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl border glass-panel-3d space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-500" />
                  {isBn ? 'এআই শিক্ষক সহায়ক' : 'AI Teaching Assistant'}
                </h3>
                <button
                  onClick={handleGenerateInsights}
                  disabled={insightsLoading}
                  className="px-3.5 py-1.5 rounded-xl glass-btn-violet text-white text-xs font-semibold disabled:opacity-50"
                >
                  {insightsLoading
                    ? isBn
                      ? 'বিশ্লেষণ চলছে...'
                      : 'Analyzing...'
                    : isBn
                    ? 'শ্রেণি বিশ্লেষণ করুন'
                    : 'Analyze Cohort'}
                </button>
              </div>

              {!teacherInsights ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isBn
                    ? 'শিক্ষার্থীদের দলবদ্ধ সহায়তা, পুনরায় শেখানোর অগ্রাধিকার এবং পরামর্শ পেতে "শ্রেণি বিশ্লেষণ করুন" বোতামে ক্লিক করুন।'
                    : 'Click Analyze Cohort to generate evidence-grounded re-teaching recommendations, student groupings, and small-sample warnings. Teachers can always review and override AI suggestions.'}
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{teacherInsights.headlineInsight}</p>
                  <p className="text-amber-500">{teacherInsights.sampleSizeNote}</p>
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      {isBn ? 'পুনরায় শেখানোর বিষয়:' : 'Reteach Priorities:'}
                    </strong>
                    <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      {teacherInsights.conceptsToReteach.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    <strong>{isBn ? 'দল গঠন কৌশল:' : 'Grouping:'}</strong> {teacherInsights.groupingStrategy}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sample Student Roster Table */}
          <div className="rounded-2xl border glass-panel-3d overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {isBn ? 'শিক্ষার্থী সহায়তা তালিকা (নমুনা)' : 'Student Intervention Matrix (Sample Cohort)'}
              </h3>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {isBn ? 'মোট' : 'n'} = {toBnNum(SAMPLE_CLASSROOM_COHORT.students.length, language)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'শিক্ষার্থী' : 'Student'}</th>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'সামগ্রিক স্কোর' : 'Overall Score'}</th>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'দক্ষতার স্তর' : 'Competency'}</th>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'অগ্রাধিকার ডোমেইন' : 'Priority Gap Domain'}</th>
                    <th className="py-3 px-4 font-semibold">{isBn ? 'সহায়তা অবস্থা' : 'Intervention Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {SAMPLE_CLASSROOM_COHORT.students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{st.name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-cyan-500 font-semibold">
                        {toBnNum(st.overallScore, language)}%
                      </td>
                      <td className="py-3 px-4">{getTierLabel(st.competency, language)}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{getDomainLabel(st.weakDomain, language)}</td>
                      <td className="py-3 px-4">{localizeInterventionStatus(st.interventionStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateClass}
            className="lg:col-span-4 p-6 rounded-2xl border glass-panel-3d space-y-4 h-fit"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-500" />
              {isBn ? 'নতুন শ্রেণি তৈরি করুন (Firestore)' : 'Create New Class (Firestore)'}
            </h3>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={isBn ? 'যেমন: ৭ম শ্রেণি — গণিত শাখা ক' : 'e.g., Grade 7 — Mathematics Honors'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <select
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            >
              {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => (
                <option key={g} value={g}>
                  {getGradeLabel(g, language)}
                </option>
              ))}
            </select>
            <select
              value={classCurr}
              onChange={(e) => setClassCurr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            >
              {DEFAULT_CURRICULA.map((c) => (
                <option key={c} value={c}>
                  {getCurriculumLabel(c, language)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creatingClass}
              className="w-full py-2.5 rounded-xl glass-btn-3d text-white text-xs font-semibold disabled:opacity-50"
            >
              {creatingClass
                ? isBn
                  ? 'তৈরি হচ্ছে...'
                  : 'Creating...'
                : isBn
                ? 'শ্রেণি তৈরি করুন'
                : 'Create Class'}
            </button>
          </form>

          <div className="lg:col-span-8 space-y-3">
            {classes.length === 0 ? (
              <div className="p-10 rounded-2xl border glass-panel-3d text-center text-sm text-slate-500">
                <Users className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                {isBn
                  ? 'এখনো কোনো শ্রেণি তৈরি করা হয়নি। বামের ফর্ম দিয়ে প্রথম শ্রেণি তৈরি করুন।'
                  : 'No classes created in Firestore yet. Use the form on the left to add your first class.'}
              </div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="p-5 rounded-xl border glass-panel-3d flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{cls.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {getGradeLabel(cls.grade, language)} · {getCurriculumLabel(cls.curriculum, language)} ·{' '}
                      {toBnNum(cls.studentCount, language)} {isBn ? 'জন শিক্ষার্থী' : 'enrolled'}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteClassRoom(cls.id)}
                    aria-label={isBn ? 'শ্রেণি মুছুন' : 'Delete class'}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {section === 'question_bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveQuestion}
            className="lg:col-span-5 p-6 rounded-2xl border glass-panel-3d space-y-3.5 h-fit"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookPlus className="w-4 h-4 text-cyan-500" />
              {isBn ? 'নতুন প্রশ্ন যোগ করুন বা CSV আমদানি' : 'Author Question or Import CSV'}
            </h3>
            <select
              value={qDomain}
              onChange={(e) => setQDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            >
              {MATH_DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {isBn ? d.nameBn : d.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={qSubskill}
                onChange={(e) => setQSubskill(e.target.value)}
                placeholder={isBn ? 'উপ-দক্ষতা' : 'Subskill'}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
              <select
                value={qDifficulty}
                onChange={(e) => setQDifficulty(Number(e.target.value) as any)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    {isBn ? `স্তর ${toBnNum(l, 'bn')}` : `Level ${l}`}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              required
              value={qPrompt}
              onChange={(e) => setQPrompt(e.target.value)}
              placeholder={isBn ? 'ইংরেজিতে প্রশ্ন (LaTeX $...$ সমর্থিত)' : 'Question prompt in English (supports LaTeX $...$)'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <textarea
              rows={2}
              value={qPromptBn}
              onChange={(e) => setQPromptBn(e.target.value)}
              placeholder={isBn ? 'বাংলা প্রশ্ন (ঐচ্ছিক — বাংলা মাধ্যমের জন্য)' : 'Bangla prompt (optional — for Bangla medium)'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <input
              type="text"
              required
              value={qAnswer}
              onChange={(e) => setQAnswer(e.target.value)}
              placeholder={isBn ? 'সঠিক উত্তর' : 'Verified correct answer'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
            />
            <input
              type="text"
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder={isBn ? 'ধাপে ধাপে ব্যাখ্যা' : 'Step-by-step explanation'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <button
              type="submit"
              disabled={savingQ}
              className="w-full py-2.5 rounded-xl glass-btn-3d text-white text-xs font-semibold disabled:opacity-50"
            >
              {savingQ ? (isBn ? 'জমা হচ্ছে...' : 'Submitting...') : isBn ? 'পর্যালোচনার জন্য জমা দিন' : 'Submit for Review'}
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-cyan-500 cursor-pointer">
                <Upload className="w-4 h-4" />
                {isBn
                  ? 'CSV থেকে প্রশ্ন আমদানি (domain,subskill,grade,diff,prompt,answer)'
                  : 'Import CSV Questions (domain,subskill,grade,diff,prompt,answer)'}
                <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              </label>
            </div>
          </form>

          <div className="lg:col-span-7 p-6 rounded-2xl border glass-panel-3d space-y-3 max-h-[540px] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold tabular-nums">
                {bankLang === 'bn'
                  ? `সক্রিয় প্রশ্ন ব্যাংক (${toBnNum(allQuestions.filter((q) => bankGradeFilter === 'All' || q.grade === bankGradeFilter).length, 'bn')}টি প্রশ্ন)`
                  : `Active Question Bank (${allQuestions.filter((q) => bankGradeFilter === 'All' || q.grade === bankGradeFilter).length} items)`}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={bankGradeFilter}
                  onChange={(e) => {
                    setBankGradeFilter(e.target.value);
                    setBankPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                >
                  <option value="All">{bankLang === 'bn' ? 'সকল শ্রেণি' : 'All Grades'}</option>
                  {Array.from(new Set(allQuestions.map((q) => q.grade))).map((g) => (
                    <option key={g} value={g}>
                      {getGradeLabel(g, bankLang)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBankLang('bn')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      bankLang === 'bn'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankLang('en')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      bankLang === 'en'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
            {(() => {
              const PAGE_SIZE = 25;
              const filteredBank = allQuestions.filter(
                (q) => bankGradeFilter === 'All' || q.grade === bankGradeFilter
              );
              const totalPages = Math.max(1, Math.ceil(filteredBank.length / PAGE_SIZE));
              const safePage = Math.min(bankPage, totalPages);
              const pageStart = (safePage - 1) * PAGE_SIZE;
              const pageItems = filteredBank.slice(pageStart, pageStart + PAGE_SIZE);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      {bankLang === 'bn'
                        ? `দেখানো হচ্ছে ${toBnNum(filteredBank.length === 0 ? 0 : pageStart + 1, 'bn')}–${toBnNum(
                            Math.min(pageStart + PAGE_SIZE, filteredBank.length),
                            'bn'
                          )} (মোট ${toBnNum(filteredBank.length, 'bn')})`
                        : `Showing ${filteredBank.length === 0 ? 0 : pageStart + 1}–${Math.min(
                            pageStart + PAGE_SIZE,
                            filteredBank.length
                          )} of ${filteredBank.length}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {bankLang === 'bn' ? 'পূর্ববর্তী' : 'Prev'}
                      </button>
                      <span className="px-2 font-mono">
                        {toBnNum(safePage, bankLang)} / {toBnNum(totalPages, bankLang)}
                      </span>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setBankPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {bankLang === 'bn' ? 'পরবর্তী' : 'Next'}
                      </button>
                    </div>
                  </div>
                  {pageItems.map((q) => {
                    const loc = getLocalizedQuestion(
                      q,
                      bankLang,
                      bankLang === 'bn' ? 'bangla_medium' : 'english_version'
                    );
                    return (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between text-slate-500">
                          <span>
                            {getGradeLabel(q.grade, bankLang)} · {getDomainLabel(q.domain, bankLang)} ·{' '}
                            {bankLang === 'bn' ? `স্তর ${toBnNum(q.difficulty, 'bn')}` : `L${q.difficulty}`}
                          </span>
                          <span className="font-mono">
                            {getValidationStatusLabel(q.validationStatus, bankLang)}
                          </span>
                        </div>
                        <div className="text-slate-900 dark:text-white font-medium text-sm">
                          <MathRenderer content={loc.prompt} />
                        </div>
                        {loc.options && loc.options.length > 0 && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {bankLang === 'bn' ? 'বিকল্পসমূহ: ' : 'Options: '}
                            {loc.options.join(' · ')}
                          </div>
                        )}
                        <div className="font-mono text-emerald-600 dark:text-emerald-400">
                          {bankLang === 'bn' ? 'উত্তর: ' : 'Answer: '}
                          {loc.correctAnswer}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
