---
description: 샘플 원문이 있을 때 init-exam 이 원문 값 그대로 exam.yaml(verified true)·taxonomy.md 를 만들고 validate-exam 통과로 끝나는지 확인한다
tags: [init-exam, needs-bash]
runs: 1
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash, Write, Edit]
---

/kern:init-exam
