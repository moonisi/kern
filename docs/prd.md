# kern — Product Requirements Document

| 항목 | 내용 |
|---|---|
| 문서 버전 | 0.2 (검토 반영) |
| 작성일 | 2026-09-21 |
| 상태 | 검토 대기 |
| 관련 문서 | `roadmap.md`, `CLAUDE.md` |

---

## 1. 한 줄 정의

**kern**은 시험 정보와 학습 자료를 주면 그 시험 전용 학습 환경(분류체계·문제은행·모의고사·복습 큐·약점 지도)을 로컬 마크다운으로 구축하는 **시험 불가지론적(exam-agnostic) Claude Code 플러그인**이다. Obsidian은 저장소이자 뷰어이며, 모든 산출물은 사용자의 디스크에 마크다운/YAML로 남는다.

---

## 2. 배경과 문제

- 자격·전문 시험 준비자는 시험마다 문제집·인강·오답노트를 처음부터 다시 만든다. 이전 시험에서 쌓은 "공부하는 방법"은 이월되지 않는다.
- 범용 LLM 채팅은 세션이 끝나면 지난주 틀린 문제를 잊는다. 시중 문제앱은 특정 시험에 고정되어 있고 데이터를 내보낼 수 없다.
- 참고 프로젝트 PAIDEIA(Claude Code 플러그인)는 수리·물리 서술형 시험을 전제로 하여, 객관식 위주 한국 자격시험·법률 논술 시험의 채점 모델(과락/평균 합격기준, 4지선다 결정적 채점, 루브릭 논술)과 맞지 않는다.

kern은 "시험은 데이터, 문항 유형은 코드"라는 원칙으로 이 문제를 푼다. 시험을 바꾸는 것은 코드 수정이 아니라 `/kern:init-exam` 한 번 실행이어야 한다.

---

## 3. 목표와 비목표

### 3.1 목표 (성공 기준으로 측정)

| ID | 목표 | 측정 기준 |
|---|---|---|
| G1 | 시험 무관 엔진 | 두 번째 시험을 **코드 수정 0**으로 `init-exam` + 자료 ingest만으로 세팅 |
| G2 | 실제 시험 스타일 문제 | 생성 문항이 기출의 문체·선지 구성·함정 패턴을 따르고, 품질 게이트(§7.6)를 통과한 `verified` 문항만 모의고사에 투입 |
| G3 | 결정적 채점 | 객관식·단답은 LLM 없이 스크립트가 채점. 동일 입력 → 동일 결과 |
| G4 | 약점 기반 학습 루프 | 모든 시도가 로그로 남고, 복습 큐·약점 지도·학습 계획이 로그에서 파생 |
| G5 | 로컬 우선 | 플러그인을 지워도 vault의 md/YAML만으로 학습 이력 열람·편집 가능 |
| G6 | 한국어 우선 | 해설·전략·피드백은 한국어. 구조 토큰(키·ID·커맨드명)은 영문 고정 |

### 3.2 비목표 (명시적으로 하지 않는 것)

- **채점자가 아니다.** 논술형 점수는 참고치이며, 항상 불확실 표시를 붙인다. 합격 여부를 단언하지 않는다.
- **특정 시험 특화 없음.** 컴퓨터활용능력을 포함해 어떤 시험도 코드에 하드코딩하지 않는다. 시험별 실기 검증기(예: 엑셀 수식 계산 엔진)는 본 저장소 범위 밖이며 §11의 확장점으로만 남긴다.
- **GUI 앱이 아니다.** Obsidian 플러그인·SPA·React 대시보드를 만들지 않는다. 예외는 모의고사 풀이 화면(단일 HTML + 로컬 저장 서버, §7.8)뿐이며 LLM을 호출하지 않는다. 시각화는 마크다운·Mermaid·집계 JSON까지.
- **다인 사용·동기화·클라우드 없음.** 1인 로컬 사용.
- **기출 데이터 배포 없음.** 저장소에는 자작 샘플 시험만 포함. 실제 기출·교재는 vault에만 존재하며 git에 올리지 않는다.

---

## 4. 사용자와 시나리오

**사용자**: Claude Code 구독자 1인. Obsidian 사용. 시험 준비 기간 2주~6개월.

**대표 시나리오**

1. **새 시험 세팅 (D-60)**: 출제기준 PDF와 합격기준을 주고 `/kern:init-exam` → `exam.yaml`, `taxonomy.md` 생성 → 사용자 검토·수정.
2. **자료 투입 (D-55)**: 기출 PDF·문제 스크린샷·인강 링크(또는 NotebookLM 요약·Web Clipper 노트)를 `01_Sources/`에 넣고 `/kern:ingest`, `/kern:youtube` → 문제은행·이론 노트 생성, 분류체계에 백링크.
3. **진단 (D-50)**: `kern serve` 실행 → `/kern:mock 60` → 브라우저에서 `paper.html` 풀이(타이머·마스킹) → 제출 시 답안 자동 저장 → `/kern:grade` → 점수·합격선 판정·약점 영역.
4. **훈련 (D-49 ~ D-8)**: 매 세션 시작 시 SessionStart 훅이 "오늘 복습 12개, 약점 Top3, 추천: `/kern:drill 담보물권`" 출력 → `/kern:review`, `/kern:drill`, `/kern:probe` 반복.
5. **압축 (D-7)**: `/kern:plan 7` → 하루 45분 과제 7개 → `/kern:crash` → 오답 기반 요약본.
6. **다음 시험**: 새 vault 생성 → 1번부터 반복. 플러그인·튜터 모드·핸들러는 그대로.

---

## 5. 핵심 설계 원칙

| # | 원칙 | 의미 |
|---|---|---|
| P1 | **시험은 데이터, 문항 유형은 코드** | 시험 프로파일·분류체계·함정 패턴은 vault의 YAML/MD. 채점 방식은 `scripts/graders/`의 핸들러 카탈로그. 새 시험 = 새 데이터 + 기존 핸들러 매핑 |
| P2 | **결정적 우선, LLM은 보조** | 채점·스케줄링·통계는 스크립트. LLM은 생성·해설·루브릭 평가에만 |
| P3 | **출처 없는 사실은 미검증** | 출제기준 원문 없이 시험명만으로 만든 프로파일은 `verified: false` 로 표시하고 사용자 확인 전까지 모의고사에 쓰지 않는다 |
| P4 | **생성 문항은 draft부터** | LLM 생성 문항은 검증 에이전트를 통과해야 `verified`. 모의고사·복습 큐는 `verified`만 사용 |
| P5 | **append-only 이력** | 시도 로그·약점 지도는 덮어쓰지 않는다. `git log`로 이해도 변화를 추적 |
| P6 | **모든 산출물은 편집 가능한 텍스트** | 사용자가 `.md`를 고치면 다음 커맨드가 그 수정을 반영 |
| P7 | **기출 빈도 = 출제 확률** | PAIDEIA의 HW-density 원리를 차용. 기출에 자주 나온 단원이 훈련·모의고사 가중치를 받는다 |

---

## 6. 시스템 아키텍처

### 6.1 구성 요소

```text
[Claude Code]  ── 플러그인 로드 ──▶  kern/ (엔진, 공개 저장소)
     │                                 ├── skills/        슬래시 커맨드 (SKILL.md)
     │                                 ├── agents/        서브에이전트 (생성기·검증기·채점 해설기)
     │                                 ├── hooks/         SessionStart: 복습 큐 브리핑
     │                                 ├── scripts/       TypeScript (Node ≥ 20): 결정적 로직
     │                                 └── bin/kern      CLI (스크립트 진입점)
     │
     └── 작업 디렉토리 ──▶  <exam>-vault/ (데이터, git 제외 또는 private)
                              └── Obsidian이 그대로 vault로 열어 열람·편집
```

- **개발 시**: `claude --plugin-dir ./kern` 으로 로드, `claude plugin validate ./kern` 으로 검사.
- **런타임**: 사용자가 vault 폴더에서 `claude` 실행. 플러그인은 user scope에 설치.
- **주의**: 플러그인 루트의 `CLAUDE.md`는 Claude Code가 컨텍스트로 읽지 않는다. 런타임 지침은 각 `SKILL.md`에, 개발 지침은 개발 저장소의 `CLAUDE.md`에 둔다.

### 6.2 Vault 표준 구조

```text
<exam>-vault/
├── 00_Exam/
│   ├── exam.yaml            # 시험 프로파일 (§8.1)
│   ├── taxonomy.md          # 과목 → 단원 → 소단원 트리, 각 노드는 [[백링크]]
│   ├── criteria/            # 출제기준·합격기준 원문 (PDF/MD)
│   └── traps.md             # 기출 분석으로 추출한 함정 패턴 목록
├── 01_Sources/
│   ├── Exams/               # 기출·모의 원본 (PDF, 이미지)
│   ├── Books/               # 교재·요약본
│   ├── YouTube/             # 강의 요약 노트 (3경로 수렴 규격, §7.3)
│   └── Clippings/           # Web Clipper·NotebookLM 원문 붙여넣기
├── 02_Theory/               # 개념 노트 (taxonomy 노드와 1:1 또는 n:1)
├── 03_Questions/
│   ├── Items/               # 문항 1개 = 파일 1개 (§8.2)
│   └── Attachments/         # 문항 이미지·표
├── 04_Logs/
│   ├── attempts.jsonl       # 모든 시도 (append-only, §8.3)
│   ├── mock/                # 모의고사 회차별 답안지·채점표
│   └── weakmap/             # weakmap_<ts>.md (append-only)
├── 05_Reports/              # plan, crash, 집계 JSON (대시보드용)
└── .kern/                  # 캐시, FSRS 상태, 인덱스 (재생성 가능)
```

### 6.3 데이터 파이프라인

```text
출제기준 ─▶ init-exam ─▶ exam.yaml + taxonomy.md
                                  │
기출PDF/이미지 ─▶ ingest ─┐        ▼
YouTube 3경로  ─▶ youtube ┼─▶ 02_Theory + 03_Questions(원본, verified)
NotebookLM/Clipper ───────┘        │
                                   ▼
                          generate ─▶ 03_Questions(생성, draft) ─▶ verify ─▶ verified
                                   │
        solve / mock / drill / review ─▶ grade(핸들러) ─▶ 04_Logs/attempts.jsonl
                                                              │
                                   weakmap ◀── FSRS 스케줄러 ◀─┘
                                      │
                             plan / crash / probe / SessionStart 브리핑
```

---

## 7. 기능 명세

각 기능은 슬래시 커맨드 1개(= skill 1개)에 대응한다. 접두어는 `/kern:`.

### 7.1 `init-exam` — 시험 프로파일 생성

- **입력**: 시험명, 출제기준 원문(PDF/URL/텍스트), 합격기준, (선택) 시험일.
- **처리**: 서브에이전트가 원문을 읽어 과목·문항수·시간·배점·합격규칙·문항유형을 추출 → 각 과목을 핸들러 카탈로그(§7.7)에 매핑 → 분류체계 트리 초안 생성.
- **출력**: `exam.yaml`, `taxonomy.md`, `criteria/` 보관본.
- **규칙**:
  - 원문이 없으면 모든 필드 `verified: false`, 사용자 확인 요구.
  - 매핑할 핸들러가 없는 문항 유형은 `handler: UNSUPPORTED`로 기록하고 경고. 해당 유형은 모의고사에서 제외.
  - 분류체계 추출 실패는 정상 흐름이다. 빈 트리 + "손으로 채우세요" 안내를 출력한다.
- **수용 기준**: 샘플 시험(§10)으로 실행 시 `exam.yaml` 스키마 검증 통과, 두 번째 샘플 시험에서 코드 수정 없이 재실행 성공.

### 7.2 `ingest` — 기출·교재 수집

- **입력**: `01_Sources/Exams/`, `Books/` 의 PDF·이미지·MD.
- **처리**: 페이지 → PNG 렌더 → Claude 비전으로 지문·선지·정답·해설·표 분리 추출 (PAIDEIA 비전 파이프라인 차용: 긴 PDF는 페이지 범위로 분할해 병렬 에이전트). 추출 문항은 `03_Questions/Items/`에 `source: original`, `status: verified`로 저장. 원본 이미지는 `Attachments/`에 저장하고 `![[...]]`로 링크.
- **부수 산출**: 단원별 기출 빈도표(`05_Reports/frequency.json`) — P7의 가중치 원천.
- **규칙**: 정답이 원문에 없는 문항은 `answer: null`, `status: needs_answer`.
- **수용 기준**: 샘플 기출 PDF 1부(20문항)에서 문항 20개 파일 생성, 정답 누락 0.

### 7.3 `youtube` — 강의 요약 (3경로)

세 경로 모두 `01_Sources/YouTube/<video-id>.md` 한 가지 규격으로 수렴한다.

| 경로 | 입력 | 방식 | 기본 여부 |
|---|---|---|---|
| ② NotebookLM | NotebookLM 요약을 붙여넣기 (`01_Sources/Clippings/`) | 정규화 + 분류체계 매핑 | **기본** |
| ③ Web Clipper | Obsidian Web Clipper YouTube 템플릿으로 저장된 노트(자막 포함) | 자막 파싱 + 요약 | **기본** |
| ① 직접 링크 | YouTube URL | 로컬 `yt-dlp --write-auto-sub` 실행 → 자막 파일 → 요약 | **opt-in** (`exam.yaml: youtube.direct_fetch: true`) |

- **출력 규격**: frontmatter(`video_id, title, channel, duration, source_path, ingested_at`), 본문(핵심 개념 요약 / 절차 Mermaid / 용어 `[[백링크]]` / 원 자막 접기).
- **규칙**: 경로 ①은 도구 미설치·차단 시 조용히 실패하지 않고 ②③ 안내로 폴백. 자막이 없는 영상은 요약 불가로 보고.
- **수용 기준**: 경로 ②③ 각각 샘플 1개로 동일 규격 노트 생성. 경로 ①은 로컬 환경에서 1회 동작 확인(환경 의존 항목으로 표시).

### 7.4 `generate` — 문항 생성

- **입력**: 단원(또는 약점 지도), 개수, 난이도(초/중/고/혼합).
- **처리**: 같은 단원의 `verified` 문항 3~5개 + `traps.md` + `02_Theory` 노트를 시드로 서브에이전트가 변형 문항 생성 (수치·시나리오·선지 순서 변형, 함정 패턴 유지). 생성 문항은 `source: generated`, `status: draft`.
- **난이도 정의**: 초급 = 단일 개념 확인 / 중급 = 복합 조건, 기출 표준 / 고급 = 예외·다중 함정. 혼합은 `exam.yaml`의 `difficulty_mix` 비율.
- **규칙**:
  - 시드 문항이 있는 단원: 해당 단원 시드로 생성.
  - 시드 문항이 **0개**인 단원: `02_Theory` 노트를 내용 원천으로, **다른 단원의 `verified` 문항 5~8개를 문체·선지 구성 스타일 시드**로 삼아 예상문제 생성. frontmatter에 `seed_items: []`, `style_source: "cross-unit"` 기록. 이론 노트조차 없으면 생성 거부.
  - 모든 생성 문항은 `verify` 게이트를 거쳐야 `verified`.

### 7.5 `solve` — 단일 문항 풀이 및 해설

- 사용자가 문항 ID 또는 이미지/텍스트를 제시 → 답 입력 → 채점 핸들러 → 해설.
- **해설 형식 고정 (3단계)**: ① 단계별 풀이(접근 알고리즘·선행 개념) ② 출제 의도와 오답 선지의 함정 ③ 최종 정답 재확인.
- 이미지 업로드 문항은 즉시 `ingest` 규격으로 문제은행에 편입.
- **출처 표시 규칙 (모든 문항 제시 화면·답안지 공통)**: 문항 번호 옆에 `source` 기반 마크를 항상 붙인다.

| `source` | 마크 | 부가 표시 |
|---|---|---|
| `original` | **[기출]** | `source_ref` (예: `[기출] 2025년 12번`) |
| `generated` | **[예상]** | `style_source: cross-unit` 인 경우 `[예상·타단원스타일]` |
| `user_upload` | **[업로드]** | 파일명 |

  마크는 렌더링 시 frontmatter에서 파생하며 본문에 하드코딩하지 않는다.

### 7.6 `verify` — 생성 문항 품질 게이트

검증 서브에이전트가 `draft` 문항을 검사한다. 모두 통과해야 `verified`.

| 검사 | 기준 |
|---|---|
| 정답 유일성 | 복수 정답 가능성 없음, 정답이 선지에 존재 |
| 선지 품질 | 선지 간 중복·포함 관계 없음, 길이·형식 편향 없음 |
| 범위 | `taxonomy.md` 노드에 연결됨, 출제기준 밖 개념 아님 |
| 해설 정합 | 해설의 논리가 정답과 일치 |
| 원본 유사도 | 시드 문항과 문면 80% 이상 동일하면 반려 (표절 방지) |

실패 문항은 `status: rejected` + 사유 기록. 재생성은 사용자 지시로만.

### 7.7 `grade` — 채점 핸들러 카탈로그

| 핸들러 | 방식 | 결정성 | v1 포함 |
|---|---|---|---|
| `mcq` | 정규화 후 정확 비교 | 결정적 | ✅ |
| `short_answer` | 공백·조사·대소문자·동의어 사전 정규화 후 비교 | 결정적 | ✅ |
| `essay_rubric` | `exam.yaml`의 루브릭 항목별 LLM 평가 + 모범답안 대조. 점수에 항상 "참고치" 표시 | 비결정적 | v1.5 |
| `procedure_checklist` | 절차 항목 자기평가 체크리스트 | 사용자 판단 | v2 |

- 핸들러 인터페이스: `grade(item, answer) → { correct: boolean|null, score: number, feedback: string[], confidence: "deterministic"|"llm" }`.
- 새 핸들러 추가는 코드 변경이며, `init-exam`이 `UNSUPPORTED` 로 표시한 유형을 해소하는 유일한 경로.

### 7.8 `mock` — 실전 모의고사 (HTML 답안지 + 로컬 저장 서버)

- **출제**: `exam.yaml`의 과목별 문항수·시간·난이도 비율·기출 빈도 가중치로 `verified` 문항을 추출해 `04_Logs/mock/<ts>/paper.html` 과 `paper.md`(백업)를 생성. 정답·해설은 어느 파일에도 포함하지 않는다(마스킹).
- **풀이 화면 (`paper.html`)**: 단일 HTML 파일, 외부 의존 없음. 문항 데이터는 파일 내 JSON 임베드. 기능: 문항·선지 표시, [기출]/[예상] 마크, 카운트다운 타이머, 문항 이동·플래그, 시작·제출 시각 자동 기록. 정답 포함 금지.
- **제출·저장 (`kern serve`, v1 포함)**: `bin/kern serve` 가 vault 를 정적 서빙(`http://localhost:<port>/04_Logs/mock/<ts>/paper.html`)하고 `POST /api/answers` 로 답안을 `04_Logs/mock/<ts>/answers.json` 에 직접 기록한다. 서버는 Node 내장 `http` 만 사용, 외부 프레임워크 없음, LLM 호출 없음.
- **폴백**: 서버 미실행 상태(`file://`)에서 열면 "제출" 이 `answers.json` 다운로드로 동작. 사용자가 해당 폴더로 옮기면 동일하게 채점 가능.
- **채점**: `/kern:grade mock <ts>` → 핸들러 채점 → `report.md`: 과목별 점수, 과락·평균 합격규칙 판정, 실전 예상 점수 구간, 취약 단원, 단기 전략. 해설은 채점 후에만 생성.
- **범위 제한**: HTML 화면은 모의고사 풀이에만 쓴다. 이론 노트 열람은 Obsidian이 담당한다.
- **수용 기준**: 샘플 시험으로 `mock` → 브라우저 풀이 → `serve` 경유 저장 → `grade` 까지 한 번에 통과. 서버 없이 다운로드 폴백으로도 통과.

### 7.9 `review` — 간격 반복 복습

- 스케줄러: **FSRS** (`ts-fsrs`). 문항별 `stability, difficulty, due` 를 `.kern/fsrs.json`에 저장, 요약은 문항 frontmatter에 반영.
- 객관식 2단계 결과를 FSRS 4단계로 매핑하는 규칙(초기값, 튜닝 대상):

| 결과 | 조건 | Rating |
|---|---|---|
| 오답 | — | Again |
| 정답, 느림 | 소요시간 > 기준시간 × 1.5 | Hard |
| 정답 | 기본 | Good |
| 정답, 빠름, 연속 정답 2회 이상 | 소요시간 < 기준시간 × 0.6 | Easy |

- `/kern:review` 는 오늘 `due` 문항을 순서대로 제시하고 시도를 로그한다.

### 7.10 `weakmap` — 약점 지도

- `attempts.jsonl` 을 단원별로 집계 → 정답률·최근 추세·기출 빈도를 결합한 우선순위 목록을 `04_Logs/weakmap/weakmap_<ts>.md` 에 append-only 저장.
- 우선순위 = (1 − 정답률) × 기출빈도 가중치 × 최근성.
- 출력 하단에 "지금 할 것 3개 / 버려도 되는 것 3개"를 명시(PAIDEIA-Alt의 결정 지향 원칙 차용).

### 7.11 튜터 모드 (에이전트4.md 반영)

| 커맨드 | 원본 | 동작 |
|---|---|---|
| `/kern:crash` | 학습곡선 파괴자 | 약점 지도·기출 빈도 기반으로 "먼저 배울 것 / 무시할 것 / 한 번에 70% 앞서는 것"만 출력. 이론 목록 금지 |
| `/kern:drill <단원>` | 실제 오류 시뮬레이터 | 설명 없이 문제 제시 → 오답 시 정답 대신 "어디서 틀렸는지 찾게 하는 질문" → **2회 이상 오답일 때만** 정답 공개 → 망설임 없이 맞힐 때까지 변형 반복 |
| `/kern:plan <일수>` | 맞춤 학습 경로 설계자 | N일 경로, 하루 **45분 과제 1개 + 통과 기준 1개**. 경로가 합격기준으로 이어지지 않으면 재설계 |
| `/kern:probe` | 숨은 빈틈 탐지기 | 겉보기 단순하지만 깊이를 드러내는 질문 5~10개. 답할 때마다 기초의 어느 부분이 부족한지 직접 지적. 완곡 표현 금지 |

각 모드는 `agents/` 의 서브에이전트 프롬프트로 구현하고, 결과는 `05_Reports/` 또는 `attempts.jsonl` 에 남긴다.

### 7.12 SessionStart 브리핑 (훅)

vault에 `00_Exam/exam.yaml` 이 있을 때만 동작. 출력 예:

```text
kern · <시험명> · D-37 · phase: drill
오늘 복습 12개 (`/kern:review`) · 약점 Top3: 담보물권, 채권양도, 상법총칙
추천: /kern:drill 담보물권
```

phase는 디스크 활동으로 판정(setup → diag → drill → mock → cram → cool). 파일 없으면 침묵.

### 7.13 시각화 (선택, 단계적)

1. **v1**: Mermaid(분류체계 트리, 절차도) + 마크다운 표.
2. **v1.5**: `05_Reports/*.json` 집계 → Obsidian Charts/Dataview 로 레이더·히트맵.
3. **v2 (선택)**: 단일 HTML 대시보드 파일 생성(외부 의존 없음). React/D3 앱은 만들지 않는다.

### 7.14 스킬 호출 정책과 라우터

커맨드가 15개 안팎이므로 "적시에 못 쓰는" 문제를 구조로 막는다.

- **라우터 `/kern`**: 인자 없이 실행하면 `exam.yaml`, phase, 복습 큐, 최신 weakmap 을 읽어 **지금 할 커맨드 1개를 추천하고, 사용자 확인 후 실행**한다. 자연어 인자(`/kern 담보물권 약해`)가 오면 의도를 커맨드로 매핑해 같은 절차를 밟는다. 라우터는 직접 실행하지 않는다.
- **자동 호출 정책** (`SKILL.md` 프론트매터 `disable-model-invocation`):

| 구분 | 커맨드 | 이유 |
|---|---|---|
| 자동 호출 허용 | `solve`, `grade`, `review`, `weakmap`, `mock`, `crash`, `drill`, `plan`, `probe`, `verify` | 저비용·되돌리기 쉬움 |
| 명시 호출만 | `init-exam`, `ingest`, `youtube`, `generate`, `serve` | 대량 LLM 호출·파일 대량 생성·프로세스 실행 |

- **description 작성 규칙**: 각 SKILL.md `description` 에 한국어 트리거 문구를 포함한다(예: drill → "문제 내줘 / 틀린 거 다시 / 반복 연습 / 약한 단원"). 영문 기능 설명만 쓰지 않는다. 길이는 1~2문장으로 제한해 always-on 토큰을 억제한다.
- **회귀 테스트**: `evals/` 에 "요청 문장 → 기대 커맨드" 케이스 20개 이상. `claude plugin eval` 로 실행, `claude plugin details` 로 always-on 토큰 비용 감시.
- **SessionStart 브리핑(§7.12)** 이 매 세션 첫 화면에서 추천 커맨드를 고정 노출한다.

---

## 8. 데이터 규격

### 8.1 `exam.yaml`

```yaml
schema_version: 1
exam:
  name: "샘플 자격시험"
  code: "sample-cert"
  criteria_version: "2026"        # 출제기준 개정 추적용
  criteria_source: "criteria/2026_criteria.pdf"
  verified: true                   # 원문 확인 여부 (P3)
  exam_date: 2026-12-05            # 선택
stages:
  - id: "1st"
    name: "1차 필기"
    time_minutes: 90
    pass_rule:
      type: "subject_min_and_average"   # 과락 + 평균
      subject_min: 40
      average_min: 60
    subjects:
      - id: "s1"
        name: "과목 A"
        items: 20
        handler: "mcq"
        choices: 4
        weight: 1.0
      - id: "s2"
        name: "과목 B"
        items: 20
        handler: "short_answer"
    difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }
  - id: "2nd"
    name: "2차 논술"
    handler: "essay_rubric"          # v1.5 전까지 UNSUPPORTED 경고
    rubric_source: "criteria/rubric.md"
youtube:
  direct_fetch: false                # 경로 ① opt-in
locale: "ko"
```

### 8.2 문항 frontmatter (`03_Questions/Items/<id>.md`)

```yaml
---
id: "sample-cert_s1_a3f9c2"        # {exam.code}_{subject}_{hash}, 연도 미포함
stage: "1st"
subject: "s1"
taxonomy: ["[[과목 A/단원 2/소단원 2-3]]"]
type: "mcq"
difficulty: "standard"
source: "original"                  # original | generated | user_upload
seed_items: []                      # generated 인 경우 시드 ID
source_ref: "2025년 기출 12번"
status: "verified"                  # draft | verified | rejected | needs_answer
attachments: ["Attachments/a3f9c2.png"]
answer: 3
choices: 4
fsrs: { stability: 4.2, difficulty: 5.1, due: 2026-09-24 }   # 요약, 원본은 .kern/
stats: { attempts: 3, correct: 2, avg_sec: 71 }
---
## 문제
...
## 선지
1. ...
## 해설
(solve 3단계 형식)
```

### 8.3 시도 로그 (`04_Logs/attempts.jsonl`, append-only)

```json
{"ts":"2026-09-21T14:30:00+09:00","item":"sample-cert_s1_a3f9c2","mode":"drill","answer":2,"correct":false,"sec":88,"handler":"mcq","confidence":"deterministic","rating":"Again"}
```

### 8.4 핸들러 인터페이스 (`scripts/graders/`)

```ts
export interface Grader {
  id: string;                                   // "mcq" | "short_answer" | ...
  grade(item: Item, answer: string): GradeResult;
}
export interface GradeResult {
  correct: boolean | null;                      // null = 판정 불가
  score: number;                                // 0..1
  feedback: string[];
  confidence: "deterministic" | "llm";
}
```

---

## 9. 비기능 요구사항

| 항목 | 요구 |
|---|---|
| 언어 | 사용자 대면 텍스트 한국어. 키·ID·커맨드·경로 영문 |
| 런타임 | Node ≥ 20 단일 런타임(TypeScript). Python 의존 없음. `kern serve` 는 Node 내장 `http` 만 사용. 경로 ① 사용 시에만 `yt-dlp` 외부 바이너리 |
| 결정성 | 채점·FSRS·집계는 동일 입력에 동일 출력. 스크립트 단위 테스트 필수 |
| 비용 | LLM 호출은 생성·검증·해설·루브릭에 한정. 채점·통계에는 LLM 미사용 |
| 프라이버시 | 학습 데이터는 vault 밖으로 나가지 않음(Claude 세션 경유 제외). 텔레메트리 없음 |
| 저장소 정책 | 공개 저장소에는 엔진 + 자작 샘플만. vault는 `.gitignore`. 시험 기출·교재 절대 커밋 금지 |
| 라이선스 | MIT. GPL 계열 의존성 추가 금지 (핸들러 확장은 별도 저장소) |
| 플랫폼 | macOS/Linux 우선. Windows는 네이티브 Claude Code 기준으로 경로 구분자·셸 차이를 스크립트에서 흡수(검증 TODO) |
| 회귀 테스트 | `evals/` 에 커맨드별 기대 출력 케이스 ≥ 10개, `claude plugin eval` 로 실행 |

---

## 10. 검증 계획

- **샘플 시험 2종**(자작, 저장소 포함):
  - `examples/sample-cert/` — 2과목 객관식 + 단답, 과락/평균 합격규칙, 문항 40개.
  - `examples/sample-essay/` — 1차 객관식 + 2차 논술(루브릭), v1.5 검증용.
- **G1 검증**: `sample-cert` 로 전 커맨드 통과 후, `sample-essay` 를 `init-exam` 만으로 세팅. 코드 수정이 발생하면 실패로 기록하고 스키마를 개정한다.
- **실제 시험 검증**: 사용자가 정한 첫 실제 시험(미정)의 private vault. 결과는 저장소에 올리지 않는다.

---

## 11. 확장점 (범위 밖, 인터페이스만 보장)

- **시험별 실기 검증기**: `Grader` 인터페이스를 구현한 별도 플러그인(예: 스프레드시트 수식 계산 대조, 코드 실행 채점). 본 저장소는 `handler` 이름으로 외부 핸들러를 참조할 수 있어야 한다(`handler: "ext:<plugin>:<grader>"`). 라이선스가 다른 의존성은 그쪽에서 처리.
- **다른 입력 소스**: 팟캐스트 오디오, PDF 강의노트 등 — `01_Sources/` 규격에 맞는 ingest skill 추가.
- **대시보드**: §7.13 v2.

---

## 12. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| LLM 생성 문항의 오류·복수 정답 | 잘못된 학습 | `verify` 게이트(§7.6), draft/verified 분리, 시드 없는 생성 금지 |
| 출제기준 개정으로 문제은행 무효화 | 헛공부 | `criteria_version` 필드, 개정 시 구버전 문항 필터·재검토 큐 |
| YouTube 경로 ① 차단·UI 변경 | 기능 실패 | ①은 opt-in, ②③ 기본. Web Clipper 셀렉터 변경은 알려진 유지보수 항목 |
| 분류체계 자동 추출 실패 | 세팅 지연 | 실패를 정상 흐름으로 설계, 수동 편집 안내 |
| FSRS 4단계 매핑 부정확 | 복습 간격 왜곡 | §7.9 매핑을 파라미터화, 로그 100건 후 재조정 |
| 논술 채점 신뢰 과잉 | 오판 | `confidence: "llm"` 강제 표시, 점수 대신 구간·루브릭 항목별 피드백 중심 |
| `kern serve` 미실행 상태에서 답안 유실 | 모의고사 결과 손실 | `file://` 다운로드 폴백, 브라우저 localStorage 임시 보관 |
| Windows 셸·경로 차이 | 스크립트 실패 | Node로 경로 처리, 셸 스크립트 최소화. 검증 TODO |
| 시험 하나로 설계한 스키마의 과잉·과소 일반화 | 두 번째 시험에서 코드 수정 발생 | 두 번째 샘플 시험 시점에 `schema_version` 2 개정을 로드맵에 명시 |

---

## 13. 미결정 사항 · 가정

| # | 항목 | 현재 가정 | 결정 시점 |
|---|---|---|---|
| Q1 | 첫 실제 검증 시험 | 미정 (사용자 결정) | 로드맵 단계 3 이후 |
| Q2 | 개발 OS | macOS/Linux 우선, Windows 검증 TODO | 개발 시작 시 |
| Q3 | `short_answer` 동의어 사전 위치 | `exam.yaml` 내 또는 `00_Exam/synonyms.yaml` | 단계 2 |
| Q4 | `essay_rubric` 루브릭 형식 | 항목·배점·판정 기준의 YAML | v1.5 착수 시 |
| Q5 | vault 다중 시험 지원 | 지원 안 함 (시험 1개 = vault 1개) | 변경 없음 |
| Q6 | `ts-fsrs` 정확한 버전 | 설치 시 `npm view ts-fsrs version` 으로 고정 | 단계 2 |

---

## 14. 반대 관점·반례

- **"PAIDEIA를 포크하면 되지 않나"**: PAIDEIA는 MIT이고 ingest·weakmap·statusline이 이미 있다. 반론이 성립한다. 그러나 채점 모델(손글씨 OCR·패턴 기반)과 폴더 구조가 객관식·과락 규칙과 맞지 않아 결국 절반 이상을 갈아엎게 된다. kern은 설계 원리(HW-density, append-only, 비전 ingest)를 차용하되 코드는 새로 쓴다.
- **"시험 불가지론은 첫 시험 품질을 떨어뜨린다"**: 맞다. 특화 없이 만든 문제 생성기는 특정 시험의 미묘한 문체를 놓칠 수 있다. 대응은 `traps.md`와 시드 기반 생성(§7.4)이지만, 이것이 충분한지는 첫 실제 시험 검증 전까지 알 수 없다.
- **"Claude Code 플러그인은 UI가 빈약하다"**: 타이머·마스킹 UI 없이 파일 기반으로 우회하는 방식은 실전 감각과 거리가 있다. 이 한계가 치명적이면 v2에서 단일 HTML 모의고사 화면을 만드는 선택지가 있다.
- **"결정적 채점 우선은 논술 시험에 무의미하다"**: 논술 중심 시험에서 kern의 가치는 채점이 아니라 분류체계·기출 빈도·복습 큐·튜터 모드에 있다. 그 시험에서는 `essay_rubric`을 "채점"이 아닌 "루브릭 항목별 자기점검 보조"로 써야 한다.
