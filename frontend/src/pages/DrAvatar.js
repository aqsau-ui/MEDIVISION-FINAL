import React, { useState, useEffect, useRef } from 'react';
import PatientLayout from '../components/PatientLayout';
import './DrAvatar.css';

const DrAvatar = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm Dr. Jarvis, your AI health assistant.\n\nI can help you with:\n\n• Understanding TB and Pneumonia\n• Explaining your X-ray or medical reports in simple words\n• Answering questions about symptoms and treatment\n• Breaking down AI findings from your chest X-rays\n\nImportant Reminder: I'm an AI assistant, not a real doctor. For any health concerns, always visit a real doctor or hospital for proper care.\n\nWhat would you like to know today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [uploadedReport, setUploadedReport] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    // Check browser compatibility
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      setVoiceEnabled(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      setVoiceEnabled(false);
      return;
    }

    // Load voices (some browsers need this)
    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.addEventListener('voiceschanged', () => {
        console.log('Voices loaded:', synthRef.current.getVoices().length);
      });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Text-to-speech function
  const speakText = (text) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 1;

    // Select a female voice if available
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('susan') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('karen')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  // Start voice input
  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please try Chrome or Edge.');
      return;
    }
    if (!isListening) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  // Stop voice input
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const sessionId = userData.id || 'anonymous-' + Date.now();
      const patientEmail = userData.email || null;
      
      console.log('Sending message:', inputMessage);
      console.log('Session ID:', sessionId);
      console.log('Patient Email:', patientEmail);
      
      // Send message to backend with patient email for location queries
      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId,
          patientEmail: patientEmail
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);

      const botResponse = {
        id: messages.length + 2,
        text: data.message,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      
      // Speak the response
      if (voiceEnabled) {
        setTimeout(() => speakText(data.message), 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error stack:', error.stack);
      const errorResponse = {
        id: messages.length + 2,
        text: `Error: ${error.message}. Please check the console for details or try refreshing the page.`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      const errorMessage = {
        id: messages.length + 1,
        text: "Please upload a valid medical report (JPG, PNG, or PDF only).",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([...messages, errorMessage]);
      return;
    }

    const fileMessage = {
      id: messages.length + 1,
      text: `📄 Uploading: ${file.name}...`,
      sender: 'user',
      timestamp: new Date(),
      isFile: true
    };
    setMessages([...messages, fileMessage]);
    setIsTyping(true);

    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const sessionId = userData.id || 'anonymous-' + Date.now();
      const patientEmail = userData.email || null;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);
      formData.append('patient_email', patientEmail || '');

      const response = await fetch('http://localhost:5000/api/medical-reports/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();

      // Store the report information
      setUploadedReport({
        reportId: data.report_id,
        fileName: file.name,
        testType: data.test_type || 'Medical Report',
        extractedText: data.extracted_text || '',
        timestamp: new Date()
      });

      const botResponse = {
        id: messages.length + 2,
        text: `✅ I've received and analyzed your ${data.test_type || 'medical report'}!\n\n📋 **What I can help you with:**\n• Explain the report findings in simple language\n• Clarify medical terms\n• Answer questions about the results\n• Provide general health information\n\n💬 **Try asking:**\n• "What does this report mean?"\n• "Is this serious?"\n• "What should I do next?"\n• "What are the findings?"\n\n⚠️ **Important:** This is for information only. Always consult your doctor for medical advice.\n\nWhat would you like to know?`,
        sender: 'bot',
        timestamp: new Date(),
        hasQuestions: true
      };
      setMessages(prev => [...prev, botResponse]);
      setShowQuestions(true);
      
      // Speak the response
      if (voiceEnabled) {
        setTimeout(() => speakText("I've received and analyzed your medical report. What would you like to know about it?"), 500);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorResponse = {
        id: messages.length + 2,
        text: `❌ Upload failed: ${error.message}. Please ensure the file is clear and readable.`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = async (question) => {
    // Add user question
    const userMessage = {
      id: messages.length + 1,
      text: question,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setShowQuestions(false);

    try {
      // Send question with report context
      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          reportContext: uploadedReport?.analysis || ''
        }),
      });

      const data = await response.json();

      const botResponse = {
        id: messages.length + 2,
        text: data.message,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      
      // Speak the response
      if (voiceEnabled) {
        setTimeout(() => speakText(data.message), 500);
      }

      // Show questions again
      setTimeout(() => setShowQuestions(true), 1000);
    } catch (error) {
      console.error('Error:', error);
      const errorResponse = {
        id: messages.length + 2,
        text: "I'm having trouble answering right now. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PatientLayout>
      <div className="dr-avatar-page-content">
          <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-content">
                <h1 className="chat-title">Dr. Jarvis - Medical AI Assistant</h1>
                <p className="chat-subtitle">Your AI Health Assistant • Available 24/7</p>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.sender === 'bot' ? 'bot-message' : 'user-message'}`}
                >
                  <div className="message-content">
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message bot-message">
                  <div className="message-content typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              {/* Quick Question Options */}
              {showQuestions && uploadedReport && (
                <div className="quick-questions">
                  <p className="questions-title">Quick Questions:</p>
                  <div className="question-buttons">
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("What does this report mean?")}
                    >
                      What does this report mean?
                    </button>
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("Explain the AI findings in simple words")}
                    >
                      Explain the AI findings
                    </button>
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("What are these symptoms?")}
                    >
                      What are these symptoms?
                    </button>
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("What should I ask my doctor?")}
                    >
                      What should I ask my doctor?
                    </button>
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("What treatment options are available?")}
                    >
                      Treatment options
                    </button>
                    <button 
                      className="question-btn"
                      onClick={() => handleQuestionClick("Is this serious?")}
                    >
                      Is this serious?
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="chat-input-container">
              <div className="chat-input-info">
                <span>Ask about TB/Pneumonia diagnosis, symptoms, or upload medical reports</span>
              </div>
              
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.dcm"
                />
                
                <button
                  type="button"
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about your report, symptoms, or treatment..."
                  className="message-input"
                />
                
                {/* Voice Control Buttons */}
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" opacity="0.2" />
                      <rect x="9" y="9" width="6" height="6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
                
                <button
                  type="button"
                  className={`voice-btn ${voiceEnabled ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    }
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  title={voiceEnabled ? "Voice output enabled" : "Voice output disabled"}
                >
                  {isSpeaking ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  ) : voiceEnabled ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  )}
                </button>
                
                <button type="submit" className="send-btn" disabled={inputMessage.trim() === ''}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>

          {/* Doctor Avatar Image */}
          <div className="floating-doctor">
            <div className={`doctor-avatar-container ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
              <img src="/images/doctoravatar.png" alt="Dr. Jarvis" />
              {isListening && <div className="listening-indicator">Listening...</div>}
              {isSpeaking && <div className="speaking-indicator">Speaking...</div>}
            </div>
            <div className="avatar-message">
              {isListening ? "Listening..." : isSpeaking ? "Dr. Jarvis is speaking..." : "Type or speak to Dr. Jarvis"}
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default DrAvatar;
