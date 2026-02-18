'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Button, HStack } from '@chakra-ui/react';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface StackedAreaChartProps {
  dates: string[];
  categories: { id: string; name: string; color: string }[];
  data: Record<string, string | number>[];
  enableZoom?: boolean;
  cumulativeMode?: boolean; // 累積グラフ: y軸最大値を最大値/0.7に設定
  periodMode?: boolean;     // 期間別グラフ: 初期表示を1日分
}

export function StackedAreaChart({
  dates,
  categories,
  data,
  enableZoom = false,
  cumulativeMode = false,
  periodMode = false,
}: StackedAreaChartProps) {
  const chartRef = useRef<Chart<'line'> | null>(null);
  const [zoomReady, setZoomReady] = useState(false);

  useEffect(() => {
    (async () => {
      const zoomPlugin = (await import('chartjs-plugin-zoom')).default;
      Chart.register(zoomPlugin);
      setZoomReady(true);
    })();
  }, []);

  // zoomReady後に初期ズーム位置を設定（スケールのmin/maxを使わずパンを有効に保つ）
  useEffect(() => {
    if (!zoomReady || !enableZoom || !chartRef.current) return;
    const chart = chartRef.current;
    const len = dates.length;
    if (len <= 1) return;

    const windowSize = periodMode ? 1 : cumulativeMode ? 30 : null;
    if (windowSize && len > windowSize) {
      // x軸のズームをプログラムで設定
      chart.zoomScale('x', {
        min: chart.scales.x.min + (len - 1 - windowSize),
        max: chart.scales.x.min + (len - 1),
      });
    }
  }, [zoomReady, dates.length, periodMode, cumulativeMode, enableZoom]);

  const handleResetZoom = () => {
    chartRef.current?.resetZoom();
  };

  // 各日の積み上げ合計を計算して最大値を求める
  const stackedMaxValues = data.map((row) =>
    categories.reduce((sum, cat) => sum + (Number(row[cat.id]) || 0), 0)
  );
  const stackedMax = Math.max(...stackedMaxValues, 0);

  // 期間別モード: y軸上限を24hに固定
  // 累積モード: y軸最大値 = 最大値 / 0.7（最大が70%の高さに収まる）
  const yAxisMax = periodMode
    ? 24
    : cumulativeMode && stackedMax > 0
    ? Math.ceil((stackedMax / 0.7) * 10) / 10
    : undefined;

  const chartData: ChartData<'line'> = {
    labels: dates.map((d) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      });
    }),
    datasets: categories.map((cat) => ({
      label: cat.name,
      data: data.map((row) => Number(row[cat.id]) || 0),
      backgroundColor: cat.color + 'AA',
      borderColor: cat.color,
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null) return '';
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            const timeStr =
              hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
            return `${context.dataset.label}: ${timeStr}`;
          },
        },
      },
      ...(enableZoom && zoomReady
        ? {
            zoom: {
              zoom: {
                wheel: { enabled: true, speed: 0.1 },
                pinch: { enabled: true },
                mode: 'x',
              },
              pan: {
                enabled: true,
                mode: 'x',
              },
              limits: {
                x: { min: 'original', max: 'original' },
              },
            },
          }
        : {}),
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          maxTicksLimit: 8,
          maxRotation: 45,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ...(yAxisMax !== undefined ? { max: yAxisMax } : {}),
        ticks: {
          callback: (value) => `${value}h`,
        },
      },
    },
  };

  return (
    <Box>
      {enableZoom && (
        <HStack justify="flex-end" mb={2}>
          <Button size="xs" variant="outline" onClick={handleResetZoom}>
            ズームリセット
          </Button>
        </HStack>
      )}
      <Box h="400px">
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          key={`${dates.length}-${zoomReady}`}
        />
      </Box>
    </Box>
  );
}
