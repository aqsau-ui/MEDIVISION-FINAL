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

  // Chat state
  const [chatTarget, setChatTarget] = useState(null); // { doctorId, doctorName }

  const handleOpenChat = (prescription) => {
    const doctorId = parseInt(prescription.doctor_id, 10) || prescription.doctor_id;
    setChatTarget({
      doctorId,
      doctorName: `Dr. ${prescription.doctor_name}`,
    });
  };

  useEffect(() => {
    fetchPrescriptions();
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
        setPrescriptions(sentPrescriptions);
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
              {prescriptions.map((prescription, index) => (
                <div key={prescription._id || index} className="prescription-card">
                  <div className="prescription-card-header">
                    <h3>Dr. {prescription.doctor_name}</h3>
                    <span className="prescription-date">{formatDate(prescription.created_at)}</span>
                  </div>
                  <div className="prescription-card-body">
                    <div className="prescription-info">
                      <p><strong>Specialization:</strong> {prescription.doctor_specialization}</p>
                      <p><strong>PMDC Number:</strong> {prescription.doctor_license}</p>
                      <p><strong>Diagnosis:</strong> {prescription.doctor_diagnosis}</p>
                    </div>
                  </div>
                  <div className="prescription-card-footer">
                    <button
                      onClick={() => handleViewPrescription(prescription)}
                      className="view-prescription-btn"
                    >
                      View Full Prescription
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescription Modal */}
        {showPrescriptionModal && selectedPrescription && (
          <div className="prescription-modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
            <div className="prescription-modal-content" onClick={(e) => e.stopPropagation()}>
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
                  prescription={selectedPrescription}
                  patientReport={selectedPatientReport ? {
                    patient: {
                      age: selectedPatientReport.patient?.age || selectedPrescription.patient_age || 'N/A',
                      dateOfBirth: null,
                      gender: selectedPatientReport.patient?.gender || 'Not specified',
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
                      severity: selectedPatientReport.analysis?.severity || ''
                    }
                  } : {
                    patient: {
                      age: selectedPrescription.patient_age || 'N/A',
                      dateOfBirth: null,
                      gender: 'Not specified',
                      smokingStatus: 'Unknown',
                      symptoms: 'Not recorded',
                      hasCough: 'Not recorded',
                      medicalHistory: 'Not recorded'
                    },
                    analysis: {
                      prediction: selectedPrescription.diagnosis_confirmation || 'N/A',
                      confidence: 0,
                      severity: ''
                    }
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
