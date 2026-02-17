-- Effort Chart データベーススキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- ============================================
-- テーブル作成
-- ============================================

-- カテゴリーテーブル
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 記録テーブル
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 目標テーブル
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('daily', 'period')),
  target_hours NUMERIC(10, 2) NOT NULL CHECK (target_hours > 0),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- タイマーセッションテーブル（バックグラウンド保持用）
CREATE TABLE IF NOT EXISTS timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_active_session_per_user UNIQUE (user_id, is_active)
);

-- ============================================
-- インデックス作成
-- ============================================

-- カテゴリー
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_archived ON categories(user_id, is_archived);

-- 記録
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_category_id ON records(category_id);
CREATE INDEX IF NOT EXISTS idx_records_start_time ON records(start_time);
CREATE INDEX IF NOT EXISTS idx_records_user_time ON records(user_id, start_time DESC);

-- 目標
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);

-- タイマーセッション
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_active ON timer_sessions(user_id, is_active);

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- RLSを有効化
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;

-- カテゴリーのRLSポリシー
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- 記録のRLSポリシー
CREATE POLICY "Users can view their own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- 目標のRLSポリシー
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- タイマーセッションのRLSポリシー
CREATE POLICY "Users can view their own timer sessions"
  ON timer_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timer sessions"
  ON timer_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timer sessions"
  ON timer_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timer sessions"
  ON timer_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- トリガー関数（updated_at自動更新）
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーの設定
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_sessions_updated_at
  BEFORE UPDATE ON timer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 重複チェック関数
-- ============================================

-- 記録の時間重複をチェックする関数
CREATE OR REPLACE FUNCTION check_record_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- 同じユーザーの他の記録と時間が重複していないかチェック
  IF EXISTS (
    SELECT 1
    FROM records
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
        (start_time < NEW.end_time AND end_time > NEW.start_time)
      )
  ) THEN
    RAISE EXCEPTION 'この時間帯は既に他の記録と重複しています';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重複チェックトリガー
CREATE TRIGGER check_record_overlap_trigger
  BEFORE INSERT OR UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION check_record_overlap();

-- ============================================
-- サンプルデータ（オプション）
-- ============================================

-- 開発用のサンプルデータが必要な場合は以下をコメント解除
-- 注意: 実際のユーザーIDに置き換える必要があります

/*
-- サンプルカテゴリー
INSERT INTO categories (user_id, name, color) VALUES
  ('YOUR_USER_ID', '勉強', '#3B82F6'),
  ('YOUR_USER_ID', '運動', '#10B981'),
  ('YOUR_USER_ID', '読書', '#F59E0B'),
  ('YOUR_USER_ID', '仕事', '#EF4444');
*/
