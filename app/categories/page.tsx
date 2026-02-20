'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Container, VStack, HStack, Button, Text, Spinner } from '@chakra-ui/react';
import { CategoryList } from '@/components/categories/CategoryList';
import { useCategories } from '@/hooks/useCategories';

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { categories, isLoading, mutate } = useCategories();

  // 未認証リダイレクト
  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || isLoading) {
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
          onUpdate={() => mutate()}
        />
      </VStack>
    </Container>
  );
}
