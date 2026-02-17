import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// カテゴリー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { name, color, is_archived } = body;

    // 更新データを構築
    const updateData: {
      name?: string;
      color?: string;
      is_archived?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'カテゴリー名を入力してください' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      if (typeof color !== 'string') {
        return NextResponse.json(
          { error: '色を選択してください' },
          { status: 400 }
        );
      }
      updateData.color = color;
    }

    if (is_archived !== undefined) {
      if (typeof is_archived !== 'boolean') {
        return NextResponse.json(
          { error: '無効なアーカイブ状態です' },
          { status: 400 }
        );
      }
      updateData.is_archived = is_archived;
    }

    // カテゴリーを更新
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        { error: 'カテゴリーの更新に失敗しました' },
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

// カテゴリー削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 論理削除（is_archived = true）
    const { data, error } = await supabase
      .from('categories')
      .update({ is_archived: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving category:', error);
      return NextResponse.json(
        { error: 'カテゴリーの削除に失敗しました' },
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
