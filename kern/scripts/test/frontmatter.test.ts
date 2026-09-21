// frontmatter 파서(parseFrontmatter·stringifyFrontmatter)의 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, stringifyFrontmatter } from "../src/vault/frontmatter.ts";

test("parseFrontmatter: data 와 body 를 분리한다", () => {
  const { data, body } = parseFrontmatter("---\nid: q1\nscore: 2\n---\n본문 첫 줄\n둘째 줄\n");
  assert.deepEqual(data, { id: "q1", score: 2 });
  assert.equal(body, "본문 첫 줄\n둘째 줄\n");
});

test("parseFrontmatter: CRLF 입력은 LF 로 처리한다", () => {
  const { data, body } = parseFrontmatter("---\r\nid: q1\r\n---\r\n본문\r\n");
  assert.deepEqual(data, { id: "q1" });
  assert.equal(body, "본문\n");
});

test("parseFrontmatter: 닫는 --- 뒤에 본문이 없어도 된다", () => {
  assert.deepEqual(parseFrontmatter("---\nid: q1\n---"), { data: { id: "q1" }, body: "" });
});

test("parseFrontmatter: 본문 안의 --- 는 본문으로 남긴다", () => {
  const { body } = parseFrontmatter("---\nid: q1\n---\n위\n---\n아래\n");
  assert.equal(body, "위\n---\n아래\n");
});

test("parseFrontmatter: frontmatter 가 없으면 예외", () => {
  assert.throws(() => parseFrontmatter("# 제목\n본문\n"), /frontmatter 가 없습니다/);
  assert.throws(() => parseFrontmatter(""), /frontmatter 가 없습니다/);
});

test("parseFrontmatter: 닫는 --- 가 없으면 예외", () => {
  assert.throws(() => parseFrontmatter("---\nid: q1\n본문\n"), /닫는 --- 가 없습니다/);
});

test("parseFrontmatter: frontmatter 가 매핑이 아니면 예외", () => {
  assert.throws(() => parseFrontmatter("---\n- a\n- b\n---\n"), /매핑\(key: value\)/);
  assert.throws(() => parseFrontmatter("---\n---\n본문\n"), /매핑\(key: value\)/);
});

test("parseFrontmatter: YAML 문법 오류는 예외", () => {
  assert.throws(() => parseFrontmatter("---\nid: [1, 2\n---\n"), /frontmatter YAML 파싱 실패/);
});

test("round-trip: 한글·[[백링크]]·콜론 포함 값이 parse → stringify → parse 에서 동일하다", () => {
  const data = {
    id: "sample-cert_s1_a3f9c2d1",
    title: "문제: 다음 중 옳은 것은?",
    source: "[[과목 A/단원 1/소단원 1-2]]",
    tags: ["기출", "[[함정: 부정문]]"],
    time: "10:30",
    choices: 4,
    verified: false,
    note: "아주 긴 값은 줄바꿈으로 접히면 안 된다 ".repeat(10).trim(),
  };
  const body = "## 문제\n\n다음 중 옳은 것은? [[과목 A/단원 1]]\n\n1. 가: 나\n2. 다\n";
  const text = stringifyFrontmatter(data, body);
  const first = parseFrontmatter(text);
  assert.deepEqual(first, { data, body });
  assert.equal(stringifyFrontmatter(first.data, first.body), text);
});

test("stringifyFrontmatter: --- 로 감싸고 본문을 그대로 붙인다", () => {
  assert.equal(stringifyFrontmatter({ id: "q1" }, "본문\n"), "---\nid: q1\n---\n본문\n");
});
