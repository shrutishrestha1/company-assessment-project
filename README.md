# HimalRemit — Japan → Nepal Money Transfer

HimalRemit is a full-stack money transfer application that allows users to send money from Japan to Nepal.

Tech Stack:
- Frontend: React (SPA)
- Backend: Express (REST API)
- Database: Microsoft SQL Server
- Caching & Rate Limiting: Redis
- Messaging: Kafka

---

## Prerequisites

Make sure you have the following installed:

- Node.js (v18 or newer)
- npm (comes with Node)
- Docker Desktop (must be running)
- Gmail (optional, only for real OTP emails)

---

## GitHub Codespaces (Optional)

You can run this project in the cloud using GitHub Codespaces.

Steps:
1. Push this repo to GitHub (do NOT push backend/.env or frontend/.env).
2. Go to Code → Codespaces → Create codespace.
3. Wait 10–20 minutes for setup (Docker images + dependencies).

What happens automatically:
- .env files are created if missing
- Dummy login is enabled (OTP = 123456)
- Docker containers start
- Database schema is applied

Run inside Codespace:

Terminal 1:
cd backend && npm run dev

Terminal 2:
cd frontend && npm start

Ports:
- Frontend: 3000
- Backend API: 5001

---

## Local Installation

### 1. Go to project folder

cd remit-app

---

### 2. Start Docker services

docker compose up -d

Wait 30–60 seconds, then check:

docker compose ps

---

### 3. Create database schema

Option A (Recommended):

docker cp backend/src/config/schema.sql remit-mssql:/tmp/schema.sql

docker exec remit-mssql /opt/mssql-tools18/bin/sqlcmd \
-S localhost -U sa -P 'YourStrong@Password123' -C -i /tmp/schema.sql

---

Option B (GUI):

Use Azure Data Studio or SSMS:

Server: localhost,1433  
User: sa  
Password: YourStrong@Password123  

Run:
backend/src/config/schema.sql

---

### 4. Backend setup

cp backend/.env.example backend/.env

Edit backend/.env:

PORT=5001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrong@Password123
DB_NAME=remit_db
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKER=localhost:9092
JWT_SECRET=your-secret-key
AUTO_PROVISION_USERS=true
AUTO_PROVISION_ROLE=operator

Add:
FRONTEND_URL=http://localhost:3000

---

### 5. Frontend setup

cp frontend/.env.example frontend/.env

Add:

REACT_APP_API_URL=http://localhost:5001/api

---

### 6. Install dependencies

Backend:
cd backend
npm install

Frontend:
cd frontend
npm install

---

### 7. Run the application

Terminal 1:
cd backend
npm run dev

Terminal 2:
cd frontend
npm start

---

### 8. Verify

API:
http://localhost:5001/health

Frontend:
http://localhost:3000

---

## Email / OTP

### Real OTP (Email)

Each login sends a 6-digit OTP to the entered email.

Set:

LOCAL_DEV_DUMMY_AUTH=false
OTP_LOG_ONLY=false

Gmail setup:

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=HimalRemit <your-email@gmail.com>

Note: Use Gmail App Password (not normal password).

---

### Auto User Creation

AUTO_PROVISION_USERS=true

- Any email can login
- User is created automatically

---

### Dev Mode (No Email)

LOCAL_DEV_DUMMY_AUTH=true
DEV_FIXED_OTP=123456

- No email sent
- OTP is fixed

---

## First Login

1. Open http://localhost:3000  
2. Enter email  
3. Click Send OTP  
4. Enter OTP  

- Real email → check inbox  
- Dev mode → use 123456  

---

## Rate Limiting

- 5 OTP requests per 15 minutes
- Stored in Redis

If blocked:
- Wait OR
- Clear Redis keys (otp-rl:*)

---

## Project Structure

remit-app/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md

---

## API Endpoints

Auth:
POST /api/auth/send-otp  
POST /api/auth/verify-otp  
POST /api/auth/logout  
GET /api/auth/me  

Other:
- /api/users
- /api/senders
- /api/receivers
- /api/transactions

Header required:
Authorization: Bearer <token>

---

## Business Rules

Transfer Amount → Fee

0 – 100,000 → NPR 500  
100,001 – 200,000 → NPR 1,000  
Above 200,000 → NPR 3,000  

Exchange Rate:
1 JPY = 0.92 NPR

---

## Architecture

React (3000)  
→ Express API (5001)  
→ SQL Server + Redis + Kafka  

---

## Security

- JWT Authentication
- Redis token blacklist
- OTP expiry
- Rate limiting
- Input validation
- Roles: admin, operator

---

## Troubleshooting

Port issue → use 5001  
SQL error → check Docker + password  
OTP email fail → use Gmail App Password  
Login issue → check user exists  
Too many OTP → wait or clear Redis  
Kafka warning → usually safe  

---

## License

Use and modify as needed.  
Change all default secrets before production.