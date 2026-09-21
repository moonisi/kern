// 문항 ID 생성 순수 함수: {code}_{subject}_{hash8} (s1-plan D3)
import { createHash } from "node:crypto";

export interface ItemIdInput {
  code: string;
  subject: string;
  body: string;
  choices?: string[];
}

// ID 를 _ 로 다시 쪼갤 수 있도록 code·subject 는 소문자·숫자·하이픈만 허용한다
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 정규화 규칙: NFC → 연속 공백(줄바꿈·탭 포함)을 공백 1개로 → trim.
// 같은 문항을 다시 ingest 해도 같은 ID 가 나오게 하기 위함. 대소문자·문장부호는 건드리지 않는다
function normalize(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

// 해시 입력 = 정규화한 본문 + 선지. 선지 순서는 해시에 포함한다(순서가 다르면 다른 문항).
// JSON 배열로 직렬화해 본문·선지 경계를 보존하고, 선지 없음(null)과 빈 선지([])를 구분한다
export function itemId({ code, subject, body, choices }: ItemIdInput): string {
  if (!SEGMENT.test(code)) {
    throw new Error(`code 는 소문자·숫자·하이픈만 쓸 수 있습니다: "${code}"`);
  }
  if (!SEGMENT.test(subject)) {
    throw new Error(`subject 는 소문자·숫자·하이픈만 쓸 수 있습니다: "${subject}"`);
  }
  const normalizedBody = normalize(body);
  if (normalizedBody === "") {
    throw new Error("body 가 비어 있습니다");
  }
  const payload = JSON.stringify([normalizedBody, choices?.map(normalize) ?? null]);
  const hash = createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 8);
  return `${code}_${subject}_${hash}`;
}
