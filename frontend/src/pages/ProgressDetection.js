import React, { useEffect, useMemo, useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './ProgressDetection.css';

const ProgressDetection = () => {
  const [showUploadTip, setShowUploadTip] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const patientData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('patientData') || '{}');
    } catch (parseError) {
      return {};
    }
  }, []);
  const patientId = patientData?.email || patientData?.id || '';

  const getSeverityColor = (label) => {
    const value = (label || '').toLowerCase();
    switch (value) {
      case 'normal':
        return '#10b981';
      case 'pneumonia':
        return '#f59e0b';
      case 'tuberculosis':
      case 'tb':
        return '#ef4444';
      case 'mild':
        return '#10b981';
      case 'moderate':
        return '#f59e0b';
      case 'severe':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusSummary = (status) => {
    if (status === 'Improved') {
      return 'Compared to your previous X-ray, there is an improvement in lung condition with a reduced disease probability.';
    }
    if (status === 'Worsened') {
      return 'The latest analysis indicates an increase in disease probability compared to the previous scan. Medical consultation is recommended.';
    }
    return 'No significant change detected compared to the previous X-ray.';
  };

  const fetchProgressHistory = async () => {
    if (!patientId) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/xray/progress/history/${encodeURIComponent(patientId)}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Failed to load progress history');
      }
      setProgressHistory(data.history || []);
      const sortedRecords = [...(data.records || [])].sort(
        (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
      );
      setHistoryRecords(sortedRecords);
    } catch (historyError) {
      setError(historyError.message);
    }
  };

  useEffect(() => {
    fetchProgressHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleNewUpload = () => {
    setAnalysisResult(null);
    setSelectedImage(null);
    setError(null);
  };

  const handleFileInputClick = async (e) => {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError('Patient identity not found. Please login again to continue.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/xray/progress/eligibility?patient_id=${encodeURIComponent(patientId)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Unable to verify eligibility for progress tracking.');
      }

      if (!data.eligible) {
        setError('Progress tracking is available only for patients with prior X-ray analysis records. Please upload and analyze an initial X-ray to enable future progress monitoring.');
        return;
      }

      setShowUploadTip(true);
    } catch (eligibilityError) {
      setError(eligibilityError.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setError(null);
    setUploading(true);
    setAnalyzing(true);

    try {
      const localPreview = URL.createObjectURL(file);
      setSelectedImage(localPreview);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:5000/api/xray/progress/analyze?patient_id=${encodeURIComponent(patientId)}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Progress analysis failed.');
      }

      setAnalysisResult(data);
      setProgressHistory(data.progress_history || []);
      await fetchProgressHistory();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
      event.target.value = '';
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
          <h1 className="progress-title">X-Ray Analysis & Disease Detection</h1>
          <p className="progress-subtitle">AI-powered chest X-ray analysis with visual heatmap indicators</p>
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
                  {analysisResult.heatmap && (
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
                    Probability: {analysisResult.probability?.toFixed(1)}% | Severity: {analysisResult.severity} | Respiratory Health Score: {analysisResult.health_score}/100
                  </p>

                  {analysisResult.comparison && (
                    <div className="comparison-box">
                      <h4>Comparison with Previous X-ray</h4>
                      <p>
                        Previous Probability: {analysisResult.comparison.previous_probability?.toFixed(1)}% | Current Probability: {analysisResult.comparison.current_probability?.toFixed(1)}%
                      </p>
                      <p>
                        SSIM Similarity: {((analysisResult.comparison.ssim_score || 0) * 100).toFixed(2)}% | Status: <span style={{ color: getSeverityColor(analysisResult.comparison.status === 'Improved' ? 'mild' : analysisResult.comparison.status === 'Worsened' ? 'severe' : 'moderate'), fontWeight: 700 }}>{analysisResult.comparison.status}</span>
                      </p>
                    </div>
                  )}

                  <div className="summary-box">
                    <strong>Progress Summary:</strong> {analysisResult.summary || getStatusSummary(analysisResult?.comparison?.status)}
                  </div>

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
                      <div className="confidence-bar" style={{
                          width: `${analysisResult.confidence * 100}%`,
                          height: '100%',
                          backgroundColor: getSeverityColor(analysisResult.prediction),
                          transition: 'width 0.5s ease'
                        }} />
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
                <h2 className="card-title">Respiratory Health Score Progress</h2>
                <p className="card-description">Your respiratory health score over time based on X-ray analysis</p>

                {progressHistory.length === 0 ? (
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
                ) : (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={progressHistory.map((item) => ({
                        ...item,
                        displayDate: new Date(item.date).toLocaleDateString()
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value, name, context) => {
                          if (name === 'health_score') {
                            return [`${value}/100`, 'Score'];
                          }
                          return [value, name];
                        }} labelFormatter={(label, payload) => {
                          const p = payload && payload[0] ? payload[0].payload : null;
                          if (!p) {
                            return `Date: ${label}`;
                          }
                          return `Date: ${label} | Disease: ${p.disease} | Severity: ${p.severity}`;
                        }} />
                        <Line type="monotone" dataKey="health_score" stroke="#2C7A7B" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
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

                {historyRecords.length === 0 ? (
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
                ) : (
                  <div className="history-grid">
                    {historyRecords.map((record) => (
                      <div className="history-card" key={record._id}>
                        <img src={record.xray_image} alt="X-ray thumbnail" className="history-thumb" />
                        <div className="history-meta">
                          <p><strong>Prediction:</strong> {record.disease || record.analysis?.prediction || 'N/A'}</p>
                          <p><strong>Probability:</strong> {(record.probability ?? ((record.analysis?.confidence || 0) * 100)).toFixed(1)}%</p>
                          <p><strong>Date:</strong> {new Date(record.timestamp || record.createdAt).toLocaleString()}</p>
                          <p><strong>Severity:</strong> <span style={{ color: getSeverityColor(record.severity || 'moderate'), fontWeight: 700 }}>{record.severity || 'Moderate'}</span></p>
                          <button className="new-upload-btn" onClick={() => setSelectedReport(record)}>View Report</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedReport && (
                  <div className="summary-box" style={{ marginTop: '16px' }}>
                    <strong>Report Details:</strong> {selectedReport.disease || selectedReport.analysis?.prediction} at {(selectedReport.probability ?? ((selectedReport.analysis?.confidence || 0) * 100)).toFixed(1)}% with health score {selectedReport.health_score ?? 'N/A'}.
                  </div>
                )}
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
