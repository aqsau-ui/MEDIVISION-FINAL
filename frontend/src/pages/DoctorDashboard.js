import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import MedicalReport from '../components/MedicalReport';
import TrendNotificationPanel from '../components/TrendNotificationPanel';
import DoctorReviewPanel from '../components/DoctorReviewPanel';
import DoctorPrescriptionReport from '../components/DoctorPrescriptionReport';
import DoctorChatInbox from '../components/DoctorChatInbox';
import SignatureCanvas from 'react-signature-canvas';
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
  const [showChatInbox, setShowChatInbox] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureMode, setSignatureMode] = useState('upload');
  const signaturePadRef = useRef(null);
  const [editFormData, setEditFormData] = useState({
    medicalDegrees: [],
    specialization: '',
    experience: '',
    workplace: '',
    city: ''
  });
  const [patientReports, setPatientReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [trendData, setTrendData] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const previousCountRef = useRef(0);
  
  // Prescription states
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showPrescriptionReport, setShowPrescriptionReport] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState(null);
  const [submittingPrescription, setSubmittingPrescription] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    const doctorData = localStorage.getItem('doctorData');
    if (!doctorData) {
      navigate('/doctor-login');
    } else {
      try {
        const parsedDoctor = JSON.parse(doctorData);
        console.log('=== DOCTOR LOGIN DATA ===');
        console.log('Doctor object:', parsedDoctor);
        console.log('Doctor fullName:', parsedDoctor.fullName);
        console.log('Doctor full_name:', parsedDoctor.full_name);
        console.log('Doctor name:', parsedDoctor.name);
        console.log('========================');
        
        // Load saved profile data
        const savedProfile = localStorage.getItem(`doctorProfile_${parsedDoctor.id}`);
        if (savedProfile && savedProfile !== 'undefined') {
          try {
            const profile = JSON.parse(savedProfile);
            setEditFormData(profile);
            setProfilePhoto(profile.profilePhoto || null);
            setSignaturePreview(profile.signature || null);
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

  // Fetch patient reports sent to this doctor
  useEffect(() => {
    const fetchPatientReports = async () => {
      if (!doctor) return;

      try {
        console.log('Fetching reports for doctor ID:', doctor.id);
        const response = await fetch(`http://localhost:5000/api/reports/doctor/${doctor.id}`);
        const data = await response.json();
        
        console.log('Reports response:', data);
        
        if (data.success) {
          console.log(`Received ${data.count} reports:`, data.reports);
          setPatientReports(data.reports);
          
          // Transform reports to match existing patients structure
          const transformedPatients = data.reports.map(report => ({
            id: report.reportId,
            name: report.patient.name,
            date: report.sentAt,
            status: report.status,
            disease: report.analysis.prediction,
            reportData: report
          }));
          
          console.log('Transformed patients:', transformedPatients);
          setPatients(transformedPatients);
          setFilteredPatients(transformedPatients);
        } else {
          console.log('No reports found or request failed');
        }
      } catch (error) {
        console.error('Error fetching patient reports:', error);
        console.error('Error details:', error.message, error.stack);
      }
    };

    fetchPatientReports();
  }, [doctor]);

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
      filtered = filtered.filter(p => {
        const patientStatus = p.status?.toLowerCase().replace(/\s+/g, '-');
        return patientStatus === statusFilter;
      });
    }

    // Disease filter
    if (diseaseFilter !== 'all') {
      filtered = filtered.filter(p => {
        const disease = p.disease?.toLowerCase();
        if (diseaseFilter === 'tb') {
          return disease === 'tuberculosis';
        } else if (diseaseFilter === 'pneumonia') {
          return disease === 'pneumonia';
        } else if (diseaseFilter === 'normal') {
          return disease === 'normal';
        }
        return disease === diseaseFilter;
      });
    }

    setFilteredPatients(filtered);
  }, [searchTerm, statusFilter, diseaseFilter, patients]);

  // Fetch trend notifications
  useEffect(() => {
    fetchTrendNotifications();
    const interval = setInterval(fetchTrendNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrendNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/disease-trends');
      const result = await response.json();
      
      if (result.success && result.data) {
        setTrendData(result.data);
        const trendCount = result.data.trending_diseases?.length || 0;
        setNotificationCount(trendCount);
        
        previousCountRef.current = trendCount;
        if (trendCount === 0) {
          setHasPlayedSound(false);
        }
      }
    } catch (error) {
      console.error('Error fetching trend notifications:', error);
    }
  };

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

  const handleSignatureFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Signature file size should not exceed 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSaveDrawnSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const signatureDataURL = signaturePadRef.current.toDataURL('image/png');
      setSignaturePreview(signatureDataURL);
    }
  };

  const handleRemoveSignature = () => {
    setSignaturePreview(null);
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSaveProfile = () => {
    const profileData = {
      ...editFormData,
      profilePhoto: profilePhoto,
      signature: signaturePreview
    };
    localStorage.setItem(`doctorProfile_${doctor.id}`, JSON.stringify(profileData));
    
    // Update doctor data with signature
    const updatedDoctor = {
      ...doctor,
      signature: signaturePreview
    };
    localStorage.setItem('doctorData', JSON.stringify(updatedDoctor));
    setDoctor(updatedDoctor);
    
    setShowEditModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('doctorData');
    navigate('/doctor-login');
  };

  // Prescription handlers
  const handleAddPrescription = () => {
    setShowReviewPanel(true);
  };

  const handlePrescriptionSubmit = async (prescriptionData) => {
    setSubmittingPrescription(true);
    console.log('Submitting prescription data:', prescriptionData);
    
    try {
      const response = await fetch('http://localhost:5000/api/doctor-prescription/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescriptionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Prescription submitted successfully:', result);
        setCurrentPrescription(result.prescription);
        setShowReviewPanel(false);
        setShowPrescriptionReport(true);
        
        // NO immediate removal - we'll refetch after sending to patient
      } else {
        const error = await response.json();
        console.error('Prescription submission error:', error);
        
        // Handle validation errors from FastAPI
        if (Array.isArray(error.detail)) {
          const errorMessages = error.detail.map(err => 
            `${err.loc?.join(' -> ') || 'Field'}: ${err.msg}`
          ).join('\n');
          alert('Validation errors:\n' + errorMessages);
        } else if (typeof error.detail === 'string') {
          alert('Failed to submit prescription: ' + error.detail);
        } else {
          alert('Failed to submit prescription. Please check all required fields.');
        }
      }
    } catch (error) {
      console.error('Error submitting prescription:', error);
      alert('Failed to submit prescription. Please check your connection and try again.');
    } finally {
      setSubmittingPrescription(false);
    }
  };

  const handleCancelPrescription = () => {
    setShowReviewPanel(false);
  };

  const handleDownloadPDF = async (reportRef) => {
    if (!reportRef || !reportRef.current) {
      alert('Unable to generate PDF. Please try again.');
      return;
    }

    try {
      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Hide the download button during PDF generation
      const downloadButton = reportRef.current.querySelector('.no-print');
      if (downloadButton) {
        downloadButton.style.display = 'none';
      }

      // Generate canvas from the prescription report
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Show the download button again
      if (downloadButton) {
        downloadButton.style.display = 'block';
      }

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Doctor_Prescription_${currentPrescription?.patient_name || 'Patient'}_${timestamp}.pdf`;
      
      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleSendToPatient = async (prescription) => {
    try {
      // First, send the prescription to patient
      const response = await fetch('http://localhost:5000/api/doctor-prescription/send-to-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prescription_id: prescription._id,
          patient_id: prescription.patient_id
        }),
      });

      if (response.ok) {
        // Update patient report status to completed
        const statusResponse = await fetch(`http://localhost:5000/api/reports/update-status/${prescription.report_id}?status=completed`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (statusResponse.ok) {
          setSuccessMessage('✅ Prescription sent to patient successfully!');
          setShowSuccessMessage(true);
          
          // Refetch patient reports to update the list
          const reportsResponse = await fetch(`http://localhost:5000/api/reports/doctor/${doctor.id}`);
          const data = await reportsResponse.json();
          
          if (data.success) {
            const transformedPatients = data.reports.map(report => ({
              id: report.reportId,
              name: report.patient.name,
              date: report.sentAt,
              status: report.status,
              disease: report.analysis.prediction,
              reportData: report
            }));
            
            setPatients(transformedPatients);
            setFilteredPatients(transformedPatients);
          }
          
          handleCloseReportModal();
          
          setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage('');
          }, 3000);
        } else {
          throw new Error('Failed to update patient status');
        }
      } else {
        const error = await response.json();
        setSuccessMessage('❌ Failed: ' + (error.detail || 'Unknown error'));
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error sending prescription to patient:', error);
      setSuccessMessage('❌ Failed to send prescription. Please try again.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setShowReviewPanel(false);
    setShowPrescriptionReport(false);
    setCurrentPrescription(null);
  };

  if (!doctor) {
    return null;
  }

  // Calculate disease analytics from real patient data
  const tbCount = patients.filter(p => p.disease?.toLowerCase() === 'tuberculosis').length;
  const pneumoniaCount = patients.filter(p => p.disease?.toLowerCase() === 'pneumonia').length;
  const normalCount = patients.filter(p => p.disease?.toLowerCase() === 'normal').length;
  const totalDiseases = tbCount + pneumoniaCount + normalCount;
  const tbPercentage = totalDiseases > 0 ? (tbCount / totalDiseases * 100).toFixed(1) : 0;
  const pneumoniaPercentage = totalDiseases > 0 ? (pneumoniaCount / totalDiseases * 100).toFixed(1) : 0;
  const normalPercentage = totalDiseases > 0 ? (normalCount / totalDiseases * 100).toFixed(1) : 0;

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
            <button className="notification-btn" title="Patient Chat" onClick={() => setShowChatInbox(true)} style={{ marginRight: '4px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
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

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="notification-dropdown-overlay" onClick={() => setShowNotifications(false)}>
          <div className="notification-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <TrendNotificationPanel 
              trendData={trendData} 
              onClose={() => setShowNotifications(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-main-content">
        {/* Success Message */}
        {showSuccessMessage && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            backgroundColor: successMessage.includes('✅') ? '#38B2AC' : '#E53E3E',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontSize: '16px',
            fontWeight: '600',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {successMessage}
          </div>
        )}
        
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
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#68D391"
                    strokeWidth="40"
                    strokeDasharray={`${normalPercentage * 5.03} ${500 - normalPercentage * 5.03}`}
                    strokeDashoffset={`-${(tbPercentage + pneumoniaPercentage) * 5.03}`}
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
                <div className="legend-item">
                  <span className="legend-color normal"></span>
                  <span className="legend-label">Normal</span>
                  <span className="legend-value">{normalCount} ({normalPercentage}%)</span>
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
                <option value="normal">Normal</option>
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
                    <th>Prediction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(patient => (
                    <tr key={patient.id}>
                      <td>{patient.name}</td>
                      <td>{new Date(patient.date).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: patient.disease === 'Normal' ? '#d1fae5' : 
                                         patient.disease === 'Pneumonia' ? '#fed7aa' : '#fecaca',
                          color: patient.disease === 'Normal' ? '#065f46' : 
                                patient.disease === 'Pneumonia' ? '#92400e' : '#991b1b'
                        }}>
                          {patient.disease}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="view-case-btn"
                          onClick={() => {
                            setSelectedReport(patient.reportData);
                            setShowReportModal(true);
                          }}
                        >
                          View Case
                        </button>
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

              {/* Digital Signature Section */}
              <div className="form-group signature-section">
                <label>Digital Signature</label>
                <p className="signature-info">Your signature will appear on all prescriptions you issue</p>
                
                <div className="signature-mode-tabs">
                  <button
                    type="button"
                    className={`tab-button ${signatureMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setSignatureMode('upload')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload Image
                  </button>
                  <button
                    type="button"
                    className={`tab-button ${signatureMode === 'draw' ? 'active' : ''}`}
                    onClick={() => setSignatureMode('draw')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                    Draw Signature
                  </button>
                </div>

                {signatureMode === 'upload' ? (
                  <div className="signature-upload-container">
                    {signaturePreview && (
                      <div className="signature-preview">
                        <img src={signaturePreview} alt="Signature Preview" />
                        <button 
                          type="button" 
                          className="remove-signature-btn"
                          onClick={handleRemoveSignature}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      id="signature-upload"
                      accept="image/*"
                      onChange={handleSignatureFileChange}
                      style={{display: 'none'}}
                    />
                    <label htmlFor="signature-upload" className="signature-upload-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      {signaturePreview ? 'Change Signature' : 'Upload Signature Image'}
                    </label>
                    <p className="signature-hint">Upload a PNG or JPG image of your signature (max 2MB)</p>
                  </div>
                ) : (
                  <div className="signature-draw-container">
                    {signaturePreview ? (
                      <div className="signature-preview">
                        <img src={signaturePreview} alt="Signature Preview" />
                        <button 
                          type="button" 
                          className="remove-signature-btn"
                          onClick={handleRemoveSignature}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Remove & Redraw
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="signature-pad-wrapper">
                          <SignatureCanvas
                            ref={signaturePadRef}
                            canvasProps={{
                              className: 'signature-pad',
                              width: 500,
                              height: 200
                            }}
                            backgroundColor="white"
                            penColor="black"
                          />
                        </div>
                        <div className="signature-controls">
                          <button 
                            type="button" 
                            className="clear-signature-btn"
                            onClick={handleClearSignature}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10"></polyline>
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            Clear
                          </button>
                          <button 
                            type="button" 
                            className="save-signature-btn"
                            onClick={handleSaveDrawnSignature}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Save Signature
                          </button>
                        </div>
                        <p className="signature-hint">Draw your signature above using mouse or touchscreen</p>
                      </>
                    )}
                  </div>
                )}
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

      {/* Doctor Chat Inbox */}
      {showChatInbox && doctor && (
        <DoctorChatInbox
          doctorId={doctor.id}
          onClose={() => setShowChatInbox(false)}
        />
      )}

      {/* Report Viewing Modal */}
      {showReportModal && selectedReport && (
        <div className="modal-overlay" onClick={handleCloseReportModal}>
          <div className="modal-content" style={{ 
            maxWidth: '1100px', 
            maxHeight: '95vh', 
            overflow: 'auto', 
            padding: '20px',
            backgroundColor: 'white'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button 
                className="modal-close" 
                onClick={handleCloseReportModal}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
              >
                ×
              </button>
            </div>

            {/* AI Medical Report */}
            {!showReviewPanel && !showPrescriptionReport && (
              <>
                <MedicalReport
                  reportData={{
                    date: selectedReport.sentAt,
                    patient: {
                      name: selectedReport.patient?.name || 'Unknown',
                      email: selectedReport.patient?.email || '',
                      age: selectedReport.patient?.age || 0,
                      gender: selectedReport.patient?.gender || 'Not specified',
                      smokingStatus: selectedReport.patient?.smokingStatus || 'Unknown',
                      hasCough: selectedReport.patient?.hasCough || 'No',
                      coughDuration: selectedReport.patient?.coughDuration || 'N/A',
                      coughType: selectedReport.patient?.coughType || 'N/A',
                      dateOfBirth: selectedReport.patient?.dateOfBirth,
                      symptoms: selectedReport.patient?.symptoms
                    },
                    medicalInfo: {
                      symptoms: selectedReport.medicalInfo?.symptoms || 'None reported',
                      medicalHistory: selectedReport.medicalInfo?.medicalHistory || 'None'
                    },
                    analysis: {
                      prediction: selectedReport.analysis?.prediction || 'Unknown',
                      confidence: selectedReport.analysis?.confidence || 0,
                      severity: selectedReport.analysis?.severity || 'Unknown',
                      heatmapExplanation: selectedReport.analysis?.heatmapExplanation || ''
                    },
                    images: {
                      original: selectedReport.images?.original || '',
                      heatmap: selectedReport.images?.heatmap || ''
                    }
                  }}
                  reportId={selectedReport.reportId}
                />

                {/* Add Prescription Button */}
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button 
                    onClick={handleAddPrescription}
                    style={{
                      background: '#38B2AC',
                      color: 'white',
                      border: 'none',
                      padding: '14px 32px',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#2C7A7B';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#38B2AC';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    Add Doctor Prescription
                  </button>
                </div>
              </>
            )}

            {/* Doctor Review Panel */}
            {showReviewPanel && (
              <DoctorReviewPanel
                patientReport={{
                  reportId: selectedReport.reportId,
                  patient: {
                    id: String(selectedReport.patient?.id || selectedReport.patient?.email || selectedReport.patient?.name || 'unknown'),
                    name: selectedReport.patient?.name || 'Unknown',
                    email: selectedReport.patient?.email || '',
                    age: selectedReport.patient?.age || 0,
                    gender: selectedReport.patient?.gender || 'Not specified',
                    dateOfBirth: selectedReport.patient?.dateOfBirth,
                    symptoms: selectedReport.patient?.symptoms
                  },
                  analysis: selectedReport.analysis
                }}
                doctorInfo={{
                  id: String(doctor.id || doctor.email || 'doctor_' + Date.now()),
                  name: (() => {
                    const name = doctor.fullName || doctor.full_name || doctor.name || 'Doctor';
                    console.log('=== PASSING TO REVIEW PANEL ===');
                    console.log('Doctor object:', doctor);
                    console.log('Resolved name:', name);
                    console.log('==============================');
                    return name;
                  })(),
                  qualifications: editFormData.medicalDegrees?.join(', ') || 'MBBS',
                  specialization: editFormData.specialization || 'General Physician',
                  license: doctor.pmdcNumber || 'N/A',
                  signature: doctor.signature || signaturePreview || null
                }}
                onSubmit={handlePrescriptionSubmit}
                onCancel={handleCancelPrescription}
              />
            )}

            {/* Doctor Prescription Report */}
            {showPrescriptionReport && currentPrescription && (
              <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '400px' }}>
                <div style={{ 
                  background: '#2C7A7B',
                  padding: '16px 24px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  Prescription Submitted Successfully
                </div>
                
                <DoctorPrescriptionReport
                  prescription={currentPrescription}
                  patientReport={{
                    patient: {
                      age: selectedReport?.patient?.age,
                      dateOfBirth: selectedReport?.patient?.dateOfBirth,
                      gender: selectedReport?.patient?.gender || 'Not specified',
                      smokingStatus: selectedReport?.patient?.smokingStatus || 'Unknown',
                      hasCough: selectedReport?.patient?.hasCough || 'No',
                      coughDuration: selectedReport?.patient?.coughDuration || 'N/A',
                      coughType: selectedReport?.patient?.coughType || 'N/A',
                      symptoms: selectedReport?.medicalInfo?.symptoms || selectedReport?.patient?.symptoms || 'None',
                      medicalHistory: selectedReport?.medicalInfo?.medicalHistory || 'None'
                    },
                    analysis: {
                      prediction: selectedReport?.analysis?.prediction || 'Unknown',
                      confidence: selectedReport?.analysis?.confidence || 0,
                      severity: selectedReport?.analysis?.severity || 'Unknown'
                    }
                  }}
                  doctor={doctor}
                  onDownloadPDF={handleDownloadPDF}
                />

                {/* Send to Patient Button */}
                <div style={{ 
                  marginTop: '30px', 
                  paddingTop: '20px',
                  borderTop: '2px solid #E2E8F0',
                  textAlign: 'center' 
                }}>
                  <button
                    onClick={() => handleSendToPatient(currentPrescription)}
                    style={{
                      background: '#38B2AC',
                      color: 'white',
                      border: 'none',
                      padding: '14px 32px',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#2C7A7B';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#38B2AC';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    Send to Patient
                  </button>
                </div>
              </div>
            )}
            
            {/* Debug: Show what state we're in */}
            {showPrescriptionReport && !currentPrescription && (
              <div style={{ padding: '20px', color: 'red', backgroundColor: 'white' }}>
                Error: showPrescriptionReport is true but currentPrescription is null/undefined
              </div>
            )}
            
            {!showReviewPanel && !showPrescriptionReport && !selectedReport && (
              <div style={{ padding: '20px', color: 'orange', backgroundColor: 'white' }}>
                No report selected
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
