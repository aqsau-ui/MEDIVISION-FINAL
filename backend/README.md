# MEDIVISION Backend Setup Instructions

## Prerequisites
- Node.js installed
- MySQL Server installed and running

## Database Setup

### Step 1: Install MySQL (if not already installed)
Download and install MySQL from: https://dev.mysql.com/downloads/mysql/

### Step 2: Create the Database
1. Open MySQL Workbench or command line
2. Run the SQL script located in `backend/database/schema.sql`

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p < backend/database/schema.sql
```

**Option B: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Open SQL Script → Select `backend/database/schema.sql`
4. Click Execute (⚡ icon)

### Step 3: Configure Environment Variables
1. Open `backend/.env` file
2. Update with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=medivision_db
DB_PORT=3306
PORT=5000
```

## Running the Application

### Terminal 1: Start Backend Server
```bash
cd backend
npm start
```
The backend will run on http://localhost:5000

### Terminal 2: Start Frontend
```bash
cd frontend
npm start
```
The frontend will run on http://localhost:3000

## Testing the System

### 1. Register a New User
- Go to http://localhost:3000
- Click "Patient Login"
- Click "Register here"
- Fill in all required fields
- Click "Register"

### 2. Login
- Go to http://localhost:3000/patient-login
- Enter your registered email and password
- Click "Secure Login"

## Security Features
✅ Passwords are hashed using bcrypt (10 salt rounds)
✅ Email validation
✅ Password minimum length (6 characters)
✅ SQL injection protection using parameterized queries
✅ CORS enabled for frontend-backend communication

## API Endpoints

### POST /api/auth/register
Register a new user
- **Body**: `{ fullName, email, password, phone, dateOfBirth, gender, address, emergencyContact }`
- **Response**: `{ success: true, message, userId }`

### POST /api/auth/login
Login existing user
- **Body**: `{ email, password }`
- **Response**: `{ success: true, message, user: { id, fullName, email } }`

### GET /api/health
Check if backend is running
- **Response**: `{ status: 'OK', message: 'MEDIVISION Backend is running' }`

## Troubleshooting

### "Cannot connect to server" error
- Make sure backend is running on port 5000
- Check if MySQL is running
- Verify `.env` file has correct database credentials

### "Email already registered" error
- This email is already in the database
- Try logging in instead or use a different email

### "Invalid email or password" error
- Check your credentials
- Make sure you registered first
- Password is case-sensitive

## Database Schema

### Users Table
- `id` - Auto-increment primary key
- `full_name` - User's full name
- `email` - Unique email address (indexed)
- `password` - Hashed password (bcrypt)
- `phone` - Phone number
- `date_of_birth` - Date of birth
- `gender` - Enum: male, female, other
- `address` - Full address
- `emergency_contact` - Optional emergency contact
- `created_at` - Registration timestamp
- `last_login` - Last login timestamp
