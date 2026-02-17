'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  useDisclosure,
} from '@chakra-ui/react';
import { RecordForm } from './RecordForm';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/database';

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

interface RecordListProps {
  records: RecordWithCategory[];
  categories: Category[];
  onUpdate: () => void;
}

export function RecordList({ records, categories, onUpdate }: RecordListProps) {
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    category_id: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const { open, onOpen, onClose } = useDisclosure();

  const handleEdit = (record: RecordWithCategory) => {
    setEditingRecord({
      id: record.id,
      category_id: record.category_id,
      start_time: record.start_time,
      end_time: record.end_time,
    });
    onOpen();
  };

  const handleCreate = () => {
    setEditingRecord(null);
    onOpen();
  };

  const handleClose = () => {
    setEditingRecord(null);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onUpdate();
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="2xl" fontWeight="bold">
          記録一覧
        </Text>
        <Button onClick={handleCreate} colorPalette="blue">
          + 記録を追加
        </Button>
      </HStack>

      {records.length === 0 ? (
        <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg">
          <Text color="gray.500">記録がありません</Text>
          <Button onClick={handleCreate} colorPalette="blue" mt={4}>
            最初の記録を追加
          </Button>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {records.map((record) => (
            <RecordItem
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onUpdate={onUpdate}
              formatDateTime={formatDateTime}
              calculateDuration={calculateDuration}
            />
          ))}
        </VStack>
      )}

      {/* 記録フォームモーダル */}
      {open && (
        <RecordForm
          categories={categories}
          record={editingRecord}
          onSuccess={handleSuccess}
          onCancel={handleClose}
        />
      )}
    </VStack>
  );
}

interface RecordItemProps {
  record: RecordWithCategory;
  onEdit: (record: RecordWithCategory) => void;
  onUpdate: () => void;
  formatDateTime: (isoString: string) => string;
  calculateDuration: (start: string, end: string) => string;
}

function RecordItem({
  record,
  onEdit,
  onUpdate,
  formatDateTime,
  calculateDuration,
}: RecordItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この記録を削除しますか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const response = await fetch(`/api/records/${record.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete record');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert(
        '記録の削除に失敗しました: ' +
          (error instanceof Error ? error.message : '不明なエラー')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      <HStack justify="space-between" align="start">
        <VStack gap={2} align="start" flex={1}>
          <HStack gap={2}>
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={record.categories.color}
              flexShrink={0}
            />
            <Text fontWeight="semibold">{record.categories.name}</Text>
            <Badge colorPalette="blue" variant="subtle">
              {calculateDuration(record.start_time, record.end_time)}
            </Badge>
          </HStack>

          <VStack gap={1} align="start" fontSize="sm" color="gray.600">
            <Text>開始: {formatDateTime(record.start_time)}</Text>
            <Text>終了: {formatDateTime(record.end_time)}</Text>
          </VStack>
        </VStack>

        <HStack gap={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(record)}
            disabled={isDeleting}
          >
            編集
          </Button>
          <Button
            size="sm"
            variant="ghost"
            colorPalette="red"
            onClick={handleDelete}
            loading={isDeleting}
          >
            削除
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
