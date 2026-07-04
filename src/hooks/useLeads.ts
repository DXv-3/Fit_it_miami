// src/hooks/useLeads.ts  —  Firestore real-time leads subscription
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { LeadData, LeadStatus } from '../types/lead';

export interface UseLeadsOptions {
  status?:    LeadStatus | LeadStatus[];
  maxCount?:  number;     // default 100
  orderField?: string;    // default 'createdAt'
}

export function useLeads(options: UseLeadsOptions = {}) {
  const [leads,   setLeads]   = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [
      orderBy(options.orderField ?? 'createdAt', 'desc'),
      limit(options.maxCount ?? 100),
    ];

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      if (statuses.length === 1) {
        constraints.unshift(where('status', '==', statuses[0]));
      } else {
        constraints.unshift(where('status', 'in', statuses));
      }
    }

    const q = query(collection(db, 'leads'), ...constraints);

    const unsub = onSnapshot(
      q,
      snap => {
        setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadData)));
        setLoading(false);
      },
      err => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [options.status, options.maxCount, options.orderField]);

  const byStatus = (status: LeadStatus) => leads.filter(l => l.status === status);
  const hot  = () => leads.filter(l => l.fitScore?.tier === 'hot');
  const warm = () => leads.filter(l => l.fitScore?.tier === 'warm');
  const cold = () => leads.filter(l => l.fitScore?.tier === 'cold');

  return { leads, loading, error, byStatus, hot, warm, cold, total: leads.length };
}
