import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './PatientLayout.css';

const PatientLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('patientData');
    if (!userData || userData === 'undefined') {
      // If not logged in, redirect to login page
      navigate('/patient-login');
    } else {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing patient data:', e);
        navigate('/patient-login');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('patientData');
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="patient-layout">
      {/* Top Navigation Bar */}
      <nav className="layout-top-nav">
        <div className="nav-left">
          <Logo size="medium" />
        </div>
        <div className="nav-right">
          <button 
            className="notification-bell-nav"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          {showNotifications && (
            <div className="notification-dropdown-nav">
              <h3>Recurring Diseases</h3>
              <div className="notification-list">
                <p className="no-notifications">No data yet</p>
              </div>
            </div>
          )}
          <div className="user-menu" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="user-name">{user.fullName}</span>
            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            
            {showDropdown && (
              <div className="user-dropdown">
                <button onClick={handleLogout} className="logout-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="layout-content">
        {/* Left Sidebar */}
        <aside className="layout-sidebar">
          <nav className="sidebar-nav">
            <Link to="/patient-dashboard" className={`nav-item ${isActive('/patient-dashboard') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </Link>

            <Link to="/patient-profile" className={`nav-item ${isActive('/patient-profile') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Patient Profile & Upload</span>
            </Link>

            <Link to="/progress-detection" className={`nav-item ${isActive('/progress-detection') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Progress Detection</span>
            </Link>

            <Link to="/review-report" className={`nav-item ${isActive('/review-report') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Review Report</span>
            </Link>

            <Link to="/doctor-recommendation" className={`nav-item ${isActive('/doctor-recommendation') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Doctors Recommendation</span>
            </Link>

            <Link to="/dr-avatar" className={`nav-item ${isActive('/dr-avatar') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Dr Avatar</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PatientLayout;
