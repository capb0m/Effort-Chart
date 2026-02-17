'use client';

import { useState } from 'react';
import { Box, Button, VStack, HStack, Text } from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/database';

interface TimerSaveModalProps {
  categories: Category[];
  startTime: Date;
  endTime: Date;
  autoStopped?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TimerSaveModal({
  categories,
  startTime,
  endTime,
  autoStopped = false,
  onSuccess,
  onCancel,
}: TimerSaveModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (!selectedCategoryId) {
      setError('カテゴリーを選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: selectedCategoryId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save record');
      }

      // 成功メッセージを表示（一時的な実装）
      const toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48BB78;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        font-weight: 500;
      `;
      toastEl.textContent = '✓ 記録を保存しました';
      document.body.appendChild(toastEl);
      setTimeout(() => {
        toastEl.style.transition = 'opacity 0.3s';
        toastEl.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toastEl), 300);
      }, 3000);

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

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (): string => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
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
        <VStack gap={4} align="stretch">
          <Text fontSize="xl" fontWeight="bold">
            タイマー記録を保存
          </Text>

          {autoStopped && (
            <Box p={3} bg="orange.50" borderRadius="md">
              <Text color="orange.700" fontSize="sm">
                ⚠️ 10時間で自動停止しました
              </Text>
            </Box>
          )}

          {error && (
            <Box p={3} bg="red.50" borderRadius="md">
              <Text color="red.600" fontSize="sm">
                {error}
              </Text>
            </Box>
          )}

          {/* 時間情報 */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <VStack gap={2} align="stretch" fontSize="sm">
              <HStack justify="space-between">
                <Text color="gray.600">開始:</Text>
                <Text fontWeight="medium">{formatDateTime(startTime)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.600">終了:</Text>
                <Text fontWeight="medium">{formatDateTime(endTime)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.600">時間:</Text>
                <Text fontWeight="bold" fontSize="md">
                  {calculateDuration()}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* カテゴリー選択 */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              カテゴリー
            </Text>
            <VStack gap={2} align="stretch">
              {activeCategories.map((category) => (
                <Box
                  key={category.id}
                  p={3}
                  borderWidth="2px"
                  borderRadius="md"
                  borderColor={
                    selectedCategoryId === category.id
                      ? 'blue.500'
                      : 'gray.200'
                  }
                  bg={
                    selectedCategoryId === category.id ? 'blue.50' : 'white'
                  }
                  cursor="pointer"
                  onClick={() => setSelectedCategoryId(category.id)}
                  transition="all 0.2s"
                  _hover={{ borderColor: 'blue.300' }}
                >
                  <HStack gap={3}>
                    <Box
                      w={4}
                      h={4}
                      borderRadius="full"
                      bg={category.color}
                      flexShrink={0}
                    />
                    <Text fontWeight="medium">{category.name}</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
            {activeCategories.length === 0 && (
              <Text fontSize="sm" color="gray.500">
                カテゴリーが登録されていません
              </Text>
            )}
          </Box>

          {/* ボタン */}
          <HStack gap={3} justify="flex-end">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              colorPalette="blue"
              loading={isSubmitting}
              disabled={activeCategories.length === 0}
            >
              保存
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}
