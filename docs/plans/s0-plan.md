# S0 — 뼈대·툴체인 실행 계획서

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-21 (KST) |
| 기준 | `docs/roadmap.md` §2 S0, `CLAUDE.md` §2~§7 |
| 범례 | 🔵 확인됨 / 🟡 추정 / 🔴 미확인 |

## 0. 검토 결과 (착수 전 알아야 할 것)

| # | 발견 | 상태 | 조치 |
|---|---|---|---|
| F1 | `node`, `npm`, `claude` 가 Git Bash·PowerShell 양쪽 PATH 에 없음. `C:\Program Files\nodejs`, nvm, fnm, Volta 경로도 없음 | 🔵 2026-09-21 실행 확인 (`command not found` / `없음`) → **해소**: 🔵 2026-09-21 재확인, 양쪽 셸에서 `node` v24.19.0 / `npm` 11.17.0 출력 (앱 세션 도구 셸 기준). `claude` 는 여전히 PATH 에 없음(D5) | ~~T0 선행 필수. Node 만 사용자가 설치.~~ T0 완료. `claude` 는 앱 번들 `$APPDATA/Claude/claude-code/2.1.275/claude.exe` 사용(🔵 `--version`·`plugin --help` 실행 확인, D5) |
| F2 | `.gitignore`, `.gitattributes`, `CLAUDE.md` 는 이미 존재하고 S0 요구를 충족 | 🔵 파일 읽음 | 해당 산출물은 T1 에서 제외 |
| F3 | `dist/` 가 gitignore 인데 `bin/kern`·훅이 `scripts/dist/*.js` 를 호출 → git 으로 설치한 플러그인에는 `dist` 가 없음 | 🔵 구조상 사실 / 해결책 🔴 | S0 은 `--plugin-dir` 로컬 빌드 전제로 진행. 배포 방식은 T9 에서 `docs/decisions/` 에 미결로 기록 |
| F4 | `plugin.json` 필드, `hooks.json` 스키마, `evals/` 케이스 상세 형식 (`claude plugin eval` 자체는 🔵 사용 가능, help 상 `case.yaml` 또는 `prompt.md + graders/*.md`) | 🔴 기억으로 작성 금지 (CLAUDE.md §0-4) | 각 task 첫 단계에서 공식 문서·`--help` 확인 후 출처를 커밋 본문에 기록 |
| F5 | TS 를 `node:test` 로 돌리는 방법 (빌드 후 `node --test dist/` vs type stripping) | 🟡 | T3 에서 설치된 Node 버전 기준으로 결정. 기본안: `tsc` 빌드 후 `node --test` (추가 의존성 0) |
| F6 | "`skills/` 빈 디렉토리" 는 git 이 추적하지 못함 | 🔵 | 라우터 스텁(T5)이 들어가므로 별도 조치 불필요 |
| F7 | PRD §8.1 예시 `exam.yaml` 에는 `2nd` 논술 stage 가 있으나 `sample-cert` 는 객관식+단답만 | 🔵 PRD §10 | T8 초안에서 `2nd` stage 제외 (논술은 S7 `sample-essay`) |
| F8 | `typescript`, `@types/node` devDependency 추가 필요 | 🟡 | T3 에서 `npm view` 출력 인용 + 사용자 승인 후 설치 |

## 0.1 확정된 결정 (2026-09-21 사용자 확인)

| # | 결정 | 영향 |
|---|---|---|
| D1 | Node 는 **winget LTS** 로 사용자가 설치 | T0 |
| D2 | `dist` 배포 방식(F3)은 **S0 안에서 조사 후 결정** | T1b 신설, T9 의 미결 기록 항목 대체 |
| D3 | `claude plugin eval` 불가 시 T7 **보류 + S0 조건부 완료**, S1 진행 | T7, T9 |
| D4 | task 는 묶지 않고 유지, 계획서 즉시 커밋 | — |
| D5 | Claude Code CLI 는 **별도 설치하지 않음**. 앱 번들 `claude.exe` 를 절대경로로 호출(PATH 에 없음, 앱 업데이트 시 버전 폴더 변경) | T0, 모든 `claude ...` 검증 명령 |

**`claude` 호출 방법 (이하 모든 task 의 `claude ...` 는 이 방식으로 실행)**
```bash
CLAUDE="$(ls -d "$APPDATA"/Claude/claude-code/*/ | sort -V | tail -1)claude.exe"
"$CLAUDE" --version
```

## 1. Task 목록과 의존 관계

```text
T0 환경 ─┬─ T1 저장소 위생 (README·.editorconfig)
         ├─ T1b dist 배포 방식 조사·결정 (T2·T4·T6 경로에 선행)
         ├─ T2 plugin.json ──┬─ T5 라우터 스텁
         │                   ├─ T6 SessionStart 훅 스텁 (T4 필요)
         │                   └─ T7 evals 1건 (T5 필요)
         ├─ T3 scripts TS 프로젝트 ── T4 CLI·bin shim
         └─ T8 sample-cert 초안 (독립)
T9 S0 종합 검증·실측 기록 (전부 완료 후)
```

모든 task 공통 완료 정의(CLAUDE.md §4): 코드 → 테스트 출력 → validate 출력 → evals 출력(해당 시) → 커밋. 출력 인용이 없으면 "미완료".
T2 이전에는 validate 대상이 없으므로 T1 은 validate 를 "해당 없음"으로 보고한다.

---

## T0 — 개발 환경 준비 (사용자 수행 + 확인)

**목표**: Git Bash·PowerShell 양쪽에서 `node`(≥20), `npm` 실행 가능 + 앱 번들 `claude.exe` 호출 확인.

**체크리스트**
- [x] Node LTS 를 winget 으로 설치 (사용자). 설치 후 **앱 재시작**(새 PATH 반영) — 설치 결과는 🔵(아래 출력), 설치 경로가 winget 인지는 🟡 미검증
- [x] Git Bash 에서 `node --version; npm --version` 출력 기록 → `v24.19.0` / `11.17.0` (2026-09-21)
- [x] PowerShell 에서 동일 명령 출력 기록 → `v24.19.0` / `11.17.0` (2026-09-21)
- [x] 위 "`claude` 호출 방법" 스니펫으로 번들 `claude.exe --version` 출력 기록 → `2.1.275 (Claude Code)` (2026-09-21, Git Bash)
- [x] `claude plugin --help` 에 `validate`, `details`, `eval` 존재 확인 → CLAUDE.md §8 갱신 (2026-09-21 완료, 2.1.275)

**추천 프롬프트**
```text
T0 확인: Git Bash 와 PowerShell 각각에서 node/npm --version 을, 그리고 s0-plan.md 의 호출 방법으로 번들 claude.exe --version 을
실행해 출력을 그대로 인용해줘. 설치는 하지 마.
```

**검증**: 두 셸 모두 node·npm 버전 출력, Node major ≥ 20. 번들 `claude.exe` 버전 출력. 실패 시 PATH 문제인지 미설치인지 구분해 보고.

**커밋**: `docs(claude): 툴체인 버전 기록` (CLAUDE.md 에 기록할 변경이 있을 때만)

---

## T1 — 저장소 위생: `README.md`, `.editorconfig`

**체크리스트**
- [x] `.editorconfig` (utf-8, lf, 2 spaces, final newline) — `.gitattributes` 와 모순 없는지 확인 (둘 다 lf)
- [x] `README.md`: 한 줄 정의, 현재 상태(S0), 요구 환경, 개발 명령(CLAUDE.md §7), 라이선스 MIT. **미구현 기능을 구현된 것처럼 쓰지 않는다**
- [x] `LICENSE`(MIT) 유무 확인 → 없으면 추가 여부를 사용자에게 질문 (🔵 2026-09-21 없음 확인 → 사용자 승인으로 추가, `Copyright (c) 2026 moonisica`)
- [x] `git status` 인용 후 커밋

**추천 프롬프트**
```text
S0-T1: docs/plans/s0-plan.md 의 T1 을 수행해줘. README 는 prd.md §1 과 roadmap 을 근거로 쓰고,
아직 없는 기능은 "예정"으로 표기해. 끝나면 커밋 전 체크리스트를 출력해.
```

**검증**: `git ls-files --eol README.md .editorconfig` 가 `i/lf` 표시. validate·테스트는 해당 없음(명시).

**커밋**: `chore(repo): README·editorconfig 추가`

---

## T1b — `dist` 배포 방식 조사·결정 (D2)

**목표**: git 으로 설치된 플러그인에서 `scripts/dist/*.js` 가 존재하도록 하는 방식을 문서 근거로 결정.

**체크리스트**
- [ ] 공식 플러그인 문서에서 설치 시 동작 확인: 의존성 설치·빌드 단계 유무, lockfile 요구(roadmap S0 의 "플러그인 캐시 설치가 npm lockfile 을 요구" 🟡 주장 검증), URL 기록
- [ ] 후보 비교: (a) 설치 시 빌드 (b) `dist` 커밋 — CLAUDE.md §3 커밋 금지 목록 수정 필요 (c) 릴리스 브랜치/태그에만 `dist` 포함 (d) 빌드 없이 실행 가능한 형태
- [ ] 추천안 1개 + 근거를 `docs/decisions/0001-dist-distribution.md` 에 기록, 문서로 확인 안 된 부분은 🔴 유지
- [ ] 사용자 승인 후 확정. CLAUDE.md·`.gitignore` 수정이 필요하면 별도 커밋

**추천 프롬프트**
```text
S0-T1b: 플러그인을 git 으로 설치했을 때 scripts/dist 가 없어지는 문제의 해결 방식을 조사해줘.
공식 문서만 근거로 쓰고 URL 을 남겨. 후보 비교표와 추천안 1개를 docs/decisions/0001-dist-distribution.md 로 작성하고,
코드·gitignore 는 내 승인 전에 건드리지 마.
```

**검증**: 결정 문서에 출처 URL 과 🔵/🟡/🔴 표기 존재. 코드 변경 없음(`git status` 인용).

**커밋**: `docs(decisions): dist 배포 방식 결정`

---

## T2 — `kern/.claude-plugin/plugin.json`

**체크리스트**
- [ ] 공식 플러그인 문서에서 manifest 필수/선택 필드 확인 (URL 기록) 🔴→🔵
- [ ] `plugin.json` 작성: `name: kern`, `version: 0.0.1`(🟡 제안), `description`, `license: MIT`
- [ ] 경로 값은 전부 `/`
- [ ] `claude plugin validate ./kern --strict` 출력 인용
- [ ] `claude --plugin-dir ./kern` 로드 오류 0 확인

**추천 프롬프트**
```text
S0-T2: plugin.json 을 만들어줘. 먼저 공식 문서로 manifest 스키마를 확인하고 출처 URL 을 알려줘.
기억으로 필드를 쓰지 마. 작성 후 `claude plugin validate ./kern --strict` 출력을 그대로 인용해.
```

**검증**: validate 통과 출력. 실패 시 출력 전체 인용 + 원인에 🟡.

**커밋**: `feat(plugin): plugin.json 매니페스트 추가`

---

## T3 — `kern/scripts/` TypeScript 프로젝트 + 더미 테스트

**체크리스트**
- [ ] `npm view typescript version license`, `npm view @types/node version license` 출력 인용 → **사용자 승인** 후 설치
- [ ] `package.json`: `"type": "module"`, `"engines": {"node": ">=20"}`, scripts `build`/`test`
- [ ] `tsconfig.json`: strict, ESM(NodeNext), `outDir: dist`, `rootDir` 에 `src`·`test` 포함 방식 결정(F5)
- [ ] `src/version.ts` — `package.json` 의 version 을 읽는 순수 함수(첫 줄 한국어 역할 주석)
- [ ] `test/version.test.ts` — 더미 1건 (`node:test` + `node:assert`)
- [ ] `package-lock.json` 생성·커밋, `node_modules/`·`dist/` 미추적 확인
- [ ] `npm test` 출력 인용

**추천 프롬프트**
```text
S0-T3: kern/scripts 에 TS strict ESM 프로젝트를 만들어줘. 의존성은 typescript, @types/node 만.
설치 전에 npm view 로 version·license 를 보여주고 내 승인을 기다려. 테스트는 node:test,
실행 방식은 "tsc 빌드 후 node --test" 를 기본으로 하되 더 단순한 방법이 있으면 근거와 함께 제안해.
```

**검증**
```bash
cd kern/scripts && npm ci && npm run build && npm test
git status --short   # node_modules, dist 가 나오면 실패
```

**커밋**: `chore(scripts): TypeScript 프로젝트·node:test 구성` (본문에 `npm view` 출력)

---

## T4 — CLI `kern --version` + `bin/kern`, `bin/kern.cmd`

**체크리스트**
- [ ] `src/cli.ts`: `--version` → 버전 출력 후 exit 0. 알 수 없는 인자 → 한국어 에러 + exit 1 (조용한 실패 금지)
- [ ] 인자 파싱은 순수 함수로 분리하고 단위 테스트 (`--version`, 인자 없음, 미지 인자)
- [ ] `bin/kern`: `node` 호출 한 줄 (shebang + exec). `bin/kern.cmd`: `node` 호출 한 줄
- [ ] `bin/kern` 실행 비트: `git update-index --chmod=+x` 필요 여부 확인
- [ ] Git Bash: `./kern/bin/kern --version` / PowerShell: `.\kern\bin\kern.cmd --version` 출력 인용
- [ ] 공백 포함 경로에서도 동작하는지 1회 확인(따옴표 처리)

**추천 프롬프트**
```text
S0-T4: `kern --version` 만 지원하는 cli.ts 와 bin shim 2개를 만들어줘. shim 은 node 호출 한 줄만.
Git Bash 와 PowerShell 양쪽에서 실행한 실제 출력을 인용해. 다른 서브커맨드는 만들지 마.
```

**검증**: 두 셸 출력이 `package.json` version 과 동일. `npm test` 통과 출력. validate 재실행.

**커밋**: `feat(cli): kern --version 과 bin shim 추가`

---

## T5 — 라우터 `skills/kern/SKILL.md` 스텁

**체크리스트**
- [ ] 공식 문서에서 SKILL.md frontmatter 필드 확인(URL 기록)
- [ ] `description` 1~2문장 + 한국어 트리거 문구
- [ ] 본문: "아직 추천 가능한 커맨드 없음"을 정직하게 안내. 추천 1개 → 확인 → 실행 원칙, §0 런타임 규칙 3종(모르면 모른다 / 근거 노트 없이 문항 금지 / 채점 결과 변경 금지) 삽입
- [ ] `commands/` 디렉토리 만들지 않음
- [ ] validate 출력 인용, `--plugin-dir` 로드 후 `/kern` 노출 확인

**추천 프롬프트**
```text
S0-T5: 라우터 스킬 스텁을 만들어줘. S0 에는 하위 스킬이 없으니 없는 커맨드를 추천하지 않게 하고,
CLAUDE.md §6 규칙(한국어 트리거, 확인 후 실행, 런타임 §0 규칙)을 넣어. frontmatter 는 문서 확인 후 작성.
```

**검증**: validate 통과. 수동: `/kern` 입력 시 존재하지 않는 커맨드를 추천하지 않음.

**커밋**: `feat(skills): 라우터 /kern 스텁 추가`

---

## T6 — `hooks/hooks.json` SessionStart 스텁(침묵)

**체크리스트**
- [ ] 공식 hooks 문서에서 플러그인 `hooks.json` 스키마·`${CLAUDE_PLUGIN_ROOT}` 확인(URL 기록)
- [ ] `src/brief.ts`: S0 에서는 아무것도 출력하지 않고 exit 0. "vault 판정은 S5" 주석
- [ ] 훅 커맨드: `node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/brief.js"` 형태. `.sh` 금지
- [ ] 단위 테스트: brief 실행 시 stdout 빈 문자열
- [ ] validate 출력 + 실제 세션 시작 시 출력·오류 없음 확인

**추천 프롬프트**
```text
S0-T6: SessionStart 훅 스텁을 추가해줘. brief.js 는 침묵(출력 0, exit 0)만 한다.
hooks.json 스키마는 공식 문서로 확인하고, Windows 에서 경로 따옴표가 깨지지 않는지 실제 세션으로 확인해.
```

**검증**: `node kern/scripts/dist/brief.js | wc -c` → `0`, `echo $?` → `0`. `claude --plugin-dir ./kern` 시작 시 훅 오류 없음.

**커밋**: `feat(hooks): SessionStart 침묵 스텁 추가`

---

## T7 — `evals/` 케이스 1건 (플러그인 로드 확인)

**체크리스트**
- [ ] T0 에서 `claude plugin eval` 가용 여부 확인 결과 참조
- [ ] 가용: 공식 문서로 케이스 형식 확인 → 로드 확인 케이스 1건 → 실행 출력 인용
- [ ] 불가: 형식을 추측해 만들지 않는다. `evals/README.md` 에 "형식 미확인, 보류" 기록 + CLAUDE.md §8 갱신 후 **미완료로 보고**
- [ ] always-on 토큰 증가 여부 확인

**추천 프롬프트**
```text
S0-T7: evals 에 플러그인 로드 확인 케이스 1개를 추가해줘. 형식은 `claude plugin eval --help` 와 공식 문서로만 확인하고,
확인이 안 되면 파일을 지어내지 말고 보류로 보고해.
```

**검증**: `claude plugin eval ./kern` 통과 출력 인용.

**커밋**: `test(evals): 플러그인 로드 확인 케이스 추가`

---

## T8 — `examples/sample-cert/` 시험 프로파일 초안

**체크리스트**
- [ ] `exam.yaml` 초안: PRD §8.1 구조, 1차 stage 만(F7), 과목 2(`s1` mcq 20 / `s2` short_answer 20), `subject_min: 40`, `average_min: 60`
- [ ] **자작 시험**임을 파일 상단 주석과 `README.md` 에 명시. 실제 시험명·기출 0
- [ ] `criteria_source` 원문은 S1 산출물 → 아직 없으므로 `verified: false` 로 둘지 질문/기록
- [ ] YAML 파싱 가능 여부만 확인(zod 스키마는 S1). 파서 의존성은 추가하지 않음 🟡 — 수동 검토로 대체, 한계 명시
- [ ] 문항 40개 본문은 S0 범위 아님(프로파일 "초안"만) — 명시

**추천 프롬프트**
```text
S0-T8: examples/sample-cert/ 에 자작 시험 프로파일 초안(exam.yaml + README)을 만들어줘.
PRD §8.1 을 따르되 2차 논술 stage 는 빼. 실제 시험을 연상시키는 이름·내용은 쓰지 마. 의존성 추가 없이.
```

**검증**: 과목 items 합 = 40, pass_rule 값이 PRD 와 일치(육안 + grep). `git status` 에 vault·기출 없음.

**커밋**: `feat(examples): sample-cert 시험 프로파일 초안`

---

## T9 — S0 종합 검증·실측 기록

**체크리스트**
- [ ] 아래 DoD 명령 전부 실행, 출력 인용
- [ ] `claude plugin details kern` always-on 토큰 값을 `docs/decisions/` 또는 roadmap 에 기록(기준선)
- [ ] T1b 결정이 bin·훅 경로에 실제 반영됐는지 확인
- [ ] T7 이 보류면 S0 을 "조건부 완료(evals 보류)"로 보고(D3)
- [ ] roadmap S0 세션 수를 실측치로 갱신, CLAUDE.md §8 표 상태 갱신
- [ ] 미완료 항목이 있으면 숨기지 말고 S0 "부분 완료"로 보고

**DoD 검증 명령**
```bash
cd kern/scripts && npm ci && npm run build && npm test
claude plugin validate ./kern --strict
claude plugin details kern
claude plugin eval ./kern
./kern/bin/kern --version          # Git Bash
git status --short
```
```powershell
.\kern\bin\kern.cmd --version      # PowerShell
```

**추천 프롬프트**
```text
S0-T9: s0-plan.md 의 DoD 명령을 전부 실제로 실행해 출력을 인용하고, 통과/실패 표를 만들어줘.
실패는 원인 추정에 🟡 를 붙이고 테스트를 약화하지 마. 그 뒤 roadmap 실측치와 CLAUDE.md §8 을 갱신해.
```

**커밋**: `docs(roadmap): S0 실측 세션 수·토큰 기준선 반영`

---

## 2. 전체 진행 체크

- [ ] T0 환경
- [ ] T1 README·editorconfig
- [ ] T1b dist 배포 방식 결정
- [ ] T2 plugin.json
- [ ] T3 scripts TS 프로젝트
- [ ] T4 CLI·shim
- [ ] T5 라우터 스텁
- [ ] T6 훅 스텁
- [ ] T7 evals 1건
- [ ] T8 sample-cert 초안
- [ ] T9 종합 검증

## 3. 반대 관점·반례

- **task 가 너무 잘다**: T1·T2·T5 는 각 10분 규모라 커밋 10개가 과할 수 있다. 다만 CLAUDE.md §4 가 "산출물 1개 이하"를 요구하므로 그대로 뒀다. 묶는다면 T1+T8, T5+T6 이 자연스럽다.
- **T7 을 S0 에 두는 것**: `claude plugin eval` 가용 여부가 🔴 이라 S0 DoD 를 막을 수 있다. 불가 시 S0 을 "evals 보류" 조건부 완료로 볼지 결정이 필요하다.
- **T1b 를 S0 에 넣는 것**: 공식 문서에 설치 시 빌드 동작이 명시돼 있지 않으면 조사만으로 결론이 안 날 수 있다. 그 경우 🔴 로 남기고 로컬 `--plugin-dir` 전제로 진행한다.
