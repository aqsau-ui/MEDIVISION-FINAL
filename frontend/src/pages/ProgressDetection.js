import React, { useEffect, useMemo, useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './ProgressDetection.css';

const ProgressDetection = () => {
  const [showUploadTip, setShowUploadTip] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [noPriorRecord, setNoPriorRecord] = useState(false);
  const [viewReportData, setViewReportData] = useState(null);

  const patientData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('patientData') || '{}');
    } catch (parseError) {
      return {};
    }
  }, []);
  const patientId = patientData?.email || patientData?.id || '';

  const getSeverityColor = (label) => {
    const value = (label || '').toLowerCase();
    switch (value) {
      case 'normal':
        return '#10b981';
      case 'pneumonia':
        return '#f59e0b';
      case 'tuberculosis':
      case 'tb':
        return '#ef4444';
      case 'mild':
        return '#10b981';
      case 'moderate':
        return '#f59e0b';
      case 'severe':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusSummary = (status) => {
    if (status === 'Improved') {
      return 'Compared to your previous X-ray, your lung condition has improved. Continue following your treatment plan and schedule a follow-up as advised.';
    }
    if (status === 'Worsened') {
      return 'The latest analysis indicates a decline in lung condition compared to the previous scan. Clinical consultation with a qualified physician is recommended promptly.';
    }
    return 'Lung condition remains stable compared to the previous X-ray. Continue routine monitoring as advised by your healthcare provider.';
  };

  const fetchProgressHistory = async () => {
    if (!patientId) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/xray/progress/history/${encodeURIComponent(patientId)}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        // Don't surface history-load failures as a page-level error
        console.warn('Could not load progress history:', data.detail || data.message);
        return;
      }
      setProgressHistory(data.history || []);
      const sortedRecords = [...(data.records || [])].sort(
        (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
      );
      setHistoryRecords(sortedRecords);
    } catch (historyError) {
      // Network errors during history fetch shouldn't block the page
      console.warn('Progress history fetch failed:', historyError.message);
    }
  };

  useEffect(() => {
    fetchProgressHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleNewUpload = () => {
    setAnalysisResult(null);
    setSelectedImage(null);
    setError(null);
  };

  const handleGenerateReport = async () => {
    // Fetch patient profile for age/gender
    let patientAge = 'N/A';
    let patientGender = 'N/A';
    let patientName = patientData?.fullName || patientData?.name || patientData?.username || 'Patient';

    try {
      const profileRes = await fetch(`http://localhost:5000/api/patient/profile/${encodeURIComponent(patientId)}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const p = profileData.profile?.personalInfo || profileData.profile || {};
        patientAge = p.age || profileData.profile?.age || 'N/A';
        patientGender = p.gender || profileData.profile?.gender || 'N/A';
      }
    } catch (_) {}

    // Collect previous record from historyRecords
    const sortedHistory = [...historyRecords].sort(
      (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
    );
    const priorRecord = sortedHistory.length > 1 ? sortedHistory[1] : null;

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const probabilities = analysisResult.probabilities || {};
    const probRows = Object.entries(probabilities)
      .map(([d, v]) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${d}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${(v * 100).toFixed(1)}%</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">
          <div style="width:100%;height:8px;background:#e5e7eb;border-radius:4px;">
            <div style="width:${(v * 100).toFixed(1)}%;height:8px;background:${d === analysisResult.prediction ? '#2C7A7B' : '#9ca3af'};border-radius:4px;"></div>
          </div>
        </td>
      </tr>`).join('');

    const comparisonSection = analysisResult.comparison ? `
      <section style="margin-bottom:28px;">
        <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;">Comparative Analysis</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:200px;">Previous Disease Probability</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.comparison.previous_probability?.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Current Disease Probability</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.comparison.current_probability?.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">SSIM Structural Similarity</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.comparison.ssim_score !== null && analysisResult.comparison.ssim_score !== undefined ? (analysisResult.comparison.ssim_score * 100).toFixed(2) + '%' : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Clinical Progression Status</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.comparison.status}</td>
          </tr>
        </table>
        ${priorRecord ? `
          <div style="margin-top:20px;">
            <p style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Previous vs Current Imaging</p>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
              ${priorRecord.xray_image ? `<div style="flex:1;min-width:160px;">
                <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;">Previous X-Ray (${new Date(priorRecord.timestamp || priorRecord.createdAt).toLocaleDateString()})</p>
                <img src="${priorRecord.xray_image}" alt="Previous X-ray" style="width:100%;max-width:220px;border-radius:6px;border:1px solid #d1d5db;" />
              </div>` : ''}
              ${selectedImage ? `<div style="flex:1;min-width:160px;">
                <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;">Current X-Ray (${new Date().toLocaleDateString()})</p>
                <img src="${selectedImage}" alt="Current X-ray" style="width:100%;max-width:220px;border-radius:6px;border:1px solid #d1d5db;" />
              </div>` : ''}
              ${analysisResult.heatmap ? `<div style="flex:1;min-width:160px;">
                <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;">Current — Affected Regions (Heatmap)</p>
                <img src="${analysisResult.heatmap}" alt="Heatmap" style="width:100%;max-width:220px;border-radius:6px;border:1px solid #d1d5db;" />
              </div>` : ''}
            </div>
          </div>
        ` : (selectedImage || analysisResult.heatmap ? `
          <div style="margin-top:20px;">
            <p style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Imaging</p>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
              ${selectedImage ? `<div style="flex:1;min-width:160px;">
                <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;">X-Ray</p>
                <img src="${selectedImage}" alt="X-ray" style="width:100%;max-width:220px;border-radius:6px;border:1px solid #d1d5db;" />
              </div>` : ''}
              ${analysisResult.heatmap ? `<div style="flex:1;min-width:160px;">
                <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;">Affected Regions (Heatmap)</p>
                <img src="${analysisResult.heatmap}" alt="Heatmap" style="width:100%;max-width:220px;border-radius:6px;border:1px solid #d1d5db;" />
              </div>` : ''}
            </div>
          </div>
        ` : '')}
      </section>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>MEDIVISION Radiological Report — ${patientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; background: #fff; color: #1a1a1a; font-size: 13px; padding: 40px 52px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 18px; font-weight: 700; }
  @media print {
    body { padding: 20px 32px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:20px;">
  <div>
    <p style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Artificial Intelligence Diagnostic Imaging Report</p>
    <h1>MEDIVISION Medical Platform</h1>
    <p style="font-size:11px;color:#6b7280;margin-top:2px;">AI-Assisted Chest Radiograph Analysis</p>
  </div>
  <div style="text-align:right;font-size:11px;color:#4b5563;">
    <p><strong>Report Date:</strong> ${reportDate}</p>
    <p><strong>Report ID:</strong> RPT-${Date.now()}</p>
    <p><strong>Modality:</strong> Chest X-Ray (CXR)</p>
  </div>
</div>

<section style="margin-bottom:24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 18px;">
  <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:10px;">Patient Information</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:12px;">
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Full Name</p><p style="font-weight:600;">${patientName}</p></div>
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Age</p><p style="font-weight:600;">${patientAge}</p></div>
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Gender</p><p style="font-weight:600;">${typeof patientGender === 'string' ? patientGender.charAt(0).toUpperCase() + patientGender.slice(1) : 'N/A'}</p></div>
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Patient ID</p><p style="font-weight:600;">${patientId}</p></div>
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Examination Date</p><p style="font-weight:600;">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p></div>
    <div><p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">Examination Type</p><p style="font-weight:600;">Chest Radiograph (PA View)</p></div>
  </div>
</section>

<section style="margin-bottom:24px;">
  <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;">AI Diagnostic Findings</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr style="background:#f3f4f6;">
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;width:200px;">Primary Diagnosis</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:${analysisResult.prediction === 'Pneumonia' ? '#b45309' : '#15803d'};">${analysisResult.prediction}</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;">Disease Probability</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.probability?.toFixed(1)}%</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;">Model Confidence</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${(analysisResult.confidence * 100).toFixed(1)}%</td>
    </tr>
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;">Clinical Severity</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.severity}</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;">Respiratory Health Score</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${analysisResult.health_score} / 100</td>
    </tr>
  </table>
</section>

<section style="margin-bottom:24px;">
  <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;">Differential Probability Analysis</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:6px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Diagnosis</th>
        <th style="padding:6px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Probability</th>
        <th style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;width:200px;">Distribution</th>
      </tr>
    </thead>
    <tbody>${probRows}</tbody>
  </table>
</section>

${comparisonSection}

<section style="margin-bottom:24px;">
  <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;">Clinical Interpretation</h3>
  <p style="line-height:1.75;font-size:13px;color:#1f2937;">
    ${analysisResult.prediction === 'Normal'
      ? `The chest radiograph demonstrates no significant pathological findings consistent with pneumonia. Lung fields appear clear with no evidence of consolidation, interstitial markings, or pleural effusion detectable by the AI model. A respiratory health score of ${analysisResult.health_score}/100 is recorded.`
      : `The chest radiograph demonstrates findings consistent with <strong>${analysisResult.prediction}</strong> at a disease probability of ${analysisResult.probability?.toFixed(1)}%, classified as <strong>${analysisResult.severity}</strong> severity. The AI model assigns a model confidence of ${(analysisResult.confidence * 100).toFixed(1)}%. The respiratory health score is ${analysisResult.health_score}/100. ${analysisResult.comparison ? `Comparative analysis with the prior radiograph indicates a status of <strong>${analysisResult.comparison.status}</strong>, with disease probability ${analysisResult.comparison.status === 'Improved' ? 'decreasing' : analysisResult.comparison.status === 'Worsened' ? 'increasing' : 'remaining stable'} from ${analysisResult.comparison.previous_probability?.toFixed(1)}% to ${analysisResult.comparison.current_probability?.toFixed(1)}%.` : ''}`
    }
  </p>
</section>

<section style="margin-bottom:28px;">
  <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;">Recommendations</h3>
  <ul style="list-style:none;font-size:12px;line-height:1.8;color:#374151;">
    ${analysisResult.prediction === 'Normal'
      ? `<li style="padding:4px 0;">• Chest radiograph within normal limits per AI assessment. No immediate action indicated.</li>
         <li style="padding:4px 0;">• Routine follow-up as per clinical schedule.</li>
         <li style="padding:4px 0;">• Maintain preventive health measures and vaccination status.</li>`
      : `<li style="padding:4px 0;">• Urgent clinical correlation with the patient's presenting symptoms, auscultation findings, and laboratory investigations (CBC, CRP, sputum culture) is recommended.</li>
         <li style="padding:4px 0;">• ${analysisResult.severity === 'Severe' ? 'Immediate' : 'Timely'} consultation with a pulmonologist or respiratory physician is advised.</li>
         <li style="padding:4px 0;">• Consider follow-up chest radiograph in 4–6 weeks to assess treatment response.</li>
         <li style="padding:4px 0;">• Adequate hydration, rest, and antibiotic therapy (if bacterially confirmed) as directed by the treating physician.</li>
         ${analysisResult.comparison?.status === 'Worsened' ? '<li style="padding:4px 0;">• Clinical deterioration noted compared to prior imaging — escalation of care may be warranted.</li>' : ''}`
    }
  </ul>
</section>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 18px;font-size:11px;color:#6b7280;line-height:1.7;">
  <strong style="color:#374151;">Disclaimer:</strong> This report has been generated by the MEDIVISION AI diagnostic system. AI findings are intended to assist — not replace — clinical decision-making. This report does not constitute a definitive medical diagnosis and must be reviewed and countersigned by a licensed radiologist or clinician before clinical use.
</div>

<div class="no-print" style="margin-top:28px;text-align:right;">
  <button onclick="window.print()" style="padding:10px 24px;background:#2C7A7B;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
    🖨 Print / Save as PDF
  </button>
</div>

</body>
</html>`;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(html);
      reportWindow.document.close();
    }
  };

  const handleFileInputClick = async (e) => {
    e.preventDefault();
    setError(null);
    setNoPriorRecord(false);

    if (!patientId) {
      setError('Patient identity not found. Please login again to continue.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/xray/progress/eligibility?patient_id=${encodeURIComponent(patientId)}`);
      const data = await response.json();

      if (data.success && data.has_prior_record === false) {
        setNoPriorRecord(true);
        return;
      }

      setShowUploadTip(true);
    } catch (eligibilityError) {
      console.warn('Eligibility check error:', eligibilityError.message);
      setShowUploadTip(true);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setError(null);
    setUploading(true);
    setAnalyzing(true);

    try {
      const localPreview = URL.createObjectURL(file);
      setSelectedImage(localPreview);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:5000/api/xray/progress/analyze?patient_id=${encodeURIComponent(patientId)}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Progress analysis failed.');
      }

      setAnalysisResult(data);
      setProgressHistory(data.progress_history || []);
      await fetchProgressHistory();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
      event.target.value = '';
    }
  };

  const handleGotIt = () => {
    setShowUploadTip(false);
    document.getElementById('xray-upload').click();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #2C7A7B',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '0.82rem',
        color: '#234E52',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
      }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{new Date(point.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        <p>Disease: <strong>{point.disease}</strong></p>
        <p>Probability: <strong>{typeof point.probability === 'number' ? point.probability.toFixed(1) : 'N/A'}%</strong></p>
        <p>Health Score: <strong>{point.health_score}/100</strong></p>
        <p>Severity: <strong style={{ color: getSeverityColor(point.severity) }}>{point.severity}</strong></p>
      </div>
    );
  };

  return (
    <PatientLayout>
      <div className="progress-page-content">
        <div className="progress-header">
          <h1 className="progress-title">Track Your Respiratory Health</h1>
          <p className="progress-subtitle">Longitudinal chest X-ray monitoring with AI-assisted disease detection & comparative analysis</p>
        </div>

        <div className="progress-content">
          {/* Error Message */}
          {error && (
            <div className="error-banner" style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#991b1b'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Analysis Result Section */}
          {analysisResult && (
            <div className="progress-card analysis-result-card">
              {/* ── Header row ── */}
              <div className="analysis-header">
                <div>
                  <h2 className="card-title" style={{ marginBottom: 2 }}>Analysis Results</h2>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="report-gen-btn" onClick={handleGenerateReport}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Generate Report
                  </button>
                  <button className="new-upload-btn" onClick={handleNewUpload}>
                    New Analysis
                  </button>
                </div>
              </div>

              {/* ── Two-column body ── */}
              <div className="result-body">

                {/* LEFT — X-ray images compact */}
                <div className="result-images">
                  <div className="xray-thumb-pair">
                    <div className="xray-thumb-box">
                      <p className="thumb-label">Current X-Ray</p>
                      <img src={selectedImage} alt="Current X-ray" className="xray-thumb-img" />
                    </div>
                    {analysisResult.heatmap && (
                      <div className="xray-thumb-box">
                        <p className="thumb-label">Affected Regions</p>
                        <img src={analysisResult.heatmap} alt="Heatmap" className="xray-thumb-img" />
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT — Clinical summary */}
                <div className="result-summary">

                  {/* Prediction pill */}
                  <div className="prediction-pill" style={{ backgroundColor: getSeverityColor(analysisResult.prediction) }}>
                    {analysisResult.prediction}
                  </div>

                  {/* Key metrics row */}
                  <p className="metrics-line">
                    Probability: <strong>{analysisResult.probability?.toFixed(1)}%</strong>
                    &nbsp;|&nbsp;Severity: <strong>{analysisResult.severity}</strong>
                    &nbsp;|&nbsp;Respiratory Health Score: <strong>{analysisResult.health_score}/100</strong>
                  </p>

                  {/* Comparison block — only when comparison exists */}
                  {analysisResult.comparison && (
                    <div className="comparison-panel">
                      <p className="comparison-title">Comparison with Previous X-Ray</p>
                      <p className="comparison-line">
                        Prev. Health Score: <strong>{analysisResult.comparison.previous_health_score ?? 'N/A'}/100</strong>
                        &nbsp;|&nbsp;Current Health Score: <strong>{analysisResult.comparison.current_health_score ?? analysisResult.health_score}/100</strong>
                      </p>
                      <p className="comparison-line">
                        Pneumonia Probability: <strong>{analysisResult.comparison.previous_probability?.toFixed(1)}%</strong> → <strong>{analysisResult.comparison.current_probability?.toFixed(1)}%</strong>
                      </p>
                      <p className="comparison-line">
                        SSIM Similarity:&nbsp;
                        <strong>{analysisResult.comparison.ssim_score !== null && analysisResult.comparison.ssim_score !== undefined
                          ? `${(analysisResult.comparison.ssim_score * 100).toFixed(2)}%`
                          : 'N/A'}</strong>
                        &nbsp;|&nbsp;Status:&nbsp;
                        <strong style={{ color: getSeverityColor(
                          analysisResult.comparison.status === 'Improved' ? 'mild'
                          : analysisResult.comparison.status === 'Worsened' ? 'severe'
                          : 'moderate'
                        )}}>
                          {analysisResult.comparison.status}
                        </strong>
                      </p>
                    </div>
                  )}

                  {/* Progress summary */}
                  <div className="progress-summary-line">
                    <span className="summary-label">Progress Summary:</span>{' '}
                    {analysisResult.summary || getStatusSummary(analysisResult?.comparison?.status)}
                  </div>

                  {/* Medical disclaimer */}
                  <p className="result-disclaimer">
                    ⚠️ AI-assisted analysis only. Consult a qualified healthcare professional for clinical interpretation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section (shown when no analysis result) */}
          {!analysisResult && (
            <>
            {noPriorRecord && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '10px',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}>
                <svg width="24" height="24" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <div>
                  <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 4, fontSize: '0.95rem' }}>
                    No Prior X-Ray Records Found
                  </p>
                  <p style={{ color: '#78350f', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    Progress tracking is available only for patients with prior X-ray analysis records. Please upload and analyze an initial X-ray on the <strong>Patient Profile</strong> page to enable future progress monitoring.
                  </p>
                </div>
              </div>
            )}
            <div className="progress-card upload-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Upload Chest X-Ray</h2>
                <p className="card-description">
                  Upload a chest X-ray image for AI-powered disease detection (TB, Pneumonia, Normal)
                </p>
                
                {uploading || analyzing ? (
                  <div className="loading-container" style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="spinner" style={{
                      border: '4px solid #f3f4f6',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px'
                    }} />
                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {analyzing ? 'Analyzing X-ray with AI model...' : 'Uploading X-ray image...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <button className="upload-btn" onClick={handleFileInputClick}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Choose X-Ray File
                    </button>
                    <input
                      id="xray-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
              </div>
            </div>
            </>
          )}

            {/* Health Score Progress Section */}
            <div className="progress-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Respiratory Health Score Progress</h2>
                <p className="card-description">Your respiratory health score over time based on X-ray analysis</p>

                {progressHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="20" x2="12" y2="10" />
                        <line x1="18" y1="20" x2="18" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="16" />
                      </svg>
                    </div>
                    <h3 className="empty-title">No data available</h3>
                    <p className="empty-description">Upload your first X-ray to start tracking your health progress</p>
                  </div>
                ) : (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={progressHistory.map((item) => ({
                        ...item,
                        displayDate: new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: false
                        })
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="health_score" stroke="#2C7A7B" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Past X-Ray History Section */}
            <div className="progress-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="card-content">
                <h2 className="card-title">Past X-Ray History</h2>
                <p className="card-description">Previously uploaded X-ray images and analysis results</p>

                {historyRecords.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <h3 className="empty-title">No data available</h3>
                    <p className="empty-description">Your X-ray history will appear here once you upload files</p>
                  </div>
                ) : (
                  <div className="history-grid">
                    {historyRecords.map((record) => (
                      <div className="history-card" key={record._id}>
                        <img
                          src={record.xray_image}
                          alt="X-ray thumbnail"
                          className="history-thumb"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="history-meta">
                          <div className="history-badge" style={{ backgroundColor: getSeverityColor(record.disease || record.analysis?.prediction) }}>
                            {record.disease || record.analysis?.prediction || 'N/A'}
                          </div>
                          <p><span className="meta-label">Probability:</span> {(record.probability ?? ((record.analysis?.confidence || 0) * 100)).toFixed(1)}%</p>
                          <p><span className="meta-label">Date:</span> {new Date(record.timestamp || record.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          <p>
                            <span className="meta-label">Severity:</span>{' '}
                            <span style={{ color: getSeverityColor(record.severity || 'moderate'), fontWeight: 700 }}>
                              {record.severity || 'Moderate'}
                            </span>
                          </p>
                          <p><span className="meta-label">Score:</span> {record.health_score ?? 'N/A'}/100</p>
                          <button className="new-upload-btn" style={{ marginTop: 10, width: '100%', padding: '7px 0' }} onClick={() => setViewReportData(record)}>
                            View Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Security Note */}
            <div className="security-note">
              <strong>Secure Data:</strong> Your health information is encrypted and protected.
            </div>
          </div>

          {/* Upload Tip Modal */}
          {showUploadTip && (
            <div className="upload-tip-overlay" onClick={() => setShowUploadTip(false)}>
              <div className="upload-tip-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tip-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <h3 className="tip-title">For a clear X-ray photo:</h3>
                <ul className="tip-list">
                  <li>Hold it against a bright background (window or white screen).</li>
                  <li>Turn off flash to avoid glare.</li>
                  <li>Keep your phone steady and parallel to the X-ray.</li>
                  <li>Avoid reflections by tilting slightly.</li>
                </ul>
                <button className="got-it-btn" onClick={handleGotIt}>
                  Got it!
                </button>
              </div>
            </div>
          )}
        </div>

      {/* View Report Modal */}
      {viewReportData && (
        <div className="vr-overlay" onClick={() => setViewReportData(null)}>
          <div className="vr-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="vr-header">
              <div>
                <p className="vr-header-eyebrow">AI Diagnostic Report</p>
                <p className="vr-header-date">
                  {new Date(viewReportData.timestamp || viewReportData.createdAt).toLocaleString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <button className="vr-close" onClick={() => setViewReportData(null)}>✕</button>
            </div>

            {/* ── X-Ray Images ── */}
            {viewReportData.xray_image && (
              <div className={`vr-images${viewReportData.heatmap ? '' : ' vr-images--single'}`}>
                {/* Original X-ray — always shown */}
                <div className="vr-img-box">
                  <p className="vr-img-label">Uploaded X-Ray</p>
                  <img
                    src={viewReportData.xray_image}
                    alt="X-ray"
                    className="vr-img"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>

                {/* Heatmap — shown when available, placeholder otherwise */}
                {viewReportData.heatmap ? (
                  <div className="vr-img-box">
                    <p className="vr-img-label">Grad-CAM Heatmap — Affected Regions</p>
                    <img
                      src={viewReportData.heatmap}
                      alt="Grad-CAM Heatmap"
                      className="vr-img"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                    <p className="vr-img-caption">Red/yellow areas = highest model activation</p>
                  </div>
                ) : (
                  <div className="vr-img-box">
                    <p className="vr-img-label">Grad-CAM Heatmap</p>
                    <div className="vr-heatmap-placeholder">
                      <svg width="32" height="32" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        <path d="M11 8v3m0 3h.01" strokeLinecap="round"/>
                      </svg>
                      <p>Heatmap not available<br/>for this record</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Diagnosis Summary ── */}
            <div className="vr-section-label">Diagnosis Summary</div>
            <div className="vr-summary-grid">
              {[
                ['AI Prediction',          viewReportData.disease || viewReportData.analysis?.prediction || 'N/A'],
                ['Probability',            `${(viewReportData.probability ?? ((viewReportData.analysis?.confidence || 0) * 100)).toFixed(1)}%`],
                ['Severity',               viewReportData.severity || 'N/A'],
                ['Respiratory Health Score', `${viewReportData.health_score ?? 'N/A'} / 100`],
              ].map(([label, value]) => (
                <div key={label} className="vr-summary-cell">
                  <p className="vr-cell-label">{label}</p>
                  <p className="vr-cell-value" style={{
                    color: label === 'AI Prediction'
                      ? getSeverityColor(viewReportData.disease || viewReportData.analysis?.prediction)
                      : '#234E52'
                  }}>{value}</p>
                </div>
              ))}
            </div>

            {/* ── Disclaimer ── */}
            <div className="vr-disclaimer">
              <strong>⚠️ Medical Disclaimer:</strong> This AI-generated report is intended to assist clinical decision-making and does not constitute a definitive medical diagnosis. Results must be interpreted by a qualified healthcare professional in the context of the patient's full clinical history.
            </div>

          </div>
        </div>
      )}
    </PatientLayout>
  );
};

export default ProgressDetection;
