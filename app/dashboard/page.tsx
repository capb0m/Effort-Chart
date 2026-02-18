'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  Spinner,
} from '@chakra-ui/react';
import { Timer } from '@/components/timer/Timer';
import type { Category } from '@/types/database';
import type { User } from '@supabase/supabase-js';

// chart.js はブラウザAPIを使うため SSR を無効化して動的インポート
const StackedAreaChart = dynamic(
  () => import('@/components/charts/StackedAreaChart').then((m) => m.StackedAreaChart),
  { ssr: false }
);

interface ChartCategory {
  id: string;
  name: string;
  color: string;
}

interface StackedData {
  dates: string[];
  categories: ChartCategory[];
  data: Record<string, string | number>[];
}

interface DailyGoal {
  id: string;
  category_name: string | null;
  category_color: string | null;
  target_hours: number;
  achieved_hours: number;
  is_achieved: boolean;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cumulativeData, setCumulativeData] = useState<StackedData | null>(null);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
      await Promise.all([
        fetchCategories(session.access_token),
        fetchCumulativeData(session.access_token),
        fetchDailyGoals(session.access_token),
      ]);

      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!newSession) router.push('/');
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (token: string) => {
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const { data } = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const refreshCategories = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) await fetchCategories(session.access_token);
  };

  const fetchDailyGoals = async (token: string) => {
    try {
      const today = new Date().toLocaleDateString('sv-SE');
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/goals?today=${today}&tz=${tz}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const all = json.goals || [];
      setDailyGoals(all.filter((g: DailyGoal & { type: string }) => g.type === 'daily'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCumulativeData = async (token: string) => {
    setCumulativeLoading(true);
    try {
      const res = await fetch('/api/charts/stacked?cumulative=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCumulativeData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setCumulativeLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <Container centerContent py={10}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between">
          <Box>
            <Heading size="2xl" mb={2}>
              ダッシュボード
            </Heading>
            <Text color="gray.600">{user.email}</Text>
          </Box>
          <Button onClick={handleSignOut} variant="outline">
            ログアウト
          </Button>
        </HStack>

        {/* タイマーセクション */}
        <Timer categories={categories} onRecordSaved={refreshCategories} />

        {/* 今日のデイリー習慣 */}
        {dailyGoals.length > 0 && (
          <Box p={6} borderWidth="1px" borderRadius="lg">
            <HStack justify="space-between" mb={4}>
              <HStack gap={2}>
                <Heading size="lg">今日のデイリー習慣</Heading>
                <Text fontSize="sm" color="gray.500">
                  {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                </Text>
              </HStack>
              <Button size="sm" variant="outline" asChild><Link href="/goals">
                管理 →
              </Link></Button>
            </HStack>
            <VStack gap={3} align="stretch">
              {dailyGoals.map((goal) => {
                const progress = Math.min(goal.achieved_hours / goal.target_hours, 1);
                const remaining = Math.max(goal.target_hours - goal.achieved_hours, 0);
                return (
                  <Box key={goal.id}>
                    <HStack justify="space-between" mb={1}>
                      <HStack gap={2}>
                        {goal.category_color && (
                          <Box w={3} h={3} borderRadius="full" bg={goal.category_color} flexShrink={0} />
                        )}
                        <Text fontWeight="medium" fontSize="sm">
                          {goal.category_name ?? '全カテゴリー合計'}
                        </Text>
                        {goal.is_achieved && (
                          <Text fontSize="xs" color="green.500" fontWeight="bold">🎉 達成！</Text>
                        )}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        <Text as="span" fontWeight="bold" color={goal.is_achieved ? 'green.600' : 'gray.800'}>
                          {formatHours(goal.achieved_hours)}
                        </Text>
                        {' / '}
                        {formatHours(goal.target_hours)}
                        {!goal.is_achieved && (
                          <Text as="span" color="gray.400"> (残り{formatHours(remaining)})</Text>
                        )}
                      </Text>
                    </HStack>
                    <Box w="100%" h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
                      <Box
                        h="100%"
                        w={`${progress * 100}%`}
                        bg={goal.is_achieved ? 'green.400' : 'blue.400'}
                        borderRadius="full"
                        style={{ transition: 'width 0.5s ease' }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* クイックアクション */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Button colorPalette="orange" size="lg" p={8} h="auto" asChild><Link href="/categories">
            <VStack gap={2}>
              <Text fontSize="2xl">🏷️</Text>
              <Text>カテゴリー</Text>
            </VStack>
          </Link></Button>
          <Button colorPalette="blue" size="lg" p={8} h="auto" asChild><Link href="/records">
            <VStack gap={2}>
              <Text fontSize="2xl">📋</Text>
              <Text>記録の追加・確認</Text>
            </VStack>
          </Link></Button>
          <Button colorPalette="purple" size="lg" p={8} h="auto" asChild><Link href="/goals">
            <VStack gap={2}>
              <Text fontSize="2xl">🎯</Text>
              <Text>目標設定</Text>
            </VStack>
          </Link></Button>
        </Grid>

        {/* 累積グラフ */}
        <Box p={6} borderWidth="1px" borderRadius="lg">
          <HStack justify="space-between" mb={4}>
            <Heading size="lg">累積グラフ</Heading>
            <Button size="sm" variant="outline" asChild><Link href="/charts">
              グラフを詳しく見る →
            </Link></Button>
          </HStack>

          {cumulativeLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner />
            </Box>
          ) : cumulativeData && cumulativeData.dates.length > 0 ? (
            <StackedAreaChart
              dates={cumulativeData.dates}
              categories={cumulativeData.categories}
              data={cumulativeData.data}
              enableZoom
              cumulativeMode
            />
          ) : (
            <Box textAlign="center" py={10}>
              <Text color="gray.500">表示するデータがありません</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  );
}
