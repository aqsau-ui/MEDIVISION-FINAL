import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DoctorProfile.css';

const DoctorProfile = () => {
  const [doctorData, setDoctorData] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  const doctorId = localStorage.getItem('userId');

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/api/doctors/profile/${doctorId}`);
      
      if (response.data.success) {
        setDoctorData(response.data.doctor);
        if (response.data.doctor.doctor_signature_path) {
          setSignaturePreview(`http://localhost:5000${response.data.doctor.doctor_signature_path}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ text: 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ text: 'Invalid file type. Please upload PNG or JPG.', type: 'error' });
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({ text: 'File too large. Maximum size is 2MB.', type: 'error' });
      return;
    }

    setSignatureFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignaturePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setMessage({ text: '', type: '' });
  };

  const handleUpload = async () => {
    if (!signatureFile) {
      setMessage({ text: 'Please select a signature image first', type: 'error' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ text: '', type: '' });

      const formData = new FormData();
      formData.append('file', signatureFile);

      const response = await axios.post(
        `http://localhost:8000/api/doctors/upload-signature?doctor_id=${doctorId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setMessage({ text: 'Signature uploaded successfully!', type: 'success' });
        setSignatureFile(null);
        // Refresh profile
        await fetchDoctorProfile();
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      setMessage({ 
        text: error.response?.data?.detail || 'Failed to upload signature', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your signature?')) {
      return;
    }

    try {
      setUploading(true);
      const response = await axios.delete(
        `http://localhost:8000/api/doctors/signature/${doctorId}`
      );

      if (response.data.success) {
        setMessage({ text: 'Signature deleted successfully', type: 'success' });
        setSignaturePreview(null);
        setSignatureFile(null);
        await fetchDoctorProfile();
      }
    } catch (error) {
      console.error('Error deleting signature:', error);
      setMessage({ 
        text: error.response?.data?.detail || 'Failed to delete signature', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="doctor-profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="doctor-profile-container">
      <div className="profile-header">
        <h1>Doctor Profile & Settings</h1>
        <p className="subtitle">Manage your digital signature for prescription verification</p>
      </div>

      {/* Doctor Information */}
      {doctorData && (
        <div className="profile-info-card">
          <h2>Profile Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name:</label>
              <span>{doctorData.full_name}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{doctorData.email}</span>
            </div>
            <div className="info-item">
              <label>PMDC Number:</label>
              <span>{doctorData.pmdc_number}</span>
            </div>
            <div className="info-item">
              <label>Hospital:</label>
              <span>{doctorData.hospital_affiliation || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{doctorData.phone || 'Not specified'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Section */}
      <div className="signature-card">
        <h2>Digital Signature</h2>
        <p className="signature-description">
          Your digital signature will be automatically attached to all prescriptions and verified reports you issue.
          This ensures authenticity and provides legal verification.
        </p>

        {/* Current Signature */}
        {doctorData?.doctor_signature_path && !signatureFile && (
          <div className="current-signature">
            <h3>Current Signature</h3>
            <div className="signature-preview-container">
              <img 
                src={signaturePreview} 
                alt="Current signature" 
                className="signature-image"
              />
            </div>
            <button 
              onClick={handleDelete} 
              className="btn-delete"
              disabled={uploading}
            >
              {uploading ? 'Deleting...' : 'Delete Signature'}
            </button>
          </div>
        )}

        {/* Upload New Signature */}
        <div className="upload-section">
          <h3>{doctorData?.doctor_signature_path ? 'Update Signature' : 'Upload Signature'}</h3>
          
          <div className="upload-instructions">
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>File format: PNG or JPG</li>
              <li>Maximum size: 2MB</li>
              <li>Recommended: Clear signature on white/transparent background</li>
              <li>Optimal dimensions: 300x100 pixels or similar aspect ratio</li>
            </ul>
          </div>

          <div className="file-input-wrapper">
            <input
              type="file"
              id="signature-upload"
              accept=".png,.jpg,.jpeg"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <label htmlFor="signature-upload" className="file-input-label">
              {signatureFile ? signatureFile.name : 'Choose signature image'}
            </label>
          </div>

          {/* Preview */}
          {signaturePreview && signatureFile && (
            <div className="signature-preview-container">
              <h4>Preview:</h4>
              <img 
                src={signaturePreview} 
                alt="Signature preview" 
                className="signature-image preview"
              />
            </div>
          )}

          {/* Upload Button */}
          {signatureFile && (
            <button 
              onClick={handleUpload} 
              className="btn-upload"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Signature'}
            </button>
          )}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Usage Information */}
      <div className="usage-info-card">
        <h2>How It Works</h2>
        <div className="usage-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Upload Your Signature</h3>
              <p>Upload a clear image of your signature (digital or scanned).</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Review & Submit Prescriptions</h3>
              <p>When you verify a patient's report, your signature is automatically attached.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Verified Medical Report</h3>
              <p>Patients receive a professionally verified report with your signature and unique verification ID.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
