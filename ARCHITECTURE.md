# MEDIVISION Architecture & Testing Guide

This document summarizes the current MEDIVISION system based on the repository’s code. It covers architecture, technologies, key modules, API endpoints, security measures, and testing guidance.

## 1) Overview
- Client–Server web app for medical triage, X-ray validation, and RAG‑based Q&A.
- Frontend: React SPA (CRA). Backend: Node.js/Express. Persistence: MySQL (users/doctors) + MongoDB (patient profiles and X-ray data).
- Python helper validates chest X‑rays. RAG service powers chatbot with knowledge base context.

```mermaid
flowchart LR
  A[Web Client (React)] -->|REST/JSON| B[(Express API)]
  B -->|Relational auth/OTP| C[(MySQL)]
  B -->|Profiles + Images| D[(MongoDB)]
  B -->|Spawn| E[(Python xrayValidator.py)]
  B -->|RAG/LLM| F[(RAG Service: OpenAI/Groq)]
```

## 2) Tech Stack
- Backend:
  - express, cors, dotenv, express-validator
  - bcryptjs (password hashing)
  - mysql2 (pool/promise), mongodb (native driver)
  - multer (uploads, size/type limits)
  - nodemailer (email OTP), axios
  - selenium-webdriver, chromedriver, cheerio (PMDC verification helpers)
  - groq-sdk, openai (RAG/LLM)
  - dev: nodemon
- Frontend:
  - react 18, react-dom, react-router-dom 6
  - react-scripts 5 (CRA), web-vitals
  - @testing-library/* (jest-dom, react, user-event)

## 3) Backend Architecture
- Entry: `backend/server.js`
  - Binds to `0.0.0.0` and exposes `/api/*`
  - Middlewares: `cors`, `express.json({ limit: '50mb' })`, `urlencoded`
  - Health check: `GET /api/health`
  - Global error handler and process-level handlers for stability
  - Mounts routes:
    - `/api/auth` → `routes/auth.js`, `routes/doctorAuth.js`
    - `/api/chat` → `routes/chat.js`
    - `/api/xray` → `routes/xrayValidation.js`
    - `/api/patient` → `routes/patientProfile.js`
- Config:
  - MySQL: `backend/config/database.js` (promise pool + connection test)
  - MongoDB: `backend/config/mongodb.js` (connect/getDB with timeouts)
- Services (highlights):
  - `services/emailService.js` (send verification/welcome emails)
  - `services/pmdcVerification.js`, `services/pmdcSelenium.js` (PMDC validation)
  - `services/llm/ragService.js` (RAG powered chat, report analysis)
  - `services/xrayValidator.py` (chest X‑ray validation via Python)
- Utilities:
  - `utils/otpGenerator.js` (OTP create/validate/resend cooldown)

## 4) API Endpoints (by route)
Base paths from `server.js` are included below for clarity.

- `/api/auth` (users): `routes/auth.js`
  - `POST /register` — Register user, send email OTP
  - `POST /login` — Login (requires verified account)
  - `POST /verify-otp` — Verify email OTP; moves pending → users
  - `POST /resend-otp` — Resend verification OTP with cooldown
  - `POST /forgot-password` — Start password reset (OTP)
  - `POST /verify-reset-otp` — Verify reset OTP
  - `POST /reset-password` — Reset password (hash + clear OTP)
  - `POST /resend-reset-otp` — Resend reset OTP with cooldown

- `/api/auth` (doctors): `routes/doctorAuth.js`
  - `POST /validate-pmdc` — Validate PMDC from official site
  - `POST /doctor-register` — Register doctor (PMDC required), send OTP
  - `POST /doctor-login` — Login (verified doctor)
  - `POST /doctor-verify-otp` — Verify registration OTP
  - `POST /doctor-resend-otp` — Resend registration OTP
  - `POST /doctor-forgot-password` — Start doctor password reset (OTP)
  - `POST /doctor-verify-reset-otp` — Verify doctor reset OTP
  - `POST /doctor-reset-password` — Reset doctor password
  - `POST /doctor-resend-reset-otp` — Resend doctor reset OTP

- `/api/chat`: `routes/chat.js`
  - `POST /message` — Chat with RAG; `sessionId` maintains short history
  - `POST /upload` — Upload medical report (JPEG/PNG/PDF) for analysis
  - `POST /clear` — Clear conversation history for a session
  - `GET /health` — Chatbot capability health/status

- `/api/xray`: `routes/xrayValidation.js`
  - `POST /validate-xray` — Validate X‑ray by spawning Python script

- `/api/patient`: `routes/patientProfile.js`
  - `POST /submit-profile` — Create patient profile + X‑ray image (base64) and validate
  - `GET /profile/:email` — Get most recent profile by email
  - `GET /profiles/:email` — List all profiles for an email (history)
  - `GET /all-profiles` — Admin/test HTML table; `?format=json` returns JSON

## 5) Data Storage
- MySQL (via `mysql2`): relational entities, credentials, OTP fields
  - Tables used in code: `users`, `pending_users`, `doctors`, `pending_doctors`
  - Passwords are `bcrypt` hashed; OTP fields and expirations maintained
- MongoDB (via native driver): `medivision_profiles.patient_profiles`
  - Stores patient profile documents including base64 X‑ray images, metadata, and validation results

## 6) Security Measures
- Validation: `express-validator` on all auth/OTP endpoints; PMDC inputs
- Passwords: `bcryptjs` hashing; no plaintext storage
- OTP: time‑bound with explicit cooldown checks (rate‑like throttle)
- Upload safety: `multer` with file type whitelist and 10MB size limit
- API hygiene: CORS enabled; JSON/urlencoded limits explicitly increased for image payloads
- Stability: process‑level `uncaughtException`/`unhandledRejection` handlers, centralized error middleware
- External checks: PMDC verification via automated lookup (selenium/cheerio)
- Note: JWT/session auth isn’t present in code paths; consider adding for protected routes

## 7) Frontend Structure (high level)
- CRA structure under `frontend/src`
  - Pages: `pages/*` (DoctorDashboard, PatientDashboard, Login/Register flows, etc.)
  - Components: `components/*` (layouts, OTP verification, logo, etc.)
  - Styles: `styles/*` and page/component CSS files
- Theming: patient‑portal palette applied (very‑dark‑teal navbar/sidebar; beige background); notification bell in navbar; dashboard cards; SVG pie chart for disease categories

## 8) Testing Approach
- Frontend:
  - Testing Library stack available (`@testing-library/*`) for unit/integration
  - Suggested coverage: dashboard rendering, navigation, OTP UI flows, pie chart legend segments
- Backend (suggested):
  - Add Jest + Supertest for route tests (auth, doctorAuth, chat, patientProfile, xrayValidation)
  - Mock external dependencies: MySQL pool, MongoDB client, nodemailer, PMDC verification, RAG service
- Manual checks:
  - `GET /api/health` (backend up), `GET /api/chat/health` (chat service up)
  - Full OTP flows for user and doctor; profile submit + X‑ray validation path
- Future hardening:
  - Add `helmet`, rate limiting, request ID + structured logging
  - Persist chat sessions in DB with retention policy

## 9) Local Setup & Run
- Prerequisites: Node.js 18+, Python 3 (for `xrayValidator.py`), MongoDB, MySQL
- Environment: configure `.env` for MySQL, MongoDB URI, SMTP (email OTP), and LLM keys (OpenAI/Groq) used by `ragService`
- Install & run:
  - Backend
    - `cd backend`
    - `npm install`
    - `npm run dev` (nodemon) or `npm start`
  - Frontend
    - `cd frontend`
    - `npm install`
    - `npm start` (CRA dev server)

## 10) Roadmap Ideas
- Add JWT auth and protected routes; refresh tokens
- Centralize config/secrets management; typed env validation
- Introduce Swagger/OpenAPI for API docs + client generation
- Add CI (lint/test) and pre‑commit hooks; basic e2e smoke tests
- Replace base64 image storage with object storage (e.g., S3) + URLs

---
If you want, I can add a Swagger spec, Jest/Supertest boilerplate for backend APIs, or a simple Postman collection aligned with the above endpoints.
