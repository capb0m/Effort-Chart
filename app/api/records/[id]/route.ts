import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// 記録更新
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
    const { category_id, start_time, end_time } = body;

    // 更新データを構築
    const updateData: {
      category_id?: string;
      start_time?: string;
      end_time?: string;
    } = {};

    if (category_id !== undefined) {
      if (typeof category_id !== 'string') {
        return NextResponse.json(
          { error: 'カテゴリーを選択してください' },
          { status: 400 }
        );
      }
      updateData.category_id = category_id;
    }

    if (start_time !== undefined || end_time !== undefined) {
      // 両方の時間が必要
      if (!start_time || !end_time) {
        return NextResponse.json(
          { error: '開始時間と終了時間の両方を指定してください' },
          { status: 400 }
        );
      }

      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      const now = new Date();

      // バリデーション
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: '終了時間は開始時間より後である必要があります' },
          { status: 400 }
        );
      }

      if (startDate > now || endDate > now) {
        return NextResponse.json(
          { error: '未来の時間は指定できません' },
          { status: 400 }
        );
      }

      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (hours > 10) {
        return NextResponse.json(
          { error: '記録可能な時間は10時間までです' },
          { status: 400 }
        );
      }

      updateData.start_time = startDate.toISOString();
      updateData.end_time = endDate.toISOString();
    }

    // 記録を更新
    const { data, error } = await supabase
      .from('records')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating record:', error);

      // 重複エラーのチェック
      if (error.message.includes('重複')) {
        return NextResponse.json(
          { error: 'この時間帯は既に他の記録と重複しています' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: '記録の更新に失敗しました' },
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

// 記録削除
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

    // 記録を物理削除
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting record:', error);
      return NextResponse.json(
        { error: '記録の削除に失敗しました' },
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
