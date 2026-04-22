import React, { useState, useEffect } from 'react';
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

          <button 
            onClick={() => setShowHelpModal(true)}
            className="help-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            Need Help?
          </button>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
              animation: 'fadeIn 0.3s ease'
            }}
            onClick={() => setShowHelpModal(false)}
          >
            <div 
              style={{
                backgroundColor: '#F5F1E8',
                borderRadius: '16px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                animation: 'slideIn 0.3s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '30px 30px 20px',
                borderBottom: '2px solid #2C7A7B',
                background: 'linear-gradient(135deg, #38B2AC 0%, #2C7A7B 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#38B2AC" strokeWidth="2" style={{ width: '28px', height: '28px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '28px', 
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      Need Help?
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '8px',
                      width: '36px',
                      height: '36px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '30px' }}>
                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid #38B2AC',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '30px'
                }}>
                  <h3 style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#234E52',
                    marginTop: 0,
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#38B2AC" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    How to Use MEDIVISION++ – Simple Steps
                  </h3>
                </div>

                {/* Step 1 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #38B2AC',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#38B2AC',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      1
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Fill Your Profile
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        Enter basic info: age, date of birth, symptoms, smoking status, family history, etc.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #2C7A7B',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#2C7A7B',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      2
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Upload Your Chest X-ray
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        Click "Upload X-ray", choose your image, and follow the quick tips (stand straight, deep breath, no jewelry, full lungs visible).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #38B2AC',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#38B2AC',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      3
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Wait for AI Analysis
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        Our AI checks for pneumonia or TB and shows results with a heatmap.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #2C7A7B',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#2C7A7B',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      4
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Doctor Reviews It
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        A real licensed doctor checks the AI report and adds treatment advice if needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #38B2AC',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#38B2AC',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      5
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        See Your Results
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        Get a simple report + hear it explained by our talking Dr. Avatar in easy English.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #2C7A7B',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#2C7A7B',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      6
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Ask Questions
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        Use the avatar chatbot to ask basic questions about your results or the diseases.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 7 */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderLeft: '4px solid #38B2AC',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#38B2AC',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      7
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#234E52' }}>
                        Next Time You Upload
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#4A5568' }}>
                        We automatically compare with your previous X-ray to show if things are better, same, or worse.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid #2C7A7B',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '30px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#234E52',
                    margin: 0
                  }}>
                    That's it! You get fast, clear results with real doctor support.
                  </p>
                </div>

                {/* Contact Section */}
                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid #38B2AC',
                  borderRadius: '12px',
                  padding: '25px'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#234E52',
                    marginTop: 0,
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#38B2AC" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Want to Contact Us?
                  </h3>
                  <p style={{ fontSize: '14px', color: '#4A5568', marginBottom: '15px', lineHeight: '1.6' }}>
                    Email us anytime:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      backgroundColor: '#F5F1E8',
                      borderRadius: '8px',
                      border: '1px solid #38B2AC'
                    }}>
                      <span style={{ fontSize: '20px' }}>📧</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#234E52' }}>
                          Aqsa Imtiaz
                        </p>
                        <a href="mailto:aqsaimtiaz823@gmail.com" style={{ fontSize: '13px', color: '#38B2AC', textDecoration: 'none' }}>
                          aqsaimtiaz823@gmail.com
                        </a>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      backgroundColor: '#F5F1E8',
                      borderRadius: '8px',
                      border: '1px solid #38B2AC'
                    }}>
                      <span style={{ fontSize: '20px' }}>📧</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#234E52' }}>
                          Qanitah Khan
                        </p>
                        <a href="mailto:qanitahkhan@gmail.com" style={{ fontSize: '13px', color: '#38B2AC', textDecoration: 'none' }}>
                          qanitahkhan@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#4A5568', marginTop: '15px', marginBottom: 0, fontStyle: 'italic' }}>
                    Feel free to reach out with questions, suggestions, or if you face any issue!
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '20px 30px',
                borderTop: '2px solid #2C7A7B',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: '#F5F1E8'
              }}>
                <button
                  onClick={() => setShowHelpModal(false)}
                  style={{
                    padding: '14px 40px',
                    backgroundColor: '#38B2AC',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(56, 178, 172, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2C7A7B';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(56, 178, 172, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#38B2AC';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px rgba(56, 178, 172, 0.3)';
                  }}
                >
                  Got It, Thanks!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
