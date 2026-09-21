// kern CLI 인자를 해석하는 순수 함수

export type ParsedArgs =
  | { kind: "version" }
  | { kind: "validate-exam"; path: string }
  | { kind: "init-vault"; dir: string }
  | { kind: "error"; message: string };

const USAGE = "사용법: kern --version | kern validate-exam [path] | kern init-vault [dir]";

// validate-exam 의 path 생략 시 기본값(cwd 기준 vault 표준 위치)
export const DEFAULT_EXAM_PATH = "00_Exam/exam.yaml";

export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv.length === 0) {
    return { kind: "error", message: `인자가 없습니다. ${USAGE}` };
  }
  if (argv.length === 1 && argv[0] === "--version") {
    return { kind: "version" };
  }
  if (argv[0] === "validate-exam" && argv.length <= 2) {
    const path = argv[1] ?? DEFAULT_EXAM_PATH;
    if (!path.startsWith("-")) {
      return { kind: "validate-exam", path };
    }
  }
  // init-vault 의 dir 생략 시 cwd
  if (argv[0] === "init-vault" && argv.length <= 2) {
    const dir = argv[1] ?? ".";
    if (!dir.startsWith("-")) {
      return { kind: "init-vault", dir };
    }
  }
  return { kind: "error", message: `알 수 없는 인자: ${argv.join(" ")}. ${USAGE}` };
}
