'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react';
import { CategoryForm } from './CategoryForm';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/database';

interface CategoryListProps {
  categories: Category[];
  onUpdate: () => void;
}

export function CategoryList({ categories, onUpdate }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { open, onOpen, onClose } = useDisclosure();

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    onOpen();
  };

  const handleCreate = () => {
    setEditingCategory(null);
    onOpen();
  };

  const handleClose = () => {
    setEditingCategory(null);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onUpdate();
  };

  const activeCategories = categories.filter((c) => !c.is_archived);
  const archivedCategories = categories.filter((c) => c.is_archived);

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="2xl" fontWeight="bold">
          カテゴリー管理
        </Text>
        <Button onClick={handleCreate} colorPalette="blue">
          + 新規カテゴリー
        </Button>
      </HStack>

      {/* アクティブなカテゴリー */}
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={3}>
          アクティブ
        </Text>
        {activeCategories.length === 0 ? (
          <Text color="gray.500">カテゴリーがありません</Text>
        ) : (
          <VStack gap={2} align="stretch">
            {activeCategories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onUpdate={onUpdate}
              />
            ))}
          </VStack>
        )}
      </Box>

      {/* アーカイブされたカテゴリー */}
      {archivedCategories.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={3} color="gray.500">
            アーカイブ済み
          </Text>
          <VStack gap={2} align="stretch">
            {archivedCategories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onUpdate={onUpdate}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* カテゴリーフォームモーダル */}
      {open && (
        <CategoryForm
          category={editingCategory}
          onSuccess={handleSuccess}
          onCancel={handleClose}
        />
      )}
    </VStack>
  );
}

interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onUpdate: () => void;
}

function CategoryItem({ category, onEdit, onUpdate }: CategoryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('このカテゴリーをアーカイブしますか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('カテゴリーの削除に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async () => {
    setIsDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_archived: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore category');
      }

      onUpdate();
    } catch (error) {
      console.error('Error restoring category:', error);
      alert('カテゴリーの復元に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <HStack
      p={4}
      borderWidth="1px"
      borderRadius="md"
      justify="space-between"
      opacity={category.is_archived ? 0.6 : 1}
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
        {category.is_archived && (
          <Badge colorPalette="gray" variant="subtle">
            アーカイブ済み
          </Badge>
        )}
      </HStack>

      <HStack gap={2}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(category)}
          disabled={isDeleting}
        >
          編集
        </Button>
        {category.is_archived ? (
          <Button
            size="sm"
            variant="ghost"
            colorPalette="green"
            onClick={handleRestore}
            loading={isDeleting}
          >
            復元
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            colorPalette="red"
            onClick={handleDelete}
            loading={isDeleting}
          >
            削除
          </Button>
        )}
      </HStack>
    </HStack>
  );
}
