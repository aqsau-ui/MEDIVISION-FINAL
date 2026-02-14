import React, { useState } from 'react';
import PatientLayout from '../components/PatientLayout';
import './PatientProfile.css';

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
          '⚠️ This is not a valid chest X-ray. Please upload only chest X-ray images.'
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
      // Convert file to base64
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call backend validation API
      const response = await fetch('http://localhost:5000/api/xray/validate-xray', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Image
        })
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
      // Fallback to client-side validation if backend fails
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

  const handleGotIt = () => {
    setShowUploadTip(false);
    document.getElementById('xray').click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get user info from localStorage
    const patientDataStr = localStorage.getItem('patientData');
    
    if (!patientDataStr || patientDataStr === 'undefined') {
      alert('Please login to submit your profile');
      return;
    }

    try {
      const patientData = JSON.parse(patientDataStr);
      const userEmail = patientData.email;
      const userName = patientData.name || patientData.username || 'Patient';

      if (!formData.xrayFile) {
        alert('Please upload a chest X-ray image');
        return;
      }

      // Create FormData to send file
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

      const response = await fetch('http://localhost:5000/api/patient/submit-profile', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        setShowSuccessPopup(true);
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting profile. Please try again.');
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
                <p className="section-subtitle">Highly relevant to both pneumonia & TB risk</p>
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
                            value="Previous Tuberculosis"
                            checked={formData.medicalConditions.includes('Previous Tuberculosis')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Previous Tuberculosis</span>
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

                    {/* Genetic Risk - TB */}
                    <div className="medical-card genetic-card">
                      <h3 className="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M2 12h20" />
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                        Genetic Risk - Tuberculosis
                      </h3>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Family history of TB"
                            checked={formData.medicalConditions.includes('Family history of TB')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Family history of TB</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Close contact with TB patient"
                            checked={formData.medicalConditions.includes('Close contact with TB patient')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Close contact with TB patient</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value="Living in high TB burden area"
                            checked={formData.medicalConditions.includes('Living in high TB burden area')}
                            onChange={(e) => handleCheckboxChange(e, 'medicalConditions')}
                          />
                          <span>Living in high TB burden area</span>
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
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload and Analyze
                </button>
              </div>
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
