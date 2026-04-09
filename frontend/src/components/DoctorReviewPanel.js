import React, { useState } from 'react';
import './DoctorReviewPanel.css';

const DoctorReviewPanel = ({ patientReport, doctorInfo, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    diagnosisConfirmation: 'confirm',
    doctorDiagnosis: '',
    medications: '',
    dietRecommendations: '',
    precautions: '',
    additionalNotes: '',
    hospitalVisitRequired: false,
    followUp: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.doctorDiagnosis || !formData.medications) {
      alert('Please fill in at least diagnosis and medications');
      return;
    }

    setSubmitting(true);
    
    console.log('=== DOCTOR INFO IN REVIEW PANEL ===');
    console.log('doctorInfo object:', doctorInfo);
    console.log('doctorInfo.name:', doctorInfo.name);
    console.log('===================================');
    
    const prescriptionData = {
      report_id: patientReport.reportId,
      patient_id: String(patientReport.patient.id),
      patient_name: patientReport.patient.name,
      doctor_id: String(doctorInfo.id),
      doctor_name: doctorInfo.name,
      doctor_qualifications: doctorInfo.qualifications,
      doctor_specialization: doctorInfo.specialization,
      doctor_license: doctorInfo.license,
      doctor_signature: doctorInfo.signature || null, // Include doctor's signature
      diagnosis_confirmation: formData.diagnosisConfirmation,
      doctor_diagnosis: formData.doctorDiagnosis,
      medications: formData.medications,
      diet_recommendations: formData.dietRecommendations || '',
      precautions: formData.precautions || '',
      additional_notes: formData.additionalNotes || '',
      hospital_visit_required: formData.hospitalVisitRequired,
      follow_up: formData.followUp || ''
    };

    console.log('DoctorReviewPanel - Submitting prescription:', prescriptionData);

    try {
      await onSubmit(prescriptionData);
    } catch (error) {
      console.error('Error submitting prescription:', error);
      alert('Failed to submit prescription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="doctor-review-panel">
      <div className="review-panel-header">
        <h3>📋 Doctor Review & Prescription</h3>
        <p className="review-subtitle">Add your professional medical recommendations for this case</p>
      </div>

      <form onSubmit={handleSubmit} className="review-form">
        {/* Diagnosis Confirmation */}
        <div className="form-section">
          <label className="form-label">Diagnosis Confirmation</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="diagnosisConfirmation"
                value="confirm"
                checked={formData.diagnosisConfirmation === 'confirm'}
                onChange={handleChange}
              />
              <span>✓ Confirm AI Prediction ({patientReport.analysis.prediction})</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="diagnosisConfirmation"
                value="modify"
                checked={formData.diagnosisConfirmation === 'modify'}
                onChange={handleChange}
                />
              <span>📝 Modify Diagnosis</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="diagnosisConfirmation"
                value="inconclusive"
                checked={formData.diagnosisConfirmation === 'inconclusive'}
                onChange={handleChange}
              />
              <span>❓ Inconclusive - Needs Further Tests</span>
            </label>
          </div>
        </div>

        {/* Doctor Diagnosis */}
        <div className="form-section">
          <label className="form-label">
            Doctor's Diagnosis <span className="required">*</span>
          </label>
          <textarea
            name="doctorDiagnosis"
            className="form-textarea"
            rows="3"
            placeholder="Enter your final diagnosis and clinical assessment..."
            value={formData.doctorDiagnosis}
            onChange={handleChange}
            required
          />
        </div>

        {/* Medications */}
        <div className="form-section">
          <label className="form-label">
            Prescribed Medications <span className="required">*</span>
          </label>
          <textarea
            name="medications"
            className="form-textarea"
            rows="5"
            placeholder="List prescribed medicines with dosage and frequency&#10;Example:&#10;1. Tablet Amoxicillin 500mg - Take 1 tablet three times daily after meals for 7 days&#10;2. Syrup Bromhexine 10ml - Take twice daily"
            value={formData.medications}
            onChange={handleChange}
            required
          />
          <small className="form-hint">Enter each medication on a new line with dosage instructions</small>
        </div>

        {/* Dietary Recommendations */}
        <div className="form-section">
          <label className="form-label">Dietary Recommendations</label>
          <textarea
            name="dietRecommendations"
            className="form-textarea"
            rows="4"
            placeholder="Provide diet advice for faster recovery&#10;Example:&#10;- Eat protein-rich foods (eggs, fish, lean meat)&#10;- Consume vitamin C rich fruits&#10;- Stay well-hydrated with water and fresh juices"
            value={formData.dietRecommendations}
            onChange={handleChange}
          />
        </div>

        {/* Precautions */}
        <div className="form-section">
          <label className="form-label">Precautions & Safety Measures</label>
          <textarea
            name="precautions"
            className="form-textarea"
            rows="4"
            placeholder="List important precautions patient should follow&#10;Example:&#10;- Avoid cold drinks and ice cream&#10;- Get adequate rest (7-8 hours sleep)&#10;- Avoid contact with sick individuals"
            value={formData.precautions}
            onChange={handleChange}
          />
        </div>

        {/* Additional Notes */}
        <div className="form-section">
          <label className="form-label">Clinical Notes (Optional)</label>
          <textarea
            name="additionalNotes"
            className="form-textarea"
            rows="3"
            placeholder="Any additional clinical observations or notes..."
            value={formData.additionalNotes}
            onChange={handleChange}
          />
        </div>

        {/* Hospital Visit Recommendation */}
        <div className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="hospitalVisitRequired"
              checked={formData.hospitalVisitRequired}
              onChange={handleChange}
            />
            <span>
              <strong>⚕️ Hospital Visit Required:</strong> Patient should visit hospital for physical examination if symptoms persist or condition appears serious
            </span>
          </label>
        </div>

        {/* Follow-up Recommendation */}
        <div className="form-section">
          <label className="form-label">Follow-up Instructions</label>
          <input
            type="text"
            name="followUp"
            className="form-input"
            placeholder="Example: Follow up after 7 days with new X-ray"
            value={formData.followUp}
            onChange={handleChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? '⏳ Submitting...' : '✓ Submit Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorReviewPanel;
