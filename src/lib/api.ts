// src/lib/api.ts  —  Typed fetch wrappers for Fit It Miami API routes

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface SendOtpResult {
  success: boolean;
  message: string;
  error?:  string;
}

export interface ConfirmOtpResult {
  success: boolean;
  message: string;
  error?:  string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

/**
 * Send an OTP to the given phone number.
 * Phone must be E.164 format: +13055551234
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  return post<SendOtpResult>('/api/verify/send', { phone });
}

/**
 * Confirm an OTP code and submit lead data.
 * On success, server writes to Firebase and fires Make.com webhook.
 */
export async function confirmOtp(
  phone:    string,
  code:     string,
  leadData: unknown,
): Promise<ConfirmOtpResult> {
  return post<ConfirmOtpResult>('/api/verify/confirm', { phone, code, leadData });
}
