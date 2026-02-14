import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../components/DoctorLayout';
import './DoctorProfileSettings.css';

function DoctorProfileSettings() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [formData, setFormData] = useState({
    education: '',
    specialization: '',
    profilePicture: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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
          profilePicture: null
        });
        if (parsed.profilePicture) {
          setPreviewImage(parsed.profilePicture);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update doctor data in localStorage
    const updatedDoctor = {
      ...doctor,
      education: formData.education,
      specialization: formData.specialization,
      profilePicture: previewImage
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
