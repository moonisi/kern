---
type: tool_order
before: { tool: Bash, input_match: 'cli\.ts.{0,10}init-vault' }
after: { tool: Bash, input_match: 'cli\.ts.{0,10}validate-exam' }
arm: with-only
---
