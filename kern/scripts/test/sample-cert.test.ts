// examples/sample-cert 기대값(exam.yaml·원문·taxonomy.md)이 스키마·가드와 어긋나지 않는지 확인하는 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateExam } from "../src/commands/validate-exam.ts";
import { parseExam } from "../src/schema/exam.ts";
import { readYaml } from "../src/vault/io.ts";

const sampleDir = fileURLToPath(new URL("../../../examples/sample-cert/", import.meta.url));
const examPath = `${sampleDir}exam.yaml`;

test("sample-cert: exam.yaml 이 validate-exam 을 경고 없이 통과한다(원문 파일 가드 포함)", () => {
  assert.deepEqual(validateExam(examPath), { ok: true, warnings: [] });
});

test("sample-cert: verified: true 이고 criteria_source 는 MD 원문을 가리킨다", () => {
  const exam = parseExam(readYaml(examPath));
  assert.equal(exam.exam.verified, true);
  assert.equal(exam.exam.criteria_source, "criteria/2026_criteria.md");
});

test("sample-cert: taxonomy.md 의 과목 헤더가 exam.yaml 과목과 일치하고 모든 노드가 백링크다", () => {
  const exam = parseExam(readYaml(examPath));
  const text = readFileSync(`${sampleDir}taxonomy.md`, "utf8");
  const headers = text.split("\n").filter((line) => line.startsWith("## "));
  const expected = exam.stages.flatMap((stage) => stage.subjects.map(({ id, name }) => `## ${name} (${id})`));
  assert.deepEqual(headers, expected);
  const nodes = text.split("\n").filter((line) => line.trimStart().startsWith("- "));
  assert.ok(nodes.length > 0);
  const names = exam.stages.flatMap((stage) => stage.subjects.map((subject) => subject.name));
  for (const node of nodes) {
    const match = /^(?: {2})?- \[\[([^\]/]+)\/[^\]]+\]\]$/.exec(node);
    assert.ok(match, `백링크 형식이 아님: ${node}`);
    assert.ok(names.includes(match[1] ?? ""), `과목명이 exam.yaml 에 없음: ${node}`);
  }
});

test("sample-cert: 원문의 단원·소단원이 taxonomy.md 에 빠짐없이 있다", () => {
  const criteria = readFileSync(`${sampleDir}criteria/2026_criteria.md`, "utf8");
  const taxonomy = readFileSync(`${sampleDir}taxonomy.md`, "utf8");
  const units = [...criteria.matchAll(/(?:단원 \d+|소단원 \d+-\d+)(?=[\s|,.]|$)/gm)].map((m) => m[0]);
  assert.ok(units.length > 0);
  for (const unit of new Set(units)) {
    assert.ok(taxonomy.includes(`/${unit}]]`), `taxonomy.md 에 없음: ${unit}`);
  }
});
