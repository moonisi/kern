---
name: init-exam
description: 출제기준 원문으로 시험 프로파일(exam.yaml)과 분류체계(taxonomy.md)를 만든다. "시험 등록 / 새 시험 세팅 / 출제기준 넣기" 요청에 학습자가 직접 입력해 실행한다.
disable-model-invocation: true
argument-hint: "[출제기준 원문 경로]"
---

# init-exam — 시험 프로파일 생성

현재 디렉토리를 vault 루트로 보고 `00_Exam/exam.yaml` 과 `00_Exam/taxonomy.md` 를 만든다.

학습자 입력: $ARGUMENTS

kern CLI 는 아래 형태로 실행한다(이하 `kern <서브커맨드>` 로 줄여 쓴다).

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/src/cli.ts" <서브커맨드>
```

## 반드시 지킬 규칙

- **시험 정보를 기억으로 채우지 않는다.** `exam.yaml` 의 값은 (a) 원문 파일에서 `exam-profiler` 가 인용과 함께 추출한 값, (b) 학습자가 이 대화에서 직접 말한 값, (c) 아래 "kern 기본값" 셋뿐이다. 시험명을 알아봐도 과목·문항 수·시간·합격 기준을 기억에서 가져오지 않는다.
- 모르면 모른다고 답한다. 추측을 사실처럼 쓰지 않는다.
- 근거 노트(`[[백링크]]`) 없이 문항을 만들지 않는다. 출제기준·법령·통계·정답을 출처 없이 지어내지 않는다. 출처 없는 출제기준은 `verified: false` 다.
- 채점 결과를 바꾸지 않는다. 문항 `status` 를 `verified` 로 직접 쓰지 않는다. (`exam.verified` 는 문항 상태가 아니라 "원문 대조 여부"이며 아래 절차대로만 쓴다.)
- `kern validate-exam` 이 `통과` 를 출력하지 않았는데 완료했다고 보고하지 않는다. 실행하지 않은 명령의 결과를 쓰지 않는다.
- 이미 있는 `00_Exam/exam.yaml` 은 학습자가 명시적으로 동의하기 전에는 덮어쓰지 않는다.

## 절차 (순서 고정)

1. **vault 구조**: `kern init-vault .` 을 실행한다. 실패(exit 1)하면 출력 메시지를 그대로 보여주고 멈춘다.
2. **원문 위치 확인**: `00_Exam/criteria/` 안의 파일을 찾는다.
   - 학습자가 다른 위치의 파일 경로를 줬으면 그 파일을 `00_Exam/criteria/` 로 복사한 뒤 사용한다(원본은 건드리지 않는다).
   - 파일이 여러 개면 어느 것이 출제기준 원문인지 학습자에게 묻는다.
   - 파일이 없으면 학습자에게 원문을 요청한다. 학습자가 원문이 없다고 하거나 물어볼 수 없는 상황이면 **원문 없음 경로**로 간다.
3. **추출 위임**: 서브에이전트 `kern:exam-profiler` 에 원문 경로를 넘겨 추출을 맡긴다. 직접 추출하지 않는다. 에이전트 보고의 `미확인` 필드는 학습자에게 물어 채운다. 학습자도 모르면 비워 둔다.
4. **`exam.yaml` 작성**: 아래 "exam.yaml 형식"대로 `00_Exam/exam.yaml` 을 쓴다.
   - 필수 필드 중 하나라도 값이 없으면 **파일을 쓰지 않고** 7단계로 가서 `미확인 필드` 에 나열한다. 빈 곳을 그럴듯한 값으로 메우지 않는다.
   - `exam.verified: true` 는 모든 시험 값이 원문 인용으로 뒷받침될 때만 쓴다. 학습자가 말로 알려준 값이 하나라도 섞이면 `false`.
5. **검증**: `kern validate-exam 00_Exam/exam.yaml` 을 실행한다. 실패하면 오류 메시지가 가리키는 필드만 고쳐 다시 실행한다. **최대 3회.** 3회 뒤에도 실패하면 마지막 오류 출력을 그대로 보고한다. 검증을 통과시키려고 원문과 다른 값을 쓰지 않는다.
6. **`taxonomy.md`**: 에이전트 보고가 `status: ok` 이고 `00_Exam/taxonomy.md` 가 아직 스켈레톤(“분류체계를 자동 추출하지 못했습니다” 안내문 포함)일 때만 "taxonomy.md 형식"대로 채운다. 그 외에는 파일을 건드리지 않는다(**분류 실패 경로**).
7. **결과 보고**: "결과 보고 형식" 블록을 출력한다.

## 예외 경로와 고정 문구

문구는 글자 그대로 출력한다. `<...>` 만 값으로 바꾼다.

### 원문 없음

`00_Exam/criteria/` 에 원문이 없고 받을 수도 없는 경우. `exam-profiler` 를 호출하지 않는다. 학습자가 대화에서 필수 값을 전부 말해 준 경우에만 `exam.yaml` 을 쓰며, 이때 `verified: false`, `criteria_source: "criteria/MISSING"` 으로 적는다. 값이 모자라면 파일을 쓰지 않는다. 어느 쪽이든 아래를 출력한다.

```text
출제기준 원문을 찾지 못했습니다. exam.verified 는 false 입니다. 원문 파일을 00_Exam/criteria/ 에 넣고 /kern:init-exam 을 다시 실행하거나, 아래 값을 직접 확인해 주세요.
```

### UNSUPPORTED

에이전트가 `UNSUPPORTED` 로 매핑한 과목마다 `handler: "UNSUPPORTED"` 로 기록하고 아래를 출력한다. 다른 핸들러로 바꿔 적지 않는다.

```text
경고: <stage id>/<subject id> 의 문항 유형 "<원문 표기>" 은 지원하는 핸들러가 없어 handler: UNSUPPORTED 로 기록했습니다. 이 과목은 모의고사에서 제외됩니다.
```

### 분류 실패

에이전트 보고가 `status: failed` 이거나 원문 없음 경로인 경우. `taxonomy.md` 스켈레톤을 그대로 두고 아래를 출력한다. 단원을 추측해 채우지 않는다.

```text
분류체계를 자동 추출하지 못했습니다. 00_Exam/taxonomy.md 를 직접 채워 주세요.
```

## exam.yaml 형식

키는 아래에 있는 것만 쓴다(그 외 키는 검증에서 거부된다). `#` 주석은 설명이며 파일에 옮기지 않아도 된다.

```yaml
schema_version: 1
exam:
  name: "<시험명>"
  code: "<영문 소문자·숫자·->"
  criteria_version: "<연도·판>"
  criteria_source: "criteria/<원문 파일명>"   # exam.yaml 기준 상대경로
  verified: <true|false>
  exam_date: "<YYYY-MM-DD>"                   # 선택. 모르면 키를 생략
stages:
  - id: "<단계 id>"
    name: "<단계명>"
    time_minutes: <양의 정수>
    pass_rule:
      type: "subject_min_and_average"         # 현재 이 형태만 지원
      subject_min: <0~100>
      average_min: <0~100>
    subjects:
      - id: "<과목 id>"
        name: "<과목명>"
        items: <양의 정수>
        handler: "<mcq|short_answer|UNSUPPORTED>"
        choices: <2 이상 정수>                # mcq 일 때만, 필수
        weight: <양수>                        # 선택. 원문에 있을 때만
    difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }
youtube:
  direct_fetch: false
locale: "ko"
```

**kern 기본값**(시험 정보가 아니라 kern 설정. 사용하면 결과 보고의 `기본값 사용` 에 적는다):
- `youtube.direct_fetch: false`, `locale: "ko"`
- `difficulty_mix: { basic: 0.3, standard: 0.5, advanced: 0.2 }` — 원문에 난이도 비율이 **없을 때만**. 원문에 있으면 원문 값을 쓴다(합은 1).

합격 기준이 `subject_min_and_average` 로 표현되지 않으면 `pass_rule` 은 `미확인` 이다. 비슷한 값으로 바꿔 넣지 않는다.

## taxonomy.md 형식

이름은 원문 표기 그대로. 각 노드는 `[[과목명/단원/소단원]]` 백링크.

```markdown
# 분류체계 (taxonomy)

> 출처: `criteria/<원문 파일명>`. 각 노드는 `[[과목/단원/소단원]]` 백링크다.

## <과목명> (<subject id>)

- [[<과목명>/<단원>]]
  - [[<과목명>/<단원>/<소단원>]]
```

## 결과 보고 형식 (고정)

마지막에 아래 블록을 그대로 출력한다. 해당하는 고정 문구(원문 없음·UNSUPPORTED·분류 실패)는 블록 **앞**에 둔다.

```text
## init-exam 결과
- exam.yaml: <작성됨 | 작성 안 함>
- verified: <true | false | 해당 없음>
- validate-exam: <통과 | 실패 | 실행 안 함>
- taxonomy.md: <채움 | 스켈레톤 유지>
- UNSUPPORTED: <없음 | stage/subject 목록>
- 기본값 사용: <없음 | 필드 목록>
- 미확인 필드: <없음 | 필드 목록>
```

`validate-exam: 실패` 이면 블록 아래에 마지막 오류 출력을 코드 블록으로 붙인다.

## 출력 규칙

- 학습자에게 보이는 글은 한국어. 커맨드명·키·ID·경로는 영문 그대로 쓴다.
