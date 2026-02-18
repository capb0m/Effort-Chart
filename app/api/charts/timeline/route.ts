import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// 24時間タイムライン円グラフ用データ
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const supabase = createServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: '日付が必要です' }, { status: 400 });
    }

    // 指定日の開始・終了（ローカル時間で0:00〜23:59:59）
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    // 前日の23:00以降に開始した記録も取得（日付またぎ対応）
    const prevDayStart = new Date(startOfDay);
    prevDayStart.setDate(prevDayStart.getDate() - 1);
    prevDayStart.setHours(23, 0, 0, 0);

    const { data: recordsRaw, error } = await supabase
      .from('records')
      .select('start_time, end_time, categories(id, name, color)')
      .gte('start_time', prevDayStart.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });
    const records = recordsRaw as Array<{ start_time: string; end_time: string; categories: { id: string; name: string; color: string } | null }> | null;

    if (error) {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    // 24時間 = 1440分 をセグメントに分割
    const segments: {
      startMinute: number;
      endMinute: number;
      categoryId: string;
      categoryName: string;
      color: string;
      hours: number;
    }[] = [];

    (records || []).forEach((record) => {
      if (!record.categories) return;

      const startLocal = new Date(record.start_time);
      const endLocal = new Date(record.end_time);

      // 指定日の0:00を基準にした分数を計算
      const dayStartMs = startOfDay.getTime();
      const rawStartMinute = Math.round((startLocal.getTime() - dayStartMs) / 60000);
      const rawEndMinute = Math.round((endLocal.getTime() - dayStartMs) / 60000);

      // 指定日（0〜1440分）の範囲でクリップ
      const startMinute = Math.max(0, rawStartMinute);
      const endMinute = Math.min(1440, rawEndMinute);

      // 指定日の範囲外は除外
      if (endMinute <= 0 || startMinute >= 1440) return;

      // 実際に当日に属する時間を計算
      const clippedHours = (endMinute - startMinute) / 60;

      segments.push({
        startMinute,
        endMinute,
        categoryId: record.categories.id,
        categoryName: record.categories.name,
        color: record.categories.color,
        hours: Math.round(clippedHours * 100) / 100,
      });
    });

    // 空き時間（未記録）のセグメントを追加
    const filled: typeof segments = [];
    let cursor = 0;

    segments.forEach((seg) => {
      if (seg.startMinute > cursor) {
        filled.push({
          startMinute: cursor,
          endMinute: seg.startMinute,
          categoryId: 'empty',
          categoryName: '記録なし',
          color: '#E2E8F0',
          hours: (seg.startMinute - cursor) / 60,
        });
      }
      filled.push(seg);
      cursor = seg.endMinute;
    });

    if (cursor < 1440) {
      filled.push({
        startMinute: cursor,
        endMinute: 1440,
        categoryId: 'empty',
        categoryName: '記録なし',
        color: '#E2E8F0',
        hours: (1440 - cursor) / 60,
      });
    }

    return NextResponse.json({ date, segments: filled });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}
