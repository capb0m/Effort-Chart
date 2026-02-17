'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, VStack, HStack, Button, Text, Spinner } from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/client';
import { CategoryList } from '@/components/categories/CategoryList';
import type { Category } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export default function CategoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/');
      return;
    }

    setUser(session.user);
    await fetchCategories();
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch('/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

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

  if (loading) {
    return (
      <Container maxW="container.xl" py={10} centerContent>
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* ヘッダー */}
        <HStack justify="space-between">
          <VStack gap={0} align="start">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              mb={2}
            >
              ← ダッシュボードに戻る
            </Button>
            <Text fontSize="sm" color="gray.600">
              {user.email}
            </Text>
          </VStack>
          <Button onClick={handleSignOut} variant="outline">
            ログアウト
          </Button>
        </HStack>

        {/* カテゴリー一覧 */}
        <CategoryList categories={categories} onUpdate={fetchCategories} />
      </VStack>
    </Container>
  );
}
