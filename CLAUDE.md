# CLAUDE.md — kern 개발 저장소 지침

이 파일은 **kern 을 개발하는 Claude Code 세션**이 읽는다. 런타임(학습자가 플러그인을 쓸 때)의 지침은 각 `skills/*/SKILL.md` 와 `agents/*.md` 에 두며, 이 파일은 그쪽에 로드되지 않는다.

기준 문서: `docs/prd.md` (무엇을), `docs/roadmap.md` (어떤 순서로). 이 파일과 충돌하면 이 파일이 우선하고, 충돌을 발견하면 먼저 보고한다.

---

## 0. 최우선 규칙 — 환각·거짓 보고 금지

kern 은 시험 학습 도구다. 틀린 사실·조작된 결과는 사용자의 시험을 망친다. 아래는 다른 모든 규칙보다 우선한다.

1. **모르면 "모름"이라고 쓴다.** 추측을 사실처럼 쓰지 않는다. 확신이 없으면 문장 앞에 `🟡 추정` 또는 `🔴 미확인` 을 붙인다. 확인된 사실은 `🔵`.
2. **실행하지 않은 것을 실행했다고 쓰지 않는다.** "테스트 통과", "빌드 성공", "validate 통과"는 실제 명령 출력을 인용할 때만 쓴다. 출력이 없으면 "실행하지 않음"이라고 쓴다.
3. **읽지 않은 파일의 내용을 말하지 않는다.** 파일·함수·설정의 존재나 내용을 주장하기 전에 반드시 읽는다.
4. **라이브러리 버전·API 시그니처·CLI 옵션은 기억으로 쓰지 않는다.** `npm view <pkg> version`, 공식 문서, `--help` 출력으로 확인한 뒤 사용하고, 확인 출처를 커밋 메시지나 코드 주석에 남긴다.
5. **시험 내용(출제기준·법령·통계·정답)은 vault 원문 또는 명시된 출처 없이 생성하지 않는다.** 런타임 프롬프트(SKILL/agent)를 작성할 때도 이 규칙을 그대로 심는다: 근거 노트 `[[백링크]]` 없는 문항 생성 금지, 출처 없는 출제기준은 `verified: false`.
6. **LLM 은 채점하지 않는다.** 채점 결과는 `scripts/src/graders/` 출력만이다. 에이전트가 채점 결과를 "정정"하거나 `status: verified` 를 직접 쓰는 코드·프롬프트는 작성하지 않는다. `verified` 는 `verify` 스크립트만 기록한다.
7. **실패를 숨기지 않는다.** 조용히 실패하는 코드(`catch {}`, 빈 폴백) 금지. 실패는 로그와 반환값으로 드러낸다.
8. **동의·칭찬으로 시작하지 않는다.** 사용자의 지시가 틀렸거나 위험하면 먼저 지적하고 대안을 제시한다.

---

## 1. 프로젝트 한 줄 요약

시험 불가지론적 Claude Code 플러그인. 시험 프로파일(`exam.yaml`)·분류체계·문제은행·모의고사·FSRS 복습·약점 지도·튜터 모드를 로컬 마크다운 vault 에 구축한다. Obsidian 은 뷰어. 특정 시험을 코드에 넣지 않는다.

---

## 2. 개발 환경 (Windows 11)

| 항목 | 값 |
|---|---|
| OS | Windows 11. Claude Code 는 **Git Bash** 에서 실행 (Git for Windows 설치 전제) |
| 런타임 | Node ≥ 22.18, npm. Python 없음. **빌드 없음**: `.ts` 를 Node type stripping 으로 직접 실행 (`docs/decisions/0001-dist-distribution.md`). 제약: enum·runtime namespace·parameter property·decorator 금지, import 는 `.ts` 확장자 필수, 타입은 `import type`. `tsc` 는 타입 검사 전용 |
| `claude` 실행 파일 | 별도 CLI 설치 없음. 데스크톱 앱 번들 사용: `$APPDATA/Claude/claude-code/<version>/claude.exe` (PATH 에 없음, 앱 업데이트 시 `<version>` 변경). 이 문서의 `claude ...` 명령은 해당 절대경로로 실행. 이 경로는 MSIX 가상화라 **앱 세션 안에서만** 보임. 사용자 터미널에서는 `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude-code\<version>\claude.exe` 이고 온보딩·로그인이 따로 필요. Git Bash 에서 `-p "/skill"` 은 MSYS 경로 변환으로 깨지므로 PowerShell 사용 |
| 언어 | TypeScript strict, ESM (`"type": "module"`) |
| 테스트 | `node:test` 우선. 부족하면 vitest (도입 시 이 표 갱신) |
| 경로 | 코드·설정·플러그인 컴포넌트 경로는 항상 `/`. 백슬래시 금지 (Windows 에서만 로드되는 컴포넌트가 됨) |
| 줄바꿈 | `.gitattributes: * text=auto eol=lf`. CRLF 커밋 금지 |
| 셸 스크립트 | **작성 금지.** 훅·CLI·자동화는 전부 `node scripts/src/*.ts`. `bin/kern`(bash shim)과 `bin/kern.cmd` 는 `node` 호출 한 줄만. 예외(2026-09-21 사용자 승인): evals 의 `scaffold_script` 는 하네스가 Bash 만 받으므로 `evals/<case>/fixture.sh` 에 `node` 호출 한 줄 shim 허용, 로직은 `evals/_fixtures/*.ts` |
| 외부 바이너리 | `yt-dlp`(opt-in)만 허용. PDF 렌더는 Node 라이브러리 우선 검토 |

세션 시작 시 `node --version`, `npm --version`, `claude --version` 을 실제로 실행해 기록한다. `claude` 는 번들 디렉토리에서 가장 높은 버전 폴더를 찾아 실행한다.

---

## 3. 저장소 구조

```text
kern-dev/                    ← 이 저장소 (공개, MIT)
├── CLAUDE.md                 ← 이 파일
├── docs/                     ← prd.md, roadmap.md, decisions/
├── kern/                    ← 플러그인 루트 (--plugin-dir 대상)
│   ├── .claude-plugin/plugin.json
│   ├── skills/<name>/SKILL.md
│   ├── agents/<name>.md
│   ├── hooks/hooks.json
│   ├── bin/kern, bin/kern.cmd
│   ├── package.json, package-lock.json, tsconfig.json  ← 플러그인 루트 필수 (캐시 설치 시 `npm ci` 대상)
│   ├── scripts/              ← TS 소스 (src/, test/). dist 없음
│   └── evals/
├── examples/
│   ├── sample-cert/          ← 자작 샘플 시험 (객관식+단답)
│   └── sample-essay/         ← 자작 샘플 시험 (논술 포함, S7)
└── .gitignore                ← *-vault/, .kern/, node_modules/, dist/
```

**절대 커밋 금지**: `*-vault/`, 실제 시험 기출·교재·강의 자막, `.env`, API 키, `dist/`. 커밋 전 `git status` 로 확인하고 출력을 인용한다.

---

## 4. 작업 단위와 커밋

- **task 단위**: `docs/roadmap.md` 의 산출물 항목 1개 이하. 한 task 는 한 세션 안에 끝나야 한다.
- **task 완료 정의**: (1) 코드 (2) 단위 테스트 통과 출력 (3) `claude plugin validate ./kern --strict` 통과 출력 (4) 관련 evals 통과 출력 (5) 커밋. 하나라도 빠지면 "미완료"로 보고.
- **커밋**: 매 task 완료 즉시. 형식은 Conventional Commits:
  ```
  feat(graders): mcq 정규화 비교 구현
  test(graders): 경계 케이스 12개 추가
  docs(roadmap): S0 실측 세션 수 반영
  ```
  본문에 확인한 출처(버전 확인 명령, 문서 URL)를 남긴다.
- **커밋 전 체크리스트**를 매번 출력한다: 테스트 출력 / validate 출력 / `git status` / vault·기출 포함 여부.
- 작업 시작 전 **간략 계획**(무엇을·어느 파일·어떻게 검증)을 3~5줄로 먼저 쓰고 진행한다. 모호하면 진행하지 말고 질문한다(최대 5개, 이유와 추천 포함).

---

## 5. 코드 규칙

- 결정적 로직(채점·정규화·FSRS 매핑·추출·집계·phase)은 **순수 함수**로 작성하고 반드시 단위 테스트를 붙인다. 동일 입력 → 동일 출력.
- 스키마는 `zod` 로 정의하고 파일 읽기 경계에서 반드시 검증한다. 검증 실패는 예외로 던진다.
- 파일 쓰기는 `scripts/src/vault/` 경유. 직접 `fs.writeFile` 산재 금지.
- `attempts.jsonl`, `weakmap/` 은 append-only. 덮어쓰는 코드 금지.
- 문항 `status` 전이는 스크립트만 수행: `draft → verified|rejected`, `needs_answer → verified`. 에이전트는 상태를 제안만 한다.
- 로그·에러 메시지는 한국어, 키·ID·경로는 영문.
- 의존성 추가 시: `npm view <pkg> version license` 출력 인용 → GPL/AGPL/LGPL 이면 추가 금지 → `package-lock.json` 갱신 커밋.
- 금지: Python, React/SPA, Express 등 서버 프레임워크(`kern serve` 는 `node:http` 만), 특정 시험명 하드코딩, `any` 남용, 조용한 폴백.

---

## 6. 스킬·에이전트 작성 규칙

- 위치: `kern/skills/<name>/SKILL.md`. `commands/` 는 legacy 이므로 쓰지 않는다.
- `description` 은 1~2문장, **한국어 트리거 문구 포함** (예: drill → "문제 내줘 / 틀린 거 다시 / 반복 연습 / 약한 단원").
- 자동 호출 금지 목록에 `disable-model-invocation: true`: `init-exam`, `ingest`, `youtube`, `generate`, `serve`. 나머지는 허용.
- 모든 SKILL/agent 프롬프트에 §0 의 1·5·6 규칙을 런타임 버전으로 삽입한다(예: "근거 노트 없이 문항을 만들지 마라", "채점 결과를 바꾸지 마라", "모르면 모른다고 답하라").
- 출력 형식은 SKILL.md 에 고정하고 `evals/` 케이스로 잠근다. 문항 제시에는 항상 `[기출]/[예상]/[업로드]` 마크.
- 사용자 대면 출력은 한국어. 구조 토큰(커맨드명·키·ID·경로)은 영문.
- 라우터 `/kern` 은 추천 1개 → 사용자 확인 → 실행. 확인 없이 실행하는 프롬프트 금지.
- `drill` 은 2회 오답 전 정답 공개 금지. 판정은 프롬프트가 아니라 `kern drill-state` 스크립트 결과에 따른다.

---

## 7. 검증 명령

```bash
cd kern && npm test
claude plugin validate ./kern --strict
claude --plugin-dir ./kern            # 수동 로드 확인
claude plugin details kern            # always-on 토큰 확인, 증가 시 보고
claude plugin eval ./kern --tag smoke --no-publish   # Windows 에서 돌릴 수 있는 evals (v2.1.269+). 리포트 claude.ai 게시 생략(기본값은 게시)
                                         # 첫 실행 신뢰 확인으로 막히면 --trust-plugin 추가 (이 저장소 한정)
# needs-bash 태그 케이스(init-exam-*)는 native Windows 에서 실행 불가(§8). 샌드박스 백엔드가 있는 WSL2/Linux/macOS 에서:
claude plugin eval ./kern --tag needs-bash --scaffold --allow-tools Write Edit "Bash(node *)" "Bash(cp *)" --no-publish
# Windows 에서는 같은 fixture(evals/_fixtures/seed-criteria.ts)로 scratchpad vault 를 만들어 PowerShell `claude -p "/kern:init-exam"` 수동 실행 후 grader 정규식을 적용해 확인
```

명령이 실패하면 출력 전체를 인용하고 원인 추정에 `🟡` 를 붙인다. 실패를 우회하기 위해 테스트를 약화하거나 삭제하지 않는다.

---

## 8. 사실 확인이 필요한 항목 (현재 🟡/🔴)

| 항목 | 상태 | 확인 방법 |
|---|---|---|
| Claude Code Windows PowerShell 폴백(v2.1.120+) | 🟡 문서 미반영 | 공식 setup 문서 재확인. 그 전까지 Git Bash 전제 |
| `ts-fsrs` 최신 안정 버전 | 🔴 미확인 | S5 착수 시 `npm view ts-fsrs version` |
| Node 순수 PDF 렌더 라이브러리 선택 | 🔴 미정 | S2 착수 시 후보 비교, 라이선스 확인 |
| `claude plugin eval` 사용 가능 여부 | 🔵 사용 가능 (2026-09-21, 앱 번들 `claude.exe` 2.1.275 의 `plugin --help` 출력에 `eval`·`validate`·`details` 확인). 케이스 형식 🔵 (2026-09-21, S0-T7): `prompt.md`(frontmatter + 자연어 프롬프트) + `graders/*.md`. grader type 은 결정적 `regex`·`tool_used`·`tool_order`·`file_exists`, judge 호출 `llm`·`baseline`. 기본 ablation(with-without)에서 `tool_used: Skill` 은 점수 미반영 지표. `evals/plugin-load` 실행 통과 확인 | 출처: `claude plugin eval --help`, `init --bare` 템플릿, https://code.claude.com/docs/en/plugin-evals . 실행은 `claude plugin eval ./kern --trust-plugin --no-publish` |
| native Windows 에서 Bash 를 쓰는 evals | 🔵 실행 불가 (2026-09-21, S1-T9 실측, `claude.exe` 2.1.275). `--allow-tools Bash(...)` → run 거부: `sandbox required but unavailable: ... the Windows sandbox is not active on this session (feature gate off)`. `--scaffold` → `scaffold failed (exit 127)`: 하네스가 `fixture.sh` 경로를 백슬래시째 `/bin/bash` 에 넘김. 그 외 🔵: `regex` grader 의 `target: { source: file, path }` 로 생성 파일 내용 검사 가능, eval 프롬프트의 `/kern:<skill>` 로 `disable-model-invocation` 스킬 호출 가능 | 출처: https://code.claude.com/docs/en/plugin-evals ("Native Windows has no backend, so run shell-granting suites under WSL2") + 실측. 앱 업데이트 뒤 재확인 |
| 앱 세션에서 로컬 플러그인 수동 로드(`--plugin-dir`) 방법 | 🔵 CLI 로드 확인 (2026-09-21, 번들 `claude.exe` 2.1.275 `--plugin-dir ./kern plugin details kern` 출력에 `kern 0.0.1`, `Source: kern@inline`). 인터랙티브·앱 세션 로드는 🔴 미실행 | 인터랙티브는 터미널에서 `claude.exe --plugin-dir ./kern` 실행 후 `/plugin` 으로 확인 |
| Agent SDK 과금·약관(풀 GUI 검토용) | 🟡 | S8 이후, 착수 전 문서 확인 |

새 항목이 생기면 이 표에 추가하고, 확인되면 상태를 `🔵` 로 바꾸고 출처를 적는다.

---

## 9. 응답 스타일 (개발 세션)

- 한국어. 길이는 복잡도에 비례. 단순 확인은 1~3문장.
- 코드·명령·경로·에러는 코드 블록.
- 의사결정·기술 선택·단정적 주장을 포함하면 응답 끝에 `## 반대 관점·반례` 를 붙인다.
- 응답 끝에 다음 행동을 정하는 질문 최대 3개(단순 보고에는 생략).
- 사용자의 판단이 틀렸다고 보이면 먼저 지적한다. 동의로 시작하지 않는다.
