import React from 'react';
import katex from 'katex';
import { useOptionalGlossary } from '../../context/GlossaryContext';
import { tokenizeTextWithGlossaryTerms } from '../../data/mathGlossaryTerms';

interface MathRendererProps {
  content: string;
  className?: string;
  /** Set to false when rendered inside an interactive <button> (e.g. MCQ option) to avoid nested buttons */
  interactiveGlossary?: boolean;
}

/**
 * Safely renders prose mixed with inline ($...$) and display ($$...$$) LaTeX math via KaTeX.
 * Automatically links recognized mathematical terms in prose to the AI Mathematical Glossary.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  interactiveGlossary = true,
}) => {
  const glossary = useOptionalGlossary();

  if (!content) return null;

  const canLinkTerms =
    interactiveGlossary && Boolean(glossary) && Boolean(glossary?.inlineHighlightEnabled);

  const renderProseChunk = (text: string, keyPrefix: string) => {
    if (!canLinkTerms || !glossary) {
      return <React.Fragment key={keyPrefix}>{text}</React.Fragment>;
    }

    const segments = tokenizeTextWithGlossaryTerms(text);
    return (
      <React.Fragment key={keyPrefix}>
        {segments.map((seg, sIdx) => {
          if (seg.type === 'term' && seg.entry) {
            return (
              <button
                key={`${keyPrefix}-t-${sIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  glossary.lookupTerm(seg.text, content, glossary.activeViewLabel);
                }}
                title={`${seg.entry.termEn} (${seg.entry.termBn}) — Click for AI Glossary`}
                className="inline p-0 m-0 bg-transparent border-0 border-b border-dotted border-cyan-500/70 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 cursor-pointer transition-colors text-left font-inherit"
              >
                {seg.text}
              </button>
            );
          }
          return <React.Fragment key={`${keyPrefix}-x-${sIdx}`}>{seg.text}</React.Fragment>;
        })}
      </React.Fragment>
    );
  };

  // Split by $$...$$ or $...$
  const tokens = content.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span className={`leading-relaxed ${className}`}>
      {tokens.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const tex = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(tex, {
              displayMode: true,
              throwOnError: false,
              strict: false,
            });
            return (
              <span
                key={idx}
                className="block my-2 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <code key={idx} className="font-mono text-cyan-400">
                {tex}
              </code>
            );
          }
        }

        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const tex = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(tex, {
              displayMode: false,
              throwOnError: false,
              strict: false,
            });
            return (
              <span
                key={idx}
                className="inline-block align-middle mx-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <code key={idx} className="font-mono text-cyan-400">
                {tex}
              </code>
            );
          }
        }

        // Handle basic bold markdown **text** cleanly in React nodes
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return (
          <React.Fragment key={idx}>
            {boldParts.map((bp, bIdx) => {
              if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
                return (
                  <strong key={bIdx} className="font-semibold text-slate-900 dark:text-white">
                    {renderProseChunk(bp.slice(2, -2), `b-${idx}-${bIdx}`)}
                  </strong>
                );
              }
              return renderProseChunk(bp, `p-${idx}-${bIdx}`);
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
};
