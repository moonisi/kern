// 마크다운 frontmatter(--- YAML ---) 파싱·직렬화 순수 함수. 파일 IO 는 하지 않는다
// yaml 2.x API 확인 출처: node_modules/yaml/dist/public-api.d.ts(parse·stringify),
// options.d.ts(lineWidth: 0 = 줄 접기 해제) (2026-09-21)
import { parse, stringify } from "yaml";

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

const FENCE = "---";

// frontmatter 없음·닫는 --- 없음·매핑 아님은 전부 예외. 빈 data 로 폴백하지 않는다
export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== FENCE) {
    throw new Error("frontmatter 가 없습니다: 첫 줄이 --- 가 아닙니다");
  }
  const end = lines.indexOf(FENCE, 1);
  if (end === -1) {
    throw new Error("frontmatter 의 닫는 --- 가 없습니다");
  }
  let data: unknown;
  try {
    data = parse(lines.slice(1, end).join("\n"));
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`frontmatter YAML 파싱 실패: ${reason}`, { cause });
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("frontmatter 는 매핑(key: value) 이어야 합니다");
  }
  return { data: data as Record<string, unknown>, body: lines.slice(end + 1).join("\n") };
}

export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  return `${FENCE}\n${stringify(data, { lineWidth: 0 })}${FENCE}\n${body}`;
}
