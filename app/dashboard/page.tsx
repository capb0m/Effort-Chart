'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@chakra-ui/react';
import { Timer } from '@/components/timer/Timer';
import type { Category } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/');
      return;
    }

    setUser(session.user);
    await fetchCategories();
    setLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  };

  const fetchCategories = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch('/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const { data } = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
        <Timer categories={categories} onRecordSaved={fetchCategories} />

        {/* クイックアクション */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Button
            as="a"
            href="/categories"
            colorPalette="orange"
            size="lg"
            p={8}
            h="auto"
          >
            <VStack gap={2}>
              <Text fontSize="2xl">🏷️</Text>
              <Text>カテゴリー</Text>
            </VStack>
          </Button>

          <Button
            as="a"
            href="/records"
            colorPalette="blue"
            size="lg"
            p={8}
            h="auto"
          >
            <VStack gap={2}>
              <Text fontSize="2xl">📝</Text>
              <Text>記録を追加</Text>
            </VStack>
          </Button>

          <Button
            as="a"
            href="/records"
            colorPalette="green"
            size="lg"
            p={8}
            h="auto"
          >
            <VStack gap={2}>
              <Text fontSize="2xl">📊</Text>
              <Text>記録を見る</Text>
            </VStack>
          </Button>

          <Button
            as="a"
            href="/goals"
            colorPalette="purple"
            size="lg"
            p={8}
            h="auto"
          >
            <VStack gap={2}>
              <Text fontSize="2xl">🎯</Text>
              <Text>目標設定</Text>
            </VStack>
          </Button>
        </Grid>

        {/* 今日の進捗 */}
        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="lg" mb={4}>
            今日の進捗
          </Heading>
          <Text color="gray.600">進捗表示機能は実装予定です</Text>
        </Box>

        {/* グラフ */}
        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Heading size="lg" mb={4}>
            活動グラフ
          </Heading>
          <Text color="gray.600">グラフ機能は実装予定です</Text>
        </Box>
      </VStack>
    </Container>
  );
}
