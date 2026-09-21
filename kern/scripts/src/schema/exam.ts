// exam.yaml(시험 프로파일) 스키마와 검증 함수. 파일 IO 는 하지 않는다
// zod 4 API 확인 출처: https://zod.dev/api , https://zod.dev/basics (2026-09-21),
// per-parse `error` 옵션은 node_modules/zod/v4/core/schemas.d.ts 의 ParseContext
import { z } from "zod";

// S1 핸들러 카탈로그. UNSUPPORTED 는 "매핑할 핸들러 없음"을 뜻하며 검증은 통과한다(모의고사에서 제외).
// essay_rubric·ext:* 는 schema_version 2(S7)에서 다룬다
const handlerSchema = z.enum(["mcq", "short_answer", "UNSUPPORTED"]);

const subjectSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    items: z.int().positive(),
    handler: handlerSchema,
    choices: z.int().min(2).optional(),
    weight: z.number().positive().optional(),
  })
  .refine((subject) => subject.handler !== "mcq" || subject.choices !== undefined, {
    error: "handler 가 mcq 이면 choices 가 필요합니다",
    path: ["choices"],
  });

const passRuleSchema = z.strictObject({
  type: z.literal("subject_min_and_average"),
  subject_min: z.number().min(0).max(100),
  average_min: z.number().min(0).max(100),
});

const difficultyMixSchema = z
  .strictObject({
    basic: z.number().min(0).max(1),
    standard: z.number().min(0).max(1),
    advanced: z.number().min(0).max(1),
  })
  .refine((mix) => Math.abs(mix.basic + mix.standard + mix.advanced - 1) < 1e-9, {
    error: "basic + standard + advanced 의 합은 1 이어야 합니다",
  });

const stageSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  time_minutes: z.int().positive(),
  pass_rule: passRuleSchema,
  subjects: z
    .array(subjectSchema)
    .min(1)
    .superRefine((subjects, ctx) => {
      const seen = new Set<string>();
      subjects.forEach((subject, index) => {
        if (seen.has(subject.id)) {
          ctx.addIssue({
            code: "custom",
            message: `subject id 가 중복됩니다: ${subject.id}`,
            path: [index, "id"],
          });
        }
        seen.add(subject.id);
      });
    }),
  difficulty_mix: difficultyMixSchema,
});

const examSchema = z.strictObject({
  schema_version: z.literal(1),
  exam: z.strictObject({
    name: z.string().min(1),
    code: z.string().min(1),
    criteria_version: z.string().min(1),
    criteria_source: z.string().min(1),
    verified: z.boolean(),
    exam_date: z.iso.date().optional(),
  }),
  stages: z.array(stageSchema).min(1),
  youtube: z.strictObject({ direct_fetch: z.boolean() }),
  locale: z.string().min(1),
});

export type Exam = z.infer<typeof examSchema>;

// 검증 실패 시 필드 경로와 한국어 메시지를 담은 예외를 던진다
export function parseExam(raw: unknown): Exam {
  const result = examSchema.safeParse(raw, { error: z.locales.ko().localeError });
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`exam.yaml 검증 실패:\n${lines.join("\n")}`);
  }
  return result.data;
}

export interface UnsupportedSubject {
  stage: string;
  subject: string;
}

// 핸들러가 없는 과목 목록. 호출부가 경고를 출력하는 데 쓴다
export function unsupportedSubjects(exam: Exam): UnsupportedSubject[] {
  return exam.stages.flatMap((stage) =>
    stage.subjects
      .filter((subject) => subject.handler === "UNSUPPORTED")
      .map((subject) => ({ stage: stage.id, subject: subject.id })),
  );
}
