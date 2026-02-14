import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './DoctorDashboard.css';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [editFormData, setEditFormData] = useState({
    medicalDegrees: [],
    specialization: '',
    experience: '',
    workplace: '',
    city: ''
  });

  useEffect(() => {
    const doctorData = localStorage.getItem('doctorData');
    if (!doctorData) {
      navigate('/doctor-login');
    } else {
      try {
        const parsedDoctor = JSON.parse(doctorData);
        
        // Load saved profile data
        const savedProfile = localStorage.getItem(`doctorProfile_${parsedDoctor.id}`);
        if (savedProfile && savedProfile !== 'undefined') {
          try {
            const profile = JSON.parse(savedProfile);
            setEditFormData(profile);
            setProfilePhoto(profile.profilePhoto || null);
          } catch (e) {
            console.error('Error parsing profile data:', e);
          }
        }
        
        setDoctor(parsedDoctor);
        // Load real patients data - empty for now
        setPatients([]);
        setFilteredPatients([]);
      } catch (e) {
        console.error('Error parsing doctor data:', e);
        navigate('/doctor-login');
      }
    }
  }, [navigate]);

  // Auto-apply filters when any filter value changes
  useEffect(() => {
    let filtered = [...patients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.status?.toLowerCase().replace(' ', '-') === statusFilter
      );
    }

    // Disease filter
    if (diseaseFilter !== 'all') {
      filtered = filtered.filter(p => 
        p.disease?.toLowerCase() === diseaseFilter
      );
    }

    setFilteredPatients(filtered);
  }, [searchTerm, statusFilter, diseaseFilter, patients]);

  const handleEditProfile = () => {
    setShowEditModal(true);
    setShowProfileMenu(false);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDegreeChange = (degree) => {
    setEditFormData(prev => {
      const degrees = prev.medicalDegrees.includes(degree)
        ? prev.medicalDegrees.filter(d => d !== degree)
        : [...prev.medicalDegrees, degree];
      return { ...prev, medicalDegrees: degrees };
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    const profileData = {
      ...editFormData,
      profilePhoto: profilePhoto
    };
    localStorage.setItem(`doctorProfile_${doctor.id}`, JSON.stringify(profileData));
    setShowEditModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('doctorData');
    navigate('/doctor-login');
  };

  if (!doctor) {
    return null;
  }

  // Calculate disease analytics from real patient data
  const tbCount = patients.filter(p => p.disease?.toLowerCase() === 'tb').length;
  const pneumoniaCount = patients.filter(p => p.disease?.toLowerCase() === 'pneumonia').length;
  const totalDiseases = tbCount + pneumoniaCount;
  const tbPercentage = totalDiseases > 0 ? (tbCount / totalDiseases * 100).toFixed(1) : 0;
  const pneumoniaPercentage = totalDiseases > 0 ? (pneumoniaCount / totalDiseases * 100).toFixed(1) : 0;

  const medicalDegreeOptions = ['MBBS', 'BDS', 'FCPS', 'MD', 'MS', 'DO', 'FRCS'];
  const specializationOptions = ['Pulmonologist', 'Cardiologist', 'Dermatologist', 'Gynecologist', 'General Physician', 'Neurologist', 'Pediatrician', 'Orthopedic', 'Psychiatrist'];
  const experienceOptions = ['0-2 Years', '3-5 Years', '6-10 Years', '10+ Years'];

  return (
    <div className="doctor-dashboard-container">
      {/* Top Navbar */}
      <nav className="doctor-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <Logo />
          </div>
          <div className="navbar-right">
            <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-badge">3</span>
            </button>
            <div className="profile-dropdown">
              <button className="profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="profile-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span className="profile-name">{doctor.fullName || 'Dr. User'}</span>
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <button onClick={handleEditProfile}>Edit Profile</button>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-main-content">
        {/* Top Section - Two Columns */}
        <div className="top-section">
          {/* Left: Doctor Information Card */}
          <div className="doctor-info-card">
            <div className="doctor-header">
              <div className="doctor-avatar-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="doctor-title">
                <h2>{doctor.fullName || 'Dr. User'}</h2>
                <div className="verified-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  <span>Verified</span>
                </div>
              </div>
            </div>
            <div className="doctor-details">
              <div className="detail-item">
                <span className="detail-label">PMDC Registration</span>
                <span className="detail-value">{doctor.pmdcNumber || 'Not provided'}</span>
              </div>
              {editFormData.medicalDegrees.length > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Medical Degree(s)</span>
                  <span className="detail-value">{editFormData.medicalDegrees.join(', ')}</span>
                </div>
              )}
              {editFormData.specialization && (
                <div className="detail-item">
                  <span className="detail-label">Specialization</span>
                  <span className="detail-value">{editFormData.specialization}</span>
                </div>
              )}
              {editFormData.experience && (
                <div className="detail-item">
                  <span className="detail-label">Experience</span>
                  <span className="detail-value">{editFormData.experience}</span>
                </div>
              )}
              {editFormData.workplace && (
                <div className="detail-item">
                  <span className="detail-label">Hospital / Clinic</span>
                  <span className="detail-value">{editFormData.workplace}</span>
                </div>
              )}
              {editFormData.city && (
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{editFormData.city}</span>
                </div>
              )}
              <button className="edit-profile-btn" onClick={handleEditProfile}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Profile
              </button>
            </div>
          </div>

          {/* Right: Disease Analytics Chart */}
          <div className="analytics-card">
            <h3>Disease Distribution</h3>
            <div className="chart-container">
              <div className="donut-chart">
                <svg viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#38B2AC"
                    strokeWidth="40"
                    strokeDasharray={`${tbPercentage * 5.03} ${500 - tbPercentage * 5.03}`}
                    transform="rotate(-90 100 100)"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#4FD1C5"
                    strokeWidth="40"
                    strokeDasharray={`${pneumoniaPercentage * 5.03} ${500 - pneumoniaPercentage * 5.03}`}
                    strokeDashoffset={`-${tbPercentage * 5.03}`}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="chart-center">
                  <div className="total-cases">{totalDiseases}</div>
                  <div className="total-label">Total Cases</div>
                </div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color tb"></span>
                  <span className="legend-label">Tuberculosis</span>
                  <span className="legend-value">{tbCount} ({tbPercentage}%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color pneumonia"></span>
                  <span className="legend-label">Pneumonia</span>
                  <span className="legend-value">{pneumoniaCount} ({pneumoniaPercentage}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Two Columns */}
        <div className="bottom-section">
          {/* Left: Filters Card */}
          <div className="filters-card">
            <h3>Filter Patients</h3>
            <div className="filter-group">
              <label>Search Patient</label>
              <input
                type="text"
                placeholder="Enter patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Patient Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Disease</label>
              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Diseases</option>
                <option value="tb">Tuberculosis (TB)</option>
                <option value="pneumonia">Pneumonia</option>
              </select>
            </div>
          </div>

          {/* Right: Recent Patient Cases Table */}
          <div className="patients-table-card">
            <h3>Recent Patient Cases</h3>
            <div className="table-wrapper">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(patient => (
                    <tr key={patient.id}>
                      <td>{patient.name}</td>
                      <td>{new Date(patient.date).toLocaleDateString()}</td>
                      <td>
                        <button className="view-case-btn">View Case</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPatients.length === 0 && (
                <div className="no-results">
                  <p>No patients found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Profile Photo</label>
                <div className="photo-upload">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="profile-preview" />
                  ) : (
                    <div className="profile-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    id="photo-upload"
                    style={{display: 'none'}}
                  />
                  <label htmlFor="photo-upload" className="upload-btn">
                    Upload Photo
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Medical Degree(s)</label>
                <div className="checkbox-group">
                  {medicalDegreeOptions.map(degree => (
                    <label key={degree} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editFormData.medicalDegrees.includes(degree)}
                        onChange={() => handleDegreeChange(degree)}
                      />
                      <span>{degree}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Specialization</label>
                <select
                  name="specialization"
                  value={editFormData.specialization}
                  onChange={handleEditFormChange}
                  className="modal-select"
                >
                  <option value="">Select Specialization</option>
                  {specializationOptions.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <select
                  name="experience"
                  value={editFormData.experience}
                  onChange={handleEditFormChange}
                  className="modal-select"
                >
                  <option value="">Select Experience</option>
                  {experienceOptions.map(exp => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Current Workplace / Hospital / Clinic</label>
                <input
                  type="text"
                  name="workplace"
                  value={editFormData.workplace}
                  onChange={handleEditFormChange}
                  placeholder="Enter hospital or clinic name"
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={editFormData.city}
                  onChange={handleEditFormChange}
                  placeholder="Enter city"
                  className="modal-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
