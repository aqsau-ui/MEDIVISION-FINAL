import React from 'react';
import './TrendNotificationPanel.css';

const TrendNotificationPanel = ({ trendData, onClose }) => {
  // Check if there's no data or no trending diseases
  const hasTrends = trendData && trendData.trending_diseases && trendData.trending_diseases.length > 0;
  
  if (!hasTrends) {
    return (
      <div className="notification-panel">
        <div className="notification-header">
          <h3>📊 Disease Trend Alerts</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="no-notifications">
          <p>✅ No trending diseases detected</p>
          <p className="subtext">All clear! We'll notify you if any disease becomes frequent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>⚠️ Disease Trend Alerts</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="notification-content">
        <div className="alert-summary">
          <p className="alert-message">
            ⚕️ Increased disease cases detected in the last 24 hours.
          </p>
          <p className="time-window">
            📅 Last {trendData.time_window_hours} hours | 
            Total Cases: {trendData.total_predictions}
          </p>
        </div>

        {trendData.trending_diseases.map((trend, index) => (
          <div key={index} className={`disease-card ${trend.severity}`}>
            <div className="disease-header">
              <div>
                <h4 className="disease-name">
                  {trend.severity === 'critical' ? '🔴' : '⚠️'} {trend.disease}
                </h4>
                <p className="disease-stats">
                  <strong>{trend.count} cases</strong> detected
                  {trend.count >= trend.threshold * 2 && <span className="high-alert"> • HIGH ALERT</span>}
                </p>
              </div>
            </div>

            <div className="info-section">
              <h5>🛡️ Precautions</h5>
              <ul className="info-list">
                {trend.precautions.map((precaution, i) => (
                  <li key={i}>{precaution}</li>
                ))}
              </ul>
            </div>

            <div className="info-footer">
              <p className="disclaimer">
                ⚕️ AI-based trend alert. Consult healthcare professionals for diagnosis.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendNotificationPanel;
