import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// 積み上げ面グラフ用データ（カテゴリー別・日次集計）
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const cumulative = searchParams.get('cumulative') === 'true';

    // 記録を取得（カテゴリー情報付き）
    let query = supabase
      .from('records')
      .select('start_time, end_time, categories(id, name, color)')
      .order('start_time', { ascending: true });

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('start_time', endDate);

    const { data: recordsRaw, error } = await query;
    const records = recordsRaw as Array<{ start_time: string; end_time: string; categories: { id: string; name: string; color: string } | null }> | null;

    if (error) {
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    // カテゴリーごとに日次の時間を集計
    const categoryMap = new Map<string, { name: string; color: string }>();
    const dateMap = new Map<string, Map<string, number>>();

    (records || []).forEach((record) => {
      if (!record.categories) return;

      const cat = record.categories;
      categoryMap.set(cat.id, { name: cat.name, color: cat.color });

      // 開始日を集計日とする
      const dateKey = new Date(record.start_time)
        .toLocaleDateString('sv-SE'); // YYYY-MM-DD形式

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map());
      }

      const hours =
        (new Date(record.end_time).getTime() -
          new Date(record.start_time).getTime()) /
        (1000 * 60 * 60);

      const dayMap = dateMap.get(dateKey)!;
      dayMap.set(cat.id, (dayMap.get(cat.id) || 0) + hours);
    });

    // 日付を昇順でソート
    const sortedDates = Array.from(dateMap.keys()).sort();
    const categories = Array.from(categoryMap.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));

    if (cumulative) {
      // 累積値を計算
      const cumulativeTotals = new Map<string, number>();
      categories.forEach((cat) => cumulativeTotals.set(cat.id, 0));

      const cumulativeData = sortedDates.map((date) => {
        const dayMap = dateMap.get(date)!;
        categories.forEach((cat) => {
          const dayHours = dayMap.get(cat.id) || 0;
          cumulativeTotals.set(cat.id, (cumulativeTotals.get(cat.id) || 0) + dayHours);
        });

        const row: Record<string, string | number> = { date };
        categories.forEach((cat) => {
          row[cat.id] = Math.round((cumulativeTotals.get(cat.id) || 0) * 100) / 100;
        });
        return row;
      });

      return NextResponse.json({ dates: sortedDates, categories, data: cumulativeData });
    }

    // 日次データ
    const dailyData = sortedDates.map((date) => {
      const dayMap = dateMap.get(date)!;
      const row: Record<string, string | number> = { date };
      categories.forEach((cat) => {
        row[cat.id] = Math.round((dayMap.get(cat.id) || 0) * 100) / 100;
      });
      return row;
    });

    return NextResponse.json({ dates: sortedDates, categories, data: dailyData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}
