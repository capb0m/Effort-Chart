import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface ChartCategory {
  id: string;
  name: string;
  color: string;
}

export interface StackedData {
  dates: string[];
  categories: ChartCategory[];
  data: Record<string, string | number>[];
}

const fetcher = async ([url, token]: [string, string]): Promise<StackedData> => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch cumulative chart data');
  return res.json();
};

export function useCumulativeChart() {
  const { token } = useAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/charts/stacked?cumulative=true', token] : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    data: data ?? null,
    isLoading,
    mutate,
  };
}
