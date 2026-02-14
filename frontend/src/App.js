import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorLoginPage from './pages/DoctorLoginPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import PatientProfile from './pages/PatientProfile';
import DrAvatar from './pages/DrAvatar';
import ProgressDetection from './pages/ProgressDetection';
import ReviewReport from './pages/ReviewReport';
import DoctorRecommendation from './pages/DoctorRecommendation';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAllPatients from './pages/DoctorAllPatients';
import DoctorProfileSettings from './pages/DoctorProfileSettings';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/patient-login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/doctor-login" element={<DoctorLoginPage />} />
          <Route path="/doctor-register" element={<DoctorRegisterPage />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/patient-profile" element={<PatientProfile />} />
          <Route path="/dr-avatar" element={<DrAvatar />} />
          <Route path="/progress-detection" element={<ProgressDetection />} />
          <Route path="/review-report" element={<ReviewReport />} />
          <Route path="/doctor-recommendation" element={<DoctorRecommendation />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor-all-patients" element={<DoctorAllPatients />} />
          <Route path="/doctor-profile-settings" element={<DoctorProfileSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;