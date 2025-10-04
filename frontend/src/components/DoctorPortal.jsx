import React, { useState } from 'react';
import DoctorPatientData from './DoctorPatientData';
import './DoctorPortal.css';
import '../App.css';

// --- Mock Data for the enhanced Doctor's Portal ---
const mockPatients = [
  { id: 'PATIENT-001', name: 'Alice Johnson', lastVisit: '2025-05-10', condition: 'Stable', status: 'Stable' },
  { id: 'PATIENT-002', name: 'Bob Williams', lastVisit: '2025-05-12', condition: 'Monitoring', status: 'Monitoring' },
  { id: 'PATIENT-003', name: 'Charlie Brown', lastVisit: '2025-05-15', condition: 'New Vitals', status: 'New Vitals' },
  { id: 'PATIENT-004', name: 'Dana Evans', lastVisit: '2025-05-14', condition: 'Fever Alert', status: 'Alert' },
  { id: 'PATIENT-005', name: 'Frank White', lastVisit: '2025-05-13', condition: 'High BP', status: 'Alert' },
];

function DoctorPortal({ userRole }) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'messages'

  const portalMessage = userRole === 'nurse'
    ? "Welcome to the Nurse's Portal!"
    : "Welcome to the Doctor's Portal!";

  // --- Mock Secure Messaging Component (for discussion purposes) ---
  const DoctorChat = () => (
    <div className="doctor-chat-container">
      <h3 className="chat-title">Secure Patient Messaging</h3>
      <p className="chat-subtitle">This is a mock chat system. It would be connected to a real-time messaging backend.</p>
      <div className="chat-window">
        {/* Placeholder chat messages */}
        <div className="chat-message bot">Welcome! You can send messages to your patients here.</div>
      </div>
      <div className="chat-input-area">
        <input type="text" placeholder="Type your message..." className="chat-input" />
        <button className="chat-send-button">Send</button>
      </div>
    </div>
  );

  return (
    <div className="doctor-portal-container">
      <h2 className="portal-title">{portalMessage}</h2>
      <p className="portal-subtitle">View patient records and vitals.</p>
      
      {/* New Tab Navigation for the Portal */}
      <div className="portal-tab-container">
        <button 
          className={`portal-tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} 
          onClick={() => setActiveTab('dashboard')}
        >
          Patient Dashboard
        </button>
        <button 
          className={`portal-tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Secure Messages
        </button>
      </div>

      <div className="portal-layout">
        {/* Patient List Section */}
        {activeTab === 'dashboard' && (
          <>
            <div className="patient-list-panel">
              <h3 className="panel-title">Your Patients</h3>
              <ul className="patient-list">
                {mockPatients.map(patient => (
                  <li
                    key={patient.id}
                    className={`patient-item ${selectedPatientId === patient.id ? 'selected' : ''} status-${patient.status.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <div className="patient-info">
                      <span className="patient-name">{patient.name}</span>
                      <span className="patient-status">{patient.condition}</span>
                    </div>
                    <span className="last-visit">Last visit: {patient.lastVisit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Patient Data View Section */}
            <div className="patient-data-panel">
              {selectedPatientId ? (
                <DoctorPatientData patientId={selectedPatientId} />
              ) : (
                <div className="select-patient-message">
                  <p>Please select a patient from the list to view their data.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Secure Messages Tab Content */}
        {activeTab === 'messages' && <DoctorChat />}
      </div>
    </div>
  );
}

export default DoctorPortal;