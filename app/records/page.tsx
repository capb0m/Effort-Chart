'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  VStack,
  HStack,
  Button,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/client';
import { RecordList } from '@/components/records/RecordList';
import type { Category } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface RecordWithCategory {
  id: string;
  user_id: string;
  category_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  categories: {
    id: string;
    name: string;
    color: string;
  };
}

export default function RecordsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<RecordWithCategory[]>([]);
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
    await Promise.all([fetchRecords(), fetchCategories()]);
    setLoading(false);
  };

  const fetchRecords = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch('/api/records', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }

      const { data } = await response.json();
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
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

        {/* 記録一覧 */}
        <RecordList
          records={records}
          categories={categories}
          onUpdate={fetchRecords}
        />
      </VStack>
    </Container>
  );
}
