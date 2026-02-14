import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const doctorData = localStorage.getItem('doctorData');
    if (!doctorData || doctorData === 'undefined') {
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

  // Sample disease data
  const diseaseData = [
    { name: 'Tuberculosis', count: 0, color: '#ED8936' },
    { name: 'Pneumonia', count: 0, color: '#38B2AC' }
  ];

  const totalCases = diseaseData.reduce((sum, d) => sum + d.count, 0);

  if (!doctor) return null;

  return (
    <div className="doctor-dashboard-new">
      {/* Top Navigation */}
      <nav className="dashboard-top-nav">
        <div className="nav-left">
          <Logo size="medium" />
        </div>
        <div className="nav-center">
          <div className="search-box-nav">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search patients, reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="nav-right">
          <button 
            className="nav-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notification-badge">0</span>
          </button>
          
          <div className="user-profile-menu">
            <button 
              className="profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="profile-avatar">
                {doctor.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="profile-name">{doctor.fullName}</span>
            </button>
            
            {showUserMenu && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <p className="profile-email">{doctor.email}</p>
                  <p className="profile-role">Doctor</p>
                </div>
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

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="notification-panel">
          <h3>Recent Alerts</h3>
          <div className="notification-list">
            <p className="no-notifications">No recurring disease alerts at this time</p>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="dashboard-main-content">
        {/* Stats Overview Grid */}
        <div className="stats-grid-new">
          <div className="stat-card-new total-cases">
            <div className="stat-icon-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div className="stat-details">
              <p className="stat-label-new">Total Patients</p>
              <h2 className="stat-value-new">0</h2>
              <p className="stat-change positive">+0% <span>vs last month</span></p>
            </div>
          </div>

          <div className="stat-card-new conversion">
            <div className="stat-icon-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="stat-details">
              <p className="stat-label-new">Detection Rate</p>
              <h2 className="stat-value-new">0%</h2>
              <p className="stat-change positive">+0% <span>vs last month</span></p>
            </div>
          </div>

          <div className="stat-card-new spending">
            <div className="stat-icon-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-details">
              <p className="stat-label-new">Cases Reviewed</p>
              <h2 className="stat-value-new">0</h2>
              <p className="stat-change neutral">+0 <span>this week</span></p>
            </div>
          </div>

          <div className="stat-card-new budget">
            <div className="stat-icon-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="stat-details">
              <p className="stat-label-new">Accuracy Rate</p>
              <h2 className="stat-value-new">0%</h2>
              <p className="stat-change positive">+0% <span>improvement</span></p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid-new">
          {/* Disease Detection Chart */}
          <div className="card-new chart-card">
            <div className="card-header-new">
              <h3>Disease Detection Overview</h3>
              <p>Distribution of detected diseases</p>
            </div>
            <div className="chart-container-new">
              {totalCases === 0 ? (
                <div className="chart-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p>No disease data available</p>
                </div>
              ) : (
                <>
                  <svg className="pie-chart-new" viewBox="0 0 200 200">
                    {diseaseData.map((disease) => {
                      const percentage = (disease.count / totalCases) * 100;
                      return (
                        <g key={disease.name}>
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke={disease.color}
                            strokeWidth="35"
                            strokeDasharray={`${percentage * 4.4} 440`}
                            transform={`rotate(-90 100 100)`}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="chart-center">
                    <div className="chart-total-new">{totalCases}</div>
                    <div className="chart-label-new">Total</div>
                  </div>
                </>
              )}
            </div>
            <div className="disease-legend-new">
              {diseaseData.map(disease => (
                <div key={disease.name} className="legend-item-new">
                  <span className="legend-dot" style={{ backgroundColor: disease.color }}></span>
                  <span className="legend-name-new">{disease.name}</span>
                  <span className="legend-count-new">{disease.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All Patients List */}
          <div className="card-new patients-card">
            <div className="card-header-new">
              <h3>Recent Patients</h3>
              <p>Latest patient diagnostics</p>
            </div>
            <div className="patients-list-new">
              <div className="empty-patients">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p>No patient data available</p>
              </div>
            </div>
          </div>

          {/* Insights Card */}
          <div className="card-new insights-card">
            <div className="card-header-new">
              <h3>Key Insights & Actions</h3>
            </div>
            <div className="insights-list">
              <div className="insight-item action">
                <div className="insight-icon">⚡</div>
                <div className="insight-content">
                  <p className="insight-title">Action: Monitor TB Detection Trends</p>
                  <p className="insight-desc">Track tuberculosis detection patterns weekly</p>
                </div>
              </div>
              <div className="insight-item caution">
                <div className="insight-icon">⚠️</div>
                <div className="insight-content">
                  <p className="insight-title">Caution: Review Pending Cases</p>
                  <p className="insight-desc">Multiple cases awaiting diagnosis review</p>
                </div>
              </div>
              <div className="insight-item suggestion">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <p className="insight-title">Suggestion: Optimize Review Process</p>
                  <p className="insight-desc">Streamline diagnostic workflow for efficiency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
