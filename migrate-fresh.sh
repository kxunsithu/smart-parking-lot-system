# 1. Navigate to the project
cd ~/Desktop/smart-parking-lot-system/smart-parking-api

# 2. Delete existing database
rm -f smart_parking.db

# 3. Run migrations
./venv/bin/alembic upgrade head

# 4. Seed default data
./venv/bin/python -m scripts.seed
