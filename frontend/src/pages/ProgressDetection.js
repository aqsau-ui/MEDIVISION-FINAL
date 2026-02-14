import React, { useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import './ProgressDetection.css';

const ProgressDetection = () => {
  const [showUploadTip, setShowUploadTip] = useState(false);

  const handleFileInputClick = (e) => {
    e.preventDefault();
    setShowUploadTip(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('Uploading X-ray file:', file.name);
      // TODO: Implement file upload logic
    }
  };

  const handleGotIt = () => {
    setShowUploadTip(false);
    document.getElementById('xray-upload').click();
  };

  return (
    <PatientLayout>
      <div className="progress-page-content">
        <div className="progress-header">
          <h1 className="progress-title">Progress Detection</h1>
          <p className="progress-subtitle">Track your respiratory health progress over time</p>
        </div>

        <div className="progress-content">
            {/* Upload New X-Ray Section */}
            <div className="progress-card upload-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Upload New X-Ray</h2>
                <p className="card-description">Upload your latest X-ray image to track your progress</p>
                <button className="upload-btn" onClick={handleFileInputClick}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose X-Ray File
                </button>
                <input
                  id="xray-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.dcm"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Health Score Progress Section */}
            <div className="progress-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Health Score Progress</h2>
                <p className="card-description">Your respiratory health score over the past months</p>
                
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                  </div>
                  <h3 className="empty-title">No data available</h3>
                  <p className="empty-description">Upload your first X-ray to start tracking your health progress</p>
                </div>
              </div>
            </div>

            {/* Past X-Ray History Section */}
            <div className="progress-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Past X-Ray History</h2>
                <p className="card-description">Previously uploaded X-ray images and analysis results</p>
                
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <h3 className="empty-title">No data available</h3>
                  <p className="empty-description">Your X-ray history will appear here once you upload files</p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="security-note">
              <strong>Secure Data:</strong> Your health information is encrypted and protected.
            </div>
          </div>

          {/* Upload Tip Modal */}
          {showUploadTip && (
            <div className="upload-tip-overlay" onClick={() => setShowUploadTip(false)}>
              <div className="upload-tip-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <h3 className="tip-title">For a clear X-ray photo:</h3>
                <ul className="tip-list">
                  <li>Hold it against a bright background (window or white screen).</li>
                  <li>Turn off flash to avoid glare.</li>
                  <li>Keep your phone steady and parallel to the X-ray.</li>
                  <li>Avoid reflections by tilting slightly.</li>
                </ul>
                <button className="got-it-btn" onClick={handleGotIt}>
                  Got it!
                </button>
              </div>
            </div>
          )}
        </div>
    </PatientLayout>
  );
};

export default ProgressDetection;
