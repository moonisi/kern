# S2 — `ingest`·`youtube` 실행 계획서

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-21 (KST) |
| 기준 | `docs/roadmap.md` §2 S2, `docs/prd.md` §6.2·§7.2·§7.3·§8.2, `CLAUDE.md` §0·§4~§8 |
| 범례 | 🔵 확인됨 / 🟡 추정 / 🔴 미확인 |
| 상태 | Q1~Q7 확정(§0.2). T0 착수 가능 |
| 환경 | 🔵 Node v24.19.0 / npm 11.17.0 (2026-09-21 실행). `claude --version` 은 이 계획 작성 중 실행하지 않음 |

## 0. 검토 결과 (착수 전 알아야 할 것)

| # | 발견 | 상태 | 조치 |
|---|---|---|---|
| F1 | **문항 `status: verified` 기록 주체.** PRD §7.2 는 ingest 문항을 `status: verified` 로 저장하라고 하고, CLAUDE.md §0-6·§5 는 "`verified` 는 스크립트만" 이라고 한다 | 🔵 문서 읽음 | 에이전트는 **추출 JSON 만** 내고 `status` 필드를 아예 갖지 않는다. `kern ingest-items` 가 결정적으로 정한다: `answer !== null` → `verified`, `null` → `needs_answer`. 추출 JSON 스키마가 `status` 키를 거부(strict) |
| F2 | **문항 ID 가 재ingest 중복을 못 막는다.** ID = sha256(본문+선지)(S1 D3)인데 비전 추출은 실행마다 글자가 달라질 수 있어 같은 문항이 다른 ID 로 또 생긴다 | 🟡 (비전 편차는 미측정) | 중복 키를 하나 더 둔다: `source_file` + 문항 번호. `ingest-items` 는 같은 키의 문항이 이미 있으면 **쓰지 않고** 건너뛴 목록을 출력(Q4). ID 규칙은 그대로 |
| F3 | **PDF 렌더 라이브러리 미정**(CLAUDE.md §8 🔴). 후보의 버전·라이선스·Windows 동작·한글 글리프 렌더 전부 미확인. 기억 속 후보: `pdfjs-dist` + `@napi-rs/canvas`, `pdf-to-img`, `mupdf`(AGPL 🟡 → 금지 대상일 가능성), `sharp`(본체 Apache 🟡, 번들 libvips 가 LGPL 🟡 → §5 저촉 가능성) | 🔴 | T0 에서 `npm view <pkg> version license` + 한글 1쪽 렌더 스파이크. 렌더 배율로 긴 변 ≤1800px 을 맞추면 PDF 는 별도 리사이즈 라이브러리가 필요 없다 🟡. 이미지 입력(PNG/JPG) 리사이즈는 같은 canvas 라이브러리로 가능한지 스파이크에서 확인 |
| F4 | **Read 도구가 PDF 를 직접 읽는다**(이 세션의 Read 도구 설명: `pages` 파라미터, 요청당 최대 20쪽) | 🔵 도구 설명. 서브에이전트·헤드리스에서 동일한지는 🔴 | 추출 입력을 PNG 로 할지 PDF 직접 읽기로 할지 Q1. 어느 쪽이든 `Attachments/` 이미지(DoD "이미지 링크 유효") 때문에 렌더는 필요 |
| F5 | **첨부 이미지 범위.** 그림·표만 잘라내려면 비전이 준 좌표에 의존해야 하고 검증 수단이 없다 | 🟡 | v1 은 **쪽 전체 PNG** 를 첨부(그림·표가 있는 문항만, `has_figure: true`). 파일명 `Attachments/<hash8>.png`(PRD §8.2). 크롭은 실제 시험 튜닝 세션으로 미룸 |
| F6 | **자작 기출 PDF 를 어떻게 만드나.** PDF 생성 라이브러리는 새 의존성 + 한글 폰트 임베드(폰트 재배포 라이선스) 문제가 있다 | 🔴 | Q2. 추천: 원본을 `sources/exam-2025.html` 로 쓰고 Edge/Chrome `--headless --print-to-pdf` 로 1회 생성해 **PDF 를 커밋**. 옵션명은 `msedge --help`/공식 문서로 확인. 임베드 폰트는 OFL 폰트(예: Noto Sans KR 🟡 설치 여부 미확인)로 제한, 맑은 고딕 임베드 재배포는 🔴 라 피함 |
| F7 | **샘플 PDF 20문항 구성.** `sample-cert` 는 s1(mcq 20)·s2(short_answer 20)인데 roadmap 은 "1부(20문항)" | 🔵 | Q3. 추천: s1 10 + s2 10, 정답표 1쪽 포함, 그림/표 문항 ≥ 2, 단원 분포를 의도적으로 불균등하게(`frequency.json` 검증용). 실제 시험 연상 내용 금지, "자작" 명시 |
| F8 | **기대값 비교 키.** ID 는 추출 글자에 좌우되므로(F2) DoD 비교를 ID 로 하면 깨진다 | 🟡 | `sources/expected-items.json` 은 문항 번호 기준: `{no, subject, type, answer, taxonomy, has_figure}`. 본문 글자 일치는 비교하지 않음(비전 편차), 정답·과목·유형·분류만 `deepStrictEqual` |
| F9 | **`taxonomy` 값 검증.** 에이전트가 없는 노드를 지어낼 수 있다(§0-5) | 🔵 | `vault/taxonomy.ts` 가 `taxonomy.md` 의 `[[...]]` 노드를 파싱. `ingest-items` 는 목록에 없는 노드를 **오류**로 거부(파일 미작성). 분류 불가 문항은 `taxonomy: []` + 경고 목록(조용한 폴백 아님) |
| F10 | **Web Clipper YouTube 템플릿·NotebookLM 요약의 실제 형식** | 🔴 | T7·T8 첫 단계에서 공식 문서/저장소로 확인하고 URL 기록. 확인 못 하면 형식을 지어내지 말고 "frontmatter 에 `url` 이 있고 본문에 자막이 있는 MD" 라는 최소 계약만 두고 보고. 셀렉터·마커는 상수화(roadmap §3) |
| F11 | **경로 ② 의 `<video-id>`.** NotebookLM 붙여넣기에는 영상 URL 이 없을 수 있다 | 🔵 | Q5. 추천: 클리핑 frontmatter 의 `url` 에서 ID 를 뽑는 순수 함수. 없으면 스킬이 학습자에게 URL 을 묻고, 그래도 없으면 노트를 쓰지 않음(ID 를 지어내지 않음) |
| F12 | **youtube 의 결정적/LLM 경계.** "동일 규격"을 LLM 출력에 맡기면 테스트로 못 잠근다 | 🔵 | LLM 은 요약 JSON(핵심 개념·절차 Mermaid·용어 백링크)만 만들고, `kern youtube-note <json>` 이 frontmatter + 4개 절(원 자막 접기 포함)을 렌더. 규격은 순수 함수 문자열 테스트로 고정 |
| F13 | **evals.** ingest·youtube 모두 `kern` CLI(Bash)를 쓰므로 `needs-bash` → native Windows 하네스 실행 불가(§8 🔵) | 🔵 | S1 과 같이 `npm run eval:manual` 로 검증, 하네스 통과 실행은 🔴 로 남김. `manual-eval.ts` 의 Bash 허용 범위(`node:*`·`cp:*`)로 충분한지 T6 에서 확인 |
| F14 | **ingest eval 비용.** 20문항 비전 추출을 eval 마다 돌리면 비쌈 🟡(S1 init-exam 1회 $0.30~0.58) | 🟡 | eval fixture 는 **1쪽 3문항 미니 PDF**, 20문항 전체는 T9 에서 수동 1~2회. 비용 기록 |
| F15 | **always-on 토큰.** 현재 ~325. 스킬 2(`disable-model-invocation`) + 에이전트 1 추가 | 🟡 | T6·T8 직후 `claude plugin details kern` 인용, 증가분 보고 |
| F16 | **라우터 스텁.** S1 에서 고친 고정 문장이 S2 후에도 참인지 | 🔴 파일 미확인 | T6 에서 `skills/kern/SKILL.md` 읽고 거짓이 되면 최소 수정 + `evals/plugin-load` regex 갱신(S1 F11 선례) |
| F17 | **`Books/` 교재 ingest → `02_Theory`.** PRD §7.2 입력·§6.3 파이프라인에는 있으나 roadmap S2 산출물·DoD 에는 없다 | 🔵 | S2 범위 밖으로 두고 보고(Q6). `ingest` 스킬은 `01_Sources/Exams/` 만 받음 |
| F18 | **frontmatter 자체 파서 + 문항 수백 개**(S1 반대 관점) | 🟡 | T1 에서 문항 본문에 `---`(수평선)·표가 있는 round-trip 테스트를 추가. 깨지면 그때 보고, 선제 교체 안 함 |

## 0.1 착수 전 결정이 필요한 질문

| # | 질문 | 추천 | 이유 |
|---|---|---|---|
| Q1 | 비전 추출 입력: 렌더한 PNG vs Read 도구로 PDF 직접 | **PNG(≤1800px) 기본**, T0 스파이크에서 한글 렌더가 깨지면 PDF 직접 읽기로 전환 | roadmap·PRD 명세와 일치, 이미지 입력(스캔본)과 경로가 하나, 쪽 분할·해상도를 스크립트가 통제. 반면 PDF 직접 읽기는 텍스트 레이어 덕에 정확도가 높을 수 있음 🟡 |
| Q2 | 자작 기출 PDF 생성 방법 | **HTML 원본 + 브라우저 headless 인쇄 1회, PDF 커밋** | 의존성 0. 원본 HTML 이 diff 가능 |
| Q3 | 20문항 구성 | **s1 mcq 10 + s2 short_answer 10 + 정답표, 그림/표 ≥ 2** | 두 유형·첨부·빈도 집계를 한 파일로 검증 |
| Q4 | 재ingest 중복 처리 | **`source_file`+문항번호 일치 시 건너뜀 + 목록 출력**(덮어쓰기 없음) | P6(사용자가 고친 md 보존), F2 |
| Q5 | 경로 ② 에 영상 URL 이 없을 때 | **학습자에게 묻고, 없으면 미작성** | ID 를 지어내지 않음(§0-1) |
| Q6 | `Books/` → `02_Theory` 를 S2 에 넣을지 | **제외**(roadmap 에 없음). 필요하면 roadmap 에 별도 항목 추가 | 범위 통제 |
| Q7 | 순서: youtube(T7·T8)를 ingest 뒤에 둘지, S3 뒤로 미룰지 | **S2 안에서 ingest 먼저, youtube 나중**(roadmap 유지) | S3 가 필요로 하는 건 ingest 산출 규격뿐. youtube 를 미루는 안은 §3 참고 |

## 0.2 확정된 결정 (2026-09-21 사용자 확인)

| # | 결정 |
|---|---|
| D1 | Q1: 비전 추출 입력은 렌더한 PNG(≤1800px) 기본. T0 스파이크에서 한글 렌더가 깨지면 PDF 직접 읽기로 전환(전환 시 보고) |
| D2 | Q2: 자작 기출은 HTML 원본 + 브라우저 headless 인쇄 1회, PDF 커밋 |
| D3 | Q3: s1 mcq 10 + s2 short_answer 10 + 정답표, 그림/표 문항 ≥ 2 |
| D4 | Q4: 재ingest 시 `source_file`+문항번호 일치 문항은 건너뜀 + 목록 출력(덮어쓰기 없음) |
| D5 | Q5: 경로 ② 에 영상 URL 이 없으면 학습자에게 묻고, 없으면 노트 미작성 |
| D6 | Q6: `Books/` → `02_Theory` 는 S2 범위에서 제외 |
| D7 | Q7: youtube(T7·T8)는 roadmap 대로 S2 에 유지. ingest 먼저, youtube 나중 |

## 1. Task 목록과 의존 관계

```text
T0 결정·PDF 렌더 스파이크·의존성 승인 ──┐
T1 item 스키마·문항 md 렌더/쓰기 ─┬─ T2 taxonomy 파서 + ingest-items(추출 JSON → 문항) ─┬─ T3 frequency
                                   │                                                     │
T0 ─ T4 render-pages(쪽 분할·렌더·리사이즈·첨부) ────────────────────────────────────────┤
T5 sample-cert/sources 기출 PDF·기대값 (T0 의 Q2·Q3 필요) ───────────────────────────────┤
                                                   T6 item-extractor + ingest 스킬 + evals ┘
T7 youtube 노트 규격·렌더 + Web Clipper 파서 + 샘플 ─┬─ T8 NotebookLM 정규화 + yt-dlp 래퍼 + youtube 스킬 + evals
T9 S2 종합 검증·실측 기록 (전부 완료 후)
```

T1~T3 은 렌더 라이브러리와 무관하므로 T0 승인 대기 중에도 진행 가능. T7~T8 은 ingest 와 독립.

모든 task 공통 완료 정의(CLAUDE.md §4): 코드 → 테스트 출력 → validate 출력 → evals 출력(해당 시) → 커밋. 출력 인용이 없으면 "미완료".
공통 검증 명령(이하 "공통 검증"):
```bash
cd kern && npm run typecheck && npm test
"$CLAUDE" plugin validate ./kern --strict     # $CLAUDE 는 s0-plan.md "claude 호출 방법"
git status --short
```
공통 코드 규칙: 새 소스 첫 줄 한국어 역할 주석, import 는 `.ts` 확장자·`import type`, enum 금지, 에러 메시지 한국어, `catch {}` 금지, 쓰기는 `vault/io.ts` 경유, 테스트는 tmpdir 에서만(저장소에 vault 생성 금지).

---

## T0 — 결정 확정 + PDF 렌더 스파이크 + 의존성 승인

**체크리스트**
- [x] Q1~Q7 사용자 확정을 이 문서 "0.2 확정된 결정" 절로 기록 — 🔵 2026-09-21, 전부 추천안
- [ ] 후보별 `npm view <pkg> version license` 출력 인용(전이 의존성의 네이티브 바이너리 라이선스 포함). GPL/AGPL/LGPL 이면 탈락
- [ ] scratchpad 에서 한글 포함 1쪽 PDF → PNG 렌더 스파이크: Windows 11·Node 24 에서 설치(`npm ci` 시 빌드 도구 불필요 여부), 한글 글리프 정상, 긴 변 ≤1800px 배율 계산, 쪽당 소요 시간. 사용 API 는 공식 문서 URL 기록(기억으로 시그니처 쓰지 않음)
- [ ] 같은 라이브러리로 PNG/JPG 입력 리사이즈가 되는지 확인. 안 되면 "이미지 입력은 원본 그대로 + 크기 경고"로 축소할지 보고
- [ ] 스파이크용 PDF 는 T5 의 Q2 방식으로 만든 임시 1쪽(브라우저 headless 옵션도 여기서 `--help`/문서로 확인)
- [ ] 비교표(후보·버전·라이선스·설치 크기·결과) 제시 → **사용자 승인 후** `npm install --save-exact`
- [ ] 캐시 설치 경로(`npm ci`)에서 네이티브 모듈이 설치되는지 결정 0001 방식으로 1회 확인 🟡
- [ ] CLAUDE.md §8 "Node 순수 PDF 렌더 라이브러리" 행을 🔵 + 출처로 갱신
- [ ] `npm ci && npm test` 통과, `git status` 에 `node_modules`·스파이크 산출물 없음

**추천 프롬프트**
```text
S2-T0: docs/plans/s2-plan.md 의 T0 을 수행해줘. PDF→PNG 렌더 후보를 npm view version license 출력으로 비교하고(LGPL 포함 GPL 계열 탈락,
네이티브 바이너리 라이선스도 확인), scratchpad 에서 한글 1쪽 PDF 렌더 스파이크를 실제로 돌려 결과 PNG 를 보여줘.
API 는 공식 문서로 확인하고 URL 을 남겨. 비교표를 보여주고 내 승인을 기다린 뒤 설치해. 다른 코드는 건드리지 마.
```

**검증**: `npm view` 출력, 스파이크 실행 출력 + 결과 PNG(Read 로 확인), `git diff --stat` 이 `package.json`·`package-lock.json`·`CLAUDE.md`·이 문서뿐.

**커밋**: `chore(deps): PDF 렌더 라이브러리 추가` (본문에 `npm view` 출력·문서 URL) / `docs: S2 결정·§8 PDF 렌더 확정`

---

## T1 — `schema/item.ts` + `vault/items.ts` (문항 스키마·md 렌더/쓰기)

**체크리스트**
- [ ] `schema/item.ts`: PRD §8.2 frontmatter zod 스키마(strict). S2 에 필요한 필드만 필수: `id, stage, subject, taxonomy[], type(mcq|short_answer), difficulty?, source(original|generated|user_upload), seed_items, source_ref, source_file, source_no, status(draft|verified|rejected|needs_answer), attachments[], answer, choices?`. `fsrs`·`stats` 는 선택(S5)
- [ ] 의미 검증: `mcq` → `answer` 는 1..choices 정수 또는 null, `choices` 필수 / `short_answer` → 문자열 또는 null / `answer === null` ⇔ `status === "needs_answer"`
- [ ] `source_file`·`source_no` 는 PRD §8.2 에 없는 신규 필드(F2) → PRD §8.2 예시에 추가
- [ ] `vault/items.ts`: `renderItem(item, {body, choices[], explanation?}) → string`(순수, `## 문제`/`## 선지`/`## 해설` 고정, 첨부는 `![[Attachments/<file>]]`), `writeItem(vaultRoot, …)` 은 `writeTextIfAbsent`(덮어쓰기 없음), `readItems(vaultRoot)` 은 읽기 경계에서 스키마 검증
- [ ] `paths.ts` 에 `attachmentsDir`·`reportsDir`·`youtubeDir`·`clippingsDir`·`examsDir` 중 **이 task 가 쓰는 것만** 추가
- [ ] 테스트: 정상 / mcq 범위 밖 answer / null answer ↔ status 불일치 / 미지 키 / render→parse round-trip / 본문에 `---`·표·`[[백링크]]` 포함(F18) / 기존 파일 미덮어쓰기

**추천 프롬프트**
```text
S2-T1: PRD §8.2 문항 frontmatter 를 scripts/src/schema/item.ts 에 zod(strict)로 만들고, scripts/src/vault/items.ts 에
문항 md 렌더(순수 함수)·쓰기(덮어쓰기 금지)·읽기(스키마 검증)를 만들어줘. answer null ⇔ needs_answer 를 스키마에서 강제하고,
source_file·source_no 필드를 추가한 뒤 PRD 예시도 맞춰. 테스트 먼저, 본문에 --- 가 있는 round-trip 포함.
```

**검증**: 공통 검증. 테스트 ≥ 7건 pass. `grep -rn "writeFile\|appendFile" kern/scripts/src` 가 `vault/` 안에만.

**커밋**: `feat(schema): 문항 frontmatter 스키마·문항 md IO`

---

## T2 — `vault/taxonomy.ts` + `ingest/convert.ts` + `kern ingest-items`

**체크리스트**
- [ ] `vault/taxonomy.ts`: `parseTaxonomy(text) → {subjectId, nodes[]}[]`(순수). `## <과목명> (<id>)` 헤더와 `[[...]]` 노드만 인식, 스켈레톤(노드 0)은 빈 배열
- [ ] `ingest/extraction.ts`: 추출 JSON zod 스키마(strict) — `{source_file, items:[{no, stage, subject, type, body, choices?, answer|null, explanation?, taxonomy[], has_figure, page}]}`. **`status`·`id` 키는 거부**(F1)
- [ ] `ingest/convert.ts`: `convertExtraction(extraction, exam, taxonomy, existingKeys) → {items, skipped, warnings}` 순수 함수. ID 는 `itemId()`, `status` 는 answer 유무로 결정, `source: "original"`, `source_ref` = `<source_file> <no>번`
- [ ] 거부 규칙(예외, 파일 0개 작성): 없는 `stage`/`subject`, `type` ≠ 과목 `handler`, 없는 taxonomy 노드(F9), 같은 extraction 안 `no` 중복
- [ ] 경고 규칙(작성은 함): `taxonomy: []`, `answer: null`
- [ ] 중복(Q4): `source_file`+`no` 가 기존 문항에 있으면 건너뛰고 목록 반환
- [ ] `kern ingest-items <extraction.json> [--vault dir]`: `args.ts` 유니온 확장(기존 테스트 유지), `commands/ingest-items.ts` 는 결과 객체 반환, 출력·exit code 는 `cli.ts`. 출력: 작성 n / 건너뜀 n / needs_answer n / 경고 목록
- [ ] `has_figure: true` 문항의 첨부 복사는 T4 에서 연결(여기서는 `attachments: []`)
- [ ] 테스트: 정상 3문항 / status 결정 2경로 / `status` 키 포함 JSON 거부 / 없는 과목·노드 거부 시 파일 0개 / 재실행 시 전부 건너뜀·기존 파일 불변 / 실제 프로세스 실행 1건

**추천 프롬프트**
```text
S2-T2: 추출 JSON → 문항 md 변환을 만들어줘. taxonomy.md 파서(순수), 추출 JSON zod 스키마(status·id 키 거부), 변환 순수 함수,
kern ingest-items <json> 서브커맨드. status 는 스크립트가 answer 유무로만 정해. 없는 과목·taxonomy 노드는 예외로 거부하고 파일을 하나도 쓰지 마.
같은 source_file+번호는 건너뛰고 목록을 출력해. 테스트 먼저, 기존 args 테스트는 그대로 통과해야 해.
```

**검증**: 공통 검증. 테스트 ≥ 8건 pass. scratchpad vault 에서 손으로 쓴 extraction JSON 으로 2회 실행 출력 인용(2회차 전부 건너뜀).

**커밋**: `feat(ingest): 추출 JSON → 문항 변환·ingest-items 서브커맨드`

---

## T3 — `ingest/frequency.ts` + `kern frequency`

**체크리스트**
- [ ] `aggregateFrequency(items, taxonomy) → {generated_from, total, by_subject, by_node}` 순수 함수. 대상은 `source: original` 만(P7: 기출 빈도). 단원 노드는 소단원 건수를 합산, 건수 0 노드도 0 으로 포함
- [ ] 출력에 시각(`Date.now`)을 넣지 않음(동일 입력 → 동일 출력). 키 순서는 taxonomy 순서
- [ ] `taxonomy: []` 문항은 `unclassified` 로 집계(숨기지 않음)
- [ ] `kern frequency [--vault dir]` → `05_Reports/frequency.json` 작성(파생 리포트라 덮어쓰기 허용, append-only 대상 아님을 주석에 명시)
- [ ] `ingest-items` 성공 뒤 자동 호출할지: 하지 않음. 스킬 절차에서 순서대로 호출(T6)
- [ ] 테스트: 단원별 건수 정확(불균등 분포 픽스처) / generated 제외 / unclassified / 빈 vault → total 0 / 2회 실행 동일 바이트

**추천 프롬프트**
```text
S2-T3: 05_Reports/frequency.json 집계를 만들어줘. source: original 문항만 taxonomy 노드별로 세는 순수 함수 + kern frequency 서브커맨드.
출력에 시각을 넣지 말고 같은 입력이면 같은 바이트가 나와야 해. 분류 없는 문항은 unclassified 로 드러내. 테스트 먼저.
```

**검증**: 공통 검증. 테스트 ≥ 5건 pass.

**커밋**: `feat(ingest): frequency.json 집계`

---

## T4 — `ingest/render.ts` + `kern render-pages` (쪽 분할·렌더·리사이즈·첨부)

**체크리스트**
- [ ] `splitPages(total, chunk) → [from,to][]`, `fitScale(width, height, max=1800) → scale` 순수 함수 + 테스트(경계: 0쪽 예외, 나머지 쪽, 이미 작은 이미지는 확대 안 함)
- [ ] `kern render-pages <source> [--pages a-b] [--vault dir]` → `.kern/pages/<source 파일명>/p001.png …`(재생성 가능 캐시). 출력: 쪽 수, 쪽별 경로·픽셀 크기, 권장 분할 범위 목록
- [ ] 입력 PNG/JPG: T0 결과에 따라 리사이즈 또는 원본 복사 + 크기 경고
- [ ] `kern attach-page <item-id 또는 hash8> <page.png>` 가 아니라, `ingest-items` 에 `--pages-dir` 를 추가해 `has_figure` 문항의 쪽 PNG 를 `03_Questions/Attachments/<hash8>.png` 로 복사하고 `attachments` 를 채움(명령 1개로 유지). 쪽 PNG 가 없으면 **오류**(깨진 링크를 만들지 않음)
- [ ] 암호화·손상 PDF, 없는 파일 → 한국어 오류 + exit 1
- [ ] 테스트: 순수 함수 + T0 스파이크 PDF(작은 1~2쪽 자작 픽스처를 `scripts/test/fixtures/` 에 커밋)로 실제 렌더 1건(PNG 시그니처·크기 ≤1800 확인) + 첨부 복사·링크 유효
- [ ] Git Bash·PowerShell 실제 실행 출력 인용

**추천 프롬프트**
```text
S2-T4: kern render-pages 를 만들어줘. T0 에서 승인한 라이브러리로 PDF 쪽을 긴 변 1800px 이하 PNG 로 .kern/pages/ 에 렌더하고,
쪽 범위 분할·배율 계산은 순수 함수로 분리해 테스트해. ingest-items 에 --pages-dir 를 붙여 has_figure 문항의 쪽 PNG 를
Attachments/<hash8>.png 로 복사하고, 쪽 PNG 가 없으면 오류로 처리해. 두 셸 실행 출력을 인용해.
```

**검증**: 공통 검증 + 두 셸 실행 출력 + 렌더 PNG 1장 Read 로 육안 확인.

**커밋**: `feat(ingest): render-pages·첨부 이미지 연결`

---

## T5 — `examples/sample-cert/sources/` 자작 기출 PDF·기대값

**체크리스트**
- [ ] `sources/exam-2025.html`(원본, Q2): 20문항(Q3) + 마지막 쪽 정답표. 상단 "자작" 명시, 가상의 과목·단원만, 실제 시험·법령·교재 연상 금지. 그림 1 + 표 1 이상(SVG/HTML 표, 외부 리소스 0)
- [ ] 단원 분포를 불균등하게 설계하고 표로 기록(frequency 기대값의 근거)
- [ ] headless 인쇄로 `sources/exam-2025.pdf` 생성 — 명령·브라우저 버전을 README 에 기록. PDF 에 임베드된 폰트 이름을 확인해 보고(F6)
- [ ] `sources/expected-items.json`(F8): 문항 번호 기준 정답·과목·유형·taxonomy·has_figure. `expected-frequency.json`
- [ ] 테스트(`sample-cert.test.ts` 확장): 기대값 20건, 정답 null 0, 모든 taxonomy 가 `taxonomy.md` 노드에 존재, mcq 정답이 1..4, `aggregateFrequency(기대 문항) === expected-frequency`
- [ ] `.gitattributes` 에 `*.pdf binary` 필요 여부 확인(`text=auto` 가 PDF 를 건드리지 않는지 `git check-attr` 출력 인용)
- [ ] `README.md` "현재 상태" 갱신(없는 것을 있다고 쓰지 않음)

**추천 프롬프트**
```text
S2-T5: examples/sample-cert/sources/ 에 자작 기출 원본 HTML(20문항: s1 객관식 10 + s2 단답 10, 정답표, 그림·표 문항 포함)을 만들고
브라우저 headless 인쇄로 PDF 를 생성해 커밋해줘. 완전히 가상의 내용만 쓰고 "자작"을 명시해. 단원 분포는 불균등하게.
expected-items.json·expected-frequency.json 을 만들고, 기대값이 taxonomy.md·exam.yaml 과 모순 없는지 테스트로 고정해. PDF 임베드 폰트 이름도 보고해.
```

**검증**: 공통 검증 + PDF 를 Read 로 열어 20문항·정답표 육안 확인 + `git status` 에 기출·vault 없음.

**커밋**: `feat(examples): sample-cert 자작 기출 PDF·기대값`

---

## T6 — `agents/item-extractor.md` + `skills/ingest/SKILL.md` + evals

**체크리스트**
- [ ] `item-extractor`: 입력 = 쪽 PNG 경로 목록(또는 Q1 에 따라 PDF+쪽 범위) + `exam.yaml` 과목 목록 + taxonomy 노드 목록. 출력 = T2 추출 JSON **만**. 규칙: 보이지 않는 글자를 추측해 채우지 않음 / 정답이 원문에 없으면 `answer: null`(풀어서 채우지 않음) / taxonomy 는 받은 목록에서만, 모르면 `[]` / `status`·`id` 를 쓰지 않음 / 문항이 쪽 경계에 걸치면 보고
- [ ] `SKILL.md`: `disable-model-invocation: true`, description 1~2문장 + 한국어 트리거("기출 넣기 / PDF 문제 추출 / 문제은행 만들기"), `argument-hint`. 절차 고정:
  1. `exam.yaml` 존재·`validate-exam` 통과 확인(아니면 `/kern:init-exam` 안내 후 중단) → 2. `01_Sources/Exams/` 에서 대상 확인 → 3. `kern render-pages` → 4. 권장 범위별 `kern:item-extractor` 병렬 위임(정답표 쪽은 모든 위임에 포함) → 5. 추출 JSON 병합·저장(`.kern/ingest/<source>.json`) → 6. `kern ingest-items --pages-dir` → 7. `kern frequency` → 8. 결과 보고 블록
- [ ] 고정 문구: `needs_answer` 안내, 중복 건너뜀 안내, 분류 불가 안내. 결과 블록 `## ingest 결과`(작성/건너뜀/needs_answer/unclassified/첨부/frequency)
- [ ] 런타임 §0 규칙 3종 삽입. `ingest-items` 가 거부하면 오류가 가리키는 항목만 고쳐 재시도(최대 3회), 검증을 통과시키려고 원문과 다른 값을 쓰지 않음
- [ ] 문항 제시가 있다면 `[기출]` 마크(이 스킬은 문항을 제시하지 않으면 해당 없음으로 명시)
- [ ] evals(`needs-bash`, fixture 는 `_fixtures/*.ts` + shim): `ingest-mini`(1쪽 3문항 + 정답 → 파일 3, null 0, 결과 블록, `render-pages → ingest-items → frequency` 순서) / `ingest-missing-answer`(정답표 없는 미니 → `needs_answer`, 정답을 지어내지 않음) / `ingest-no-exam`(exam.yaml 없음 → 중단 문구, Items 0)
- [ ] F13: `manual-eval.ts` 허용 범위로 도는지 확인, 모자라면 최소 수정(별도 커밋)
- [ ] F16: 라우터 스텁 문장 확인·필요 시 최소 수정 + `plugin-load` regex
- [ ] validate + `plugin details`(F15) 출력 인용

**추천 프롬프트**
```text
S2-T6: item-extractor 에이전트와 ingest 스킬을 만들어줘. frontmatter 는 공식 문서 기준(S1-T8 URL 재확인).
에이전트는 추출 JSON 만 내고 status·id 를 쓰지 못하게, 정답이 원문에 없으면 풀지 말고 null 로 두게 해.
스킬은 s2-plan.md T6 의 8단계 절차와 고정 문구·결과 블록을 넣고 ingest-items 거부 시 최대 3회 재시도.
evals 3건(미니 PDF)을 needs-bash 로 추가하고 npm run eval:manual 출력을 인용해. LLM judge 는 쓰지 마.
```

**검증**: validate `--strict`, always-on 토큰, `eval:manual` 3건 grader 결과·비용, `plugin eval --tag smoke` 출력.

**커밋**: `feat(skills): ingest 스킬·item-extractor 에이전트` / `test(evals): ingest 케이스 3건` (분리)

---

## T7 — youtube 노트 규격·렌더 + Web Clipper 파서 + 샘플

**체크리스트**
- [ ] F10: Obsidian Web Clipper 공식 문서·템플릿 저장소에서 YouTube 템플릿 형식 확인, URL 기록. 확인 못 한 부분은 🔴 로 남기고 최소 계약(frontmatter `url` + 본문 자막)만 구현
- [ ] `youtube/video-id.ts`: URL → video id 순수 함수(`watch?v=`·`youtu.be/`·`shorts/` 등 지원 형태는 테스트로 명시, 그 외는 예외)
- [ ] `schema/youtube-note.ts` + `youtube/note.ts`: 입력 JSON `{meta:{video_id,title,channel,duration,source_path}, concepts[], procedure_mermaid?, terms[], transcript?}` → frontmatter(PRD §7.3 6필드) + 고정 4절(`## 핵심 개념` / `## 절차` / `## 용어` / `## 원 자막`(접기)). `ingested_at` 은 인자로 주입(순수성), KST 오프셋 ISO
- [ ] 모르는 메타(`channel`·`duration`)는 `null` 허용 — 지어내지 않음. `terms` 백링크는 taxonomy 노드 또는 `02_Theory` 노트명만(T2 파서 재사용), 그 외는 일반 텍스트
- [ ] `youtube/clipper.ts`: Web Clipper 노트 → `{meta, transcript}`. 마커·키는 상수화(roadmap §3). 자막 없음 → "요약 불가" 예외
- [ ] `kern youtube-note <json> [--vault dir]` → `01_Sources/YouTube/<id>.md`(기존 파일 미덮어쓰기), `kern parse-clipping <path>` → JSON stdout
- [ ] `examples/sample-cert/sources/clipper-sample.md`(자작, 가상 채널·가상 video id, 실제 영상 아님 명시)
- [ ] 테스트: video-id 형태별 / 렌더 문자열 고정 / 메타 null / 자막 없음 예외 / 샘플 파싱

**추천 프롬프트**
```text
S2-T7: youtube 노트 규격을 결정적으로 만들어줘. Web Clipper YouTube 템플릿 형식은 공식 문서로 먼저 확인하고 URL 을 남겨(못 찾으면 지어내지 말고 보고).
video id 추출·노트 렌더(ingested_at 주입)·Clipper 파서를 순수 함수로, kern youtube-note / parse-clipping 서브커맨드 추가.
모르는 메타는 null, 자막 없으면 예외. 자작 샘플 1개와 문자열 고정 테스트 포함.
```

**검증**: 공통 검증. 테스트 ≥ 8건 pass. 샘플 → 노트 생성 실행 출력 인용.

**커밋**: `feat(youtube): 노트 규격·Web Clipper 파서`

---

## T8 — NotebookLM 정규화 + `yt-dlp` 래퍼 + `skills/youtube/SKILL.md` + evals

**체크리스트**
- [ ] F10: NotebookLM 내보내기/복사 형식 확인(공식 문서). 정규화 범위를 최소로: 인용 마커 제거·빈 줄 정리·frontmatter `url` 추출. 확인 못 한 패턴은 넣지 않음
- [ ] `youtube/notebooklm.ts` 순수 함수 + `examples/sample-cert/sources/notebooklm-sample.md`(자작) + 테스트
- [ ] `youtube/ytdlp.ts`: `exam.yaml: youtube.direct_fetch` 가 `false` 면 실행 거부(고정 문구). `true` 면 `yt-dlp --version` 으로 설치 확인 → 없으면 ②③ 폴백 안내(고정 문구, exit 1). 옵션은 `yt-dlp --help`/공식 README 로 확인(기억 금지), 인자는 배열로 전달(셸 미경유). 자막 없음 → "요약 불가"
- [ ] 래퍼 테스트는 실행기 주입(mock): 미설치 / 비활성 / 자막 없음 / 성공. 실제 `yt-dlp` 실행은 **로컬 1회 수동**(설치돼 있을 때만, 없으면 "미실행"으로 보고)
- [ ] `SKILL.md`: `disable-model-invocation: true`, 한국어 트리거("강의 요약 / 유튜브 정리 / 자막 노트"). 절차: 입력 판별(Clippings 파일 ②/③, URL ①) → 파서 CLI → 요약 JSON 작성(자막·요약 **안의 내용만**, 없는 내용 보강 금지) → `kern youtube-note` → 결과 블록. URL 없음(Q5)·자막 없음·① 비활성 고정 문구
- [ ] 런타임 §0 규칙 3종 삽입
- [ ] evals(`needs-bash`): `youtube-clipper`(③ → 규격 노트 존재, 4절 헤더 regex) / `youtube-notebooklm`(② → 같은 규격) / `youtube-direct-disabled`(URL + `direct_fetch: false` → 거부 문구, 노트 미작성)
- [ ] validate + `plugin details` 출력 인용

**추천 프롬프트**
```text
S2-T8: NotebookLM 정규화(최소 범위, 형식은 공식 문서 확인), yt-dlp 래퍼(direct_fetch false 면 거부, 미설치면 ②③ 폴백 안내, 옵션은 --help 로 확인),
youtube 스킬을 만들어줘. 래퍼 테스트는 실행기 주입으로 mock. 스킬은 자막·요약에 없는 내용을 보강하지 못하게 막고
노트는 반드시 kern youtube-note 로만 쓰게 해. evals 3건을 needs-bash 로 추가하고 eval:manual 출력을 인용해.
```

**검증**: 공통 검증, `eval:manual` 3건, ②③ 산출 노트의 frontmatter 키·절 헤더가 동일함을 diff 로 인용, always-on 토큰.

**커밋**: `feat(youtube): NotebookLM 정규화·yt-dlp 래퍼` / `feat(skills): youtube 스킬` / `test(evals): youtube 케이스 3건`

---

## T9 — S2 종합 검증·실측 기록

**체크리스트**
- [ ] DoD 명령 전부 실행, 출력 인용, 통과/실패 표
- [ ] **20문항 전체 수동 실행**(scratchpad vault + `exam-2025.pdf`): 문항 파일 20, `answer: null` 0, 전부 `status: verified`, `expected-items.json` 과 번호 기준 `deepStrictEqual`(정답·과목·유형·taxonomy), 모든 `![[...]]` 대상 파일 존재, `frequency.json === expected-frequency.json`. 2회 실행해 편차 기록(재실행 시 전부 건너뜀도 확인)
- [ ] roadmap S2 DoD 4항목 증거 표(테스트명·eval 케이스·수동 출력)
- [ ] 경로 ① 수동 확인 결과(또는 "미실행: yt-dlp 미설치")
- [ ] always-on 토큰·LLM 비용·세션 수를 roadmap S2 "실측"에 기록. 세션 수는 **task 마다 시작·종료 시각을 이 문서에 적어** 이번엔 🔴 로 남기지 않음
- [ ] CLAUDE.md §8 갱신(PDF 렌더, F4 서브에이전트 PDF 읽기, F10 형식 확인 결과), §2 "외부 바이너리" 표에 변화 있으면 반영
- [ ] 미완료·🔴 는 숨기지 않고 "조건부 완료"로 보고(하네스 evals 미실행은 S1 과 동일하게 남음)

**DoD 검증 명령**
```bash
cd kern && npm ci && npm run typecheck && npm test
"$CLAUDE" plugin validate ./kern --strict
"$CLAUDE" plugin details kern
"$CLAUDE" plugin eval ./kern --tag smoke --trust-plugin --no-publish
cd kern && for c in ingest-mini ingest-missing-answer ingest-no-exam youtube-clipper youtube-notebooklm youtube-direct-disabled; do npm run eval:manual -- evals/$c; done
git status --short
```

**추천 프롬프트**
```text
S2-T9: s2-plan.md 의 DoD 명령을 전부 실제로 실행해 출력을 인용하고, sample-cert 기출 PDF 20문항 전체 ingest 를 scratchpad vault 에서 2회 돌려
expected-items.json·expected-frequency.json 과 비교한 결과를 보여줘. roadmap S2 DoD 4항목별 증거 표를 만들고,
실패는 원인 추정에 🟡 를 붙이고 테스트·기대값을 약화하지 마. 그 뒤 roadmap 실측과 CLAUDE.md §8 을 갱신해.
```

**커밋**: `docs(roadmap): S2 실측 반영`

---

## 2. 전체 진행 체크

- [ ] T0 결정·렌더 스파이크·의존성
- [ ] T1 문항 스키마·md IO
- [ ] T2 taxonomy 파서·ingest-items
- [ ] T3 frequency
- [ ] T4 render-pages·첨부
- [ ] T5 자작 기출 PDF·기대값
- [ ] T6 ingest 스킬·에이전트·evals
- [ ] T7 youtube 규격·Clipper 파서
- [ ] T8 NotebookLM·yt-dlp·youtube 스킬·evals
- [ ] T9 종합 검증

## 3. 반대 관점·반례

- **youtube 를 S2 에서 빼는 안**: S3(generate)가 필요로 하는 것은 T1~T6 의 문항 규격뿐이다. T7·T8 은 MVP 학습 루프(S3~S5)의 어떤 DoD 에도 입력으로 쓰이지 않는다. roadmap §5 의 절충(규격+최소 파서만)을 더 밀어 T7·T8 을 S5 뒤로 옮기면 MVP 가 빨라진다. roadmap 순서를 따르느라 남겼다(Q7).
- **PNG 렌더 자체가 불필요할 수 있다**: Read 도구가 PDF 를 직접 읽으면(F4) 렌더는 첨부 이미지 용도로만 남는다. 네이티브 canvas 의존성은 캐시 설치(`npm ci`)·플랫폼별 바이너리 위험을 새로 들인다. 스파이크가 나쁘면 "추출은 PDF 직접, 첨부는 v1 에서 쪽 번호 텍스트 참조만"으로 줄이는 안이 있으나 DoD "이미지 링크 유효"를 고쳐야 한다.
- **`answer ≠ null → verified` 는 약한 검증이다**: 비전이 정답표를 잘못 읽어도 `verified` 가 된다. 스크립트는 "정답이 있다"만 보장한다. 더 엄격하게는 ingest 직후 `needs_review` 상태를 두고 학습자가 확인하게 할 수 있으나 PRD §8.2 상태 집합·DoD 와 충돌한다. 최소 보완: 결과 블록에 "정답표 대조 권장" 문구.
- **미니 PDF eval 은 DoD 를 잠그지 못한다**: 20문항 전체는 수동 1~2회뿐이라 회귀가 나도 모른다. 비용을 감수하고 전체 케이스를 `needs-bash` eval 로도 두는 선택지가 있다.
- **쪽 전체 첨부(F5)**: 한 쪽에 문항이 5개면 첨부가 다른 문항의 본문·정답 단서를 노출한다. 모의고사(S4)에서 문제가 되면 크롭이 필요해진다.
- **T2 가 크다**: taxonomy 파서·추출 스키마·변환·CLI 를 한 task 에 넣었다. 한 세션에 안 끝나면 `vault/taxonomy.ts` 를 T2a 로 떼어 먼저 커밋한다.
