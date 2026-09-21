# 0001 — `dist` 배포 방식

| 항목 | 내용 |
|---|---|
| 상태 | **확정 (2026-09-21 사용자 승인)**: (d) 빌드 없이 실행, Node ≥ 22.18, `package.json` 은 `kern/` 루트. §2 사실 12 는 🔵 검증 통과(2026-09-21, S0-T9) → (b) 재검토 불필요 |
| 작성일 | 2026-09-21 (KST) |
| 관련 | `docs/plans/s0-plan.md` F3·D2·T1b, `CLAUDE.md` §2·§3 |
| 범례 | 🔵 확인됨 / 🟡 추정 / 🔴 미확인 |

## 1. 문제

`dist/` 는 gitignore 인데 `bin/kern`·훅이 `scripts/dist/*.js` 를 호출한다. git 으로 설치된 플러그인에는 `dist` 가 없어 실행할 수 없다.

## 2. 확인한 사실 (공식 문서, 2026-09-21 조회)

출처 A: https://code.claude.com/docs/en/plugins-reference ("Node.js package dependencies", "Persistent data directory")
출처 B: https://code.claude.com/docs/en/plugin-marketplaces ("Plugin sources")
출처 C: https://nodejs.org/api/typescript.html

| # | 사실 | 상태 |
|---|---|---|
| 1 | 마켓플레이스 플러그인은 `~/.claude/plugins/cache` 로 **복사**된다 | 🔵 A |
| 2 | 복사 시 Node 의존성을 자동 설치한다. 조건: **플러그인 루트 디렉토리**에 `package.json` + 지원 lockfile. `package-lock.json` 이면 `npm ci --ignore-scripts` | 🔵 A. roadmap S0 의 "lockfile 요구" 주장은 맞음. 단 위치가 **루트**여야 함 |
| 3 | `--ignore-scripts` 라 `preinstall`/`install`/`postinstall` 이 돌지 않는다. 60초 타임아웃. **빌드 단계는 없다** | 🔵 A |
| 4 | 설치 실패·생략은 플러그인을 막지 않고 debug 출력에 경고만 남긴다 | 🔵 A |
| 5 | in-place 로드(로컬 디렉토리 마켓플레이스)는 소스 디렉토리에 의존성을 설치해 주지 않는다. 직접 설치하거나 훅으로 `${CLAUDE_PLUGIN_DATA}` 에 설치 | 🔵 A. `--plugin-dir` 도 동일한지는 🟡 (문서가 `--plugin-dir` 를 직접 언급하지 않음) |
| 6 | git 계열 source(`github`/`url`/`git-subdir`)는 `ref`·`sha` 로 고정 가능. `npm`·`archive` source 도 있음 | 🔵 B |
| 7 | npm source 는 lockfile 이 없으면 "필요한 것을 전부 빌드된 상태로 publish 하라"고 안내 | 🔵 B |
| 8 | `bin/` 의 실행 파일은 Bash 도구 `PATH` 에 추가된다. claude.ai 조직 설정으로 배포하는 플러그인에는 `bin/` 을 넣을 수 없다 | 🔵 A. Windows 관련 언급은 없음 🔴 |
| 9 | Node type stripping: v22.18.0/v23.6.0 부터 플래그 없이 기본 활성, v24.12.0/v25.2.0 부터 Stable. `node_modules` 아래의 `.ts` 는 거부. enum·runtime namespace·parameter property·decorator 불가. import 는 `.ts` 확장자 필수, 타입은 `import type`. `tsconfig.json` 무시 | 🔵 C |
| 10 | 이 PC(Node v24.19.0)에서 `node a.ts` 가 플래그·경고 없이 실행됨 (`ts-ok`, exit 0) | 🔵 2026-09-21 scratchpad 실행 |
| 11 | `npm ci` 가 devDependencies 를 설치하는지에 대한 플러그인 문서의 언급 | 문서에는 없음. 🔵 실측(2026-09-21, S0-T9, claude.exe 2.1.275): 캐시 복사본 `node_modules/` 에 `typescript`·`@types` 가 설치됨 → devDependencies 도 설치된다 |
| 12 | 실제 git 설치 → 캐시 복사 → 실행까지의 end-to-end 동작 | 🔵 검증 통과 (2026-09-21, S0-T9). 임시 로컬 마켓플레이스 + `git-subdir` source(`https://github.com/moonisi/kern.git`, path `kern`, sha `5cb56a1`) 로 설치 → `~/.claude/plugins/cache/kern-t9-verify/kern/0.0.1/` 에 복사됨 → 복사본에서 `bin/kern --version`(Git Bash)·`bin\kern.cmd --version`(PowerShell)·`node scripts/src/cli.ts --version` 모두 `0.0.1`, `brief.ts` stdout 0바이트. `bin/kern` 실행 비트 유지(`-rwxr-xr-x`). 설치 상태의 `-p` 세션 debug 로그에 캐시 경로의 `hooks.json` 로드·`Registered 1 hooks`·`Loaded 1 skills`, 훅 오류 없음. 검증 후 uninstall·marketplace remove 로 원복 |

## 3. 후보 비교

| 후보 | 동작 여부 | 장점 | 단점 |
|---|---|---|---|
| (a) 설치 시 빌드 | **공식 경로로는 불가** (사실 3). SessionStart 훅에서 `${CLAUDE_PLUGIN_DATA}` 로 빌드하는 우회는 가능하나 `typescript` 가 런타임에 있어야 함(사실 11 🔴) | 저장소에 산출물 없음 | 첫 세션 지연, 실패 지점 증가, 조용한 실패 위험(CLAUDE.md §0-7) |
| (b) `dist` 커밋 | 모든 source 에서 동작 🟡 | 단순, 사용자 Node 요구 낮음(≥20 유지) | diff 노이즈, 소스와 `dist` 불일치 위험(CI 검사 필요), CLAUDE.md §3 커밋 금지 목록·`.gitignore` 수정 |
| (c) 릴리스 ref 에만 `dist` | `ref`/`sha` 고정으로 가능 (사실 6) | main 이 깨끗함 | 릴리스 자동화 필요, main 은 설치 불가, 1인 프로젝트에 과함 |
| (d) 빌드 없이 실행 (type stripping) | 이 PC 에서 확인 (사실 10). 캐시 경로는 `node_modules` 아래가 아님 (사실 1·9) | `dist` 자체가 없어짐 → 불일치·빌드·커밋 문제 소멸. S0 구조 단순화 | Node 하한 상승(≥22.18, Stable 기준이면 ≥24.12). TS 문법 제약(사실 9). `tsc` 는 타입 검사 전용(`noEmit`)으로만 사용 |

## 4. 결정: (d) 빌드 없이 실행

- `bin/kern`·훅은 `node "<root>/scripts/src/cli.ts"` 를 직접 호출한다. `dist/` 는 만들지 않는다.
- `tsc` 는 `npm test`/검사 단계에서 타입 검사만 한다. 제약 문법을 컴파일 단계에서 막는 tsconfig 옵션은 🟡 T3 에서 공식 문서로 확인 후 적용(기억으로 옵션명을 쓰지 않음).
- Node 하한: **≥ 22.18** 확정(기본 활성 기준, 사용자 선택). Stable 표기 기준은 ≥ 24.12. 22.x 에 Stable 이 백포트됐는지는 🔴.
- 근거: 1인 로컬 도구이고 개발 PC 가 이미 v24. (b)의 불일치 위험과 (c)의 자동화 비용을 없애는 가장 단순한 방법(CLAUDE.md Simplicity First).

### 채택에 따른 변경 (2026-09-21 반영, `docs/prd.md` §6·§9 의 Node 하한 포함)

1. `CLAUDE.md` §2 런타임 `Node ≥ 20` → 새 하한, "훅·CLI 는 `node scripts/dist/*.js`" 문구, §3 구조의 `dist/`, §7 명령
2. `docs/roadmap.md` S0 산출물(`scripts/dist/cli.js`, `dist/brief.js`), `docs/plans/s0-plan.md` F3·F5·T3·T4·T6
3. `README.md` 요구 환경
4. `.gitignore` 의 `dist/` 는 남겨도 무해 (변경 불필요)

## 5. 별도로 드러난 문제 — `package.json` 위치

사실 2 에 따라 의존성 자동 설치는 **플러그인 루트(`kern/`)** 의 `package.json`+lockfile 에만 작동한다. 현재 계획은 `kern/scripts/package.json` 이라, `zod`·`ts-fsrs` 같은 런타임 의존성이 설치된 플러그인에서 누락된다. 이 문제는 (b)·(c)·(d) 어느 쪽을 골라도 동일하다.

- 추천: `package.json`·`package-lock.json`·`tsconfig.json` 을 `kern/` 루트에 둔다. 소스는 `kern/scripts/src/` 유지(Node 모듈 해석은 상위 디렉토리의 `node_modules` 를 찾으므로 동작 🔵 Node 표준 해석 규칙). `cd kern/scripts && npm test` → `cd kern && npm test` 로 변경.
- 대안: 의존성을 번들링(esbuild 등) — 새 의존성·빌드 단계가 생겨 (d)의 이점과 충돌.
- S0 은 런타임 의존성이 0 이므로 당장 막히지는 않는다. 다만 T3 에서 디렉토리를 만들기 전에 정하는 편이 싸다.

## 6. 반대 관점·반례

- (d)는 Node 20·22.17 이하 사용자를 배제한다. 공개 플러그인으로서 설치 장벽이 (b)보다 높다.
- type stripping 은 enum·parameter property 를 못 쓴다. `ts-fsrs` 등 **의존성**은 `node_modules` 안의 컴파일된 JS 라 무관하지만, 우리 코드 스타일은 영구히 제약된다.
- 사실 12 가 🔴 이다. 캐시 복사본에서 `.ts` 직접 실행이 실제로 되는지는 T9(또는 T4 직후)에서 로컬 마켓플레이스 설치로 검증해야 하며, 실패하면 (b)로 되돌린다.
- Claude Code 가 번들한 런타임이 아니라 **사용자 PATH 의 `node`** 에 의존한다는 점은 (b)도 같다.
