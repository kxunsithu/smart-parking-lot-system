#!/usr/bin/env bash
# migrate-fresh.sh — drop schema, run all migrations, then seed.
# ⚠️  This destroys all existing data.
set -e  # abort on first error

# 1. Navigate to the API directory
cd ~/Desktop/Projects/smart-parking-lot-system/smart-parking-api

# 2. Force-load .env so it overrides any DATABASE_URL already in the shell
#    (e.g. a Railway / Docker internal URL that is unreachable from localhost).
#    We parse line-by-line instead of `source .env` because bash cannot handle
#    unquoted values that contain spaces (e.g. APP_NAME=Smart Parking System).
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip blank lines and comments
    [[ -z "$line" || "$line" == \#* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    export "$key=$value"
done < .env

echo ">>> Using DATABASE_URL: ${DATABASE_URL%%@*}@***"

# 3. Drop and recreate the schema
./venv/bin/python -m scripts.reset_db

# 4. Apply all Alembic migrations
./venv/bin/alembic upgrade head

# 5. Seed default data
./venv/bin/python -m scripts.seed
