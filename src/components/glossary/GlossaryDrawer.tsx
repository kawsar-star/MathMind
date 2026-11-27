import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Compass,
  Eye,
  EyeOff,
  History,
  Lightbulb,
  RefreshCw,
  Search,
  Sigma,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGlossary } from '../../context/GlossaryContext';
import { getGradeLabel, toBnNum } from '../../i18n/translations';
import {
  GLOSSARY_DOMAINS,
  GlossaryDomainId,
  MATH_GLOSSARY_TERMS,
  getDisplayTerm,
} from '../../data/mathGlossaryTerms';
import { MathRenderer } from '../common/MathRenderer';

export const GlossaryDrawer: React.FC = () => {
  const { language, studentProfile } = useAuth();
  const {
    isOpen,
    activeTerm,
    activeContext,
    activeSourceLabel,
    loading,
    error,
    explanation,
    history,
    inlineHighlightEnabled,
    toggleInlineHighlights,
    closeGlossary,
    lookupTerm,
    retryLookup,
    clearActiveExplanation,
  } = useGlossary();

  const prefersReducedMotion = useReducedMotion();
  const isBn = language === 'bn';
  const gradeLabel = studentProfile?.grade
    ? getGradeLabel(studentProfile.grade, language)
    : isBn
    ? '৬ষ্ঠ শ্রেণি'
    : 'Grade 6';

  const [searchInput, setSearchInput] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<GlossaryDomainId | 'all'>('all');

  const filteredTerms = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return MATH_GLOSSARY_TERMS.filter((entry) => {
      if (selectedDomain !== 'all' && entry.domainId !== selectedDomain) return false;
      if (!q) return true;
      return (
        entry.termEn.toLowerCase().includes(q) ||
        entry.termBn.toLowerCase().includes(q) ||
        entry.domainEn.toLowerCase().includes(q) ||
        entry.domainBn.toLowerCase().includes(q) ||
        (entry.aliasesEn ?? []).some((a) => a.toLowerCase().includes(q)) ||
        (entry.aliasesBn ?? []).some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [searchInput, selectedDomain]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    lookupTerm(q, activeContext, activeSourceLabel);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end print:hidden"
          data-glossary-drawer="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeGlossary}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
          />

          {/* 3D Glass Slide-Over Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={isBn ? 'গাণিতিক শব্দকোষ' : 'Mathematical Glossary'}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 36 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl h-full flex flex-col border-l border-slate-200/80 dark:border-slate-800/80 glass-panel-3d shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 student-hero-gradient flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-sm flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate font-display">
                    {isBn ? 'ইন্টারেক্টিভ গাণিতিক শব্দকোষ' : 'Interactive Mathematical Glossary'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isBn
                      ? `এআই প্রসঙ্গ-ভিত্তিক ব্যাখ্যা · ${gradeLabel}`
                      : `AI Context-Aware Explanations · ${gradeLabel}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleInlineHighlights}
                  title={
                    isBn
                      ? 'প্রশ্নের ভেতর ক্লিকযোগ্য শব্দ চালু/বন্ধ করুন'
                      : 'Toggle clickable math terms inside questions & lessons'
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    inlineHighlightEnabled
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {inlineHighlightEnabled ? (
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {isBn ? 'শব্দ লিংক' : 'Term Links'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={closeGlossary}
                  aria-label={isBn ? 'শব্দকোষ বন্ধ করুন' : 'Close glossary'}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search / Ask Any Math Term */}
            <div className="px-5 py-3 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/35 shrink-0">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={
                      isBn
                        ? 'যেকোনো গাণিতিক শব্দ লিখুন (যেমন: নিশ্চায়ক, ল.সা.গু, Fraction)...'
                        : 'Ask any math term (e.g., discriminant, hypotenuse, ভগ্নাংশ)...'
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/75 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchInput.trim() || loading}
                  className="px-3.5 py-2 rounded-xl disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 glass-btn-violet whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isBn ? 'ব্যাখ্যা দেখো' : 'Explain'}
                </button>
              </form>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'টিপস: অ্যাপের যেকোনো প্রশ্নে ডটেড-আন্ডারলাইন করা গণিত শব্দে ক্লিক করুন অথবা টেক্সট সিলেক্ট করুন।'
                  : 'Tip: Click any dotted-underlined math term or highlight any phrase anywhere in the app.'}
              </p>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Active Term / AI Explanation View */}
              {activeTerm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={clearActiveExplanation}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      {isBn ? 'সব শব্দ দেখুন' : 'Browse Glossary Index'}
                    </button>

                    {activeSourceLabel && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {isBn ? `উৎস: ${activeSourceLabel}` : `From: ${activeSourceLabel}`}
                      </span>
                    )}
                  </div>

                  {/* Captured Context Snippet */}
                  {activeContext && (
                    <div className="p-3 rounded-xl glass-tile-3d border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        {isBn ? 'যে প্রসঙ্গ থেকে ক্লিক করেছেন' : 'Captured Context'}
                      </p>
                      <p className="line-clamp-3 leading-relaxed">
                        <MathRenderer content={activeContext} interactiveGlossary={false} />
                      </p>
                    </div>
                  )}

                  {/* Loading Skeleton */}
                  {loading && (
                    <div className="p-5 rounded-2xl glass-tile-3d border space-y-4 animate-pulse">
                      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>
                          {isBn
                            ? `“${activeTerm}”-এর জন্য এআই ব্যাখ্যা তৈরি হচ্ছে...`
                            : `Generating context-aware explanation for “${activeTerm}”...`}
                        </span>
                      </div>
                      <div className="h-5 w-2/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-full rounded bg-slate-200/70 dark:bg-slate-800/70" />
                        <div className="h-3.5 w-5/6 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="h-20 rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
                        <div className="h-20 rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {error && !loading && (
                    <div className="p-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-700 dark:text-rose-200 space-y-1">
                          <p className="font-semibold">
                            {isBn
                              ? 'এআই শব্দকোষ ব্যাখ্যা পাওয়া যায়নি'
                              : 'Could not generate AI glossary explanation'}
                          </p>
                          <p className="opacity-90">{error}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={retryLookup}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
                      </button>
                    </div>
                  )}

                  {/* Rendered AI Explanation */}
                  {explanation && !loading && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Title & Definition Card */}
                      <div className="p-5 rounded-2xl glass-tile-3d border border-cyan-500/25 space-y-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                              {explanation.term || activeTerm}
                            </h3>
                            {explanation.termAlt && (
                              <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-0.5">
                                {explanation.termAlt}
                              </p>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {[explanation.domain, explanation.levelTag].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                          <MathRenderer
                            content={explanation.definition}
                            interactiveGlossary={false}
                          />
                        </div>
                      </div>

                      {/* Context Connection */}
                      {explanation.contextConnection && (
                        <div className="p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/8 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                            <Compass className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {activeContext
                                ? isBn
                                  ? 'বর্তমান প্রশ্নে এর ব্যবহার'
                                  : 'How It Connects Here'
                                : isBn
                                ? 'কখন ও কেন এটি লাগে'
                                : 'When You Use This'}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            <MathRenderer
                              content={explanation.contextConnection}
                              interactiveGlossary={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Formula / Rule */}
                      {explanation.formulaOrRule && (
                        <div className="p-4 rounded-2xl glass-tile-3d border space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                            <Sigma className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span>{isBn ? 'মূল সূত্র ও নিয়ম' : 'Key Formula & Rule'}</span>
                          </div>
                          <div className="text-sm text-slate-900 dark:text-white font-medium pt-0.5">
                            <MathRenderer
                              content={explanation.formulaOrRule}
                              interactiveGlossary={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Analogy & Worked Example */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {explanation.everydayExample && (
                          <div className="p-4 rounded-2xl glass-tile-3d border space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                              <span>{isBn ? 'বাস্তব উদাহরণ' : 'Everyday Analogy'}</span>
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <MathRenderer
                                content={explanation.everydayExample}
                                interactiveGlossary={false}
                              />
                            </div>
                          </div>
                        )}

                        {explanation.workedExample && (
                          <div className="p-4 rounded-2xl glass-tile-3d border space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span>{isBn ? 'গাণিতিক উদাহরণ' : 'Worked Example'}</span>
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <MathRenderer
                                content={explanation.workedExample}
                                interactiveGlossary={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Common Mistake */}
                      {explanation.commonMistake && (
                        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{isBn ? 'সতর্কতা (সাধারণ ভুল)' : 'Watch Out (Common Mistake)'}</span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                            <MathRenderer
                              content={explanation.commonMistake}
                              interactiveGlossary={false}
                            />
                          </div>
                        </div>
                      )}

                      {/* Clickable Related Terms */}
                      {explanation.relatedTerms && explanation.relatedTerms.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {isBn
                              ? 'সম্পর্কিত ধারণা (ক্লিক করে জানুন)'
                              : 'Related Concepts (click to explore)'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {explanation.relatedTerms.map((rel) => (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => lookupTerm(rel, activeContext, activeSourceLabel)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 glass-tile-3d hover:border-cyan-500/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors whitespace-nowrap"
                              >
                                {rel}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Index & Recent Lookups View */
                <div className="space-y-5">
                  {/* Recent History */}
                  {history.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <History className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{isBn ? 'সাম্প্রতিক খোঁজা শব্দ' : 'Recent Lookups'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {history.map((item, idx) => (
                          <button
                            key={`${item.term}-${idx}`}
                            type="button"
                            onClick={() =>
                              lookupTerm(item.term, item.contextSnippet, item.sourceLabel)
                            }
                            className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/8 hover:bg-cyan-500/15 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition-colors whitespace-nowrap"
                          >
                            {item.explanation.term || item.term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Domain Filter Controls */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isBn ? 'অধ্যায় অনুযায়ী বাছাই করুন' : 'Filter by Math Domain'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GLOSSARY_DOMAINS.map((dom) => {
                        const active = selectedDomain === dom.id;
                        return (
                          <button
                            key={dom.id}
                            type="button"
                            onClick={() => setSelectedDomain(dom.id)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                              active
                                ? 'border-violet-500 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-cyan-500/40'
                            }`}
                          >
                            {isBn ? dom.labelBn : dom.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Curated Index Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {isBn ? 'গুরুত্বপূর্ণ গাণিতিক পরিভাষা' : 'Essential Math Terms'}
                      </span>
                      <span className="tabular-nums">
                        {isBn
                          ? `${toBnNum(filteredTerms.length, 'bn')}টি পরিভাষা`
                          : `${filteredTerms.length} terms`}
                      </span>
                    </div>

                    {filteredTerms.length === 0 ? (
                      <div className="p-5 rounded-2xl glass-tile-3d border text-center space-y-2.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {isBn
                            ? `তালিকায় “${searchInput}” পাওয়া যায়নি — এআই দিয়ে সরাসরি ব্যাখ্যা দেখতে নিচের বাটনে ক্লিক করুন।`
                            : `“${searchInput}” isn't in the quick list yet — ask AI to explain it right now.`}
                        </p>
                        <button
                          type="button"
                          onClick={() => lookupTerm(searchInput, activeContext, activeSourceLabel)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold glass-btn-violet whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isBn
                            ? `“${searchInput}” ব্যাখ্যা করো`
                            : `Explain “${searchInput}” with AI`}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {filteredTerms.map((entry, idx) => {
                          const accents = [
                            'hover:border-sky-500/60',
                            'hover:border-violet-500/60',
                            'hover:border-emerald-500/60',
                            'hover:border-amber-500/60',
                          ];
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() =>
                                lookupTerm(
                                  getDisplayTerm(entry, language),
                                  activeContext,
                                  activeSourceLabel
                                )
                              }
                              className={`p-3 rounded-xl glass-tile-3d border text-left transition-all group ${accents[idx % accents.length]}`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                  {isBn ? entry.termBn : entry.termEn}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                                  {toBnNum(entry.gradeBand, language)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {isBn ? entry.termEn : entry.termBn} ·{' '}
                                {isBn ? entry.domainBn : entry.domainEn}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
