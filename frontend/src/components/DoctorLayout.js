import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './DoctorLayout.css';

const DoctorLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Get doctor data from localStorage
    const doctorData = localStorage.getItem('doctorData');
    if (!doctorData || doctorData === 'undefined') {
      // If not logged in, redirect to login page
      navigate('/doctor-login');
    } else {
      try {
        setDoctor(JSON.parse(doctorData));
      } catch (e) {
        console.error('Error parsing doctor data:', e);
        navigate('/doctor-login');
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('doctorData');
    navigate('/');
  };

  if (!doctor) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="doctor-layout">
      {/* Top Navigation Bar */}
      <nav className="layout-top-nav">
        <div className="nav-left">
          <Logo size="medium" />
        </div>
        <div className="nav-right">
          <button 
            className="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <h3>Recurring Diseases</h3>
              <p className="no-data-text">No data to show recurring diseases</p>
            </div>
          )}
          
          <div className="user-menu" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="user-name">{doctor.fullName}</span>
            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            
            {showDropdown && (
              <div className="user-dropdown">
                <button onClick={() => { setShowDropdown(false); navigate('/doctor-profile-settings'); }} className="dropdown-menu-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profile Settings
                </button>
                <button onClick={handleLogout} className="dropdown-menu-btn logout-btn">
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
            <Link to="/doctor-dashboard" className={`nav-item ${isActive('/doctor-dashboard') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link to="/doctor-all-patients" className={`nav-item ${isActive('/doctor-all-patients') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>All Patients</span>
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

export default DoctorLayout;
