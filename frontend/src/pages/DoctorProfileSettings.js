import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../components/DoctorLayout';
import SignatureCanvas from 'react-signature-canvas';
import './DoctorProfileSettings.css';

function DoctorProfileSettings() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [formData, setFormData] = useState({
    education: '',
    specialization: '',
    profilePicture: null,
    signatureFile: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureMode, setSignatureMode] = useState('upload'); // 'upload' or 'draw'
  const [successMessage, setSuccessMessage] = useState('');
  const signaturePadRef = useRef(null);

  useEffect(() => {
    const doctorData = localStorage.getItem('doctorData');
    if (!doctorData || doctorData === 'undefined') {
      navigate('/doctor-login');
    } else {
      try {
        const parsed = JSON.parse(doctorData);
        setDoctor(parsed);
        setFormData({
          education: parsed.education || '',
          specialization: parsed.specialization || '',
          profilePicture: null,
          signatureFile: null
        });
        if (parsed.profilePicture) {
          setPreviewImage(parsed.profilePicture);
        }
        if (parsed.signature) {
          setSignaturePreview(parsed.signature);
        }
      } catch (e) {
        console.error('Error parsing doctor data:', e);
        navigate('/doctor-login');
      }
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Signature file size should not exceed 2MB');
        return;
      }

      setFormData(prev => ({ ...prev, signatureFile: file }));
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
      setSuccessMessage('Signature captured! Click "Save Profile" to save.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      alert('Please draw your signature first');
    }
  };

  const handleRemoveSignature = () => {
    setSignaturePreview(null);
    setFormData(prev => ({ ...prev, signatureFile: null }));
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update doctor data in localStorage
    const updatedDoctor = {
      ...doctor,
      education: formData.education,
      specialization: formData.specialization,
      profilePicture: previewImage,
      signature: signaturePreview
    };
    
    localStorage.setItem('doctorData', JSON.stringify(updatedDoctor));
    setDoctor(updatedDoctor);
    
    // Show success message
    setSuccessMessage('Profile saved successfully!');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  if (!doctor) {
    return null;
  }

  return (
    <DoctorLayout>
      <div className="profile-settings-container">
        <div className="profile-settings-header">
          <h1 className="profile-title">Profile Settings</h1>
          <p className="profile-subtitle">Update your professional information</p>
        </div>

        {successMessage && (
          <div className="success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {successMessage}
          </div>
        )}

        <div className="profile-form-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="education">Education</label>
              <input
                type="text"
                id="education"
                name="education"
                value={formData.education}
                onChange={handleInputChange}
                placeholder="Enter your education qualifications"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="specialization">Specialization</label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleInputChange}
                placeholder="Enter your medical specialization"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="profilePicture">Profile Picture</label>
              <div className="file-upload-container">
                {previewImage && (
                  <div className="image-preview">
                    <img src={previewImage} alt="Profile Preview" />
                  </div>
                )}
                <label htmlFor="profilePicture" className="file-upload-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {previewImage ? 'Change Picture' : 'Upload Picture'}
                </label>
                <input
                  type="file"
                  id="profilePicture"
                  name="profilePicture"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="file-input"
                />
              </div>
            </div>

            {/* Signature Section */}
            <div className="form-group signature-section">
              <label>Digital Signature</label>
              <p className="signature-info">
                Your signature will appear on all prescriptions you issue
              </p>
              
              <div className="signature-mode-tabs">
                <button
                  type="button"
                  className={`tab-button ${signatureMode === 'upload' ? 'active' : ''}`}
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
                  className={`tab-button ${signatureMode === 'draw' ? 'active' : ''}`}
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
                <div className="signature-upload-container">
                  {signaturePreview && (
                    <div className="signature-preview">
                      <img src={signaturePreview} alt="Signature Preview" />
                      <button 
                        type="button" 
                        className="remove-signature-btn"
                        onClick={handleRemoveSignature}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Remove
                      </button>
                    </div>
                  )}
                  <label htmlFor="signatureFile" className="signature-upload-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {signaturePreview ? 'Change Signature' : 'Upload Signature Image'}
                  </label>
                  <input
                    type="file"
                    id="signatureFile"
                    name="signatureFile"
                    onChange={handleSignatureFileChange}
                    accept="image/*"
                    className="file-input"
                  />
                  <p className="signature-hint">
                    Upload a PNG or JPG image of your signature (max 2MB)
                  </p>
                </div>
              ) : (
                <div className="signature-draw-container">
                  {signaturePreview ? (
                    <div className="signature-preview">
                      <img src={signaturePreview} alt="Signature Preview" />
                      <button 
                        type="button" 
                        className="remove-signature-btn"
                        onClick={handleRemoveSignature}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Remove & Redraw
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="signature-pad-wrapper">
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
                      <div className="signature-controls">
                        <button 
                          type="button" 
                          className="clear-signature-btn"
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
                          className="save-signature-btn"
                          onClick={handleSaveDrawnSignature}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Save Signature
                        </button>
                      </div>
                      <p className="signature-hint">
                        Draw your signature above using mouse or touchscreen
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <button type="submit" className="save-profile-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </DoctorLayout>
  );
}

export default DoctorProfileSettings;
