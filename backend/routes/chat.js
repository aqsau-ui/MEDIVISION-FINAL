const express = require('express');
const router = express.Router();
const multer = require('multer');
const ragService = require('../services/llm/ragService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit — allows large MEDIVISION PDF reports
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  }
});

// Store conversation history (in production, use a database)
const conversationStore = new Map();

// Initialize RAG service
ragService.initialize().catch(console.error);

/**
 * POST /api/chat/message
 * Send a message to the chatbot
 */
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, reportContext } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get or create conversation history
    const conversationHistory = conversationStore.get(sessionId) || [];

    // Build enhanced message with report context injected directly
    let enhancedMessage = message;
    if (reportContext && reportContext.trim().length > 20) {
      enhancedMessage = `The patient has shared their medical report. Here is the report content:\n\n"""\n${reportContext.slice(0, 3000)}\n"""\n\nBased on this report, answer the following question:\n${message}`;
    }

    // Process query with RAG
    const response = await ragService.processQuery(enhancedMessage, conversationHistory);

    if (response.success) {
      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response.message }
      );

      // Keep only last 10 messages to manage context size
      if (conversationHistory.length > 10) {
        conversationHistory.splice(0, conversationHistory.length - 10);
      }

      conversationStore.set(sessionId, conversationHistory);

      return res.json({
        success: true,
        message: response.message,
        sessionId: sessionId
      });
    } else {
      // Use fallback response
      const fallbackMessage = ragService.getFallbackResponse(message);
      return res.json({
        success: true,
        message: fallbackMessage,
        sessionId: sessionId,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: ragService.getFallbackResponse('')
    });
  }
});

/**
 * POST /api/chat/upload
 * Upload and analyze medical report
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { sessionId } = req.body;

    // Analyze the report
    const analysis = await ragService.analyzeReport(
      req.file.buffer,
      req.file.mimetype
    );

    const extractedText = analysis.extractedText || '';

    if (analysis.success) {
      // Store extracted text in conversation history so future questions have context
      const conversationHistory = conversationStore.get(sessionId) || [];
      conversationHistory.push(
        {
          role: 'user',
          content: extractedText
            ? `[Uploaded medical report: ${req.file.originalname}]\n\nReport content:\n${extractedText.slice(0, 3000)}`
            : `[Uploaded medical report: ${req.file.originalname}]`
        },
        { role: 'assistant', content: analysis.message }
      );
      conversationStore.set(sessionId, conversationHistory);
    }

    res.json({
      success: true,
      message: analysis.message,
      extractedText: extractedText,   // ← returned to frontend for follow-up Q context
      fileName: req.file.originalname,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze report'
    });
  }
});

/**
 * POST /api/chat/clear
 * Clear conversation history
 */
router.post('/clear', (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId && conversationStore.has(sessionId)) {
      conversationStore.delete(sessionId);
    }

    res.json({
      success: true,
      message: 'Conversation cleared'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation'
    });
  }
});

/**
 * GET /api/chat/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Dr. Jarvis Chatbot',
    status: 'operational',
    capabilities: [
      'TB diagnosis information',
      'Pneumonia diagnosis information',
      'Symptom analysis',
      'Treatment recommendations',
      'X-ray interpretation guidance',
      'Medical report upload'
    ]
  });
});

module.exports = router;
