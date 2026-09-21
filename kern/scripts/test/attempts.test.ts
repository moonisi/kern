// attempts.jsonl append(appendAttempt)와 attempt 스키마의 단위 테스트. 임시 디렉토리에서만 수행한다
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAttempt } from "../src/schema/attempt.ts";
import { appendAttempt } from "../src/vault/attempts.ts";

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "kern-attempts-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// 일부러 타입을 깨는 입력을 만들어야 해서 any 를 쓴다(테스트 픽스처 한정)
function validAttempt(): any {
  return {
    ts: "2026-09-21T14:30:00+09:00",
    item: "sample-cert_s1_a3f9c2d1",
    mode: "drill",
    answer: 2,
    correct: false,
    sec: 88,
    handler: "mcq",
    confidence: "deterministic",
  };
}

test("parseAttempt: PRD §8.3 예시 형태(rating 포함)를 통과시킨다", () => {
  const raw = { ...validAttempt(), rating: "Again" };
  assert.deepEqual(parseAttempt(raw), raw);
});

test("parseAttempt: rating 은 선택, 단답 answer 는 문자열, correct 는 null 허용", () => {
  const raw = { ...validAttempt(), answer: "가나다", handler: "short_answer", correct: null };
  assert.deepEqual(parseAttempt(raw), raw);
});

test("parseAttempt: 오프셋 없는 ts 는 거부한다", () => {
  assert.throws(() => parseAttempt({ ...validAttempt(), ts: "2026-09-21T14:30:00" }), /attempt 검증 실패[\s\S]*ts/);
});

test("parseAttempt: 미지 키·미지 handler·음수 sec 는 거부한다", () => {
  assert.throws(() => parseAttempt({ ...validAttempt(), corect: true }), /corect/);
  assert.throws(() => parseAttempt({ ...validAttempt(), handler: "UNSUPPORTED" }), /handler/);
  assert.throws(() => parseAttempt({ ...validAttempt(), sec: -1 }), /sec/);
});

test("appendAttempt: 파일이 없으면 만들고 한 줄 JSON + LF 를 쓴다", () => {
  withTempDir((dir) => {
    appendAttempt(dir, validAttempt());
    const text = readFileSync(join(dir, "04_Logs", "attempts.jsonl"), "utf8");
    assert.equal(text, `${JSON.stringify(validAttempt())}\n`);
  });
});

test("appendAttempt: 2회 append → 2줄, 기존 줄은 불변", () => {
  withTempDir((dir) => {
    const path = join(dir, "04_Logs", "attempts.jsonl");
    appendAttempt(dir, validAttempt());
    const before = readFileSync(path, "utf8");
    appendAttempt(dir, { ...validAttempt(), answer: 3, correct: true });
    const after = readFileSync(path, "utf8");
    assert.ok(after.startsWith(before));
    const lines = after.trimEnd().split("\n");
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[1] ?? "").correct, true);
  });
});

test("appendAttempt: 잘못된 attempt 는 예외 + 파일 불변", () => {
  withTempDir((dir) => {
    const path = join(dir, "04_Logs", "attempts.jsonl");
    assert.throws(() => appendAttempt(dir, { ...validAttempt(), sec: "느림" }), /attempt 검증 실패/);
    assert.equal(existsSync(path), false);
    appendAttempt(dir, validAttempt());
    const before = readFileSync(path, "utf8");
    assert.throws(() => appendAttempt(dir, { ...validAttempt(), item: "" }), /attempt 검증 실패/);
    assert.equal(readFileSync(path, "utf8"), before);
  });
});
