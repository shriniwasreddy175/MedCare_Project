import React, { useState, useEffect, useCallback } from 'react';
import './DoctorPortal.css';
import { Users, Bell, ArrowUp, Stethoscope, LogOut, Shield, TrendingUp, Search, Calendar, CheckCircle, FileText,Heart, Activity, Thermometer, MapPin } from 'lucide-react';
//import DoctorPatientData from './DoctorPatientData'; // Component for viewing deep patient data

// --- Mock Data for Doctor's Patient List ---
const MOCK_PATIENT_LIST_DOCTOR = [
    {
        "id": "P001", "name": "Elara Vance", "age": 68, "gender": "Female", "location": "Room 301",
        "hasAlert": true, "caseType": "Escalated", "escalatedBy": "Nurse John", "alertTime": "15:45",
        "vitals": {"heartRate": "115 bpm", "bloodPressure": "150/95 mmHg", "spO2": "93%", "temperature": "37.8°C"}
    },
    {
        "id": "P002", "name": "John Doe", "age": 45, "gender": "Male", "location": "Room 305",
        "hasAlert": false, "caseType": "Active", "escalatedBy": null, "alertTime": null,
        "vitals": {"heartRate": "72 bpm", "bloodPressure": "120/80 mmHg", "spO2": "98%", "temperature": "36.5°C"}
    },
    {
        "id": "P003", "name": "Sarah Connor", "age": 29, "gender": "Female", "location": "HomeCare",
        "hasAlert": true, "caseType": "New Case", "escalatedBy": null, "alertTime": "14:10",
        "vitals": {"heartRate": "88 bpm", "bloodPressure": "145/90 mmHg", "spO2": "96%", "temperature": "36.9°C"}
    },
    {
        "id": "P004", "name": "Marcus Kane", "age": 78, "gender": "Male", "location": "Room 310",
        "hasAlert": true, "caseType": "Escalated", "escalatedBy": "Nurse Jane", "alertTime": "15:55",
        "vitals": {"heartRate": "55 bpm", "bloodPressure": "110/70 mmHg", "spO2": "97%", "temperature": "37.0°C"}
    },
    {
        "id": "P005", "name": "Jane Smith", "age": 35, "gender": "Female", "location": "Room 302",
        "hasAlert": false, "caseType": "Active", "escalatedBy": null, "alertTime": null,
        "vitals": {"heartRate": "80 bpm", "bloodPressure": "125/85 mmHg", "spO2": "99%", "temperature": "37.2°C"}
    },
];

const API_URL = 'http://localhost:5000/api';

export default function DoctorPortal({ onLogout }) {
    const [activeTab, setActiveTab] = useState('escalated');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [patients, setPatients] = useState(MOCK_PATIENT_LIST_DOCTOR);
    const [filteredPatients, setFilteredPatients] = useState(MOCK_PATIENT_LIST_DOCTOR);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    const totalActive = patients.length;
    const newCasesCount = patients.filter(p => p.caseType === 'New Case').length;
    const escalatedCount = patients.filter(p => p.caseType === 'Escalated').length;

    const sidebar = [
        { id: 'escalated', label: 'Escalated from Nurse', icon: ArrowUp, count: escalatedCount, color: 'text-red-600' },
        { id: 'new_cases', label: 'New Cases', icon: Bell, count: newCasesCount, color: 'text-orange-600' },
        { id: 'active', label: 'Active Patients', icon: Users, count: totalActive, color: 'text-blue-600' },
        { id: 'full_records', label: 'View Full Records', icon: FileText },
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Filter patients based on search query
        const searchFiltered = MOCK_PATIENT_LIST_DOCTOR.filter(patient =>
            patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            patient.location.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter based on active tab
        let tabFiltered;
        if (activeTab === 'new_cases') {
            tabFiltered = searchFiltered.filter(p => p.caseType === 'New Case');
        } else if (activeTab === 'escalated') {
            tabFiltered = searchFiltered.filter(p => p.caseType === 'Escalated');
        } else {
            tabFiltered = searchFiltered; // Default: 'active' or search-only
        }

        setFilteredPatients(tabFiltered);
    }, [searchQuery, activeTab]);

    const handleAcknowledgeCase = (patientId) => {
        // Logic to mark case as reviewed (mocked)
        alert(`Case for Patient ${patientId} acknowledged by doctor.`);
        setPatients(prev => prev.map(p => 
            p.id === patientId ? { ...p, hasAlert: false, caseType: 'Active' } : p
        ));
    };

    const handleAddNotes = (patientName) => {
        alert(`Opening EMR form to add notes for ${patientName}...`);
        // In a real app, this would open a modal/new route for EMR entry
    };

    // --- Conditional Rendering of Patient List ---
    const renderPatientList = () => (
        <div className="patient-list-container">
            {filteredPatients.map((patient) => (
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
                            {patient.escalatedBy && (
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
                        </div>
                        <div className="vital-snap-item">
                            <Activity size={16} className="text-blue-500" />
                            <span className="vital-snap-value">{patient.vitals.bloodPressure}</span>
                        </div>
                        <div className="vital-snap-item">
                            <Thermometer size={16} className="text-orange-500" />
                            <span className="vital-snap-value">{patient.vitals.temperature}</span>
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
            ))}
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
                                        // Placeholder action
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
                    {/* Profile and Logout */}
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
