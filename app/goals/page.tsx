'use client';

import { useEffect, useRef, useState } from 'react';
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

interface GoalWithProgress {
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

interface Category {
  id: string;
  name: string;
  color: string;
  is_archived: boolean;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: 'white',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: '100%',
  cursor: 'pointer',
};

export default function GoalsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, signOut } = useAuth();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // フォーム状態
  const [formType, setFormType] = useState<'daily' | 'period'>('daily');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTargetHours, setFormTargetHours] = useState('');
  const [formTargetMinutes, setFormTargetMinutes] = useState('0');
  const [formDeadline, setFormDeadline] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const celebratedRef = useRef<Set<string>>(new Set());

  // 未認証リダイレクト
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  // token 取得後に初期データ取得
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchCategories(token),
      fetchGoals(token),
    ]).then(() => setLoading(false));
  }, [token]);

  const fetchGoals = async (t: string) => {
    try {
      const today = new Date().toLocaleDateString('sv-SE');
      const tz = new Date().getTimezoneOffset();
      const res = await fetch(`/api/goals?today=${today}&tz=${tz}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      const fetchedGoals: GoalWithProgress[] = json.goals || [];
      setGoals(fetchedGoals);

      const newlyAchieved = fetchedGoals.filter(
        (g) => g.is_achieved && !celebratedRef.current.has(g.id)
      );
      if (newlyAchieved.length > 0) {
        newlyAchieved.forEach((g) => celebratedRef.current.add(g.id));
        fireConfetti();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async (t: string) => {
    try {
      const res = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${t}` },
      });
      const { data } = await res.json();
      setCategories((data || []).filter((c: Category) => !c.is_archived));
    } catch (e) {
      console.error(e);
    }
  };

  const fireConfetti = async () => {
    if (typeof window === 'undefined') return;
    const confetti = (await import('canvas-confetti')).default;
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 }, colors: ['#f9a825', '#ef5350', '#42a5f5', '#66bb6a', '#ab47bc'] });
    setTimeout(() => {
      confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } });
      confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } });
    }, 400);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この目標を削除しますか？') || !token) return;
    try {
      await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      celebratedRef.current.delete(id);
      fetchGoals(token);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    const hours = Number(formTargetHours);
    const minutes = Number(formTargetMinutes);
    if (isNaN(hours) || hours < 0 || isNaN(minutes) || minutes < 0 || minutes >= 60) {
      setFormError('目標時間を正しく入力してください');
      return;
    }
    const totalHours = hours + minutes / 60;
    if (totalHours <= 0) { setFormError('目標時間は0より大きくしてください'); return; }
    if (formType === 'period' && !formDeadline) { setFormError('期日を設定してください'); return; }
    if (!token) return;

    setFormLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: formType,
          category_id: formCategoryId || null,
          target_hours: totalHours,
          deadline: formType === 'period' ? formDeadline : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error || '目標の作成に失敗しました');
        return;
      }
      setShowForm(false);
      resetForm();
      fetchGoals(token);
    } catch (e) {
      console.error(e);
      setFormError('目標の作成に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('daily');
    setFormCategoryId('');
    setFormTargetHours('');
    setFormTargetMinutes('0');
    setFormDeadline('');
    setFormError('');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <Container maxW="container.xl" py={10} centerContent>
        <Spinner size="xl" />
      </Container>
    );
  }

  const dailyGoals = goals.filter((g) => g.type === 'daily');
  const periodGoals = goals.filter((g) => g.type === 'period');
  const today = new Date().toLocaleDateString('sv-SE');
  const todayLabel = new Date(`${today}T00:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

  const renderGoalCard = (goal: GoalWithProgress) => {
    const progress = Math.min(goal.achieved_hours / goal.target_hours, 1);
    const remaining = Math.max(goal.target_hours - goal.achieved_hours, 0);
    const isExpired = goal.type === 'period' && goal.deadline && goal.deadline < new Date().toISOString() && !goal.is_achieved;

    return (
      <Box key={goal.id} p={5} borderWidth="1px" borderRadius="lg" borderColor={goal.is_achieved ? 'green.300' : 'gray.200'} bg={goal.is_achieved ? 'green.50' : 'white'}>
        <HStack justify="space-between" mb={3} align="start">
          <VStack align="start" gap={1}>
            <HStack gap={2} flexWrap="wrap">
              {goal.category_color && <Box w={3} h={3} borderRadius="full" bg={goal.category_color} flexShrink={0} mt="2px" />}
              <Text fontWeight="bold" fontSize="lg">{goal.category_name ?? '全カテゴリー合計'}</Text>
              {goal.is_achieved && <Badge colorPalette="green">🎉 達成！</Badge>}
              {isExpired && <Badge colorPalette="red" variant="subtle">期限切れ</Badge>}
            </HStack>
            {goal.type === 'daily' && <Text fontSize="xs" color="blue.500" fontWeight="medium">今日（{todayLabel}）の進捗 ／ 翌日自動リセット</Text>}
            {goal.type === 'period' && goal.deadline && <Text fontSize="xs" color="gray.500">期日: {formatDeadline(goal.deadline)}</Text>}
          </VStack>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleDelete(goal.id)} flexShrink={0}>削除</Button>
        </HStack>

        <Box mb={3}>
          <Box w="100%" h="12px" bg="gray.100" borderRadius="full" overflow="hidden">
            <Box h="100%" w={`${progress * 100}%`} bg={goal.is_achieved ? 'green.400' : 'blue.400'} borderRadius="full" style={{ transition: 'width 0.5s ease' }} />
          </Box>
        </Box>

        <HStack justify="space-between" fontSize="sm">
          <Text color="gray.600">
            <Text as="span" fontWeight="bold" color={goal.is_achieved ? 'green.600' : 'gray.800'} fontSize="md">{formatHours(goal.achieved_hours)}</Text>
            {' / '}
            {formatHours(goal.target_hours)}
          </Text>
          {goal.is_achieved ? <Text color="green.600" fontWeight="semibold">目標達成 🎉</Text> : <Text color="gray.500">残り {formatHours(remaining)}</Text>}
        </HStack>
      </Box>
    );
  };

  const hasDuplicateDaily = formType === 'daily' && dailyGoals.some((g) => (g.category_id ?? '') === formCategoryId);

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between">
          <VStack gap={0} align="start">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} mb={1}>← ダッシュボードに戻る</Button>
            <Text fontSize="sm" color="gray.600">{user?.email}</Text>
          </VStack>
          <Button onClick={handleSignOut} variant="outline">ログアウト</Button>
        </HStack>

        <HStack justify="space-between" align="center">
          <Heading size="xl">目標設定</Heading>
          <Button colorPalette="blue" onClick={() => { resetForm(); setShowForm(true); }}>+ 目標を追加</Button>
        </HStack>

        {/* デイリー習慣 */}
        <Box>
          <HStack mb={3} gap={2} align="center">
            <Heading size="md">デイリー習慣</Heading>
            <Badge colorPalette="blue" variant="subtle" fontSize="xs">毎日繰り返し</Badge>
          </HStack>
          <Text fontSize="sm" color="gray.500" mb={4}>一度設定すると毎日継続して追跡されます。進捗は深夜0時に自動でリセットされます。</Text>
          {dailyGoals.length === 0 ? (
            <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg" borderStyle="dashed">
              <Text color="gray.400" mb={3}>デイリー習慣がまだ設定されていません</Text>
              <Button size="sm" colorPalette="blue" variant="outline" onClick={() => { resetForm(); setFormType('daily'); setShowForm(true); }}>+ デイリー習慣を追加</Button>
            </Box>
          ) : (
            <VStack gap={4} align="stretch">{dailyGoals.map(renderGoalCard)}</VStack>
          )}
        </Box>

        {/* 期間目標 */}
        <Box>
          <HStack mb={3} gap={2} align="center">
            <Heading size="md">期間目標</Heading>
            <Badge colorPalette="purple" variant="subtle" fontSize="xs">期日まで</Badge>
          </HStack>
          <Text fontSize="sm" color="gray.500" mb={4}>期日までに達成したい目標を設定します。</Text>
          {periodGoals.length === 0 ? (
            <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg" borderStyle="dashed">
              <Text color="gray.400" mb={3}>期間目標がまだ設定されていません</Text>
              <Button size="sm" colorPalette="purple" variant="outline" onClick={() => { resetForm(); setFormType('period'); setShowForm(true); }}>+ 期間目標を追加</Button>
            </Box>
          ) : (
            <VStack gap={4} align="stretch">{periodGoals.map(renderGoalCard)}</VStack>
          )}
        </Box>
      </VStack>

      {/* 目標追加モーダル */}
      {showForm && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={1000} display="flex" alignItems="center" justifyContent="center" p={4} onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
          <Box bg="white" borderRadius="xl" p={6} w="100%" maxW="480px" boxShadow="xl">
            <Heading size="md" mb={5}>目標を追加</Heading>
            <VStack gap={4} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>目標の種類</Text>
                <HStack gap={0} borderWidth="1px" borderRadius="md" overflow="hidden">
                  {([['daily', 'デイリー習慣（毎日）'], ['period', '期間目標（期日まで）']] as const).map(([key, label]) => (
                    <Button key={key} flex={1} variant="ghost" borderRadius="none" bg={formType === key ? 'blue.500' : 'white'} color={formType === key ? 'white' : 'gray.700'} _hover={{ bg: formType === key ? 'blue.600' : 'gray.50' }} onClick={() => setFormType(key)} fontSize="sm">{label}</Button>
                  ))}
                </HStack>
                {formType === 'daily' && <Text fontSize="xs" color="blue.500" mt={2}>毎日の目標時間を設定します。深夜0時に進捗が自動リセットされます。</Text>}
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>対象カテゴリー</Text>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} style={selectStyle}>
                  <option value="">全カテゴリー合計</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                {hasDuplicateDaily && <Text fontSize="xs" color="orange.500" mt={1}>⚠ このカテゴリーのデイリー習慣はすでに存在します</Text>}
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>{formType === 'daily' ? '1日の目標時間' : '目標時間（合計）'}</Text>
                <HStack gap={2}>
                  <HStack gap={1} flex={1}>
                    <input type="number" min={0} max={9999} placeholder="0" value={formTargetHours} onChange={(e) => setFormTargetHours(e.target.value)} style={{ ...inputStyle, width: '80px', textAlign: 'right' }} />
                    <Text fontSize="sm" color="gray.600">時間</Text>
                  </HStack>
                  <HStack gap={1} flex={1}>
                    <select value={formTargetMinutes} onChange={(e) => setFormTargetMinutes(e.target.value)} style={selectStyle}>
                      {[0, 10, 15, 20, 30, 40, 45, 50].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <Text fontSize="sm" color="gray.600">分</Text>
                  </HStack>
                </HStack>
              </Box>

              {formType === 'period' && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>期日</Text>
                  <input type="date" value={formDeadline} min={new Date().toLocaleDateString('sv-SE')} onChange={(e) => setFormDeadline(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </Box>
              )}

              {formError && <Text color="red.500" fontSize="sm">{formError}</Text>}

              <HStack justify="flex-end" gap={3} pt={2}>
                <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} disabled={formLoading}>キャンセル</Button>
                <Button colorPalette="blue" onClick={handleSubmit} loading={formLoading}>追加する</Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Container>
  );
}
