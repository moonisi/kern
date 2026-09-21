# sample-cert — 자작 샘플 시험

kern 의 각 단계 완료 기준(DoD)을 재현하기 위한 **자작 시험**이다. 실제 시험이 아니며, 실제 시험의 이름·출제기준·기출·교재 내용을 포함하지 않는다.

## 구성

| 항목 | 값 |
|---|---|
| stage | `1st` (1차 필기, 90분) 1개 |
| 과목 | `s1` 과목 A — `mcq` 4지선다 20문항 / `s2` 과목 B — `short_answer` 20문항 |
| 합격 규칙 | `subject_min_and_average`: 과목별 40점 이상(과락), 평균 60점 이상 |

구조는 `docs/prd.md` §8.1 을 따른다. 2차 논술 stage 는 넣지 않았다(논술은 S7 의 `examples/sample-essay/`).

## 현재 상태 (S0 초안)

- `exam.yaml` 만 있다. **문항 40개 본문은 아직 없다** (S0 범위 아님).
- `criteria_source` 가 가리키는 출제기준 원문(`criteria/`)은 S1 산출물이라 아직 없다. 그래서 `verified: false` 다.
- `exam_date`(선택 필드)는 넣지 않았다.
- `exam.yaml` 은 스키마 검증을 거치지 않았다. zod 스키마와 `kern validate-exam` 은 S1 에서 추가된다. S0 에서는 YAML 파서 의존성을 추가하지 않아 **수동 검토만** 했다.
