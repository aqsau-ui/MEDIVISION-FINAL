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
  const [showReport, setShowReport] = useState(false);
  const [reportHtml, setReportHtml] = useState('');

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

  const fetchProgressHistory = async (injectHeatmap = null, injectXrayImage = null) => {
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
      // If a fresh heatmap was just generated, inject it into the most recent record
      // (DB projection might not return it yet if the server cache is stale)
      if (injectHeatmap && sortedRecords.length > 0) {
        const newest = sortedRecords[0];
        if (!newest.heatmap) {
          sortedRecords[0] = { ...newest, heatmap: injectHeatmap };
        }
      }
      if (injectXrayImage && sortedRecords.length > 0) {
        const newest = sortedRecords[0];
        if (!newest.xray_image) {
          sortedRecords[0] = { ...newest, xray_image: injectXrayImage };
        }
      }
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

    const sortedHistory = [...historyRecords].sort(
      (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
    );
    // The most recent record in historyRecords is the one just saved; index 1 is the prior
    const priorRecord = sortedHistory.length > 1 ? sortedHistory[1] : null;

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const reportId = `RPT-${Date.now()}`;
    const pred = analysisResult.prediction || 'N/A';
    const prob = analysisResult.probability?.toFixed(1) ?? 'N/A';
    const conf = (analysisResult.confidence * 100).toFixed(1);
    const sev = analysisResult.severity || 'N/A';
    const score = analysisResult.health_score ?? 'N/A';
    const isNormal = pred.toLowerCase() === 'normal';
    const comp = analysisResult.comparison || null;
    const genderStr = typeof patientGender === 'string'
      ? patientGender.charAt(0).toUpperCase() + patientGender.slice(1)
      : 'N/A';

    // ── Probability rows ──
    const probRows = Object.entries(analysisResult.probabilities || {}).map(([d, v]) => `
    <tr>
      <td class="td-label">${d}</td>
      <td class="td-val">${(v * 100).toFixed(1)}%</td>
      <td class="td-bar">
        <div class="bar-bg">
          <div class="bar-fill" style="width:${(v * 100).toFixed(1)}%;background:${d === pred ? '#1d4e50' : '#b0bec5'};"></div>
        </div>
      </td>
    </tr>`).join('');

    // ── Imaging block ──
    const priorDate = priorRecord
      ? new Date(priorRecord.timestamp || priorRecord.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : null;
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const imagingBlock = (() => {
      const imgs = [];
      if (priorRecord?.xray_image) imgs.push({ label: `Previous X-Ray<br><span class="img-date">${priorDate}</span>`, src: priorRecord.xray_image });
      if (priorRecord?.heatmap) imgs.push({ label: `Previous Heatmap<br><span class="img-date">${priorDate}</span>`, src: priorRecord.heatmap });
      if (selectedImage) imgs.push({ label: `Current X-Ray<br><span class="img-date">${currentDate}</span>`, src: selectedImage });
      if (analysisResult.heatmap) imgs.push({ label: `Current Heatmap<br><span class="img-date">${currentDate}</span>`, src: analysisResult.heatmap });
      if (!imgs.length) return '';
      return `
      <section class="report-section">
        <h3 class="section-title">${comp ? 'Previous vs. Current Imaging' : 'Radiographic Imaging'}</h3>
        <div class="imaging-grid">
          ${imgs.map(i => `
            <div class="img-card">
              <p class="img-label">${i.label}</p>
              <img src="${i.src}" alt="X-ray" class="report-img" />
            </div>`).join('')}
        </div>
      </section>`;
    })();

    // ── Comparative analysis block ──
    const comparativeBlock = comp ? `
    <section class="report-section">
      <h3 class="section-title">Comparative Analysis</h3>
      <table class="report-table">
        <tr><td class="td-label">Previous Disease Probability</td><td class="td-val">${comp.previous_probability?.toFixed(1)}%</td></tr>
        <tr class="alt"><td class="td-label">Current Disease Probability</td><td class="td-val">${comp.current_probability?.toFixed(1)}%</td></tr>
        <tr><td class="td-label">SSIM Structural Similarity Index</td><td class="td-val">${comp.ssim_score != null ? (comp.ssim_score * 100).toFixed(2) + '%' : 'N/A'}</td></tr>
        <tr class="alt"><td class="td-label">Clinical Progression Status</td>
          <td class="td-val" style="font-weight:700;color:${comp.status === 'Improved' ? '#1a6b3c' : comp.status === 'Worsened' ? '#b91c1c' : '#92400e'};">${comp.status}</td>
        </tr>
      </table>
    </section>` : '';

    // ── Clinical interpretation ──
    const interpretation = (() => {
      if (isNormal) {
        return `The current chest radiograph demonstrates no radiographic evidence of consolidation, air-space opacification, interstitial infiltrates, or pleural effusion as detectable by the AI model. The lung fields appear clear bilaterally. A respiratory health score of ${score}/100 was assigned, reflecting a clinically favourable pulmonary profile.
      ${comp ? `In comparison with the prior radiograph dated ${priorDate}, the structural similarity index (SSIM) was recorded at ${comp.ssim_score != null ? (comp.ssim_score * 100).toFixed(2) + '%' : 'N/A'}, indicating ${comp.status === 'Improved' ? 'a continued improvement in pulmonary status' : comp.status === 'Worsened' ? 'a decline relative to the prior study' : 'stable findings with no clinically significant interval change'}.` : ''}`;
      }
      if (sev === 'Mild') {
        return `The chest radiograph demonstrates early radiographic findings suggestive of <strong>${pred}</strong>, with a disease probability of ${prob}% and a model confidence of ${conf}%. The pattern is consistent with mild pulmonary involvement, characterised by subtle parenchymal haziness without frank consolidation. The respiratory health score of ${score}/100 reflects a mildly compromised pulmonary reserve.
      ${comp ? `Compared to the prior study dated ${priorDate}, the disease probability has ${comp.status === 'Improved' ? `decreased from ${comp.previous_probability?.toFixed(1)}% to ${comp.current_probability?.toFixed(1)}%, indicating measurable clinical improvement in line with ongoing management` : comp.status === 'Worsened' ? `increased from ${comp.previous_probability?.toFixed(1)}% to ${comp.current_probability?.toFixed(1)}%, suggesting early progression that warrants prompt clinical reassessment` : `remained relatively stable at ${comp.current_probability?.toFixed(1)}%, indicating no significant interval change`}. The SSIM structural similarity index was ${comp.ssim_score != null ? (comp.ssim_score * 100).toFixed(2) + '%' : 'N/A'}.` : ''}`;
      }
      if (sev === 'Moderate') {
        return `The chest radiograph demonstrates radiographic findings consistent with <strong>${pred}</strong> of moderate severity, with a disease probability of ${prob}% and a model confidence of ${conf}%. Pulmonary infiltrates or patchy consolidation may be present in one or more lung zones, consistent with an active inflammatory or infective process. The respiratory health score of ${score}/100 reflects a moderately compromised respiratory reserve requiring active clinical management.
      ${comp ? `Serial comparison with the prior radiograph dated ${priorDate} reveals a disease probability change from ${comp.previous_probability?.toFixed(1)}% to ${comp.current_probability?.toFixed(1)}% (SSIM: ${comp.ssim_score != null ? (comp.ssim_score * 100).toFixed(2) + '%' : 'N/A'}), indicating a clinical status of <strong>${comp.status}</strong>. ${comp.status === 'Improved' ? 'This trajectory is encouraging and suggests a positive response to treatment; continued monitoring is advised.' : comp.status === 'Worsened' ? 'This worsening trend necessitates prompt re-evaluation of the current therapeutic regimen.' : 'Absence of significant interval change suggests the disease process is currently contained; adherence to prescribed management is essential.'}` : ''}`;
      }
      // Severe
      return `The chest radiograph demonstrates extensive radiographic abnormalities consistent with <strong>severe ${pred}</strong>, with a disease probability of ${prob}% and a model confidence of ${conf}%. Findings may include widespread consolidation, bilateral infiltrates, or significant air-space opacification indicative of a substantially compromised pulmonary parenchyma. The respiratory health score of ${score}/100 reflects severely diminished respiratory reserve and warrants urgent clinical attention.
    ${comp ? `Compared to the prior study dated ${priorDate}, the disease probability has changed from ${comp.previous_probability?.toFixed(1)}% to ${comp.current_probability?.toFixed(1)}% (SSIM: ${comp.ssim_score != null ? (comp.ssim_score * 100).toFixed(2) + '%' : 'N/A'}), denoting a progression status of <strong>${comp.status}</strong>. ${comp.status === 'Worsened' ? 'The radiographic deterioration relative to prior imaging is of significant concern and mandates immediate escalation of clinical care.' : comp.status === 'Improved' ? 'Despite the severity classification, a reduction in disease probability relative to the prior study is noted, which may reflect early treatment response; however, close inpatient or outpatient monitoring remains essential.' : 'The stable trajectory in the context of severe disease indicates that the condition is neither resolving nor deteriorating; sustained aggressive management is required.'}` : ''}`;
    })();

    // ── Recommendations ──
    const recommendations = (() => {
      if (isNormal) {
        return `
        <li>The chest radiograph is within normal limits per AI-assisted assessment. No acute pulmonary pathology is currently identified.</li>
        <li>Continue routine health maintenance, including age-appropriate vaccinations (pneumococcal, influenza) as recommended by your healthcare provider.</li>
        <li>Maintain an active lifestyle, adequate hydration, and a balanced diet to support optimal respiratory and immune function.</li>
        ${comp?.status === 'Improved' ? '<li>The notable improvement from your previous scan is an encouraging sign. Continue adhering to your current health regimen — your lungs are responding well.</li>' : ''}
        ${comp?.status === 'Stable' ? '<li>Your lungs have remained consistently clear across sequential examinations — a testament to good preventive care. Continue your current routine.</li>' : ''}
        <li>Schedule a follow-up chest radiograph as clinically indicated or as directed by your physician.</li>`;
      }
      if (sev === 'Mild') {
        return `
        <li>Clinical correlation with the patient's presenting symptoms, physical examination findings (auscultation, percussion), and baseline laboratory investigations (complete blood count, C-reactive protein) is recommended.</li>
        <li>Initiate or continue appropriate pharmacological management as directed by the treating physician. Oral antibiotic therapy may be considered pending microbiological confirmation.</li>
        <li>Encourage adequate oral hydration (≥2 litres/day unless contraindicated), rest, and avoidance of respiratory irritants including tobacco smoke.</li>
        ${comp?.status === 'Improved' ? '<li>The decline in disease probability from your previous scan is an encouraging development. Your lungs are showing early signs of recovery — continue following your treatment plan diligently.</li>' : ''}
        ${comp?.status === 'Worsened' ? '<li>The mild increase in disease probability compared to the prior study suggests early progression. Prompt reassessment by your physician is advised to prevent further deterioration.</li>' : ''}
        <li>A follow-up chest radiograph in 4–6 weeks is recommended to document treatment response and ensure radiographic resolution.</li>`;
      }
      if (sev === 'Moderate') {
        return `
        <li>Prompt clinical evaluation is recommended, including thorough history-taking, physical examination, and comprehensive laboratory workup (CBC with differential, CRP/ESR, sputum Gram stain and culture, pulse oximetry).</li>
        <li>Antibiotic therapy should be initiated or optimised based on clinical severity scoring (e.g., CURB-65) and local antimicrobial resistance patterns, in consultation with the treating physician.</li>
        <li>Supplemental oxygen therapy should be considered if peripheral oxygen saturation (SpO₂) falls below 94% on room air.</li>
        <li>Ensure adequate nutritional support, hydration, and bed rest. Incentive spirometry may assist in preventing atelectasis.</li>
        ${comp?.status === 'Improved' ? '<li>The measurable reduction in disease probability relative to the prior scan is an encouraging sign of treatment efficacy. Continue the prescribed regimen and maintain close clinical follow-up.</li>' : ''}
        ${comp?.status === 'Worsened' ? '<li>The increase in disease probability compared to the prior study is clinically significant. Re-evaluation of the current treatment approach, consideration of escalated antibiotic therapy, and possible hospital admission should be discussed with the treating physician urgently.</li>' : ''}
        <li>Repeat chest radiograph in 3–4 weeks to assess radiographic improvement, or sooner if clinical deterioration occurs.</li>`;
      }
      // Severe
      return `
      <li><strong>Urgent medical attention is required.</strong> Immediate clinical assessment by a respiratory physician or emergency care provider is strongly advised.</li>
      <li>Hospital admission should be strongly considered given the severity of radiographic findings. Assess for need of supplemental oxygen or ventilatory support.</li>
      <li>Comprehensive investigations are essential: arterial blood gas (ABG), high-resolution CT chest (if clinically indicated), blood cultures, sputum culture and sensitivity, and inflammatory markers.</li>
      <li>Empirical broad-spectrum intravenous antibiotic therapy should be initiated promptly per local hospital guidelines, pending microbiological results.</li>
      ${comp?.status === 'Worsened' ? '<li><strong>Radiographic deterioration compared to the prior study requires immediate escalation of care.</strong> Do not delay seeking specialist evaluation.</li>' : ''}
      ${comp?.status === 'Improved' ? '<li>Despite severe classification, the reduction in disease probability from the prior study suggests early response to treatment. This is encouraging — continue current management under close supervision.</li>' : ''}
      <li>Arrange follow-up chest radiograph within 1–2 weeks of treatment initiation, or earlier if clinical status changes.</li>`;
    })();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MEDIVISION Radiological Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', Times, serif;
    background: #ffffff;
    color: #1a1a1a;
    font-size: 13px;
    line-height: 1.6;
  }
  .report-wrap { max-width: 820px; margin: 0 auto; padding: 40px 48px; }
  /* Header */
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #1a1a1a; margin-bottom: 24px; }
  .header-left {}
  .brand-tag { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px; font-family: Arial, sans-serif; }
  .brand-name { font-size: 20px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
  .brand-sub { font-size: 11px; color: #6b7280; margin-top: 3px; font-family: Arial, sans-serif; }
  .header-right { text-align: right; font-size: 11px; color: #4b5563; font-family: Arial, sans-serif; line-height: 1.8; }
  .header-right strong { color: #1a1a1a; }
  /* Patient Info */
  .patient-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; }
  .patient-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; margin-top: 10px; }
  .patient-field label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 3px; font-family: Arial, sans-serif; }
  .patient-field span { font-size: 12px; font-weight: 600; color: #1a1a1a; }
  /* Section */
  .report-section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 7px; margin-bottom: 14px; font-family: Arial, sans-serif; }
  .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 10px; font-family: Arial, sans-serif; }
  /* Tables */
  .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .report-table td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
  .report-table tr.alt td { background: #f8f9fa; }
  .td-label { color: #4b5563; width: 200px; }
  .td-val { font-weight: 600; color: #1a1a1a; }
  .td-bar { width: 180px; }
  .bar-bg { width: 100%; height: 7px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 7px; border-radius: 4px; }
  /* Imaging */
  .imaging-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .img-card { text-align: center; }
  .img-label { font-size: 10px; color: #6b7280; margin-bottom: 6px; font-family: Arial, sans-serif; line-height: 1.4; }
  .img-date { font-size: 9px; color: #9ca3af; font-style: italic; }
  .report-img { width: 100%; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #d1d5db; background: #111; display: block; }
  /* Interpretation */
  .interp-text { font-size: 13px; color: #1f2937; line-height: 1.85; text-align: justify; }
  /* Recommendations */
  .rec-list { list-style: none; padding: 0; }
  .rec-list li { padding: 6px 0 6px 18px; position: relative; font-size: 12px; color: #374151; line-height: 1.7; border-bottom: 1px dotted #e5e7eb; }
  .rec-list li:last-child { border-bottom: none; }
  .rec-list li::before { content: '\\25B8'; position: absolute; left: 0; color: #1d4e50; font-size: 10px; top: 9px; }
  /* Disclaimer */
  .disclaimer { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 12px 16px; font-size: 10.5px; color: #6b7280; line-height: 1.7; font-family: Arial, sans-serif; }
  .disclaimer strong { color: #374151; }
  /* Action bar */
  .action-bar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 28px; }
  .btn-download { padding: 9px 20px; background: #1d4e50; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: Arial, sans-serif; }
  .btn-download:hover { background: #163a3c; }
  /* Findings summary box */
  .findings-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; }
  .findings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; margin-top: 10px; }
  .findings-field label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; margin-bottom: 3px; font-family: Arial, sans-serif; }
  .findings-field span { font-size: 13px; font-weight: 700; }
  @media print {
    .action-bar { display: none !important; }
    body { background: #fff; }
    .report-wrap { padding: 20px 30px; }
  }
</style>
</head>
<body>
<div class="report-wrap">

  <!-- Action Bar -->
  <div class="action-bar">
    <button class="btn-download" onclick="downloadReport()">&#11015; Download Report</button>
  </div>

  <!-- Header -->
  <div class="report-header">
    <div class="header-left">
      <p class="brand-tag">AI-Assisted Diagnostic Imaging Report</p>
      <div class="brand-name">MEDIVISION</div>
      <p class="brand-sub">Chest Radiograph Analysis — Powered by DenseNet121-ResNet50 Feature Fusion</p>
    </div>
    <div class="header-right">
      <p><strong>Report Date:</strong> ${reportDate}</p>
      <p><strong>Report ID:</strong> ${reportId}</p>
      <p><strong>Modality:</strong> Chest X-Ray (CXR — PA View)</p>
    </div>
  </div>

  <!-- Patient Information -->
  <div class="patient-box">
    <p class="box-title">Patient Information</p>
    <div class="patient-grid">
      <div class="patient-field"><label>Full Name</label><span>${patientName}</span></div>
      <div class="patient-field"><label>Age</label><span>${patientAge}</span></div>
      <div class="patient-field"><label>Gender</label><span>${genderStr}</span></div>
      <div class="patient-field"><label>Patient ID / Email</label><span>${patientId}</span></div>
      <div class="patient-field"><label>Examination Date</label><span>${currentDate}</span></div>
      <div class="patient-field"><label>Study Type</label><span>Chest Radiograph</span></div>
    </div>
  </div>

  <!-- AI Findings Summary -->
  <div class="findings-box">
    <p class="box-title">AI Findings Summary</p>
    <div class="findings-grid">
      <div class="findings-field"><label>Primary Diagnosis</label><span style="color:${isNormal ? '#15803d' : '#b45309'};">${pred}</span></div>
      <div class="findings-field"><label>Disease Probability</label><span>${prob}%</span></div>
      <div class="findings-field"><label>Model Confidence</label><span>${conf}%</span></div>
      <div class="findings-field"><label>Clinical Severity</label><span style="color:${sev === 'Severe' ? '#b91c1c' : sev === 'Moderate' ? '#b45309' : '#15803d'};">${sev}</span></div>
      <div class="findings-field"><label>Respiratory Health Score</label><span>${score} / 100</span></div>
      ${comp ? `<div class="findings-field"><label>Progression Status</label><span style="color:${comp.status === 'Improved' ? '#15803d' : comp.status === 'Worsened' ? '#b91c1c' : '#b45309'};">${comp.status}</span></div>` : ''}
    </div>
  </div>

  <!-- Probability Distribution -->
  ${probRows ? `
  <section class="report-section">
    <h3 class="section-title">Differential Probability Distribution</h3>
    <table class="report-table">
      <thead>
        <tr class="alt">
          <td class="td-label" style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-family:Arial,sans-serif;">Classification</td>
          <td class="td-val" style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-family:Arial,sans-serif;">Probability</td>
          <td class="td-bar" style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;font-family:Arial,sans-serif;">Distribution</td>
        </tr>
      </thead>
      <tbody>${probRows}</tbody>
    </table>
  </section>` : ''}

  <!-- Comparative Analysis -->
  ${comparativeBlock}

  <!-- Imaging -->
  ${imagingBlock}

  <!-- Clinical Interpretation -->
  <section class="report-section">
    <h3 class="section-title">Clinical Interpretation</h3>
    <p class="interp-text">${interpretation}</p>
  </section>

  <!-- Recommendations -->
  <section class="report-section">
    <h3 class="section-title">Clinical Recommendations</h3>
    <ul class="rec-list">${recommendations}</ul>
  </section>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report was generated by the MEDIVISION AI diagnostic system (DenseNet121-ResNet50 Feature Fusion with CBAM Attention, binary classification: Normal vs. Pneumonia). It is intended solely as a clinical decision-support tool and does not constitute a formal radiological or medical diagnosis. All findings must be interpreted by a qualified and licensed clinician or radiologist in the context of the patient's complete clinical history, examination, and ancillary investigations. MEDIVISION and its AI systems assume no medico-legal liability for clinical decisions made on the basis of this report.
  </div>

</div>

<script>
function downloadReport() {
  var blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'MEDIVISION_Report_${reportId}.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
</body>
</html>`;

    setReportHtml(html);
    setShowReport(true);

    // Scroll to top of the page so report is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Read file as base64 data URL so we can inject it into history cards locally
    let fileDataUrl = null;
    try {
      fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (_) { /* non-critical */ }

    try {
      const localPreview = fileDataUrl || URL.createObjectURL(file);
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
      // Inject live heatmap + xray into the newest history record so View Report
      // shows them immediately — no server-side projection dependency
      await fetchProgressHistory(data.heatmap || null, fileDataUrl);
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
      {showReport && (
        <div
          id="medivision-report-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.72)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '32px 16px 48px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}
        >
          <div style={{
            width: '100%',
            maxWidth: '860px',
            background: '#fff',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            position: 'relative',
          }}>
            {/* Close button outside iframe */}
            <button
              onClick={() => setShowReport(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                zIndex: 10,
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #d1d5db',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ✕ Close
            </button>
            <iframe
              srcDoc={reportHtml}
              title="MEDIVISION Radiological Report"
              style={{ width: '100%', height: '90vh', border: 'none', display: 'block' }}
              sandbox="allow-scripts allow-same-origin allow-downloads"
            />
          </div>
        </div>
      )}
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
