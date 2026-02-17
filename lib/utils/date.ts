// 日付関連のユーティリティ関数

/**
 * UTC時刻をローカルタイムゾーンの日付文字列に変換
 */
export function utcToLocal(utcString: string): Date {
  return new Date(utcString);
}

/**
 * ローカル時刻をUTC文字列に変換
 */
export function localToUtc(date: Date): string {
  return date.toISOString();
}

/**
 * 日付をまたぐ記録の場合、開始日を基準とする
 */
export function getRecordDate(startTime: Date): Date {
  return new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
}

/**
 * 2つの時間範囲が重複しているかチェック
 */
export function isTimeOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * 時間の差を時間単位で計算
 */
export function getHoursDifference(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return diff / (1000 * 60 * 60);
}
