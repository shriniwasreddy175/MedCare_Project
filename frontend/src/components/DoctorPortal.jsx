import React, { useState, useEffect, useCallback } from 'react';
import './DoctorPortal.css';
import { 
    Users, Bell, ArrowUp, Stethoscope, LogOut, Shield, TrendingUp, Search, 
    Calendar, CheckCircle, FileText, Heart, Activity, Thermometer, MapPin, MessageCircle // Added MessageCircle for notes
} from 'lucide-react';
import DoctorPatientData from './DoctorPatientData';

const API_URL = 'https://medcare-api-i5cm.onrender.com/api';

export default function DoctorPortal({ onLogout, userName }) {
    const [activeTab, setActiveTab] = useState('escalated');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [patients, setPatients] = useState([]); // Will be filled by API
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    // --- NEW STATE FOR MODALS AND ACTIONS ---
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [currentPatientForNote, setCurrentPatientForNote] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [statusMessage, setStatusMessage] = useState(''); // For user feedback

    // --- NEW: Fetch patient data from the backend ---
    const fetchPatients = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/patients`);
            if (!response.ok) throw new Error('Failed to fetch patients from API');
            
            const data = await response.json();
            
            // Process data to determine Case Type for frontend filtering
            const processedData = data.map(p => {
                let caseType = 'Active';
                if (p.alertLevel === 'doctor') {
                    caseType = 'Escalated';
                } else if (p.hasAlert && p.alertLevel === 'nurse') {
                    caseType = 'New Case';
                }
                
                return {
                    ...p,
                    caseType: caseType,
                    // Ensure escalatedBy is populated if the case is escalated
                    escalatedBy: p.alertLevel === 'doctor' ? (p.escalatedBy || 'System Alert') : null 
                };
            });

            setPatients(processedData);
        } catch (error) {
            console.error("Error fetching patient list for Doctor Portal:", error);
            setStatusMessage("Error: Could not fetch patient list.");
        }
    }, []);

    // --- Data Fetching and Clock ---
    useEffect(() => {
        fetchPatients(); 
        const interval = setInterval(fetchPatients, 15000); // Refresh data every 15s
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [fetchPatients]);

    // --- Filtering Logic ---
    useEffect(() => {
        // Clear status message when tab changes
        setStatusMessage(''); 
        
        const searchFiltered = patients.filter(patient =>
            patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (patient.location && patient.location.toLowerCase().includes(searchQuery.toLowerCase()))
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


    // --- Calculate Stats ---
    const totalActive = patients.length;
    const newCasesCount = patients.filter(p => p.caseType === 'New Case').length;
    const escalatedCount = patients.filter(p => p.caseType === 'Escalated').length;
    const stableCount = totalActive - newCasesCount - escalatedCount;

    const sidebar = [
        { id: 'escalated', label: 'Escalated from Nurse', icon: ArrowUp, count: escalatedCount, color: 'text-red-600' },
        { id: 'new_cases', label: 'New Cases', icon: Bell, count: newCasesCount, color: 'text-orange-600' },
        { id: 'active', label: 'Active Patients', icon: Users, count: totalActive, color: 'text-blue-600' },
        { id: 'full_records', label: 'View Full Records', icon: FileText },
    ];
    
    // --- UPDATED: Acknowledge Case Handler ---
    const handleAcknowledgeCase = async (patientId) => {
        setStatusMessage(`Acknowledging case for Patient ${patientId}...`);
        try {
            const response = await fetch(`${API_URL}/patient/${patientId}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_name: userName }), // Pass the real doctor's name
            });

            const data = await response.json();
            if (response.ok) {
                setStatusMessage(`Success: ${data.message}`);
                fetchPatients(); // Refresh to update the list
            } else {
                setStatusMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error("Acknowledge API error:", error);
            setStatusMessage("Network error during acknowledgment.");
        }
    };

    // --- NEW: Open "Add Note" Modal ---
    const handleOpenAddNotes = (patient) => {
        setCurrentPatientForNote(patient);
        setNoteContent('');
        setStatusMessage(''); // Clear main status message
        setNoteModalOpen(true);
    };
    
    // --- NEW: Save Note Handler ---
    const handleSaveNote = async (e) => {
        e.preventDefault();
        const patientId = currentPatientForNote.id;

        if (noteContent.length < 10) {
            setStatusMessage("Note must be at least 10 characters long.");
            return;
        }

        setStatusMessage(`Saving note for ${currentPatientForNote.name}...`);

        try {
            const response = await fetch(`${API_URL}/patient/${patientId}/add_note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    doctor_name: userName, // Send real doctor's name
                    notes_content: noteContent 
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setStatusMessage(`Success: ${data.message}`);
                // Close modal after a delay
                setTimeout(() => {
                    setNoteModalOpen(false);
                    setStatusMessage(''); // Clear message
                }, 2000);
            } else {
                setStatusMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error("Add note API error:", error);
            setStatusMessage("Network error while saving note.");
        }
    };

    // --- Component: Patient List ---
    const renderPatientList = () => (
        <div className="patient-list-container">
            {/* Status Feedback Bar */}
            {statusMessage && !noteModalOpen && ( // Only show if modal is closed
                <div className={`status-feedback-bar ${statusMessage.startsWith('Error') ? 'error' : 'success'}`}>
                    {statusMessage.replace(/^(Success: |Error: )/, '')}
                </div>
            )}

            {filteredPatients.length === 0 ? (
                <div className="empty-state-message">No patients found in this view.</div>
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
                                        <ArrowUp size={14} className="escalate-icon" /> Escalated by: <strong>{patient.escalatedBy}</strong>
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
                                onClick={() => handleOpenAddNotes(patient)}
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
    
    // --- Component: Add Notes Modal ---
    const AddNotesModal = () => (
        <div className="dialog-overlay" onClick={() => setNoteModalOpen(false)}>
            <div className="dialog-content" onClick={e => e.stopPropagation()}>
                <h3 className="dialog-title">Add EMR Note for {currentPatientForNote.name}</h3>
                <form onSubmit={handleSaveNote}>
                    <div className="dialog-body">
                        <textarea 
                            className="notes-textarea"
                            placeholder={`Document your findings for ${currentPatientForNote.name} here...`}
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            required
                            minLength={10}
                        ></textarea>
                        
                        {statusMessage && (
                            <p className={`status-message ${statusMessage.startsWith('Error') ? 'error' : 'success'}`}>
                                {statusMessage.replace(/^(Success: |Error: )/, '')}
                            </p>
                        )}

                        <div className="modal-actions">
                            <button type="submit" className="button button-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Note'}
                            </button>
                            <button type="button" onClick={() => setNoteModalOpen(false)} className="button button-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
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
                            <span className="profile-avatar-text">{userName ? userName[0].toUpperCase() : 'D'}</span>
                        </div>
                        <div>
                            <div className="profile-name">{userName || 'Doctor'}</div>
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
                            <div className="stat-card-doctor"> <div className="stat-card-content"> <div><p className="stat-label">Total Load</p> <p className="stat-value">{totalActive}</p></div> <Users className="stat-icon-blue" /> </div> </div>
                            <div className="stat-card-doctor"> <div className="stat-card-content"> <div><p className="stat-label">Escalated</p> <p className="stat-value-red">{escalatedCount}</p></div> <ArrowUp className="stat-icon-red" /> </div> </div>
                            <div className="stat-card-doctor"> <div className="stat-card-content"> <div><p className="stat-label">New System Alerts</p> <p className="stat-value-orange">{newCasesCount}</p></div> <Bell className="stat-icon-orange" /> </div> </div>
                            <div className="stat-card-doctor"> <div className="stat-card-content"> <div><p className="stat-label">Stable</p> <p className="stat-value-green">{stableCount}</p></div> <TrendingUp className="stat-icon-green" /> </div> </div>
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
            
            {/* Render the Add Note Modal when active */}
            {noteModalOpen && currentPatientForNote && <AddNotesModal />}
        </div>
    );
}

