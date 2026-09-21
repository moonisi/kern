// package.json 문자열에서 플러그인 version 을 읽는 순수 함수

export function parseVersion(packageJsonText: string): string {
  const parsed: unknown = JSON.parse(packageJsonText);
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
    throw new Error("package.json 에 version 필드가 없습니다");
  }
  const { version } = parsed;
  if (typeof version !== "string" || version === "") {
    throw new Error("package.json 의 version 이 비어 있거나 문자열이 아닙니다");
  }
  return version;
}
