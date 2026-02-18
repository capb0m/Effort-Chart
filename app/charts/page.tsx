'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  Heading,
  Spinner,
  Input,
} from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// chart.js はブラウザAPIを使うため SSR を無効化して動的インポート
const StackedAreaChart = dynamic(
  () => import('@/components/charts/StackedAreaChart').then((m) => m.StackedAreaChart),
  { ssr: false, loading: () => <Box textAlign="center" py={10}><Spinner /></Box> }
);
const TimelineDonutChart = dynamic(
  () => import('@/components/charts/TimelineDonutChart').then((m) => m.TimelineDonutChart),
  { ssr: false, loading: () => <Box textAlign="center" py={10}><Spinner /></Box> }
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

interface TimelineSegment {
  startMinute: number;
  endMinute: number;
  categoryId: string;
  categoryName: string;
  color: string;
  hours: number;
}

type TabType = 'period' | 'cumulative' | 'timeline';

const today = new Date().toLocaleDateString('sv-SE');

export default function ChartsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('period');

  // 期間指定グラフ
  const [stackedData, setStackedData] = useState<StackedData | null>(null);
  const [stackedLoading, setStackedLoading] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [periodEnd, setPeriodEnd] = useState(today);

  // 累積グラフ
  const [cumulativeData, setCumulativeData] = useState<StackedData | null>(null);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);
  const [cumulativeFetched, setCumulativeFetched] = useState(false);

  // タイムライングラフ
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineDate, setTimelineDate] = useState(today);
  const [timelineFetched, setTimelineFetched] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // タブ切り替え・日付変更でデータ取得（必要なタブのみ）
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'cumulative' && !cumulativeFetched) {
      fetchCumulativeData();
    }
    if (activeTab === 'timeline') {
      fetchTimelineData(timelineDate);
    }
  }, [activeTab, timelineDate, user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }
    setUser(session.user);
    setLoading(false);
    // 初回は表示中のタブ（period）のデータのみ取得
    fetchStackedData();
  };

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || '';
  };

  const fetchStackedData = async (start = periodStart, end = periodEnd) => {
    setStackedLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/charts/stacked?start_date=${start}T00:00:00&end_date=${end}T23:59:59`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setStackedData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setStackedLoading(false);
    }
  };

  const fetchCumulativeData = async () => {
    setCumulativeLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/charts/stacked?cumulative=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCumulativeData(json);
      setCumulativeFetched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCumulativeLoading(false);
    }
  };

  const fetchTimelineData = async (date: string) => {
    setTimelineLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/charts/timeline?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setTimelineSegments(json.segments || []);
      setTimelineFetched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setTimelineLoading(false);
    }
  };

  // 日付を1日ずらす
  const shiftDate = (date: string, days: number): string => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('sv-SE');
  };

  const isToday = timelineDate >= today;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'period', label: '期間別グラフ' },
    { key: 'cumulative', label: '累積グラフ' },
    { key: 'timeline', label: '24時間タイムライン' },
  ];

  if (loading) {
    return (
      <Container maxW="container.xl" py={10} centerContent>
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!user) return null;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between">
          <VStack gap={0} align="start">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} mb={2}>
              ← ダッシュボードに戻る
            </Button>
            <Text fontSize="sm" color="gray.600">{user.email}</Text>
          </VStack>
          <Button onClick={handleSignOut} variant="outline">ログアウト</Button>
        </HStack>

        <Heading size="xl">グラフ</Heading>

        {/* タブ */}
        <HStack gap={0} borderWidth="1px" borderRadius="md" overflow="hidden" w="fit-content">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              variant="ghost"
              borderRadius="none"
              bg={activeTab === tab.key ? 'blue.500' : 'white'}
              color={activeTab === tab.key ? 'white' : 'gray.700'}
              _hover={{ bg: activeTab === tab.key ? 'blue.600' : 'gray.50' }}
              px={6}
            >
              {tab.label}
            </Button>
          ))}
        </HStack>

        {/* 期間別グラフ */}
        {activeTab === 'period' && (
          <Box p={6} borderWidth="1px" borderRadius="lg">
            <Heading size="md" mb={4}>カテゴリー別 期間グラフ</Heading>

            <HStack gap={4} mb={6} flexWrap="wrap">
              <HStack gap={2}>
                <Text fontSize="sm" whiteSpace="nowrap">開始日:</Text>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  size="sm"
                  w="160px"
                />
              </HStack>
              <HStack gap={2}>
                <Text fontSize="sm" whiteSpace="nowrap">終了日:</Text>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  size="sm"
                  w="160px"
                />
              </HStack>
              <Button
                size="sm"
                colorPalette="blue"
                onClick={() => fetchStackedData()}
              >
                表示
              </Button>
            </HStack>

            <Text fontSize="xs" color="gray.500" mb={4}>
              マウスホイールでズーム、ドラッグでスクロールできます
            </Text>

            {stackedLoading ? (
              <Box textAlign="center" py={10}><Spinner /></Box>
            ) : stackedData && stackedData.dates.length > 0 ? (
              <StackedAreaChart
                dates={stackedData.dates}
                categories={stackedData.categories}
                data={stackedData.data}
                enableZoom
                periodMode
              />
            ) : (
              <Box textAlign="center" py={10}>
                <Text color="gray.500">表示するデータがありません</Text>
              </Box>
            )}
          </Box>
        )}

        {/* 累積グラフ */}
        {activeTab === 'cumulative' && (
          <Box p={6} borderWidth="1px" borderRadius="lg">
            <Heading size="md" mb={2}>累積グラフ</Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>
              マウスホイールでズーム、ドラッグでスクロールできます
            </Text>

            {cumulativeLoading ? (
              <Box textAlign="center" py={10}><Spinner /></Box>
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
        )}

        {/* 24時間タイムライン */}
        {activeTab === 'timeline' && (
          <Box p={6} borderWidth="1px" borderRadius="lg">
            <Heading size="md" mb={4}>24時間タイムライン</Heading>

            <HStack gap={3} mb={6} align="center" flexWrap="wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimelineDate(shiftDate(timelineDate, -1))}
              >
                ← 前の日
              </Button>

              <Input
                type="date"
                value={timelineDate}
                onChange={(e) => setTimelineDate(e.target.value)}
                size="sm"
                w="160px"
              />

              {!isToday && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTimelineDate(shiftDate(timelineDate, 1))}
                >
                  次の日 →
                </Button>
              )}

              <Text fontSize="sm" color="gray.500">
                {new Date(timelineDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </Text>
            </HStack>

            {timelineLoading ? (
              <Box textAlign="center" py={10}><Spinner /></Box>
            ) : (
              <TimelineDonutChart segments={timelineSegments} />
            )}
          </Box>
        )}
      </VStack>
    </Container>
  );
}
