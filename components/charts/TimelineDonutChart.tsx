'use client';

import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Box, HStack, VStack, Text } from '@chakra-ui/react';

Chart.register(ArcElement, Tooltip, Legend);

interface Segment {
  startMinute: number;
  endMinute: number;
  categoryId: string;
  categoryName: string;
  color: string;
  hours: number;
}

interface TimelineDonutChartProps {
  segments: Segment[];
}

export function TimelineDonutChart({ segments }: TimelineDonutChartProps) {
  const chartData: ChartData<'doughnut'> = {
    labels: segments.map((s) => {
      const startH = Math.floor(s.startMinute / 60)
        .toString()
        .padStart(2, '0');
      const startM = (s.startMinute % 60).toString().padStart(2, '0');
      const endH = Math.floor(s.endMinute / 60)
        .toString()
        .padStart(2, '0');
      const endM = (s.endMinute % 60).toString().padStart(2, '0');
      return `${s.categoryName} ${startH}:${startM}〜${endH}:${endM}`;
    }),
    datasets: [
      {
        data: segments.map((s) => s.endMinute - s.startMinute),
        backgroundColor: segments.map((s) => s.color),
        borderColor: segments.map((s) =>
          s.categoryId === 'empty' ? '#CBD5E0' : s.color
        ),
        borderWidth: segments.map((s) => (s.categoryId === 'empty' ? 1 : 2)),
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const seg = segments[context.dataIndex];
            const hours = Math.floor(seg.hours);
            const minutes = Math.round((seg.hours - hours) * 60);
            const timeStr =
              hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
            return ` ${timeStr}`;
          },
          title: (items) => {
            return segments[items[0].dataIndex].categoryName;
          },
        },
      },
    },
  };

  // 記録ありのセグメントのみ凡例表示
  const legendItems = segments.filter((s) => s.categoryId !== 'empty');

  return (
    <HStack gap={8} align="start" flexWrap="wrap">
      <Box h="360px" w="360px" flexShrink={0}>
        <Doughnut data={chartData} options={options} />
      </Box>

      {/* 凡例 */}
      {legendItems.length > 0 ? (
        <VStack gap={2} align="start">
          {legendItems.map((seg, i) => {
            const startH = Math.floor(seg.startMinute / 60)
              .toString()
              .padStart(2, '0');
            const startM = (seg.startMinute % 60).toString().padStart(2, '0');
            const endH = Math.floor(seg.endMinute / 60)
              .toString()
              .padStart(2, '0');
            const endM = (seg.endMinute % 60).toString().padStart(2, '0');
            const hours = Math.floor(seg.hours);
            const minutes = Math.round((seg.hours - hours) * 60);
            const timeStr =
              hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;

            return (
              <HStack key={i} gap={3}>
                <Box
                  w={3}
                  h={3}
                  borderRadius="full"
                  bg={seg.color}
                  flexShrink={0}
                />
                <VStack gap={0} align="start">
                  <Text fontSize="sm" fontWeight="medium">
                    {seg.categoryName}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {startH}:{startM}〜{endH}:{endM}（{timeStr}）
                  </Text>
                </VStack>
              </HStack>
            );
          })}
        </VStack>
      ) : (
        <Text color="gray.500" fontSize="sm">
          この日の記録はありません
        </Text>
      )}
    </HStack>
  );
}
