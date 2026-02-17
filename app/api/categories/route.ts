import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// カテゴリー一覧取得
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

    // カテゴリー一覧を取得（アーカイブされていないもの優先）
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_archived', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'カテゴリーの取得に失敗しました' },
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

// カテゴリー作成
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
    const { name, color } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'カテゴリー名を入力してください' },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { error: '色を選択してください' },
        { status: 400 }
      );
    }

    // カテゴリーを作成
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json(
        { error: 'カテゴリーの作成に失敗しました' },
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
