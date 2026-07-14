"use client";

import { usePageVisible } from "@/hooks/usePageVisible";
import { fetchAccountBalance } from "@/services/accountBalance";
import type { AccountBalanceAccountPayload, AccountBalanceResponse } from "@/types/accountBalanceTypes";
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 60_000;

export type ProfileBalancesState = {
  balances: AccountBalanceResponse | null;
  loading: boolean;
  error: string | null;
};

export function profileAccountPayload(
  balances: AccountBalanceResponse | null,
  profile: "a" | "b",
): AccountBalanceAccountPayload | null {
  if (!balances?.accounts) return null;
  const row = balances.accounts[profile];
  return row?.configured ? row : null;
}

export function useProfileBalances(active: boolean, refreshKey = 0): ProfileBalancesState {
  const pageVisible = usePageVisible();
  const polling = active && pageVisible;
  const [balances, setBalances] = useState<AccountBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    const result = await fetchAccountBalance({ refresh });
    setBalances(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!polling) return;
    void load(refreshKey > 0);
  }, [polling, refreshKey, load]);

  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => void load(false), POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, load]);

  return { balances, loading, error };
}
