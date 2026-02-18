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

type InputMode = 'duration' | 'endTime';

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
  const [inputMode, setInputMode] = useState<InputMode>('duration');
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (record) {
      setCategoryId(record.category_id);
      setStartTime(formatDateTimeLocal(new Date(record.start_time)));
      setEndTime(formatDateTimeLocal(new Date(record.end_time)));
      // 編集時は既存の終了時間から継続時間も計算しておく
      const totalMinutes = Math.round(
        (new Date(record.end_time).getTime() - new Date(record.start_time).getTime()) / 60000
      );
      setDurationHours(Math.floor(totalMinutes / 60));
      setDurationMinutes(totalMinutes % 60);
      setInputMode('endTime');
    } else {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartTime(formatDateTimeLocal(oneHourAgo));
      setEndTime(formatDateTimeLocal(now));
      setDurationHours(1);
      setDurationMinutes(0);
      setInputMode('duration');
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

  // 開始時間 + 継続時間 → 終了時間を計算
  const calcEndFromDuration = (): Date | null => {
    if (!startTime) return null;
    const totalMinutes = durationHours * 60 + durationMinutes;
    if (totalMinutes <= 0) return null;
    return new Date(new Date(startTime).getTime() + totalMinutes * 60000);
  };

  // 開始時間・終了時間 → 継続時間を計算
  const calcDurationFromTimes = (): { hours: number; minutes: number } | null => {
    if (!startTime || !endTime) return null;
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (ms <= 0) return null;
    const total = Math.round(ms / 60000);
    return { hours: Math.floor(total / 60), minutes: total % 60 };
  };

  const handleModeChange = (mode: InputMode) => {
    if (mode === inputMode) return;
    if (mode === 'endTime') {
      // 継続時間モード → 終了時間モード: 継続時間から終了時間を算出してセット
      const computed = calcEndFromDuration();
      if (computed) setEndTime(formatDateTimeLocal(computed));
    } else {
      // 終了時間モード → 継続時間モード: 開始・終了時間から継続時間を算出してセット
      const dur = calcDurationFromTimes();
      if (dur) {
        setDurationHours(dur.hours);
        setDurationMinutes(dur.minutes);
      }
    }
    setInputMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('カテゴリーを選択してください');
      return;
    }
    if (!startTime) {
      setError('開始時間を入力してください');
      return;
    }

    let resolvedEndTime: string;

    if (inputMode === 'duration') {
      const computed = calcEndFromDuration();
      if (!computed) {
        setError('継続時間を入力してください（1分以上）');
        return;
      }
      resolvedEndTime = computed.toISOString();
    } else {
      if (!endTime) {
        setError('終了時間を入力してください');
        return;
      }
      if (new Date(endTime) <= new Date(startTime)) {
        setError('終了時間は開始時間より後にしてください');
        return;
      }
      resolvedEndTime = new Date(endTime).toISOString();
    }

    setIsSubmitting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('認証が必要です');

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
          end_time: resolvedEndTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save record');
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving record:', err);
      setError(err instanceof Error ? err.message : '記録の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = categories.filter((c) => !c.is_archived);

  // 継続時間モード時のプレビュー用終了時間
  const previewEnd = inputMode === 'duration' ? calcEndFromDuration() : null;

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
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}

            {/* カテゴリー */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>カテゴリー</Text>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  height: '2.5rem',
                  paddingLeft: '0.75rem',
                  paddingRight: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  borderColor: '#E2E8F0',
                  background: 'white',
                  fontSize: '1rem',
                }}
              >
                <option value="">カテゴリーを選択</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {activeCategories.length === 0 && (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  カテゴリーが登録されていません。先にカテゴリーを作成してください。
                </Text>
              )}
            </Box>

            {/* 開始時間 */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>開始時間</Text>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Box>

            {/* 入力モード切り替え */}
            <HStack gap={0} borderWidth="1px" borderRadius="md" overflow="hidden">
              {([
                ['duration', '継続時間で入力'],
                ['endTime', '終了時間で入力'],
              ] as const).map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  flex={1}
                  size="sm"
                  variant="ghost"
                  borderRadius="none"
                  bg={inputMode === mode ? 'blue.500' : 'white'}
                  color={inputMode === mode ? 'white' : 'gray.600'}
                  _hover={{ bg: inputMode === mode ? 'blue.600' : 'gray.50' }}
                  onClick={() => handleModeChange(mode)}
                >
                  {label}
                </Button>
              ))}
            </HStack>

            {/* 継続時間 or 終了時間 */}
            {inputMode === 'duration' ? (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>継続時間</Text>
                <HStack gap={3}>
                  <HStack gap={1} flex={1}>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={durationHours}
                      onChange={(e) =>
                        setDurationHours(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      textAlign="right"
                    />
                    <Text fontSize="sm" whiteSpace="nowrap">時間</Text>
                  </HStack>
                  <HStack gap={1} flex={1}>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={durationMinutes}
                      onChange={(e) =>
                        setDurationMinutes(
                          Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                        )
                      }
                      textAlign="right"
                    />
                    <Text fontSize="sm" whiteSpace="nowrap">分</Text>
                  </HStack>
                </HStack>
                {previewEnd && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    終了時間:{' '}
                    {previewEnd.toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </Box>
            ) : (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>終了時間</Text>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </Box>
            )}

            <HStack gap={3} justify="flex-end">
              <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
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
