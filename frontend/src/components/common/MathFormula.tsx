import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  formula,
  displayMode = true,
  className = '',
}) => {
  const html = useMemo(() => {
    let tex = formula.trim();

    // If it's a multiline formula with \\ that isn't already inside an outer aligned environment,
    // wrap it in aligned so all lines render neatly.
    if (tex.includes('\\\\') && !tex.startsWith('\\begin{aligned}') && !tex.startsWith('\\begin{gathered}')) {
      if (!tex.startsWith('\\begin{cases}') && !tex.startsWith('\\begin{equation}')) {
        tex = `\\begin{aligned}${tex}\\end{aligned}`;
      }
    }

    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch (err) {
      console.error('KaTeX rendering error for formula:', formula, err);
      return `<code class="text-accent font-mono text-xs">${formula}</code>`;
    }
  }, [formula, displayMode]);

  return (
    <div
      className={`katex-math-wrapper overflow-x-auto py-1 text-accent ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
