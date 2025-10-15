import React, { useState, useEffect, useCallback } from 'react';
import './NursePortal.css';
import {Users,Bell,ArrowUp,MapPin,LogOut,Shield,Heart,Activity,Droplets,Thermometer,AlertTriangle,Phone,
  Clock,TrendingUp,Plus,MessageCircle,Stethoscope,Baby,ChevronRight,Search} from 'lucide-react';

const MOCK_NURSE_ID = 'nurse1';
const API_URL = 'https://medcare-api-i5cm.onrender.com';

export default function NursePortal({ onLogout }) {
  const [activeTab, setActiveTab] = useState('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [alertPatients, setAlertPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState(null); // NEW: State to track expanded patient

  // Fetch patient data from the backend
  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/patients`);
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data);
      setTotalPatients(data.length);
      setAlertPatients(data.filter(p => p.hasAlert));
      setFilteredPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchPatients]);

  useEffect(() => {
    const newFilteredPatients = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPatients(newFilteredPatients);
  }, [searchQuery, patients]);

  const criticalAlerts = alertPatients.filter(p => p.alertLevel === 'nurse').length;
  const escalatedAlerts = alertPatients.filter(p => p.alertLevel === 'doctor').length;
  const stablePatients = totalPatients - alertPatients.length;

  const nurseGuidelines = [
    "Pregnancy Care: Monitor BP closely, normal weight gain is 11-16kg",
    "Elderly Care: Check for fall risks, medication compliance",
    "High BP: Immediate rest, recheck in 15 minutes, escalate if >140/90",
    "Low SpO2: Oxygen therapy, check airway, immediate doctor consultation",
    "Fever >38°C: Cooling measures, blood tests, infection protocol"
  ];
  
  const handleEscalateToDoctor = (patient) => {
    alert(`Alert for ${patient.name} escalated to doctor`);
  };

  // Function to toggle patient detail view
  const togglePatientDetail = (patientId) => {
    setSelectedPatientId(selectedPatientId === patientId ? null : patientId);
  };

  const sidebar = [
    { id: 'patients', label: 'My Patients', icon: Users, count: totalPatients },
    { id: 'alerts', label: 'Active Alerts', icon: Bell, badge: criticalAlerts, color: 'text-red-600' },
    { id: 'escalated', label: 'Escalated', icon: ArrowUp, badge: escalatedAlerts, color: 'text-orange-600' },
    { id: 'directory', label: 'Hospitals', icon: MapPin },
  ];

  // Component to render the expanded patient details
  const PatientDetailPanel = ({ patient }) => (
    <div className="patient-detail-panel">
      {/* The main content that was previously scattered across the large card */}
      <div className="patient-vitals-section expanded-vitals">
          
        <div className="vital-item">
          <div className="vital-value-wrapper">
            <Heart className="icon-sm text-red-600" />
            <span className="vital-value">{patient.vitals.heartRate}</span>
          </div>
          <div className="vital-label">Heart Rate (HR)</div>
        </div>
        <div className="vital-item">
          <div className="vital-value-wrapper">
            <Activity className="icon-sm text-blue-600" />
            <span className="vital-value">{patient.vitals.bloodPressure}</span>
          </div>
          <div className="vital-label">Blood Pressure (BP)</div>
        </div>
        <div className="vital-item">
          <div className="vital-value-wrapper">
            <Droplets className="icon-sm text-cyan-600" />
            <span className="vital-value">{patient.vitals.spO2}%</span>
          </div>
          <div className="vital-label">SpO2</div>
        </div>
        <div className="vital-item">
          <div className="vital-value-wrapper">
            <Thermometer className="icon-sm text-orange-600" />
            <span className="vital-value">{patient.vitals.temperature}°</span>
          </div>
          <div className="vital-label">Temp</div>
        </div>
      </div>

      <div className="patient-actions expanded-actions">
        <button className="button button-outline-sm">
          <Phone className="icon-xs" />
          Call Patient
        </button>
        {patient.hasAlert && patient.alertLevel === 'nurse' && (
          <button
            onClick={() => handleEscalateToDoctor(patient)}
            className="button button-orange"
          >
            <ArrowUp className="icon-xs" />
            Escalate to Doctor
          </button>
        )}
        <button className="button button-outline-sm">
          View Full Record
        </button>
      </div>
    </div>
  );


  return (
    <div className="nurse-dashboard-container">
      {/* Sidebar (Omitted for brevity, assuming no changes) */}
      <div className="nurse-sidebar">
        {/* ... Sidebar content ... */}
        <div className="nurse-sidebar-content">
          <div className="logo-section">
            <div className="logo-icon-bg">
              <Shield className="logo-icon" />
            </div>
            <div>
              <h2 className="logo-title">MedCare</h2>
              <p className="logo-subtitle">Nurse Portal</p>
            </div>
          </div>

          <nav className="nurse-nav">
            {sidebar.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'directory') {
                    alert('Navigating to Hospital Directory...');
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`nurse-nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <div className="flex-center">
                  <item.icon className={`icon-sm ${item.color || ''}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 && (
                  <div className="badge badge-red">{item.badge}</div>
                )}
                {item.count && (
                  <div className="badge badge-outline">{item.count}</div>
                )}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button
              onClick={() => setManualEntryOpen(true)}
              className="button button-primary"
            >
              <Plus className="icon-sm" />
              Manual Entry
            </button>
            <button
              onClick={() => setGuidelinesOpen(true)}
              className="button button-outline"
            >
              <MessageCircle className="icon-sm" />
              Care Guidelines
            </button>
          </div>
        </div>

        <div className="nurse-profile-section">
          <div className="profile-info">
            <div className="profile-avatar-bg">
              <span className="profile-avatar-text">N</span>
            </div>
            <div>
              <div className="profile-name">Nurse John</div>
              <div className="profile-role">Registered Nurse</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="button button-ghost"
          >
            <LogOut className="icon-sm" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="nurse-main-content">
        {/* Header (Omitted for brevity) */}
        <div className="main-header">
            <div>
              <h1 className="main-title">
                {activeTab === 'patients' && 'Patient Monitoring'}
                {activeTab === 'alerts' && 'Active Alerts'}
                {activeTab === 'escalated' && 'Escalated Cases'}
              </h1>
              <p className="main-subtitle">
                {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString()}
              </p>
            </div>
            <div className="stats-badge">
              <div className="badge badge-teal">
                {totalPatients} Patients Under Care
              </div>
            </div>
        </div>

        {/* Stats Cards (Omitted for brevity) */}
        <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-content">
                <div>
                  <p className="stat-label">Total Patients</p>
                  <p className="stat-value">{totalPatients}</p>
                </div>
                <Users className="stat-icon-teal" />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-content">
                <div>
                  <p className="stat-label">New Alerts</p>
                  <p className="stat-value-red">{criticalAlerts}</p>
                </div>
                <Bell className="stat-icon-red" />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-content">
                <div>
                  <p className="stat-label">Escalated</p>
                  <p className="stat-value-orange">{escalatedAlerts}</p>
                </div>
                <ArrowUp className="stat-icon-orange" />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-content">
                <div>
                  <p className="stat-label">Stable</p>
                  <p className="stat-value-green">{stablePatients}</p>
                </div>
                <TrendingUp className="stat-icon-green" />
              </div>
            </div>
        </div>

        {/* Search and Filters (Omitted for brevity) */}
        <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                placeholder="Search patients or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
        </div>


        {/* Patient List (RESTRUCTURED) */}
        <div className="patient-list-container">
          {filteredPatients
            .filter(p => {
              if (activeTab === 'alerts') return p.hasAlert && p.alertLevel === 'nurse';
              if (activeTab === 'escalated') return p.hasAlert && p.alertLevel === 'doctor';
              return true;
            })
            .map((patient) => (
            <React.Fragment key={patient.id}>
              {/* COMPACT CLICKABLE ROW */}
              <div
                className={`patient-list-row ${patient.hasAlert ? 'alert-row' : ''} ${selectedPatientId === patient.id ? 'expanded' : ''}`}
                onClick={() => togglePatientDetail(patient.id)}
              >
                <div className="patient-info-summary">
                  <div className={`patient-avatar-bg ${patient.hasAlert ? 'bg-red-100' : 'bg-teal-100'}`}>
                    <span className={`patient-avatar-text ${patient.hasAlert ? 'text-red-600' : 'text-teal-600'}`}>
                      {patient.name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="patient-name-list">{patient.name}</h3>
                    <p className="patient-meta-list">Age {patient.age} • {patient.gender}</p>
                  </div>
                </div>
                
                <div className="patient-indicators">
                  {/* Alert Badge */}
                  {patient.hasAlert && (
                    <div className={`badge ${patient.alertLevel === 'nurse' ? 'badge-red' : 'badge-orange'}`}>
                      {patient.alertLevel === 'nurse' ? 'NEW ALERT' : 'ESCALATED'}
                    </div>
                  )}
                  {/* Location */}
                  <div className="flex-center text-sm text-gray-500">
                    <MapPin className="icon-xs" />
                    <span>{patient.location}</span>
                  </div>
                  {/* Chevron Icon */}
                  <ChevronRight className={`icon-sm chevron ${selectedPatientId === patient.id ? 'rotated' : ''}`} />
                </div>
              </div>

              {/* EXPANDED DETAILS PANEL */}
              {selectedPatientId === patient.id && <PatientDetailPanel patient={patient} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Manual Entry Dialog */}
      {manualEntryOpen && (
        <div className="dialog-overlay" onClick={() => setManualEntryOpen(false)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">Manual Vitals Entry</h3>
            </div>
            <div className="dialog-body">
              <div>
                <label className="input-label">Patient Name</label>
                <input className="input-field" placeholder="Enter patient name" />
              </div>
              <div className="input-grid">
                <div>
                  <label className="input-label">Heart Rate</label>
                  <input className="input-field" placeholder="72" />
                </div>
                <div>
                  <label className="input-label">Blood Pressure</label>
                  <input className="input-field" placeholder="120/80" />
                </div>
              </div>
              <div className="input-grid">
                <div>
                  <label className="input-label">SpO2 (%)</label>
                  <input className="input-field" placeholder="98" />
                </div>
                <div>
                  <label className="input-label">Temperature (°C)</label>
                  <input className="input-field" placeholder="36.5" />
                </div>
              </div>
              <div>
                <label className="input-label">Notes</label>
                <textarea className="textarea-field" placeholder="Additional observations..."></textarea>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setManualEntryOpen(false)} className="button button-primary">
                  Save Entry
                </button>
                <button onClick={() => setManualEntryOpen(false)} className="button button-outline">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Care Guidelines Dialog */}
      {guidelinesOpen && (
        <div className="dialog-overlay" onClick={() => setGuidelinesOpen(false)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">
                <Stethoscope className="icon-sm text-teal-600" />
                <span>Care Guidelines Assistant</span>
              </h3>
            </div>
            <div className="dialog-body">
              <div className="guidelines-list">
                {nurseGuidelines.map((guideline, index) => (
                  <div key={index} className="guideline-item">
                    <p className="guideline-text">{guideline}</p>
                  </div>
                ))}
              </div>
              <div className="guideline-input-wrapper">
                <input className="input-field" placeholder="Ask about care protocols..." />
                <button className="button button-primary-sm">
                  Ask
                </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}