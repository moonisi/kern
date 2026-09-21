// vault 파일 읽기·쓰기 경계. 쓰기는 전부 이 모듈을 거친다(CLAUDE.md §5)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse } from "yaml";
import { parseExam } from "../schema/exam.ts";
import type { Exam } from "../schema/exam.ts";
import { vaultPaths } from "./paths.ts";

export function readYaml(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`파일을 읽을 수 없습니다: ${path} (${reason})`, { cause });
  }
  try {
    return parse(text);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`YAML 파싱 실패: ${path}\n${reason}`, { cause });
  }
}

// 상위 디렉토리를 만들고 LF 로 고정해 쓴다
export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text.replaceAll("\r\n", "\n"), "utf8");
}

// 디렉토리가 없으면 만든다. 새로 만들었으면 true, 이미 있었으면 false.
// mkdirSync(recursive) 는 새로 만든 첫 경로를, 만든 것이 없으면 undefined 를 돌려준다(@types/node fs.d.ts)
export function ensureDir(path: string): boolean {
  return mkdirSync(path, { recursive: true }) !== undefined;
}

// 파일이 없을 때만 쓴다(flag "wx"). 새로 썼으면 true, 이미 있으면 내용을 건드리지 않고 false
export function writeTextIfAbsent(path: string, text: string): boolean {
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, text.replaceAll("\r\n", "\n"), { encoding: "utf8", flag: "wx" });
    return true;
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "EEXIST") {
      return false;
    }
    throw cause;
  }
}

// 읽기 경계에서 스키마 검증까지 끝낸다. 실패는 예외
export function readExam(vaultRoot: string): Exam {
  return parseExam(readYaml(vaultPaths(vaultRoot).examYaml));
}
