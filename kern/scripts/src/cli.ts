// kern CLI 진입점: 인자를 해석해 실행하고 exit code 를 정한다
import { readFileSync } from "node:fs";
import { parseArgs } from "./args.ts";
import { initVault } from "./commands/init-vault.ts";
import { validateExam } from "./commands/validate-exam.ts";
import { parseVersion } from "./version.ts";

const parsed = parseArgs(process.argv.slice(2));
if (parsed.kind === "error") {
  console.error(parsed.message);
  process.exit(1);
}
if (parsed.kind === "validate-exam") {
  const result = validateExam(parsed.path);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(["통과", ...result.warnings].join("\n"));
  process.exit(0);
}
if (parsed.kind === "init-vault") {
  const result = initVault(parsed.dir);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  const lines = [
    ...result.created.map((path) => `생성: ${path}`),
    ...result.skipped.map((path) => `건너뜀(이미 있음): ${path}`),
    `완료: 생성 ${result.created.length}개, 건너뜀 ${result.skipped.length}개`,
  ];
  console.log(lines.join("\n"));
  process.exit(0);
}
const packageJsonUrl = new URL("../../package.json", import.meta.url);
console.log(parseVersion(readFileSync(packageJsonUrl, "utf8")));
