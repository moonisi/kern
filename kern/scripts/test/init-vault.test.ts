// init-vault 커맨드(initVault·renderTaxonomySkeleton)의 단위 테스트. 임시 디렉토리에서만 수행한다
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { initVault, renderTaxonomySkeleton } from "../src/commands/init-vault.ts";
import { writeText } from "../src/vault/io.ts";
import { VAULT_DIRS } from "../src/vault/paths.ts";

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "kern-init-vault-"));
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
      - { id: s2, name: "과목 B", items: 20, handler: short_answer }
    difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }
youtube:
  direct_fetch: false
locale: ko
`;

const GUIDE = `# 분류체계 (taxonomy)

> 분류체계를 자동 추출하지 못했습니다. 아래를 직접 채우세요.
> 형식: 과목(\`##\`) 아래에 단원(\`-\`) → 소단원(들여쓴 \`-\`). 각 노드는 \`[[과목/단원/소단원]]\` 백링크로 적습니다.
`;

test("renderTaxonomySkeleton: 과목이 없으면 안내문만", () => {
  assert.equal(renderTaxonomySkeleton([]), GUIDE);
});

test("renderTaxonomySkeleton: 과목 헤더를 순서대로 붙인다(문자열 고정)", () => {
  assert.equal(
    renderTaxonomySkeleton([
      { id: "s1", name: "과목 A" },
      { id: "s2", name: "과목 B" },
    ]),
    `${GUIDE}\n## 과목 A (s1)\n\n## 과목 B (s2)\n`,
  );
});

test("initVault: 빈 디렉토리에 표준 구조와 taxonomy 스켈레톤을 만든다", () => {
  withTempDir((dir) => {
    const result = initVault(dir);
    assert.equal(result.ok, true);
    for (const relative of VAULT_DIRS) {
      assert.ok(statSync(join(dir, relative)).isDirectory(), relative);
    }
    assert.equal(readFileSync(join(dir, "00_Exam", "taxonomy.md"), "utf8"), GUIDE);
    if (result.ok) {
      assert.equal(result.created.length, VAULT_DIRS.length + 1);
      assert.deepEqual(result.skipped, []);
      assert.ok(result.created.every((path) => !path.includes("\\")));
    }
    // exam.yaml·attempts.jsonl 등 다른 파일은 만들지 않는다
    assert.equal(existsSync(join(dir, "00_Exam", "exam.yaml")), false);
    assert.equal(existsSync(join(dir, "04_Logs", "attempts.jsonl")), false);
  });
});

test("initVault: 없는 디렉토리도 만들어 초기화한다", () => {
  withTempDir((dir) => {
    const target = join(dir, "new", "my-vault");
    assert.equal(initVault(target).ok, true);
    assert.ok(statSync(join(target, ".kern")).isDirectory());
  });
});

test("initVault: 2회 실행은 멱등이고 기존 파일 내용을 바꾸지 않는다", () => {
  withTempDir((dir) => {
    initVault(dir);
    const taxonomyPath = join(dir, "00_Exam", "taxonomy.md");
    writeText(taxonomyPath, "# 내가 고친 분류체계\n");
    const notePath = join(dir, "02_Theory", "note.md");
    writeText(notePath, "노트\n");
    const second = initVault(dir);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.deepEqual(second.created, []);
      assert.equal(second.skipped.length, VAULT_DIRS.length + 1);
    }
    assert.equal(readFileSync(taxonomyPath, "utf8"), "# 내가 고친 분류체계\n");
    assert.equal(readFileSync(notePath, "utf8"), "노트\n");
  });
});

test("initVault: exam.yaml 이 있으면 과목 헤더를 넣는다", () => {
  withTempDir((dir) => {
    writeText(join(dir, "00_Exam", "exam.yaml"), EXAM_YAML);
    assert.equal(initVault(dir).ok, true);
    assert.equal(
      readFileSync(join(dir, "00_Exam", "taxonomy.md"), "utf8"),
      `${GUIDE}\n## 과목 A (s1)\n\n## 과목 B (s2)\n`,
    );
    assert.equal(readFileSync(join(dir, "00_Exam", "exam.yaml"), "utf8"), EXAM_YAML);
  });
});

test("initVault: exam.yaml 이 잘못됐으면 실패하고 아무것도 만들지 않는다", () => {
  withTempDir((dir) => {
    writeText(join(dir, "00_Exam", "exam.yaml"), EXAM_YAML.replace("locale: ko\n", ""));
    const result = initVault(dir);
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /exam\.yaml 검증 실패/);
    assert.equal(existsSync(join(dir, "00_Exam", "taxonomy.md")), false);
    assert.equal(existsSync(join(dir, "02_Theory")), false);
  });
});

test("cli init-vault: 생성·건너뜀 목록을 출력하고 exit 0", () => {
  withTempDir((dir) => {
    const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const first = spawnSync(process.execPath, [cliPath, "init-vault", dir], { encoding: "utf8" });
    assert.equal(first.status, 0);
    assert.equal(first.stderr, "");
    assert.match(first.stdout, /생성: .*00_Exam\/taxonomy\.md/);
    assert.match(first.stdout, new RegExp(`완료: 생성 ${VAULT_DIRS.length + 1}개, 건너뜀 0개`));
    const second = spawnSync(process.execPath, [cliPath, "init-vault", dir], { encoding: "utf8" });
    assert.equal(second.status, 0);
    assert.match(second.stdout, /건너뜀\(이미 있음\): .*00_Exam\/taxonomy\.md/);
    assert.match(second.stdout, new RegExp(`완료: 생성 0개, 건너뜀 ${VAULT_DIRS.length + 1}개`));
  });
});
