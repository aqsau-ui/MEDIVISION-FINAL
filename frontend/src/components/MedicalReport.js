import React from 'react';

const MedicalReport = ({ reportData, reportId, filePreview }) => {
  const formatDateTime = (date) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const dateTime = formatDateTime(reportData.date);

  return (
    <div id="medical-report" style={{
      padding: '24px 28px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      maxWidth: '860px',
      margin: '0 auto',
      fontFamily: '"Times New Roman", Georgia, serif',
      fontSize: '13px'
    }}>
      {/* TOP HEADER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '2px solid #38B2AC',
        paddingBottom: '15px',
        marginBottom: '20px'
      }}>
        {/* Left side */}
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#38B2AC',
            margin: 0,
            letterSpacing: '0.5px'
          }}>MEDIVISION</h1>
          <p style={{
            fontSize: '13px',
            color: '#718096',
            margin: '5px 0 0 0',
            fontWeight: '500'
          }}>AI-Powered Radiology Platform</p>
        </div>
        
        {/* Right side */}
        <div style={{
          textAlign: 'right',
          fontSize: '12px',
          color: '#4a5568',
          lineHeight: '1.8'
        }}>
          <div><strong style={{ color: '#2d3748' }}>Report ID:</strong> <span style={{ color: '#718096' }}>{reportId}</span></div>
          <div><strong style={{ color: '#2d3748' }}>Date:</strong> <span style={{ color: '#718096' }}>{dateTime.date}</span></div>
          <div><strong style={{ color: '#2d3748' }}>Time:</strong> <span style={{ color: '#718096' }}>{dateTime.time}</span></div>
          <div><strong style={{ color: '#2d3748' }}>Patient ID:</strong> <span style={{ color: '#718096' }}>{reportData.patient?.email ? reportData.patient.email.split('@')[0].toUpperCase() : 'N/A'}</span></div>
        </div>
      </div>

      {/* SECTION 1 - PATIENT INFORMATION */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#2d3748',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingBottom: '6px',
          borderBottom: '2px solid #38B2AC'
        }}>PATIENT INFORMATION</h2>
        
        <div style={{
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Full Name</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.patient?.name || 'Not Available'}</div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Age</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.patient?.age || 'N/A'} years</div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Gender</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.patient?.gender || 'Not specified'}</div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Smoking Status</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.patient?.smokingStatus || 'Unknown'}</div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6',
              gridColumn: reportData.patient?.hasCough === 'Yes' ? '1 / -1' : 'auto'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Cough Status</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>
                {reportData.patient?.hasCough === 'Yes' ? (
                  <div>
                    <div>Status: Yes</div>
                    {reportData.patient?.coughDuration && <div style={{ marginTop: '8px' }}>Duration: {reportData.patient.coughDuration}</div>}
                    {reportData.patient?.coughType && <div style={{ marginTop: '8px' }}>Type: {reportData.patient.coughType}</div>}
                  </div>
                ) : 'No'}
              </div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Symptoms</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.medicalInfo?.symptoms || 'None reported'}</div>
            </div>
            
            <div style={{
              backgroundColor: '#F5F1E8',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #E6E0D6',
              gridColumn: '1 / -1'
            }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Medical History</div>
              <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600' }}>{reportData.medicalInfo?.medicalHistory || 'None'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 - AI ANALYSIS */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#2d3748',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '15px',
          paddingBottom: '8px',
          borderBottom: '2px solid #38B2AC'
        }}>AI ANALYSIS</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* BOX 1 - Predicted Condition */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #38B2AC',
            borderRadius: '6px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#718096', 
              marginBottom: '8px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Predicted Condition:</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: reportData.analysis?.prediction === 'Pneumonia' ? '#e65100' : 
                     reportData.analysis?.prediction === 'Tuberculosis' ? '#c62828' : '#2e7d32',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>{reportData.analysis?.prediction || 'Unknown'}</div>
          </div>
          
          {/* BOX 2 - Probability Score */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #38B2AC',
            borderRadius: '6px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#718096', 
              marginBottom: '8px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Probability Score:</div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1565c0'
            }}>{((reportData.analysis?.confidence || 0) * 100).toFixed(1)}%</div>
          </div>
          
          {/* BOX 3 - Severity Level */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #38B2AC',
            borderRadius: '6px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#718096', 
              marginBottom: '8px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Severity Level:</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: (reportData.analysis?.confidence || 0) > 0.8 ? '#c62828' : 
                     (reportData.analysis?.confidence || 0) > 0.5 ? '#e65100' : '#2e7d32',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {reportData.analysis?.severity || ((reportData.analysis?.confidence || 0) > 0.8 ? 'SEVERE' : 
               (reportData.analysis?.confidence || 0) > 0.5 ? 'MODERATE' : 'MILD')}
            </div>
          </div>
        </div>
        
        {/* Heatmap Explanation */}
        {reportData.analysis?.heatmapExplanation && (
          <div style={{
            backgroundColor: '#F5F1E8',
            border: '1px solid #E6E0D6',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#6b5d47'
          }}>
            <p style={{ fontWeight: '600', marginBottom: '8px', color: '#6c5ce7', margin: '0 0 8px 0' }}>🔍 AI Analysis:</p>
            <p style={{ margin: 0 }}>
              {reportData.analysis.heatmapExplanation}
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3 - CLINICAL IMPRESSION */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#2d3748',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '15px',
          paddingBottom: '8px',
          borderBottom: '2px solid #38B2AC'
        }}>CLINICAL IMPRESSION</h2>
        
        <div style={{
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '20px'
        }}>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.9',
            color: '#2d3748',
            margin: 0,
            textAlign: 'justify'
          }}>
            {reportData.analysis?.prediction === 'Normal' 
              ? 'The radiographic examination reveals lung fields within normal limits. No significant consolidation, infiltrates, or pleural effusion identified. Cardiothoracic ratio appears normal. The AI analysis confirms absence of pathological findings with high confidence. Clinical correlation recommended for comprehensive patient assessment.'
              : reportData.analysis?.prediction === 'Pneumonia'
              ? `The AI analysis indicates radiological patterns consistent with pneumonia showing a diagnostic probability of ${((reportData.analysis?.confidence || 0) * 100).toFixed(1)}%. Observed opacity regions suggest possible inflammatory infiltration within the lung fields. Imaging demonstrates consolidative changes consistent with infectious pneumonic process. Air-space opacification and inflammatory infiltrates are noted in the highlighted regions. Severity classification: ${reportData.analysis?.severity || 'Moderate'}. Correlation with clinical symptoms (fever, cough, dyspnea), white blood cell count, and inflammatory markers is recommended. Consider empiric antibiotic therapy as clinically indicated. Follow-up imaging may be warranted to monitor treatment response.`
              : `The AI analysis has identified patterns suggestive of ${reportData.analysis?.prediction} with ${((reportData.analysis?.confidence || 0) * 100).toFixed(1)}% confidence level. The affected lung regions demonstrate characteristic radiological features associated with this pathological condition. The heatmap visualization highlights areas of concern requiring further clinical evaluation. Comprehensive diagnostic workup including sputum analysis and additional imaging studies is recommended for confirmatory diagnosis and appropriate therapeutic intervention.`
            }
          </p>
        </div>
      </div>

      {/* SECTION 4 - RADIOLOGICAL IMAGES */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#2d3748',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingBottom: '6px',
          borderBottom: '2px solid #38B2AC'
        }}>RADIOLOGICAL IMAGES</h2>

        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: (reportData.analysis?.prediction !== 'Normal' && reportData.images?.heatmap) ? 'center' : 'center',
          flexWrap: 'wrap'
        }}>
          {/* Original X-ray */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            width: '260px',
            flexShrink: 0
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '8px',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Figure 1: Original Chest X-Ray</div>
            <div style={{
              width: '240px',
              height: '240px',
              backgroundColor: '#0a0a0a',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #cbd5e0',
              margin: '0 auto'
            }}>
              <img
                src={reportData.images?.original || filePreview}
                alt="Original Chest X-ray"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Heatmap — only for abnormal findings */}
          {reportData.analysis?.prediction !== 'Normal' && reportData.images?.heatmap && (
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              width: '260px',
              flexShrink: 0
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '8px',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Figure 2: AI Heatmap (Grad-CAM)</div>
              <div style={{
                width: '240px',
                height: '240px',
                backgroundColor: '#0a0a0a',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #cbd5e0',
                margin: '0 auto'
              }}>
                <img
                  src={reportData.images.heatmap}
                  alt="AI Heatmap"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
        </div>

        {reportData.analysis?.prediction !== 'Normal' && reportData.images?.heatmap && (
          <p style={{
            fontSize: '11px',
            color: '#718096',
            textAlign: 'center',
            marginTop: '8px',
            fontStyle: 'italic'
          }}>
            Grad-CAM heatmap highlights regions influencing the AI prediction. Red/yellow areas indicate high activation.
          </p>
        )}
      </div>

      {/* SECTION 5 - MEDICAL DISCLAIMER */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#92400e',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '0 0 10px 0'
        }}>⚠️ MEDICAL DISCLAIMER</h3>
        <p style={{
          fontSize: '12px',
          lineHeight: '1.7',
          color: '#78350f',
          margin: 0
        }}>
          This report is generated using artificial intelligence and is intended for <strong>clinical decision support only</strong>. It does not replace diagnosis or treatment by a licensed medical professional. All AI findings must be correlated with clinical examination, patient history, laboratory investigations, and professional radiological interpretation. The final diagnosis and treatment decisions should be made exclusively by qualified healthcare providers. This AI system has not been validated as a standalone diagnostic device and should be used as an adjunct tool only.
        </p>
      </div>

      {/* SECTION 6 - DOCTOR VERIFIED REPORT (if prescription exists) */}
      {reportData.prescription && (
        <div style={{
          marginTop: '40px',
          borderTop: '3px solid #2c5f6f',
          paddingTop: '30px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#2c5f6f',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>DOCTOR VERIFIED CLINICAL REPORT</h2>

          {/* Verified Badge */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #38B2AC',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#166534',
              marginBottom: '5px'
            }}>✓ VERIFIED BY LICENSED PHYSICIAN</div>
            <div style={{
              fontSize: '12px',
              color: '#15803d',
              fontWeight: '500'
            }}>
              This report has been reviewed and verified by a certified medical professional
            </div>
          </div>

          {/* Doctor's Assessment */}
          <div style={{
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#2d3748',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>Clinical Assessment</h3>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#2d3748',
              margin: 0
            }}>
              <strong>Diagnosis Confirmation:</strong> {reportData.prescription.diagnosis_confirmation === 'confirm' ? 'Confirmed - AI diagnosis verified' : reportData.prescription.diagnosis_confirmation === 'modify' ? 'Modified - See doctor\'s diagnosis below' : 'Inconclusive - Further tests recommended'}
            </p>
            {reportData.prescription.doctor_diagnosis && (
              <p style={{
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#2d3748',
                marginTop: '10px',
                marginBottom: 0
              }}>
                <strong>Doctor's Diagnosis:</strong> {reportData.prescription.doctor_diagnosis}
              </p>
            )}
          </div>

          {/* Digital Signature Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '30px',
            marginTop: '30px',
            paddingTop: '25px',
            borderTop: '1px solid #e2e8f0'
          }}>
            {/* Verification Details */}
            <div style={{
              flex: 1
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#2d3748',
                textTransform: 'uppercase',
                marginBottom: '15px',
                letterSpacing: '0.5px'
              }}>Verification Details</h3>
              <div style={{
                fontSize: '12px',
                lineHeight: '2',
                color: '#4a5568'
              }}>
                <div><strong>Report Verified By:</strong> Dr. {reportData.prescription.doctor_name}</div>
                <div><strong>License Number:</strong> {reportData.prescription.doctor_license}</div>
                <div><strong>Specialization:</strong> {reportData.prescription.doctor_specialization || 'General Practitioner'}</div>
                {reportData.prescription.hospital_affiliation && (
                  <div><strong>Hospital/Clinic:</strong> {reportData.prescription.hospital_affiliation}</div>
                )}
                <div><strong>Verification Timestamp:</strong> {reportData.prescription.verification_timestamp ? new Date(reportData.prescription.verification_timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</div>
                <div><strong>Verification ID:</strong> <span style={{ fontFamily: 'monospace', color: '#2c5f6f', fontWeight: '600' }}>{reportData.prescription.verification_id || 'N/A'}</span></div>
              </div>
            </div>

            {/* Digital Signature */}
            {reportData.prescription.doctor_signature_url && (
              <div style={{
                flex: 0,
                minWidth: '300px',
                textAlign: 'center'
              }}>
                <div style={{
                  borderTop: '1px solid #000',
                  marginBottom: '10px',
                  width: '250px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}></div>
                <div style={{
                  marginBottom: '8px'
                }}>
                  <img 
                    src={`http://localhost:8000${reportData.prescription.doctor_signature_url}`} 
                    alt="Doctor's Signature" 
                    style={{
                      maxWidth: '250px',
                      maxHeight: '80px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#4a5568',
                  fontStyle: 'italic',
                  lineHeight: '1.6'
                }}>
                  Digitally Signed by<br />
                  <strong style={{ color: '#2c5f6f', fontSize: '12px' }}>Dr. {reportData.prescription.doctor_name}</strong><br />
                  {reportData.prescription.doctor_license}
                </div>
              </div>
            )}
          </div>

          {/* No Signature Warning */}
          {!reportData.prescription.doctor_signature_url && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '15px',
              fontSize: '12px',
              color: '#92400e',
              textAlign: 'center'
            }}>
              ⚠️ Digital signature not available. Verified by Dr. {reportData.prescription.doctor_name} ({reportData.prescription.doctor_license})
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicalReport;
