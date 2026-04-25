import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PatientLayout from '../components/PatientLayout';
import PatientChatPanel from '../components/PatientChatPanel';
import './PatientDashboard.css';
import '../components/ChatModule.css';

const PatientDashboard = () => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // { sessionId, doctorId, doctorName }

  useEffect(() => {
    // Check if there's an active chat session from a previous page
    const stored = localStorage.getItem('activeChatSession');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.sessionId) setActiveChat(parsed);
      } catch (_) {}
    }
  }, []);

  return (
    <PatientLayout>
      <div className="dashboard-home-content ds-fade-up">

        {/* Welcome Banner */}
        <div className="pd-welcome">
          <div className="pd-welcome-text">
            <span className="pd-welcome-eyebrow">Patient Portal</span>
            <h1 className="pd-welcome-title">Welcome Back</h1>
            <p className="pd-welcome-subtitle">
              Upload your chest X-ray for instant AI-powered analysis and get
              personalized diagnostic insights with real doctor support.
            </p>
            <div className="pd-welcome-actions">
              <Link to="/patient-profile" className="pd-welcome-cta">
                Get Started
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                className="pd-help-trigger"
                onClick={() => setShowHelpModal(true)}
              >
                Need Help?
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="pd-stats ds-fade-up ds-fade-up-delay-1">
          <Link to="/patient-profile" className="pd-stat-card ds-card-hover">
            <div className="pd-stat-card-inner">
              <div className="pd-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="pd-stat-body">
                <p className="pd-stat-title">Upload X-ray</p>
                <p className="pd-stat-desc">Submit a chest X-ray for AI analysis and heatmap results.</p>
              </div>
            </div>
            <div className="pd-stat-card-footer">
              <svg className="pd-stat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link to="/progress-detection" className="pd-stat-card ds-card-hover">
            <div className="pd-stat-card-inner">
              <div className="pd-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="pd-stat-body">
                <p className="pd-stat-title">View Reports</p>
                <p className="pd-stat-desc">Track your progress and compare past X-ray results over time.</p>
              </div>
            </div>
            <div className="pd-stat-card-footer">
              <svg className="pd-stat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link to="/dr-avatar" className="pd-stat-card ds-card-hover">
            <div className="pd-stat-card-inner">
              <div className="pd-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="pd-stat-body">
                <p className="pd-stat-title">Ask Dr. Jarvis</p>
                <p className="pd-stat-desc">Get plain-language answers about your results from our AI doctor.</p>
              </div>
            </div>
            <div className="pd-stat-card-footer">
              <svg className="pd-stat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* How It Works */}
        <div className="pd-how-section ds-fade-up ds-fade-up-delay-2">
          <div>
            <span className="pd-section-label">Process</span>
            <h2 className="pd-section-title">How MEDIVISION Works</h2>
          </div>
          <div className="pd-steps">
            <div className="pd-step">
              <div className="pd-step-number">1</div>
              <p className="pd-step-title">Fill Your Profile</p>
              <p className="pd-step-desc">Enter your age, symptoms, smoking status, and family history to personalise your analysis.</p>
            </div>
            <div className="pd-step">
              <div className="pd-step-number">2</div>
              <p className="pd-step-title">Upload Your X-ray</p>
              <p className="pd-step-desc">Upload a clear chest X-ray image. Follow the quick tips for best results.</p>
            </div>
            <div className="pd-step">
              <div className="pd-step-number">3</div>
              <p className="pd-step-title">AI Analysis</p>
              <p className="pd-step-desc">Our model checks for pneumonia and generates a heatmap showing affected areas.</p>
            </div>
            <div className="pd-step">
              <div className="pd-step-number">4</div>
              <p className="pd-step-title">Doctor Review</p>
              <p className="pd-step-desc">A licensed doctor reviews the AI report and adds treatment guidance if needed.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="ds-modal-backdrop"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="ds-modal pd-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="pd-modal-header">
              <div className="pd-modal-header-left">
                <div className="pd-modal-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h2 className="pd-modal-header-title">Need Help?</h2>
              </div>
              <button
                className="pd-modal-close"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close help modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="pd-modal-body">
              <div className="pd-modal-intro">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <p className="pd-modal-intro-text">How to Use MEDIVISION -- Simple Steps</p>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">1</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Fill Your Profile</p>
                  <p className="pd-help-step-desc">Enter basic info: age, date of birth, symptoms, smoking status, family history, etc.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">2</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Upload Your Chest X-ray</p>
                  <p className="pd-help-step-desc">Click "Upload X-ray", choose your image, and follow the quick tips (stand straight, deep breath, no jewelry, full lungs visible).</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">3</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Wait for AI Analysis</p>
                  <p className="pd-help-step-desc">Our AI checks for pneumonia or TB and shows results with a heatmap.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">4</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Doctor Reviews It</p>
                  <p className="pd-help-step-desc">A real licensed doctor checks the AI report and adds treatment advice if needed.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">5</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">See Your Results</p>
                  <p className="pd-help-step-desc">Get a simple report and hear it explained by our talking Dr. Avatar in easy English.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">6</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Ask Questions</p>
                  <p className="pd-help-step-desc">Use the avatar chatbot to ask basic questions about your results or the diseases.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">7</div>
                <div className="pd-help-step-content">
                  <p className="pd-help-step-title">Next Time You Upload</p>
                  <p className="pd-help-step-desc">We automatically compare with your previous X-ray to show if things are better, same, or worse.</p>
                </div>
              </div>

              <div className="pd-modal-summary">
                <p>That's it! You get fast, clear results with real doctor support.</p>
              </div>

              <div className="pd-modal-contact">
                <div className="pd-modal-contact-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <h3 className="pd-modal-contact-title">Want to Contact Us?</h3>
                </div>
                <p className="pd-modal-contact-note">Email us anytime:</p>
                <div className="pd-contact-list">
                  <div className="pd-contact-item">
                    <div className="pd-contact-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <p className="pd-contact-name">Aqsa Imtiaz</p>
                      <a href="mailto:aqsaimtiaz823@gmail.com" className="pd-contact-email">
                        aqsaimtiaz823@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="pd-contact-item">
                    <div className="pd-contact-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <p className="pd-contact-name">Qanitah Khan</p>
                      <a href="mailto:qanitahkhan@gmail.com" className="pd-contact-email">
                        qanitahkhan@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
                <p className="pd-modal-contact-footer">
                  Feel free to reach out with questions, suggestions, or if you face any issue!
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pd-modal-footer">
              <button
                className="ds-btn ds-btn-secondary ds-btn-lg"
                onClick={() => setShowHelpModal(false)}
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show active chat panel on home page if patient has an ongoing session */}
      {activeChat && (
        <PatientChatPanel
          doctorId={activeChat.doctorId}
          doctorName={activeChat.doctorName}
          onClose={() => {
            setActiveChat(null);
            localStorage.removeItem('activeChatSession');
          }}
        />
      )}
    </PatientLayout>
  );
};

export default PatientDashboard;
