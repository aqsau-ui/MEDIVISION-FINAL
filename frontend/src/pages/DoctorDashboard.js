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
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureMode, setSignatureMode] = useState('upload');
  const signaturePadRef = useRef(null);
  const [editFormData, setEditFormData] = useState({
    medicalDegrees: [],
    specializations: [],
    countryOfSpecialization: '',
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
  
  // Theme toggle
  const [isDark, setIsDark] = useState(true);

  // Progress report states
  const [progressReports, setProgressReports] = useState([]);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [selectedProgressReport, setSelectedProgressReport] = useState(null);
  const [progressCommentForm, setProgressCommentForm] = useState({
    clinical_impression: '', recommendations: '', medications: '', follow_up: '', additional_notes: '', hospital_visit_required: false,
  });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'progress'

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
            // Migrate old single-value specialization to array
            if (profile.specialization && !profile.specializations) {
              profile.specializations = profile.specialization ? [profile.specialization] : [];
            }
            if (!profile.specializations) profile.specializations = [];
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
        const response = await fetch(`http://localhost:8000/api/reports/doctor/${doctor.id}`);
        const data = await response.json();
        
        console.log('Reports response:', data);
        
        if (data.success) {
          console.log(`Received ${data.count} reports:`, data.reports);
          setPatientReports(data.reports);
          
          // Transform only AI diagnostic reports for "Recent Patient Cases".
          // Progress reports have a different shape and are shown in the Progress tab.
          const transformedPatients = (data.reports || [])
            .filter(report => report.reportType !== 'progress')
            .map(report => ({
              id: report.reportId,
              name: report.patient?.name || report.patientName || 'Unknown',
              date: report.sentAt || report.createdAt,
              status: report.status,
              disease: report.analysis?.prediction || 'Unknown',
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
    const iv = setInterval(fetchPatientReports, 12000);
    return () => clearInterval(iv);
  }, [doctor]);

  // Fetch progress reports sent to this doctor
  useEffect(() => {
    const fetchProgressReports = async () => {
      if (!doctor) return;
      try {
        const res = await fetch(`http://localhost:8000/api/progress-reports/for-doctor/${doctor.id}`);
        const data = await res.json();
        if (data.success) setProgressReports(data.reports || []);
      } catch (e) { console.warn('Progress reports fetch failed:', e.message); }
    };
    fetchProgressReports();
    const iv = setInterval(fetchProgressReports, 12000);
    return () => clearInterval(iv);
  }, [doctor]);

  const handleOpenProgressReport = async (report) => {
    // Fetch full detail (with images)
    try {
      const res = await fetch(`http://localhost:8000/api/progress-reports/detail/${report.reportId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProgressReport(data.report);
        setProgressCommentForm({ clinical_impression: '', recommendations: '', medications: '', follow_up: '', additional_notes: '', hospital_visit_required: false });
        setCommentSuccess(false);
        setShowProgressPanel(true);
      }
    } catch { alert('Failed to load report details.'); }
  };

  const handleSubmitProgressComment = async () => {
    if (!selectedProgressReport || !doctor) return;
    if (!progressCommentForm.clinical_impression.trim() || !progressCommentForm.recommendations.trim()) {
      alert('Please fill in Clinical Impression and Recommendations before sending.');
      return;
    }
    setSubmittingComment(true);
    try {
      const savedProfile = JSON.parse(localStorage.getItem(`doctorProfile_${doctor.id}`) || '{}');
      const payload = {
        progress_report_id: selectedProgressReport.reportId,
        doctor_id: String(doctor.id),
        doctor_name: doctor.fullName || doctor.full_name || doctor.name || 'Doctor',
        doctor_license: doctor.pmdc_number || doctor.pmdcNumber || '',
        doctor_specialization: savedProfile.specializations?.[0] || '',
        doctor_qualifications: (savedProfile.medicalDegrees || []).join(', ') || 'MBBS',
        doctor_signature: signaturePreview || null,
        ...progressCommentForm,
      };
      const res = await fetch('http://localhost:8000/api/progress-reports/doctor-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setCommentSuccess(true);
        // Refresh progress reports list
        const res2 = await fetch(`http://localhost:8000/api/progress-reports/for-doctor/${doctor.id}`);
        const data2 = await res2.json();
        if (data2.success) setProgressReports(data2.reports || []);
      } else { alert(data.detail || 'Failed to submit comments.'); }
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmittingComment(false); }
  };

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
        if (diseaseFilter === 'pneumonia') {
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

  // Poll unread chat message count every 30s
  useEffect(() => {
    if (!doctor?.id) return;
    const fetchUnread = () => {
      fetch(`http://localhost:8000/api/patient-chat/sessions/doctor/${doctor.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const total = (d.sessions || []).reduce((sum, s) => sum + (s.unread_count || 0), 0);
            setUnreadChatCount(total);
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [doctor?.id]);

  const fetchTrendNotifications = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/notifications/disease-trends');
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

  const handleSaveProfile = async () => {
    const profileData = {
      ...editFormData,
      profilePhoto: profilePhoto,
      signature: signaturePreview
    };
    localStorage.setItem(`doctorProfile_${doctor.id}`, JSON.stringify(profileData));

    // Persist to backend
    try {
      await fetch(`http://localhost:8000/api/doctors/${doctor.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profilePhoto: profilePhoto,
          education: editFormData.medicalDegrees.join(', '),
          specialization: editFormData.specializations.join(', '),
          countryOfSpecialization: editFormData.countryOfSpecialization || '',
          experience: editFormData.experience || '',
          workplace: editFormData.workplace || '',
          city: editFormData.city || '',
        })
      });
    } catch (_) {}

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
      const response = await fetch('http://localhost:8000/api/doctor-prescription/submit', {
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
      const response = await fetch('http://localhost:8000/api/doctor-prescription/send-to-patient', {
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
        // Try to update report status to completed — non-critical, don't throw on failure
        try {
          await fetch(`http://localhost:8000/api/reports/update-status/${prescription.report_id}?status=completed`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (_) { /* status update is best-effort */ }

        setSuccessMessage('✅ Prescription sent to patient successfully!');
        setShowSuccessMessage(true);

        // Reflect completion immediately in local state
        const updateStatusToCompleted = (list) =>
          list.map((patient) => {
            const patientReportId = String(patient.reportData?.reportId || patient.id || '');
            const prescriptionReportId = String(prescription.report_id || '');
            if (!patientReportId || !prescriptionReportId || patientReportId !== prescriptionReportId) return patient;
            return { ...patient, status: 'completed', reportData: { ...patient.reportData, status: 'completed' } };
          });

        setPatients((prev) => updateStatusToCompleted(prev));
        setFilteredPatients((prev) => updateStatusToCompleted(prev));

        // Refetch to sync server state
        try {
          const reportsResponse = await fetch(`http://localhost:8000/api/reports/doctor/${doctor.id}`);
          const data = await reportsResponse.json();
          if (data.success) {
            const transformed = (data.reports || [])
              .filter(r => r.reportType !== 'progress')
              .map(report => ({
                id: report.reportId,
                name: report.patient?.name || report.patientName || 'Unknown',
                date: report.sentAt || report.createdAt,
                status: report.status,
                disease: report.analysis?.prediction || 'Unknown',
                reportData: report
              }));
            setPatients(transformed);
            setFilteredPatients(transformed);
          }
        } catch (_) { /* refetch is best-effort */ }

        handleCloseReportModal();
        setTimeout(() => { setShowSuccessMessage(false); setSuccessMessage(''); }, 3000);
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
  const pneumoniaCount = patients.filter(p => p.disease?.toLowerCase() === 'pneumonia').length;
  const normalCount = patients.filter(p => p.disease?.toLowerCase() === 'normal').length;
  const totalDiseases = pneumoniaCount + normalCount;
  const pneumoniaPercentage = totalDiseases > 0 ? (pneumoniaCount / totalDiseases * 100).toFixed(1) : 0;
  const normalPercentage = totalDiseases > 0 ? (normalCount / totalDiseases * 100).toFixed(1) : 0;

  const medicalDegreeOptions = ['MBBS', 'BDS', 'FCPS', 'MD', 'MS', 'DO', 'FRCS'];
  const specializationOptions = [
    'General Physician', 'Pulmonologist', 'Cardiologist', 'Radiologist',
    'Medical Specialist', 'Dermatologist', 'Gynecologist', 'Neurologist',
    'Pediatrician', 'Orthopedic', 'Psychiatrist', 'Oncologist',
    'Gastroenterologist', 'Endocrinologist', 'Nephrologist', 'Urologist',
    'Ophthalmologist', 'ENT Specialist', 'Anesthesiologist', 'Surgeon',
  ];
  const experienceOptions = ['0-2 Years', '3-5 Years', '6-10 Years', '10+ Years'];
  const allCountries = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
    'Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia',
    'Brazil','Bulgaria','Canada','Chile','China','Colombia','Croatia','Cuba','Cyprus',
    'Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia','Finland','France',
    'Georgia','Germany','Ghana','Greece','Guatemala','Hungary','India','Indonesia','Iran',
    'Iraq','Ireland','Israel','Italy','Japan','Jordan','Kazakhstan','Kenya','Kuwait',
    'Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Malta',
    'Mauritius','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands','New Zealand',
    'Nigeria','Norway','Oman','Pakistan','Palestine','Panama','Peru','Philippines','Poland',
    'Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia','Singapore',
    'Slovakia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden',
    'Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia','Turkey','Uganda',
    'Ukraine','United Arab Emirates','United Kingdom','United States','Uzbekistan',
    'Venezuela','Vietnam','Yemen','Zimbabwe',
  ];

  const pendingPatients = filteredPatients.filter((patient) => {
    const normalizedStatus = String(patient.status || '').toLowerCase();
    return normalizedStatus !== 'completed';
  });

  const completedPatients = filteredPatients.filter((patient) => {
    const normalizedStatus = String(patient.status || '').toLowerCase();
    return normalizedStatus === 'completed';
  });

  const displayedPatients =
    statusFilter === 'completed'
      ? completedPatients
      : statusFilter === 'pending'
        ? pendingPatients
        : filteredPatients;

  const filteredProgressReports = progressReports.filter((r) => {
    const patientName = (r.patientName || '').toLowerCase();
    const prediction = (r.analysis?.prediction || '').toLowerCase();
    const progressStatus = String(r.status || '').toLowerCase();

    const matchesSearch = !searchTerm || patientName.includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = progressStatus === 'progress';
    } else if (statusFilter === 'completed') {
      matchesStatus = progressStatus === 'commented';
    }

    const matchesDisease = diseaseFilter === 'all' || prediction === diseaseFilter;

    return matchesSearch && matchesStatus && matchesDisease;
  });

  const casesTitle = statusFilter === 'completed' ? 'Completed Cases' : 'Recent Patient Cases';
  const emptyCasesMessage = statusFilter === 'completed' ? 'No completed cases found.' : 'No patients found.';

  return (
    <div className={`dd-root${isDark ? '' : ' dd-root--light'}`}>
      {/* Top Navbar */}
      <nav className="dd-navbar">
        <div className="dd-navbar-inner">
          <div className="dd-navbar-left">
            <Logo />
          </div>
          <div className="dd-navbar-right">
            {/* Theme Toggle */}
            <button className="dd-icon-btn dd-theme-toggle" title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'} onClick={() => setIsDark(v => !v)}>
              {isDark ? (
                /* Sun icon for switching to light */
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                /* Moon icon for switching to dark */
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button className="dd-icon-btn" title="Patient Chat" onClick={() => setShowChatInbox(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {unreadChatCount > 0 && (
                <span className="dd-badge">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </button>
            <button className="dd-icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notificationCount > 0 && (
                <span className="dd-badge">{notificationCount}</span>
              )}
            </button>
            <div className="dd-profile-wrap">
              <button className="dd-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="dd-profile-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span className="dd-profile-name">{doctor.fullName || 'Dr. User'}</span>
              </button>
              {showProfileMenu && (
                <div className="dd-profile-menu">
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
        <div className="dd-notif-overlay" onClick={() => setShowNotifications(false)}>
          <div className="dd-notif-container" onClick={(e) => e.stopPropagation()}>
            <TrendNotificationPanel
              trendData={trendData}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dd-main">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className={`dd-toast ${successMessage.includes('✅') ? 'dd-toast--success' : 'dd-toast--error'}`}>
            {successMessage}
          </div>
        )}
        
        {/* Top Section - Two Columns */}
        <div className="dd-top-section">
          {/* Left: Doctor Information Card */}
          <div className="dd-doctor-card">
            <div className="dd-doctor-header">
              <div className="dd-doctor-avatar">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
              </div>
              <div className="dd-doctor-title">
                <h2>{doctor.fullName || 'Dr. User'}</h2>
                <div className="dd-verified-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  <span>Verified</span>
                </div>
              </div>
            </div>
            <div className="dd-doctor-details">
              <div className="dd-detail-item">
                <span className="dd-detail-label">PMDC Registration</span>
                <span className="dd-detail-value">{doctor.pmdcNumber || 'Not provided'}</span>
              </div>
              {editFormData.medicalDegrees.length > 0 && (
                <div className="dd-detail-item">
                  <span className="dd-detail-label">Medical Degree(s)</span>
                  <span className="dd-detail-value">{editFormData.medicalDegrees.join(', ')}</span>
                </div>
              )}
              {(editFormData.specializations || []).length > 0 && (
                <div className="dd-detail-item">
                  <span className="dd-detail-label">Specialization</span>
                  <span className="dd-detail-value">{(editFormData.specializations || []).join(', ')}</span>
                </div>
              )}
              {editFormData.experience && (
                <div className="dd-detail-item">
                  <span className="dd-detail-label">Experience</span>
                  <span className="dd-detail-value">{editFormData.experience}</span>
                </div>
              )}
              {editFormData.workplace && (
                <div className="dd-detail-item">
                  <span className="dd-detail-label">Hospital / Clinic</span>
                  <span className="dd-detail-value">{editFormData.workplace}</span>
                </div>
              )}
              {editFormData.city && (
                <div className="dd-detail-item">
                  <span className="dd-detail-label">City</span>
                  <span className="dd-detail-value">{editFormData.city}</span>
                </div>
              )}
              <button className="dd-edit-profile-btn" onClick={handleEditProfile}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Profile
              </button>
            </div>
          </div>

          {/* Right: Disease Analytics Chart */}
          <div className="dd-analytics-card">
            <div className="dd-analytics-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
              </svg>
              <h3 className="dd-chart-title">Disease Distribution</h3>
            </div>
            <div className="dd-chart-container">
              <div className="dd-chart-legend">
                <div className="dd-legend-item">
                  <span className="dd-legend-color dd-legend-color--pneumonia"></span>
                  <span className="dd-legend-label">Pneumonia</span>
                  <span className="dd-legend-value">{pneumoniaCount} ({pneumoniaPercentage}%)</span>
                </div>
                <div className="dd-legend-item">
                  <span className="dd-legend-color dd-legend-color--normal"></span>
                  <span className="dd-legend-label">Normal</span>
                  <span className="dd-legend-value">{normalCount} ({normalPercentage}%)</span>
                </div>
              </div>
              <div className="dd-donut-chart">
                <svg viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#4FD1C5"
                    strokeWidth="40"
                    strokeDasharray={`${pneumoniaPercentage * 5.03} ${500 - pneumoniaPercentage * 5.03}`}
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
                    strokeDashoffset={`-${pneumoniaPercentage * 5.03}`}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="dd-chart-center">
                  <div className="dd-total-cases">{totalDiseases}</div>
                  <div className="dd-total-label">Total Cases</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Two Columns */}
        <div className="dd-bottom-section">
          {/* Left: Filters Card */}
          <div className="dd-filters-card">
            <h3>Filter Patients</h3>
            <div className="dd-filter-group">
              <label>Search Patient</label>
              <input
                type="text"
                placeholder="Enter patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dd-filter-input"
              />
            </div>
            <div className="dd-filter-group">
              <label>Patient Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="dd-filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="dd-filter-group">
              <label>Disease</label>
              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                className="dd-filter-select"
              >
                <option value="all">All Diseases</option>
                <option value="normal">Normal</option>
                <option value="pneumonia">Pneumonia</option>
              </select>
            </div>
          </div>

          {/* Right: Patient Cases + Progress Reports Tabs */}
          <div className="dd-patients-card">
            {/* Tab bar */}
            <div className="dd-tab-bar">
              <button className={`dd-tab${activeTab === 'cases' ? ' active' : ''}`} onClick={() => setActiveTab('cases')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {casesTitle}
              </button>
              <button className={`dd-tab${activeTab === 'progress' ? ' active' : ''}`} onClick={() => setActiveTab('progress')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Progress Reports
                {progressReports.filter(r => r.status === 'progress').length > 0 && (
                  <span className="dd-tab-badge">{progressReports.filter(r => r.status === 'progress').length}</span>
                )}
              </button>
            </div>

            {/* ── AI Diagnostic Cases Tab ── */}
            {activeTab === 'cases' && (
              <div className="dd-table-wrap">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Date</th>
                      <th>Prediction</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPatients.map(patient => (
                      <tr key={patient.id}>
                        <td>{patient.name}</td>
                        <td>{new Date(patient.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`dd-pill ${
                            patient.disease === 'Normal' ? 'dd-pill--normal' :
                            patient.disease === 'Pneumonia' ? 'dd-pill--pneumonia' :
                            'dd-pill--other'
                          }`}>
                            {patient.disease}
                          </span>
                        </td>
                        <td>
                          <button className="dd-view-btn" onClick={() => { setSelectedReport(patient.reportData); setShowReportModal(true); }}>
                            View Case
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayedPatients.length === 0 && (
                  <div className="dd-empty"><p>{emptyCasesMessage}</p></div>
                )}
              </div>
            )}

            {/* ── Progress Reports Tab ── */}
            {activeTab === 'progress' && (
              <div className="dd-table-wrap">
                {filteredProgressReports.length === 0 ? (
                  <div className="dd-empty"><p>No progress reports received yet.</p></div>
                ) : (
                  <table className="dd-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>AI Prediction</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProgressReports.map(r => (
                        <tr key={r.reportId}>
                          <td><span className="dd-patient-name">{r.patientName}</span></td>
                          <td>{new Date(r.sentAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`dd-pill ${
                              r.analysis?.prediction === 'Normal' ? 'dd-pill--normal' :
                              r.analysis?.prediction === 'Pneumonia' ? 'dd-pill--pneumonia' :
                              'dd-pill--other'
                            }`}>{r.analysis?.prediction || 'N/A'}</span>
                          </td>
                          <td>
                            <span className={`dd-status-pill ${r.status === 'commented' ? 'dd-status-pill--done' : 'dd-status-pill--pending'}`}>
                              {r.status === 'commented' ? '✓ Commented' : '⏳ Awaiting Review'}
                            </span>
                          </td>
                          <td>
                            <button className="dd-view-btn dd-view-btn--progress" onClick={() => handleOpenProgressReport(r)}>
                              {r.status === 'commented' ? 'View' : 'Open & Comment'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Progress Report Review Panel ══ */}
      {showProgressPanel && selectedProgressReport && (
        <div className="dd-modal-overlay" onClick={() => setShowProgressPanel(false)}>
          <div className="dd-modal dd-progress-modal" onClick={e => e.stopPropagation()}>
            <div className="dd-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--dd-teal)" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <div>
                  <h2 className="dd-modal-title">Progress Report — {selectedProgressReport.patientName}</h2>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--dd-text-3)', margin: 0 }}>
                    Submitted {new Date(selectedProgressReport.sentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button className="dd-modal-close" onClick={() => setShowProgressPanel(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="dd-modal-body dd-progress-body">
              {/* ── AI Analysis Summary ── */}
              <div className="dd-prog-section">
                <h4 className="dd-prog-section-title">AI Analysis Summary</h4>
                <div className="dd-prog-metrics">
                  <div className="dd-prog-metric">
                    <span className="dd-prog-metric-label">Prediction</span>
                    <span className={`dd-pill ${selectedProgressReport.analysis?.prediction === 'Normal' ? 'dd-pill--normal' : 'dd-pill--pneumonia'}`}>
                      {selectedProgressReport.analysis?.prediction || 'N/A'}
                    </span>
                  </div>
                  <div className="dd-prog-metric">
                    <span className="dd-prog-metric-label">Confidence</span>
                    <span className="dd-prog-metric-value">{selectedProgressReport.analysis?.confidence ? (selectedProgressReport.analysis.confidence * 100).toFixed(1) + '%' : 'N/A'}</span>
                  </div>
                  <div className="dd-prog-metric">
                    <span className="dd-prog-metric-label">Severity</span>
                    <span className="dd-prog-metric-value">{selectedProgressReport.analysis?.severity || 'N/A'}</span>
                  </div>
                  <div className="dd-prog-metric">
                    <span className="dd-prog-metric-label">Health Score</span>
                    <span className="dd-prog-metric-value">{selectedProgressReport.analysis?.healthScore != null ? `${selectedProgressReport.analysis.healthScore}/100` : 'N/A'}</span>
                  </div>
                </div>
                {selectedProgressReport.analysis?.comparison && (
                  <div className="dd-prog-comparison">
                    <p className="dd-prog-comp-title">Comparison with Previous X-Ray</p>
                    <div className="dd-prog-comp-row">
                      <span>Prev. Disease Prob: <strong>{selectedProgressReport.analysis.comparison.previous_probability?.toFixed(1)}%</strong></span>
                      <span>→</span>
                      <span>Current: <strong>{selectedProgressReport.analysis.comparison.current_probability?.toFixed(1)}%</strong></span>
                      <span className={`dd-prog-status-tag ${selectedProgressReport.analysis.comparison.status === 'Improved' ? 'dd-prog-status-tag--better' : selectedProgressReport.analysis.comparison.status === 'Worsened' ? 'dd-prog-status-tag--worse' : 'dd-prog-status-tag--same'}`}>
                        {selectedProgressReport.analysis.comparison.status}
                      </span>
                    </div>
                    <div className="dd-prog-comp-row">
                      <span>Prev. Health Score: <strong>{selectedProgressReport.analysis.comparison.previous_health_score ?? 'N/A'}/100</strong></span>
                      <span>→</span>
                      <span>Current: <strong>{selectedProgressReport.analysis.comparison.current_health_score ?? selectedProgressReport.analysis?.healthScore ?? 'N/A'}/100</strong></span>
                    </div>
                    <div className="dd-prog-comp-row">
                      <span>SSIM Similarity</span>
                      <span>:</span>
                      <span><strong>{selectedProgressReport.analysis.comparison.ssim_score != null ? `${(selectedProgressReport.analysis.comparison.ssim_score * 100).toFixed(2)}%` : 'N/A'}</strong></span>
                    </div>
                    {selectedProgressReport.analysis.summary && (
                      <p className="dd-prog-summary-text">{selectedProgressReport.analysis.summary}</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── X-Ray Images ── */}
              {selectedProgressReport.images && (
                <div className="dd-prog-section">
                  <h4 className="dd-prog-section-title">Radiographic Images</h4>
                  <div className="dd-prog-images">
                    {selectedProgressReport.images.currentXray && (
                      <div className="dd-prog-img-card">
                        <p className="dd-prog-img-label">Current X-Ray</p>
                        <img src={selectedProgressReport.images.currentXray} alt="Current X-ray" className="dd-prog-img" />
                      </div>
                    )}
                    {selectedProgressReport.images.heatmap && (
                      <div className="dd-prog-img-card">
                        <p className="dd-prog-img-label">Affected Regions (Heatmap)</p>
                        <img src={selectedProgressReport.images.heatmap} alt="Heatmap" className="dd-prog-img" />
                      </div>
                    )}
                    {selectedProgressReport.images.previousXray && (
                      <div className="dd-prog-img-card">
                        <p className="dd-prog-img-label">Previous X-Ray</p>
                        <img src={selectedProgressReport.images.previousXray} alt="Previous X-ray" className="dd-prog-img" />
                      </div>
                    )}
                    {selectedProgressReport.images.previousHeatmap && (
                      <div className="dd-prog-img-card">
                        <p className="dd-prog-img-label">Previous Heatmap</p>
                        <img src={selectedProgressReport.images.previousHeatmap} alt="Previous heatmap" className="dd-prog-img" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Doctor Comments Form / Already Commented ── */}
              {commentSuccess || selectedProgressReport.status === 'commented' ? (
                <div className="dd-prog-commented-banner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#276749" strokeWidth="2.5" width="22" height="22"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <div>
                    <strong>Comments submitted and sent to patient.</strong>
                    <p>The patient can now view your clinical feedback in the Doctor Recommendations page.</p>
                  </div>
                </div>
              ) : (
                <div className="dd-prog-section">
                  <h4 className="dd-prog-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Give Clinical Comments
                  </h4>
                  <p className="dd-prog-form-note">Your comments will be sent directly to the patient and appear in their Doctor Recommendations as a progress report result.</p>

                  <div className="dd-prog-form">
                    <div className="dd-form-group">
                      <label className="dd-form-label">Clinical Impression <span style={{color:'var(--dd-red)'}}>*</span></label>
                      <textarea
                        className="dd-form-textarea"
                        rows={3}
                        placeholder="e.g. Compared to the previous scan, there is mild improvement in the right lower lobe infiltration…"
                        value={progressCommentForm.clinical_impression}
                        onChange={e => setProgressCommentForm(f => ({ ...f, clinical_impression: e.target.value }))}
                      />
                    </div>
                    <div className="dd-form-group">
                      <label className="dd-form-label">Recommendations <span style={{color:'var(--dd-red)'}}>*</span></label>
                      <textarea
                        className="dd-form-textarea"
                        rows={3}
                        placeholder="e.g. Continue prescribed antibiotics, rest, avoid strenuous activity. Follow up in 2 weeks…"
                        value={progressCommentForm.recommendations}
                        onChange={e => setProgressCommentForm(f => ({ ...f, recommendations: e.target.value }))}
                      />
                    </div>
                    <div className="dd-prog-form-row">
                      <div className="dd-form-group">
                        <label className="dd-form-label">Medications (if any)</label>
                        <input
                          className="dd-form-input"
                          placeholder="e.g. Amoxicillin 500mg, continue previous"
                          value={progressCommentForm.medications}
                          onChange={e => setProgressCommentForm(f => ({ ...f, medications: e.target.value }))}
                        />
                      </div>
                      <div className="dd-form-group">
                        <label className="dd-form-label">Follow-Up</label>
                        <input
                          className="dd-form-input"
                          placeholder="e.g. Repeat X-ray in 3 weeks"
                          value={progressCommentForm.follow_up}
                          onChange={e => setProgressCommentForm(f => ({ ...f, follow_up: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="dd-form-group">
                      <label className="dd-form-label">Additional Notes</label>
                      <textarea
                        className="dd-form-textarea"
                        rows={2}
                        placeholder="Any other observations or advice…"
                        value={progressCommentForm.additional_notes}
                        onChange={e => setProgressCommentForm(f => ({ ...f, additional_notes: e.target.value }))}
                      />
                    </div>
                    <label className="dd-prog-checkbox-row">
                      <input type="checkbox" checked={progressCommentForm.hospital_visit_required} onChange={e => setProgressCommentForm(f => ({ ...f, hospital_visit_required: e.target.checked }))} />
                      Hospital / Clinic Visit Required
                    </label>
                  </div>

                  <div className="dd-prog-form-footer">
                    <button className="dd-btn-action" onClick={() => setShowProgressPanel(false)}>Cancel</button>
                    <button className="dd-btn-primary" disabled={submittingComment} onClick={handleSubmitProgressComment}>
                      {submittingComment
                        ? <><span className="dd-spinner-sm"/>Sending…</>
                        : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg> Send Comments to Patient</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="dd-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="dd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dd-modal-header">
              <h2>Edit Profile</h2>
              <button className="dd-modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="dd-modal-body">
              <div className="dd-form-group">
                <label>Profile Photo</label>
                <div className="dd-photo-upload">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="dd-profile-preview" />
                  ) : (
                    <div className="dd-profile-placeholder">
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
                  <label htmlFor="photo-upload" className="dd-upload-btn">
                    Upload Photo
                  </label>
                </div>
              </div>

              <div className="dd-form-group">
                <label>Medical Degree(s)</label>
                <div className="dd-checkbox-group">
                  {medicalDegreeOptions.map(degree => (
                    <label key={degree} className="dd-checkbox-label">
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

              <div className="dd-form-group">
                <label>Specialization(s) <span style={{fontWeight:400,fontSize:'12px',color:'var(--c-text-muted)'}}>(select all that apply)</span></label>
                <div className="dd-checkbox-group">
                  {specializationOptions.map(spec => (
                    <label key={spec} className="dd-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editFormData.specializations || []).includes(spec)}
                        onChange={() => {
                          const prev = editFormData.specializations || [];
                          const next = prev.includes(spec)
                            ? prev.filter(s => s !== spec)
                            : [...prev, spec];
                          setEditFormData(d => ({ ...d, specializations: next }));
                        }}
                      />
                      <span>{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="dd-form-group">
                <label>Country of Specialization / Training</label>
                <select
                  name="countryOfSpecialization"
                  value={editFormData.countryOfSpecialization || ''}
                  onChange={handleEditFormChange}
                  className="dd-modal-select"
                >
                  <option value="">Select Country</option>
                  {allCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="dd-form-group">
                <label>Years of Experience</label>
                <select
                  name="experience"
                  value={editFormData.experience}
                  onChange={handleEditFormChange}
                  className="dd-modal-select"
                >
                  <option value="">Select Experience</option>
                  {experienceOptions.map(exp => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              <div className="dd-form-group">
                <label>Current Workplace / Hospital / Clinic</label>
                <input
                  type="text"
                  name="workplace"
                  value={editFormData.workplace}
                  onChange={handleEditFormChange}
                  placeholder="Enter hospital or clinic name"
                  className="dd-modal-input"
                />
              </div>

              <div className="dd-form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={editFormData.city}
                  onChange={handleEditFormChange}
                  placeholder="Enter city"
                  className="dd-modal-input"
                />
              </div>

              {/* Digital Signature Section */}
              <div className="dd-form-group dd-signature-section">
                <label>Digital Signature</label>
                <p className="dd-signature-info">Your signature will appear on all prescriptions you issue</p>

                <div className="dd-sig-tabs">
                  <button
                    type="button"
                    className={`dd-sig-tab${signatureMode === 'upload' ? ' dd-sig-tab--active' : ''}`}
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
                    className={`dd-sig-tab${signatureMode === 'draw' ? ' dd-sig-tab--active' : ''}`}
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
                  <div className="dd-sig-upload-wrap">
                    {signaturePreview && (
                      <div className="dd-sig-preview">
                        <img src={signaturePreview} alt="Signature Preview" />
                        <button
                          type="button"
                          className="dd-sig-remove-btn"
                          onClick={handleRemoveSignature}
                          aria-label="Remove signature"
                          title="Remove signature"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
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
                    <label htmlFor="signature-upload" className="dd-sig-upload-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Upload Signature
                    </label>
                    <p className="dd-sig-hint">Upload a PNG or JPG image of your signature (max 2MB)</p>
                  </div>
                ) : (
                  <div className="dd-sig-draw-wrap">
                    {signaturePreview ? (
                      <div className="dd-sig-preview">
                        <img src={signaturePreview} alt="Signature Preview" />
                        <button
                          type="button"
                          className="dd-sig-remove-btn"
                          onClick={handleRemoveSignature}
                          aria-label="Remove signature and redraw"
                          title="Remove signature and redraw"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="dd-sig-pad-wrap">
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
                        <div className="dd-sig-controls">
                          <button
                            type="button"
                            className="dd-sig-clear-btn"
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
                            className="dd-sig-save-btn"
                            onClick={handleSaveDrawnSignature}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Save Signature
                          </button>
                        </div>
                        <p className="dd-sig-hint">Draw your signature above using mouse or touchscreen</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="dd-modal-footer">
              <button className="dd-btn-cancel" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="dd-btn-save" onClick={handleSaveProfile}>
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
        <div className="dd-modal-overlay" onClick={handleCloseReportModal}>
          <div className="dd-modal dd-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="dd-modal-close-row">
              <button
                className="dd-modal-close--danger"
                onClick={handleCloseReportModal}
                aria-label="Close report"
                title="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
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
                <div className="dd-action-row">
                  <button
                    className="dd-btn-action"
                    onClick={handleAddPrescription}
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
                  specialization: (editFormData.specializations || []).join(', ') || 'General Physician',
                  license: doctor.pmdcNumber || 'N/A',
                  signature: doctor.signature || signaturePreview || null
                }}
                onSubmit={handlePrescriptionSubmit}
                onCancel={handleCancelPrescription}
              />
            )}

            {/* Doctor Prescription Report */}
            {showPrescriptionReport && currentPrescription && (
              <div className="dd-rx-body">
                <div className="dd-rx-banner">
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
                  onSendToPatient={() => handleSendToPatient(currentPrescription)}
                />
              </div>
            )}
            
            {/* Debug: Show what state we're in */}
            {showPrescriptionReport && !currentPrescription && (
              <div className="dd-rx-body" style={{ color: 'var(--c-error)' }}>
                Error: showPrescriptionReport is true but currentPrescription is null/undefined
              </div>
            )}

            {!showReviewPanel && !showPrescriptionReport && !selectedReport && (
              <div className="dd-rx-body" style={{ color: 'var(--c-warning)' }}>
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
