import React, { useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import './PatientDashboard.css';

const PatientDashboard = () => {
  return (
    <PatientLayout>
      <div className="dashboard-home-content">
        <div className="hero-section">
          <div className="ai-doctor-icon">
            <img src="/images/doctor-robot.png" alt="AI Doctor" />
          </div>
          
          <h1 className="hero-title">Intelligent Medical Imaging</h1>
          <p className="hero-subtitle">
            Upload your X-ray images for instant AI-powered analysis and get
            personalized health insights with advanced diagnostic support.
          </p>

          <div className="security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span><strong>Secure Data</strong> - Your health information is encrypted and protected</span>
          </div>

          <a href="#help" className="help-link">Need Help?</a>
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
