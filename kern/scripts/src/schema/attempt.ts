// attempts.jsonl 한 줄(시도 로그, PRD §8.3) 스키마와 검증 함수. 파일 IO 는 하지 않는다
// zod 4 API 확인 출처: https://zod.dev/api (z.iso.datetime 의 offset 옵션),
// node_modules/zod/v4/core/schemas.d.ts (2026-09-21)
import { z } from "zod";

const attemptSchema = z.strictObject({
  // 오프셋 포함 ISO 8601 (예: 2026-09-21T14:30:00+09:00). 오프셋 없는 로컬 시각은 거부
  ts: z.iso.datetime({ offset: true }),
  item: z.string().min(1),
  // 🟡 mode·rating 값 목록은 PRD 에 열거가 없다. 소비자(S3 solve, S5 FSRS)가 생길 때 enum 으로 좁힌다
  mode: z.string().min(1),
  answer: z.union([z.number(), z.string()]),
  // null = 판정 불가 (PRD §8.4 GradeResult)
  correct: z.boolean().nullable(),
  sec: z.number().min(0),
  handler: z.enum(["mcq", "short_answer"]),
  confidence: z.enum(["deterministic", "llm"]),
  rating: z.string().min(1).optional(),
});

export type Attempt = z.infer<typeof attemptSchema>;

// 검증 실패 시 필드 경로와 한국어 메시지를 담은 예외를 던진다
export function parseAttempt(raw: unknown): Attempt {
  const result = attemptSchema.safeParse(raw, { error: z.locales.ko().localeError });
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`attempt 검증 실패:\n${lines.join("\n")}`);
  }
  return result.data;
}
