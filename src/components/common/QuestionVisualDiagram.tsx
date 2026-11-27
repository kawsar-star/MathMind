import React from 'react';
import { toBnNum } from '../../i18n/translations';
import { Language, MathQuestion } from '../../types/mathmind';

export const QuestionVisualDiagram: React.FC<{ q: MathQuestion; language?: Language }> = ({
  q,
  language = 'en',
}) => {
  if (!q.visualSvg) return null;

  if (q.visualSvg === 'counting_dots') {
    const groupA = Number(q.visualData?.groupA ?? 4);
    const groupB = Number(q.visualData?.groupB ?? 0);
    return (
      <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {language === 'bn' ? 'দৃশ্যমান গণনা চিত্র' : 'Visual Counting Model'}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {Array.from({ length: Math.max(0, groupA) }).map((_, i) => (
              <span
                key={`a_${i}`}
                className="w-7 h-7 rounded-full bg-cyan-500 border-2 border-cyan-300 shadow-sm inline-block"
              />
            ))}
          </div>
          {groupB > 0 && (
            <>
              <span className="text-lg font-bold text-slate-500">+</span>
              <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {Array.from({ length: groupB }).map((_, i) => (
                  <span
                    key={`b_${i}`}
                    className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-emerald-300 shadow-sm inline-block"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (q.visualSvg === 'shape_cards') {
    const highlight = String(q.visualData?.highlight || '');
    return (
      <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {language === 'bn' ? 'মৌলিক জ্যামিতিক আকৃতি' : 'Basic Geometric Shapes'}
        </p>
        <div className="grid grid-cols-4 gap-3 max-w-md">
          <div
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 ${
              highlight === 'circle'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
            }`}
          >
            <svg viewBox="0 0 40 40" className="w-9 h-9">
              <circle cx="20" cy="20" r="14" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" strokeWidth="2.5" />
            </svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'বৃত্ত' : 'Circle'}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 ${
              highlight === 'triangle'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
            }`}
          >
            <svg viewBox="0 0 40 40" className="w-9 h-9">
              <polygon points="20,6 35,34 5,34" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="2.5" />
            </svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'ত্রিভুজ' : 'Triangle'}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 ${
              highlight === 'square'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
            }`}
          >
            <svg viewBox="0 0 40 40" className="w-9 h-9">
              <rect x="7" y="7" width="26" height="26" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="2.5" />
            </svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'বর্গ' : 'Square'}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 ${
              highlight === 'rectangle'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
            }`}
          >
            <svg viewBox="0 0 48 40" className="w-10 h-9">
              <rect x="4" y="10" width="40" height="20" fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="2.5" />
            </svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {language === 'bn' ? 'আয়ত' : 'Rectangle'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (q.visualSvg === 'fraction_bar') {
    const num = Number(q.visualData?.numerator ?? 2);
    const den = Number(q.visualData?.denominator ?? 6);
    return (
      <div className="my-4 p-4 rounded-xl border border-violet-500/25 bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {language === 'bn' ? 'দৃশ্যমান ভগ্নাংশ মডেল' : 'Visual Fraction Model'}
        </p>
        <div
          className="grid gap-1 h-10"
          style={{ gridTemplateColumns: `repeat(${den}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: den }).map((_, i) => (
            <div
              key={i}
              className={`rounded border ${
                i < num
                  ? 'bg-gradient-to-b from-cyan-400 to-violet-500 border-cyan-400'
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.visualSvg === 'number_line') {
    const min = Number(q.visualData?.min ?? -10);
    const max = Number(q.visualData?.max ?? 5);
    const a = Number(q.visualData?.markerA ?? -7);
    const b = Number(q.visualData?.markerB ?? -3);
    const toPct = (v: number) => ((v - min) / (max - min)) * 100;
    return (
      <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <svg viewBox="0 0 400 70" className="w-full h-16">
          <line
            x1="20"
            y1="35"
            x2="380"
            y2="35"
            stroke="currentColor"
            className="text-slate-400"
            strokeWidth="2"
          />
          {[min, a, b, 0, max].map((tick, idx) => {
            const x = 20 + (toPct(tick) / 100) * 360;
            const highlight = tick === a || tick === b;
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1="28"
                  x2={x}
                  y2="42"
                  stroke="currentColor"
                  className="text-slate-400"
                  strokeWidth="1.5"
                />
                {highlight && <circle cx={x} cy="35" r="5" className="fill-cyan-500" />}
                <text x={x} y="58" textAnchor="middle" className="fill-current text-[11px] font-mono">
                  {toBnNum(tick, language)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (q.visualSvg === 'angle_triangle') {
    return (
      <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-center">
        <svg viewBox="0 0 260 140" className="w-64 h-36">
          <polygon
            points="30,120 225,120 140,25"
            fill="rgba(139,92,246,0.14)"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
          <text x="18" y="132" className="fill-current text-[11px] font-mono">
            A ({toBnNum(q.visualData?.angleA ?? '', language)}°)
          </text>
          <text x="200" y="132" className="fill-current text-[11px] font-mono">
            B ({toBnNum(q.visualData?.angleB ?? '', language)}°)
          </text>
          <text x="132" y="18" className="fill-cyan-500 text-[11px] font-mono">
            C (?)
          </text>
        </svg>
      </div>
    );
  }

  if (q.visualSvg === 'coordinate_point') {
    const px = Number(q.visualData?.x ?? 3);
    const py = Number(q.visualData?.y ?? 4);
    const cx = 100 + px * 14;
    const cy = 100 - py * 14;
    return (
      <div className="my-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-center">
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          <line
            x1="10"
            y1="100"
            x2="190"
            y2="100"
            stroke="currentColor"
            className="text-slate-500"
            strokeWidth="1.5"
          />
          <line
            x1="100"
            y1="10"
            x2="100"
            y2="190"
            stroke="currentColor"
            className="text-slate-500"
            strokeWidth="1.5"
          />
          <circle cx={cx} cy={cy} r="5" fill="#06b6d4" />
          <text x={cx + 8} y={cy - 4} className="fill-cyan-500 text-[11px] font-mono">
            P({toBnNum(px, language)}, {toBnNum(py, language)})
          </text>
        </svg>
      </div>
    );
  }

  return null;
};
