import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// アクティブなタイマーセッション取得
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

    // アクティブなタイマーセッションを取得
    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (正常)
      console.error('Error fetching timer session:', error);
      return NextResponse.json(
        { error: 'タイマーセッションの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// タイマー開始
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
    const { start_time } = body;

    if (!start_time) {
      return NextResponse.json(
        { error: '開始時間が必要です' },
        { status: 400 }
      );
    }

    // 既存のアクティブなセッションがないか確認
    const { data: existingSession } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('is_active', true)
      .single();

    if (existingSession) {
      return NextResponse.json(
        { error: '既にアクティブなタイマーが存在します' },
        { status: 400 }
      );
    }

    // 新しいタイマーセッションを作成
    const { data, error } = await supabase
      .from('timer_sessions')
      .insert({
        user_id: user.id,
        start_time: new Date(start_time).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating timer session:', error);
      return NextResponse.json(
        { error: 'タイマーの開始に失敗しました' },
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

// タイマー停止
export async function DELETE(request: NextRequest) {
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

    // アクティブなタイマーセッションを削除
    const { error } = await supabase
      .from('timer_sessions')
      .delete()
      .eq('is_active', true);

    if (error) {
      console.error('Error deleting timer session:', error);
      return NextResponse.json(
        { error: 'タイマーの停止に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
