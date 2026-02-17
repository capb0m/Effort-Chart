'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/client';
import { TimerSaveModal } from './TimerSaveModal';
import type { Category } from '@/types/database';

interface TimerProps {
  categories: Category[];
  onRecordSaved: () => void;
}

const MAX_HOURS = 10;
const MAX_MILLISECONDS = MAX_HOURS * 60 * 60 * 1000;

export function Timer({ categories, onRecordSaved }: TimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { open, onOpen, onClose } = useDisclosure();

  // 初期化：ローカルストレージとDBから状態を復元
  useEffect(() => {
    restoreTimerState();
  }, []);

  // タイマー更新
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();

        if (elapsed >= MAX_MILLISECONDS) {
          // 10時間経過で自動停止
          handleAutoStop();
        } else {
          setElapsedMs(elapsed);
        }
      }, 100);
    } else {
      // isRunningがfalseになったらintervalをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, startTime]);

  // ローカルストレージに保存
  const saveToLocalStorage = (start: Date | null, running: boolean) => {
    if (start && running) {
      localStorage.setItem('timer_start', start.toISOString());
      localStorage.setItem('timer_running', 'true');
    } else {
      localStorage.removeItem('timer_start');
      localStorage.removeItem('timer_running');
    }
  };

  // 状態を復元
  const restoreTimerState = async () => {
    try {
      // DBから取得
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch('/api/timer', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const { data: timerSession } = await response.json();

      if (timerSession && timerSession.is_active) {
        const start = new Date(timerSession.start_time);
        const now = new Date();
        const elapsed = now.getTime() - start.getTime();

        if (elapsed >= MAX_MILLISECONDS) {
          // 10時間超過で自動停止済み
          setStartTime(start);
          setElapsedMs(MAX_MILLISECONDS);
          setAutoStopped(true);
          setIsRunning(false);
          await stopTimerSession();
          onOpen(); // 保存モーダルを表示
        } else {
          // タイマー復元
          setStartTime(start);
          setElapsedMs(elapsed);
          setIsRunning(true);
          saveToLocalStorage(start, true);
        }
      }
    } catch (error) {
      console.error('Error restoring timer:', error);
    }
  };

  // タイマー開始
  const handleStart = async () => {
    try {
      const now = new Date();

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        alert('認証が必要です');
        return;
      }

      // DBにセッションを作成
      const response = await fetch('/api/timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_time: now.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start timer');
      }

      setStartTime(now);
      setElapsedMs(0);
      setIsRunning(true);
      setAutoStopped(false);
      saveToLocalStorage(now, true);
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('タイマーの開始に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  };

  // タイマー停止
  const handleStop = async () => {
    setIsRunning(false);
    saveToLocalStorage(null, false);
    await stopTimerSession(); // DBのセッションも停止
    onOpen(); // 保存モーダルを表示
  };

  // 自動停止
  const handleAutoStop = async () => {
    setIsRunning(false);
    setElapsedMs(MAX_MILLISECONDS);
    setAutoStopped(true);
    saveToLocalStorage(null, false);
    await stopTimerSession();
    onOpen(); // 保存モーダルを表示
  };

  // DBのタイマーセッションを停止
  const stopTimerSession = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const response = await fetch('/api/timer', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to stop timer session');
      }
    } catch (error) {
      console.error('Error stopping timer session:', error);
    }
  };

  // リセット
  const handleReset = async () => {
    // まずタイマーを停止
    setIsRunning(false);

    // intervalをクリア
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // DBのセッションを停止
    await stopTimerSession();

    // 状態をリセット
    setStartTime(null);
    setElapsedMs(0);
    setAutoStopped(false);
    saveToLocalStorage(null, false);

    // モーダルを閉じる
    onClose();
  };

  // 保存成功
  const handleSaveSuccess = async () => {
    await handleReset();
    onRecordSaved();
  };

  // フォーマット
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getEndTime = (): Date => {
    if (!startTime) return new Date();
    return new Date(startTime.getTime() + elapsedMs);
  };

  return (
    <>
      <Box p={6} borderWidth="1px" borderRadius="lg">
        <VStack gap={4}>
          <Text fontSize="lg" fontWeight="semibold">
            タイマー
          </Text>

          {autoStopped && (
            <Box p={3} bg="orange.50" borderRadius="md" w="full">
              <Text color="orange.700" fontSize="sm" textAlign="center">
                ⚠️ 10時間で自動停止しました。記録を編集・保存してください。
              </Text>
            </Box>
          )}

          <Text
            fontSize="5xl"
            fontWeight="bold"
            fontFamily="mono"
            color={elapsedMs >= MAX_MILLISECONDS ? 'red.500' : 'inherit'}
          >
            {formatTime(elapsedMs)}
          </Text>

          {elapsedMs >= MAX_MILLISECONDS && (
            <Text fontSize="sm" color="red.500">
              上限（10時間）に達しました
            </Text>
          )}

          <HStack gap={3}>
            {!isRunning ? (
              <Button
                onClick={handleStart}
                colorPalette="green"
                size="lg"
                disabled={!!startTime}
              >
                開始
              </Button>
            ) : (
              <Button onClick={handleStop} colorPalette="red" size="lg">
                停止
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>

      {/* 保存モーダル */}
      {open && startTime && (
        <TimerSaveModal
          categories={categories}
          startTime={startTime}
          endTime={getEndTime()}
          autoStopped={autoStopped}
          onSuccess={handleSaveSuccess}
          onCancel={async () => {
            await handleReset();
          }}
        />
      )}
    </>
  );
}
