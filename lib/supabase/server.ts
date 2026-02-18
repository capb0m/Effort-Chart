import { createClient } from '@supabase/supabase-js';

// Edge Runtime 対応のサーバーサイドクライアント
// @supabase/supabase-js v2.49+ の型推論の複雑さを避けるためジェネリックは使用しない
export function createServerClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
  });
}
