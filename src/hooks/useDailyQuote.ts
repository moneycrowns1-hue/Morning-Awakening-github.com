// ═══════════════════════════════════════════════════════
// useDailyQuote · returns the deterministic quote for today
// and re-evaluates if the day changes while the tab is open
// (e.g. user keeps the app running overnight).
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect, useMemo, useState } from 'react';
import { getQuoteForDate, getTodayIsoDate, type Quote } from '@/lib/quotes';

export function useDailyQuote(): Quote {
  const [today, setToday] = useState<string>(() => getTodayIsoDate());

  useEffect(() => {
    // Re-check every 5 min whether the local date has rolled over.
    const id = window.setInterval(() => {
      const now = getTodayIsoDate();
      setToday((prev) => (prev === now ? prev : now));
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => getQuoteForDate(today), [today]);
}
