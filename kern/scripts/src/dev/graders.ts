// evals 의 결정적 grader 정의를 `claude -p` stream-json 실행 결과에 적용하는 순수 함수(개발용). 파일 IO 는 하지 않는다
// grader 옵션 출처: https://code.claude.com/docs/en/plugin-evals "Grader types"·"What a grader can look at" (2026-09-21)
// zod 4 API 확인: node_modules/zod/v4/classic/schemas.d.ts (discriminatedUnion·union·strictObject)
// 하네스와 다른 점: llm·baseline grader, target trace/files/mock_calls, file_exists 의 glob 은 지원하지 않는다(예외).
// file_exists 는 "실행 중 생성" 여부가 아니라 실행 후 존재 여부만 본다
import { z } from "zod";

const common = { weight: z.number().positive().optional(), arm: z.enum(["with-only", "both"]).optional() };

const toolSpecSchema = z.union([
  z.string().min(1),
  z.strictObject({ tool: z.string().min(1), input_match: z.string().optional() }),
]);

const plainPathSchema = z
  .string()
  .min(1)
  .refine((path) => !/[*?[\]{}]/.test(path), { error: "glob 경로는 지원하지 않습니다" });

const graderSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("regex"),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    match: z.union([z.literal("contains"), z.literal("not_contains"), z.string().regex(/^count:\d+$/)]).optional(),
    target: z
      .union([z.literal("last_message"), z.strictObject({ source: z.literal("file"), path: plainPathSchema })])
      .optional(),
    ...common,
  }),
  z.strictObject({
    type: z.literal("tool_used"),
    tool: z.string().min(1),
    input_match: z.string().optional(),
    min: z.int().min(0).optional(),
    max: z.int().min(0).optional(),
    ...common,
  }),
  z.strictObject({ type: z.literal("tool_order"), before: toolSpecSchema, after: toolSpecSchema, ...common }),
  z.strictObject({ type: z.literal("file_exists"), path: plainPathSchema, exists: z.boolean().optional(), ...common }),
]);

export type Grader = z.infer<typeof graderSchema>;
type ToolSpec = z.infer<typeof toolSpecSchema>;

export function parseGrader(raw: unknown): Grader {
  const result = graderSchema.safeParse(raw, { error: z.locales.ko().localeError });
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    throw new Error(`grader 검증 실패:\n${lines.join("\n")}`);
  }
  return result.data;
}

export interface ToolCall {
  name: string;
  // JSON 으로 직렬화한 도구 입력. 하네스의 input_match 도 JSON-encoded input 에 매칭한다
  input: string;
}

export interface Trace {
  lastMessage: string;
  calls: ToolCall[];
  costUsd: number | null;
}

interface StreamEvent {
  type?: unknown;
  result?: unknown;
  total_cost_usd?: unknown;
  message?: { content?: unknown };
}

// `claude -p --output-format stream-json --verbose` 출력(한 줄에 이벤트 하나)을 해석한다
export function parseTrace(jsonl: string): Trace {
  const events = jsonl
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== "")
    .map(({ line, index }): StreamEvent => {
      try {
        return JSON.parse(line) as StreamEvent;
      } catch (cause) {
        throw new Error(`trace ${index + 1}번째 줄이 JSON 이 아닙니다`, { cause });
      }
    });
  const result = events.find((event) => event.type === "result");
  if (result === undefined || typeof result.result !== "string") {
    throw new Error("trace 에 result 이벤트가 없습니다(실행이 끝나지 않았거나 실패)");
  }
  const calls = events
    .filter((event) => event.type === "assistant" && Array.isArray(event.message?.content))
    .flatMap((event) => event.message?.content as { type?: unknown; name?: unknown; input?: unknown }[])
    .filter((block) => block.type === "tool_use" && typeof block.name === "string")
    .map((block) => ({ name: block.name as string, input: JSON.stringify(block.input) }));
  return {
    lastMessage: result.result,
    calls,
    costUsd: typeof result.total_cost_usd === "number" ? result.total_cost_usd : null,
  };
}

export interface RunContext {
  lastMessage: string;
  calls: readonly ToolCall[];
  // workspace 기준 상대경로의 파일 내용. 없으면 null
  readFile: (path: string) => string | null;
}

export interface GraderResult {
  passed: boolean;
  detail: string;
}

function matchingIndexes(calls: readonly ToolCall[], spec: ToolSpec): number[] {
  const { tool, input_match } = typeof spec === "string" ? { tool: spec, input_match: undefined } : spec;
  const pattern = input_match === undefined ? null : new RegExp(input_match);
  return calls.flatMap((call, index) => (call.name === tool && (pattern === null || pattern.test(call.input)) ? [index] : []));
}

export function applyGrader(grader: Grader, context: RunContext): GraderResult {
  if (grader.type === "regex") {
    const target = grader.target ?? "last_message";
    const text = target === "last_message" ? context.lastMessage : context.readFile(target.path);
    if (text === null) {
      return { passed: false, detail: `파일 없음: ${(target as { path: string }).path}` };
    }
    const flags = grader.flags ?? "";
    const count = [...text.matchAll(new RegExp(grader.pattern, flags.includes("g") ? flags : `${flags}g`))].length;
    const match = grader.match ?? "contains";
    const passed =
      match === "contains" ? count > 0 : match === "not_contains" ? count === 0 : count === Number(match.slice("count:".length));
    return { passed, detail: `${count}회 매칭 (${match})` };
  }
  if (grader.type === "file_exists") {
    const exists = context.readFile(grader.path) !== null;
    return { passed: exists === (grader.exists ?? true), detail: `${grader.path} ${exists ? "있음" : "없음"}` };
  }
  if (grader.type === "tool_used") {
    const count = matchingIndexes(context.calls, grader).length;
    const min = grader.min ?? 1;
    const max = grader.max ?? Infinity;
    return { passed: count >= min && count <= max, detail: `${grader.tool} ${count}회 (기대 ${min}..${max})` };
  }
  const before = matchingIndexes(context.calls, grader.before)[0];
  const after = matchingIndexes(context.calls, grader.after)[0];
  return {
    passed: before !== undefined && after !== undefined && before < after,
    detail: `before #${before ?? "없음"}, after #${after ?? "없음"}`,
  };
}
