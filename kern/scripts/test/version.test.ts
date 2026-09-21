// parseVersion 단위 테스트
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVersion } from "../src/version.ts";

test("parseVersion: version 문자열을 반환한다", () => {
  assert.equal(parseVersion('{"name":"kern","version":"1.2.3"}'), "1.2.3");
});

test("parseVersion: version 이 없으면 예외를 던진다", () => {
  assert.throws(() => parseVersion('{"name":"kern"}'), /version/);
});
