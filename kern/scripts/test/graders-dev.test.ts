// evals 수동 검증 도구의 순수 로직(parseGrader·parseTrace·applyGrader) 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGrader, parseGrader, parseTrace } from "../src/dev/graders.ts";
import type { RunContext } from "../src/dev/graders.ts";

function context(overrides: Partial<RunContext> = {}): RunContext {
  return { lastMessage: "", calls: [], readFile: () => null, ...overrides };
}

const TRACE = [
  JSON.stringify({ type: "system", subtype: "init" }),
  JSON.stringify({
    type: "assistant",
    message: {
      content: [
        { type: "text", text: "시작" },
        { type: "tool_use", name: "Bash", input: { command: "node cli.ts init-vault ." } },
      ],
    },
  }),
  JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", content: "완료" }] } }),
  JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Agent", input: { subagent_type: "kern:exam-profiler" } }] } }),
  JSON.stringify({ type: "result", result: "## init-exam 결과", total_cost_usd: 0.25, num_turns: 3 }),
].join("\n");

test("parseTrace: 최종 메시지·도구 호출·비용을 뽑는다", () => {
  const trace = parseTrace(TRACE);
  assert.equal(trace.lastMessage, "## init-exam 결과");
  assert.deepEqual(
    trace.calls.map((call) => call.name),
    ["Bash", "Agent"],
  );
  assert.equal(trace.calls[0]?.input, '{"command":"node cli.ts init-vault ."}');
  assert.equal(trace.costUsd, 0.25);
});

test("parseTrace: BOM·CRLF·빈 줄을 허용한다", () => {
  const trace = parseTrace(`﻿${TRACE.replaceAll("\n", "\r\n")}\r\n\r\n`);
  assert.equal(trace.calls.length, 2);
});

test("parseTrace: result 이벤트가 없으면 예외", () => {
  assert.throws(() => parseTrace(JSON.stringify({ type: "system" })), /result 이벤트가 없습니다/);
});

test("parseTrace: JSON 이 아닌 줄은 줄 번호와 함께 예외", () => {
  assert.throws(() => parseTrace("not json"), /1번째 줄/);
});

test("parseGrader: 미지 type·미지 키는 예외", () => {
  assert.throws(() => parseGrader({ type: "llm" }), /grader 검증 실패/);
  assert.throws(() => parseGrader({ type: "regex", pattern: "a", patern: "b" }), /grader 검증 실패/);
});

test("regex: 기본 target 은 최종 메시지", () => {
  const grader = parseGrader({ type: "regex", pattern: "결과\\s*블록" });
  assert.equal(applyGrader(grader, context({ lastMessage: "결과 블록" })).passed, true);
  assert.equal(applyGrader(grader, context({ lastMessage: "없음" })).passed, false);
});

test("regex: flags·not_contains·count:N", () => {
  const ctx = context({ lastMessage: "Aa a" });
  assert.equal(applyGrader(parseGrader({ type: "regex", pattern: "a", flags: "i", match: "count:3" }), ctx).passed, true);
  assert.equal(applyGrader(parseGrader({ type: "regex", pattern: "a", match: "count:3" }), ctx).passed, false);
  assert.equal(applyGrader(parseGrader({ type: "regex", pattern: "z", match: "not_contains" }), ctx).passed, true);
});

test("regex: file target 은 파일 내용을 보고, 파일이 없으면 실패", () => {
  const grader = parseGrader({ type: "regex", pattern: "verified:\\s*true", target: { source: "file", path: "00_Exam/exam.yaml" } });
  const readFile = (path: string): string | null => (path === "00_Exam/exam.yaml" ? "verified: true\n" : null);
  assert.equal(applyGrader(grader, context({ readFile })).passed, true);
  const missing = applyGrader(grader, context());
  assert.equal(missing.passed, false);
  assert.match(missing.detail, /파일 없음/);
});

test("regex: 지원하지 않는 target 은 예외", () => {
  assert.throws(() => parseGrader({ type: "regex", pattern: "a", target: "mock_calls" }), /grader 검증 실패/);
});

test("file_exists: exists false 는 부재를 요구한다", () => {
  const readFile = (path: string): string | null => (path === "a.md" ? "" : null);
  assert.equal(applyGrader(parseGrader({ type: "file_exists", path: "a.md" }), context({ readFile })).passed, true);
  assert.equal(applyGrader(parseGrader({ type: "file_exists", path: "a.md", exists: false }), context({ readFile })).passed, false);
  assert.equal(applyGrader(parseGrader({ type: "file_exists", path: "b.md", exists: false }), context({ readFile })).passed, true);
});

test("file_exists: glob 경로는 지원하지 않아 예외", () => {
  assert.throws(() => parseGrader({ type: "file_exists", path: "00_Exam/*.yaml" }), /grader 검증 실패/);
});

test("tool_used: input_match·min·max", () => {
  const { calls } = parseTrace(TRACE);
  const ctx = context({ calls });
  assert.equal(applyGrader(parseGrader({ type: "tool_used", tool: "Bash", input_match: "init-vault" }), ctx).passed, true);
  assert.equal(applyGrader(parseGrader({ type: "tool_used", tool: "Bash", input_match: "validate-exam" }), ctx).passed, false);
  assert.equal(applyGrader(parseGrader({ type: "tool_used", tool: "Write", min: 0, max: 0 }), ctx).passed, true);
  assert.equal(applyGrader(parseGrader({ type: "tool_used", tool: "Bash", min: 0, max: 0 }), ctx).passed, false);
});

test("tool_order: before 의 첫 호출이 after 의 첫 호출보다 앞서야 한다", () => {
  const { calls } = parseTrace(TRACE);
  const ctx = context({ calls });
  const ordered = parseGrader({ type: "tool_order", before: { tool: "Bash", input_match: "init-vault" }, after: "Agent" });
  const reversed = parseGrader({ type: "tool_order", before: "Agent", after: "Bash" });
  const absent = parseGrader({ type: "tool_order", before: "Bash", after: "Write" });
  assert.equal(applyGrader(ordered, ctx).passed, true);
  assert.equal(applyGrader(reversed, ctx).passed, false);
  assert.equal(applyGrader(absent, ctx).passed, false);
});
