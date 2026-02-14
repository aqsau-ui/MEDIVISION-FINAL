import React, { useState } from 'react';
import DoctorLayout from '../components/DoctorLayout';
import './DoctorAllPatients.css';

const DoctorAllPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [diseaseFilter, setDiseaseFilter] = useState('all');

  return (
    <DoctorLayout>
      <div className="all-patients-content">
        <div className="patients-header">
          <h1 className="patients-title">All Patients</h1>
          <p className="patients-subtitle">View and manage all patient cases</p>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select 
            value={diseaseFilter} 
            onChange={(e) => setDiseaseFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Diseases</option>
            <option value="pneumonia">Pneumonia</option>
            <option value="tuberculosis">Tuberculosis</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        <div className="patients-list-section">
          <h2 className="list-title">Patient Records (0)</h2>
          
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="empty-text">No data available</p>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
};

export default DoctorAllPatients;
