# Effort Chart - 努力量記録・可視化アプリ

日々の活動に費やした時間を記録し、グラフで可視化するWebアプリケーション。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **UI**: React 19, Chakra UI v3
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth (Google OAuth)
- **グラフ**: Chart.js + react-chartjs-2
- **ホスティング**: Cloudflare Pages (Edge Runtime)

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. Supabaseプロジェクトの作成と設定:
   - [Supabase](https://supabase.com)でプロジェクトを作成
   - `supabase/schema.sql` を実行してテーブルを作成
   - Google OAuth を設定

3. 環境変数の設定:
```bash
cp .env.example .env.local
```
`.env.local` に Supabase の URL と ANON KEY を設定

4. 開発サーバーの起動:
```bash
npm run dev
```

## プロジェクト構造

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Edge Runtime)
│   ├── dashboard/         # ダッシュボードページ
│   ├── records/           # 記録管理ページ
│   ├── goals/             # 目標設定ページ
│   └── layout.tsx         # ルートレイアウト
├── components/            # Reactコンポーネント
│   ├── auth/             # 認証関連
│   ├── timer/            # タイマー機能
│   ├── records/          # 記録入力・一覧
│   ├── charts/           # グラフコンポーネント
│   └── ui/               # 共通UIコンポーネント
├── lib/                   # ユーティリティ・設定
│   ├── supabase/         # Supabase クライアント
│   └── utils/            # ヘルパー関数
├── types/                 # TypeScript型定義
├── supabase/             # Supabaseスキーマ・マイグレーション
└── public/               # 静的ファイル
```

## 主な機能

- ユーザー認証（Google OAuth）
- カテゴリー管理（色付け、論理削除）
- 努力の記録
  - 手動記録（開始・終了時間入力）
  - タイマー記録（10時間上限、バックグラウンド保持）
- 記録の一覧・編集・削除
- 目標設定（デイリー/期間）
- グラフ可視化
  - 積み上げ面グラフ（期間指定、累積）
  - 24時間円グラフ（タイムライン）
