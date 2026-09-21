#!/bin/sh
exec node "$(dirname "$0")/../_fixtures/seed-criteria.ts" full
