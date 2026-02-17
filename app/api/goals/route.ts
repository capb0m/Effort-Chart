import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface GoalRow {
  id: string;
  user_id: string;
  type: 'daily' | 'period';
  category_id: string | null;
  target_hours: number;
  deadline: string | null;
  created_at: string;
  categories: { id: string; name: string; color: string } | null;
}

interface RecordRow {
  start_time: string;
  end_time: string;
}

// 目標一覧取得（進捗計算込み）
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const supabase = createServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const today = searchParams.get('today') || new Date().toISOString().slice(0, 10);
    // クライアントから送られたタイムゾーンオフセット（分）。例: JST(UTC+9)は-540
    const tzOffset = parseInt(searchParams.get('tz') || '0');

    // ユーザーのローカル日付に合わせたUTC境界を計算
    const todayStart = new Date(new Date(`${today}T00:00:00Z`).getTime() + tzOffset * 60000).toISOString();
    const todayEnd = new Date(new Date(`${today}T23:59:59Z`).getTime() + tzOffset * 60000).toISOString();
    const now = new Date().toISOString();

    // 目標一覧を取得
    const { data: rawGoals, error: goalsError } = await supabase
      .from('goals')
      .select('*, categories(id, name, color)')
      .order('created_at', { ascending: false });

    if (goalsError) return NextResponse.json({ error: '目標の取得に失敗しました' }, { status: 500 });

    const goals = (rawGoals || []) as unknown as GoalRow[];

    // 各目標の達成時間を計算
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      let query = supabase
        .from('records')
        .select('start_time, end_time') as unknown as {
          gte: (col: string, val: string) => typeof query;
          lte: (col: string, val: string) => typeof query;
          eq: (col: string, val: string) => typeof query;
          then: (cb: (val: { data: RecordRow[] | null }) => void) => Promise<void>;
        };

      // 型安全のため直接クエリを分岐
      let records: RecordRow[] = [];

      if (goal.type === 'daily') {
        const periodEnd = todayEnd;
        if (goal.category_id) {
          const { data } = await supabase
            .from('records')
            .select('start_time, end_time')
            .eq('category_id', goal.category_id)
            .gte('start_time', todayStart)
            .lte('start_time', periodEnd);
          records = (data || []) as unknown as RecordRow[];
        } else {
          const { data } = await supabase
            .from('records')
            .select('start_time, end_time')
            .gte('start_time', todayStart)
            .lte('start_time', periodEnd);
          records = (data || []) as unknown as RecordRow[];
        }
      } else {
        const periodEnd = goal.deadline && goal.deadline < now ? goal.deadline : now;
        if (goal.category_id) {
          const { data } = await supabase
            .from('records')
            .select('start_time, end_time')
            .eq('category_id', goal.category_id)
            .gte('start_time', goal.created_at)
            .lte('start_time', periodEnd);
          records = (data || []) as unknown as RecordRow[];
        } else {
          const { data } = await supabase
            .from('records')
            .select('start_time, end_time')
            .gte('start_time', goal.created_at)
            .lte('start_time', periodEnd);
          records = (data || []) as unknown as RecordRow[];
        }
      }

      // 型エラーを避けるためにvoidへのキャスト
      void query;

      const achievedMs = records.reduce((sum, r) => {
        return sum + (new Date(r.end_time).getTime() - new Date(r.start_time).getTime());
      }, 0);
      const achievedHours = achievedMs / 3600000;

      return {
        id: goal.id,
        type: goal.type,
        category_id: goal.category_id,
        category_name: goal.categories?.name ?? null,
        category_color: goal.categories?.color ?? null,
        target_hours: Number(goal.target_hours),
        deadline: goal.deadline,
        achieved_hours: Math.round(achievedHours * 100) / 100,
        is_achieved: achievedHours >= Number(goal.target_hours),
        created_at: goal.created_at,
      };
    }));

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}

// 目標作成
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

    const supabase = createServerClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });

    const body = await request.json();
    const { type, category_id, target_hours, deadline } = body;

    if (!['daily', 'period'].includes(type)) {
      return NextResponse.json({ error: '目標の種類が不正です' }, { status: 400 });
    }
    if (!target_hours || Number(target_hours) <= 0) {
      return NextResponse.json({ error: '目標時間を正しく入力してください' }, { status: 400 });
    }
    if (type === 'period' && !deadline) {
      return NextResponse.json({ error: '期間目標には期日を設定してください' }, { status: 400 });
    }

    const insertData = {
      user_id: user.id,
      type,
      category_id: category_id || null,
      target_hours: Number(target_hours),
      deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
    };

    const { data, error } = await supabase
      .from('goals')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json({ error: '目標の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 });
  }
}
