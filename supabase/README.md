# Supabase セットアップ手順

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスしてログイン
2. 新しいプロジェクトを作成
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（日本の場合は Tokyo を推奨）

## 2. データベーススキーマの適用

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `schema.sql` の内容をコピー&ペースト
3. 「Run」ボタンをクリックして実行

## 3. Google OAuth認証の設定

### 3.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のものを選択）
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」
6. 承認済みのリダイレクトURIに以下を追加:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
7. クライアントIDとクライアントシークレットをコピー

### 3.2 Supabaseでの設定

1. Supabaseダッシュボードで「Authentication」→「Providers」に移動
2. 「Google」を有効化
3. Google Cloud Consoleで取得したクライアントIDとシークレットを入力
4. 「Save」をクリック

## 4. 環境変数の設定

1. Supabaseダッシュボードで「Settings」→「API」に移動
2. 以下の情報を確認:
   - Project URL
   - anon public key

3. プロジェクトルートに `.env.local` ファイルを作成:
   ```bash
   cp .env.example .env.local
   ```

4. `.env.local` に値を設定:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 5. 動作確認

1. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

2. ブラウザで `http://localhost:3000` にアクセス

3. 「Googleアカウントでログイン」をクリックして認証をテスト

4. ログイン後、ダッシュボードにリダイレクトされることを確認

## トラブルシューティング

### 認証エラーが発生する場合

- Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
- Supabaseの環境変数が正しく設定されているか確認
- ブラウザのキャッシュをクリア

### データベース接続エラー

- `.env.local` の値が正しいか確認
- Supabaseプロジェクトが正常に起動しているか確認

### RLSポリシーエラー

- schema.sqlが正しく実行されたか確認
- Supabaseダッシュボードの「Table Editor」でテーブルとポリシーを確認
