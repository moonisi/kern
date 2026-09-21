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
