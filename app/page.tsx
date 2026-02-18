'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Box, Container, Heading, Text, Button, VStack } from '@chakra-ui/react';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証状態の確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <Container centerContent py={10}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  if (user) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack gap={6} align="stretch">
          <Box>
            <Heading size="2xl" mb={4}>
              Effort Chart
            </Heading>
            <Text fontSize="lg" color="gray.600">
              ようこそ、{user.email} さん
            </Text>
          </Box>

          <Box>
            <Button colorPalette="blue" size="lg" mb={4} asChild><Link href="/dashboard">
              ダッシュボードへ
            </Link></Button>
          </Box>

          <Box>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              ログアウト
            </Button>
          </Box>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={20}>
      <VStack gap={8}>
        <Box textAlign="center">
          <Heading size="3xl" mb={4}>
            Effort Chart
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            日々の努力を記録し、可視化するアプリ
          </Text>
        </Box>

        <VStack gap={4}>
          <Text fontSize="lg">主な機能:</Text>
          <VStack gap={2} align="start">
            <Text>✓ 活動時間の記録（手動入力 / タイマー）</Text>
            <Text>✓ カテゴリー別の集計とグラフ表示</Text>
            <Text>✓ 目標設定と進捗管理</Text>
            <Text>✓ 24時間タイムライン表示</Text>
          </VStack>
        </VStack>

        <Button onClick={handleSignIn} colorPalette="blue" size="xl">
          Googleアカウントでログイン
        </Button>
      </VStack>
    </Container>
  );
}
