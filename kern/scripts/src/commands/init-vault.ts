// vault 표준 구조(PRD §6.2)와 taxonomy.md 스켈레톤을 만드는 init-vault 커맨드 로직. 출력·exit code 는 cli.ts 가 맡는다
import { existsSync } from "node:fs";
import { ensureDir, readExam, writeTextIfAbsent } from "../vault/io.ts";
import { vaultPaths } from "../vault/paths.ts";

export type InitVaultResult =
  | { ok: true; created: string[]; skipped: string[] }
  | { ok: false; message: string };

export interface TaxonomySubject {
  id: string;
  name: string;
}

// 빈 트리 + 수동 편집 안내. 분류체계 추출에 성공한 경우에만 에이전트가 이 파일을 채운다(s1-plan F8)
export function renderTaxonomySkeleton(subjects: readonly TaxonomySubject[]): string {
  const guide = [
    "# 분류체계 (taxonomy)",
    "",
    "> 분류체계를 자동 추출하지 못했습니다. 아래를 직접 채우세요.",
    "> 형식: 과목(`##`) 아래에 단원(`-`) → 소단원(들여쓴 `-`). 각 노드는 `[[과목/단원/소단원]]` 백링크로 적습니다.",
    "",
  ].join("\n");
  return guide + subjects.map(({ id, name }) => `\n## ${name} (${id})\n`).join("");
}

// 기존 파일·디렉토리는 덮어쓰지 않고 skipped 에 담는다
export function initVault(dir: string): InitVaultResult {
  const paths = vaultPaths(dir);
  let subjects: TaxonomySubject[] = [];
  // exam.yaml 이 있으면 먼저 검증한다. 잘못된 프로파일 위에 구조를 만들지 않는다
  if (existsSync(paths.examYaml)) {
    try {
      subjects = readExam(dir).stages.flatMap((stage) => stage.subjects.map(({ id, name }) => ({ id, name })));
    } catch (cause) {
      return { ok: false, message: cause instanceof Error ? cause.message : String(cause) };
    }
  }
  const created: string[] = [];
  const skipped: string[] = [];
  for (const path of paths.dirs) {
    (ensureDir(path) ? created : skipped).push(path);
  }
  (writeTextIfAbsent(paths.taxonomy, renderTaxonomySkeleton(subjects)) ? created : skipped).push(paths.taxonomy);
  return { ok: true, created, skipped };
}
