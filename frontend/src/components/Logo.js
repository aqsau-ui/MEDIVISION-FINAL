import React from 'react';
import './Logo.css';

const Logo = ({ size = 'medium' }) => {
  return (
    <div className={`logo-container ${size}`}>
      <svg viewBox="0 0 48 48" className="logo-svg">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#2C7A7B', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#38B2AC', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Medical Cross */}
        <rect x="21" y="12" width="6" height="24" fill="url(#logoGradient)" rx="1" />
        <rect x="15" y="18" width="18" height="6" fill="url(#logoGradient)" rx="1" />
        
        {/* AI Brain Circuit */}
        <circle cx="16" cy="16" r="2" fill="#2C7A7B" opacity="0.8" />
        <circle cx="32" cy="16" r="2" fill="#2C7A7B" opacity="0.8" />
        <circle cx="16" cy="32" r="2" fill="#2C7A7B" opacity="0.8" />
        <circle cx="32" cy="32" r="2" fill="#2C7A7B" opacity="0.8" />
        
        {/* Connecting Lines */}
        <line x1="16" y1="16" x2="21" y2="18" stroke="#38B2AC" strokeWidth="1.5" opacity="0.6" />
        <line x1="32" y1="16" x2="27" y2="18" stroke="#38B2AC" strokeWidth="1.5" opacity="0.6" />
        <line x1="16" y1="32" x2="21" y2="30" stroke="#38B2AC" strokeWidth="1.5" opacity="0.6" />
        <line x1="32" y1="32" x2="27" y2="30" stroke="#38B2AC" strokeWidth="1.5" opacity="0.6" />
      </svg>
      <span className="logo-text">MEDIVISION</span>
    </div>
  );
};

export default Logo;