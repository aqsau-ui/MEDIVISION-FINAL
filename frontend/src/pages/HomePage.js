import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import './HomePage.css';

const TESTIMONIALS = [
  { quote: "MEDIVISION detected early-stage pneumonia in my X-ray that was almost invisible to the naked eye. The heatmap overlay made it crystal clear. Remarkable technology.", name: "Dr. Sarah Ahmed", role: "Pulmonologist, Islamabad" },
  { quote: "As a doctor, having AI pre-screen patient X-rays saves me hours every week. The confidence scores and highlighted regions let me focus exactly where it matters.", name: "Dr. Imran Hassan", role: "Radiologist, Lahore" },
  { quote: "I uploaded my chest X-ray from home and had a full AI report within minutes. The avatar explained my results in plain Urdu. This is the future of healthcare.", name: "Fatima Khan", role: "Patient, Karachi" },
  { quote: "The progress tracking feature showed my TB recovery over three months. Seeing the heatmap shrink was incredibly motivating throughout my treatment.", name: "Usman Malik", role: "Patient, Rawalpindi" },
  { quote: "Integrating MEDIVISION into our clinic workflow reduced diagnostic turnaround time by 60%. Our patients trust the results and our doctors trust the AI.", name: "Dr. Ayesha Siddiqui", role: "Clinical Director, Peshawar" },
  { quote: "The PMDC-verified doctor reviews add a human layer of trust on top of the AI. My patients feel confident that a real physician has reviewed their case.", name: "Dr. Bilal Raza", role: "General Physician, Multan" },
];

const HomePage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const carouselRef = useRef(null);
  const featuresGridRef = useRef(null);
  const intervalRef = useRef(null);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCarouselIdx(i => (i + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Reveal feature cards when the section comes into view
  useEffect(() => {
    if (!featuresGridRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(featuresGridRef.current);
    return () => observer.disconnect();
  }, []);

  // Reveal other static sections on scroll
  useEffect(() => {
    const revealItems = document.querySelectorAll('.hp-sr');
    if (!revealItems.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -10% 0px' }
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const goToSlide = (idx) => {
    clearInterval(intervalRef.current);
    setCarouselIdx(idx);
    intervalRef.current = setInterval(() => {
      setCarouselIdx(i => (i + 1) % TESTIMONIALS.length);
    }, 4500);
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Carousel offset: show 3 at a time on desktop, 1 on mobile
  const slidesPerView = window.innerWidth > 768 ? 3 : 1;
  const maxIdx = Math.max(0, TESTIMONIALS.length - slidesPerView);
  const safeIdx = Math.min(carouselIdx, maxIdx);
  const trackOffset = safeIdx * (100 / slidesPerView);

  return (
    <div className="homepage">
      {/* ── Navbar ── */}
      <nav className={`hp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="hp-nav-inner">
          <Logo size="medium" />
          <div className="hp-nav-links">
            <button className="hp-nav-link" onClick={() => scrollTo('features')}>Features</button>
            <button className="hp-nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
            <button className="hp-nav-link" onClick={() => scrollTo('about')}>About Us</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-hero-bg">
          <div className="hp-hero-blob hp-hero-blob-1" />
          <div className="hp-hero-blob hp-hero-blob-2" />
        </div>
        <div className="hp-hero-inner">
          {/* Left */}
          <div>
            <div className="hp-hero-badge hp-anim">
              <span />
              AI-Powered Medical Diagnosis
            </div>
            <h1 className="hp-hero-title hp-anim hp-anim-d1">
              Smarter Chest<br />
              X-Ray Analysis<br />
              <em>for Better Care</em>
            </h1>
            <p className="hp-hero-sub hp-anim hp-anim-d2">
              MEDIVISION detects Pneumonia and Tuberculosis from chest X-rays with clinical-grade AI, visual heatmaps, PMDC-verified doctor reviews, and an interactive health assistant.
            </p>
            <div className="hp-hero-ctas hp-anim hp-anim-d3">
              <Link to="/patient-login" className="hp-hero-cta-primary">
                I'm a Patient
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link to="/doctor-login" className="hp-hero-cta-secondary">
                I'm a Doctor
              </Link>
            </div>
          </div>

          {/* Right — visual card */}
          <div className="hp-hero-visual hp-anim hp-anim-d2">
            <div className="hp-hero-card">
              <div className="hp-robot-wrap" aria-label="Doctor robot visual">
                <video
                  className="hp-robot-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster="/images/doctorrobot.jpg"
                  aria-label="Doctor robot video"
                >
                  <source src="/images/neww.mp4" type="video/mp4" />
                </video>
                <div className="hp-robot-overlay" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="hp-stats">
        <div className="hp-stats-inner hp-sr hp-sr-up">
          <div className="hp-stat-item hp-sr hp-sr-up" style={{ '--sr-delay': '80ms' }}>
            <div className="hp-stat-number">95%+</div>
            <div className="hp-stat-desc">Diagnostic Accuracy on Validation Set</div>
          </div>
          <div className="hp-stat-item hp-sr hp-sr-up" style={{ '--sr-delay': '180ms' }}>
            <div className="hp-stat-number">&lt; 60s</div>
            <div className="hp-stat-desc">Average AI Analysis Time</div>
          </div>
          <div className="hp-stat-item hp-sr hp-sr-up" style={{ '--sr-delay': '280ms' }}>
            <div className="hp-stat-number">2</div>
            <div className="hp-stat-desc">Diseases Detected: Pneumonia & TB</div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="hp-features">
        <div className="hp-features-inner">
          <div className="hp-features-header hp-sr hp-sr-up">
            <p className="hp-section-eyebrow">What We Offer</p>
            <h2 className="hp-section-title">Everything You Need<br />in One Platform</h2>
            <p className="hp-section-sub">From AI-powered detection to doctor consultations and progress tracking — MEDIVISION covers the full diagnostic journey.</p>
          </div>
          <div className="hp-features-grid" ref={featuresGridRef}>
            {[
              {
                icon: <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>,
                title: "Accurate AI Detection of Pneumonia & TB",
                desc: "Advanced deep-learning algorithms analyze chest X-rays with high precision, generating confidence scores and colored heatmaps showing exactly which regions are affected."
              },
              {
                icon: <><path d="M20 6L9 17l-5-5"/><circle cx="12" cy="8" r="4"/><path d="M8 21v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/></>,
                title: "PMDC-Verified Doctor Review & Prescription",
                desc: "Every MEDIVISION doctor is verified against the PMDC database. They review AI findings and provide personalized treatment recommendations and prescriptions."
              },
              {
                icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></>,
                title: "Talking Dr. Jarvis AI Avatar",
                desc: "Our interactive AI health assistant explains your results in simple language, answers medical questions, and can help locate nearby hospitals and radiology centers."
              },
              {
                icon: <><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></>,
                title: "Progress Tracking Over Time",
                desc: "Upload follow-up X-rays to visually compare your health journey. Side-by-side heatmaps show healing progress and treatment effectiveness over weeks or months."
              }
            ].map((f, i) => (
              <div
                className={`hp-feature-card hp-feature-reveal ${i % 2 === 0 ? 'from-left' : 'from-right'}${featuresVisible ? ' is-visible' : ''}`}
                style={{ '--feature-delay': `${i * 180}ms` }}
                key={i}
              >
                <div className="hp-feature-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{f.icon}</svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="hp-how">
        <div className="hp-how-inner">
          <div className="hp-how-header hp-sr hp-sr-up">
            <p className="hp-section-eyebrow">Simple Process</p>
            <h2 className="hp-section-title">From Upload to Diagnosis<br />in 4 Steps</h2>
            <p className="hp-section-sub">Our streamlined workflow ensures you receive a complete diagnosis with doctor review in minutes, not days.</p>
          </div>
          <div className="hp-steps hp-sr hp-sr-up" style={{ '--sr-delay': '120ms' }}>
            {[
              { num: "1", title: "Upload X-Ray & Profile", desc: "Upload your chest X-ray image and fill in your health profile, symptoms, and medical history." },
              { num: "2", title: "AI Detects & Heatmaps", desc: "Our model analyzes the X-ray in seconds and highlights infected regions with color-coded heatmaps." },
              { num: "3", title: "Doctor Reviews & Prescribes", desc: "A PMDC-verified doctor reviews the AI report and adds personalized treatment recommendations." },
              { num: "4", title: "Dr. Jarvis Explains All", desc: "Our AI avatar explains your results in plain language and answers any follow-up questions you have." },
            ].map((s, i) => (
              <div className="hp-step" key={i}>
                <div className="hp-step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials Carousel ── */}
      <section className="hp-carousel">
        <div className="hp-carousel-inner">
          <div className="hp-carousel-header hp-sr hp-sr-up">
            <p className="hp-section-eyebrow">Trusted by Patients & Doctors</p>
            <h2 className="hp-section-title">What Our Users Say</h2>
          </div>
          <div className="hp-carousel-track-wrap hp-sr hp-sr-right" style={{ '--sr-delay': '140ms' }} ref={carouselRef}>
            <div
              className="hp-carousel-track"
              style={{ transform: `translateX(-${trackOffset}%)` }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div className="hp-carousel-slide" key={i}>
                  <p className="hp-carousel-quote">"{t.quote}"</p>
                  <div className="hp-carousel-author">
                    <div className="hp-carousel-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      <div className="hp-carousel-name">{t.name}</div>
                      <div className="hp-carousel-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hp-carousel-dots">
            {Array.from({ length: TESTIMONIALS.length }).map((_, i) => (
              <button key={i} className={`hp-carousel-dot${i === safeIdx ? ' active' : ''}`} onClick={() => goToSlide(i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="hp-about">
        <div className="hp-about-inner">
          <div className="hp-about-grid">
            <div className="hp-sr hp-sr-left">
              <p className="hp-section-eyebrow">Our Mission</p>
              <h2 className="hp-section-title">Democratizing Medical Diagnosis</h2>
              <p className="hp-mission-text">
                MEDIVISION was built to bridge the gap between cutting-edge AI and accessible healthcare. In Pakistan and across South Asia, millions of patients face delays in getting respiratory disease diagnoses due to limited radiology resources.
                <br /><br />
                Our platform empowers patients to get a preliminary AI-powered chest X-ray analysis instantly, then connects them with PMDC-verified doctors who review and personalize the diagnosis. Through continuous research and innovation, we're committed to making high-quality medical imaging analysis available to everyone — regardless of location or income.
              </p>
            </div>
            <div className="hp-sr hp-sr-right" style={{ '--sr-delay': '120ms' }}>
              <p className="hp-founders-label">Meet the Team</p>
              <div className="hp-founders-grid">
                <div className="hp-founder-card">
                  <img className="hp-founder-img" src="/images/aqsa-imtiaz.jpg" alt="Aqsa Imtiaz" />
                  <div className="hp-founder-info">
                    <div className="hp-founder-name">Aqsa Imtiaz</div>
                    <div className="hp-founder-role">Co-Founder & AI Engineer</div>
                  </div>
                </div>
                <div className="hp-founder-card">
                  <img className="hp-founder-img" src="/images/qanitah-khan.jpg" alt="Qanitah Khan" />
                  <div className="hp-founder-info">
                    <div className="hp-founder-name">Qanitah Khan</div>
                    <div className="hp-founder-role">Co-Founder & Full-Stack Developer</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner hp-sr hp-sr-up">
          <div>
            <div className="hp-footer-brand">MEDIVISION</div>
            <div className="hp-footer-tagline">AI-Powered Medical Diagnosis Platform</div>
          </div>
          <div className="hp-footer-links">
            <button className="hp-footer-link" onClick={() => scrollTo('features')}>Features</button>
            <button className="hp-footer-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
            <button className="hp-footer-link" onClick={() => scrollTo('about')}>About</button>
            <Link to="/patient-login" className="hp-footer-link">Patient Login</Link>
            <Link to="/doctor-login" className="hp-footer-link">Doctor Login</Link>
          </div>
        </div>
        <div className="hp-footer-copy hp-sr hp-sr-up" style={{ '--sr-delay': '90ms' }}>
          © {new Date().getFullYear()} MEDIVISION. All rights reserved. Built with care for better healthcare access.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
