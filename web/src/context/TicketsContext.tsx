'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loadTicketsFromCsv } from '@/lib/loadTickets';
import {
  computeAgentStats,
  computeDashboardMetrics,
  computeWeeklySeries,
} from '@/lib/metricsCalc';
import {
  AgentStat,
  DashboardMetrics,
  Ticket,
  WeeklyPoint,
} from '@/lib/types';

const STORAGE_KEY = 'rideops_tickets_v0_state';

interface TicketsContextValue {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  metrics: DashboardMetrics;
  weeklySeries: WeeklyPoint[];
  agentStats: AgentStat[];
  updateTicket: (ticketId: string, patch: Partial<Ticket>) => void;
  addTicket: (newTicket: Ticket) => void;
  resetDemoData: () => Promise<void>;
}

const TicketsContext = createContext<TicketsContextValue | undefined>(undefined);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await loadTicketsFromCsv();
      setTickets(fresh);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        // Ignore storage quota issues in private browsing
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let loadedFromCache = false;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Ticket[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed);
          setLoading(false);
          loadedFromCache = true;
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (!loadedFromCache) {
      void loadFresh();
    }
  }, [loadFresh]);

  const persist = useCallback((next: Ticket[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const updateTicket = useCallback(
    (ticketId: string, patch: Partial<Ticket>) => {
      setTickets((prev) => {
        const next = prev.map((t) =>
          t.ticket_id === ticketId ? { ...t, ...patch } : t
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const addTicket = useCallback(
    (newTicket: Ticket) => {
      setTickets((prev) => {
        const next = [newTicket, ...prev];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetDemoData = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    await loadFresh();
  }, [loadFresh]);

  const metrics = useMemo(() => computeDashboardMetrics(tickets), [tickets]);
  const weeklySeries = useMemo(() => computeWeeklySeries(tickets), [tickets]);
  const agentStats = useMemo(() => computeAgentStats(tickets), [tickets]);

  const value = useMemo(
    () => ({
      tickets,
      loading,
      error,
      metrics,
      weeklySeries,
      agentStats,
      updateTicket,
      addTicket,
      resetDemoData,
    }),
    [
      tickets,
      loading,
      error,
      metrics,
      weeklySeries,
      agentStats,
      updateTicket,
      addTicket,
      resetDemoData,
    ]
  );

  return (
    <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
  );
}

export function useTickets(): TicketsContextValue {
  const ctx = useContext(TicketsContext);
  if (!ctx) {
    throw new Error('useTickets must be used inside TicketsProvider');
  }
  return ctx;
}