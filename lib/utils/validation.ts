// バリデーションユーティリティ

/**
 * 終了時間が開始時間より後かチェック
 */
export function validateTimeOrder(startTime: Date, endTime: Date): boolean {
  return endTime > startTime;
}

/**
 * 未来の時間でないかチェック
 */
export function validateNotFuture(time: Date): boolean {
  return time <= new Date();
}

/**
 * 10時間以内かチェック（タイマー上限）
 */
export function validateMaxDuration(startTime: Date, endTime: Date): boolean {
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  return hours <= 10;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 記録の総合的なバリデーション
 */
export function validateRecord(
  startTime: Date,
  endTime: Date
): ValidationResult {
  if (!validateTimeOrder(startTime, endTime)) {
    return {
      valid: false,
      error: '終了時間は開始時間より後である必要があります',
    };
  }

  if (!validateNotFuture(startTime) || !validateNotFuture(endTime)) {
    return {
      valid: false,
      error: '未来の時間は指定できません',
    };
  }

  if (!validateMaxDuration(startTime, endTime)) {
    return {
      valid: false,
      error: '記録可能な時間は10時間までです',
    };
  }

  return { valid: true };
}
