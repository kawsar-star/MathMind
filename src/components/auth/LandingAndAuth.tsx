import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  Compass,
  Copy,
  Globe,
  Layers,
  Moon,
  ShieldCheck,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firebaseRuntimeInfo } from '../../firebase/config';
import { t } from '../../i18n/translations';
import { AmbientGlassBackdrop, GlassSurface3D } from '../common/GlassSurface3D';
import { useToast } from '../common/ToastContext';

const HERO_IMAGE = '/src/assets/images/hero_mathmind_geometry_1795441766462.jpg';

interface AuthErrorDiagnostic {
  code: string;
  title: string;
  summary: string;
  steps: string[];
  rawMessage: string;
}

function buildAuthDiagnostic(
  err: unknown,
  language: 'en' | 'bn',
  hostname: string
): AuthErrorDiagnostic {
  const errObj = err as { code?: string; message?: string } | null;
  const rawMessage =
    err instanceof Error
      ? err.message
      : errObj?.message || 'Sign-in was cancelled or failed.';
  const codeMatch = rawMessage.match(/\((auth\/[a-z-]+)\)/i);
  const code = errObj?.code || codeMatch?.[1] || 'auth/unknown';
  const isBn = language === 'bn';

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      title: isBn
        ? 'ডোমেইনটি Firebase-এ অনুমোদিত নয় (auth/unauthorized-domain)'
        : 'Hosting Domain Not Authorized in Firebase (auth/unauthorized-domain)',
      summary: isBn
        ? `আপনার সাইট "${hostname}" থেকে Google Sign-In চালু করতে এই ডোমেইনটি Firebase Authentication-এ অনুমোদন করতে হবে অথবা আপনার নিজস্ব ফ্রি Firebase Spark প্রজেক্ট যুক্ত করতে হবে।`
        : `Google Sign-In is blocked from "${hostname}" because this Netlify domain is not listed in Firebase Authentication → Authorized domains.`,
      steps: isBn
        ? [
            `আপনার নিজস্ব Firebase Console খুলুন → Authentication → Settings → Authorized domains → "${hostname}" যোগ করুন।`,
            `যদি এটি ডিফল্ট AI Studio Starter প্রজেক্ট (${firebaseRuntimeInfo.projectId}) হয়, তবে console.firebase.google.com থেকে ২ মিনিটে একটি ফ্রি Firebase Spark প্রজেক্ট (কার্ড ছাড়াই) তৈরি করুন, Google Sign-In ও Firestore চালু করুন এবং firestore.rules আপলোড করুন।`,
            'এরপর Netlify → Site configuration → Environment variables-এ আপনার প্রজেক্টের VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID ও VITE_FIREBASE_APP_ID বসিয়ে Re-deploy করুন।',
          ]
        : [
            `Open Firebase Console → Authentication → Settings → Authorized domains and add "${hostname}".`,
            `If using the default AI Studio starter project (${firebaseRuntimeInfo.projectId}) without Console admin access, create your own free Firebase Spark project (no card required), enable Google Sign-In + Firestore, and deploy firestore.rules.`,
            'Then add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID in Netlify Environment Variables and trigger a redeploy.',
          ],
      rawMessage,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: isBn
        ? 'ব্রাউজার লগইন পপ-আপ ব্লক করেছে (auth/popup-blocked)'
        : 'Sign-In Popup Blocked by Browser (auth/popup-blocked)',
      summary: isBn
        ? 'আপনার ব্রাউজার Google Sign-In পপ-আপ উইন্ডোটি আটকে দিয়েছে। অ্যাড্রেস বার থেকে পপ-আপ Allow করে আবার চেষ্টা করুন।'
        : 'Your browser blocked the Google Sign-In popup window. Allow popups for this site and click Sign In again.',
      steps: isBn
        ? ['ব্রাউজার অ্যাড্রেস বারের ডানদিকে popup blocked আইকনে ক্লিক করে Always allow নির্বাচন করুন।']
        : ['Click the popup-blocked icon in your browser address bar, select Always allow, and retry.'],
      rawMessage,
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      title: isBn
        ? 'Firebase-এ Google Sign-In চালু নেই (auth/operation-not-allowed)'
        : 'Google Sign-In Provider Disabled (auth/operation-not-allowed)',
      summary: isBn
        ? 'আপনার Firebase প্রজেক্টে Google Sign-In পদ্ধতি এখনো সক্রিয় করা হয়নি।'
        : 'Google Sign-In is not enabled in the connected Firebase project.',
      steps: isBn
        ? ['Firebase Console → Authentication → Sign-in method → Add new provider → Google নির্বাচন করে Enable করুন।']
        : ['Go to Firebase Console → Authentication → Sign-in method → Google and click Enable.'],
      rawMessage,
    };
  }

  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
    return {
      code,
      title: isBn
        ? `Firebase কনফিগারেশন ত্রুটি (${code})`
        : `Invalid Firebase Configuration (${code})`,
      summary: isBn
        ? 'Netlify Environment Variables-এ দেওয়া Firebase Key বা Auth কনফিগারেশন সঠিক নয়।'
        : 'The Firebase Web SDK keys configured in Netlify Environment Variables appear incomplete or invalid.',
      steps: isBn
        ? ['Netlify → Site configuration → Environment variables-এ VITE_FIREBASE_* মানগুলো যাচাই করে নতুন Build/Deploy করুন।']
        : ['Verify VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID in Netlify Environment Variables and redeploy.'],
      rawMessage,
    };
  }

  return {
    code,
    title: isBn ? 'সাইন-ইন সম্পন্ন করা যায়নি' : 'Could Not Complete Sign-In',
    summary: rawMessage,
    steps: [],
    rawMessage,
  };
}

export const LandingAndAuth: React.FC = () => {
  const { signInWithGoogle, firestoreOnline, language, setLanguage, theme, setTheme } = useAuth();
  const { showToast } = useToast();
  const [signingIn, setSigningIn] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDiagnostic | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : 'your-site.netlify.app';

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      showToast(language === 'bn' ? 'ম্যাথমাইন্ড এআই-তে প্রবেশ সফল হয়েছে' : 'Signed in to MATHMIND AI', 'success');
    } catch (err) {
      const errObj = err as { code?: string } | null;
      const diagnostic = buildAuthDiagnostic(err, language, currentHostname);
      // Ignore silent toast if user simply closed popup manually without another error
      if (errObj?.code !== 'auth/popup-closed-by-user') {
        setAuthError(diagnostic);
      }
      showToast(diagnostic.title, 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      showToast(currentHostname, 'info');
    }
  };

  const isBn = language === 'bn';
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 flex flex-col">
      <AmbientGlassBackdrop />

      {/* Three-Zone Top Bar Contract */}
      <header className="w-full border-b border-slate-200/75 dark:border-slate-800/70 glass-chrome sticky top-0 z-30 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_8px_28px_-12px_rgba(2,6,23,0.7)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            {t(language, 'brand')}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#engine" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
              {isBn ? 'অ্যাডাপ্টিভ ইঞ্জিন' : 'Adaptive Engine'}
            </a>
            <a href="#remedial" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
              {isBn ? 'সংশোধনমূলক এআই' : 'Remedial AI'}
            </a>
            <a href="#olympiad" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
              {isBn ? 'অলিম্পিয়াড এরিনা' : 'Olympiad Arena'}
            </a>
            <a href="#portals" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">
              {isBn ? 'শিক্ষক ও অভিভাবক পোর্টাল' : 'Educator Portals'}
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold glass-btn-3d whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {signingIn ? (isBn ? 'সংযুক্ত হচ্ছে...' : 'Connecting...') : t(language, 'signInGoogle')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Split */}
      <main id="top" className="relative z-10 flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16">
          {/* Workspace utility strip below header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <p className="text-xs font-medium text-indigo-700 dark:text-cyan-300">
              {isBn
                ? 'অ্যাডাপ্টিভ গণিত বিশ্লেষণ · ১২টি ডোমেইন · এনসিটিবি ও আন্তর্জাতিক পাঠ্যক্রম'
                : 'Adaptive Mathematics Intelligence · 12 Domains · NCTB & International Curricula'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-300/70 dark:border-violet-700/60 bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-violet-500" />
                {language === 'en' ? 'বাংলা / EN' : 'EN / বাংলা'}
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={isBn ? 'থিম পরিবর্তন করুন' : 'Toggle color theme'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300/70 dark:border-amber-700/50 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                {theme === 'dark' ? (isBn ? 'লাইট' : 'Light') : isBn ? 'ডার্ক' : 'Dark'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-wide text-cyan-600 dark:text-cyan-400 mb-3">
                {isBn
                  ? 'অ্যাডাপ্টিভ মূল্যায়ন · দক্ষতা অর্জন · অলিম্পিয়াড প্রস্তুতি'
                  : 'Adaptive Diagnostics · Remedial Mastery · Olympiad Training'}
              </p>
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-5 font-display"
                style={{ textWrap: 'balance' }}
              >
                {isBn
                  ? 'গাণিতিক সম্ভাবনা আবিষ্কার করুন। শেখার ঘাটতি দূর করুন।'
                  : 'Discover Mathematical Potential. Diagnose Learning Gaps.'}
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-8">
                {isBn
                  ? 'ম্যাথমাইন্ড এআই ১২টি গাণিতিক ডোমেইনে শিক্ষার্থীর ধারণাগত দক্ষতা পরিমাপ করে, উত্তরের প্রমাণ থেকে মূল ভুলগুলো চিহ্নিত করে, ব্যক্তিগত শেখার পথ তৈরি করে এবং প্রাথমিক পর্যায় থেকে অলিম্পিয়াড পর্যন্ত পথনির্দেশ করে।'
                  : 'MATHMIND AI measures conceptual understanding across 12 mathematical domains, isolates root misconceptions with evidence from actual responses, builds personalized remedial paths, and coaches learners from foundational fluency to Olympiad proof.'}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm glass-btn-3d disabled:opacity-60 whitespace-nowrap"
                >
                  {signingIn ? (isBn ? 'প্রবেশ করছে...' : 'Signing in...') : t(language, 'signInGoogle')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#engine"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-tile-3d border border-indigo-400/40 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:border-indigo-500 whitespace-nowrap"
                >
                  {isBn ? 'প্ল্যাটফর্মের সুবিধাসমূহ দেখুন' : 'Explore Platform Architecture'}
                </a>
              </div>

              {(!firestoreOnline || authError) && (
                <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {authError
                            ? authError.title
                            : language === 'bn'
                            ? 'Firebase Firestore সংযোগ অফলাইন বা কনফিগারেশন সমস্যা'
                            : 'Firebase Firestore Connection Offline'}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {authError
                            ? authError.summary
                            : language === 'bn'
                            ? `Firebase প্রজেক্ট (${firebaseRuntimeInfo.projectId})-এ সংযোগ করা যাচ্ছে না। আপনার ইন্টারনেট বা Firestore ডাটাবেস সেটআপ যাচাই করুন।`
                            : `Unable to reach Firestore on project "${firebaseRuntimeInfo.projectId}". Check Firestore database initialization and network access.`}
                        </p>
                      </div>
                    </div>
                    {authError && (
                      <button
                        type="button"
                        onClick={() => setAuthError(null)}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                        aria-label={isBn ? 'ত্রুটি বার্তা বন্ধ করুন' : 'Dismiss error'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {authError?.code === 'auth/unauthorized-domain' && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 px-3 py-2">
                      <span className="text-xs font-mono text-slate-800 dark:text-cyan-300 break-all">
                        {currentHostname}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
                      >
                        {copiedHost ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            {language === 'bn' ? 'কপি হয়েছে' : 'Copied'}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {language === 'bn' ? 'ডোমেইন কপি করুন' : 'Copy Domain'}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {authError && authError.steps.length > 0 && (
                    <ol className="mt-3 space-y-1.5 pl-4 list-decimal text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {authError.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </motion.div>

            <div className="lg:col-span-6">
              <GlassSurface3D tiltMaxDeg={3} hoverLift={false} className="h-full min-h-[320px] rounded-2xl bg-[#0B1222]">
                {!imgFailed ? (
                  <img
                    src={HERO_IMAGE}
                    alt="Isometric geometric polyhedra and golden ratio spiral on coordinate plane"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0B1222] via-[#111C35] to-[#082F49] text-center">
                    <Compass className="w-12 h-12 text-cyan-400 mb-3 animate-float-gentle" />
                    <p className="text-sm font-semibold text-slate-200">
                      {isBn ? 'ম্যাথমাইন্ড এআই স্থানিক ইঞ্জিন' : 'MATHMIND AI Spatial Engine'}
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent backdrop-blur-[2px]">
                  <p className="text-xs text-cyan-300 font-medium">
                    {isBn
                      ? 'কম্পিউটার অ্যাডাপ্টিভ মূল্যায়ন · তাৎক্ষণিক KaTeX রেন্ডারিং · প্রমাণভিত্তিক ভুল নির্ণয়'
                      : 'Computer Adaptive Assessment · Real-Time KaTeX Rendering · Evidence-Based Diagnosis'}
                  </p>
                </div>
              </GlassSurface3D>
            </div>
          </div>

          {/* 4-column capability strip in full-width row below hero split */}
          <div id="engine" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            <GlassSurface3D delay={0.04} className="p-5 rounded-2xl border-cyan-500/25 bg-gradient-to-br from-sky-500/8 to-transparent">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center mb-3">
                <Compass className="w-5 h-5 text-sky-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                {isBn ? '১২-ডোমেইন অ্যাডাপ্টিভ ইঞ্জিন' : '12-Domain Adaptive Engine'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isBn
                  ? 'সংখ্যাবোধ থেকে স্থানিক যুক্তি পর্যন্ত ৫টি স্তরে শিক্ষার্থীর দক্ষতা অনুযায়ী প্রশ্নের মান স্বয়ংক্রিয়ভাবে সমন্বয় হয়।'
                  : 'Difficulty adapts dynamically across 5 levels from Number Sense to Spatial Reasoning.'}
              </p>
            </GlassSurface3D>
            <GlassSurface3D delay={0.08} className="p-5 rounded-2xl border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-transparent">
              <div id="remedial">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-3">
                  <Brain className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  {isBn ? 'এআই ভুল নির্ণায়ক' : 'AI Error Diagnostician'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isBn
                    ? 'উত্তরের প্রমাণ উল্লেখ করে ধারণাগত, প্রক্রিয়াগত ও হিসাবের ভুলগুলো আলাদাভাবে চিহ্নিত করে।'
                    : 'Classifies conceptual vs procedural vs calculation gaps with cited response evidence.'}
                </p>
              </div>
            </GlassSurface3D>
            <GlassSurface3D delay={0.12} className="p-5 rounded-2xl border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 to-transparent">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                {isBn ? 'ইন্টারেক্টিভ গণিত ল্যাব' : 'Interactive Math Lab'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isBn
                  ? 'হাতে-কলমে শেখার জন্য বীজগণিতের দাঁড়িপাল্লা, ভগ্নাংশ বার, জ্যামিতি বোর্ড ও সম্ভাবনা সিমুলেটর।'
                  : 'Hands-on algebra balance scales, fraction bars, geometry boards, and probability sims.'}
              </p>
            </GlassSurface3D>
            <GlassSurface3D delay={0.16} className="p-5 rounded-2xl border-amber-500/25 bg-gradient-to-br from-amber-500/8 to-transparent">
              <div id="olympiad">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  {isBn ? 'গণিত অলিম্পিয়াড এরিনা' : 'Math Olympiad Arena'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isBn
                    ? 'প্রতিযোগিতামূলক গণিতের জন্য ধাপে ধাপে এআই ইঙ্গিত ও যুক্তির মান যাচাই সুবিধা।'
                    : 'Progressive AI coach hints and reasoning-quality scoring across 9 competition categories.'}
                </p>
              </div>
            </GlassSurface3D>
          </div>

          {/* Educator & Institutional Security Section */}
          <section id="portals" className="mt-14 p-6 rounded-2xl border glass-panel-3d flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isBn
                    ? '৫টি আলাদা পোর্টাল · শিক্ষার্থীর গোপনীয়তা সর্বাগ্রে'
                    : 'Five Role-Isolated Portals · Child Privacy First'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {isBn
                  ? 'শিক্ষার্থী, শিক্ষক, অভিভাবক, স্কুল প্রধান ও অ্যাডমিনদের জন্য তৈরি'
                  : 'Built for Students, Teachers, Parents, School Leaders, and Curriculum Admins'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isBn
                  ? 'প্রতিটি শিক্ষার্থীর তথ্য কঠোর ফায়ারবেস নিরাপত্তা নিয়ম, পৃথক ডেটা সংরক্ষণ এবং স্বচ্ছ বিশ্লেষণী রিপোর্ট দ্বারা সুরক্ষিত।'
                  : 'Every student record is protected by strict Firestore security rules, isolated PII storage, deterministic math verification, and transparent benchmark reporting.'}
              </p>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-all hover:-translate-y-0.5 shadow-lg whitespace-nowrap shrink-0"
            >
              {isBn ? 'ওয়ার্কস্পেস চালু করুন' : 'Launch Workspace'}
            </button>
          </section>
        </section>
      </main>
    </div>
  );
};
