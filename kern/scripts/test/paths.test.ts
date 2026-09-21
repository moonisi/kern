// vault 경로 규약(VAULT_DIRS·vaultPaths)의 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { VAULT_DIRS, vaultPaths } from "../src/vault/paths.ts";

test("VAULT_DIRS: PRD §6.2 표준 디렉토리를 / 구분자로 담는다", () => {
  assert.deepEqual(VAULT_DIRS, [
    "00_Exam",
    "00_Exam/criteria",
    "01_Sources/Exams",
    "01_Sources/Books",
    "01_Sources/YouTube",
    "01_Sources/Clippings",
    "02_Theory",
    "03_Questions/Items",
    "03_Questions/Attachments",
    "04_Logs",
    "04_Logs/mock",
    "04_Logs/weakmap",
    "05_Reports",
    ".kern",
  ]);
});

test("vaultPaths: 주요 파일 경로를 root 기준으로 만든다", () => {
  const paths = vaultPaths("my-vault");
  assert.equal(paths.root, "my-vault");
  assert.equal(paths.examYaml, "my-vault/00_Exam/exam.yaml");
  assert.equal(paths.taxonomy, "my-vault/00_Exam/taxonomy.md");
  assert.equal(paths.criteriaDir, "my-vault/00_Exam/criteria");
  assert.equal(paths.itemsDir, "my-vault/03_Questions/Items");
  assert.equal(paths.attempts, "my-vault/04_Logs/attempts.jsonl");
  assert.deepEqual(
    paths.dirs,
    VAULT_DIRS.map((dir) => `my-vault/${dir}`),
  );
});

test("vaultPaths: 백슬래시 root 도 출력은 / 로 정규화한다", () => {
  const paths = vaultPaths("C:\\Users\\me\\my-vault\\");
  assert.equal(paths.root, "C:/Users/me/my-vault");
  assert.equal(paths.examYaml, "C:/Users/me/my-vault/00_Exam/exam.yaml");
  for (const value of [paths.root, paths.examYaml, paths.attempts, ...paths.dirs]) {
    assert.ok(!value.includes("\\"), value);
  }
});

test("vaultPaths: 동일 입력 → 동일 출력", () => {
  assert.deepEqual(vaultPaths("a/b"), vaultPaths("a/b"));
});
