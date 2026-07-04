// src/hooks/useGeminiScore.ts  —  Async Gemini lead scoring hook
// Note: Gemini scoring runs server-side via /api/score endpoint to keep
// the API key off the client. This hook calls that endpoint.
import { useState, useCallback } from 'react';
import type { FitScore, LeadData } from '../types/lead';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function useGeminiScore() {
  const [score,   setScore]   = useState<FitScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const scoreLead = useCallback(async (lead: LeadData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE}/api/score`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lead }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const result: FitScore = await res.json();
      setScore(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scoring failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setScore(null);
    setError(null);
  }, []);

  return { score, loading, error, scoreLead, reset };
}
