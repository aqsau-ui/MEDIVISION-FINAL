import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PatientLayout from '../components/PatientLayout';
import PatientChatPanel from '../components/PatientChatPanel';
import './PatientDashboard.css';
import '../components/ChatModule.css';

const PatientDashboard = () => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // { sessionId, doctorId, doctorName }
  const [hasNewPrescription, setHasNewPrescription] = useState(false);

  // Settings state
  const [settingsTab, setSettingsTab] = useState('profile'); // 'profile' | 'account' | 'notifications'
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('patientProfilePic') || null);
  const [settingsForm, setSettingsForm] = useState(() => {
    const d = JSON.parse(localStorage.getItem('patientData') || '{}');
    return {
      name: d.name || d.fullName || '',
      email: d.email || '',
      phone: d.phone || '',
      city: d.city || '',
    };
  });
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('patientNotifPrefs') || '{}');
    return { prescriptions: saved.prescriptions !== false, reminders: saved.reminders !== false, updates: saved.updates !== false };
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePic(ev.target.result);
      localStorage.setItem('patientProfilePic', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePic = () => {
    setProfilePic(null);
    localStorage.removeItem('patientProfilePic');
  };

  const handleSettingsSave = () => {
    const d = JSON.parse(localStorage.getItem('patientData') || '{}');
    localStorage.setItem('patientData', JSON.stringify({ ...d, ...settingsForm }));
    localStorage.setItem('patientNotifPrefs', JSON.stringify(notifPrefs));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
    window.location.href = '/';
  };

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

  useEffect(() => {
    const checkNewPrescriptions = async () => {
      try {
        const patientData = JSON.parse(localStorage.getItem('patientData') || '{}');
        const patientId = patientData.email || patientData.id;
        if (!patientId) return;

        const response = await fetch(`http://localhost:8000/api/doctor-prescription/patient/${patientId}`);
        if (!response.ok) return;

        const data = await response.json();
        const sentPrescriptions = (data.prescriptions || []).filter(p => p.sent_to_patient);
        const viewedCount = parseInt(localStorage.getItem('viewedPrescriptionCount') || '0', 10);
        setHasNewPrescription(sentPrescriptions.length > viewedCount);
      } catch {
        setHasNewPrescription(false);
      }
    };

    checkNewPrescriptions();
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
              <button
                className="pd-help-trigger pd-settings-trigger"
                onClick={() => { setShowSettingsModal(true); setSettingsTab('profile'); setShowDeleteConfirm(false); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
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
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="pd-stat-body">
                <p className="pd-stat-title">Track Progress</p>
                <p className="pd-stat-desc">Upload follow-up X-rays to monitor your recovery and treatment progress.</p>
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

          <Link
            to="/doctor-recommendation"
            className={`pd-stat-card ds-card-hover${hasNewPrescription ? ' pd-stat-card--alert' : ''}`}
          >
            <div className="pd-stat-card-inner">
              <div className="pd-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              </div>
              <div className="pd-stat-body">
                <p className="pd-stat-title">Doctor Prescription</p>
                <p className="pd-stat-desc">View doctor recommendations and prescription reports.</p>
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
            <div className="pd-step">
              <div className="pd-step-number">5</div>
              <p className="pd-step-title">Chat with Your Doctor</p>
              <p className="pd-step-desc">Message your doctor directly to ask questions, clarify your prescription, or discuss your treatment plan.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="ds-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="ds-modal pd-modal pd-settings-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="pd-modal-header">
              <div className="pd-modal-header-left">
                <div className="pd-modal-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <h2 className="pd-modal-header-title">Settings</h2>
              </div>
              <button className="pd-modal-close" onClick={() => setShowSettingsModal(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tab Nav */}
            <div className="pd-settings-tabs">
              {[
                { key: 'profile', label: 'Profile', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                { key: 'notifications', label: 'Notifications', icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
                { key: 'account', label: 'Account', icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`pd-settings-tab${settingsTab === tab.key ? ' active' : ''}`}
                  onClick={() => setSettingsTab(tab.key)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">{tab.icon}</svg>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="pd-modal-body pd-settings-body">

              {/* ── Profile Tab ── */}
              {settingsTab === 'profile' && (
                <div className="pd-settings-section">
                  {/* Profile Picture */}
                  <div className="pd-settings-avatar-row">
                    <div className="pd-settings-avatar">
                      {profilePic
                        ? <img src={profilePic} alt="Profile" className="pd-settings-avatar-img" />
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      }
                    </div>
                    <div className="pd-settings-avatar-actions">
                      <label className="pd-settings-upload-btn" htmlFor="pd-pic-upload">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Upload Photo
                      </label>
                      <input id="pd-pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicChange} />
                      {profilePic && (
                        <button className="pd-settings-remove-btn" onClick={handleRemoveProfilePic}>Remove</button>
                      )}
                    </div>
                  </div>

                  {/* Personal Info Fields */}
                  <div className="pd-settings-fields">
                    <div className="pd-settings-field-group">
                      <label className="pd-settings-label">Full Name</label>
                      <input
                        className="pd-settings-input"
                        type="text"
                        placeholder="Your full name"
                        value={settingsForm.name}
                        onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="pd-settings-field-group">
                      <label className="pd-settings-label">Email Address</label>
                      <input
                        className="pd-settings-input"
                        type="email"
                        placeholder="your@email.com"
                        value={settingsForm.email}
                        onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="pd-settings-field-group">
                      <label className="pd-settings-label">Phone Number</label>
                      <input
                        className="pd-settings-input"
                        type="tel"
                        placeholder="+92 300 0000000"
                        value={settingsForm.phone}
                        onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div className="pd-settings-field-group">
                      <label className="pd-settings-label">City</label>
                      <input
                        className="pd-settings-input"
                        type="text"
                        placeholder="e.g. Lahore"
                        value={settingsForm.city}
                        onChange={e => setSettingsForm(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Notifications Tab ── */}
              {settingsTab === 'notifications' && (
                <div className="pd-settings-section">
                  <p className="pd-settings-section-desc">Choose what you'd like to be notified about.</p>
                  {[
                    { key: 'prescriptions', label: 'New Prescriptions', desc: 'Get notified when a doctor sends you a prescription.' },
                    { key: 'reminders', label: 'Upload Reminders', desc: 'Periodic reminders to upload follow-up X-rays.' },
                    { key: 'updates', label: 'Platform Updates', desc: 'News and feature updates from MEDIVISION.' },
                  ].map(item => (
                    <div className="pd-settings-toggle-row" key={item.key}>
                      <div className="pd-settings-toggle-info">
                        <span className="pd-settings-toggle-label">{item.label}</span>
                        <span className="pd-settings-toggle-desc">{item.desc}</span>
                      </div>
                      <button
                        className={`pd-settings-toggle${notifPrefs[item.key] ? ' on' : ''}`}
                        onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                        aria-label={item.label}
                      >
                        <span className="pd-settings-toggle-knob" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Account Tab ── */}
              {settingsTab === 'account' && (
                <div className="pd-settings-section">
                  <div className="pd-settings-account-item">
                    <div className="pd-settings-account-icon pd-settings-account-icon--teal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </div>
                    <div className="pd-settings-account-text">
                      <span className="pd-settings-account-label">Sign Out</span>
                      <span className="pd-settings-account-desc">Log out of your patient portal session.</span>
                    </div>
                    <button className="pd-settings-account-btn" onClick={() => { localStorage.removeItem('patientData'); window.location.href = '/patient-login'; }}>
                      Sign Out
                    </button>
                  </div>

                  <div className="pd-settings-account-item">
                    <div className="pd-settings-account-icon pd-settings-account-icon--orange">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div className="pd-settings-account-text">
                      <span className="pd-settings-account-label">Change Password</span>
                      <span className="pd-settings-account-desc">Update your login password for security.</span>
                    </div>
                    <Link to="/patient-login" className="pd-settings-account-btn" onClick={() => setShowSettingsModal(false)}>
                      Change
                    </Link>
                  </div>

                  <div className="pd-settings-account-item pd-settings-account-item--danger">
                    <div className="pd-settings-account-icon pd-settings-account-icon--red">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </div>
                    <div className="pd-settings-account-text">
                      <span className="pd-settings-account-label">Delete Account</span>
                      <span className="pd-settings-account-desc">Permanently remove your account and all data.</span>
                    </div>
                    {!showDeleteConfirm
                      ? <button className="pd-settings-account-btn pd-settings-account-btn--danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
                      : <div className="pd-delete-confirm">
                          <span>Are you sure?</span>
                          <button className="pd-settings-account-btn pd-settings-account-btn--danger" onClick={handleDeleteAccount}>Yes, Delete</button>
                          <button className="pd-settings-account-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                        </div>
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {settingsTab !== 'account' && (
              <div className="pd-modal-footer">
                {settingsSaved && <span className="pd-settings-saved">✓ Changes saved!</span>}
                <button className="ds-btn ds-btn-secondary ds-btn-lg" onClick={handleSettingsSave}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <p className="pd-help-step-desc">Our AI checks for pneumonia and shows results with a heatmap.</p>
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
                  <p className="pd-help-step-title">Chat with Your Doctor</p>
                  <p className="pd-help-step-desc">Use the Chat button on your prescription card to message your doctor directly — ask follow-ups or clarify your treatment plan.</p>
                </div>
              </div>

              <div className="pd-help-step">
                <div className="pd-help-step-num">8</div>
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
