# sample-cert — 자작 샘플 시험

kern 의 각 단계 완료 기준(DoD)을 재현하기 위한 **자작 시험**이다. 실제 시험이 아니며, 실제 시험의 이름·출제기준·기출·교재 내용을 포함하지 않는다.

## 구성

| 항목 | 값 |
|---|---|
| stage | `1st` (1차 필기, 90분) 1개 |
| 과목 | `s1` 과목 A — `mcq` 4지선다 20문항 / `s2` 과목 B — `short_answer` 20문항 |
| 합격 규칙 | `subject_min_and_average`: 과목별 40점 이상(과락), 평균 60점 이상 |

구조는 `docs/prd.md` §8.1 을 따른다. 2차 논술 stage 는 넣지 않았다(논술은 S7 의 `examples/sample-essay/`).

## 현재 상태 (S1)

| 파일 | 역할 |
|---|---|
| `criteria/2026_criteria.md` | 자작 출제기준 원문. `init-exam` 의 입력 |
| `exam.yaml` | 원문에서 나와야 하는 기대 프로파일. `verified: true` |
| `taxonomy.md` | 원문 §5 에서 나와야 하는 기대 분류체계 (과목 2 · 단원 6 · 소단원 14) |

- **문항 40개 본문은 아직 없다** (S1 범위 아님).
- 과목·단원 이름은 추상 명칭(과목 A, 단원 1 …)뿐이고 개념 내용은 없다.
- `exam_date`(선택 필드)는 넣지 않았다. 원문에도 "미정"이다.
- `youtube`·`locale` 은 원문에 없는 기본값이다.
- 검증: `kern validate-exam examples/sample-cert/exam.yaml` 과 `kern/scripts/test/sample-cert.test.ts` (스키마·원문 파일 가드·taxonomy 과목 헤더·원문 단원 누락 여부). 원문 수치와 `exam.yaml` 값의 1:1 대조는 사람이 했고, 자동 검사는 없다.
