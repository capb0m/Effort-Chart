'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Container,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  Heading,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { RecordForm } from '@/components/records/RecordForm';
import { StackedAreaChart } from '@/components/charts/StackedAreaChart';
import type { Category } from '@/types/database';

interface RecordWithCategory {
  id: string;
  user_id: string;
  category_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string; color: string };
}

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

type ViewMode = 'day' | 'week' | 'month';

function getPeriodLabel(mode: ViewMode, anchor: Date): string {
  if (mode === 'day') {
    return anchor.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });
  }
  if (mode === 'week') {
    const start = getWeekStart(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} 〜 ${end.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`;
  }
  return anchor.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getPeriodRange(mode: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (mode === 'day') {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(anchor);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (mode === 'week') {
    const start = getWeekStart(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function shiftAnchor(mode: ViewMode, anchor: Date, dir: number): Date {
  const d = new Date(anchor);
  if (mode === 'day') d.setDate(d.getDate() + dir);
  if (mode === 'week') d.setDate(d.getDate() + dir * 7);
  if (mode === 'month') d.setMonth(d.getMonth() + dir);
  return d;
}

function calcDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function groupByDate(records: RecordWithCategory[]): Map<string, RecordWithCategory[]> {
  const map = new Map<string, RecordWithCategory[]>();
  records.forEach((r) => {
    const key = new Date(r.start_time).toLocaleDateString('sv-SE');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });
  return map;
}

function totalDuration(records: RecordWithCategory[]): string {
  const ms = records.reduce(
    (sum, r) => sum + new Date(r.end_time).getTime() - new Date(r.start_time).getTime(),
    0
  );
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function getCategoryTotals(records: RecordWithCategory[]) {
  const map = new Map<string, { name: string; color: string; totalMs: number }>();
  records.forEach((r) => {
    const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
    const cat = r.categories;
    if (!map.has(cat.id)) map.set(cat.id, { name: cat.name, color: cat.color, totalMs: 0 });
    map.get(cat.id)!.totalMs += ms;
  });
  return Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs);
}

function formatMs(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

export default function RecordsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, signOut } = useAuth();
  const [records, setRecords] = useState<RecordWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState<{
    id: string; category_id: string; start_time: string; end_time: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [chartData, setChartData] = useState<StackedData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  // 未認証リダイレクト
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  // token 取得後に初期データ取得
  useEffect(() => {
    if (!token) return;
    fetchCategories(token).then(() => setLoading(false));
  }, [token]);

  // viewMode / anchor 変更時にデータ再取得
  useEffect(() => {
    if (!token) return;
    fetchRecords(token);
    fetchChartData(token);
  }, [viewMode, anchor, token]);

  const fetchRecords = async (t: string) => {
    try {
      const { start, end } = getPeriodRange(viewMode, anchor);
      const res = await fetch(
        `/api/records?start_date=${start.toISOString()}&end_date=${end.toISOString()}`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const { data } = await res.json();
      setRecords(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchChartData = async (t: string) => {
    setChartLoading(true);
    try {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
      const res = await fetch(
        `/api/charts/stacked?start_date=${monthStart.toISOString()}&end_date=${monthEnd.toISOString()}`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const json = await res.json();
      setChartData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchCategories = async (t: string) => {
    try {
      const res = await fetch('/api/categories', { headers: { Authorization: `Bearer ${t}` } });
      const { data } = await res.json();
      setCategories(data || []);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？') || !token) return;
    try {
      await fetch(`/api/records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords(token);
      fetchChartData(token);
    } catch (e) { console.error(e); }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const isAtLatest = (() => {
    const now = new Date();
    if (viewMode === 'day') return anchor.toLocaleDateString('sv-SE') >= now.toLocaleDateString('sv-SE');
    if (viewMode === 'week') return getWeekStart(anchor) >= getWeekStart(now);
    return anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth();
  })();

  if (authLoading || loading) {
    return (
      <Container maxW="container.xl" py={10} centerContent>
        <Spinner size="xl" />
      </Container>
    );
  }

  const grouped = groupByDate(records);
  const sortedDates = Array.from(grouped.keys()).sort().reverse();
  const categoryTotals = getCategoryTotals(records);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between">
          <VStack gap={0} align="start">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} mb={1}>
              ← ダッシュボードに戻る
            </Button>
            <Text fontSize="sm" color="gray.600">{user?.email}</Text>
          </VStack>
          <Button onClick={handleSignOut} variant="outline">ログアウト</Button>
        </HStack>

        <Heading size="xl">記録の追加・確認</Heading>

        {/* ビューモード切り替え */}
        <HStack gap={0} borderWidth="1px" borderRadius="md" overflow="hidden" w="fit-content">
          {([['day', '日'], ['week', '週'], ['month', '月']] as const).map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setViewMode(key)}
              variant="ghost"
              borderRadius="none"
              bg={viewMode === key ? 'gray.700' : 'white'}
              color={viewMode === key ? 'white' : 'gray.700'}
              _hover={{ bg: viewMode === key ? 'gray.800' : 'gray.50' }}
              px={5}
              size="sm"
            >
              {label}
            </Button>
          ))}
        </HStack>

        {/* 期間ナビゲーション */}
        <HStack gap={3} align="center" flexWrap="wrap">
          <Button size="sm" variant="outline" onClick={() => setAnchor(shiftAnchor(viewMode, anchor, -1))}>←</Button>
          <Text fontWeight="semibold" minW="200px" textAlign="center">
            {getPeriodLabel(viewMode, anchor)}
          </Text>
          <Button size="sm" variant="outline" onClick={() => setAnchor(shiftAnchor(viewMode, anchor, 1))} disabled={isAtLatest}>→</Button>
          <Button size="sm" variant="ghost" colorPalette="blue" onClick={() => setAnchor(new Date())}>
            今{viewMode === 'day' ? '日' : viewMode === 'week' ? '週' : '月'}
          </Button>
          <Box flex={1} />
          <Button size="sm" colorPalette="blue" onClick={() => { setEditingRecord(null); setShowForm(true); }}>
            + 記録を追加
          </Button>
        </HStack>

        {/* 2カラムレイアウト */}
        <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} alignItems="start">
          {/* 左カラム: 記録一覧 */}
          <VStack gap={4} align="stretch">
            {categoryTotals.length > 0 && (
              <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
                <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                  カテゴリ別合計
                  <Text as="span" fontWeight="normal" color="gray.500" ml={2}>
                    （合計: {totalDuration(records)} / {records.length}件）
                  </Text>
                </Text>
                <VStack gap={2} align="stretch">
                  {categoryTotals.map((cat) => (
                    <HStack key={cat.name} justify="space-between">
                      <HStack gap={2}>
                        <Box w={3} h={3} borderRadius="full" bg={cat.color} flexShrink={0} />
                        <Text fontSize="sm">{cat.name}</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">{formatMs(cat.totalMs)}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

            {sortedDates.length === 0 ? (
              <Box p={10} textAlign="center" borderWidth="1px" borderRadius="lg">
                <Text color="gray.500">この期間の記録はありません</Text>
                <Button mt={4} size="sm" colorPalette="blue" onClick={() => { setEditingRecord(null); setShowForm(true); }}>
                  記録を追加
                </Button>
              </Box>
            ) : (
              <VStack gap={4} align="stretch">
                {sortedDates.map((dateKey) => {
                  const dayRecords = grouped.get(dateKey)!;
                  return (
                    <Box key={dateKey} borderWidth="1px" borderRadius="lg" overflow="hidden">
                      <HStack px={4} py={2} bg="gray.50" borderBottomWidth="1px" justify="space-between">
                        <Text fontWeight="semibold" fontSize="sm">{formatDate(dayRecords[0].start_time)}</Text>
                        <Text fontSize="sm" color="gray.500">{totalDuration(dayRecords)}</Text>
                      </HStack>
                      <VStack gap={0} align="stretch" divideY="1px">
                        {dayRecords
                          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                          .map((r) => (
                            <HStack key={r.id} px={4} py={3} justify="space-between" _hover={{ bg: 'gray.50' }}>
                              <HStack gap={3}>
                                <Box w={3} h={3} borderRadius="full" bg={r.categories.color} flexShrink={0} />
                                <VStack gap={0} align="start">
                                  <Text fontSize="sm" fontWeight="medium">{r.categories.name}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatTime(r.start_time)} 〜 {formatTime(r.end_time)}
                                  </Text>
                                </VStack>
                              </HStack>
                              <HStack gap={3}>
                                <Badge colorPalette="blue" variant="subtle">{calcDuration(r.start_time, r.end_time)}</Badge>
                                <Button size="xs" variant="ghost" onClick={() => { setEditingRecord({ id: r.id, category_id: r.category_id, start_time: r.start_time, end_time: r.end_time }); setShowForm(true); }}>編集</Button>
                                <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleDelete(r.id)}>削除</Button>
                              </HStack>
                            </HStack>
                          ))}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>

          {/* 右カラム: グラフ */}
          <Box borderWidth="1px" borderRadius="lg" p={4} position="sticky" top={4}>
            <Text fontWeight="semibold" mb={3} fontSize="sm" color="gray.600">
              {anchor.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}のグラフ
            </Text>
            {chartLoading ? (
              <Box textAlign="center" py={10}><Spinner /></Box>
            ) : chartData && chartData.dates.length > 0 ? (
              <StackedAreaChart dates={chartData.dates} categories={chartData.categories} data={chartData.data} enableZoom periodMode />
            ) : (
              <Box textAlign="center" py={10}>
                <Text color="gray.500" fontSize="sm">この期間のデータがありません</Text>
              </Box>
            )}
          </Box>
        </Box>
      </VStack>

      {showForm && (
        <RecordForm
          categories={categories}
          record={editingRecord}
          onSuccess={() => {
            setShowForm(false);
            if (token) { fetchRecords(token); fetchChartData(token); }
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </Container>
  );
}
