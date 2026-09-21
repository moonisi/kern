// 04_Logs/attempts.jsonl append-only 기록. 덮어쓰기·읽기·집계는 하지 않는다
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseAttempt } from "../schema/attempt.ts";
import { vaultPaths } from "./paths.ts";

// 검증을 통과한 뒤에만 한 줄 JSON + LF 를 덧붙인다. 검증 실패 시 파일은 건드리지 않는다
export function appendAttempt(vaultRoot: string, attempt: unknown): void {
  const line = `${JSON.stringify(parseAttempt(attempt))}\n`;
  const path = vaultPaths(vaultRoot).attempts;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, line, "utf8");
}
