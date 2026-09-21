// validate-exam 커맨드 로직과 CLI 프로세스 실행 테스트. 임시 디렉토리에서만 수행한다
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateExam } from "../src/commands/validate-exam.ts";

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "kern-validate-exam-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

interface FixtureOptions {
  verified?: boolean;
  handler?: string;
}

function examYaml({ verified = false, handler = "short_answer" }: FixtureOptions = {}): string {
  return `schema_version: 1
exam:
  name: "샘플 자격시험"
  code: sample-cert
  criteria_version: "2026"
  criteria_source: criteria/2026_criteria.md
  verified: ${verified}
stages:
  - id: 1st
    name: "1차 필기"
    time_minutes: 90
    pass_rule: { type: subject_min_and_average, subject_min: 40, average_min: 60 }
    subjects:
      - { id: s1, name: "과목 A", items: 20, handler: mcq, choices: 4 }
      - { id: s2, name: "과목 B", items: 20, handler: ${handler} }
    difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }
youtube:
  direct_fetch: false
locale: ko
`;
}

function writeExam(dir: string, text: string): string {
  const path = join(dir, "exam.yaml");
  writeFileSync(path, text, "utf8");
  return path;
}

test("validateExam: 유효한 exam.yaml 은 경고 없이 통과한다", () => {
  withTempDir((dir) => {
    assert.deepEqual(validateExam(writeExam(dir, examYaml())), { ok: true, warnings: [] });
  });
});

test("validateExam: UNSUPPORTED 과목은 경고와 함께 통과한다", () => {
  withTempDir((dir) => {
    const result = validateExam(writeExam(dir, examYaml({ handler: "UNSUPPORTED" })));
    assert.equal(result.ok, true);
    const warnings = result.ok ? result.warnings : [];
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] ?? "", /1st\/s2/);
    assert.match(warnings[0] ?? "", /UNSUPPORTED/);
  });
});

test("validateExam: 스키마 오류는 필드 경로를 담아 실패한다", () => {
  withTempDir((dir) => {
    const result = validateExam(writeExam(dir, examYaml({ handler: "essay" })));
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /stages\.0\.subjects\.1\.handler/);
  });
});

test("validateExam: 파일이 없으면 경로를 담아 실패한다", () => {
  withTempDir((dir) => {
    const result = validateExam(join(dir, "missing.yaml"));
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /missing\.yaml/);
  });
});

test("validateExam: YAML 문법 오류는 실패한다", () => {
  withTempDir((dir) => {
    const result = validateExam(writeExam(dir, "exam: [unclosed\n"));
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /YAML 파싱 실패/);
  });
});

test("validateExam: verified: true 인데 criteria_source 파일이 없으면 실패한다", () => {
  withTempDir((dir) => {
    const result = validateExam(writeExam(dir, examYaml({ verified: true })));
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /criteria\/2026_criteria\.md/);
  });
});

test("validateExam: verified: true 이고 criteria_source 파일이 있으면 통과한다", () => {
  withTempDir((dir) => {
    mkdirSync(join(dir, "criteria"));
    writeFileSync(join(dir, "criteria", "2026_criteria.md"), "# 출제기준\n", "utf8");
    assert.deepEqual(validateExam(writeExam(dir, examYaml({ verified: true }))), { ok: true, warnings: [] });
  });
});

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

test("cli validate-exam: 통과 시 stdout 에 통과·경고를 쓰고 exit 0", () => {
  withTempDir((dir) => {
    const path = writeExam(dir, examYaml({ handler: "UNSUPPORTED" }));
    const result = spawnSync(process.execPath, [cliPath, "validate-exam", path], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^통과\n경고: 1st\/s2 /);
    assert.equal(result.stderr, "");
  });
});

test("cli validate-exam: 실패 시 stderr 에 메시지를 쓰고 exit 1", () => {
  withTempDir((dir) => {
    const result = spawnSync(process.execPath, [cliPath, "validate-exam", join(dir, "missing.yaml")], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /파일을 읽을 수 없습니다/);
  });
});
