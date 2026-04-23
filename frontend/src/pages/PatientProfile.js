import React, { useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import MedicalReport from '../components/MedicalReport';
import './PatientProfile.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PatientProfile = () => {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    smokingStatus: '',
    hasCough: '',
    coughDuration: '',
    coughType: '',
    symptoms: [],
    medicalConditions: [],
    allergiesMedications: '',
    xrayFile: null
  });
  const [showUploadTip, setShowUploadTip] = useState(false);
  const [fileValidationError, setFileValidationError] = useState('');
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [preprocessedImage, setPreprocessedImage] = useState(null);
  const [reportId, setReportId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleFileInputClick = (e) => {
    e.preventDefault();
    setShowUploadTip(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset previous states
    setFileValidationError('');
    setFilePreview(null);

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setFileValidationError('Please upload an image file (JPEG, JPG, or PNG)');
      e.target.value = '';
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileValidationError('File size must be less than 10MB');
      e.target.value = '';
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setFilePreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Validate if it's a chest X-ray
    setIsValidatingFile(true);
    try {
      const validationResult = await validateChestXray(file);
      
      if (validationResult.isChestXray) {
        setFormData(prev => ({
          ...prev,
          xrayFile: file
        }));
        setFileValidationError('');
      } else {
        setFileValidationError(
          'The uploaded image does not meet the criteria for a valid chest radiograph. Please upload a standard posterior-anterior (PA) chest X-ray in JPEG or PNG format. Other types of images, photographs, or non-chest radiographs cannot be accepted.'
        );
        setFilePreview(null);
        setFormData(prev => ({
          ...prev,
          xrayFile: null
        }));
        e.target.value = '';
      }
    } catch (error) {
      console.error('Validation error:', error);
      setFileValidationError('Error validating image. Please try again.');
      e.target.value = '';
    } finally {
      setIsValidatingFile(false);
    }
  };

  // Function to validate if the image is a chest X-ray using backend API
  const validateChestXray = async (file) => {
    try {
      // Send as multipart FormData — backend expects UploadFile
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/xray/validate-xray', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Validation failed');
      }

      return {
        isChestXray: result.isChestXray,
        confidence: result.confidence,
        message: result.message,
        details: result.details
      };

    } catch (error) {
      console.error('Backend validation error:', error);
      // Fallback to client-side validation if backend is unreachable
      return await validateChestXrayClientSide(file);
    }
  };

  // Fallback client-side validation
  const validateChestXrayClientSide = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Create canvas for image analysis
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          try {
            // Get image data for analysis
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Analyze image characteristics
            let totalBrightness = 0;
            let grayPixels = 0;
            let darkPixels = 0;
            let brightPixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Calculate brightness
              const brightness = (r + g + b) / 3;
              totalBrightness += brightness;
              
              // Check if grayscale (X-rays are typically grayscale)
              const colorDiff = Math.max(
                Math.abs(r - g),
                Math.abs(g - b),
                Math.abs(r - b)
              );
              
              if (colorDiff < 30) {
                grayPixels++;
              }
              
              // Count dark and bright pixels
              if (brightness < 50) darkPixels++;
              if (brightness > 200) brightPixels++;
            }
            
            const totalPixels = data.length / 4;
            const avgBrightness = totalBrightness / totalPixels;
            const grayPercentage = (grayPixels / totalPixels) * 100;
            const darkPercentage = (darkPixels / totalPixels) * 100;
            const brightPercentage = (brightPixels / totalPixels) * 100;
            
            // Check aspect ratio (chest X-rays are typically portrait or square)
            const aspectRatio = img.width / img.height;
            
            // Validation criteria for chest X-ray
            const isGrayscale = grayPercentage > 70; // More than 70% should be grayscale
            const hasProperContrast = darkPercentage > 10 && brightPercentage > 10;
            const hasReasonableAspectRatio = aspectRatio > 0.5 && aspectRatio < 2;
            const hasReasonableBrightness = avgBrightness > 40 && avgBrightness < 180;
            
            // Determine if it's likely a chest X-ray
            let validationScore = 0;
            let failureReasons = [];
            
            if (isGrayscale) validationScore++;
            else failureReasons.push('Image should be grayscale');
            
            if (hasProperContrast) validationScore++;
            else failureReasons.push('Image lacks proper contrast');
            
            if (hasReasonableAspectRatio) validationScore++;
            else failureReasons.push('Image has unusual dimensions for a chest X-ray');
            
            if (hasReasonableBrightness) validationScore++;
            else failureReasons.push('Image brightness is unusual for an X-ray');
            
            // Need at least 3 out of 4 criteria to pass
            const isChestXray = validationScore >= 3;
            
            resolve({
              isChestXray,
              message: isChestXray 
                ? 'Valid chest X-ray detected' 
                : `Detected issues: ${failureReasons.join(', ')}. Please upload a chest X-ray only.`,
              details: {
                grayPercentage: grayPercentage.toFixed(2),
                aspectRatio: aspectRatio.toFixed(2),
                avgBrightness: avgBrightness.toFixed(2),
                score: validationScore
              }
            });
          } catch (error) {
            console.error('Image analysis error:', error);
            // If analysis fails, allow the upload but warn
            resolve({
              isChestXray: true,
              message: 'Could not fully validate image, proceeding with upload'
            });
          }
        };
        
        img.onerror = () => {
          resolve({
            isChestXray: false,
            message: 'Failed to load image. Please try another file.'
          });
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        resolve({
          isChestXray: false,
          message: 'Failed to read file. Please try again.'
        });
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Preprocess X-ray image for better detection
  const preprocessXrayImage = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas to optimal size (224x224 for model)
          canvas.width = 224;
          canvas.height = 224;
          
          // Draw image scaled to canvas
          ctx.drawImage(img, 0, 0, 224, 224);
          
          // Get image data
          let imageData = ctx.getImageData(0, 0, 224, 224);
          const data = imageData.data;
          
          // Apply preprocessing enhancements
          // 1. Histogram equalization for better contrast
          const histogram = new Array(256).fill(0);
          const cdf = new Array(256).fill(0);
          
          // Build histogram
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
          }
          
          // Build cumulative distribution function
          cdf[0] = histogram[0];
          for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
          }
          
          // Normalize CDF
          const totalPixels = 224 * 224;
          const cdfMin = cdf.find(val => val > 0);
          
          // Apply histogram equalization
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
            const equalizedValue = Math.floor(((cdf[gray] - cdfMin) / (totalPixels - cdfMin)) * 255);
            
            // Apply to all RGB channels (maintains grayscale)
            data[i] = equalizedValue;     // R
            data[i + 1] = equalizedValue; // G
            data[i + 2] = equalizedValue; // B
            // Alpha channel remains unchanged
          }
          
          // 2. Apply slight sharpening for edge enhancement
          const sharpenKernel = [
            0, -1,  0,
           -1,  5, -1,
            0, -1,  0
          ];
          
          const sharpened = new Uint8ClampedArray(data);
          for (let y = 1; y < 223; y++) {
            for (let x = 1; x < 223; x++) {
              const idx = (y * 224 + x) * 4;
              
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const pixelIdx = ((y + ky) * 224 + (x + kx)) * 4;
                  const kernelIdx = (ky + 1) * 3 + (kx + 1);
                  sum += data[pixelIdx] * sharpenKernel[kernelIdx];
                }
              }
              
              sharpened[idx] = Math.min(255, Math.max(0, sum));
              sharpened[idx + 1] = sharpened[idx];
              sharpened[idx + 2] = sharpened[idx];
            }
          }
          
          // Put enhanced data back
          imageData.data.set(sharpened);
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            // Also create preview
            const preprocessedUrl = canvas.toDataURL('image/png');
            setPreprocessedImage(preprocessedUrl);
            
            resolve({
              blob: blob,
              dataUrl: preprocessedUrl
            });
          }, 'image/png');
        };
        
        img.src = e.target.result;
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleGotIt = () => {
    setShowUploadTip(false);
    document.getElementById('xray').click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get user info from localStorage
    const patientDataStr = localStorage.getItem('patientData');
    
    if (!patientDataStr || patientDataStr === 'undefined') {
      console.log('⚠️ Please login to submit your profile');
      return;
    }

    try {
      const patientData = JSON.parse(patientDataStr);
      const userEmail = patientData.email;
      const userName = patientData.fullName || patientData.name || patientData.username || 'Patient';

      if (!formData.xrayFile) {
        console.log('⚠️ Please upload a chest X-ray image');
        return;
      }

      // Step 1: Analyze X-ray first
      if (!analysisResult) {
        setIsAnalyzing(true);
        setFileValidationError('');
        
        try {
          console.log('Starting X-ray analysis with preprocessing...');
          
          // Preprocess image for better detection
          const preprocessed = await preprocessXrayImage(formData.xrayFile);
          console.log('Image preprocessing complete');

          // Send preprocessed image for analysis
          const analyzeFormData = new FormData();
          analyzeFormData.append('file', preprocessed.blob, 'preprocessed_xray.png');

          const analyzeResponse = await fetch('http://localhost:5000/api/xray/analyze', {
            method: 'POST',
            body: analyzeFormData,
          });

          if (!analyzeResponse.ok) {
            const errorData = await analyzeResponse.json();
            throw new Error(errorData.detail || 'Failed to analyze X-ray image');
          }

          const analysisData = await analyzeResponse.json();
          console.log('Analysis result:', analysisData);

          // Generate unique report ID
          const newReportId = 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
          setReportId(newReportId);

          setAnalysisResult(analysisData);
          setIsAnalyzing(false);
          
          // Auto-save report to MongoDB
          saveReportToMongoDB(analysisData, newReportId, userName, userEmail);
          // Seed progress baseline (fire-and-forget)
          saveProgressBaseline(analysisData, userEmail);
          
          // Scroll to report
          setTimeout(() => {
            document.getElementById('medical-report')?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100);
          
          // Analysis complete - no popup message needed as report is visible
          // setSuccessMessage(`Analysis Complete! Prediction: ${analysisData.prediction} (${(analysisData.confidence * 100).toFixed(1)}% confidence)`);
          // setShowSuccessPopup(true);
          // setTimeout(() => setShowSuccessPopup(false), 4000);
          return; // Stop here to let user review
          
        } catch (error) {
          console.error('X-ray analysis error:', error);
          setFileValidationError(`Analysis failed: ${error.message}`);
          setIsAnalyzing(false);
          return;
        }
      }

      // Step 2: If analysis is complete, submit profile with results
      console.log('Submitting profile with analysis results...');
      
      // Create FormData to send file and analysis
      const submitData = new FormData();
      submitData.append('email', userEmail);
      submitData.append('userName', userName || 'Patient');
      submitData.append('age', formData.age);
      submitData.append('gender', formData.gender);
      submitData.append('smokingStatus', formData.smokingStatus);
      submitData.append('hasCough', formData.hasCough);
      submitData.append('coughDuration', formData.coughDuration);
      submitData.append('coughType', formData.coughType);
      submitData.append('symptoms', JSON.stringify(formData.symptoms));
      submitData.append('medicalConditions', JSON.stringify(formData.medicalConditions));
      submitData.append('allergiesMedications', formData.allergiesMedications);
      submitData.append('xrayFile', formData.xrayFile);
      
      // Add analysis results
      submitData.append('aiPrediction', analysisResult.prediction);
      submitData.append('aiConfidence', analysisResult.confidence);
      submitData.append('aiProbabilities', JSON.stringify(analysisResult.probabilities));

      const response = await fetch('http://localhost:5000/api/patient/submit-profile', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        console.log('Profile submitted successfully:', result.message);
        // Don't show popup for successful submission to avoid confusion
        // Since report is already visible, user can see everything
      } else {
        console.error('Profile submission failed:', result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      // Don't show error popups - report is already generated and visible
    }
  };

  // Auto-save report to MongoDB
  const saveReportToMongoDB = async (analysisData, reportIdValue, userName, userEmail) => {
    try {
      // Prepare comprehensive patient report data
      const reportData = {
        reportId: reportIdValue,
        patientEmail: userEmail,
        patientName: userName,
        patientAge: parseInt(formData.age) || 0,
        patientGender: formData.gender || 'Not specified',
        smokingStatus: formData.smokingStatus || 'Unknown',
        // Include cough information
        hasCough: formData.hasCough || 'No',
        coughDuration: formData.coughDuration || '',
        coughType: formData.coughType || '',
        // Symptoms and medical history
        symptoms: formData.symptoms.length > 0 ? formData.symptoms.join(', ') : 'None reported',
        medicalHistory: (
          (formData.medicalConditions.length > 0 ? formData.medicalConditions.join(', ') : 'None') +
          (formData.allergiesMedications ? '; Allergies/Medications: ' + formData.allergiesMedications : '')
        ),
        // AI Analysis results
        prediction: analysisData.prediction,
        confidence: analysisData.confidence,
        probabilities: analysisData.probabilities || {},
        severity: analysisData.confidence > 0.8 ? 'High' : analysisData.confidence > 0.5 ? 'Moderate' : 'Low',
        heatmapExplanation: analysisData.explanation?.medical_context || 'No explanation available',
        // Images - original X-ray and heatmap
        originalImage: filePreview,
        heatmapImage: analysisData.heatmap || preprocessedImage || filePreview
      };

      console.log('Saving report to MongoDB:', {
        reportId: reportIdValue,
        patientName: userName,
        prediction: analysisData.prediction,
        confidence: (analysisData.confidence * 100).toFixed(1) + '%'
      });

      const response = await fetch('http://localhost:5000/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Report saved to MongoDB successfully:', result);
      } else {
        const error = await response.json();
        console.error('⚠️ Failed to save report:', error);
      }
    } catch (error) {
      console.error('❌ Error auto-saving report:', error);
      // Silent fail - don't disrupt user experience
    }
  };

  // Seed progress baseline after first X-ray analysis
  const saveProgressBaseline = async (analysisData, userEmail) => {
    try {
      await fetch('http://localhost:5000/api/xray/progress/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: userEmail,
          prediction: analysisData.prediction,
          confidence: analysisData.confidence,
          probabilities: analysisData.probabilities || {},
          heatmap: analysisData.heatmap || '',
          originalImage: filePreview || ''
        })
      });
    } catch (err) {
      // Silent fail — do not disrupt UI
      console.warn('Progress baseline save failed:', err.message);
    }
  };

  // Fetch doctors list for sending report
  const fetchDoctors = async () => {
    try {
      // Reset search when opening modal
      setDoctorSearch('');
      
      const response = await fetch('http://localhost:5000/api/doctors/list');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.doctors && data.doctors.length > 0) {
        setDoctors(data.doctors);
        setShowDoctorModal(true);
      } else {
        console.log('⚠️ No verified doctors available');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      console.log('❌ Unable to load doctors list');
    }
  };

  // Download PDF Report
  const downloadPDF = async () => {
    const reportElement = document.getElementById('medical-report');
    if (!reportElement) {
      console.log('⚠️ Please complete the analysis first to generate a report');
      return;
    }

    if (!reportId) {
      console.log('⚠️ Report ID is missing. Please analyze the X-ray again');
      return;
    }

    try {
      // Clone the report to manipulate it
      const clonedReport = reportElement.cloneNode(true);
      
      // Remove buttons from cloned element (both old and new class names)
      const buttons = clonedReport.querySelectorAll('.report-actions, .report-action-buttons-no-print');
      buttons.forEach(btn => btn.remove());
      
      // Temporarily add cloned element to body
      clonedReport.style.position = 'absolute';
      clonedReport.style.left = '-9999px';
      document.body.appendChild(clonedReport);
      
      // Generate high-quality canvas
      const canvas = await html2canvas(clonedReport, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: clonedReport.scrollWidth,
        windowHeight: clonedReport.scrollHeight,
        imageTimeout: 0,
        removeContainer: true
      });
      
      // Remove cloned element
      document.body.removeChild(clonedReport);
      
      // Convert to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      pdf.save(`MEDIVISION_Report_${reportId}.pdf`);
      
      // PDF downloaded - no popup needed
      console.log('✅ PDF Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message, error.stack);
      // Log error but don't show popup
    }
  };

  // Send Report to Doctor
  const sendReportToDoctor = async () => {
    if (!selectedDoctor) {
      console.log('⚠️ Please select a doctor');
      return;
    }

    // Validate that analysis has been completed
    if (!analysisResult || !analysisResult.prediction) {
      console.log('⚠️ Please complete X-ray analysis first');
      return;
    }

    if (!filePreview) {
      console.log('⚠️ X-ray image is missing');
      return;
    }

    setIsSending(true);
    
    try {
      // Validate patient data from localStorage
      const patientDataStr = localStorage.getItem('patientData');
      if (!patientDataStr) {
        throw new Error('Patient information not found. Please log in again.');
      }

      const patientData = JSON.parse(patientDataStr);
      if (!patientData.email) {
        throw new Error('Patient email not found. Please log in again.');
      }

      const patientName = patientData.fullName || patientData.name || patientData.username || 'Patient';
      const patientEmail = patientData.email;

      // Log data for debugging
      console.log('Sending report with data:', {
        reportId,
        doctorId: selectedDoctor.id,
        hasAnalysisResult: !!analysisResult,
        hasFilePreview: !!filePreview,
        hasHeatmap: !!analysisResult.heatmap,
        hasPreprocessedImage: !!preprocessedImage,
        formDataAge: formData.age,
        formDataGender: formData.gender,
        formDataSmokingStatus: formData.smokingStatus
      });

      // Prepare report data with validation
      const reportData = {
        reportId: reportId,
        doctorId: selectedDoctor.id,
        patientEmail: patientEmail,
        patientName: patientName,
        patientAge: parseInt(formData.age) || 0,
        patientGender: formData.gender || 'Not specified',
        smokingStatus: formData.smokingStatus || 'Unknown',
        hasCough: formData.hasCough || 'No',
        coughDuration: formData.coughDuration || 'N/A',
        coughType: formData.coughType || 'N/A',
        symptoms: Array.isArray(formData.symptoms) ? formData.symptoms.join(', ') : (formData.symptoms || 'None'),
        medicalHistory: (Array.isArray(formData.medicalConditions) ? formData.medicalConditions.join(', ') : (formData.medicalConditions || 'None')) + (formData.allergiesMedications ? '; ' + formData.allergiesMedications : ''),
        prediction: analysisResult.prediction,
        confidence: parseFloat(analysisResult.confidence) || 0,
        severity: analysisResult.confidence > 0.8 ? 'Severe' : analysisResult.confidence > 0.5 ? 'Moderate' : 'Mild',
        heatmapExplanation: analysisResult.explanation?.medical_context || 'No heatmap explanation available',
        originalImage: filePreview || '',
        heatmapImage: analysisResult.heatmap || preprocessedImage || ''
      };

      console.log('Sending report data:', JSON.stringify(reportData, null, 2));

      const response = await fetch('http://localhost:5000/api/reports/send-to-doctor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Failed to send report';
        try {
          const errorData = await response.json();
          console.error('Backend error response:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('Could not parse error response:', e);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        setShowDoctorModal(false);
        // Store chat session so PatientDashboard can open the panel
        localStorage.setItem('activeChatSession', JSON.stringify({
          sessionId: result.session_id || Date.now(),
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.fullName,
          availabilityTime: selectedDoctor.availabilityTime || selectedDoctor.availability_time || ''
        }));
        setSelectedDoctor(null);
        console.log(`✅ Report sent successfully to Dr. ${result.doctorName}!`);
        setShowDoctorModal(false);
        setSelectedDoctor(null);
        setDoctorSearch('');
        // Reset the analysis so the report overlay closes and page refreshes view
        window.location.reload();
      } else {
        throw new Error('Report sending failed');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      let errorMessage = 'Error sending report. Please try again.';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on port 5000.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PatientLayout>
      <div className="profile-page-content">
          <div className="profile-container">
            <div className="profile-header">
              <h1 className="profile-title">Complete Your Profile & Upload X-ray</h1>
              <p className="profile-subtitle">All fields are important for accurate diagnosis</p>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              {/* Basic Information */}
              <div className="form-section">
                <h2 className="section-title">Basic Information</h2>
                <div className="form-content">
                  <div className="medical-history-grid">
                    {/* Age Card */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Age
                      </h3>
                      <div className="form-group">
                        <label htmlFor="age">Enter your age <span className="required">*</span></label>
                        <input
                          type="number"
                          id="age"
                          name="age"
                          value={formData.age}
                          onChange={handleInputChange}
                          placeholder="Enter your age"
                          required
                        />
                      </div>
                    </div>

                    {/* Gender Card */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="9" cy="7" r="4" />
                          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                        Gender
                      </h3>
                      <div className="form-group">
                        <label>Select your gender <span className="required">*</span></label>
                        <div className="radio-group">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="gender"
                              value="Male"
                              checked={formData.gender === 'Male'}
                              onChange={handleInputChange}
                              required
                            />
                            <span>Male</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="gender"
                              value="Female"
                              checked={formData.gender === 'Female'}
                              onChange={handleInputChange}
                            />
                            <span>Female</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="gender"
                              value="Other"
                              checked={formData.gender === 'Other'}
                              onChange={handleInputChange}
                            />
                            <span>Other</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="gender"
                              value="Prefer not to say"
                              checked={formData.gender === 'Prefer not to say'}
                              onChange={handleInputChange}
                            />
                            <span>Prefer not to say</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smoking History */}
              <div className="form-section">
                <h2 className="section-title">Smoking History</h2>
                <div className="form-content">
                  <div className="medical-history-grid">
                    {/* Smoking Status Card */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8c0-3.3-2.7-6-6-6S6 4.7 6 8" />
                          <path d="M2 16h20" />
                          <path d="M2 16v3c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-3" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                        </svg>
                        Smoking Status
                      </h3>
                      <div className="form-group">
                        <label>Select your smoking status <span className="required">*</span></label>
                        <div className="radio-group">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="smokingStatus"
                              value="Current smoker"
                              checked={formData.smokingStatus === 'Current smoker'}
                              onChange={handleInputChange}
                              required
                            />
                            <span>Current smoker</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="smokingStatus"
                              value="Former smoker"
                              checked={formData.smokingStatus === 'Former smoker'}
                              onChange={handleInputChange}
                            />
                            <span>Former smoker</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="smokingStatus"
                              value="Non-smoker"
                              checked={formData.smokingStatus === 'Non-smoker'}
                              onChange={handleInputChange}
                            />
                            <span>Non-smoker</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Cough Question Card */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4" />
                          <path d="M12 16h.01" />
                        </svg>
                        Cough Status
                      </h3>
                      <div className="form-group">
                        <label>Do you have a cough? <span className="required">*</span></label>
                        <div className="radio-group">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="hasCough"
                              value="Yes"
                              checked={formData.hasCough === 'Yes'}
                              onChange={handleInputChange}
                              required
                            />
                            <span>Yes</span>
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name="hasCough"
                              value="No"
                              checked={formData.hasCough === 'No'}
                              onChange={handleInputChange}
                            />
                            <span>No</span>
                          </label>
                        </div>
                      </div>

                      {/* Cough Duration - Show only if hasCough is Yes */}
                      {formData.hasCough === 'Yes' && (
                        <>
                          <div className="form-group" style={{marginTop: '1rem'}}>
                            <label htmlFor="coughDuration">How long have you had the cough? <span className="required">*</span></label>
                            <input
                              type="text"
                              id="coughDuration"
                              name="coughDuration"
                              value={formData.coughDuration}
                              onChange={handleInputChange}
                              placeholder="e.g., 2 weeks, 1 month, 3 days"
                              required
                            />
                          </div>

                          <div className="form-group" style={{marginTop: '1rem'}}>
                            <label>What type of cough? <span className="required">*</span></label>
                            <div className="radio-group">
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name="coughType"
                                  value="Dry cough"
                                  checked={formData.coughType === 'Dry cough'}
                                  onChange={handleInputChange}
                                  required
                                />
                                <span>Dry cough (no mucus)</span>
                              </label>
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name="coughType"
                                  value="Productive cough"
                                  checked={formData.coughType === 'Productive cough'}
                                  onChange={handleInputChange}
                                />
                                <span>Productive cough (with mucus/phlegm)</span>
                              </label>
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name="coughType"
                                  value="Cough with blood"
                                  checked={formData.coughType === 'Cough with blood'}
                                  onChange={handleInputChange}
                                />
                                <span>Cough with blood (hemoptysis)</span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Symptoms */}
              <div className="form-section">
                <h2 className="section-title">Current Symptoms</h2>
                <div className="form-content">
                  <div className="medical-card">
                    <h3 className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      Additional Symptoms
                    </h3>
                    <div className="form-group">
                      <label>Select all that apply</label>
                      <div className="checkbox-grid">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          value="Fever"
                          checked={formData.symptoms.includes('Fever')}
                          onChange={(e) => handleCheckboxChange(e, 'symptoms')}
                        />
                        <span>Fever</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          value="Weight loss"
                          checked={formData.symptoms.includes('Weight loss')}
                          onChange={(e) => handleCheckboxChange(e, 'symptoms')}
                        />
                        <span>Weight loss</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          value="Night sweats"
                          checked={formData.symptoms.includes('Night sweats')}
                          onChange={(e) => handleCheckboxChange(e, 'symptoms')}
                        />
                        <span>Night sweats</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          value="Chest pain"
                          checked={formData.symptoms.includes('Chest pain')}
                          onChange={(e) => handleCheckboxChange(e, 'symptoms')}
                        />
                        <span>Chest pain</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          value="Shortness of breath"
                          checked={formData.symptoms.includes('Shortness of breath')}
                          onChange={(e) => handleCheckboxChange(e, 'symptoms')}
                        />
                        <span>Shortness of breath</span>
                      </label>
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="form-section">
                <h2 className="section-title">Medical History</h2>
                <p className="section-subtitle">Relevant to pneumonia risk</p>
                <div className="form-content">
                  <div className="medical-history-grid">
                    {/* Previous Lung Diseases */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        Previous Lung Diseases
                      </h3>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Asthma"
                            checked={formData.medicalConditions.includes('Asthma')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Asthma</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="COPD"
                            checked={formData.medicalConditions.includes('COPD')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>COPD</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Previous Pneumonia"
                            checked={formData.medicalConditions.includes('Previous Pneumonia')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Previous Pneumonia</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Bronchitis"
                            checked={formData.medicalConditions.includes('Bronchitis')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Bronchitis</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Chronic cough"
                            checked={formData.medicalConditions.includes('Chronic cough')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Chronic cough</span>
                        </label>
                      </div>
                    </div>

                    {/* Immune System Status */}
                    <div className="medical-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Immune System Status
                      </h3>
                      <p className="card-subtitle">VERY important for TB and pneumonia severity</p>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Diabetes"
                            checked={formData.medicalConditions.includes('Diabetes')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Diabetes</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Kidney disease"
                            checked={formData.medicalConditions.includes('Kidney disease')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Kidney disease</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="HIV or immune deficiency"
                            checked={formData.medicalConditions.includes('HIV or immune deficiency')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>HIV or immune deficiency</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Organ transplant"
                            checked={formData.medicalConditions.includes('Organ transplant')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Organ transplant</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Cancer or chemotherapy"
                            checked={formData.medicalConditions.includes('Cancer or chemotherapy')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Cancer or chemotherapy</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Taking steroids or immunosuppressive drugs"
                            checked={formData.medicalConditions.includes('Taking steroids or immunosuppressive drugs')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Taking steroids or immunosuppressive drugs</span>
                        </label>
                      </div>
                    </div>

                    {/* Genetic Risk - Pneumonia */}
                    <div className="medical-card genetic-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M2 12h20" />
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                        Genetic Risk - Pneumonia
                      </h3>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Family history of recurrent pneumonia"
                            checked={formData.medicalConditions.includes('Family history of recurrent pneumonia')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Family history of recurrent pneumonia</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Chronic respiratory conditions in family"
                            checked={formData.medicalConditions.includes('Chronic respiratory conditions in family')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Chronic respiratory conditions in family</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Age over 65 or under 2"
                            checked={formData.medicalConditions.includes('Age over 65 or under 2')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Age over 65 or under 2</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Allergies & Medications */}
              <div className="form-section">
                <h2 className="section-title">Allergies & Medications</h2>
                <div className="form-content">
                  <div className="form-group">
                    <label htmlFor="allergiesMedications">List any allergies or current medications</label>
                    <textarea
                      id="allergiesMedications"
                      name="allergiesMedications"
                      value={formData.allergiesMedications}
                      onChange={handleInputChange}
                      placeholder="e.g., Penicillin allergy, currently taking aspirin..."
                      rows="5"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Medical Imaging */}
              <div className="form-section">
                <h2 className="section-title">Upload Medical Imaging</h2>
                <div className="form-content">
                  <div className="form-group">
                    <label htmlFor="xray">Upload Chest X-ray <span className="required">*</span></label>
                    <p className="field-description" style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                      📋 Please upload a clear chest X-ray image only (JPEG, JPG, or PNG format, max 10MB)
                    </p>
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        id="xray"
                        name="xray"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        required
                        disabled={isValidatingFile}
                      />
                      <button 
                        type="button" 
                        className="file-upload-button"
                        onClick={handleFileInputClick}
                        disabled={isValidatingFile}
                      >
                        {isValidatingFile ? (
                          <>
                            <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                              <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round" />
                            </svg>
                            Validating X-ray...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {formData.xrayFile ? formData.xrayFile.name : 'Choose X-Ray File'}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Validation Error Message */}
                    {fileValidationError && (
                      <div className="validation-error" style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        color: '#c33',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{fileValidationError}</span>
                      </div>
                    )}
                    
                    {/* Success Message and Preview */}
                    {formData.xrayFile && !fileValidationError && filePreview && (
                      <div className="validation-success" style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#e8f5e9',
                        border: '1px solid #a5d6a7',
                        borderRadius: '8px',
                        color: '#2e7d32',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>✓ Valid chest X-ray detected - File uploaded successfully</span>
                      </div>
                    )}
                    
                    {/* Image Preview */}
                    {filePreview && formData.xrayFile && (
                      <div className="image-preview" style={{
                        marginTop: '15px',
                        padding: '15px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <p style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '500', color: '#333' }}>Preview:</p>
                        <img 
                          src={filePreview} 
                          alt="X-ray preview" 
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '4px',
                            border: '2px solid #38B2AC',
                            display: 'block',
                            margin: '0 auto'
                          }}
                        />
                        
                        {/* Info text */}
                        <p style={{
                          marginTop: '15px',
                          fontSize: '14px',
                          color: '#4a5568',
                          textAlign: 'center',
                          padding: '10px',
                          backgroundColor: '#e6fffa',
                          borderRadius: '6px',
                          border: '1px solid #81e6d9'
                        }}>
                          ℹ️ Click "Upload and Analyze" below to start AI disease detection with preprocessing
                        </p>
                      </div>
                    )}


                    {/* Professional Medical Report — inline below the form */}
                    {analysisResult && (
                      <div style={{ marginTop: '30px' }}>
                        <div id="medical-report">
                          <MedicalReport
                            reportData={{
                              date: Date.now(),
                              patient: {
                                name: (() => {
                                  const patientData = JSON.parse(localStorage.getItem('patientData') || '{}');
                                  return patientData.fullName || patientData.name || patientData.username || 'Not Available';
                                })(),
                                email: (() => {
                                  const patientData = JSON.parse(localStorage.getItem('patientData') || '{}');
                                  return patientData.email || '';
                                })(),
                                age: formData.age,
                                gender: formData.gender,
                                smokingStatus: formData.smokingStatus,
                                hasCough: formData.hasCough,
                                coughDuration: formData.coughDuration,
                                coughType: formData.coughType
                              },
                              medicalInfo: {
                                symptoms: formData.symptoms.join(', ') || 'None reported',
                                medicalHistory: formData.medicalConditions.join(', ') || 'None' + (formData.allergiesMedications ? '; ' + formData.allergiesMedications : '')
                              },
                              analysis: {
                                prediction: analysisResult.prediction,
                                confidence: analysisResult.confidence,
                                severity: analysisResult.confidence > 0.8 ? 'Severe' : analysisResult.confidence > 0.5 ? 'Moderate' : 'Mild',
                                heatmapExplanation: analysisResult.explanation?.medical_context || '',
                                heatmap: analysisResult.heatmap || null
                              },
                              images: {
                                original: filePreview,
                                heatmap: analysisResult.heatmap || null
                              }
                            }}
                            reportId={reportId}
                            filePreview={filePreview}
                          />
                        </div>

                        {/* Report Action Buttons - Not included in PDF */}
                        <div className="report-action-buttons-no-print" style={{
                          display: 'flex',
                          gap: '20px',
                          justifyContent: 'center',
                          paddingTop: '30px',
                          marginTop: '30px',
                          borderTop: '1px solid #e2e8f0'
                        }}>
                          <button
                            onClick={downloadPDF}
                            className="report-btn download-btn"
                            style={{
                              padding: '14px 32px',
                              backgroundColor: '#38B2AC',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(56,178,172,0.2)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#2c9a8e';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(56,178,172,0.3)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#38B2AC';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(56,178,172,0.2)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF Report
                          </button>
                          <button
                            onClick={fetchDoctors}
                            className="report-btn send-btn"
                            style={{
                              padding: '14px 32px',
                              backgroundColor: '#1F7A6E',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(31,122,110,0.2)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap',
                              minWidth: 'fit-content'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#17655C';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(31,122,110,0.3)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#1F7A6E';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(31,122,110,0.2)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            Send to Doctor
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctor Selection Modal */}
              {showDoctorModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }} onClick={() => { setShowDoctorModal(false); setDoctorSearch(''); }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '30px',
                    maxWidth: '600px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                  }} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#1a202c',
                      marginBottom: '20px',
                      textAlign: 'center'
                    }}>Select Doctor to Send Report</h3>
                    
                    {/* Search Input */}
                    <div style={{ marginBottom: '20px' }}>
                      <input
                        type="text"
                        placeholder="Search doctor by name..."
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.3s',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#38B2AC'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                      {doctors
                        .filter(doctor => 
                          doctor.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) ||
                          (doctor.specialization && doctor.specialization.toLowerCase().includes(doctorSearch.toLowerCase())) ||
                          doctor.pmdcNumber.toLowerCase().includes(doctorSearch.toLowerCase())
                        )
                        .length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#718096'
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#cbd5e0' }}>
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No doctors found</p>
                            <p style={{ fontSize: '14px' }}>Try adjusting your search terms</p>
                          </div>
                        ) : (
                          doctors
                            .filter(doctor => 
                              doctor.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) ||
                              (doctor.specialization && doctor.specialization.toLowerCase().includes(doctorSearch.toLowerCase())) ||
                              doctor.pmdcNumber.toLowerCase().includes(doctorSearch.toLowerCase())
                            )
                            .map((doctor) => (
                        <div
                          key={doctor.id}
                          onClick={() => setSelectedDoctor(doctor)}
                          style={{
                            padding: '15px',
                            marginBottom: '10px',
                            border: selectedDoctor?.id === doctor.id ? '2px solid #38B2AC' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedDoctor?.id === doctor.id ? '#f0fdfa' : 'white',
                            transition: 'all 0.3s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{
                              width: 52, height: 52, borderRadius: '50%',
                              background: '#e0f2f1', flexShrink: 0,
                              overflow: 'hidden', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              border: '2px solid #38B2AC'
                            }}>
                              {doctor.profilePhoto ? (
                                <img src={doctor.profilePhoto} alt={doctor.fullName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38B2AC" strokeWidth="2">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                  <circle cx="12" cy="7" r="4"/>
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                                Dr. {doctor.fullName}
                              </h4>
                              {doctor.education && (
                                <p style={{ fontSize: '12px', color: '#718096', margin: '2px 0' }}>
                                  {doctor.education}
                                </p>
                              )}
                            </div>
                            {selectedDoctor?.id === doctor.id && (
                              <span style={{ color: '#38B2AC', fontSize: '18px', flexShrink: 0 }}>✓</span>
                            )}
                          </div>
                          {doctor.specialization && (
                            <p style={{ fontSize: '13px', color: '#38B2AC', margin: '4px 0', fontWeight: 600 }}>
                              {doctor.specialization}
                            </p>
                          )}
                          {doctor.workplace && (
                            <p style={{ fontSize: '13px', color: '#718096', margin: '3px 0' }}>
                              <strong>Hospital:</strong> {doctor.workplace}
                            </p>
                          )}
                          {doctor.countryOfSpecialization && (
                            <p style={{ fontSize: '13px', color: '#718096', margin: '3px 0' }}>
                              <strong>Trained in:</strong> {doctor.countryOfSpecialization}
                            </p>
                          )}
                          {doctor.experience && (
                            <p style={{ fontSize: '13px', color: '#718096', margin: '3px 0' }}>
                              <strong>Experience:</strong> {doctor.experience}
                            </p>
                          )}
                          <p style={{ fontSize: '13px', color: '#718096', margin: '3px 0' }}>
                            <strong>PMDC:</strong> {doctor.pmdcNumber}
                          </p>
                        </div>
                      )))
                      }
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => { setShowDoctorModal(false); setDoctorSearch(''); }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#e2e8f0',
                          color: '#4a5568',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendReportToDoctor}
                        disabled={!selectedDoctor || isSending}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: selectedDoctor ? '#38B2AC' : '#cbd5e0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: selectedDoctor ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {isSending ? 'Sending...' : 'Send Report'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button - Hidden when report is generated */}
              {!analysisResult && (
                <div className="form-actions">
                  <button type="submit" className="submit-btn" disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round" />
                        </svg>
                        Analyzing X-ray...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload and Analyze
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
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

          {/* Success Popup */}
          {showSuccessPopup && (
            <div className="success-popup">
              <div className="success-popup-content">
                <div className="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="success-text">{successMessage}</p>
              </div>
            </div>
          )}
        </div>
    </PatientLayout>
  );
};

export default PatientProfile;
