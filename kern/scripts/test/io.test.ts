// vault IO(readYaml·writeText·readExam)의 단위 테스트. 임시 디렉토리에서만 수행한다
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExam, readYaml, writeText } from "../src/vault/io.ts";

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "kern-io-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const EXAM_YAML = `schema_version: 1
exam:
  name: "샘플 자격시험"
  code: sample-cert
  criteria_version: "2026"
  criteria_source: criteria/2026_criteria.md
  verified: false
stages:
  - id: 1st
    name: "1차 필기"
    time_minutes: 90
    pass_rule: { type: subject_min_and_average, subject_min: 40, average_min: 60 }
    subjects:
      - { id: s1, name: "과목 A", items: 20, handler: mcq, choices: 4 }
    difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }
youtube:
  direct_fetch: false
locale: ko
`;

test("writeText: 상위 디렉토리를 만들고 LF 로 쓴다", () => {
  withTempDir((dir) => {
    const path = join(dir, "a", "b", "note.md");
    writeText(path, "첫 줄\r\n둘째 줄\r\n");
    assert.equal(readFileSync(path, "utf8"), "첫 줄\n둘째 줄\n");
  });
});

test("readYaml: YAML 을 파싱해 반환한다", () => {
  withTempDir((dir) => {
    const path = join(dir, "x.yaml");
    writeText(path, "name: 한글\nitems: [1, 2]\n");
    assert.deepEqual(readYaml(path), { name: "한글", items: [1, 2] });
  });
});

test("readYaml: 파일이 없으면 경로를 담은 예외", () => {
  withTempDir((dir) => {
    assert.throws(() => readYaml(join(dir, "none.yaml")), /파일을 읽을 수 없습니다: .*none\.yaml/);
  });
});

test("readYaml: 문법 오류는 경로를 담은 예외", () => {
  withTempDir((dir) => {
    const path = join(dir, "bad.yaml");
    writeText(path, "a: [1, 2\n");
    assert.throws(() => readYaml(path), /YAML 파싱 실패: .*bad\.yaml/);
  });
});

test("readExam: 00_Exam/exam.yaml 을 읽고 스키마로 검증한다", () => {
  withTempDir((dir) => {
    writeText(join(dir, "00_Exam", "exam.yaml"), EXAM_YAML);
    const exam = readExam(dir);
    assert.equal(exam.exam.code, "sample-cert");
    assert.equal(exam.stages[0]?.subjects[0]?.items, 20);
  });
});

test("readExam: 스키마에 어긋나면 예외", () => {
  withTempDir((dir) => {
    writeText(join(dir, "00_Exam", "exam.yaml"), EXAM_YAML.replace("locale: ko\n", ""));
    assert.throws(() => readExam(dir), /exam\.yaml 검증 실패[\s\S]*locale/);
  });
});
