import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { MathFormula } from './MathFormula';

interface ConceptCardProps {
  category?: string;
  module?: string;
  title: string;
  formula?: string;
  explanation: string;
  insightQuestion?: string;
  insightAnswer?: string;
  vivaQuestion?: string;
  vivaAnswer?: string;
  className?: string;
  defaultOpen?: boolean;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  category,
  module,
  title,
  formula,
  explanation,
  insightQuestion,
  insightAnswer,
  vivaQuestion,
  vivaAnswer,
  className = '',
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const badge = category || (module && !module.toLowerCase().startsWith('mod') ? module : 'TECHNICAL NOTE');
  const question = insightQuestion || vivaQuestion;
  const answer = insightAnswer || vivaAnswer;

  return (
    <div className={`rounded-xl border border-border bg-surface overflow-hidden shadow-xs transition-colors ${className}`}>
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-elevated/60 flex items-center justify-between text-left hover:bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-accent font-semibold uppercase">
                {badge}
              </span>
              <h4 className="text-xs font-bold text-primary font-heading tracking-tight">{title}</h4>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted">
          <span className="text-[11px] font-mono hidden sm:inline">
            {isOpen ? 'Collapse Details' : 'Method Details'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-4 space-y-3 text-xs border-t border-border bg-surface">
          {/* Formula Block */}
          {formula && (
            <div className="p-3 rounded-lg bg-main border border-border">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider block mb-1.5">
                Mathematical Model
              </span>
              <MathFormula formula={formula} />
            </div>
          )}

          {/* Explanation */}
          <div>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block mb-1">
              How It Works
            </span>
            <p className="text-secondary leading-relaxed">{explanation}</p>
          </div>

          {/* Key Consideration / Insight */}
          {question && answer && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/25 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold">
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs">Key Principle & Nuance</span>
              </div>
              <p className="text-primary font-medium">{question}</p>
              <p className="text-secondary text-[11px] leading-relaxed pt-0.5">{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
