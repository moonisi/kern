// exam.yaml 을 검증해 결과 객체를 돌려주는 validate-exam 커맨드 로직. 출력·exit code 는 cli.ts 가 맡는다
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseExam, unsupportedSubjects } from "../schema/exam.ts";
import type { Exam } from "../schema/exam.ts";
import { readYaml } from "../vault/io.ts";

export type ValidateExamResult =
  | { ok: true; warnings: string[] }
  | { ok: false; message: string };

export function validateExam(examPath: string): ValidateExamResult {
  let exam: Exam;
  try {
    exam = parseExam(readYaml(examPath));
  } catch (cause) {
    // 파일 없음·YAML 오류·스키마 오류 모두 메시지를 그대로 결과에 담는다
    return { ok: false, message: cause instanceof Error ? cause.message : String(cause) };
  }
  // F6 가드: 원문 파일 없이 verified: true 를 쓸 수 없다. criteria_source 는 exam.yaml 디렉토리 기준 상대경로
  if (exam.exam.verified) {
    const criteriaPath = join(dirname(examPath), exam.exam.criteria_source).replaceAll("\\", "/");
    // throwIfNoEntry: false 면 없는 경로에 undefined 를 돌려준다(@types/node fs.d.ts StatSyncOptions). 디렉토리는 원문으로 치지 않는다
    if (statSync(criteriaPath, { throwIfNoEntry: false })?.isFile() !== true) {
      return {
        ok: false,
        message: `exam.verified 가 true 인데 criteria_source 파일이 없습니다: ${criteriaPath}`,
      };
    }
  }
  const warnings = unsupportedSubjects(exam).map(
    ({ stage, subject }) => `경고: ${stage}/${subject} 과목은 handler 가 UNSUPPORTED 라 모의고사에서 제외됩니다`,
  );
  return { ok: true, warnings };
}
