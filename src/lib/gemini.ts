// src/lib/gemini.ts  —  Gemini AI helpers for Fit It Miami
import { GoogleGenAI } from '@google/genai';
import type { LeadData, FitScore } from '../types/lead';
import { scoreTier } from '../types/lead';

// Gemini client — API key is injected via server-side env, not Vite bundle
// For client-side usage this must be proxied through the Express server.
// This file is designed for server-side use (tsx / Cloud Run).
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

const MODEL = 'gemini-2.0-flash';

/**
 * Score a lead using Gemini.
 * Returns a FitScore with 0-100 score, tier, and reasoning.
 */
export async function scoreLead(lead: LeadData): Promise<FitScore> {
  const prompt = `You are a fitness business lead qualifier for a Miami personal training company.

Analyse this lead and return a JSON object with:
- score: integer 0-100 (70+ = hot, 40-69 = warm, <40 = cold)
- reasoning: 2-3 sentence explanation of the score

Lead data:
- Name: ${lead.firstName} ${lead.lastName}
- Service interest: ${lead.serviceType.replace(/_/g, ' ')}
- Goals: ${lead.goals}
- Budget: ${lead.budget}
- Preferred schedule: ${lead.preferredDate} at ${lead.preferredTime}
- Location: ${lead.city ?? 'Miami'}, ${lead.zipCode ?? 'FL'}

Scoring criteria:
- Budget alignment with typical Miami PT rates ($80-200/session): +30 points
- Specificity of goals (vague vs clear): +20 points
- Schedule flexibility and proximity: +20 points
- Service type demand (home training and personal training highest): +20 points
- Completeness of lead info: +10 points

Return ONLY valid JSON: {"score": <number>, "reasoning": "<string>"}`;

  const response = await ai.models.generateContent({
    model:    MODEL,
    contents: prompt,
    config:   { responseMimeType: 'application/json' },
  });

  const text = response.text ?? '{"score":50,"reasoning":"Unable to score."}';
  let parsed: { score: number; reasoning: string };

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { score: 50, reasoning: text.slice(0, 200) };
  }

  const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 50)));

  return {
    score,
    tier:      scoreTier(score),
    reasoning: parsed.reasoning ?? '',
    scoredAt:  new Date().toISOString(),
    model:     MODEL,
  };
}

/**
 * Generate a 2-sentence operator summary for a lead.
 */
export async function summarizeLead(lead: LeadData): Promise<string> {
  const prompt = `Write a 2-sentence operator summary for this fitness lead.
Be specific and actionable. Mention the service, budget, and key goal.

Lead: ${lead.firstName} ${lead.lastName}, interested in ${lead.serviceType.replace(/_/g, ' ')},
budget ${lead.budget}, goal: "${lead.goals}", scheduled ${lead.preferredDate}.

Return plain text only, no JSON.`;

  const response = await ai.models.generateContent({
    model:    MODEL,
    contents: prompt,
  });

  return response.text?.trim() ?? 'No summary available.';
}
