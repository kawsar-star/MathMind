import React from 'react';
import { Bell, BookOpen, CheckCircle2, Download, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDomainLabel, getTierLabel, toBnNum } from '../../i18n/translations';
import { exportAssessmentPdf } from '../../utils/mathUtils';
import { useToast } from '../common/ToastContext';

export const ParentPortal: React.FC = () => {
  const {
    studentProfile,
    assessments,
    remedialPlans,
    quizAttempts,
    notifications,
    language,
  } = useAuth();
  const { showToast } = useToast();
  const isBn = language === 'bn';

  const latest = assessments[0] || null;
  const plan = remedialPlans[0] || null;
  const strengths = latest?.domainScores.filter((d) => d.score >= 70) || [];
  const priorities = latest?.domainScores.filter((d) => d.score < 70) || [];

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {isBn ? 'অভিভাবক ও সহায়ক অগ্রগতি সঙ্গী' : 'Parent & Guardian Progress Companion'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {studentProfile?.name || (isBn ? 'শিক্ষার্থী' : 'Learner')} ·{' '}
            {isBn ? 'বাড়িতে সহায়তার সারসংক্ষেপ' : 'Home Support Overview'}
          </h1>
        </div>

        <button
          onClick={() => {
            if (!latest) {
              showToast(
                isBn
                  ? 'এখনো এক্সপোর্ট করার মতো কোনো সম্পূর্ণ মূল্যায়ন নেই।'
                  : 'No completed assessment available to export yet.',
                'info'
              );
              return;
            }
            exportAssessmentPdf(latest, plan);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-btn-violet text-white text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          {isBn ? 'অভিভাবক অগ্রগতি রিপোর্ট (PDF)' : 'Download Parent Progress Report (PDF)'}
        </button>
      </div>

      {!latest ? (
        <div className="p-10 rounded-2xl border glass-panel-3d text-center">
          <HeartHandshake className="w-10 h-10 text-cyan-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {isBn ? 'প্রাথমিক গণিত মূল্যায়নের জন্য অপেক্ষা করা হচ্ছে' : 'Waiting for Initial Mathematics Assessment'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {isBn
              ? 'আপনার সন্তান শিক্ষার্থী পোর্টালে একটি মূল্যায়ন সম্পন্ন করলেই সহজ ভাষায় তার সবল দিক, উন্নতির জায়গা এবং বাড়িতে অনুশীলনের নির্দেশনা এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।'
              : 'Once your child completes an assessment in the Student Portal, plain-language strengths, growth areas, and home practice activities will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="p-6 rounded-2xl border glass-panel-3d">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {isBn ? 'অভিভাবক-বান্ধব অগ্রগতির সারসংক্ষেপ' : 'Parent-Friendly Progress Summary'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {latest.aiDiagnosis?.executiveSummary ||
                  (isBn
                    ? `${latest.studentName} মোট ${toBnNum(latest.totalQuestions, 'bn')}টি অ্যাডাপ্টিভ প্রশ্নে ${toBnNum(latest.overallScore, 'bn')}% স্কোর (${getTierLabel(latest.competencyCategory, language)}) অর্জন করেছে।`
                    : `${latest.studentName} achieved an observed score of ${latest.overallScore}% (${latest.competencyCategory}) across ${latest.totalQuestions} adaptive questions.`)}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/30">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isBn ? 'বর্তমান গাণিতিক সবলতা' : 'Current Mathematical Strengths'}
                  </div>
                  {strengths.length > 0 ? (
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300 tabular-nums">
                      {strengths.map((s) => (
                        <li key={s.domain}>
                          • {getDomainLabel(s.domain, language)} ({toBnNum(s.score, language)}%)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">
                      {isBn ? 'সকল ডোমেইনে মৌলিক দক্ষতা গড়ে উঠছে।' : 'Building foundational fluency across domains.'}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/30">
                  <div className="font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {isBn ? 'বাড়িতে সহায়ক অনুশীলনের ক্ষেত্র' : 'Areas for Supportive Home Practice'}
                  </div>
                  {priorities.length > 0 ? (
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300 tabular-nums">
                      {priorities.map((p) => (
                        <li key={p.domain}>
                          • {getDomainLabel(p.domain, language)} ({toBnNum(p.score, language)}%)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">
                      {isBn ? 'মূল্যায়িত সকল ডোমেইনেই ৭০% এর বেশি স্কোর!' : 'All assessed domains are above 70%!'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {plan && (
              <div className="p-6 rounded-2xl border glass-panel-3d">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                  {isBn ? 'বাড়িতে অনুশীলনের প্রস্তাবিত কার্যক্রম' : 'Recommended Home Practice Activities'}
                </h3>
                <div className="space-y-3 text-xs">
                  {plan.objectives.slice(0, 3).map((obj) => (
                    <div
                      key={obj.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                    >
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {obj.title} ({getDomainLabel(obj.domain, language)})
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{obj.everydayExample}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="p-6 rounded-2xl border glass-panel-3d">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-500" />
                {isBn ? 'সাম্প্রতিক শেখার মাইলফলক ও বার্তা' : 'Recent Learning Milestones & Alerts'}
              </h3>
              <div className="space-y-2.5 text-xs">
                {notifications.length === 0 && quizAttempts.length === 0 ? (
                  <p className="text-slate-500">
                    {isBn ? 'এখনো কোনো সাম্প্রতিক শেখার কার্যক্রম নথিভুক্ত হয়নি।' : 'No recent learning activity logged yet.'}
                  </p>
                ) : (
                  <>
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <div className="text-slate-500 mt-0.5">{n.message}</div>
                      </div>
                    ))}
                    {quizAttempts.slice(0, 3).map((q) => (
                      <div key={q.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {isBn ? 'কুইজ' : 'Quiz'} · {getDomainLabel(q.domain, language)}
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          {isBn ? 'নির্ভুলতা' : 'Accuracy'}: {toBnNum(q.accuracyPercent, language)}% · +
                          {toBnNum(q.xpEarned, language)} XP
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
