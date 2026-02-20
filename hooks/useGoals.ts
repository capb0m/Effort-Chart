import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface GoalWithProgress {
  id: string;
  type: 'daily' | 'period';
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  target_hours: number;
  deadline: string | null;
  achieved_hours: number;
  is_achieved: boolean;
  created_at: string;
}

const fetcher = async ([url, token]: [string, string]): Promise<GoalWithProgress[]> => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch goals');
  const json = await res.json();
  return json.goals || [];
};

export function useGoals() {
  const { token } = useAuth();

  const today = new Date().toLocaleDateString('sv-SE');
  const tz = new Date().getTimezoneOffset();
  const url = `/api/goals?today=${today}&tz=${tz}`;

  const { data, isLoading, mutate } = useSWR(
    token ? [url, token] : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    goals: data ?? [],
    isLoading,
    mutate,
  };
}
