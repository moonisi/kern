# kern

시험 정보와 학습 자료를 주면 그 시험 전용 학습 환경(분류체계·문제은행·모의고사·복습 큐·약점 지도)을 로컬 마크다운으로 구축하는 **시험 불가지론적(exam-agnostic) Claude Code 플러그인**. Obsidian 은 저장소이자 뷰어이며, 모든 산출물은 사용자의 디스크에 마크다운/YAML 로 남는다.

특정 시험을 코드에 넣지 않는다. 시험을 바꾸는 것은 코드 수정이 아니라 `/kern:init-exam` 한 번 실행이어야 한다(예정).

## 현재 상태

**S0 — 뼈대·툴체인 진행 중.** 아직 동작하는 기능은 없다. 아래는 전부 **예정**이며 순서는 [docs/roadmap.md](docs/roadmap.md) 를 따른다.

| 단계 | 내용 | 상태 |
|---|---|---|
| S0 | 뼈대·툴체인 (플러그인 로드, `kern --version`, 테스트 실행) | 진행 중 |
| S1 | 데이터 계층·`init-exam` | 예정 |
| S2 | `ingest`·`youtube` | 예정 |
| S3 | `generate`·`verify`·`solve`·핸들러 | 예정 |
| S4 | `mock`·`serve`·`grade` | 예정 |
| S5 | `review`(FSRS)·`weakmap`·훅·라우터·`drill` | 예정 |
| S6 | `crash`·`plan`·`probe` | 예정 |
| S7 | 두 번째 샘플 시험·schema v2·`essay_rubric` | 예정 |
| S8 | 대시보드(선택) | 예정 |

MVP 는 S0~S5.

## 요구 환경

- Windows 11 + Git for Windows (Claude Code 는 Git Bash 에서 실행)
- Node ≥ 20, npm
- Claude Code (개발 세션은 데스크톱 앱 번들 `claude.exe` 사용, [CLAUDE.md](CLAUDE.md) §2)

다른 OS 에서의 동작은 확인하지 않았다.

## 개발 명령

아래 명령의 대상(`kern/scripts` 의 TS 프로젝트, `plugin.json`, evals)은 S0 에서 추가될 예정이며 아직 없다.

```bash
cd kern/scripts && npm test
claude plugin validate ./kern --strict
claude --plugin-dir ./kern
claude plugin details kern
claude plugin eval ./kern
```

## 문서

- [docs/prd.md](docs/prd.md) — 무엇을 만드는가
- [docs/roadmap.md](docs/roadmap.md) — 어떤 순서로 만드는가
- [CLAUDE.md](CLAUDE.md) — 개발 세션 지침

## 데이터 정책

저장소에는 자작 샘플 시험(`examples/`)만 포함한다. 실제 기출·교재·강의 자막과 학습 vault 는 git 에 올리지 않는다.

## 라이선스

MIT
