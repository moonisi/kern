// kern CLI 인자를 해석하는 순수 함수

export type ParsedArgs =
  | { kind: "version" }
  | { kind: "error"; message: string };

const USAGE = "사용법: kern --version";

export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv.length === 0) {
    return { kind: "error", message: `인자가 없습니다. ${USAGE}` };
  }
  if (argv.length === 1 && argv[0] === "--version") {
    return { kind: "version" };
  }
  return { kind: "error", message: `알 수 없는 인자: ${argv.join(" ")}. ${USAGE}` };
}
