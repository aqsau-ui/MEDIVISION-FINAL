const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Validate chest X-ray image
router.post('/validate-xray', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    // Call Python script for validation
    const pythonScript = path.join(__dirname, '../services/xrayValidator.py');
    const pythonProcess = spawn('python', [pythonScript, imageData]);

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
        console.error('Python script error:', errorData);
        return res.status(500).json({
          success: false,
          message: 'Error validating image',
          error: errorData
        });
      }

      try {
        const result = JSON.parse(resultData);
        res.json({
          success: true,
          ...result
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        res.status(500).json({
          success: false,
          message: 'Error processing validation result'
        });
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during validation',
      error: error.message
    });
  }
});

module.exports = router;
