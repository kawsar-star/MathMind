import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  GlossaryExplanation,
  requestGlossaryExplanation,
} from '../services/aiService';
import { GlossaryDrawer } from '../components/glossary/GlossaryDrawer';

export interface GlossaryHistoryItem {
  term: string;
  contextSnippet?: string;
  sourceLabel?: string;
  explanation: GlossaryExplanation;
  timestamp: number;
}

interface GlossaryContextValue {
  isOpen: boolean;
  activeTerm: string;
  activeContext: string;
  activeSourceLabel: string;
  activeViewLabel: string;
  setActiveViewLabel: (label: string) => void;
  loading: boolean;
  error: string | null;
  explanation: GlossaryExplanation | null;
  history: GlossaryHistoryItem[];
  inlineHighlightEnabled: boolean;
  toggleInlineHighlights: () => void;
  openGlossary: () => void;
  closeGlossary: () => void;
  lookupTerm: (term: string, contextSnippet?: string, sourceLabel?: string) => Promise<void>;
  retryLookup: () => Promise<void>;
  clearActiveExplanation: () => void;
}

const GlossaryContext = createContext<GlossaryContextValue | null>(null);

interface SelectionPromptState {
  text: string;
  contextSnippet: string;
  x: number;
  y: number;
}

function makeCacheKey(
  term: string,
  grade: string,
  language: string,
  contextSnippet?: string
): string {
  const normTerm = term.trim().toLowerCase();
  const normCtx = (contextSnippet || '').trim().slice(0, 180).toLowerCase();
  return `${normTerm}::${grade}::${language}::${normCtx}`;
}

export const GlossaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, studyMedium, studentProfile } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const grade = studentProfile?.grade || 'Grade 6';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState('');
  const [activeContext, setActiveContext] = useState('');
  const [activeSourceLabel, setActiveSourceLabel] = useState('');
  const [activeViewLabel, setActiveViewLabel] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<GlossaryExplanation | null>(null);
  const [history, setHistory] = useState<GlossaryHistoryItem[]>([]);
  const [inlineHighlightEnabled, setInlineHighlightEnabled] = useState(true);

  const [selectionPrompt, setSelectionPrompt] = useState<SelectionPromptState | null>(null);

  const cacheRef = useRef<Map<string, GlossaryExplanation>>(new Map());
  const requestSeqRef = useRef(0);

  const lookupTerm = useCallback(
    async (rawTerm: string, contextSnippet = '', sourceLabel = '') => {
      const term = rawTerm.trim().slice(0, 140);
      if (!term) return;

      const cleanContext = contextSnippet.trim().slice(0, 1000);
      const effectiveSource = sourceLabel || activeViewLabel;

      setSelectionPrompt(null);
      setActiveTerm(term);
      setActiveContext(cleanContext);
      setActiveSourceLabel(effectiveSource);
      setError(null);
      setIsOpen(true);

      const cacheKey = makeCacheKey(term, grade, language, cleanContext);
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setExplanation(cached);
        setLoading(false);
        setHistory((prev) => {
          const filtered = prev.filter(
            (item) =>
              !(
                item.term.toLowerCase() === term.toLowerCase() &&
                (item.contextSnippet || '') === cleanContext
              )
          );
          return [
            {
              term,
              contextSnippet: cleanContext,
              sourceLabel: effectiveSource,
              explanation: cached,
              timestamp: Date.now(),
            },
            ...filtered,
          ].slice(0, 14);
        });
        return;
      }

      const seq = ++requestSeqRef.current;
      setLoading(true);
      setExplanation(null);

      try {
        const result = await requestGlossaryExplanation({
          term,
          context: cleanContext || undefined,
          sourceLabel: effectiveSource || undefined,
          grade,
          studyMedium,
          language,
        });

        if (requestSeqRef.current !== seq) return;

        cacheRef.current.set(cacheKey, result);
        setExplanation(result);
        setHistory((prev) => {
          const filtered = prev.filter(
            (item) =>
              !(
                item.term.toLowerCase() === term.toLowerCase() &&
                (item.contextSnippet || '') === cleanContext
              )
          );
          return [
            {
              term,
              contextSnippet: cleanContext,
              sourceLabel: effectiveSource,
              explanation: result,
              timestamp: Date.now(),
            },
            ...filtered,
          ].slice(0, 14);
        });
      } catch (err) {
        if (requestSeqRef.current !== seq) return;
        const msg =
          err instanceof Error
            ? err.message
            : language === 'bn'
            ? 'ব্যাখ্যা লোড করা যায়নি।'
            : 'Unable to load AI explanation.';
        setError(msg);
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
        }
      }
    },
    [activeViewLabel, grade, language, studyMedium]
  );

  const retryLookup = useCallback(async () => {
    if (!activeTerm) return;
    await lookupTerm(activeTerm, activeContext, activeSourceLabel);
  }, [activeContext, activeSourceLabel, activeTerm, lookupTerm]);

  const openGlossary = useCallback(() => {
    setSelectionPrompt(null);
    setIsOpen(true);
  }, []);

  const closeGlossary = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearActiveExplanation = useCallback(() => {
    setActiveTerm('');
    setActiveContext('');
    setActiveSourceLabel('');
    setExplanation(null);
    setError(null);
    setLoading(false);
  }, []);

  const toggleInlineHighlights = useCallback(() => {
    setInlineHighlightEnabled((prev) => !prev);
  }, []);

  // Close drawer on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Text selection quick-lookup floating trigger across the app workspace
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionPrompt(null);
        return;
      }

      const raw = sel.toString().replace(/\s+/g, ' ').trim();
      if (raw.length < 2 || raw.length > 52) {
        setSelectionPrompt(null);
        return;
      }

      const words = raw.split(/\s+/);
      if (words.length > 5) {
        setSelectionPrompt(null);
        return;
      }

      const anchorNode = sel.anchorNode;
      const anchorEl =
        anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : anchorNode?.parentElement;

      if (!anchorEl) {
        setSelectionPrompt(null);
        return;
      }

      // Ignore selections inside inputs, textareas, selects, or inside the glossary drawer itself
      if (
        anchorEl.closest('input, textarea, select, [data-glossary-drawer="true"]')
      ) {
        setSelectionPrompt(null);
        return;
      }

      // Only trigger inside main workspace content
      if (!anchorEl.closest('main')) {
        setSelectionPrompt(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setSelectionPrompt(null);
        return;
      }

      const containerEl = anchorEl.closest('p, li, div, section') || anchorEl;
      const contextSnippet = (containerEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600);

      const x = Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120);
      const y = Math.max(rect.top - 12, 76);

      setSelectionPrompt({
        text: raw,
        contextSnippet,
        x,
        y,
      });
    };

    const handleScrollOrMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-glossary-selection-pill="true"]')) return;
      setSelectionPrompt(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleScrollOrMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleScrollOrMouseDown);
    };
  }, []);

  const value = useMemo<GlossaryContextValue>(
    () => ({
      isOpen,
      activeTerm,
      activeContext,
      activeSourceLabel,
      activeViewLabel,
      setActiveViewLabel,
      loading,
      error,
      explanation,
      history,
      inlineHighlightEnabled,
      toggleInlineHighlights,
      openGlossary,
      closeGlossary,
      lookupTerm,
      retryLookup,
      clearActiveExplanation,
    }),
    [
      activeContext,
      activeSourceLabel,
      activeTerm,
      activeViewLabel,
      clearActiveExplanation,
      closeGlossary,
      error,
      explanation,
      history,
      inlineHighlightEnabled,
      isOpen,
      loading,
      lookupTerm,
      openGlossary,
      retryLookup,
      toggleInlineHighlights,
    ]
  );

  return (
    <GlossaryContext.Provider value={value}>
      {children}

      {/* Floating Selection Quick-Explain Action */}
      <AnimatePresence>
        {selectionPrompt && !isOpen && (
          <motion.button
            type="button"
            data-glossary-selection-pill="true"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.94 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            style={{
              left: `${selectionPrompt.x}px`,
              top: `${selectionPrompt.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={() => {
              const { text, contextSnippet } = selectionPrompt;
              window.getSelection()?.removeAllRanges();
              lookupTerm(text, contextSnippet, activeViewLabel);
            }}
            className="fixed z-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-300/60 bg-gradient-to-r from-sky-600 via-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-[0_12px_28px_-8px_rgba(124,58,237,0.55)] backdrop-blur-md hover:brightness-110 transition-all whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span>
              {language === 'bn'
                ? `শব্দকোষে ব্যাখ্যা দেখো: “${selectionPrompt.text}”`
                : `Explain “${selectionPrompt.text}”`}
            </span>
            <Sparkles className="w-3 h-3 text-cyan-200 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      <GlossaryDrawer />
    </GlossaryContext.Provider>
  );
};

export function useGlossary(): GlossaryContextValue {
  const ctx = useContext(GlossaryContext);
  if (!ctx) {
    throw new Error('useGlossary must be used within a GlossaryProvider');
  }
  return ctx;
}

export function useOptionalGlossary(): GlossaryContextValue | null {
  return useContext(GlossaryContext);
}
