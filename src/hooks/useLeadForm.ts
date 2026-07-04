// src/hooks/useLeadForm.ts  —  Multi-step form state, validation, step nav
import { useState, useCallback } from 'react';
import type { LeadData, ServiceType } from '../types/lead';

const EMPTY_LEAD: LeadData = {
  firstName:     '',
  lastName:      '',
  email:         '',
  phone:         '',
  serviceType:   'personal_training',
  goals:         '',
  budget:        '',
  preferredDate: '',
  preferredTime: '',
  timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
  address:       '',
  city:          'Miami',
  zipCode:       '',
  status:        'draft',
  createdAt:     new Date().toISOString(),
};

type StepId = 1 | 2 | 3 | 4;

function validateStep(step: StepId, lead: LeadData): string[] {
  const errors: string[] = [];

  if (step === 1) {
    if (!lead.firstName.trim())  errors.push('First name is required');
    if (!lead.lastName.trim())   errors.push('Last name is required');
    if (!lead.email.trim())      errors.push('Email is required');
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(lead.email)) errors.push('Valid email required');
    if (!lead.phone.trim())      errors.push('Phone number is required');
  }

  if (step === 2) {
    if (!lead.serviceType)       errors.push('Please select a service type');
    if (!lead.goals.trim())      errors.push('Please describe your goals');
    if (!lead.budget.trim())     errors.push('Please enter your budget');
  }

  if (step === 3) {
    if (!lead.preferredDate)     errors.push('Please select a preferred date');
    if (!lead.preferredTime)     errors.push('Please select a preferred time');
  }

  return errors;
}

export function useLeadForm() {
  const [lead, setLead]   = useState<LeadData>(EMPTY_LEAD);
  const [step, setStep]   = useState<StepId>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const update = useCallback(<K extends keyof LeadData>(key: K, value: LeadData[K]) => {
    setLead(l => ({ ...l, [key]: value }));
    setTouched(t => new Set(t).add(key as string));
    // Clear field-specific error
    setErrors(e => e.filter(err => !err.toLowerCase().includes(key.toString().toLowerCase())));
  }, []);

  const nextStep = useCallback((): boolean => {
    const errs = validateStep(step, lead);
    if (errs.length) {
      setErrors(errs);
      return false;
    }
    setErrors([]);
    setStep(s => Math.min(4, s + 1) as StepId);
    return true;
  }, [step, lead]);

  const prevStep = useCallback(() => {
    setErrors([]);
    setStep(s => Math.max(1, s - 1) as StepId);
  }, []);

  const goToStep = useCallback((target: StepId) => {
    // Only allow going back, or jumping forward if prior steps are valid
    if (target < step) {
      setErrors([]);
      setStep(target);
    }
  }, [step]);

  const isValid = useCallback((forStep?: StepId) => {
    return validateStep(forStep ?? step, lead).length === 0;
  }, [step, lead]);

  const finalLead = useCallback((): LeadData => ({
    ...lead,
    status:    'pending_verification',
    createdAt: new Date().toISOString(),
  }), [lead]);

  return {
    lead,
    step,
    errors,
    touched,
    update,
    nextStep,
    prevStep,
    goToStep,
    isValid,
    finalLead,
    totalSteps: 4,
    progress: ((step - 1) / 3) * 100,
  };
}
