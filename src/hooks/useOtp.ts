// src/hooks/useOtp.ts  —  Full OTP lifecycle hook
import { useState, useEffect, useRef, useCallback } from 'react';
import { sendOtp, confirmOtp } from '../lib/api';
import type { OtpState } from '../types/lead';

const OTP_TTL_SECONDS = 300; // 5 minutes, matches server
const MAX_ATTEMPTS    = 3;

const INITIAL: OtpState = {
  phone:        '',
  codeSent:     false,
  sending:      false,
  confirming:   false,
  confirmed:    false,
  error:        null,
  attemptsLeft: MAX_ATTEMPTS,
  secondsLeft:  OTP_TTL_SECONDS,
  canResend:    false,
};

export function useOtp(leadData: unknown) {
  const [state, setState] = useState<OtpState>(INITIAL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!state.codeSent || state.confirmed) return;

    timerRef.current = setInterval(() => {
      setState(s => {
        const next = s.secondsLeft - 1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          return { ...s, secondsLeft: 0, canResend: true, error: 'Code expired. Request a new one.' };
        }
        return { ...s, secondsLeft: next };
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [state.codeSent, state.confirmed]);

  const setPhone = useCallback((phone: string) => {
    setState(s => ({ ...s, phone }));
  }, []);

  const send = useCallback(async (phone?: string) => {
    const p = phone ?? state.phone;
    if (!p) return;

    setState(s => ({ ...s, sending: true, error: null, phone: p }));
    clearInterval(timerRef.current!);

    try {
      await sendOtp(p);
      setState(s => ({
        ...s,
        sending:      false,
        codeSent:     true,
        secondsLeft:  OTP_TTL_SECONDS,
        attemptsLeft: MAX_ATTEMPTS,
        canResend:    false,
        error:        null,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        sending: false,
        error:   err instanceof Error ? err.message : 'Failed to send code',
      }));
    }
  }, [state.phone]);

  const confirm = useCallback(async (code: string) => {
    if (!state.phone || !code) return;

    setState(s => ({ ...s, confirming: true, error: null }));

    try {
      await confirmOtp(state.phone, code, leadData);
      clearInterval(timerRef.current!);
      setState(s => ({ ...s, confirming: false, confirmed: true, error: null }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      setState(s => ({
        ...s,
        confirming:   false,
        attemptsLeft: Math.max(0, s.attemptsLeft - 1),
        error:        s.attemptsLeft <= 1
          ? 'Too many failed attempts. Request a new code.'
          : msg,
        // Force resend if out of attempts
        canResend: s.attemptsLeft <= 1,
      }));
    }
  }, [state.phone, leadData]);

  const reset = useCallback(() => {
    clearInterval(timerRef.current!);
    setState(INITIAL);
  }, []);

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    setPhone,
    send,
    confirm,
    reset,
    countdownDisplay: formatCountdown(state.secondsLeft),
  };
}
