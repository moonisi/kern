// parseArgs 단위 테스트
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../src/args.ts";

test("parseArgs: --version 은 version 으로 해석한다", () => {
  assert.deepEqual(parseArgs(["--version"]), { kind: "version" });
});

test("parseArgs: 인자가 없으면 error 를 반환한다", () => {
  const result = parseArgs([]);
  assert.equal(result.kind, "error");
});

test("parseArgs: 알 수 없는 인자는 error 와 해당 인자를 메시지에 담는다", () => {
  const result = parseArgs(["--nope"]);
  assert.equal(result.kind, "error");
  assert.match(result.kind === "error" ? result.message : "", /--nope/);
});

test("parseArgs: --version 뒤에 인자가 더 있으면 error 를 반환한다", () => {
  assert.equal(parseArgs(["--version", "extra"]).kind, "error");
});

test("parseArgs: validate-exam 은 path 생략 시 기본 경로를 쓴다", () => {
  assert.deepEqual(parseArgs(["validate-exam"]), { kind: "validate-exam", path: "00_Exam/exam.yaml" });
});

test("parseArgs: validate-exam <path> 는 주어진 경로를 담는다", () => {
  assert.deepEqual(parseArgs(["validate-exam", "a/exam.yaml"]), { kind: "validate-exam", path: "a/exam.yaml" });
});

test("parseArgs: init-vault 는 dir 생략 시 cwd, 주어지면 그 경로를 담는다", () => {
  assert.deepEqual(parseArgs(["init-vault"]), { kind: "init-vault", dir: "." });
  assert.deepEqual(parseArgs(["init-vault", "my-vault"]), { kind: "init-vault", dir: "my-vault" });
});

test("parseArgs: init-vault 에 인자가 2개 이상이거나 옵션 형태면 error 를 반환한다", () => {
  assert.equal(parseArgs(["init-vault", "a", "b"]).kind, "error");
  assert.equal(parseArgs(["init-vault", "--force"]).kind, "error");
});

test("parseArgs: validate-exam 에 인자가 2개 이상이거나 옵션 형태면 error 를 반환한다", () => {
  assert.equal(parseArgs(["validate-exam", "a.yaml", "b.yaml"]).kind, "error");
  assert.equal(parseArgs(["validate-exam", "--nope"]).kind, "error");
});
