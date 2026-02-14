const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDB } = require('../config/mongodb');
const { spawn } = require('child_process');
const path = require('path');

// Configure multer for memory storage (we'll store base64 in MongoDB)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed.'));
    }
  }
});

// Validate chest X-ray using Python script
const validateXrayImage = async (imageBase64) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../services/xrayValidator.py');
    const pythonProcess = spawn('python', [pythonScript, imageBase64]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorData || 'Validation failed'));
      } else {
        try {
          const result = JSON.parse(resultData);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse validation result'));
        }
      }
    });
  });
};

// Submit patient profile with X-ray
router.post('/submit-profile', upload.single('xrayFile'), async (req, res) => {
  try {
    const {
      email,
      userName,
      age,
      gender,
      smokingStatus,
      hasCough,
      coughDuration,
      coughType,
      symptoms,
      medicalConditions,
      allergiesMedications
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'X-ray image is required'
      });
    }

    // Convert image to base64
    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Validate X-ray
    console.log('Validating X-ray image...');
    const validationResult = await validateXrayImage(imageBase64);

    if (!validationResult.isChestXray) {
      return res.status(400).json({
        success: false,
        message: 'This is not a valid chest X-ray. Please upload only chest X-ray images.',
        validationDetails: validationResult
      });
    }

    // Prepare patient profile data
    const patientProfile = {
      email,
      userName,
      personalInfo: {
        age: parseInt(age),
        gender,
        smokingStatus
      },
      coughAssessment: {
        hasCough: hasCough === 'yes',
        coughDuration: hasCough === 'yes' ? coughDuration : null,
        coughType: hasCough === 'yes' ? coughType : null
      },
      symptoms: Array.isArray(symptoms) ? symptoms : (symptoms ? symptoms.split(',') : []),
      medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : (medicalConditions ? medicalConditions.split(',') : []),
      allergiesMedications,
      xrayData: {
        image: imageBase64,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadDate: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to MongoDB
    const db = getDB();
    const result = await db.collection('patient_profiles').insertOne(patientProfile);

    res.json({
      success: true,
      message: 'Profile added to MongoDB successfully!',
      profileId: result.insertedId,
      addedAt: new Date().toLocaleString()
    });

  } catch (error) {
    console.error('Error submitting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting patient profile',
      error: error.message
    });
  }
});

// Get patient profile by email
router.get('/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const db = getDB();
    const profile = await db.collection('patient_profiles').findOne(
      { email },
      { sort: { createdAt: -1 } } // Get most recent profile
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient profile',
      error: error.message
    });
  }
});

// Get all profiles for a user (history)
router.get('/profiles/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const db = getDB();
    const profiles = await db.collection('patient_profiles')
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: profiles.length,
      profiles
    });

  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient profiles',
      error: error.message
    });
  }
});

// Admin endpoint: View all patient profiles (for testing/debugging)
router.get('/all-profiles', async (req, res) => {
  try {
    const db = getDB();
    const profiles = await db.collection('patient_profiles')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Format for easier viewing
    const formattedProfiles = profiles.map(profile => ({
      _id: profile._id,
      email: profile.email,
      userName: profile.userName,
      age: profile.personalInfo?.age,
      gender: profile.personalInfo?.gender,
      uploadDate: profile.createdAt,
      xrayConfidence: profile.xrayData?.validationResult?.confidence + '%',
      hasCough: profile.coughAssessment?.hasCough ? 'Yes' : 'No',
      symptomsCount: profile.symptoms?.length || 0,
      conditionsCount: profile.medicalConditions?.length || 0
    }));

    // Create HTML view
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MongoDB Patient Profiles - MEDIVISION</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #38B2AC; }
    .stats { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th { background: #38B2AC; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f9f9f9; }
    .btn { background: #38B2AC; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
    .btn:hover { background: #2C7A7B; }
    .json-view { background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px; display: none; max-height: 400px; overflow: auto; }
    pre { margin: 0; }
  </style>
</head>
<body>
  <h1>📊 MongoDB Patient Profiles</h1>
  
  <div class="stats">
    <h3>Database Statistics</h3>
    <p><strong>Database:</strong> medivision_profiles</p>
    <p><strong>Collection:</strong> patient_profiles</p>
    <p><strong>Total Profiles:</strong> ${profiles.length}</p>
    <p><strong>Connection:</strong> mongodb://127.0.0.1:27017</p>
  </div>

  <a href="/api/patient/all-profiles?format=json" class="btn">📄 View as JSON</a>
  <button class="btn" onclick="location.reload()">🔄 Refresh</button>

  <h2>Patient Profiles</h2>
  ${profiles.length === 0 ? '<p>No profiles found. Upload your first X-ray to see data here!</p>' : `
  <table>
    <thead>
      <tr>
        <th>Email</th>
        <th>Name</th>
        <th>Age</th>
        <th>Gender</th>
        <th>X-ray Confidence</th>
        <th>Has Cough</th>
        <th>Upload Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${formattedProfiles.map((p, i) => `
        <tr>
          <td>${p.email}</td>
          <td>${p.userName}</td>
          <td>${p.age}</td>
          <td>${p.gender}</td>
          <td><strong>${p.xrayConfidence}</strong></td>
          <td>${p.hasCough}</td>
          <td>${new Date(p.uploadDate).toLocaleString()}</td>
          <td>
            <button class="btn" onclick="toggleJson(${i})">View Full Data</button>
          </td>
        </tr>
        <tr>
          <td colspan="8">
            <div id="json-${i}" class="json-view">
              <pre>${JSON.stringify(profiles[i], null, 2)}</pre>
            </div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `}

  <script>
    function toggleJson(index) {
      const el = document.getElementById('json-' + index);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</body>
</html>
    `;

    if (req.query.format === 'json') {
      res.json({
        success: true,
        count: profiles.length,
        profiles
      });
    } else {
      res.send(html);
    }

  } catch (error) {
    console.error('Error fetching all profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles',
      error: error.message
    });
  }
});

module.exports = router;
