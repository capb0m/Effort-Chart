'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/database';

interface RecordFormProps {
  categories: Category[];
  record?: {
    id: string;
    category_id: string;
    start_time: string;
    end_time: string;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordForm({
  categories,
  record,
  onSuccess,
  onCancel,
}: RecordFormProps) {
  const [categoryId, setCategoryId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      setCategoryId(record.category_id);
      // ISO文字列をローカルdatetime形式に変換
      setStartTime(formatDateTimeLocal(new Date(record.start_time)));
      setEndTime(formatDateTimeLocal(new Date(record.end_time)));
    } else {
      // デフォルトで現在時刻の1時間前を開始、現在を終了に設定
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartTime(formatDateTimeLocal(oneHourAgo));
      setEndTime(formatDateTimeLocal(now));
    }
  }, [record]);

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('カテゴリーを選択してください');
      return;
    }

    if (!startTime || !endTime) {
      setError('開始時間と終了時間を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const url = record ? `/api/records/${record.id}` : '/api/records';
      const method = record ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: categoryId,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save record');
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving record:', err);
      setError(
        err instanceof Error ? err.message : '記録の保存に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = categories.filter((c) => !c.is_archived);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.5)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      onClick={onCancel}
    >
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        maxW="md"
        w="full"
        mx={4}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Text fontSize="xl" fontWeight="bold">
              {record ? '記録を編集' : '記録を追加'}
            </Text>

            {error && (
              <Box p={3} bg="red.50" borderRadius="md">
                <Text color="red.600" fontSize="sm">
                  {error}
                </Text>
              </Box>
            )}

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                カテゴリー
              </Text>
              <Box
                as="select"
                value={categoryId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setCategoryId(e.target.value)
                }
                w="full"
                h="10"
                px="3"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                fontSize="md"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                }}
              >
                <option value="">カテゴリーを選択</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Box>
              {activeCategories.length === 0 && (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  カテゴリーが登録されていません。先にカテゴリーを作成してください。
                </Text>
              )}
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                開始時間
              </Text>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                終了時間
              </Text>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Box>

            <HStack gap={3} justify="flex-end">
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                colorPalette="blue"
                loading={isSubmitting}
                disabled={activeCategories.length === 0}
              >
                {record ? '更新' : '作成'}
              </Button>
            </HStack>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}
