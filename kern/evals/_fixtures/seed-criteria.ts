// init-exam evals 의 workspace 에 자작 샘플 출제기준 원문을 심는 scaffold 로직. 인자: full | no-units
import { readFileSync } from "node:fs";
import { writeText } from "../../scripts/src/vault/io.ts";

const UNITS_HEADING = "## 5. 과목별 출제 범위";
const mode = process.argv[2];
if (mode !== "full" && mode !== "no-units") {
  throw new Error(`인자는 full 또는 no-units 여야 합니다: ${String(mode)}`);
}
// 원문은 examples/sample-cert 한 곳에만 둔다(사본을 만들면 기대값과 어긋날 수 있다)
const source = readFileSync(new URL("../../../examples/sample-cert/criteria/2026_criteria.md", import.meta.url), "utf8");
let text = source;
if (mode === "no-units") {
  // 단원 정보가 없는 원문: §5 이후를 잘라낸다
  const cut = source.indexOf(UNITS_HEADING);
  if (cut < 0) throw new Error(`원문에서 "${UNITS_HEADING}" 를 찾지 못했습니다`);
  text = source.slice(0, cut);
}
// scaffold_script 는 빈 workspace 를 cwd 로 실행된다
writeText("00_Exam/criteria/2026_criteria.md", text);
console.log(`심음(${mode}): 00_Exam/criteria/2026_criteria.md`);
