# MEDIVISION - Project Structure

## 📁 Root Directory
```
MEDIVISION-main/
├── 📄 README.md                    # Main project documentation
├── 📄 ARCHITECTURE.md              # System architecture
├── 📄 TESTING_GUIDE.md            # Testing procedures
├── 📄 PMDC_WAF_BYPASS_SOLUTION.md # PMDC verification technical docs
├── 🔧 START_ALL_SERVERS.bat      # Start both backend & frontend
├── 🔧 RESTART_SERVERS.bat         # Restart all servers
├── 🔧 STOP_MEDIVISION.bat         # Stop all servers
├── 🔧 StartServers.ps1            # PowerShell alternative
├── 📁 backend/                     # Node.js backend (legacy)
├── 📁 backend_fastapi/             # FastAPI backend (main)
└── 📁 frontend/                    # React frontend
```

## 📁 Backend (FastAPI) - Port 5000
```
backend_fastapi/
├── 📄 requirements.txt            # Python dependencies
├── 📄 reset_user_password.py     # Password reset utility
└── app/
    ├── 📄 __init__.py
    ├── 📄 main.py                 # FastAPI app entry point
    ├── 📁 config/                 # Configuration
    │   ├── database.py            # MySQL connection pool
    │   ├── mongodb.py             # MongoDB connection
    │   └── settings.py            # Environment settings
    ├── 📁 models/                 # Data models
    │   └── schemas.py             # Pydantic schemas
    ├── 📁 routers/                # API endpoints
    │   ├── auth.py                # Patient authentication
    │   ├── doctor_auth.py         # Doctor authentication  
    │   ├── patient_profile.py     # Patient profile management
    │   └── xray_chat.py           # X-ray AI chat
    ├── 📁 services/               # Business logic
    │   ├── email_service.py       # Email/OTP service
    │   ├── pmdc_verification.py   # PMDC verification (WAF bypass)
    │   └── rag_service.py         # RAG AI service
    └── 📁 utils/                  # Utilities
        └── otp_generator.py       # OTP generation/validation
```

## 📁 Frontend (React) - Port 3000
```
frontend/
├── 📄 package.json                # Dependencies
├── 📁 public/                     # Static assets
│   ├── index.html
│   └── images/
└── src/
    ├── 📄 App.js                  # Main app component
    ├── 📄 index.js                # Entry point
    ├── 📁 components/             # Reusable components
    │   ├── DoctorLayout.js        # Doctor layout wrapper
    │   ├── PatientLayout.js       # Patient layout wrapper
    │   ├── Logo.js                # App logo
    │   └── OTPVerification.js     # OTP modal
    ├── 📁 pages/                  # Page components
    │   ├── DoctorRegisterPage.js  # Doctor registration
    │   ├── DoctorLoginPage.js     # Doctor login
    │   ├── DoctorDashboard_new.js # Doctor dashboard
    │   ├── DoctorAllPatients.js   # Patient list
    │   ├── PatientRegisterPage.js # Patient registration
    │   ├── PatientLoginPage.js    # Patient login
    │   ├── PatientDashboard.js    # Patient dashboard
    │   └── XRayAnalysis.js        # X-ray analysis page
    └── 📁 styles/                 # CSS files
```

## 📁 Legacy Backend (Node.js) - Deprecated
```
backend/
├── 📄 package.json
├── 📄 server.js                   # Express server
├── 📁 config/                     # Database configs
├── 📁 routes/                     # API routes
├── 📁 services/                   # Services (PMDC, email)
└── 📁 data/                       # Knowledge base JSON
```

## 🗄️ Databases

### MySQL (medivision_db)
- **doctors** - Doctor accounts
- **pending_doctors** - Pending registrations (OTP)
- **patients** - Patient accounts  
- **pending_users** - Pending patient registrations

### MongoDB (medivision)
- **xray_analyses** - X-ray scan results
- **chat_sessions** - AI chat history

## 🚀 Quick Start

### Development
```bash
# Start everything
START_ALL_SERVERS.bat

# Or manually:
# Backend
cd backend_fastapi
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload

# Frontend  
cd frontend
npm start
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs

## 📋 Key Features

1. **Doctor Registration**
   - ✅ PMDC verification against pmdc.pk (bypasses WAF)
   - ✅ Email OTP verification
   - ✅ Secure password hashing (bcrypt)

2. **Patient Registration**
   - ✅ Email OTP verification
   - ✅ CNIC validation

3. **X-ray Analysis**
   - ✅ AI-powered pneumonia/TB detection
   - ✅ RAG-based medical chat
   - ✅ Groq LLM integration

4. **Security**
   - ✅ JWT authentication
   - ✅ CORS protection
   - ✅ Password encryption
   - ✅ OTP expiry (5 minutes)

## 📦 Dependencies

### Backend
- FastAPI
- uvicorn
- mysql-connector-python
- pymongo
- undetected-chromedriver (PMDC verification)
- bcrypt
- python-jose (JWT)
- groq (AI)

### Frontend
- React 18
- React Router
- Axios (HTTP client)

## 🔧 Configuration

### Environment Variables (backend_fastapi/.env)
```
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_secret_key
GROQ_API_KEY=your_groq_key
```

### Database Setup
```bash
# MySQL
mysql -u root -p < backend/database/schema.sql

# MongoDB
# Starts automatically
```

## 🧹 Project Cleanup Summary

### Removed Files
- ❌ All test_*.py files
- ❌ All debug_*.py files
- ❌ Backup files (*_backup.*)
- ❌ Redundant batch files
- ❌ Old documentation files
- ❌ pmdc_results.* debug outputs

### Kept Essential Files
- ✅ Core backend/frontend code
- ✅ Main README and architecture docs
- ✅ START_ALL_SERVERS.bat (main launcher)
- ✅ RESTART_SERVERS.bat
- ✅ STOP_MEDIVISION.bat

---

**Last Updated**: February 14, 2026
**Version**: 2.0 (Cleaned & Structured)
