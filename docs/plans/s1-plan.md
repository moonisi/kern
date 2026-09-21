# S1 — 데이터 계층·`init-exam` 실행 계획서

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-21 (KST) |
| 기준 | `docs/roadmap.md` §2 S1, `docs/prd.md` §6.2·§7.1·§8, `CLAUDE.md` §4~§7 |
| 범례 | 🔵 확인됨 / 🟡 추정 / 🔴 미확인 |
| 상태 | Q1~Q5 확정(§0.2). T0·T1 완료 |

## 0. 검토 결과 (착수 전 알아야 할 것)

| # | 발견 | 상태 | 조치 |
|---|---|---|---|
| F1 | 런타임 의존성이 처음 생긴다: `zod`(CLAUDE.md §5 필수) + YAML 파서. 현재 `kern/package.json` 은 devDependencies 뿐 | 🔵 파일 읽음. 버전·라이선스는 🔴 | T0 에서 `npm view <pkg> version license` 인용 → 사용자 승인 → 설치. 추천: `zod` + `yaml` 2개. frontmatter 는 `---` 분리 + `yaml` 로 자체 파서(짧음). `gray-matter` 는 자체 YAML 파서(`js-yaml` 🟡)를 끌고 와 파서가 2개가 되므로 비추천 |
| F2 | `--plugin-dir`/in-place 로드는 의존성을 설치해 주지 않는다(결정 0001 사실 5, `--plugin-dir` 는 🟡). 캐시 설치는 `npm ci` 로 설치됨(사실 2·11 🔵) | 🔵/🟡 | 개발 중에는 `cd kern && npm ci` 선행. T10 에서 `node_modules` 없는 상태의 에러 메시지가 조용하지 않은지 1회 확인 |
| F3 | `exam.yaml` 의 `criteria_source: "criteria/2026_criteria.pdf"` 인데 S1 원문은 "자작". PDF 를 만들려면 도구·의존성이 필요. PRD §6.2 는 `criteria/` 에 PDF/MD 모두 허용 | 🔵 | **MD 로 작성**하고 `criteria_source` 를 `criteria/2026_criteria.md` 로 변경(Q1). PDF 입력 검증은 S2(ingest) 로 미룸 |
| F4 | DoD "생성된 `exam.yaml` 이 기대값과 **필드 단위 일치**" 는 LLM 실행 결과의 비교다. `claude plugin eval` grader(`regex`·`file_exists`·`tool_used`·`llm`)가 **생성 파일 내용**을 검사할 수 있는지 | 🔴 미확인 | T9 첫 단계에서 https://code.claude.com/docs/en/plugin-evals 로 확인. 불가하면: scratchpad vault 에서 `claude -p` 수동 실행 → `node:assert.deepStrictEqual`(파싱된 YAML) 로 비교, 출력 인용. LLM judge 로 "일치" 판정은 쓰지 않음 |
| F5 | `disable-model-invocation: true` 스킬을 eval 프롬프트에서 `/kern:init-exam` 으로 호출할 수 있는지 | 🔴 미확인 | T9 첫 단계에서 문서·실행으로 확인. 불가하면 F4 의 수동 경로로 대체하고 evals 는 "보류"로 보고 |
| F6 | `exam.verified: true` 를 누가 쓰는가. CLAUDE.md §0-6 의 "`verified` 는 verify 스크립트만" 은 **문항 status** 규칙이고, `exam.verified` 는 PRD P3(원문 확인 여부)라 별개 | 🔵 문서 읽음. 정책은 미정(Q2) | 추천: 에이전트가 쓰되 `validate-exam` 이 결정적 가드를 건다 — `verified: true` 인데 `criteria_source` 파일이 없으면 **오류**. 원문 없는 `true` 를 스크립트가 차단 |
| F7 | 핸들러 값 범위. PRD 는 `mcq`·`short_answer`·`essay_rubric`·`UNSUPPORTED`·`ext:...` 를 언급하나 roadmap 리스크는 "`sample-cert` 에 필요한 필드만" | 🔵 | S1 스키마: `mcq` \| `short_answer` \| `UNSUPPORTED` 만. `UNSUPPORTED` 는 검증 통과 + 경고 출력(exit 0). 그 외 문자열은 오류. stage 레벨 `handler`·`rubric_source`·`ext:` 는 S7 v2 |
| F8 | "분류체계 추출 실패 시 빈 트리 + 수동 편집 안내 (**테스트 케이스로 고정**)" — LLM 동작은 단위 테스트로 못 잠근다 | 🔵 | 결정적 부분으로 옮김: `init-vault` 가 `taxonomy.md` **스켈레톤(과목 헤더만 + 안내문)** 을 쓰고, 에이전트는 성공 시에만 채운다. 스켈레톤 렌더 순수 함수를 단위 테스트. 에이전트 쪽은 evals 1건 |
| F9 | 문항 ID 해시 길이 불일치: roadmap `hash8` vs PRD §8.2 예시 `a3f9c2`(6자). 해시 입력도 미정 | 🔵 불일치 확인 | Q3. 추천: 8자(roadmap 우선), 입력 = 정규화한 문제 본문+선지의 sha256. PRD 예시는 T4 에서 8자로 정정 |
| F10 | `args.ts` 는 `--version` 만 안다. `validate-exam`·`init-vault` 서브커맨드 분기 필요 | 🔵 파일 읽음 | T5 에서 `ParsedArgs` 유니온 확장. `node:util` `parseArgs` 사용 여부는 Node 공식 문서 확인 후 결정(기억으로 시그니처 쓰지 않음) |
| F11 | 라우터 스텁이 "이 플러그인에는 라우터만 들어 있다"·"S0" 고정 문장을 출력하고 `evals/plugin-load` 가 그 문장을 regex 로 잠그고 있다. `init-exam` 추가 후에는 **거짓**이 된다 | 🔵 파일 읽음 | T9 에서 스텁을 최소 수정: `exam.yaml` 없으면 "`/kern:init-exam` 을 직접 입력하라" 안내(자동 호출 금지 스킬이라 라우터가 실행할 수 없음 🟡). eval regex 동시 갱신. 본격 라우터는 S5 그대로 |
| F12 | `attempts.jsonl` append 는 S1 에 소비자가 없다(첫 사용은 S3 solve) | 🔵 | roadmap 산출물이므로 유지하되 최소 구현: zod 스키마(PRD §8.3) + append 함수 + 테스트. 읽기·집계는 만들지 않음 |
| F13 | always-on 토큰 기준선 ~141. `disable-model-invocation` 스킬·에이전트 추가가 always-on 을 늘리는지 | 🔴 | T8 직후 `claude plugin details kern` 출력 인용, 증가분 보고 |
| F14 | PRD §9 "플랫폼: macOS/Linux 우선", §13 Q2 가 CLAUDE.md(Windows 11 확정)와 어긋남 | 🔵 | S1 범위 밖. 보고만 함(수정 여부는 사용자 결정) |

## 0.1 착수 전 결정이 필요한 질문

| # | 질문 | 추천 | 이유 |
|---|---|---|---|
| Q1 | 샘플 출제기준 원문 형식 | **MD** (`criteria/2026_criteria.md`) | PDF 생성 도구·의존성 불필요, diff 가능. PDF 경로는 S2 에서 검증 |
| Q2 | `exam.verified: true` 기록 주체 | **에이전트가 쓰고 `validate-exam` 이 원문 파일 존재를 강제** | 새 CLI 없이 P3 를 결정적으로 보장 |
| Q3 | 문항 ID 해시 | **sha256(정규화 본문+선지) 앞 8자** | roadmap 과 일치, 같은 문항 재ingest 시 같은 ID(중복 방지) |
| Q4 | YAML·frontmatter 의존성 | **`zod` + `yaml`, frontmatter 자체 파서** | 의존성 2개로 끝. 버전·라이선스는 T0 에서 확인 후 승인 |
| Q5 | 라우터 스텁 수정(F11)을 S1 에 포함할지 | **포함(T9, 최소 수정)** | 안 하면 스텁이 거짓 문장을 출력(CLAUDE.md §0) |

## 0.2 확정된 결정 (2026-09-21 사용자 확인)

| # | 결정 |
|---|---|
| D1 | Q1: 샘플 출제기준 원문은 MD (`criteria/2026_criteria.md`) |
| D2 | Q2: `exam.verified: true` 는 에이전트가 쓰고 `validate-exam` 이 원문 파일 존재를 강제 |
| D3 | Q3: 문항 ID 해시 = sha256(정규화 본문+선지) 앞 8자. PRD §8.2 예시는 T4 에서 정정 |
| D4 | Q4: 의존성은 `zod` + `yaml`, frontmatter 는 자체 파서 (버전·라이선스 확인 후 설치 승인은 T0 에서 별도) |
| D5 | Q5: 라우터 스텁 최소 수정을 S1(T9)에 포함 |
| D6 | T3(attempts)·T4(id)는 S1 에 유지 (roadmap 산출물 그대로) |

## 1. Task 목록과 의존 관계

```text
T0 의존성 승인·설치 ─┬─ T1 exam 스키마 ──┬─ T5 CLI 분기 + validate-exam ─┐
                     │                   └─ T7 sample-cert 원문·기대값    │
                     ├─ T2 vault 경로·YAML/frontmatter IO ─┬─ T3 attempts append
                     │                                     └─ T6 init-vault (T5 필요)
                     └─ T4 id.ts (독립)
T8 exam-profiler 에이전트 + init-exam 스킬 (T5·T6·T7 필요)
T9 evals 3건 + 라우터 스텁 갱신 (T8 필요)
T10 S1 종합 검증·실측 기록 (전부 완료 후)
```

모든 task 공통 완료 정의(CLAUDE.md §4): 코드 → 테스트 출력 → validate 출력 → evals 출력(해당 시) → 커밋. 출력 인용이 없으면 "미완료".
공통 검증 명령(이하 "공통 검증"):
```bash
cd kern && npm run typecheck && npm test
"$CLAUDE" plugin validate ./kern --strict     # $CLAUDE 는 s0-plan.md "claude 호출 방법"
git status --short
```
공통 코드 규칙: 새 소스 첫 줄 한국어 역할 주석, import 는 `.ts` 확장자·`import type`, enum 금지, 에러 메시지 한국어, `catch {}` 금지.

---

## T0 — 의존성 확인·승인·설치

**체크리스트**
- [x] `npm view zod version license`, `npm view yaml version license` 출력 인용 (GPL/AGPL/LGPL 이면 중단) — 🔵 2026-09-21 `zod` 4.6.5 MIT / `yaml` 2.9.1 ISC
- [x] Q1~Q5 사용자 확정을 이 문서 "0.2 확정된 결정" 절로 기록
- [x] **사용자 승인 후** `cd kern && npm install zod yaml` (`dependencies` 에 들어갔는지 확인), 정확한 버전 고정 여부는 기존 `package.json` 스타일(고정 버전)을 따름 — 🔵 `--save-exact`, `added 2 packages`(전이 의존성 0)
- [x] type stripping 환경에서 두 패키지 import 가 되는지 scratchpad 한 줄 스크립트로 확인(출력 인용) — 🔵 모듈 해석 때문에 scratchpad 대신 `kern/scripts/` 임시 `.ts` 로 실행: 출력 `{"a":1}`, exit 0, `tsc` exit 0. 임시 파일 삭제
- [x] `npm ci && npm test` 통과, `git status` 에 `node_modules` 없음 — 🔵 pass 7 / fail 0, `validate --strict` 통과

**추천 프롬프트**
```text
S1-T0: docs/plans/s1-plan.md 의 T0 을 수행해줘. zod 와 yaml 의 npm view version license 출력을 그대로 보여주고
내 승인을 기다려. 승인 후 kern/ 루트에 설치하고 npm ci·npm test 출력을 인용해. 다른 코드는 건드리지 마.
```

**검증**: `npm view` 출력 2건, `npm ci`·`npm test` 출력, `git diff --stat` 이 `package.json`·`package-lock.json` 뿐.

**커밋**: `chore(deps): zod·yaml 추가` (본문에 `npm view` 출력)

---

## T1 — `scripts/src/schema/exam.ts` (zod 스키마)

**체크리스트**
- [x] zod 공식 문서로 사용 API 확인(설치된 major 기준, URL 기록) — 기억으로 시그니처 쓰지 않음 🔵 https://zod.dev/api , https://zod.dev/basics + `node_modules/zod/v4/core/schemas.d.ts`(per-parse `error`)
- [x] 필드는 `examples/sample-cert/exam.yaml` 에 있는 것만(F7): `schema_version`(리터럴 1), `exam`(name·code·criteria_version·criteria_source·verified·exam_date?), `stages[].{id,name,time_minutes,pass_rule,subjects[],difficulty_mix}`, `youtube.direct_fetch`, `locale`
- [x] `handler`: `mcq`|`short_answer`|`UNSUPPORTED`. `mcq` 는 `choices` 필수 — PRD 예시 기준으로 필수로 구현(`choices` 경로에 오류)
- [x] 알 수 없는 키는 거부(strict) — 오타가 조용히 통과하지 않게
- [x] 의미 검증: `difficulty_mix` 합 = 1(부동소수 허용오차), `subjects[].id` 중복 없음, `items` 양의 정수
- [x] `parseExam(raw: unknown): Exam` — 실패 시 한국어 메시지 + 필드 경로를 담은 예외(zod 내장 `ko` locale 을 per-parse 로 적용, 전역 config 미사용). `unsupportedSubjects(exam)` 순수 함수(경고용)
- [x] 단위 테스트: 정상 / 필드 누락 / `handler: UNSUPPORTED`(통과+경고 목록) / 미지 handler / 미지 키 / mix 합 ≠ 1 / id 중복 — 🔵 13건, `npm test` pass 20 / fail 0. 실제 `examples/sample-cert/exam.yaml` 도 통과 확인

**추천 프롬프트**
```text
S1-T1: scripts/src/schema/exam.ts 에 exam.yaml zod 스키마를 만들어줘. 필드는 examples/sample-cert/exam.yaml 에 있는 것만,
handler 는 mcq·short_answer·UNSUPPORTED 만 허용. zod API 는 공식 문서로 확인하고 URL 을 남겨.
테스트를 먼저 쓰고(정상·필드 누락·UNSUPPORTED·미지 키·mix 합·id 중복) 통과시켜. 파일 IO 는 넣지 마.
```

**검증**: 공통 검증. 테스트 ≥ 7건 pass 출력. 스키마에 시험명·특정 시험 상수 없음(grep).

**커밋**: `feat(schema): exam.yaml zod 스키마`

---

## T2 — `scripts/src/vault/` 경로 규약 + YAML·frontmatter IO

**체크리스트**
- [ ] `vault/paths.ts`: PRD §6.2 표준 디렉토리 상수 + `vaultPaths(root)` 순수 함수. 경로 결합은 `node:path` 의 posix 가 아닌 기본 API 를 쓰되 **저장·출력 문자열은 `/`** 로 정규화
- [ ] `vault/frontmatter.ts`: `parseFrontmatter(text) → {data, body}`, `stringifyFrontmatter(data, body)` 순수 함수. frontmatter 없음·닫는 `---` 없음은 예외(조용한 폴백 금지). CRLF 입력 처리
- [ ] `vault/io.ts`: `readYaml(path)`, `writeText(path, text)`(상위 디렉토리 생성, LF 고정), `readExam(vaultRoot)` = 읽기 + `parseExam` (읽기 경계 검증, CLAUDE.md §5)
- [ ] round-trip 테스트: parse → stringify → parse 동일. 한글·`[[백링크]]`·콜론 포함 값
- [ ] IO 테스트는 `os.tmpdir()` 하위 임시 디렉토리 사용, 테스트 후 정리

**추천 프롬프트**
```text
S1-T2: scripts/src/vault/ 에 paths.ts·frontmatter.ts·io.ts 를 만들어줘. frontmatter 는 yaml 패키지로 자체 파싱,
순수 함수와 IO 를 분리해. 잘못된 입력은 예외로 던지고 폴백하지 마. Windows 경로에서도 출력 경로 문자열은 / 로.
테스트는 임시 디렉토리에서, round-trip 포함.
```

**검증**: 공통 검증. `grep -rn "writeFile\|appendFile" kern/scripts/src` 결과가 `vault/` 안에만 있음.

**커밋**: `feat(vault): 경로 규약·frontmatter·YAML IO`

---

## T3 — `vault/attempts.ts` append-only 로그

**체크리스트**
- [ ] `schema/attempt.ts`: PRD §8.3 필드 zod 스키마(`ts` 는 오프셋 포함 ISO 문자열, `rating` 은 선택 🟡 — S5 전에는 값이 없음)
- [ ] `appendAttempt(vaultRoot, attempt)`: 검증 → 한 줄 JSON + `\n` append. 덮어쓰기·truncate API 사용 금지
- [ ] 테스트: 2회 append → 2줄, 기존 줄 불변 / 잘못된 attempt → 예외 + 파일 불변 / 파일 없음 → 생성
- [ ] 읽기·집계 함수는 만들지 않음(F12)

**추천 프롬프트**
```text
S1-T3: attempts.jsonl append 함수를 만들어줘. PRD §8.3 을 zod 로 검증한 뒤 한 줄 append 만 한다.
덮어쓰는 코드 금지, 읽기·집계는 만들지 마. 테스트로 append-only 와 검증 실패 시 파일 불변을 고정해.
```

**검증**: 공통 검증. 테스트 3건 이상 pass.

**커밋**: `feat(vault): attempts.jsonl append`

---

## T4 — `scripts/src/id.ts` 문항 ID

**체크리스트**
- [ ] `itemId({code, subject, body, choices?}) → "{code}_{subject}_{hash8}"` 순수 함수(Q3). 해시는 `node:crypto` sha256
- [ ] 정규화 규칙을 코드 주석에 명시: 공백 축약·trim·NFC 🟡. 선지 **순서는 해시에 포함**(순서가 다르면 다른 문항)
- [ ] `code`·`subject` 에 `_`·공백·대문자 등이 있으면 예외(ID 파싱 가능성 보장)
- [ ] 테스트: 동일 입력 동일 ID / 공백 차이 동일 ID / 본문 1자 차이 다른 ID / 형식 정규식 / 잘못된 code 예외
- [ ] `docs/prd.md` §8.2 예시 ID 를 8자로 정정(F9)

**추천 프롬프트**
```text
S1-T4: scripts/src/id.ts 에 문항 ID 생성 순수 함수를 만들어줘. 형식 {code}_{subject}_{hash8}, sha256 앞 8자,
입력은 정규화한 본문+선지. 정규화 규칙은 주석에 적고 테스트로 고정해. PRD §8.2 예시도 8자로 맞춰줘.
```

**검증**: 공통 검증. 테스트 5건 이상 pass.

**커밋**: `feat(id): 문항 ID 생성`

---

## T5 — CLI 서브커맨드 분기 + `kern validate-exam`

**체크리스트**
- [ ] `args.ts` `ParsedArgs` 확장: `validate-exam [path]`(기본 `00_Exam/exam.yaml`), 기존 `--version`·오류 동작 유지. 기존 테스트 4건 그대로 통과
- [ ] `cli.ts` 는 분기만, 로직은 `commands/validate-exam.ts`(결과 객체 반환, 출력·exit code 는 cli 에서)
- [ ] 동작: 통과 → `통과` + UNSUPPORTED 경고 목록, exit 0 / 스키마 오류 → 필드 경로 포함 한국어 메시지, exit 1 / 파일 없음 → exit 1
- [ ] **F6 가드**: `verified: true` 인데 `criteria_source`(exam.yaml 기준 상대경로) 파일이 없으면 오류
- [ ] 테스트: 임시 디렉토리 픽스처로 4 경로 + 실제 프로세스 실행 1건(`brief.test.ts` 방식 참고)
- [ ] Git Bash `./kern/bin/kern validate-exam examples/sample-cert/exam.yaml`, PowerShell `.\kern\bin\kern.cmd ...` 출력 인용

**추천 프롬프트**
```text
S1-T5: kern validate-exam [path] 를 추가해줘. args.ts 를 확장하되 기존 --version 테스트는 그대로 통과해야 해.
verified: true 인데 criteria_source 파일이 없으면 오류로 처리해. UNSUPPORTED 는 경고만. Git Bash·PowerShell 실제 출력을 인용해.
```

**검증**: 공통 검증 + 두 셸 실행 출력. (이 시점 `sample-cert/exam.yaml` 은 `verified: false` 라 통과해야 함)

**커밋**: `feat(cli): validate-exam 서브커맨드`

---

## T6 — `kern init-vault`

**체크리스트**
- [ ] `kern init-vault [dir]`(기본 cwd): PRD §6.2 디렉토리 생성. **기존 파일은 절대 덮어쓰지 않음**, 이미 있으면 건너뛰고 목록 출력
- [ ] `taxonomy.md` 스켈레톤(F8): 렌더 순수 함수 `renderTaxonomySkeleton(subjects)` — 과목 헤더 + "분류체계를 자동 추출하지 못했습니다. 아래를 직접 채우세요" 안내. `exam.yaml` 이 없으면 과목 없이 안내문만
- [ ] 빈 디렉토리는 git 이 추적 못 함 — vault 는 gitignore 대상이라 무관, `.gitkeep` 만들지 않음
- [ ] 쓰기는 전부 `vault/io.ts` 경유
- [ ] 테스트: 빈 디렉토리 → 표준 구조 전부 존재 / 2회 실행 멱등(기존 파일 내용 불변) / 스켈레톤 문자열 고정
- [ ] 생성 디렉토리명이 `.gitignore` 의 `*-vault/` 와 무관하게 테스트는 tmpdir 에서만 수행(저장소에 vault 생성 금지)

**추천 프롬프트**
```text
S1-T6: kern init-vault [dir] 를 추가해줘. PRD §6.2 구조를 만들고 기존 파일은 덮어쓰지 마.
taxonomy.md 스켈레톤(빈 트리 + 수동 편집 안내)은 순수 함수로 렌더하고 테스트로 문자열을 고정해. 테스트는 tmpdir 에서만.
```

**검증**: 공통 검증 + scratchpad 에서 실제 실행 후 `find` 출력 인용. `git status` 에 vault 없음.

**커밋**: `feat(cli): init-vault 서브커맨드`

---

## T7 — `examples/sample-cert/` 원문·기대값

**체크리스트**
- [ ] `criteria/2026_criteria.md`(Q1): 자작 출제기준 — 시험 개요, 과목 2개·문항수·시간·배점·합격기준, 과목별 단원 → 소단원 트리(과목당 3~4단원 🟡). **실제 시험·법령·교재를 연상시키는 내용 금지**, 파일 상단에 "자작" 명시
- [ ] `exam.yaml`: `criteria_source` → `criteria/2026_criteria.md`, `verified: true`, 상단 주석 갱신. 원문의 수치와 1:1 대응(문항수·시간·과락·평균)
- [ ] `taxonomy.md`: 원문 트리와 일치, 각 노드 `[[과목/단원/소단원]]` 백링크(PRD §8.2 형식)
- [ ] `README.md` "현재 상태" 갱신(없는 것을 있다고 쓰지 않음: 문항 40개는 여전히 없음)
- [ ] 테스트: `examples/sample-cert/exam.yaml` 이 `parseExam` 통과 + `validate-exam` exit 0(원문 파일 존재 가드 포함) — 기대값이 스키마와 어긋나면 CI 에서 드러남
- [ ] 원문 ↔ `exam.yaml` 수치 대조표를 커밋 본문에

**추천 프롬프트**
```text
S1-T7: examples/sample-cert/ 에 자작 출제기준 원문(criteria/2026_criteria.md), 기대 taxonomy.md 를 만들고
exam.yaml 을 verified: true 로 갱신해줘. 완전히 가상의 과목·단원만 쓰고 실제 시험을 연상시키는 내용은 넣지 마.
원문 수치와 exam.yaml 이 1:1 로 맞는지 대조표를 보여주고, validate-exam 실제 출력을 인용해.
```

**검증**: 공통 검증 + `kern validate-exam examples/sample-cert/exam.yaml` 출력. `git status` 에 기출·PDF 없음.

**커밋**: `feat(examples): sample-cert 출제기준 원문·taxonomy 추가`

---

## T8 — `agents/exam-profiler.md` + `skills/init-exam/SKILL.md`

**체크리스트**
- [ ] 공식 문서로 agent frontmatter 필드·`disable-model-invocation` 확인(URL 기록): https://code.claude.com/docs/en/sub-agents , https://code.claude.com/docs/en/skills 🔴 필드는 읽은 뒤 작성
- [ ] `SKILL.md`: `disable-model-invocation: true`, `description` 1~2문장 + 한국어 트리거("시험 등록 / 새 시험 세팅 / 출제기준 넣기"). 절차 고정:
  1. `kern init-vault` 실행 → 2. 원문 위치 확인(`00_Exam/criteria/`, 없으면 사용자에게 요청) → 3. `exam-profiler` 에 위임 → 4. `exam.yaml` 작성 → 5. `kern validate-exam` 실행, 실패 시 메시지대로 수정(최대 N회 🟡) → 6. `taxonomy.md` 채움 또는 스켈레톤 유지 → 7. 결과 보고
- [ ] **원문 없음 경로**: 모든 추출 필드에 근거 없음 → `verified: false` + 고정 확인 요청 메시지. 기억으로 시험 정보를 채우지 않음(§0-5)
- [ ] **UNSUPPORTED 경로**: 카탈로그(`mcq`·`short_answer`)에 없는 유형 → `handler: UNSUPPORTED` + 경고 고정 문구
- [ ] **분류 실패 경로**: 스켈레톤을 건드리지 않고 수동 편집 안내(F8)
- [ ] 런타임 §0 규칙 3종 삽입(모르면 모른다 / 근거 없이 생성 금지 / 채점·`verified` 상태 직접 기록 금지 — 문항 status 에 한함, `exam.verified` 는 Q2 규칙)
- [ ] 출력 형식(결과 보고 블록) 고정 — T9 evals 가 잠글 문자열
- [ ] 특정 시험명·예시 하드코딩 없음. 사용자 대면 한국어
- [ ] validate 출력 + `claude plugin details kern` always-on 토큰(기준선 ~141 대비, F13)

**추천 프롬프트**
```text
S1-T8: init-exam 스킬과 exam-profiler 에이전트를 만들어줘. frontmatter 는 공식 문서 확인 후 작성(URL 남겨).
s1-plan.md T8 의 7단계 절차와 세 가지 예외 경로(원문 없음·UNSUPPORTED·분류 실패)의 고정 문구를 넣고,
exam.yaml 은 반드시 kern validate-exam 통과로 끝나게 해. 시험 정보를 기억으로 채우지 못하게 막아. 끝나면 validate·details 출력을 인용해.
```

**검증**: validate `--strict` 통과 출력, always-on 토큰 값. 수동: scratchpad vault + 샘플 원문으로 `claude -p "/kern:init-exam ..."`(PowerShell, MSYS 경로 변환 회피) 1회 실행 출력 인용.

**커밋**: `feat(skills): init-exam 스킬·exam-profiler 에이전트`

---

## T9 — evals 3건 + 라우터 스텁 갱신

**체크리스트**
- [ ] F4·F5 를 문서로 먼저 확인(URL 기록). 결과에 따라 아래 케이스의 grader 를 결정하고, 불가한 부분은 **지어내지 말고** 수동 검증으로 대체·보고
- [ ] `evals/init-exam-with-source/`: 샘플 원문 제공 → 결과 보고 블록 + `verified: true` + `validate-exam` 호출(`tool_used`/`tool_order` 🟡)
- [ ] `evals/init-exam-no-source/`: 원문 없이 → `verified: false` + 확인 요청 고정 문구(regex)
- [ ] `evals/init-exam-taxonomy-fail/`: 단원 정보가 없는 원문 → 수동 편집 안내 문구(regex)
- [ ] 필드 단위 일치(DoD): eval 로 가능하면 eval, 아니면 scratchpad 수동 실행 → `deepStrictEqual` 비교 출력 인용
- [ ] 라우터 스텁(F11, Q5): "S0"·"라우터만 들어 있다" 제거, `exam.yaml` 없으면 `/kern:init-exam` 직접 입력 안내 1개. `evals/plugin-load` regex 갱신
- [ ] `claude plugin eval ./kern --trust-plugin --no-publish` 전체 출력 인용, 비용 기록

**추천 프롬프트**
```text
S1-T9: init-exam evals 3건(원문 있음·원문 없음·분류 실패)을 추가하고 라우터 스텁을 S1 상태에 맞게 최소 수정해줘.
먼저 plugin-evals 문서로 (1) 생성 파일 내용을 검사하는 grader 가 있는지 (2) disable-model-invocation 스킬을 eval 에서 호출할 수 있는지 확인해.
안 되는 건 형식을 지어내지 말고 수동 검증으로 대체해 보고해. LLM judge 는 쓰지 마.
```

**검증**: eval 실행 출력(with/without 점수), `plugin-load` 포함 전 케이스 통과. 실패 시 출력 전체 인용 + 원인 🟡.

**커밋**: `test(evals): init-exam 케이스 3건` / `feat(skills): 라우터 스텁 S1 상태 반영` (2개로 분리)

---

## T10 — S1 종합 검증·실측 기록

**체크리스트**
- [ ] 아래 DoD 명령 전부 실행, 출력 인용, 통과/실패 표
- [ ] roadmap S1 DoD 4항목 각각에 증거 연결(테스트명·eval 케이스·수동 실행 출력)
- [ ] F2: `node_modules` 없는 복사본에서 `kern validate-exam` 실행 → 에러가 드러나는지 확인(조용한 실패 아님)
- [ ] `claude plugin details kern` 토큰을 roadmap S1 "실측"에 기록, 세션 수 실측 기록
- [ ] CLAUDE.md §8 표 갱신(F4·F5·F13 확인 결과), §2 표에 의존성 변화가 있으면 반영
- [ ] 미완료·🔴 항목은 숨기지 않고 "부분 완료"로 보고

**DoD 검증 명령**
```bash
cd kern && npm ci && npm run typecheck && npm test
"$CLAUDE" plugin validate ./kern --strict
"$CLAUDE" plugin details kern
"$CLAUDE" plugin eval ./kern --trust-plugin --no-publish
./kern/bin/kern validate-exam examples/sample-cert/exam.yaml
git status --short
```
```powershell
.\kern\bin\kern.cmd validate-exam examples\sample-cert\exam.yaml
```

**추천 프롬프트**
```text
S1-T10: s1-plan.md 의 DoD 명령을 전부 실제로 실행해 출력을 인용하고, roadmap S1 DoD 4항목별 증거 표를 만들어줘.
실패는 원인 추정에 🟡 를 붙이고 테스트를 약화하지 마. 그 뒤 roadmap 실측과 CLAUDE.md §8 을 갱신해.
```

**커밋**: `docs(roadmap): S1 실측 반영`

---

## 2. 전체 진행 체크

- [x] T0 의존성 승인·설치
- [x] T1 exam 스키마
- [ ] T2 vault 경로·IO
- [ ] T3 attempts append
- [ ] T4 문항 ID
- [ ] T5 validate-exam
- [ ] T6 init-vault
- [ ] T7 sample-cert 원문·기대값
- [ ] T8 init-exam 스킬·에이전트
- [ ] T9 evals·라우터 스텁
- [ ] T10 종합 검증

## 3. 반대 관점·반례

- **가로 슬라이스 위험**: T1~T6 은 전부 데이터 계층이라 roadmap 원칙 1(세로 슬라이스)과 긴장이 있다. 사용자가 쓸 수 있는 흐름은 T8 에서야 나온다. 대안은 T1→T5→T7→T8 로 `init-exam` 을 먼저 세우고 T3·T4 를 첫 소비자가 생기는 S2/S3 로 미루는 것. roadmap 산출물 목록을 따르느라 그대로 뒀지만, 미루는 쪽이 "Nothing speculative" 에 더 맞다.
- **Q2(에이전트가 `verified: true` 기록)**: 파일 존재 가드는 "원문이 있다"만 보장하고 "추출이 원문과 일치한다"는 보장하지 않는다. 더 엄격하게는 `verified` 를 사용자가 검토 후 직접 바꾸게 하는 방법이 있으나, roadmap DoD("실행 → `verified: true`")와 충돌한다.
- **자체 frontmatter 파서**: 의존성은 줄지만 엣지 케이스(본문 내 `---`, BOM)를 직접 떠안는다. S2 에서 문항 파일이 수백 개가 되면 `gray-matter` 가 더 안전할 수 있다.
- **evals 의존**: F4·F5 가 둘 다 "불가"로 나오면 S1 DoD 의 LLM 부분은 수동 검증뿐이라 회귀를 못 잠근다. 그 경우 S1 을 "조건부 완료"로 볼지 결정이 필요하다(S0 D3 선례).
- **스키마 strict(미지 키 거부)**: 사용자가 `exam.yaml` 에 메모성 키를 넣으면 검증이 깨진다(PRD P6 "편집 가능한 텍스트"와 긴장). 대신 오타를 잡는다.
