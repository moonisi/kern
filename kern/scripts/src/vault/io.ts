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

// 읽기 경계에서 스키마 검증까지 끝낸다. 실패는 예외
export function readExam(vaultRoot: string): Exam {
  return parseExam(readYaml(vaultPaths(vaultRoot).examYaml));
}
