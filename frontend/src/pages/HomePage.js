import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import './HomePage.css';

const HomePage = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="homepage">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <Logo size="medium" />
          </div>
          <div className="nav-links">
            <button 
              className="nav-link"
              onClick={() => scrollToSection('offerings')}
            >
              Offerings
            </button>
            <button 
              className="nav-link"
              onClick={() => scrollToSection('how-it-works')}
            >
              Flow
            </button>
            <button 
              className="nav-link"
              onClick={() => scrollToSection('about-us')}
            >
              About Us
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title">Welcome to MEDIVISION</h1>
          <p className="hero-subtitle">AI-Powered Diagnosis for Better Health</p>
          <p className="hero-description">Fast, Accurate Chest X-ray Analysis for Pneumonia & TB</p>
          
          <div className="hero-buttons">
            <Link to="/patient-login" className="btn btn-primary">
              Patient Login
            </Link>
            <Link to="/doctor-login" className="btn btn-secondary">
              Doctor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="offerings" className="features">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <h3>Accurate AI Detection of Pneumonia & TB</h3>
            <p>Advanced AI algorithms analyze chest X-rays with high precision to detect pneumonia and tuberculosis with detailed heatmaps showing affected areas.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
                <circle cx="12" cy="8" r="4" />
                <path d="M8 21v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
            <h3>Doctor Reviews & Gives Treatment Advice</h3>
            <p>Licensed doctors review AI findings and provide personalized treatment recommendations and medical advice for your specific condition.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <circle cx="9" cy="9" r="1" />
                <circle cx="15" cy="9" r="1" />
              </svg>
            </div>
            <h3>Talking Doctor Avatar Explains Results</h3>
            <p>Interactive AI doctor avatar explains your results in simple English, answers your questions, and helps you understand your health condition.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                <circle cx="12" cy="8" r="2" />
              </svg>
            </div>
            <h3>Tracks Your Progress When You Upload Again</h3>
            <p>Monitor your health journey over time as we compare new X-rays with previous ones to track healing progress and treatment effectiveness.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="works-container">
          <h2>How It Works</h2>
          <p className="works-subtitle">Our streamlined process ensures fast, accurate diagnosis in just four simple steps</p>
          
          <div className="process-steps">
            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                  <circle cx="12" cy="8" r="2" />
                </svg>
              </div>
              <h3>Upload X-Ray & Fill Profile</h3>
              <p>Upload your chest X-ray image and complete your health profile with symptoms and medical history.</p>
            </div>

            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
                </svg>
              </div>
              <h3>AI Detects Disease + Shows Heatmap</h3>
              <p>Our AI analyzes your X-ray and highlights problem areas with colored heatmaps showing potential pneumonia or TB.</p>
            </div>

            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <path d="M20 6L9 17l-5-5" />
                  <circle cx="16" cy="16" r="2" />
                </svg>
              </div>
              <h3>Doctor Checks & Adds Treatment</h3>
              <p>A licensed doctor reviews the AI findings and provides personalized treatment recommendations and next steps.</p>
            </div>

            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  <circle cx="9" cy="9" r="1" />
                  <circle cx="15" cy="9" r="1" />
                  <path d="M8 13h8" />
                </svg>
              </div>
              <h3>Dr Avatar Explains Everything + Ask Questions</h3>
              <p>Our talking doctor avatar explains your results in simple terms and answers any questions you have about your health.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="about-us">
        <div className="about-container">
          <div className="about-content">
            <h2>Our Mission</h2>
            <p>
              MEDIVISION aims to democratize access to high-quality medical diagnosis by leveraging artificial intelligence. 
              Our platform assists healthcare providers in making faster, more accurate diagnoses of respiratory conditions, 
              ultimately improving patient care and saving lives. Through continuous innovation and research, we're committed 
              to advancing medical imaging analysis and making healthcare more accessible to everyone.
            </p>
            
            <h2 className="founders-heading">Meet Our Founders</h2>
            <div className="founders-container">
              <div className="founder-card">
                <div className="founder-image">
                  <img src="/images/aqsa-imtiaz.jpg" alt="Aqsa Imtiaz" />
                </div>
                <h3>Aqsa Imtiaz</h3>
                <p className="founder-title">Co-Founder</p>
              </div>
              
              <div className="founder-card">
                <div className="founder-image">
                  <img src="/images/qanitah-khan.jpg" alt="Qanitah Khan" />
                </div>
                <h3>Qanitah Khan</h3>
                <p className="founder-title">Co-Founder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <h3>MEDIVISION</h3>
            <p>AI-Powered Medical Diagnosis Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;