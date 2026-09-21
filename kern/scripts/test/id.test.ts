// 문항 ID 생성(itemId)의 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { itemId } from "../src/id.ts";

const base = {
  code: "sample-cert",
  subject: "s1",
  body: "다음 중 옳은 것은?",
  choices: ["가", "나", "다", "라"],
};

test("itemId: 형식은 {code}_{subject}_{hash8}", () => {
  assert.match(itemId(base), /^sample-cert_s1_[0-9a-f]{8}$/);
});

test("itemId: 동일 입력 → 동일 ID", () => {
  assert.equal(itemId(base), itemId({ ...base, choices: [...base.choices] }));
});

test("itemId: 공백·줄바꿈·NFD 차이는 같은 ID", () => {
  const messy = {
    ...base,
    body: "  다음  중\r\n옳은\t것은?  ".normalize("NFD"),
    choices: [" 가", "나 ", "다", "라"],
  };
  assert.equal(itemId(messy), itemId({ ...base, body: "다음 중 옳은 것은?" }));
});

test("itemId: 본문 1자 차이는 다른 ID", () => {
  assert.notEqual(itemId(base), itemId({ ...base, body: "다음 중 옳은 것은!" }));
});

test("itemId: 선지 순서가 다르면 다른 ID", () => {
  assert.notEqual(itemId(base), itemId({ ...base, choices: ["나", "가", "다", "라"] }));
});

test("itemId: 선지 경계가 다르면 다른 ID, 선지 없음과 빈 선지도 구분한다", () => {
  assert.notEqual(itemId({ ...base, choices: ["가나", "다"] }), itemId({ ...base, choices: ["가", "나다"] }));
  const { choices: _choices, ...noChoices } = base;
  assert.notEqual(itemId(noChoices), itemId(base));
  assert.notEqual(itemId(noChoices), itemId({ ...base, choices: [] }));
  assert.match(itemId(noChoices), /^sample-cert_s1_[0-9a-f]{8}$/);
});

test("itemId: code·subject 가 다르면 접두부만 달라진다(해시는 본문+선지)", () => {
  const a = itemId(base);
  const b = itemId({ ...base, subject: "s2" });
  assert.equal(a.slice(-8), b.slice(-8));
  assert.ok(b.startsWith("sample-cert_s2_"));
});

test("itemId: 잘못된 code·subject 는 예외", () => {
  for (const code of ["sample_cert", "Sample", "sample cert", "", "시험"]) {
    assert.throws(() => itemId({ ...base, code }), /code/, `code=${code}`);
  }
  for (const subject of ["s_1", "S1", "s 1", ""]) {
    assert.throws(() => itemId({ ...base, subject }), /subject/, `subject=${subject}`);
  }
});

test("itemId: 정규화 후 본문이 비면 예외", () => {
  assert.throws(() => itemId({ ...base, body: " \n\t " }), /body/);
});
