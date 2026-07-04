// src/types/lead.ts  —  Fit It Miami shared type definitions

export type LeadStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'scored'
  | 'contacted'
  | 'booked'
  | 'declined';

export type ServiceType =
  | 'personal_training'
  | 'group_fitness'
  | 'nutrition_coaching'
  | 'home_training'
  | 'online_coaching'
  | 'other';

export interface LeadData {
  // Contact
  firstName:    string;
  lastName:     string;
  email:        string;
  phone:        string;         // E.164 format: +13055551234

  // Service
  serviceType:  ServiceType;
  goals:        string;         // Free text: what the lead wants to achieve
  budget:       string;         // e.g. '$100-200/month'

  // Scheduling
  preferredDate:  string;       // ISO date string
  preferredTime:  string;       // e.g. '09:00'
  timezone:       string;       // e.g. 'America/New_York'

  // Location
  address?:     string;
  city?:        string;
  zipCode?:     string;

  // Meta (set by app, not user)
  id?:          string;         // Firestore document ID
  status:       LeadStatus;
  createdAt:    string;         // ISO timestamp
  updatedAt?:   string;
  source?:      string;         // UTM source or 'direct'
  fitScore?:    FitScore;
  aiSummary?:   string;
}

export interface FitScore {
  score:       number;          // 0–100
  tier:        'hot' | 'warm' | 'cold';
  reasoning:   string;          // Gemini explanation
  scoredAt:    string;          // ISO timestamp
  model:       string;          // e.g. 'gemini-2.0-flash'
}

export interface OtpState {
  phone:        string;
  codeSent:     boolean;
  sending:      boolean;
  confirming:   boolean;
  confirmed:    boolean;
  error:        string | null;
  attemptsLeft: number;         // starts at 3
  secondsLeft:  number;         // countdown to expiry (300s)
  canResend:    boolean;
}

export interface LeadFormStep {
  id:       number;
  name:     string;
  label:    string;
  valid:    boolean;
}

export const LEAD_FORM_STEPS: LeadFormStep[] = [
  { id: 1, name: 'contact',  label: 'Contact Info',   valid: false },
  { id: 2, name: 'service',  label: 'Service',        valid: false },
  { id: 3, name: 'schedule', label: 'Schedule',       valid: false },
  { id: 4, name: 'verify',   label: 'Verify Phone',   valid: false },
];

export function scoreTier(score: number): FitScore['tier'] {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}
