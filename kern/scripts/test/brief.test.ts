// brief.ts 침묵 스텁 단위 테스트
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("brief: stdout·stderr 없이 exit 0 으로 끝난다", () => {
  const briefPath = fileURLToPath(new URL("../src/brief.ts", import.meta.url));
  const result = spawnSync(process.execPath, [briefPath], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});
