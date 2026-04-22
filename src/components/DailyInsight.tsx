'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Type, Scroll, Flame, type LucideIcon } from 'lucide-react';
import { getDailyContent, type DailyInsightData } from '@/lib/dailyContent';

export default function DailyInsight() {
  const [data, setData] = useState<DailyInsightData | null>(null);
  const [revealed, setRevealed] = useState('');

  useEffect(() => {
    setData(getDailyContent());
  }, []);

  useEffect(() => {
    if (!data) return;
    let text = '';
    if (data.type === 'philosophy' || data.type === 'discipline') {
      text = `"${data.content.text}" — ${data.content.author}`;
    } else if (data.type === 'vocabulary') {
      text = `${data.content.word}: ${data.content.definition}`;
    } else {
      text = data.content.fact;
    }

    let i = 0;
    setRevealed('');
    const interval = setInterval(() => {
      if (i <= text.length) {
        setRevealed(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [data]);

  if (!data) return null;

  const typeLabels: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
    philosophy: { label: 'FILOSOFÍA', color: '#A78BFA', Icon: BookOpen },
    vocabulary: { label: 'VOCABULARIO', color: '#60A5FA', Icon: Type },
    history:    { label: 'HISTORIA',   color: '#F59E0B', Icon: Scroll },
    discipline: { label: 'DISCIPLINA', color: '#FF3366', Icon: Flame },
  };

  const info = typeLabels[data.type];
  const Icon = info.Icon;

  const getContext = (): string => {
    if (data.type === 'philosophy' || data.type === 'discipline') return data.content.context;
    if (data.type === 'vocabulary') return `${data.content.origin} — Ej: "${data.content.example}"`;
    return `${data.content.year} — ${data.content.significance}`;
  };

  return (
    <div className="w-full max-w-md mt-4">
      <div className="border rounded p-4" style={{ borderColor: `${info.color}30`, backgroundColor: `${info.color}05` }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Icon size={14} strokeWidth={1.8} style={{ color: info.color }} />
          <span className="text-[13px] tracking-[0.3em] font-bold" style={{ color: info.color }}>
            DATO DEL DÍA — {info.label}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed text-foreground/80 tracking-wide mb-3">
          {revealed}
          {revealed.length < 10 && <span className="animate-pulse" style={{ color: info.color }}>█</span>}
        </p>

        {/* Context */}
        <div className="text-[13px] text-foreground/30 leading-relaxed italic">
          {getContext()}
        </div>
      </div>
    </div>
  );
}
