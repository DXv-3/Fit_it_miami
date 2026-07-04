import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// In-memory OTP store (replace with Redis for horizontal scaling)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// ---------------------------------------------------------------------------
// Gemini scoring helper (server-side only — keeps API key off client)
// ---------------------------------------------------------------------------
async function geminiScoreLead(lead: Record<string, unknown>): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Mock response for dev without Gemini key
    return {
      score:     72,
      tier:      'hot',
      reasoning: 'Mock score — GEMINI_API_KEY not configured.',
      scoredAt:  new Date().toISOString(),
      model:     'mock',
    };
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a fitness business lead qualifier for a Miami personal training company.

Analyse this lead and return a JSON object with:
- score: integer 0-100 (70+ = hot, 40-69 = warm, <40 = cold)
- reasoning: 2-3 sentence explanation

Lead:
${JSON.stringify(lead, null, 2)}

Scoring criteria:
- Budget alignment with Miami PT rates ($80-200/session): +30 pts
- Specificity of goals: +20 pts  
- Schedule flexibility: +20 pts
- Service demand (home/personal training highest): +20 pts
- Info completeness: +10 pts

Return ONLY valid JSON: {"score": <number>, "reasoning": "<string>"}`;

    const response = await ai.models.generateContent({
      model:    'gemini-2.0-flash',
      contents: prompt,
      config:   { responseMimeType: 'application/json' },
    });

    const text = response.text ?? '{"score":50,"reasoning":"Unable to score."}';
    const parsed = JSON.parse(text) as { score: number; reasoning: string };
    const score  = Math.max(0, Math.min(100, Math.round(parsed.score ?? 50)));
    const tier   = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

    return { score, tier, reasoning: parsed.reasoning, scoredAt: new Date().toISOString(), model: 'gemini-2.0-flash' };
  } catch (err) {
    console.error('[/api/score] Gemini error:', err);
    return { score: 50, tier: 'warm', reasoning: 'Scoring unavailable.', scoredAt: new Date().toISOString(), model: 'error' };
  }
}

async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT ?? 3000);

  app.use(cors());
  app.use(express.json());

  // ---------------------------------------------------------------------------
  // Twilio client (lazy init)
  // ---------------------------------------------------------------------------
  let twilioClient: twilio.Twilio | null = null;
  const getTwilioClient = () => {
    if (!twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) throw new Error('TWILIO credentials not configured');
      twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
  };

  // ---------------------------------------------------------------------------
  // POST /api/verify/send  —  send OTP via Twilio
  // ---------------------------------------------------------------------------
  app.post('/api/verify/send', async (req, res) => {
    try {
      const { phone } = req.body as { phone?: string };
      if (!phone) return res.status(400).json({ error: 'Phone number is required' });

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

      try {
        const client     = getTwilioClient();
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber) throw new Error('TWILIO_PHONE_NUMBER not configured');
        await client.messages.create({
          body: `Your Fit It Miami confirmation code is: ${code}. Expires in 5 minutes.`,
          from: fromNumber,
          to:   phone,
        });
      } catch (twilioErr) {
        // Dev fallback: log code to console so flow can be tested without Twilio
        console.warn(`[OTP] Twilio not configured. Code for ${phone}: ${code}`);
      }

      res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/verify/confirm  —  validate OTP + CRM handoff
  // ---------------------------------------------------------------------------
  app.post('/api/verify/confirm', async (req, res) => {
    const { phone, code, leadData } = req.body as {
      phone?: string; code?: string; leadData?: Record<string, unknown>;
    };

    if (!phone || !code) return res.status(400).json({ error: 'Phone and code are required' });

    const stored = otpStore.get(phone);
    if (!stored)                    return res.status(400).json({ error: 'Code expired or invalid' });
    if (Date.now() > stored.expiresAt) { otpStore.delete(phone); return res.status(400).json({ error: 'Code expired' }); }
    if (stored.code !== code) {
      stored.attempts += 1;
      if (stored.attempts >= 3) { otpStore.delete(phone); return res.status(400).json({ error: 'Too many attempts. Request a new code.' }); }
      return res.status(400).json({ error: 'Invalid code' });
    }

    otpStore.delete(phone);

    // Fire Make.com webhook (non-blocking)
    if (process.env.MAKE_WEBHOOK_URL && leadData) {
      fetch(process.env.MAKE_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(leadData),
      }).catch(err => console.error('[Make.com webhook] error:', err));
    }

    res.json({ success: true, message: 'Phone verified successfully' });
  });

  // ---------------------------------------------------------------------------
  // POST /api/score  —  Gemini lead scoring (server-side, key stays private)
  // ---------------------------------------------------------------------------
  app.post('/api/score', async (req, res) => {
    try {
      const { lead } = req.body as { lead?: Record<string, unknown> };
      if (!lead) return res.status(400).json({ error: 'lead data is required' });
      const result = await geminiScoreLead(lead);
      res.json(result);
    } catch (err) {
      console.error('[/api/score] error:', err);
      res.status(500).json({ error: 'Scoring failed' });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/leads  —  read leads from Firestore (admin SDK)
  // ---------------------------------------------------------------------------
  app.get('/api/leads', async (req, res) => {
    try {
      const { status, limit: limitParam = '100' } = req.query as Record<string, string>;
      const maxResults = Math.min(500, parseInt(limitParam, 10) || 100);

      // Attempt Firebase Admin SDK
      let leads: Record<string, unknown>[] = [];
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore }                 = await import('firebase-admin/firestore');

        if (!getApps().length) {
          // Service account key path OR Application Default Credentials (Cloud Run auto-injects)
          const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            : (await import('firebase-admin')).credential.applicationDefault();
          initializeApp({ credential });
        }

        const adminDb = getFirestore();
        let q: FirebaseFirestore.Query = adminDb.collection('leads')
          .orderBy('createdAt', 'desc')
          .limit(maxResults);
        if (status) q = q.where('status', '==', status);

        const snap = await q.get();
        leads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (firebaseErr) {
        console.warn('[/api/leads] Firebase Admin not available:', firebaseErr);
        // Return empty array gracefully — client falls back to real-time listener
        leads = [];
      }

      res.json({ leads, total: leads.length });
    } catch (err) {
      console.error('[/api/leads] error:', err);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // ---------------------------------------------------------------------------
  // Vite dev middleware / production static serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server:  { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fit It Miami] Server running on http://localhost:${PORT}`);
    console.log(`[Fit It Miami] NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);
    console.log(`[Fit It Miami] Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'mock mode'}`);
    console.log(`[Fit It Miami] Twilio: ${process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'simulated'}`);
    console.log(`[Fit It Miami] Make.com: ${process.env.MAKE_WEBHOOK_URL ? 'configured' : 'disabled'}`);
  });
}

startServer();
