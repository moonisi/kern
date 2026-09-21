// vault 표준 디렉토리 규약(PRD §6.2)과 경로 생성 순수 함수
import { join } from "node:path";

// vault 루트 기준 상대 경로. 저장·출력 문자열은 항상 / 구분자
export const VAULT_DIRS = [
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
] as const;

export interface VaultPaths {
  root: string;
  dirs: string[];
  examYaml: string;
  taxonomy: string;
  criteriaDir: string;
  itemsDir: string;
  attempts: string;
}

function toSlash(path: string): string {
  return path.replaceAll("\\", "/");
}

// Windows 의 join 은 백슬래시를 돌려주므로 결과를 / 로 정규화한다
export function vaultPaths(root: string): VaultPaths {
  const at = (relative: string): string => toSlash(join(toSlash(root), relative));
  return {
    root: at("."),
    dirs: VAULT_DIRS.map(at),
    examYaml: at("00_Exam/exam.yaml"),
    taxonomy: at("00_Exam/taxonomy.md"),
    criteriaDir: at("00_Exam/criteria"),
    itemsDir: at("03_Questions/Items"),
    attempts: at("04_Logs/attempts.jsonl"),
  };
}
