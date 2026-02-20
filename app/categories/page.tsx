'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Container, VStack, HStack, Button, Text, Spinner } from '@chakra-ui/react';
import { CategoryList } from '@/components/categories/CategoryList';
import type { Category } from '@/types/database';

export default function CategoriesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 未認証リダイレクト
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  // token 取得後にデータ取得
  useEffect(() => {
    if (!token) return;
    fetchCategories(token).then(() => setLoading(false));
  }, [token]);

  const fetchCategories = async (t: string) => {
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const { data } = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
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

        <CategoryList
          categories={categories}
          onUpdate={() => token && fetchCategories(token)}
        />
      </VStack>
    </Container>
  );
}
