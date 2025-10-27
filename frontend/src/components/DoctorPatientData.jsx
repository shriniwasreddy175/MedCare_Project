import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, FileText, Heart, Activity, Droplets, Thermometer, Calendar } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './DoctorPatientData.css'; // Dedicated styles for the detailed record view

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = 'https://medcare-api-i5cm.onrender.com/api';

// Component for the comprehensive, detailed patient record
export default function DoctorPatientData({ patientId, onBack }) {
    // State now holds the entire structured response from the API
    const [patientData, setPatientData] = useState(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // Added error state
    
    const fetchPatientDetails = useCallback(async () => {
        setIsLoading(true);
        setError(null); // Clear previous errors
        try {
            // UPDATED: Call the new dedicated endpoint
            const response = await fetch(`${API_URL}/patient/${patientId}/details`); 
            
            if (!response.ok) {
                throw new Error(`Failed to fetch patient details (Status: ${response.status})`);
            }
            
            const data = await response.json();
            setPatientData(data); // Store the full response object { patient, vitals_history, consultations }

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
            title: { display: false }, // Keep title minimal in chart area
        },
        scales: {
            y: { // Ensure y-axis starts appropriately
                beginAtZero: false 
            }
        }
    };

    // Chart data now dynamically uses the fetched history
    const heartRateChartData = {
        labels: patientData?.vitals_history?.dates || [], // Use optional chaining
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

    // --- Render Logic ---
    if (isLoading) {
        return <div className="loading-message">Loading comprehensive patient record...</div>;
    }
    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }
    if (!patientData || !patientData.patient) { // Check if patient data structure is valid
        return <div className="error-message">Patient record not found or data structure is invalid. ID: {patientId}</div>;
    }

    // Destructure for easier access
    const { patient, vitals_history, consultations } = patientData;

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
            </div>

            {/* Current Vitals Snapshot - Fetch latest from history if possible, else use patient.vitals */}
            <div className="data-section-title">Latest Vitals Snapshot</div>
            <div className="vitals-summary-grid">
                <div className="summary-card status-red">
                    <Heart size={24} />
                    <span className="summary-value">{vitals_history?.heartRate?.slice(-1)[0] || 'N/A'} bpm</span>
                    <span className="summary-label">Heart Rate</span>
                </div>
                <div className="summary-card status-blue">
                    <Activity size={24} />
                    <span className="summary-value">{vitals_history?.systolic?.slice(-1)[0]}/{vitals_history?.diastolic?.slice(-1)[0] || 'N/A'} mmHg</span>
                    <span className="summary-label">Blood Pressure</span>
                </div>
                 <div className="summary-card status-cyan">
                    <Droplets size={24} />
                    <span className="summary-value">{vitals_history?.spo2?.slice(-1)[0] || 'N/A'}%</span>
                    <span className="summary-label">SpO2</span>
                </div>
                <div className="summary-card status-orange">
                    <Thermometer size={24} />
                    <span className="summary-value">{vitals_history?.temperature?.slice(-1)[0] || 'N/A'}°C</span>
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

