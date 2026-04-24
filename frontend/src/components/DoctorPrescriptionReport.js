import React, { useRef } from 'react';
import './DoctorPrescriptionReport.css';

const DoctorPrescriptionReport = ({ prescription, patientReport, onDownloadPDF, doctor, onOpenChat }) => {
  const reportRef = useRef();

  // Debug logging
  console.log('DoctorPrescriptionReport - prescription:', prescription);
  console.log('DoctorPrescriptionReport - patientReport:', patientReport);
  console.log('DoctorPrescriptionReport - doctor:', doctor);

  // Add safety checks
  if (!prescription) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: No prescription data provided</div>;
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };

  return (
    <div className="prescription-container">
      <div className="prescription-report" ref={reportRef}>
        {/* Header */}
        <div className="prescription-header">
          <div className="doctor-info">
            <h1 className="doctor-name">Dr. {doctor?.fullName || doctor?.name || prescription.doctor_name || 'Medical Professional'}</h1>
            <p className="doctor-qualifications">{doctor?.medicalDegrees?.join(', ') || prescription.doctor_qualifications || 'MBBS'}</p>
            <p className="doctor-specialization">Specialist in {doctor?.specialization || prescription.doctor_specialization || 'General Medicine'}</p>
          </div>
          <div className="clinic-info">
            <div className="clinic-logo">
              <span className="logo-icon">+</span>
              <span className="logo-text">MEDIVISION</span>
            </div>
            <p className="license-number">PMDC Number: {doctor?.pmdcNumber || prescription.doctor_license || 'N/A'}</p>
          </div>
        </div>

        <div className="header-divider"></div>

        {/* Patient Details */}
        <div className="patient-details">
          <div className="patient-detail-item">
            <span className="detail-label">Patient Name:</span>
            <span className="detail-value">{prescription.patient_name}</span>
          </div>
          <div className="patient-detail-item">
            <span className="detail-label">Age:</span>
            <span className="detail-value">
              {patientReport.patient.age || calculateAge(patientReport.patient.dateOfBirth)} years
            </span>
          </div>
          <div className="patient-detail-item">
            <span className="detail-label">Gender:</span>
            <span className="detail-value">{patientReport.patient.gender}</span>
          </div>
          <div className="patient-detail-item">
            <span className="detail-label">Report Date:</span>
            <span className="detail-value">{formatDate(prescription.created_at)}</span>
          </div>
        </div>

        <div className="content-divider"></div>

        {/* Main Content Area */}
        <div className="prescription-content">
          {/* Left Sidebar - Patient History */}
          <div className="patient-history-sidebar">
            <h3 className="sidebar-title">Patient History</h3>
            
            <div className="history-section">
              <h4>Symptoms</h4>
              <ul className="history-list">
                {patientReport.patient.symptoms && patientReport.patient.symptoms !== 'None' ? (
                  patientReport.patient.symptoms.split(',').map((symptom, idx) => (
                    <li key={idx}>{symptom.trim()}</li>
                  ))
                ) : (
                  <li>Not specified</li>
                )}
              </ul>
            </div>

            <div className="history-section">
              <h4>Smoking Status</h4>
              <p>{patientReport.patient.smokingStatus || 'Not specified'}</p>
            </div>

            <div className="history-section">
              <h4>Cough Status</h4>
              <p><strong>Has Cough:</strong> {patientReport.patient.hasCough || 'No'}</p>
              {patientReport.patient.hasCough === 'Yes' && (
                <>
                  <p><strong>Duration:</strong> {patientReport.patient.coughDuration || 'N/A'}</p>
                  <p><strong>Type:</strong> {patientReport.patient.coughType || 'N/A'}</p>
                </>
              )}
            </div>

            {patientReport.patient.medicalHistory && patientReport.patient.medicalHistory !== 'None' && (
              <div className="history-section">
                <h4>Medical History</h4>
                <p>{patientReport.patient.medicalHistory}</p>
              </div>
            )}

            <div className="history-section">
              <h4>AI Analysis</h4>
              <p className="ai-prediction">
                <strong>Prediction:</strong> {patientReport.analysis.prediction || 'Unknown'}
              </p>
              <p className="ai-confidence">
                <strong>Confidence:</strong> {((patientReport.analysis.confidence || 0) * 100).toFixed(1)}%
              </p>
              {patientReport.analysis.severity && (
                <p className="ai-severity">
                  <strong>Severity:</strong> {patientReport.analysis.severity}
                </p>
              )}
            </div>
          </div>

          {/* Main Prescription Area */}
          <div className="prescription-main">
            {/* Clinical Notes */}
            <div className="clinical-notes">
              <h2 className="section-title">Clinical Notes</h2>
              <div className="notes-content">
                <p className="diagnosis-confirmation">
                  <strong>AI Diagnosis Verification:</strong>{' '}
                  {prescription.diagnosis_confirmation === 'confirm' && 'Confirmed'}
                  {prescription.diagnosis_confirmation === 'modify' && 'Modified'}
                  {prescription.diagnosis_confirmation === 'inconclusive' && 'Inconclusive'}
                </p>
                <p className="doctor-diagnosis-text">{prescription.doctor_diagnosis}</p>
                {prescription.additional_notes && (
                  <p className="additional-notes"><em>{prescription.additional_notes}</em></p>
                )}
              </div>
            </div>

            {/* Diagnosis */}
            <div className="prescription-section">
              <h3 className="prescription-section-title">Diagnosis</h3>
              <div className="section-content">
                <p>{prescription.doctor_diagnosis}</p>
              </div>
            </div>

            {/* Medications */}
            <div className="prescription-section rx-section">
              <h3 className="prescription-section-title">Medications</h3>
              <div className="section-content medications-list">
                {prescription.medications.split('\n').map((med, idx) => (
                  med.trim() && <p key={idx} className="medication-item">{med}</p>
                ))}
              </div>
            </div>

            {/* Diet Recommendations */}
            {prescription.diet_recommendations && (
              <div className="prescription-section">
                <h3 className="prescription-section-title">Dietary Recommendations</h3>
                <div className="section-content">
                  {prescription.diet_recommendations.split('\n').map((diet, idx) => (
                    diet.trim() && <p key={idx}>• {diet}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Precautions */}
            {prescription.precautions && (
              <div className="prescription-section">
                <h3 className="prescription-section-title">Precautions</h3>
                <div className="section-content">
                  {prescription.precautions.split('\n').map((precaution, idx) => (
                    precaution.trim() && <p key={idx}>• {precaution}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Hospital Visit Warning */}
            {prescription.hospital_visit_required && (
              <div className="hospital-visit-warning">
                <div className="warning-icon">!</div>
                <div className="warning-content">
                  <strong>IMPORTANT:</strong> Patient is advised to visit a hospital for comprehensive physical examination and further diagnostic tests.
                </div>
              </div>
            )}

            {/* Doctor Signature */}
            <div className="doctor-signature">
              {prescription.doctor_signature ? (
                <div className="signature-image-container">
                  <img 
                    src={prescription.doctor_signature} 
                    alt="Doctor's Signature" 
                    className="doctor-signature-img"
                  />
                </div>
              ) : (
                <div className="signature-line"></div>
              )}
              <p className="signature-text">Dr. {doctor?.fullName || doctor?.name || prescription.doctor_name || 'Medical Professional'}</p>
              <p className="signature-credentials">
                {prescription.doctor_license && `PMDC: ${prescription.doctor_license}`}
                {prescription.doctor_specialization && ` | ${prescription.doctor_specialization}`}
              </p>
              <p className="signature-date">{formatDate(prescription.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="prescription-footer">
          <p className="footer-note">
            This is a verified medical report generated by MEDIVISION AI-assisted diagnostic platform.
            For emergency medical care, please contact your nearest hospital immediately.
          </p>
          <p className="footer-disclaimer">
            Report ID: {prescription.report_id} | Generated: {formatDate(prescription.created_at)}
          </p>
        </div>
      </div>

      {/* Action buttons at bottom */}
      <div className="prescription-actions no-print" style={{ padding: '0 20px 20px' }}>
        <button onClick={() => onDownloadPDF(reportRef)} className="btn-download-pdf">
          Download Prescription (PDF)
        </button>
        {typeof onOpenChat === 'function' && (
          <button onClick={onOpenChat} className="btn-chat-doctor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat with Dr. {prescription.doctor_name}
          </button>
        )}
      </div>
    </div>
  );
};

export default DoctorPrescriptionReport;
