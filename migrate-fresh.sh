# 1. Navigate to the project
cd ~/Desktop/Projects/smart-parking-lot-system/smart-parking-api

# 2. Drop all tables / recreate the schema (works for sqlite and postgres)
./venv/bin/python -m scripts.reset_db

# 3. Run migrations
./venv/bin/alembic upgrade head

# 4. Seed default data
./venv/bin/python -m scripts.seed
