---
description: 원문 없이 init-exam 을 실행하면 값을 지어내지 않고 exam.yaml 을 쓰지 않으며 확인 요청 고정 문구를 출력하는지 확인한다
tags: [init-exam, needs-bash]
runs: 1
max_turns: 30
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/kern:init-exam 출제기준 원문은 없어. 시험 이름이 "가상 시험"이라는 것만 알아. 다른 값은 나도 몰라.
