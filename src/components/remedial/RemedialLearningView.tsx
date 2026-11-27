import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FlaskConical,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GUIDED_LESSONS } from '../../data/domainsAndCurriculum';
import {
  getDomainLabel,
  getGradeLabel,
  getInterventionLevelLabel,
  toBnNum,
} from '../../i18n/translations';
import { GuidedLesson, RemedialObjective } from '../../types/mathmind';
import {
  recordLearningActivity,
  saveQuizAttempt,
  saveRemedialPlan,
} from '../../services/firestoreService';
import {
  checkAnswerDeterministic,
  parseGradeLevel,
} from '../../utils/mathUtils';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

interface RemedialProps {
  onOpenLabTool: (toolId: string) => void;
  onStartAssessment: () => void;
}

export const RemedialLearningView: React.FC<RemedialProps> = ({
  onOpenLabTool,
  onStartAssessment,
}) => {
  const { firebaseUser, userAccount, studentProfile, remedialPlans, systemSettings, language } = useAuth();
  const { showToast } = useToast();

  const studentGradeLevel = parseGradeLevel(studentProfile?.grade);
  const ageSortedLessons = [...GUIDED_LESSONS].sort((a, b) => {
    const da = Math.abs(parseGradeLevel(a.grade) - studentGradeLevel);
    const db = Math.abs(parseGradeLevel(b.grade) - studentGradeLevel);
    return da - db;
  });

  const [tab, setTab] = useState<'path' | 'library'>('path');
  const [activeObjective, setActiveObjective] = useState<RemedialObjective | null>(null);
  const [checkAnswer, setCheckAnswer] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<GuidedLesson>(ageSortedLessons[0]);
  const [lessonQuizChoice, setLessonQuizChoice] = useState('');
  const [lessonFeedback, setLessonFeedback] = useState<string | null>(null);

  const plan = remedialPlans[0] || null;

  const completeObjectiveCheck = async (obj: RemedialObjective, scorePct: number) => {
    if (!firebaseUser || !plan) return;
    const masteryThreshold = systemSettings.masteryThreshold || 85;
    const passed = scorePct >= masteryThreshold;

    const updatedObjectives = plan.objectives.map((item, idx) => {
      if (item.id === obj.id) {
        return {
          ...item,
          status: passed ? ('completed' as const) : ('reteach' as const),
          checkScore: scorePct,
        };
      }
      // Unlock next objective if current passed
      if (passed && idx > 0 && plan.objectives[idx - 1].id === obj.id && item.status === 'upcoming') {
        return { ...item, status: 'current' as const };
      }
      return item;
    });

    const completedCount = updatedObjectives.filter((o) => o.status === 'completed').length;
    const overallProgress = Math.round((completedCount / updatedObjectives.length) * 100);

    try {
      await saveRemedialPlan(
        firebaseUser.uid,
        {
          assessmentId: plan.assessmentId,
          interventionLevel: plan.interventionLevel,
          overallProgress,
          objectives: updatedObjectives,
        },
        plan.id
      );

      const xpGain = passed ? 40 : 15;
      await saveQuizAttempt(firebaseUser.uid, {
        domain: obj.domain,
        subskill: obj.subskill,
        mode: 'remedial_check',
        score: scorePct,
        totalQuestions: 1,
        accuracyPercent: scorePct,
        xpEarned: xpGain,
      });

      const streakRes = await recordLearningActivity({
        uid: firebaseUser.uid,
        fallbackAccount: userAccount,
        hasStudentProfile: Boolean(studentProfile),
        xpGain,
        activityLabel: `Remedial: ${obj.title}`,
        language,
      });

      if (passed) {
        showToast(
          language === 'bn'
            ? streakRes.notificationTitle
              ? `দক্ষতা যাচাই সফল (${scorePct}%)! +${xpGain} XP · ${streakRes.notificationTitle}`
              : `দক্ষতা যাচাই সফল (${scorePct}%)! পরবর্তী ধাপ আনলক হয়েছে।`
            : streakRes.notificationTitle
            ? `Mastery verified (${scorePct}%)! +${xpGain} XP · ${streakRes.notificationTitle}`
            : `Mastery verified (${scorePct}%)! Next learning objective unlocked.`,
          'success'
        );
        setActiveObjective(null);
      } else {
        showToast(
          language === 'bn'
            ? `স্কোর ${scorePct}% যা ${masteryThreshold}% লক্ষ্যমাত্রার নিচে। গণিত ল্যাবে অনুশীলন করুন।`
            : `Score ${scorePct}% is below ${masteryThreshold}% mastery threshold. Recommended: Re-teach with interactive Math Lab.`,
          'info'
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'অগ্রগতি সংরক্ষণ করা যায়নি।'
          : 'Could not update remedial progress.';
      showToast(msg, 'error');
    }
  };

  const handleLessonCheck = async () => {
    if (!lessonQuizChoice) return;
    const ok = checkAnswerDeterministic(
      lessonQuizChoice,
      selectedLesson.knowledgeCheck.correctAnswer,
      selectedLesson.knowledgeCheck.correctAnswerBn
    );
    const expText =
      language === 'bn' && selectedLesson.knowledgeCheck.explanationBn
        ? selectedLesson.knowledgeCheck.explanationBn
        : selectedLesson.knowledgeCheck.explanation;
    setLessonFeedback(
      language === 'bn'
        ? ok
          ? `সঠিক! ${expText}`
          : `সঠিক হয়নি। ${expText}`
        : ok
        ? `Correct! ${expText}`
        : `Not quite. ${expText}`
    );
    if (firebaseUser) {
      try {
        const streakRes = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: ok ? 15 : 5,
          activityLabel: `Guided Lesson: ${selectedLesson.title}`,
          language,
        });
        if (streakRes.notificationTitle) {
          showToast(streakRes.notificationTitle, 'success');
        }
      } catch {
        // non-blocking streak log
      }
    }
  };

  const isBn = language === 'bn';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {isBn ? 'দক্ষতাভিত্তিক ব্যক্তিগত শেখার ইঞ্জিন' : 'Mastery-Based Personalized Remedial Engine'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {isBn ? 'আমার শেখার পথ ও গাইডেড পাঠ' : 'My Learning Path & Guided Tutorials'}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTab('path')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'path'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isBn ? 'শেখার পথ' : 'Remedial Path'}
          </button>
          <button
            onClick={() => setTab('library')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'library'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isBn ? 'গাইডেড টিউটোরিয়াল লাইব্রেরি' : 'Guided Tutorial Library'}
          </button>
        </div>
      </div>

      {tab === 'path' ? (
        !plan ? (
          <div className="p-10 rounded-2xl border glass-panel-3d text-center">
            <Compass className="w-10 h-10 text-cyan-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {isBn ? 'আপনার ব্যক্তিগত শেখার পথ অপেক্ষা করছে' : 'Your Personalized Learning Path Awaits'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-5">
              {isBn
                ? 'প্রথমে একটি অ্যাডাপ্টিভ মূল্যায়ন দিন, তাহলে ম্যাথমাইন্ড এআই আপনার দুর্বল দিকগুলো চিহ্নিত করে ধাপে ধাপে শেখার পথ তৈরি করবে।'
                : 'Take an Adaptive Assessment first so MATHMIND AI can prioritize your weak domains and build a step-by-step mastery path.'}
            </p>
            <button
              onClick={onStartAssessment}
              className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
            >
              {isBn ? 'মূল্যায়ন শুরু করুন' : 'Start Assessment'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configurable Mastery Threshold Guide */}
            <div className="p-5 rounded-2xl border border-indigo-500/30 student-hero-gradient glass-panel-3d flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-cyan-300">
                  {getInterventionLevelLabel(plan.interventionLevel, language)}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  {isBn
                    ? `দক্ষতা অগ্রগতি: ${toBnNum(systemSettings.reTeachThreshold)}%-এর নিচে পুনরায় শিক্ষা · ${toBnNum(systemSettings.reTeachThreshold)}–${toBnNum(systemSettings.guidedThreshold - 1)}% গাইডেড · ${toBnNum(systemSettings.guidedThreshold)}–${toBnNum(systemSettings.masteryThreshold - 1)}% অনুশীলন · ${toBnNum(systemSettings.masteryThreshold)}%+ দক্ষতা অর্জন`
                    : `Configurable mastery progression: Below ${systemSettings.reTeachThreshold}% Re-teach · ${systemSettings.reTeachThreshold}–${systemSettings.guidedThreshold - 1}% Guided · ${systemSettings.guidedThreshold}–${systemSettings.masteryThreshold - 1}% Practice · ${systemSettings.masteryThreshold}%+ Mastery Unlock`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {isBn ? `${toBnNum(plan.overallProgress)}%` : `${plan.overallProgress}%`}
                </div>
                <div className="text-xs text-slate-500">{isBn ? 'সম্পন্ন' : 'Completed'}</div>
              </div>
            </div>

            {/* Sequential Visual Path */}
            <div className="space-y-3">
              {plan.objectives.map((obj) => {
                const isLocked = obj.status === 'upcoming';
                const isDone = obj.status === 'completed';
                const needsReteach = obj.status === 'reteach';
                return (
                  <div
                    key={obj.id}
                    className={`p-5 rounded-2xl border transition-colors ${
                      obj.status === 'current' || needsReteach
                        ? 'border-cyan-500/60 bg-gradient-to-br from-cyan-500/8 to-indigo-500/5'
                        : isDone
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-800 glass-panel-3d'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                            {isBn ? `ধাপ ${toBnNum(obj.order)}` : `Step ${obj.order}`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getDomainLabel(obj.domain, language)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{getInterventionLevelLabel(obj.level, language)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {isBn ? toBnNum(obj.estimatedMinutes) : obj.estimatedMinutes} {isBn ? 'মিনিট' : 'min'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {isLocked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                          {needsReteach && <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />}
                          {obj.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {isBn ? 'পূর্বশর্ত' : 'Prerequisite'}: {obj.prerequisite}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={() => onOpenLabTool(obj.recommendedLabTool || 'fraction-lab')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-cyan-500/60"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-cyan-500" />
                          {isBn ? 'গণিত ল্যাব খুলুন' : 'Open Math Lab'}
                        </button>
                        <button
                          disabled={isLocked}
                          onClick={() => {
                            setActiveObjective(obj);
                            setCheckAnswer('');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-45"
                        >
                          {isDone
                            ? isBn
                              ? 'পুনরালোচনা'
                              : 'Review'
                            : needsReteach
                            ? isBn
                              ? 'আবার যাচাই করুন'
                              : 'Retry Mastery Check'
                            : isBn
                            ? 'শিখুন ও যাচাই করুন'
                            : 'Study & Verify'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {activeObjective?.id === obj.id && (
                      <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <div className="font-semibold text-slate-900 dark:text-white mb-1">
                              {isBn ? 'ধারণার ব্যাখ্যা' : 'Concept Explanation'}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              <MathRenderer content={obj.explanation} />
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <div className="font-semibold text-slate-900 dark:text-white mb-1">
                              {isBn ? 'দৈনন্দিন উদাহরণ' : 'Everyday Connection'}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              <MathRenderer content={obj.everydayExample} />
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                            <div className="font-semibold text-slate-900 dark:text-white mb-1">
                              {isBn ? 'সমাধানকৃত উদাহরণ' : 'Worked Example'}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              <MathRenderer content={obj.workedExample} />
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            <strong>{isBn ? 'দক্ষতা যাচাই:' : 'Mastery Verification:'}</strong>{' '}
                            {isBn
                              ? 'মূল নিয়মটি সংক্ষেপে লিখুন বা উপরের উদাহরণের উত্তর দিয়ে দক্ষতা যাচাই জমা দিন।'
                              : 'Summarize the key rule or solve the worked check above, then record your mastery check score.'}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={checkAnswer}
                              onChange={(e) => setCheckAnswer(e.target.value)}
                              placeholder={isBn ? 'আপনার উত্তর বা সারসংক্ষেপ লিখুন...' : 'Write your takeaway or solution...'}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-56"
                            />
                            <button
                              onClick={() => completeObjectiveCheck(obj, checkAnswer.trim().length > 3 ? 90 : 45)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                            >
                              {isBn ? 'যাচাই জমা দিন' : 'Submit Mastery Check'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* Guided Tutorial Library — 9 Structured Sections */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2.5">
            {ageSortedLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setSelectedLesson(lesson);
                  setLessonQuizChoice('');
                  setLessonFeedback(null);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedLesson.id === lesson.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1425] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">
                  {getDomainLabel(lesson.domain, language)} · {getGradeLabel(lesson.grade, language)}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {language === 'bn' ? lesson.titleBn : lesson.title}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl border glass-panel-3d space-y-6">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                  {isBn ? '০১. শিখনফল' : '01. Learning Objective'} · {selectedLesson.subskill}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isBn ? selectedLesson.titleBn : selectedLesson.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  <MathRenderer
                    content={
                      isBn && selectedLesson.learningObjectiveBn
                        ? selectedLesson.learningObjectiveBn
                        : selectedLesson.learningObjective
                    }
                  />
                </p>
              </div>
              <button
                onClick={() => onOpenLabTool(selectedLesson.labToolId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold glass-btn-violet shrink-0"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {isBn ? 'গণিত ল্যাব চালু করুন' : 'Launch Interactive Lab'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-sky-500/8 border border-sky-500/25">
                <div className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1">
                  {isBn ? '০২. পূর্বজ্ঞান' : '02. Prerequisite Knowledge'}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <MathRenderer
                    content={
                      isBn && selectedLesson.prerequisiteKnowledgeBn
                        ? selectedLesson.prerequisiteKnowledgeBn
                        : selectedLesson.prerequisiteKnowledge
                    }
                  />
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                  {isBn ? '০৩. সহজ ধারণা পরিচিতি' : '03. Simple Concept Introduction'}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <MathRenderer
                    content={
                      isBn && selectedLesson.conceptIntroBn
                        ? selectedLesson.conceptIntroBn
                        : selectedLesson.conceptIntro
                    }
                  />
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                {isBn ? '০৪. দৃশ্যমান ব্যাখ্যা' : '04. Visual Explanation'}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <MathRenderer
                  content={
                    isBn && selectedLesson.visualExplanationBn
                      ? selectedLesson.visualExplanationBn
                      : selectedLesson.visualExplanation
                  }
                />
              </p>
            </div>

            <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/8 space-y-2">
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                {isBn ? '০৫. সমাধানকৃত উদাহরণ' : '05. Worked Example'}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                <MathRenderer
                  content={
                    isBn && selectedLesson.workedExample.problemBn
                      ? selectedLesson.workedExample.problemBn
                      : selectedLesson.workedExample.problem
                  }
                />
              </div>
              <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
                {(isBn && selectedLesson.workedExample.stepsBn
                  ? selectedLesson.workedExample.stepsBn
                  : selectedLesson.workedExample.steps
                ).map((st, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {isBn ? `${toBnNum(idx + 1)}.` : `${idx + 1}.`}
                    </span>
                    <MathRenderer content={st} />
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-teal-500/25 bg-teal-500/5">
                <div className="font-semibold text-teal-700 dark:text-teal-300 mb-1">
                  {isBn ? '০৬. নির্দেশিত অনুশীলন' : '06. Guided Practice'}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-2">
                  <MathRenderer
                    content={
                      isBn && selectedLesson.guidedPractice.promptBn
                        ? selectedLesson.guidedPractice.promptBn
                        : selectedLesson.guidedPractice.prompt
                    }
                  />
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {isBn ? 'ইঙ্গিত:' : 'Hint:'}{' '}
                  <MathRenderer
                    content={
                      isBn && selectedLesson.guidedPractice.hintBn
                        ? selectedLesson.guidedPractice.hintBn
                        : selectedLesson.guidedPractice.hint
                    }
                  />
                </p>
              </div>
              <div className="p-4 rounded-xl border border-violet-500/25 bg-violet-500/5">
                <div className="font-semibold text-violet-700 dark:text-violet-300 mb-1">
                  {isBn ? '০৭. স্বতন্ত্র অনুশীলন' : '07. Independent Practice'}
                </div>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {selectedLesson.independentPractice.map((ip, idx) => (
                    <li key={idx}>
                      • <MathRenderer content={isBn && ip.promptBn ? ip.promptBn : ip.prompt} />{' '}
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        ({isBn ? 'উত্তর' : 'Ans'}: {isBn && ip.answerBn ? ip.answerBn : ip.answer})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 08. Knowledge Check */}
            <div className="p-5 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/10 to-emerald-500/8 space-y-3">
              <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                {isBn ? '০৮. জ্ঞান যাচাই' : '08. Knowledge Check'}
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                <MathRenderer
                  content={
                    isBn && selectedLesson.knowledgeCheck.promptBn
                      ? selectedLesson.knowledgeCheck.promptBn
                      : selectedLesson.knowledgeCheck.prompt
                  }
                />
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(isBn && selectedLesson.knowledgeCheck.optionsBn
                  ? selectedLesson.knowledgeCheck.optionsBn
                  : selectedLesson.knowledgeCheck.options
                ).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLessonQuizChoice(opt)}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono transition-colors ${
                      lessonQuizChoice === opt
                        ? 'border-cyan-500 bg-cyan-500/20 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-cyan-500/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleLessonCheck}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-semibold"
                >
                  {isBn ? 'উত্তর যাচাই করুন' : 'Check Answer'}
                </button>
                {lessonFeedback && (
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    <MathRenderer content={lessonFeedback} />
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>{isBn ? '০৯. সারসংক্ষেপ:' : '09. Summary:'}</strong>{' '}
                {isBn && selectedLesson.summaryBn ? selectedLesson.summaryBn : selectedLesson.summary}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
