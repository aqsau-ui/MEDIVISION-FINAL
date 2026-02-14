# MEDIVISION - Medical Diagnosis Platform

## Project Structure

```
fypp 1/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── data/
│   │   └── knowledge_base/
│   │       └── medical_knowledge.md  # TB & Pneumonia knowledge base
│   ├── database/
│   │   ├── schema.sql           # Patient database schema
│   │   └── doctors_schema.sql   # Doctor database schema
│   ├── routes/
│   │   ├── auth.js              # Patient authentication
│   │   ├── doctorAuth.js        # Doctor authentication
│   │   └── chat.js              # AI chatbot API routes
│   ├── services/
│   │   ├── llm/
│   │   │   └── ragService.js    # RAG LLM service for medical Q&A
│   │   └── pmdcVerification.js  # PMDC verification service
│   ├── .env.example             # Environment variables template
│   ├── package.json             # Backend dependencies
│   └── server.js                # Main server file
│
└── frontend/
    ├── public/
    │   ├── images/
    │   │   └── doctoravatar.png # Dr. Jarvis avatar image
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Logo.js          # Logo component
    │   │   └── Logo.css
    │   ├── pages/
    │   │   ├── HomePage.js      # Landing page
    │   │   ├── LoginPage.js     # Patient login
    │   │   ├── RegisterPage.js  # Patient registration
    │   │   ├── DoctorLoginPage.js    # Doctor login
    │   │   ├── DoctorRegisterPage.js # Doctor registration
    │   │   ├── PatientDashboard.js   # Patient dashboard
    │   │   ├── PatientProfile.js     # Profile & X-ray upload
    │   │   └── DrAvatar.js           # AI chatbot interface
    │   ├── styles/
    │   │   ├── App.css
    │   │   └── index.css
    │   ├── App.js               # Main app component with routing
    │   └── index.js             # React entry point
    ├── package.json             # Frontend dependencies
    └── README.md                # This file
```

## Features

### Patient Portal
- ✅ User Registration & Authentication
- ✅ Patient Dashboard
- ✅ Medical Profile & X-ray Upload
- ✅ AI-Powered Chatbot (Dr. Jarvis)
  - TB & Pneumonia diagnosis information
  - Symptom analysis
  - Treatment recommendations
  - X-ray interpretation guidance
  - Medical report upload and analysis

### Doctor Portal
- ✅ Doctor Registration with PMDC Verification
- ✅ Doctor Authentication
- 🚧 Doctor Dashboard (coming soon)
- 🚧 Patient Report Review (coming soon)

### AI Chatbot (Dr. Jarvis)
- **RAG-based LLM**: Retrieval-Augmented Generation for accurate medical information
- **Specialized Knowledge**: Focus on Tuberculosis (TB) and Pneumonia
- **Medical Report Analysis**: Upload and interpret chest X-rays
- **Context-Aware**: Maintains conversation history
- **Fallback Responses**: Works even without OpenAI API

## Technology Stack

### Backend
- **Node.js** + **Express.js**: REST API server
- **MySQL**: Database for users and doctors
- **OpenAI GPT-3.5**: LLM for natural language understanding
- **Multer**: File upload handling
- **bcryptjs**: Password encryption

### Frontend
- **React 18**: UI framework
- **React Router**: Client-side routing
- **CSS3**: Styling with custom properties

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- OpenAI API key (optional, has fallback)

### 1. Clone the Repository
```bash
git clone https://github.com/aqsau-ui/MEDIVISION.git
cd MEDIVISION
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medivision_db
OPENAI_API_KEY=your-openai-key  # Optional
```

Set up database:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/doctors_schema.sql
```

Start backend:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend will run on http://localhost:3000
Backend API on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Patient registration
- `POST /api/auth/login` - Patient login
- `POST /api/auth/doctor/register` - Doctor registration
- `POST /api/auth/doctor/login` - Doctor login

### Chatbot
- `POST /api/chat/message` - Send message to Dr. Jarvis
- `POST /api/chat/upload` - Upload medical report
- `POST /api/chat/clear` - Clear conversation history
- `GET /api/chat/health` - Chatbot health check

## AI Chatbot Features

### Knowledge Base
The chatbot is trained on comprehensive medical information including:
- Tuberculosis symptoms, diagnosis, treatment
- Pneumonia symptoms, diagnosis, treatment
- Chest X-ray interpretation
- Risk factors and prevention
- Key differences between TB and Pneumonia

### RAG Implementation
- **Retrieval**: Finds relevant medical knowledge based on user query
- **Augmented**: Combines knowledge base with conversation context
- **Generation**: Uses GPT-3.5 to generate accurate, empathetic responses

### Safety Features
- Always recommends consulting real healthcare providers
- Limited to TB/Pneumonia topics
- Fallback responses when API unavailable
- Clear disclaimer on AI limitations

## Color Scheme
- Primary: `#234E52` (Dark Teal)
- Secondary: `#38B2AC` (Teal)
- Background: `#EBE4D6` (Beige)
- Text: `#264040` (Dark Green)

## Contributing
This is an academic project for medical diagnosis assistance. Contributions welcome!

## License
MIT License

## Disclaimer
⚠️ This platform is for educational and informational purposes only. Always consult qualified healthcare professionals for medical diagnosis and treatment.

## Contact
For questions or support, please open an issue on GitHub.

---

**MEDIVISION** - Intelligent Medical Imaging Platform
