// exam.yaml 스키마(parseExam·unsupportedSubjects)의 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExam, unsupportedSubjects } from "../src/schema/exam.ts";

// 매 테스트마다 새 객체를 만들어 변형이 서로 새지 않게 한다.
// 필드 삭제·오타 주입 등 일부러 타입을 깨는 입력을 만들어야 해서 any 를 쓴다(테스트 픽스처 한정).
function validExam(): any {
  return {
    schema_version: 1,
    exam: {
      name: "샘플 자격시험",
      code: "sample-cert",
      criteria_version: "2026",
      criteria_source: "criteria/2026_criteria.md",
      verified: false,
    },
    stages: [
      {
        id: "1st",
        name: "1차 필기",
        time_minutes: 90,
        pass_rule: { type: "subject_min_and_average", subject_min: 40, average_min: 60 },
        subjects: [
          { id: "s1", name: "과목 A", items: 20, handler: "mcq", choices: 4, weight: 1.0 },
          { id: "s2", name: "과목 B", items: 20, handler: "short_answer" },
        ],
        difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 },
      },
    ],
    youtube: { direct_fetch: false },
    locale: "ko",
  };
}

test("parseExam: 정상 입력을 그대로 반환한다", () => {
  const exam = parseExam(validExam());
  assert.deepEqual(exam, validExam());
});

test("parseExam: 선택 필드 exam_date(YYYY-MM-DD)를 허용한다", () => {
  const raw = validExam();
  raw.exam.exam_date = "2026-12-05";
  assert.equal(parseExam(raw).exam.exam_date, "2026-12-05");
});

test("parseExam: 필수 필드가 없으면 필드 경로를 담은 예외를 던진다", () => {
  const raw = validExam();
  delete raw.stages[0].time_minutes;
  assert.throws(() => parseExam(raw), /exam\.yaml 검증 실패[\s\S]*stages\.0\.time_minutes/);
});

test("parseExam: handler UNSUPPORTED 는 통과하고 unsupportedSubjects 에 나온다", () => {
  const raw = validExam();
  raw.stages[0].subjects[1].handler = "UNSUPPORTED";
  const exam = parseExam(raw);
  assert.deepEqual(unsupportedSubjects(exam), [{ stage: "1st", subject: "s2" }]);
});

test("unsupportedSubjects: UNSUPPORTED 가 없으면 빈 배열", () => {
  assert.deepEqual(unsupportedSubjects(parseExam(validExam())), []);
});

test("parseExam: 카탈로그에 없는 handler 는 거부한다", () => {
  const raw = validExam();
  raw.stages[0].subjects[1].handler = "essay_rubric";
  assert.throws(() => parseExam(raw), /stages\.0\.subjects\.1\.handler/);
});

test("parseExam: 알 수 없는 키는 거부한다", () => {
  const raw = validExam();
  raw.exam.verifed = true; // 오타
  assert.throws(() => parseExam(raw), /verifed/);
});

test("parseExam: mcq 인데 choices 가 없으면 거부한다", () => {
  const raw = validExam();
  delete raw.stages[0].subjects[0].choices;
  assert.throws(() => parseExam(raw), /stages\.0\.subjects\.0\.choices/);
});

test("parseExam: difficulty_mix 합이 1 이 아니면 거부한다", () => {
  const raw = validExam();
  raw.stages[0].difficulty_mix = { basic: 0.3, standard: 0.5, advanced: 0.3 };
  assert.throws(() => parseExam(raw), /stages\.0\.difficulty_mix/);
});

test("parseExam: 부동소수 오차 범위의 difficulty_mix 합은 허용한다", () => {
  const raw = validExam();
  raw.stages[0].difficulty_mix = { basic: 0.1, standard: 0.2, advanced: 0.7 }; // 0.1+0.2 = 0.30000000000000004
  assert.doesNotThrow(() => parseExam(raw));
});

test("parseExam: 같은 stage 안의 subject id 중복은 거부한다", () => {
  const raw = validExam();
  raw.stages[0].subjects[1].id = "s1";
  assert.throws(() => parseExam(raw), /stages\.0\.subjects\.1\.id/);
});

test("parseExam: items 는 양의 정수여야 한다", () => {
  for (const items of [0, -1, 1.5]) {
    const raw = validExam();
    raw.stages[0].subjects[0].items = items;
    assert.throws(() => parseExam(raw), /stages\.0\.subjects\.0\.items/, `items=${items}`);
  }
});

test("parseExam: schema_version 이 1 이 아니면 거부한다", () => {
  const raw = validExam();
  raw.schema_version = 2;
  assert.throws(() => parseExam(raw), /schema_version/);
});
