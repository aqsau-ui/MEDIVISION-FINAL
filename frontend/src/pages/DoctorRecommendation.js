import React from 'react';
import PatientLayout from '../components/PatientLayout';
import './DoctorRecommendation.css';

const DoctorRecommendation = () => {
  return (
    <PatientLayout>
      <div className="doctor-recommendation-page-content">
        <div className="doctor-recommendation-header">
          <h1 className="doctor-recommendation-title">Doctor's Recommendation</h1>
        </div>

        <div className="doctor-recommendation-content">
          <div className="doctor-recommendation-card">
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>No doctor recommendation available yet</h3>
              <p>Your report needs to be reviewed by a doctor first</p>
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default DoctorRecommendation;
