import React, { useState, useEffect } from 'react';
import PatientLayout from '../components/PatientLayout';
import DoctorPrescriptionReport from '../components/DoctorPrescriptionReport';
import PatientChatPanel from '../components/PatientChatPanel';
import './DoctorRecommendation.css';
import '../components/ChatModule.css';

const DoctorRecommendation = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPatientReport, setSelectedPatientReport] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // Chat state
  const [chatTarget, setChatTarget] = useState(null); // { doctorId, doctorName }

  const handleOpenChat = (prescription) => {
    const doctorId = parseInt(prescription.doctor_id, 10) || prescription.doctor_id;
    setChatTarget({
      doctorId,
      doctorName: `Dr. ${prescription.doctor_name}`,
    });
    setShowPrescriptionModal(false);
  };

  useEffect(() => {
    fetchPrescriptions();
    // Poll every 12 seconds so new prescriptions appear without a manual reload
    const interval = setInterval(fetchPrescriptions, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const patientData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const patientId = patientData.email || patientData.id;

      if (!patientId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:8000/api/doctor-prescription/patient/${patientId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter only prescriptions that have been sent to patient
        const sentPrescriptions = data.prescriptions.filter(p => p.sent_to_patient);
        // Sort newest-first
        sentPrescriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPrescriptions(sentPrescriptions);
        // Determine how many are "new" (not yet seen)
        const viewedCount = parseInt(localStorage.getItem('viewedPrescriptionCount') || '0');
        setNewCount(Math.max(0, sentPrescriptions.length - viewedCount));
        localStorage.setItem('viewedPrescriptionCount', String(sentPrescriptions.length));
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescription = async (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
    setLoadingReport(true);
    
    try {
      // Fetch the patient report data using the report_id from prescription
      const response = await fetch(`http://localhost:8000/api/reports/detail/${prescription.report_id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched patient report:', data);
        if (data.success) {
          setSelectedPatientReport(data.report);
        }
      } else {
        console.error('Failed to fetch patient report');
        // Set default values if fetch fails
        setSelectedPatientReport(null);
      }
    } catch (error) {
      console.error('Error fetching patient report:', error);
      setSelectedPatientReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadPDF = async (reportRef) => {
    if (!reportRef || !reportRef.current) {
      alert('Unable to generate PDF. Please try again.');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const downloadButton = reportRef.current.querySelector('.no-print');
      if (downloadButton) {
        downloadButton.style.display = 'none';
      }

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      if (downloadButton) {
        downloadButton.style.display = 'block';
      }

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Prescription_${selectedPrescription?.patient_name || 'Patient'}_${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <PatientLayout>
      <div className="doctor-recommendation-page-content">
        <div className="doctor-recommendation-header">
          <h1 className="doctor-recommendation-title">Medical Recommendations & Prescriptions</h1>
          <p className="doctor-recommendation-subtitle">View verified prescriptions from your healthcare providers</p>
        </div>

        <div className="doctor-recommendation-content">
          {loading ? (
            <div className="loading-state">
              <p>Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="doctor-recommendation-card">
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3>No doctor recommendations available yet</h3>
                <p>Your reports need to be reviewed by a doctor first</p>
              </div>
            </div>
          ) : (
            <div className="prescriptions-grid">
              {prescriptions.map((prescription, index) => {
                const isNew = index < newCount;
                const isProgress = prescription.report_type === 'progress';
                return (
                <div
                  key={prescription._id || index}
                  className={`prescription-card${isNew ? ' prescription-card--new' : ''}${isProgress ? ' prescription-card--progress' : ''}`}
                >
                  {isNew && <div className="prescription-new-badge">New</div>}
                  {isProgress && (
                    <div className="prescription-progress-ribbon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      Progress Report Result
                    </div>
                  )}
                  <div className="prescription-card-header">
                    <div className="prescription-header-left">
                      <div className={`prescription-doctor-avatar${isProgress ? ' prescription-doctor-avatar--progress' : ''}`}>
                        {isProgress ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3>Dr. {prescription.doctor_name}</h3>
                        <span className="prescription-specialization">
                          {isProgress ? 'Progress Tracking Review' : (prescription.doctor_specialization || 'General Physician')}
                        </span>
                      </div>
                    </div>
                    <span className="prescription-date">{formatDate(prescription.created_at)}</span>
                  </div>
                  <div className="prescription-card-body">
                    <div className="prescription-info">
                      {isProgress ? (
                        <>
                          <div className="prescription-info-row">
                            <span className="prescription-info-label">Type</span>
                            <span className="prescription-info-value prescription-info-value--progress">Progress Tracking Feedback</span>
                          </div>
                          <div className="prescription-info-row">
                            <span className="prescription-info-label">Clinical Impression</span>
                            <span className="prescription-info-value">{prescription.clinical_impression || prescription.doctor_diagnosis || 'See full report'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="prescription-info-row">
                            <span className="prescription-info-label">PMDC</span>
                            <span className="prescription-info-value">{prescription.doctor_license}</span>
                          </div>
                          <div className="prescription-info-row">
                            <span className="prescription-info-label">Diagnosis</span>
                            <span className="prescription-info-value">{prescription.doctor_diagnosis || 'See prescription'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="prescription-card-footer">
                    <button
                      onClick={() => handleViewPrescription(prescription)}
                      className={`view-prescription-btn${isProgress ? ' view-prescription-btn--progress' : ''}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {isProgress ? 'View Progress Report' : 'View Prescription'}
                    </button>
                    {!isProgress && (
                      <button
                        onClick={() => handleOpenChat(prescription)}
                        className="chat-doctor-btn"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Chat
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prescription Modal */}
        {showPrescriptionModal && selectedPrescription && (
          <div className="prescription-modal-overlay" onMouseDown={() => setShowPrescriptionModal(false)}>
            <div className="prescription-modal-content" onMouseDown={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => setShowPrescriptionModal(false)}
              >
                ×
              </button>
              {loadingReport ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p>Loading prescription details...</p>
                </div>
              ) : (
                <DoctorPrescriptionReport
                  compact={true}
                  prescription={selectedPrescription}
                  patientReport={selectedPatientReport ? {
                    patient: {
                        age: selectedPatientReport.patient?.age || selectedPatientReport.patientAge || selectedPatientReport.patientInfo?.age || selectedPrescription.patient_age || 'N/A',
                      dateOfBirth: null,
                        gender: selectedPatientReport.patient?.gender || selectedPatientReport.patientGender || selectedPatientReport.patientInfo?.gender || selectedPrescription.patient_gender || selectedPrescription.patientGender || 'Not specified',
                        smokingStatus: selectedPatientReport.patient?.smokingStatus || 'Unknown',
                        symptoms: selectedPatientReport.medicalInfo?.symptoms || 'Not recorded',
                        hasCough: selectedPatientReport.patient?.hasCough || 'No',
                        coughDuration: selectedPatientReport.patient?.coughDuration || 'N/A',
                        coughType: selectedPatientReport.patient?.coughType || 'N/A',
                        medicalHistory: selectedPatientReport.medicalInfo?.medicalHistory || 'Not recorded'
                    },
                    analysis: {
                      prediction: selectedPatientReport.analysis?.prediction || selectedPrescription.diagnosis_confirmation || 'N/A',
                      confidence: selectedPatientReport.analysis?.confidence || 0,
                        severity: selectedPatientReport.analysis?.severity || '',
                        comparison: selectedPatientReport.analysis?.comparison || null
                      },
                      patientAge: selectedPatientReport.patientAge || selectedPatientReport.patient?.age || selectedPatientReport.patientInfo?.age || selectedPrescription.patient_age || null,
                      patientGender: selectedPatientReport.patientGender || selectedPatientReport.patient?.gender || selectedPatientReport.patientInfo?.gender || selectedPrescription.patient_gender || selectedPrescription.patientGender || null,
                      progressImages: {
                        previousXray: selectedPatientReport.images?.previousXray || selectedPatientReport.images?.previous_xray || '',
                        currentXray: selectedPatientReport.images?.currentXray || selectedPatientReport.images?.current_xray || selectedPatientReport.images?.original || ''
                      },
                      progressComparison: selectedPatientReport.analysis?.comparison || null
                  } : {
                    patient: {
                      age: selectedPrescription.patient_age || 'N/A',
                      dateOfBirth: null,
                        gender: selectedPrescription.patient_gender || selectedPrescription.patientGender || 'Not specified',
                      smokingStatus: 'Unknown',
                      symptoms: 'Not recorded',
                      hasCough: 'Not recorded',
                      medicalHistory: 'Not recorded'
                    },
                    analysis: {
                      prediction: selectedPrescription.diagnosis_confirmation || 'N/A',
                      confidence: 0,
                        severity: '',
                        comparison: null
                      },
                      patientAge: selectedPrescription.patient_age || null,
                    patientGender: selectedPrescription.patient_gender || selectedPrescription.patientGender || null,
                      progressImages: selectedPrescription.report_type === 'progress' ? {
                        previousXray: selectedPrescription.previous_xray || '',
                      currentXray: selectedPrescription.current_xray || ''
                      } : null,
                      progressComparison: selectedPrescription.report_type === 'progress' ? selectedPrescription.progress_analysis?.comparison || null : null
                  }}
                  doctor={{
                    fullName: selectedPrescription.doctor_name,
                    name: selectedPrescription.doctor_name,
                    pmdcNumber: selectedPrescription.doctor_license,
                    specialization: selectedPrescription.doctor_specialization,
                    signature: selectedPrescription.doctor_signature,
                    medicalDegrees: selectedPrescription.doctor_qualifications ? 
                      selectedPrescription.doctor_qualifications.split(', ') : 
                      ['MBBS']
                  }}
                  onDownloadPDF={handleDownloadPDF}
                  onOpenChat={() => handleOpenChat(selectedPrescription)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating chat panel — passes report data so patient can view inside chat */}
      {chatTarget && (
        <PatientChatPanel
          doctorId={chatTarget.doctorId}
          doctorName={chatTarget.doctorName}
          reportData={{
            aiReport:     selectedPatientReport,
            prescription: selectedPrescription,
          }}
          onClose={() => setChatTarget(null)}
        />
      )}
    </PatientLayout>
  );
};

export default DoctorRecommendation;
