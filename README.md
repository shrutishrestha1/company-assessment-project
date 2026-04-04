# RemitApp — Japan to Nepal Money Transfer System

## Overview

RemitApp is a full-stack application built to simulate a real-world money transfer system from Japan to Nepal. It focuses on secure authentication, transaction processing, and scalable backend architecture.

The project uses React for the frontend, Express.js for backend APIs, Microsoft SQL Server for data storage, Redis for caching and rate limiting, and Kafka for handling asynchronous processes.

---

## Prerequisites

Before running the project, make sure you have the following installed:

* Node.js (version 18 or higher)
* npm (comes with Node.js)
* Docker Desktop (must be running)
* Gmail account (only required if you want to send real OTP emails)

---

## Running with GitHub Codespaces (Recommended)

This project includes a `.devcontainer` setup, so you can run everything in the cloud without installing anything locally.

### Steps

1. Push this project to GitHub (do not upload `.env` files)
2. Go to your repository → Click **Code → Codespaces → Create Codespace**
3. Wait for setup (first run may take 10–20 minutes)

### Run the app

Open two terminals:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm start
```

Then open:

* Frontend → Port 3000
* Backend → Port 5001

### Notes

* Codespaces automatically sets dummy login (OTP = 123456)
* Docker services are started automatically
* If needed, you can switch to real email OTP in `backend/.env`

---

## Local Installation (Windows / macOS / Linux)

### 1. Open the project

Navigate into the project folder:

```bash
cd remit-app
```

---

### 2. Start services using Docker

This will start:

* SQL Server
* Redis
* Kafka
* Zookeeper

```bash
docker compose up -d
```

Wait for 30–60 seconds, then check:

```bash
docker compose ps
```

All services should show **Up**.

---

### 3. Setup database schema

Run the following commands:

```bash
docker cp backend/src/config/schema.sql remit-mssql:/tmp/schema.sql
docker exec remit-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Password123' -C -i /tmp/schema.sql
```

This will create the database, tables, and initial data.

---

### 4. Configure backend

Create `.env` file:

```bash
cp backend/.env.example backend/.env
```

Important variables:

* `PORT=5001`
* `NODE_ENV=development`
* `DB_HOST`, `DB_USER`, `DB_PASSWORD` (must match Docker)
* `JWT_SECRET` (use any random string)

Also set:

```env
FRONTEND_URL=http://localhost:3000
```

---

### 5. Configure frontend

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5001/api
```

---

### 6. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

---

### 7. Run the application

Open two terminals:

Terminal 1 (Backend):

```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):

```bash
cd frontend
npm start
```

---

### 8. Verify everything is working

* Frontend → http://localhost:3000
* Backend → http://localhost:5001/health

You should see a response like:

```json
{ "status": "ok" }
```

---

## Authentication (OTP System)

### Real Email OTP

By default, OTP is sent via Gmail.

Set in `.env`:

```env
LOCAL_DEV_DUMMY_AUTH=false
OTP_LOG_ONLY=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=RemitApp <your-email@gmail.com>
```

Note: Use a Gmail **App Password**, not your normal password.

---

### Development Mode (Recommended)

For testing without email:

```env
LOCAL_DEV_DUMMY_AUTH=true
DEV_FIXED_OTP=123456
```

You can then log in using:

* Any email
* OTP: 123456

---

## First Login

1. Open http://localhost:3000
2. Enter any email
3. Click “Send OTP”
4. Enter OTP

* If using real email → check inbox
* If using dev mode → use `123456`

---

## Rate Limiting

OTP requests are limited to prevent abuse:

* Default: 5 requests per 15 minutes

If exceeded, wait or clear Redis keys (development only).

---

## Project Structure

```
remit-app/
├── backend/
│   ├── src/
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   ├── .env
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

### Authentication

* POST `/api/auth/send-otp`
* POST `/api/auth/verify-otp`
* POST `/api/auth/logout`
* GET `/api/auth/me`

### Other Modules

* Users → `/api/users`
* Senders → `/api/senders`
* Receivers → `/api/receivers`
* Transactions → `/api/transactions`

All protected routes require:

```
Authorization: Bearer <token>
```

---

## Business Logic

### Service Fee

| Amount (NPR)      | Fee   |
| ----------------- | ----- |
| 0 – 100,000       | 500   |
| 100,001 – 200,000 | 1,000 |
| Above 200,000     | 3,000 |

### Forex Rate

* 1 JPY = 0.92 NPR

---

## Architecture Overview

```
Frontend (React - Port 3000)
        ↓
Backend API (Express - Port 5001)
        ↓
Database (SQL Server)
        ↓
Redis (Caching / OTP / Rate limiting)
        ↓
Kafka (Optional processing)
```

---

## Security Features

* JWT-based authentication
* OTP verification system
* Redis-based rate limiting
* Secure database queries
* Role-based access (`admin`, `operator`)

---

## Troubleshooting

| Issue                   | Solution                |
| ----------------------- | ----------------------- |
| Docker not working      | Use GitHub Codespaces   |
| Database not connecting | Check Docker containers |
| OTP email error         | Use Gmail App Password  |
| Too many OTP requests   | Wait 15 minutes         |
| Kafka warnings          | Usually safe to ignore  |

---

## Note

* Do not upload `.env` files to GitHub
* Update secrets before production
* Kafka is optional for core functionality

---

## Conclusion

This project demonstrates a complete full-stack implementation of a remittance system, including authentication, API development, database integration, and scalable architecture using modern tools and technologies.

---
