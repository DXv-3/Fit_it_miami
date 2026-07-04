# Architecture — Fit It Miami

## Current state (v0.1)

```
Express server (server.ts)
  ├── POST /api/verify/send     → Twilio SMS OTP
  └── POST /api/verify/confirm  → validate OTP → Make.com webhook

React SPA (src/)
  └── App.tsx (40KB monolith)
        ├── Step 1: Contact info form
        ├── Step 2: Service selection
        ├── Step 3: Scheduling
        ├── Step 4: Phone verification (OTP)
        ├── AI scoring (Gemini → fit score)
        ├── Firebase write (Firestore)
        ├── Lead list / admin view
        └── Confirmation screen

  components/
    ├── CommandPalette.tsx  (Cmd+K operator palette)
    └── DiffModal.tsx       (lead edit diff view)
```

## Data flow

```
User fills form
  → App.tsx collects leadData object
  → User enters phone → POST /api/verify/send → Twilio SMS
  → User enters OTP   → POST /api/verify/confirm
       ├── Firebase write: leads/{docId}
       └── Make.com webhook: leadData JSON
  → Gemini AI: score lead (async, non-blocking)
  → Firebase update: leads/{docId}.fitScore
  → Confirmation screen shown
```

## v0.2 refactor plan

Split `App.tsx` into:

```
src/
  ├── App.tsx                     # Router shell + global state only (~100 lines)
  ├── hooks/
  │   ├── useLeadForm.ts          # Form state, validation, step navigation
  │   ├── useOtp.ts               # OTP send/confirm, countdown timer, retry
  │   ├── useGeminiScore.ts       # Async Gemini scoring, loading state
  │   └── useLeads.ts             # Firestore real-time leads subscription
  ├── types/
  │   └── lead.ts                 # LeadData, FitScore, OtpState interfaces
  ├── lib/
  │   ├── firebase.ts             # Firestore helpers (write, update, query)
  │   ├── gemini.ts               # Gemini client + score prompt
  │   └── api.ts                  # fetch wrappers for /api/verify/*
  └── components/
      ├── steps/
      │   ├── ContactStep.tsx     # Name, email, address fields
      │   ├── ServiceStep.tsx     # Service type selector
      │   ├── ScheduleStep.tsx    # Date/time picker
      │   └── VerifyStep.tsx      # Phone + OTP entry
      ├── admin/
      │   ├── LeadList.tsx        # Virtualised lead table (TanStack Virtual)
      │   ├── LeadCard.tsx        # Individual lead row / card
      │   └── FitScoreBadge.tsx   # Gemini score pill
      ├── CommandPalette.tsx      # (existing — keep)
      ├── DiffModal.tsx           # (existing — keep)
      └── ConfirmationScreen.tsx  # Post-verification success state
```

## AI integration points

| Feature | Model | Trigger | Output |
|---|---|---|---|
| Lead fit score | Gemini Flash | After phone verify | 0–100 score + reasoning |
| Smart scheduling | Gemini Flash | On ScheduleStep load | Suggested slots based on location |
| Lead summary | Gemini Flash | On admin lead open | 2-sentence summary for operator |

## Security notes

- OTP store is in-memory (`Map`) — **replace with Redis** before horizontal scaling
- Firestore rules (`firestore.rules`) restrict writes to authenticated operators — review before prod
- Twilio credentials must never appear in client-side code — all OTP logic stays server-side ✓
- `GEMINI_API_KEY` is server-side only — not exposed to Vite client bundle ✓

## Scaling path

```
v0.1 (now)   — Single Cloud Run instance, in-memory OTP store
v0.2         — Component split, Redis OTP store, unit tests
v0.3         — Multi-region Cloud Run, Firebase Hosting CDN for static assets
v1.0         — Custom domain, Twilio Verify (replace DIY OTP), Stripe payment
```
