import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { toBnNum } from '../../i18n/translations';

export type BadgeEmblemVariant =
  | 'first_asmt'
  | 'remedial_master'
  | 'quiz_streak'
  | 'olympiad_thinker'
  | 'high_competency'
  | 'persistence'
  | 'three_day_streak';

export interface AchievementBadgeItem {
  id: BadgeEmblemVariant;
  title: string;
  desc: string;
  earned: boolean;
  current: number;
  target: number;
  metricText: string;
  formulaHint: string;
  tierLabel: string;
}

interface AchievementBadgesShowcaseProps {
  badges: AchievementBadgeItem[];
  userId?: string;
  isBn: boolean;
}

type FilterMode = 'all' | 'unlocked' | 'locked';

interface EmblemTheme {
  primary: string;
  secondary: string;
  glow: string;
  ring: string;
  text: string;
  surfaceTint: string;
  borderAccent: string;
}

const EMBLEM_THEMES: Record<BadgeEmblemVariant, EmblemTheme> = {
  first_asmt: {
    primary: '#06B6D4',
    secondary: '#0284C7',
    glow: 'rgba(6, 182, 212, 0.24)',
    ring: 'rgba(6, 182, 212, 0.45)',
    text: 'text-cyan-600 dark:text-cyan-400',
    surfaceTint: 'bg-cyan-50/70 dark:bg-cyan-950/20',
    borderAccent: 'border-cyan-300/80 dark:border-cyan-500/40',
  },
  remedial_master: {
    primary: '#10B981',
    secondary: '#059669',
    glow: 'rgba(16, 185, 129, 0.24)',
    ring: 'rgba(16, 185, 129, 0.45)',
    text: 'text-emerald-600 dark:text-emerald-400',
    surfaceTint: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    borderAccent: 'border-emerald-300/80 dark:border-emerald-500/40',
  },
  quiz_streak: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    glow: 'rgba(99, 102, 241, 0.24)',
    ring: 'rgba(99, 102, 241, 0.45)',
    text: 'text-indigo-600 dark:text-indigo-400',
    surfaceTint: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    borderAccent: 'border-indigo-300/80 dark:border-indigo-500/40',
  },
  olympiad_thinker: {
    primary: '#F59E0B',
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.25)',
    ring: 'rgba(245, 158, 11, 0.45)',
    text: 'text-amber-600 dark:text-amber-400',
    surfaceTint: 'bg-amber-50/70 dark:bg-amber-950/20',
    borderAccent: 'border-amber-300/80 dark:border-amber-500/40',
  },
  high_competency: {
    primary: '#0EA5E9',
    secondary: '#2563EB',
    glow: 'rgba(14, 165, 233, 0.24)',
    ring: 'rgba(14, 165, 233, 0.45)',
    text: 'text-sky-600 dark:text-sky-400',
    surfaceTint: 'bg-sky-50/70 dark:bg-sky-950/20',
    borderAccent: 'border-sky-300/80 dark:border-sky-500/40',
  },
  persistence: {
    primary: '#F43F5E',
    secondary: '#E11D48',
    glow: 'rgba(244, 63, 94, 0.24)',
    ring: 'rgba(244, 63, 94, 0.45)',
    text: 'text-rose-600 dark:text-rose-400',
    surfaceTint: 'bg-rose-50/70 dark:bg-rose-950/20',
    borderAccent: 'border-rose-300/80 dark:border-rose-500/40',
  },
  three_day_streak: {
    primary: '#F97316',
    secondary: '#EA580C',
    glow: 'rgba(249, 115, 22, 0.25)',
    ring: 'rgba(249, 115, 22, 0.45)',
    text: 'text-orange-600 dark:text-orange-400',
    surfaceTint: 'bg-orange-50/70 dark:bg-orange-950/20',
    borderAccent: 'border-orange-300/80 dark:border-orange-500/40',
  },
};

const MathematicalEmblem: React.FC<{
  variant: BadgeEmblemVariant;
  earned: boolean;
  size?: number;
}> = ({ variant, earned, size = 56 }) => {
  const theme = EMBLEM_THEMES[variant];
  const gradId = `emblem-grad-${variant}-${size}`;
  const strokeColor = earned ? `url(#${gradId})` : 'currentColor';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={earned ? '' : 'text-slate-400 dark:text-slate-600'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={theme.primary} />
          <stop offset="100%" stopColor={theme.secondary} />
        </linearGradient>
      </defs>

      {/* Outer octagonal architectural frame */}
      <polygon
        points="22,6 42,6 58,22 58,42 42,58 22,58 6,42 6,22"
        stroke={strokeColor}
        strokeWidth={earned ? 2.25 : 1.5}
        strokeDasharray={earned ? undefined : '4 3'}
        fill={earned ? theme.glow : 'transparent'}
      />

      {/* Inner calibrated circle */}
      <circle
        cx="32"
        cy="32"
        r="20"
        stroke={strokeColor}
        strokeWidth={1.25}
        strokeOpacity={earned ? 0.5 : 0.35}
      />

      {/* Badge-specific geometric symbol */}
      {variant === 'first_asmt' && (
        <g stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="16" y1="32" x2="48" y2="32" strokeOpacity={0.55} />
          <line x1="32" y1="16" x2="32" y2="48" strokeOpacity={0.55} />
          <polygon points="32,18 39,32 32,46 25,32" fill={earned ? theme.primary : 'none'} fillOpacity={earned ? 0.25 : 0} />
          <circle cx="32" cy="32" r="3" fill={earned ? theme.secondary : 'none'} />
        </g>
      )}

      {variant === 'remedial_master' && (
        <g stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 40 C22 25, 42 25, 46 40" />
          <polygon points="32,18 37,26 27,26" fill={earned ? theme.primary : 'none'} fillOpacity={earned ? 0.3 : 0} />
          <line x1="18" y1="40" x2="46" y2="40" />
          <line x1="25" y1="31" x2="25" y2="40" />
          <line x1="39" y1="31" x2="39" y2="40" />
        </g>
      )}

      {variant === 'quiz_streak' && (
        <g stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M42 20 H23 L35 32 L23 44 H42" />
          <circle cx="44" cy="20" r="1.5" fill={earned ? theme.primary : 'none'} />
          <circle cx="44" cy="44" r="1.5" fill={earned ? theme.secondary : 'none'} />
        </g>
      )}

      {variant === 'olympiad_thinker' && (
        <g stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {/* Golden ratio spiral & QED diamond */}
          <path d="M22 40 A14 14 0 0 1 36 26 A9 9 0 0 1 45 35 A5 5 0 0 1 40 40 A3 3 0 0 1 37 37" />
          <rect
            x="21"
            y="21"
            width="6"
            height="6"
            transform="rotate(45 24 24)"
            fill={earned ? theme.primary : 'none'}
            fillOpacity={earned ? 0.35 : 0}
          />
        </g>
      )}

      {variant === 'high_competency' && (
        <g stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {/* Crowned crystal polyhedron */}
          <polygon
            points="32,16 45,26 40,44 24,44 19,26"
            fill={earned ? theme.primary : 'none'}
            fillOpacity={earned ? 0.22 : 0}
          />
          <polyline points="19,26 32,31 45,26" />
          <line x1="32" y1="16" x2="32" y2="44" />
        </g>
      )}

      {variant === 'persistence' && (
        <g stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          {/* Mobius infinity loop */}
          <path d="M24 38 C18 38, 18 26, 24 26 C29 26, 35 38, 40 38 C46 38, 46 26, 40 26 C35 26, 29 38, 24 38 Z" />
        </g>
      )}

      {variant === 'three_day_streak' && (
        <g stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {/* Tri-harmonic orbital vectors */}
          <ellipse cx="32" cy="32" rx="15" ry="6.5" transform="rotate(30 32 32)" />
          <ellipse cx="32" cy="32" rx="15" ry="6.5" transform="rotate(-30 32 32)" />
          <ellipse cx="32" cy="32" rx="15" ry="6.5" transform="rotate(90 32 32)" />
          <circle cx="32" cy="32" r="3.2" fill={earned ? theme.primary : 'none'} />
        </g>
      )}
    </svg>
  );
};

const STORAGE_PREFIX = 'mathmind_seen_badges_';

function readSeenBadgeIds(storageKey: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

function writeSeenBadgeIds(storageKey: string, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export const AchievementBadgesShowcase: React.FC<AchievementBadgesShowcaseProps> = ({
  badges,
  userId,
  isBn,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const storageKey = `${STORAGE_PREFIX}${userId || 'guest'}`;

  const [filter, setFilter] = useState<FilterMode>('all');
  const [newlyEarnedIds, setNewlyEarnedIds] = useState<BadgeEmblemVariant[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<BadgeEmblemVariant | null>(null);
  const [replayNonceByBadge, setReplayNonceByBadge] = useState<Record<string, number>>({});
  const previousEarnedSetRef = useRef<Set<string> | null>(null);

  const earnedBadges = useMemo(() => badges.filter((b) => b.earned), [badges]);
  const lockedBadges = useMemo(() => badges.filter((b) => !b.earned), [badges]);

  // Detect newly earned badges across view visits (via localStorage) and live state transitions
  useEffect(() => {
    const currentEarnedIds = earnedBadges.map((b) => b.id);
    const seenFromStorage = readSeenBadgeIds(storageKey);

    let freshUnlocks: BadgeEmblemVariant[] = [];

    if (previousEarnedSetRef.current === null) {
      if (seenFromStorage === null) {
        // First time tracking badges for this account: celebrate currently earned badges once
        freshUnlocks = currentEarnedIds;
      } else {
        const seenSet = new Set(seenFromStorage);
        freshUnlocks = currentEarnedIds.filter((id) => !seenSet.has(id));
      }
      previousEarnedSetRef.current = new Set(currentEarnedIds);
    } else {
      const prevSet = previousEarnedSetRef.current;
      freshUnlocks = currentEarnedIds.filter((id) => !prevSet.has(id));
      previousEarnedSetRef.current = new Set(currentEarnedIds);
    }

    if (freshUnlocks.length > 0) {
      setNewlyEarnedIds((prev) => Array.from(new Set([...prev, ...freshUnlocks])));
    }

    // Persist seen IDs after a short settle delay so React StrictMode double-mount
    // does not swallow the initial unlock animation.
    const persistTimer = window.setTimeout(() => {
      const existing = readSeenBadgeIds(storageKey) || [];
      const merged = Array.from(new Set([...existing, ...currentEarnedIds]));
      writeSeenBadgeIds(storageKey, merged);
    }, 800);

    return () => window.clearTimeout(persistTimer);
  }, [earnedBadges, storageKey]);

  const filteredBadges = useMemo(() => {
    if (filter === 'unlocked') return earnedBadges;
    if (filter === 'locked') return lockedBadges;
    return badges;
  }, [badges, earnedBadges, lockedBadges, filter]);

  const newlyEarnedBadges = useMemo(
    () => badges.filter((b) => b.earned && newlyEarnedIds.includes(b.id)),
    [badges, newlyEarnedIds]
  );

  const selectedBadge = useMemo(
    () => badges.find((b) => b.id === selectedBadgeId) || null,
    [badges, selectedBadgeId]
  );

  const triggerReplay = (badgeId: BadgeEmblemVariant) => {
    setReplayNonceByBadge((prev) => ({
      ...prev,
      [badgeId]: (prev[badgeId] || 0) + 1,
    }));
    setNewlyEarnedIds((prev) => (prev.includes(badgeId) ? prev : [...prev, badgeId]));
  };

  const dismissCelebration = () => {
    setNewlyEarnedIds([]);
  };

  const completionPct = Math.round((earnedBadges.length / Math.max(1, badges.length)) * 100);

  return (
    <section
      aria-labelledby="achievement-badges-heading"
      className="p-6 rounded-2xl border glass-panel-3d space-y-5"
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 tabular-nums">
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
              {isBn ? 'অর্জন ও দক্ষতা সংগ্রহশালা' : 'Mathematical Honors Cabinet'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isBn
                ? `${toBnNum(earnedBadges.length, 'bn')} / ${toBnNum(badges.length, 'bn')} অর্জিত (${toBnNum(completionPct, 'bn')}%)`
                : `${earnedBadges.length} / ${badges.length} Unlocked (${completionPct}%)`}
            </span>
          </div>
          <h2
            id="achievement-badges-heading"
            className="text-lg font-bold text-slate-900 dark:text-white font-display"
          >
            {isBn ? 'দক্ষতা সনদ ও গাণিতিক ব্যাজসমূহ' : 'Mathematical Achievement Badges'}
          </h2>
        </div>

        {/* Segmented Filter Tabs */}
        <div
          role="tablist"
          aria-label={isBn ? 'ব্যাজ ফিল্টার' : 'Filter achievement badges'}
          className="inline-flex items-center p-1 rounded-xl border glass-tile-3d self-start sm:self-auto"
        >
          {(
            [
              {
                id: 'all',
                label: isBn
                  ? `সব (${toBnNum(badges.length, 'bn')})`
                  : `All (${badges.length})`,
              },
              {
                id: 'unlocked',
                label: isBn
                  ? `অর্জিত (${toBnNum(earnedBadges.length, 'bn')})`
                  : `Unlocked (${earnedBadges.length})`,
              },
              {
                id: 'locked',
                label: isBn
                  ? `চলমান (${toBnNum(lockedBadges.length, 'bn')})`
                  : `In Progress (${lockedBadges.length})`,
              },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#131C33] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Newly Earned Badge Celebration Spotlight (Framer Motion) */}
      <AnimatePresence initial={false}>
        {newlyEarnedBadges.length > 0 && (
          <motion.div
            key="new-badge-celebration"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative overflow-hidden rounded-2xl border border-amber-300/70 dark:border-amber-500/40 bg-gradient-to-r from-amber-50/90 via-cyan-50/70 to-indigo-50/80 dark:from-amber-950/30 dark:via-[#111C33] dark:to-indigo-950/30 p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Animated Spotlight Seal */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {!prefersReducedMotion && (
                    <motion.div
                      initial={{ scale: 0.65, opacity: 0.75 }}
                      animate={{ scale: [0.75, 1.35, 1.5], opacity: [0.75, 0.35, 0] }}
                      transition={{ duration: 1.15, ease: 'easeOut', repeat: 1 }}
                      className="absolute inset-0 rounded-full border-2 border-amber-400/60 dark:border-amber-300/50 pointer-events-none"
                    />
                  )}
                  <motion.div
                    initial={prefersReducedMotion ? false : { scale: 0.5, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                  >
                    <MathematicalEmblem
                      variant={newlyEarnedBadges[0].id}
                      earned={true}
                      size={52}
                    />
                  </motion.div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {newlyEarnedBadges.length > 1
                        ? isBn
                          ? `${toBnNum(newlyEarnedBadges.length, 'bn')}টি নতুন গাণিতিক ব্যাজ অর্জিত হয়েছে`
                          : `${newlyEarnedBadges.length} New Mathematical Badges Unlocked`
                        : isBn
                        ? 'নতুন গাণিতিক ব্যাজ অর্জিত হয়েছে'
                        : 'New Mathematical Badge Unlocked'}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 font-display">
                    {newlyEarnedBadges.map((b) => b.title).join(' · ')}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {newlyEarnedBadges.length === 1
                      ? newlyEarnedBadges[0].desc
                      : isBn
                      ? 'আপনার ধারাবাহিক গাণিতিক দক্ষতার স্বীকৃতি হিসেবে নিচের ব্যাজগুলো সক্রিয় হয়েছে।'
                      : 'Awarded in recognition of your verified mathematical milestones below.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissCelebration}
                aria-label={isBn ? 'অভিনন্দন বার্তা বন্ধ করুন' : 'Dismiss unlock celebration'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Showcase Grid */}
      {filteredBadges.length === 0 ? (
        <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {filter === 'unlocked'
              ? isBn
                ? 'এখনো কোনো ব্যাজ অর্জিত হয়নি। একটি মূল্যায়ন বা কুইজ সম্পন্ন করে প্রথম ব্যাজ আনলক করুন।'
                : 'No badges unlocked yet. Complete an assessment or practice quiz to earn your first seal.'
              : isBn
              ? 'অভিনন্দন! আপনি সবগুলো গাণিতিক ব্যাজ অর্জন করেছেন।'
              : 'Congratulations! You have unlocked every available mathematical badge.'}
          </p>
        </div>
      ) : (
        <motion.div
          layout={!prefersReducedMotion}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredBadges.map((badge, index) => {
              const theme = EMBLEM_THEMES[badge.id];
              const isNewlyEarned = badge.earned && newlyEarnedIds.includes(badge.id);
              const replayNonce = replayNonceByBadge[badge.id] || 0;
              const progressPct = Math.min(
                100,
                Math.round((badge.current / Math.max(1, badge.target)) * 100)
              );
              const isSelected = selectedBadgeId === badge.id;

              return (
                <motion.div
                  key={`${badge.id}-${replayNonce}`}
                  layout={!prefersReducedMotion}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : isNewlyEarned
                      ? { opacity: 0, scale: 0.9, y: 14 }
                      : { opacity: 0, y: 8 }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, scale: 1, y: 0 }
                  }
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={
                    isNewlyEarned && !prefersReducedMotion
                      ? { type: 'spring', stiffness: 300, damping: 20, delay: index * 0.04 }
                      : { duration: 0.2, delay: index * 0.025 }
                  }
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -4, rotateX: 2, rotateY: -2 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  style={prefersReducedMotion ? undefined : { transformPerspective: 800 }}
                  onClick={() =>
                    setSelectedBadgeId((prev) => (prev === badge.id ? null : badge.id))
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedBadgeId((prev) => (prev === badge.id ? null : badge.id));
                    }
                  }}
                  aria-expanded={isSelected}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left cursor-pointer backdrop-blur-md transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_28px_-16px_rgba(15,23,42,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_32px_-16px_rgba(2,6,23,0.72)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    badge.earned
                      ? `${theme.surfaceTint} ${theme.borderAccent}`
                      : 'border-slate-200/80 dark:border-slate-800/80 bg-white/45 dark:bg-[#090F1D]/55 opacity-85 hover:opacity-100'
                  } ${isSelected ? 'ring-2 ring-cyan-500/60' : ''}`}
                >
                  {/* Specular Sheen Sweep on Newly Earned Unlock */}
                  {isNewlyEarned && !prefersReducedMotion && (
                    <motion.div
                      initial={{ x: '-120%', opacity: 0 }}
                      animate={{ x: '160%', opacity: [0, 0.55, 0] }}
                      transition={{ duration: 0.95, delay: 0.15, ease: 'easeInOut' }}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 dark:via-white/20 to-transparent"
                    />
                  )}

                  <div className="flex items-start gap-3.5">
                    {/* Medallion Container */}
                    <div className="relative shrink-0 pt-0.5">
                      {/* Expanding Burst Ring on New Unlock */}
                      {isNewlyEarned && !prefersReducedMotion && (
                        <motion.span
                          initial={{ scale: 0.65, opacity: 0.85 }}
                          animate={{ scale: 1.55, opacity: 0 }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                          aria-hidden="true"
                          style={{ borderColor: theme.ring }}
                          className="pointer-events-none absolute inset-0 rounded-full border-2"
                        />
                      )}

                      <motion.div
                        initial={
                          isNewlyEarned && !prefersReducedMotion
                            ? { scale: 0.45, rotate: -28, opacity: 0 }
                            : false
                        }
                        animate={
                          isNewlyEarned && !prefersReducedMotion
                            ? { scale: [0.45, 1.14, 1], rotate: [-28, 6, 0], opacity: 1 }
                            : { scale: 1, rotate: 0, opacity: 1 }
                        }
                        transition={{
                          duration: 0.6,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <MathematicalEmblem
                          variant={badge.id}
                          earned={badge.earned}
                          size={54}
                        />
                      </motion.div>
                    </div>

                    {/* Text & Quantitative Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {badge.tierLabel} · {badge.formulaHint}
                        </span>
                        {badge.earned ? (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${theme.text}`} />
                        ) : (
                          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug font-display">
                        {badge.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {badge.desc}
                      </p>

                      {/* Progress Bar & State Readout */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className={badge.earned ? `font-semibold ${theme.text}` : 'text-slate-500 dark:text-slate-400'}>
                            {badge.earned
                              ? isNewlyEarned
                                ? isBn
                                  ? 'নতুন অর্জিত'
                                  : 'Newly Unlocked'
                                : isBn
                                ? 'অর্জিত'
                                : 'Unlocked'
                              : isBn
                              ? 'চলমান অগ্রগতি'
                              : 'In Progress'}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{badge.metricText}</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                          <motion.div
                            initial={prefersReducedMotion ? false : { scaleX: 0 }}
                            animate={{ scaleX: progressPct / 100 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            style={{
                              transformOrigin: 'left center',
                              backgroundColor: badge.earned ? theme.primary : '#64748B',
                            }}
                            className="w-full h-full rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Selected Badge Interactive Inspection Bar */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            key={`detail-${selectedBadge.id}`}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border glass-tile-3d"
          >
            <div className="flex items-center gap-3.5">
              <MathematicalEmblem
                variant={selectedBadge.id}
                earned={selectedBadge.earned}
                size={46}
              />
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedBadge.tierLabel} · {selectedBadge.metricText}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  {selectedBadge.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {selectedBadge.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedBadge.earned && (
                <button
                  type="button"
                  onClick={() => triggerReplay(selectedBadge.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isBn ? 'অ্যানিমেশন দেখুন' : 'Replay Unlock'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBadgeId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 whitespace-nowrap shrink-0 transition-colors"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
