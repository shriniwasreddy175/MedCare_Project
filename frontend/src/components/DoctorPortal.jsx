import React, { useState, useEffect, useCallback } from 'react';
import './DoctorPortal.css';
import { Users, Bell, ArrowUp, Stethoscope, LogOut, Shield, TrendingUp, Search, Calendar, CheckCircle, FileText, Heart, Activity, Thermometer, MapPin } from 'lucide-react';
import DoctorPatientData from './DoctorPatientData';

// REMOVED: MOCK_PATIENT_LIST_DOCTOR 

const API_URL = 'https://medcare-api-i5cm.onrender.com/api';

export default function DoctorPortal({ onLogout }) {
    const [activeTab, setActiveTab] = useState('escalated');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [patients, setPatients] = useState([]); // INITIALIZED AS EMPTY ARRAY
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    // Fetch patient data from the backend (same logic as NursePortal)
    const fetchPatients = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/patients`);
            if (!response.ok) throw new Error('Failed to fetch patients from API');
            
            const data = await response.json();
            
            // NOTE: The backend must ensure "escalatedBy" and "caseType" fields exist.
            // We enhance data here for client-side filtering if missing from API:
            const processedData = data.map(p => ({
                ...p,
                caseType: p.alertLevel === 'doctor' ? 'Escalated' : (p.hasAlert && p.alertLevel === 'nurse') ? 'New Case' : 'Active',
                escalatedBy: p.alertLevel === 'doctor' ? (p.escalatedBy || 'System Alert') : null 
            }));

            setPatients(processedData);
        } catch (error) {
            console.error("Error fetching patient list for Doctor Portal:", error);
            // Handle error state gracefully, e.g., set error message
        }
    }, []);

    // Fetch data on mount and update clock
    useEffect(() => {
        fetchPatients(); 
        const interval = setInterval(fetchPatients, 15000); // Refresh data every 15s
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [fetchPatients]);

    // Filtering logic now runs whenever patients or searchQuery changes
    useEffect(() => {
        const searchFiltered = patients.filter(patient =>
            patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.location.toLowerCase().includes(searchQuery.toLowerCase())
        );

        let tabFiltered;
        if (activeTab === 'new_cases') {
            tabFiltered = searchFiltered.filter(p => p.caseType === 'New Case');
        } else if (activeTab === 'escalated') {
            tabFiltered = searchFiltered.filter(p => p.caseType === 'Escalated');
        } else {
            tabFiltered = searchFiltered; 
        }

        setFilteredPatients(tabFiltered);
    }, [searchQuery, activeTab, patients]);


    const totalActive = patients.length;
    const newCasesCount = patients.filter(p => p.caseType === 'New Case').length;
    const escalatedCount = patients.filter(p => p.caseType === 'Escalated').length;

    const sidebar = [
        { id: 'escalated', label: 'Escalated from Nurse', icon: ArrowUp, count: escalatedCount, color: 'text-red-600' },
        { id: 'new_cases', label: 'New Cases', icon: Bell, count: newCasesCount, color: 'text-orange-600' },
        { id: 'active', label: 'Active Patients', icon: Users, count: totalActive, color: 'text-blue-600' },
        { id: 'full_records', label: 'View Full Records', icon: FileText },
    ];
    
    const handleAcknowledgeCase = (patientId) => {
        // Mocked client-side update
        setPatients(prev => prev.map(p => 
            p.id === patientId ? { ...p, hasAlert: false, caseType: 'Active', alertLevel: 'none' } : p
        ));
        // NOTE: In a real app, this sends an API call to update the database record.
    };

    const handleAddNotes = (patientName) => {
        alert(`Opening EMR form to add notes for ${patientName}...`);
    };

    // --- Conditional Rendering of Patient List ---
    const renderPatientList = () => (
        <div className="patient-list-container">
            {filteredPatients.length === 0 ? (
                <div className="empty-state-message">No patients found in this view. Check "Active Patients" or adjust search.</div>
            ) : (
                filteredPatients.map((patient) => (
                    <div
                        key={patient.id}
                        className={`patient-card-doctor ${patient.caseType === 'Escalated' ? 'alert-card' : patient.caseType === 'New Case' ? 'warning-card' : ''}`}
                    >
                        {/* TOP ROW: Patient Info and Alert Source */}
                        <div className="patient-info-summary">
                            <Stethoscope size={24} className="text-green-600"/>
                            <div>
                                <h3 className="patient-name-doctor">{patient.name}</h3>
                                <p className="patient-meta-doctor">{patient.age}, {patient.gender} • {patient.location}</p>
                                {patient.caseType === 'Escalated' && patient.escalatedBy && (
                                    <p className="escalation-source">
                                        <ArrowUp size={14} /> Escalated by: **{patient.escalatedBy}**
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* MIDDLE ROW: Vitals Snapshot */}
                        <div className="vitals-snapshot-doctor">
                            <div className="vital-snap-item">
                                <Heart size={16} className="text-red-500" />
                                <span className="vital-snap-value">{patient.vitals.heartRate}</span>
                                <span className="vital-snap-label">HR</span>
                            </div>
                            <div className="vital-snap-item">
                                <Activity size={16} className="text-blue-500" />
                                <span className="vital-snap-value">{patient.vitals.bloodPressure}</span>
                                <span className="vital-snap-label">BP</span>
                            </div>
                            <div className="vital-snap-item">
                                <Thermometer size={16} className="text-orange-500" />
                                <span className="vital-snap-value">{patient.vitals.temperature}</span>
                                <span className="vital-snap-label">Temp</span>
                            </div>
                        </div>

                        {/* BOTTOM ROW: Doctor Actions */}
                        <div className="doctor-actions-bar">
                            {patient.caseType !== 'Active' && (
                                <button 
                                    onClick={() => handleAcknowledgeCase(patient.id)}
                                    className="button button-acknowledge"
                                >
                                    <CheckCircle size={16} /> Acknowledge
                                </button>
                            )}
                            <button 
                                onClick={() => handleAddNotes(patient.name)}
                                className="button button-notes"
                            >
                                <FileText size={16} /> Add Notes
                            </button>
                            <button 
                                onClick={() => setSelectedPatientId(patient.id)}
                                className="button button-view-record"
                            >
                                View Record
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
    
    // --- Main Render ---
    return (
        <div className="doctor-dashboard-container">
            {/* Sidebar */}
            <div className="doctor-sidebar">
                <div className="sidebar-content">
                    <div className="logo-section">
                        <div className="logo-icon-bg">
                            <Shield className="logo-icon" />
                        </div>
                        <div>
                            <h2 className="logo-title">MedCare</h2>
                            <p className="logo-subtitle">Doctor Portal</p>
                        </div>
                    </div>

                    <nav className="doctor-nav">
                        {sidebar.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'full_records') {
                                        alert('Navigating to full patient record database...');
                                    } else {
                                        setActiveTab(item.id);
                                    }
                                }}
                                className={`doctor-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            >
                                <div className="flex-center">
                                    <item.icon className={`icon-sm ${item.color || ''}`} />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {item.count > 0 && (
                                    <div className="badge badge-outline-red">{item.count}</div>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="doctor-profile-section">
                    <div className="profile-info">
                        <div className="profile-avatar-bg">
                            <span className="profile-avatar-text">D</span>
                        </div>
                        <div>
                            <div className="profile-name">Dr. Smith</div>
                            <div className="profile-role">Attending Physician</div>
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
            <div className="doctor-main-content">
                {selectedPatientId ? (
                    // When a patient is selected, show the detailed data view
                    <DoctorPatientData patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />
                ) : (
                    // The main dashboard triage view
                    <>
                        <div className="main-header">
                            <div>
                                <h1 className="main-title">
                                    {activeTab === 'escalated' && 'Cases Escalated by Nurse'}
                                    {activeTab === 'new_cases' && 'New System Alerts'}
                                    {activeTab === 'active' && 'Active Monitoring'}
                                </h1>
                                <p className="main-subtitle">
                                    {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="stats-grid">
                            <div className="stat-card-doctor">
                                <div className="stat-card-content">
                                    <div><p className="stat-label">Total Load</p>
                                    <p className="stat-value">{totalActive}</p></div>
                                    <Users className="stat-icon-blue" />
                                </div>
                            </div>
                            <div className="stat-card-doctor">
                                <div className="stat-card-content">
                                    <div><p className="stat-label">Escalated</p>
                                    <p className="stat-value-red">{escalatedCount}</p></div>
                                    <ArrowUp className="stat-icon-red" />
                                </div>
                            </div>
                            <div className="stat-card-doctor">
                                <div className="stat-card-content">
                                    <div><p className="stat-label">New System Alerts</p>
                                    <p className="stat-value-orange">{newCasesCount}</p></div>
                                    <Bell className="stat-icon-orange" />
                                </div>
                            </div>
                            <div className="stat-card-doctor">
                                <div className="stat-card-content">
                                    <div><p className="stat-label">Stable</p>
                                    <p className="stat-value-green">{totalActive - escalatedCount - newCasesCount}</p></div>
                                    <TrendingUp className="stat-icon-green" />
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="search-container-doctor">
                            <Search className="search-icon" />
                            <input
                                placeholder="Search patient name, ID, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        {/* Patient List */}
                        {renderPatientList()}
                    </>
                )}
            </div>
        </div>
    );
}
