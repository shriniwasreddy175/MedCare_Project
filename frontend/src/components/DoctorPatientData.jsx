import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, FileText, Heart, Activity, Droplets, Thermometer, Calendar, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './DoctorPatientData.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = 'https://medcare-api-i5cm.onrender.com/api';

// Component for the comprehensive, detailed patient record
// NEW PROPS: onAcknowledge and onAddNote are passed from DoctorPortal
export default function DoctorPatientData({ patientId, onBack, onAcknowledge, onAddNote, userName }) { 
    const [patientData, setPatientData] = useState(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionStatus, setActionStatus] = useState(''); // NEW: Status for actions within the EMR
    
    const fetchPatientDetails = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/patient/${patientId}/details`); 
            
            if (!response.ok) {
                // If patient is not found, API returns 404
                throw new Error(`Failed to fetch patient details (Status: ${response.status})`);
            }
            
            const data = await response.json();
            setPatientData(data);

        } catch (err) {
            console.error("Error fetching patient details:", err);
            setError(err.message || "Could not load patient record.");
            setPatientData(null);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchPatientDetails();
    }, [fetchPatientDetails]);

    // --- Chart Data & Options ---
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false },
        },
        scales: {
            y: {
                beginAtZero: false 
            }
        }
    };

    // Chart data now dynamically uses the fetched history
    const heartRateChartData = {
        labels: patientData?.vitals_history?.dates || [],
        datasets: [
            {
                label: 'Heart Rate (bpm)',
                data: patientData?.vitals_history?.heartRate || [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.4,
            },
        ],
    };

    const bloodPressureChartData = {
        labels: patientData?.vitals_history?.dates || [],
        datasets: [
            {
                label: 'Systolic (mmHg)',
                data: patientData?.vitals_history?.systolic || [],
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.4,
            },
            {
                label: 'Diastolic (mmHg)',
                data: patientData?.vitals_history?.diastolic || [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.4,
            },
        ],
    };
    
    // --- Handlers for Actions ---
    const handleAcknowledgeClick = () => {
        // Pass the patient ID back up to the parent component (DoctorPortal)
        onAcknowledge(patientId);
        // Optional: Provide instant feedback
        setActionStatus('Case acknowledged. Returning to dashboard...');
        setTimeout(onBack, 1000); // Return to dashboard after brief confirmation
    };

    const handleAddNoteClick = () => {
        // Pass patient details up to the parent component to open the modal
        onAddNote(patientData.patient); 
    };


    // --- Render Logic ---
    if (isLoading) {
        return <div className="loading-message">Loading comprehensive patient record...</div>;
    }
    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }
    if (!patientData || !patientData.patient) {
        return <div className="error-message">Patient record not found. ID: {patientId}</div>;
    }

    // Destructure for easier access
    const { patient, vitals_history, consultations } = patientData;
    
    // Determine if the current patient requires immediate triage action 
    // (This info needs to come from the triage list context, but we use the latest note as a proxy)
    const requiresAction = consultations.some(c => c.alertLevel === 'nurse' || c.alertLevel === 'doctor');
    
    const latestHeartRate = vitals_history?.heartRate?.slice(-1)[0];
    const latestSystolic = vitals_history?.systolic?.slice(-1)[0];
    const latestDiastolic = vitals_history?.diastolic?.slice(-1)[0];
    const latestSpO2 = vitals_history?.spo2?.slice(-1)[0];
    const latestTemp = vitals_history?.temperature?.slice(-1)[0];


    return (
        <div className="patient-record-container">
            {/* Header and Back Button */}
            <div className="record-header">
                <button onClick={onBack} className="back-button">
                    <ChevronLeft size={20} /> Back to Triage Dashboard
                </button>
                <h1 className="record-title">Comprehensive Patient Record: {patient.name}</h1>
                <p className="record-meta">ID: {patient.id} | Age: {patient.age} | Gender: {patient.gender} | Location: {patient.location}</p>
                 {patient.guardianPhone && <p className="record-meta guardian-phone">Guardian Contact: {patient.guardianPhone}</p>}
                
                {/* ACTION BAR within the EMR View */}
                <div className="emr-action-bar">
                    {requiresAction && (
                        <button onClick={handleAcknowledgeClick} className="emr-button emr-acknowledge-button">
                            <CheckCircle size={18} /> Acknowledge Case
                        </button>
                    )}
                    <button onClick={handleAddNoteClick} className="emr-button emr-notes-button">
                        <FileText size={18} /> Add New Note
                    </button>
                </div>
                {actionStatus && <p className="emr-status-message">{actionStatus}</p>}
            </div>

            {/* Current Vitals Snapshot */}
            <div className="data-section-title">Latest Vitals Snapshot</div>
            <div className="vitals-summary-grid">
                <div className="summary-card status-red">
                    <Heart size={24} />
                    <span className="summary-value">{latestHeartRate || 'N/A'} bpm</span>
                    <span className="summary-label">Heart Rate</span>
                </div>
                <div className="summary-card status-blue">
                    <Activity size={24} />
                    <span className="summary-value">{latestSystolic}/{latestDiastolic || 'N/A'} mmHg</span>
                    <span className="summary-label">Blood Pressure</span>
                </div>
                 <div className="summary-card status-cyan">
                    <Droplets size={24} />
                    <span className="summary-value">{latestSpO2 || 'N/A'}%</span>
                    <span className="summary-label">SpO2</span>
                </div>
                <div className="summary-card status-orange">
                    <Thermometer size={24} />
                    <span className="summary-value">{latestTemp || 'N/A'}°C</span>
                    <span className="summary-label">Temperature</span>
                </div>
            </div>

            {/* Trend Charts */}
            <div className="data-section-title">Vitals Trend Analysis (Recent Records)</div>
            <div className="chart-analysis-grid">
                <div className="chart-card">
                    <h3 className="chart-card-title">Heart Rate Trend</h3>
                    <Line options={chartOptions} data={heartRateChartData} />
                </div>
                <div className="chart-card">
                    <h3 className="chart-card-title">Blood Pressure Trend</h3>
                    <Line options={chartOptions} data={bloodPressureChartData} />
                </div>
            </div>

            {/* Consultation History */}
            <div className="data-section-title">Consultation & EMR History</div>
            <div className="consultation-history-list">
                {consultations && consultations.length > 0 ? (
                    consultations.map((entry, index) => (
                        <div key={index} className="consultation-entry">
                            <div className="consultation-meta">
                                <Calendar size={16} />
                                <p className="consultation-date">{entry.date}</p>
                                <p className="consultation-doctor">Logged By: {entry.doctor}</p>
                                {entry.escalatedBy && <p className="escalated-by-tag">Escalated By: {entry.escalatedBy}</p>}
                            </div>
                            <p className="consultation-message">{entry.notes}</p>
                        </div>
                    ))
                ) : (
                    <p className="empty-history">No consultation history found for this patient.</p>
                )}
            </div>
        </div>
    );
}