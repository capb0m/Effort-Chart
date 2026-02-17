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

interface CategoryFormProps {
  category?: Category | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F59E0B', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // purple
  '#EC4899', // pink
];

export function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('カテゴリー名を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('認証が必要です');
      }

      const url = category
        ? `/api/categories/${category.id}`
        : '/api/categories';
      const method = category ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save category');
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving category:', err);
      setError(
        err instanceof Error ? err.message : 'カテゴリーの保存に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {category ? 'カテゴリー編集' : '新規カテゴリー'}
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
                カテゴリー名
              </Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 勉強、運動、読書"
                autoFocus
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                色
              </Text>
              <HStack gap={2} flexWrap="wrap">
                {PRESET_COLORS.map((presetColor) => (
                  <Box
                    key={presetColor}
                    w={10}
                    h={10}
                    bg={presetColor}
                    borderRadius="md"
                    cursor="pointer"
                    border={color === presetColor ? '3px solid' : 'none'}
                    borderColor="gray.800"
                    onClick={() => setColor(presetColor)}
                    transition="transform 0.2s"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                ))}
              </HStack>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                mt={3}
                h={10}
                cursor="pointer"
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
              >
                {category ? '更新' : '作成'}
              </Button>
            </HStack>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}
