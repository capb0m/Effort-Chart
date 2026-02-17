import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// 記録一覧取得
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const supabase = createServerClient(token);

    // ユーザー情報を取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // クエリパラメータから期間を取得（オプション）
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('records')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .order('start_time', { ascending: false });

    // 期間指定がある場合はフィルタリング
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching records:', error);
      return NextResponse.json(
        { error: '記録の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 記録作成
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const supabase = createServerClient(token);

    // ユーザー情報を取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category_id, start_time, end_time } = body;

    // バリデーション
    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json(
        { error: 'カテゴリーを選択してください' },
        { status: 400 }
      );
    }

    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: '開始時間と終了時間を入力してください' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const now = new Date();

    // 終了時間が開始時間より後かチェック
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: '終了時間は開始時間より後である必要があります' },
        { status: 400 }
      );
    }

    // 未来時間のチェック
    if (startDate > now || endDate > now) {
      return NextResponse.json(
        { error: '未来の時間は指定できません' },
        { status: 400 }
      );
    }

    // 10時間以内かチェック
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (hours > 10) {
      return NextResponse.json(
        { error: '記録可能な時間は10時間までです' },
        { status: 400 }
      );
    }

    // 記録を作成（データベース側の重複チェックトリガーが動作）
    const { data, error } = await supabase
      .from('records')
      .insert({
        user_id: user.id,
        category_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      })
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error creating record:', error);

      // 重複エラーのチェック
      if (error.message.includes('重複')) {
        return NextResponse.json(
          { error: 'この時間帯は既に他の記録と重複しています' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: '記録の作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
