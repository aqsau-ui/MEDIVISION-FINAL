import React from 'react';
import PatientLayout from '../components/PatientLayout';
import './ReviewReport.css';

const ReviewReport = () => {
  return (
    <PatientLayout>
      <div className="report-page-content">
        <div className="report-header">
          <h1 className="report-title">Chest X-Ray Analysis Report</h1>
        </div>

        <div className="report-content">
          <div className="report-card">
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>No report available yet</h3>
              <p>Upload an X-ray image to generate your report</p>
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default ReviewReport;
