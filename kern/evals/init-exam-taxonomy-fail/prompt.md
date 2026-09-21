---
description: 단원 정보가 없는 원문이면 init-exam 이 단원을 지어내지 않고 taxonomy.md 스켈레톤을 유지한 채 수동 편집 안내를 출력하는지 확인한다
tags: [init-exam, needs-bash]
runs: 1
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/kern:init-exam
