import React, { useState } from 'react';
import {
  Brain,
  Calculator,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Send,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBnNum } from '../../i18n/translations';
import {
  requestStepByStepSolve,
  requestTutorReply,
} from '../../services/aiService';
import { recordLearningActivity, saveTutorSession } from '../../services/firestoreService';
import { TutorMessage } from '../../types/mathmind';
import { MathRenderer } from '../common/MathRenderer';
import { useToast } from '../common/ToastContext';

export const AiTutorAndSolver: React.FC = () => {
  const { firebaseUser, userAccount, studentProfile, assessments, language } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'tutor' | 'solver'>('tutor');

  // Tutor state
  const [tutorMode, setTutorMode] = useState<'teach_me' | 'give_hint' | 'check_solution'>('teach_me');
  const [tutorInput, setTutorInput] = useState('');
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your MATHMIND AI Mathematics Tutor. Ask me to explain a concept (**Teach Me**), guide you without giving away the answer (**Give Me a Hint**), or review your step-by-step work (**Check My Solution**).',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Solver state
  const [solveInput, setSolveInput] = useState('3x - 7 = 14');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [solveLoading, setSolveLoading] = useState(false);
  const [solveResult, setSolveResult] = useState<{
    problemInterpretation: string;
    relevantFormulas: string[];
    steps: { stepNumber: number; title: string; expression: string; explanation: string }[];
    finalAnswer: string;
    alternativeMethod?: string;
    similarPracticeProblem?: string;
    deterministicCheck?: { evaluated: number | null; verified: boolean } | null;
  } | null>(null);

  const sendTutorMessage = async (customText?: string) => {
    const text = (customText ?? tutorInput).trim();
    if (!text || tutorLoading) return;

    const userMsg: TutorMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!customText) setTutorInput('');
    setTutorLoading(true);

    try {
      const replyData = await requestTutorReply({
        mode: tutorMode,
        message: text,
        history: nextHistory.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        context: {
          age: studentProfile?.age || 12,
          grade: studentProfile?.grade || 'Grade 6',
          competency: assessments[0]?.competencyCategory || 'Developing',
          curriculum: studentProfile?.curriculum || 'NCTB Bangladesh',
          language,
        },
      });

      const modelMsg: TutorMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: replyData.reply,
        followUpQuestion: replyData.followUpQuestion,
        alternativeMethod: replyData.alternativeMethod,
        similarPracticeProblem: replyData.similarPracticeProblem,
        timestamp: new Date().toISOString(),
      };
      const updated = [...nextHistory, modelMsg];
      setMessages(updated);

      if (firebaseUser) {
        const sid = await saveTutorSession(
          firebaseUser.uid,
          {
            mode: tutorMode,
            topic: text.slice(0, 120),
            messages: updated.slice(-50),
          },
          sessionId
        );
        setSessionId(sid);
        const streakRes = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: 10,
          activityLabel: language === 'bn' ? 'এআই গণিত শিক্ষক সেশন' : 'AI Math Tutor Session',
          language,
        });
        if (streakRes.notificationTitle) {
          showToast(
            `${streakRes.notificationTitle} (+${toBnNum(10, language)} XP)`,
            'success'
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'টিউটর উত্তর পাওয়া যায়নি।'
          : 'Tutor request failed.';
      showToast(msg, 'error');
    } finally {
      setTutorLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast(
        language === 'bn'
          ? 'অনুগ্রহ করে ৪ এমবি-র কম সাইজের ছবি নির্বাচন করুন।'
          : 'Please select an image smaller than 4MB.',
        'error'
      );
      return;
    }
    setImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const runSolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solveInput.trim() && !imagePreview) {
      showToast(
        language === 'bn'
          ? 'একটি গাণিতিক সমস্যা লিখুন বা ছবি আপলোড করুন।'
          : 'Enter a math expression or upload a problem image.',
        'info'
      );
      return;
    }
    setSolveLoading(true);
    try {
      const res = await requestStepByStepSolve({
        problem: solveInput.trim(),
        ...(imagePreview ? { imageBase64: imagePreview, imageMimeType: imageMime } : {}),
        grade: studentProfile?.grade || 'Grade 6',
        language,
      });
      setSolveResult(res);
      if (firebaseUser) {
        const streakRes = await recordLearningActivity({
          uid: firebaseUser.uid,
          fallbackAccount: userAccount,
          hasStudentProfile: Boolean(studentProfile),
          xpGain: 10,
          activityLabel: language === 'bn' ? 'ধাপে ধাপে গণিত সমাধান' : 'Step-by-Step Math Solver',
          language,
        });
        if (streakRes.notificationTitle) {
          showToast(
            `${streakRes.notificationTitle} (+${toBnNum(10, language)} XP)`,
            'success'
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === 'bn'
          ? 'সমাধান করা সম্ভব হয়নি।'
          : 'Solver failed.';
      showToast(msg, 'error');
    } finally {
      setSolveLoading(false);
    }
  };

  const isBn = language === 'bn';
  const welcomeBn =
    'স্বাগতম! আমি আপনার ম্যাথমাইন্ড এআই গণিত শিক্ষক। যেকোনো ধারণা সহজভাবে বুঝতে (**আমাকে শেখান**), উত্তর না বলে সহায়ক ধাপ পেতে (**ইঙ্গিত দিন**), অথবা আপনার সমাধান যাচাই করতে (**আমার সমাধান দেখুন**) প্রশ্ন করুন।';

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border student-hero-gradient flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">
            {isBn ? 'ইন্টারেক্টিভ এআই গণিত ওয়ার্কস্পেস' : 'Interactive Pedagogical AI Workspace'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            {isBn ? 'এআই গণিত শিক্ষক ও ধাপে ধাপে সমাধান' : 'AI Math Tutor & Step-by-Step Solver'}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/70 dark:bg-slate-900/75 border border-cyan-500/25">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'tutor'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            {isBn ? 'এআই গণিত শিক্ষক' : 'AI Math Tutor'}
          </button>
          <button
            onClick={() => setActiveTab('solver')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'solver'
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            {isBn ? 'ধাপে ধাপে সমাধান' : 'Step-by-Step Solver'}
          </button>
        </div>
      </div>

      {activeTab === 'tutor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mode Selector & Quick Starters */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl border glass-panel-3d space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'শেখানোর ধরন' : 'Tutor Mode'}
              </h3>
              {[
                {
                  id: 'teach_me',
                  title: isBn ? 'আমাকে শেখান' : 'Teach Me',
                  desc: isBn
                    ? 'প্রতিটি ধাপ কেন কাজ করে তার সহজ ও বিস্তারিত ব্যাখ্যা।'
                    : 'Step-by-step concept explanation with why each step works.',
                  activeStyle: 'border-sky-500 bg-sky-500/12',
                },
                {
                  id: 'give_hint',
                  title: isBn ? 'ইঙ্গিত দিন' : 'Give Me a Hint',
                  desc: isBn
                    ? 'সরাসরি উত্তর না বলে চিন্তা করার সহায়ক সূত্র।'
                    : 'Socratic guiding clues without spoiling the final answer.',
                  activeStyle: 'border-amber-500 bg-amber-500/12',
                },
                {
                  id: 'check_solution',
                  title: isBn ? 'আমার সমাধান দেখুন' : 'Check My Solution',
                  desc: isBn
                    ? 'আপনার ধাপগুলো লিখুন, এআই ঠিক কোথায় ভুল হয়েছে তা দেখাবে।'
                    : 'Paste your steps so AI pinpoints the exact spot to improve.',
                  activeStyle: 'border-emerald-500 bg-emerald-500/12',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTutorMode(m.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    tutorMode === m.id
                      ? m.activeStyle
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{m.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="p-5 rounded-2xl border glass-panel-3d space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500">
                {isBn ? 'প্রস্তাবিত প্রশ্ন' : 'Suggested Prompts'}
              </h3>
              {(isBn
                ? [
                    '১/৩ + ১/৪ যোগ করার আগে কেন সমহর করতে হয়?',
                    '২(x - ৩) = ১৪ সমাধানের জন্য উত্তর না বলে একটি ইঙ্গিত দিন।',
                    'আমার সমাধান যাচাই করুন: ৩x + ৫ = ২০ -> ৩x = ২৫ -> x = ২৫/৩।',
                  ]
                : [
                    'Why do we need a common denominator before adding 1/3 + 1/4?',
                    'Give me a hint for solving 2(x - 3) = 14 without telling me x.',
                    'Check my steps: 3x + 5 = 20 -> 3x = 25 -> x = 25/3.',
                  ]
              ).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendTutorMessage(prompt)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-cyan-500/60 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Canvas */}
          <div className="lg:col-span-8 flex flex-col h-[560px] rounded-2xl border glass-panel-3d overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm space-y-2 ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <MathRenderer content={m.id === 'welcome' && isBn ? welcomeBn : m.text} />

                    {m.alternativeMethod && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300">
                        <strong>{isBn ? 'বিকল্প পদ্ধতি:' : 'Alternative Approach:'}</strong>{' '}
                        <MathRenderer content={m.alternativeMethod} />
                      </div>
                    )}
                    {m.followUpQuestion && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs text-cyan-600 dark:text-cyan-400">
                        <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
                        <MathRenderer content={m.followUpQuestion} />
                      </div>
                    )}
                    {m.similarPracticeProblem && (
                      <div className="pt-1 text-xs text-indigo-500 dark:text-indigo-300">
                        {isBn ? 'এটি চেষ্টা করো:' : 'Try this next:'} <MathRenderer content={m.similarPracticeProblem} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {tutorLoading && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-500 animate-spin" />
                  {isBn ? 'টিউটর চিন্তা করছে...' : 'Tutor is thinking carefully...'}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendTutorMessage();
              }}
              className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
            >
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder={isBn ? 'গণিতের প্রশ্ন লিখুন বা আপনার সমাধান দেখান...' : 'Ask a math question or share your steps...'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={tutorLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-btn-3d text-white text-sm font-semibold disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isBn ? 'পাঠান' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Step-by-Step Math Solver */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={runSolver}
            className="lg:col-span-5 p-6 rounded-2xl border glass-panel-3d space-y-4 h-fit"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {isBn ? 'সমস্যা লিখুন বা ছবি আপলোড করুন' : 'Enter Problem or Upload Image'}
            </h3>
            <textarea
              rows={4}
              value={solveInput}
              onChange={(e) => setSolveInput(e.target.value)}
              placeholder={
                isBn
                  ? 'যেমন: 3x - 7 = 14 সমাধান করো অথবা ১২ সেমি ভূমি ও ৯ সেমি উচ্চতার ত্রিভুজের ক্ষেত্রফল নির্ণয় করো'
                  : 'e.g., Solve 3x - 7 = 14 or Find the area of a triangle with base 12 and height 9'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:border-cyan-500"
            />

            <div>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer hover:border-cyan-500">
                <ImagePlus className="w-4 h-4 text-cyan-500" />
                {isBn ? 'প্রশ্নের ছবি আপলোড (ঐচ্ছিক)' : 'Upload Problem Photo (Optional)'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {imagePreview && (
                <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img
                    src={imagePreview}
                    alt={isBn ? 'আপলোড করা গণিত সমস্যার ছবি' : 'Uploaded math problem'}
                    className="max-h-40 object-contain mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/80 text-white text-[11px]"
                  >
                    {isBn ? 'মুছুন' : 'Remove'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={solveLoading}
              className="w-full py-2.5 rounded-xl glass-btn-violet text-white text-sm font-semibold disabled:opacity-50"
            >
              {solveLoading
                ? isBn
                  ? 'সমাধান ও যাচাই চলছে...'
                  : 'Solving & Verifying...'
                : isBn
                ? 'ধাপে ধাপে সমাধান করুন'
                : 'Solve Step-by-Step'}
            </button>
          </form>

          <div className="lg:col-span-7 p-6 rounded-2xl border glass-panel-3d">
            {!solveResult ? (
              <div className="text-center py-14 text-sm text-slate-500">
                {isBn
                  ? 'ধাপে ধাপে সমাধান দেখতে সমীকরণ, কথার অংক অথবা ছবি জমা দিন।'
                  : 'Submit an equation, word problem, or image to inspect the structured step-by-step derivation.'}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-cyan-500 mb-1">
                    {isBn ? 'সমস্যার ব্যাখ্যা' : 'Problem Interpretation'}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <MathRenderer content={solveResult.problemInterpretation} />
                  </p>
                </div>

                {solveResult.relevantFormulas?.length > 0 && (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>{isBn ? 'প্রাসঙ্গিক সূত্র:' : 'Relevant Formulas:'}</strong>{' '}
                    {solveResult.relevantFormulas.map((f, idx) => (
                      <span key={idx} className="mr-3">
                        <MathRenderer content={f} />
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {solveResult.steps.map((st) => (
                    <div
                      key={st.stepNumber}
                      className="p-4 rounded-xl border border-violet-500/20 bg-gradient-to-r from-sky-500/5 to-violet-500/5"
                    >
                      <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1 tabular-nums">
                        {isBn ? `ধাপ ${toBnNum(st.stepNumber, language)}` : `Step ${st.stepNumber}`} · {st.title}
                      </div>
                      <div className="text-sm font-mono text-slate-900 dark:text-white mb-1">
                        <MathRenderer content={st.expression} />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <MathRenderer content={st.explanation} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {isBn ? 'চূড়ান্ত উত্তর' : 'Final Answer'}
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      <MathRenderer content={solveResult.finalAnswer} />
                    </div>
                  </div>
                  {solveResult.deterministicCheck && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      <CheckCircle2 className="w-4 h-4" />
                      {solveResult.deterministicCheck.verified
                        ? isBn
                          ? `গাণিতিকভাবে যাচাইকৃত (= ${toBnNum(solveResult.deterministicCheck.evaluated ?? '', language)})`
                          : `Verified deterministically (= ${solveResult.deterministicCheck.evaluated})`
                        : `${isBn ? 'সংখ্যাত্মক যাচাই' : 'Numeric check'}: ${toBnNum(solveResult.deterministicCheck.evaluated ?? '', language)}`}
                    </div>
                  )}
                </div>

                {solveResult.alternativeMethod && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>{isBn ? 'বিকল্প পদ্ধতি:' : 'Alternative Method:'}</strong>{' '}
                    <MathRenderer content={solveResult.alternativeMethod} />
                  </p>
                )}
                {solveResult.similarPracticeProblem && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-300">
                    <strong>{isBn ? 'অনুরূপ অনুশীলন:' : 'Try Similar Problem:'}</strong>{' '}
                    <MathRenderer content={solveResult.similarPracticeProblem} />
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
