#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NEW_BACKEND_ENV=false
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  NEW_BACKEND_ENV=true
fi
if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
fi

# In GitHub Codespaces, prefer dummy OTP + auto-provision when we just created .env
# so the app runs without pasting Gmail secrets. Edit backend/.env for real SMTP.
if [ "${CODESPACES:-}" = "true" ] && [ "$NEW_BACKEND_ENV" = true ]; then
  sed -i 's/^LOCAL_DEV_DUMMY_AUTH=false/LOCAL_DEV_DUMMY_AUTH=true/' backend/.env || true
  sed -i 's/^AUTO_PROVISION_USERS=false/AUTO_PROVISION_USERS=true/' backend/.env || true
fi

echo "Installing npm dependencies..."
npm install --prefix backend
npm install --prefix frontend

echo "Starting Docker services (first pull can take several minutes)..."
docker compose -f docker-compose.yml up -d

echo "Waiting for SQL Server..."
ready=0
for i in $(seq 1 90); do
  if docker exec remit-mssql /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P 'YourStrong@Password123' -C -Q "SELECT 1" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "WARNING: SQL Server not ready in time. After the container is healthy, run:"
  echo "  docker cp backend/src/config/schema.sql remit-mssql:/tmp/schema.sql"
  echo "  docker exec remit-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -C -i /tmp/schema.sql"
  exit 0
fi

docker cp backend/src/config/schema.sql remit-mssql:/tmp/schema.sql
docker exec remit-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Password123' -C -i /tmp/schema.sql

echo ""
echo "=== RemitApp Codespace ready ==="
echo "Terminal 1:  cd backend && npm run dev"
echo "Terminal 2:  cd frontend && npm start"
echo "Open forwarded port 3000 (React). API: port 5001."
