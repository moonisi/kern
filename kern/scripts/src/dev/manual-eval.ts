// evals 케이스 1건을 하네스 없이 수동 실행·판정하는 개발용 도구. native Windows 에서 needs-bash 케이스를 확인할 때 쓴다(CLAUDE.md §8)
// 사용: npm run eval:manual -- evals/<case>   (kern/ 에서 실행. sh(Git Bash)가 PATH 에 있어야 scaffold 가 돈다)
// 주의: `claude plugin eval` 과 달리 OS 샌드박스가 없다. 실행은 사용자 권한·계정·과금으로 돌아가므로 직접 작성한 케이스에만 쓴다
// CLI 옵션 확인 출처: `claude --help` 2.1.275 (-p, --plugin-dir, --permission-mode, --allowedTools, --output-format) (2026-09-21)
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyGrader, parseGrader, parseTrace } from "./graders.ts";
import { parseFrontmatter } from "../vault/frontmatter.ts";
import { ensureDir, readYaml, writeText } from "../vault/io.ts";

// 앱 번들 claude.exe 중 가장 높은 버전. 다른 위치면 KERN_CLAUDE_EXE 로 지정한다
function findClaude(): string {
  const fromEnv = process.env["KERN_CLAUDE_EXE"];
  if (fromEnv !== undefined) return fromEnv;
  const base = join(process.env["APPDATA"] ?? "", "Claude", "claude-code");
  if (!existsSync(base)) {
    throw new Error(`claude 실행 파일을 찾지 못했습니다: ${base} 없음. KERN_CLAUDE_EXE 로 경로를 지정하세요`);
  }
  const byVersionDesc = (a: string, b: string): number => b.localeCompare(a, undefined, { numeric: true });
  const version = readdirSync(base).sort(byVersionDesc)[0];
  if (version === undefined) throw new Error(`claude 버전 폴더가 없습니다: ${base}`);
  return join(base, version, "claude.exe");
}

const caseArg = process.argv[2];
if (caseArg === undefined) {
  console.error("사용법: npm run eval:manual -- evals/<case>");
  process.exit(1);
}
const caseDir = resolve(caseArg);
const pluginRoot = fileURLToPath(new URL("../../../", import.meta.url));
const prompt = parseFrontmatter(readFileSync(join(caseDir, "prompt.md"), "utf8"));

const root = mkdtempSync(join(tmpdir(), "kern-manual-eval-"));
const workspace = join(root, "ws");
ensureDir(workspace);

// scaffold: 하네스와 같은 fixture 스크립트를 빈 workspace 에서 실행한다
const caseYamlPath = join(caseDir, "case.yaml");
if (existsSync(caseYamlPath)) {
  const caseYaml = readYaml(caseYamlPath) as { context?: { scaffold_script?: unknown } };
  const script = caseYaml.context?.scaffold_script;
  if (typeof script === "string") {
    const scaffold = spawnSync("sh", [join(caseDir, script).replaceAll("\\", "/")], { cwd: workspace, encoding: "utf8" });
    if (scaffold.status !== 0) {
      console.error(`scaffold 실패(exit ${scaffold.status}): ${scaffold.error?.message ?? scaffold.stderr}`);
      process.exit(1);
    }
    console.log(`scaffold: ${scaffold.stdout.trim()}`);
  }
}

const allowedTools = Array.isArray(prompt.data["allowed_tools"]) ? (prompt.data["allowed_tools"] as unknown[]).map(String) : [];
// Bash 는 통째로 열지 않고 하네스 실행 명령(CLAUDE.md §7)과 같은 범위만 허용한다
const grants = allowedTools.flatMap((tool) => (tool === "Bash" ? ["Bash(node:*)", "Bash(cp:*)"] : [tool]));
const timeoutSeconds = typeof prompt.data["timeout_seconds"] === "number" ? prompt.data["timeout_seconds"] : 300;

console.log(`실행: ${caseDir.replaceAll("\\", "/")}\nworkspace: ${workspace.replaceAll("\\", "/")}`);
const run = spawnSync(
  findClaude(),
  ["-p", prompt.body.trim(), "--plugin-dir", pluginRoot, "--permission-mode", "acceptEdits", "--output-format", "stream-json", "--verbose", "--allowedTools", ...grants],
  { cwd: workspace, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: timeoutSeconds * 1000 },
);
const tracePath = join(root, "trace.jsonl");
writeText(tracePath, run.stdout ?? "");
if (run.error !== undefined || run.status !== 0) {
  console.error(`claude 실행 실패(exit ${run.status}): ${run.error?.message ?? run.stderr}\ntrace: ${tracePath}`);
  process.exit(1);
}

const trace = parseTrace(run.stdout);
const readFile = (path: string): string | null => {
  const absolute = join(workspace, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
};
let failed = 0;
const gradersDir = join(caseDir, "graders");
for (const file of readdirSync(gradersDir).filter((name) => name.endsWith(".md")).sort()) {
  const grader = parseGrader(parseFrontmatter(readFileSync(join(gradersDir, file), "utf8")).data);
  const result = applyGrader(grader, { lastMessage: trace.lastMessage, calls: trace.calls, readFile });
  if (!result.passed) failed += 1;
  console.log(`  ${result.passed ? "✓" : "✗"} ${file.replace(/\.md$/, "")} (${grader.type}): ${result.detail}`);
}
console.log(`${failed === 0 ? "통과" : `실패 ${failed}건`} · 비용 $${trace.costUsd?.toFixed(2) ?? "?"} · trace: ${tracePath.replaceAll("\\", "/")}`);
process.exit(failed === 0 ? 0 : 1);
