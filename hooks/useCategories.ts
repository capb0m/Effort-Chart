import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@/types/database';

const fetcher = async ([url, token]: [string, string]): Promise<Category[]> => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  const json = await res.json();
  return json.data || [];
};

export function useCategories() {
  const { token } = useAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/categories', token] : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    categories: data ?? [],
    isLoading,
    mutate,
  };
}
