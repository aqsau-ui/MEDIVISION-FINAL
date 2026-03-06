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
          <h1 className="progress-title">X-Ray Analysis & Progress Detection</h1>
          <p className="progress-subtitle">AI-powered chest X-ray disease detection with visual heatmap</p>
        </div>

        <div className="progress-content">
          {/* Error Message */}
          {error && (
            <div className="error-banner" style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#991b1b'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Analysis Result Section */}
          {analysisResult && (
            <div className="progress-card analysis-result-card">
              <div className="analysis-header">
                <h2 className="card-title">Analysis Results</h2>
                <button className="new-upload-btn" onClick={handleNewUpload}>
                  Upload New X-Ray
                </button>
              </div>

              <div className="analysis-content">
                {/* X-Ray Images Side by Side */}
                <div className="xray-images-container">
                  {/* Original X-Ray */}
                  <div className="xray-image-box">
                    <h3>Original X-Ray</h3>
                    <img 
                      src={selectedImage} 
                      alt="Original X-ray" 
                      className="xray-image"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                  </div>

                  {/* Heatmap (if disease detected) */}
                  {analysisResult.heatmap && !analysisResult.is_normal && (
                    <div className="xray-image-box">
                      <h3>Affected Areas (Heatmap)</h3>
                      <img 
                        src={analysisResult.heatmap} 
                        alt="Heatmap visualization" 
                        className="xray-image"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '8px' }}>
                        Red/yellow areas indicate regions of interest for {analysisResult.prediction.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Prediction Results */}
                <div className="prediction-results">
                  <div 
                    className="prediction-badge"
                    style={{
                      backgroundColor: getSeverityColor(analysisResult.prediction),
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '24px',
                      display: 'inline-block',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      marginBottom: '12px'
                    }}
                  >
                    {analysisResult.prediction}
                  </div>

                  <p style={{ 
                    fontSize: '1rem', 
                    color: '#4b5563', 
                    marginBottom: '20px',
                    fontWeight: '500'
                  }}>
                    {getSeverityText(analysisResult.prediction)}
                  </p>

                  <div className="confidence-score">
                    <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
                      Confidence Score
                    </h4>
                    <div className="confidence-bar-container" style={{
                      width: '100%',
                      height: '24px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <div 
                        className="confidence-bar"
                        style={{
                          width: `${analysisResult.confidence * 100}%`,
                          height: '100%',
                          backgroundColor: getSeverityColor(analysisResult.prediction),
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {(analysisResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Probability Breakdown */}
                  <div className="probability-breakdown" style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '12px' }}>
                      Detailed Probabilities
                    </h4>
                    {Object.entries(analysisResult.probabilities).map(([disease, prob]) => (
                      <div key={disease} style={{ marginBottom: '12px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginBottom: '4px',
                          fontSize: '0.875rem'
                        }}>
                          <span style={{ fontWeight: '500' }}>{disease}</span>
                          <span style={{ color: '#6b7280' }}>{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${prob * 100}%`,
                            height: '100%',
                            backgroundColor: disease === analysisResult.prediction 
                              ? getSeverityColor(disease) 
                              : '#9ca3af',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Medical Disclaimer */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: '#92400e'
                  }}>
                    <strong>⚠️ Important:</strong> This is an AI-assisted analysis and should not replace professional medical diagnosis. Please consult a qualified healthcare provider for proper evaluation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section (shown when no analysis result) */}
          {!analysisResult && (
            <div className="progress-card upload-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Upload Chest X-Ray</h2>
                <p className="card-description">
                  Upload a chest X-ray image for AI-powered disease detection (TB, Pneumonia, Normal)
                </p>
                
                {uploading || analyzing ? (
                  <div className="loading-container" style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="spinner" style={{
                      border: '4px solid #f3f4f6',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px'
                    }} />
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {analyzing ? 'Analyzing X-ray with AI model...' : 'Uploading X-ray image...'}
                    </p>
                  </div>
                ) : (
                  <>
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
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
              </div>
            </div>
          )}

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
