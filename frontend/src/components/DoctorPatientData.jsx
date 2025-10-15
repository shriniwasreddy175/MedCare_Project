import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, FileText, Heart, Activity, Droplets, Thermometer, Calendar } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './DoctorPatientData.css'; // Dedicated styles for the detailed record view

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = 'https://medcare-api-i5cm.onrender.com/api';

// Mock historical data structure for chart visualization
const MOCK_HISTORY = {
    dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    heartRate: [82, 85, 84, 86, 88, 85, 87],
    systolic: [130, 132, 135, 131, 134, 135, 138],
    diastolic: [82, 84, 85, 83, 86, 85, 89],
};

const MOCK_CONSULTATIONS = [
    { date: '2025-05-15', doctor: 'Dr. R. Smith', message: 'Vitals trending high. Advised reduced activity and low sodium diet. Follow-up scheduled.' },
    { date: '2025-05-10', doctor: 'Dr. R. Smith', message: 'Patient check-in, reported mild fatigue. Vitals stable. Recommended vitamin supplements.' }
];

// Component for the comprehensive, detailed patient record
export default function DoctorPatientData({ patientId, onBack }) {
    const [patient, setPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // NOTE: In a real application, MOCK_HISTORY and MOCK_CONSULTATIONS would be fetched from the API

    const fetchPatientDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            // Placeholder: In a full implementation, this route would fetch all history and demographics
            const response = await fetch(`${API_URL}/patients`); 
            const patientList = await response.json();
            const selectedPatient = patientList.find(p => p.id === patientId);

            if (selectedPatient) {
                // Attach mock data for charts/history until the backend serves it
                selectedPatient.history = MOCK_HISTORY; 
                selectedPatient.consultations = MOCK_CONSULTATIONS;
                setPatient(selectedPatient);
            }
        } catch (error) {
            console.error("Error fetching patient details:", error);
            setPatient(null);
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
    };

    const heartRateChartData = {
        labels: MOCK_HISTORY.dates,
        datasets: [
            {
                label: 'Heart Rate (bpm)',
                data: MOCK_HISTORY.heartRate,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.4,
            },
        ],
    };

    const bloodPressureChartData = {
        labels: MOCK_HISTORY.dates,
        datasets: [
            {
                label: 'Systolic (mmHg)',
                data: MOCK_HISTORY.systolic,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.4,
            },
            {
                label: 'Diastolic (mmHg)',
                data: MOCK_HISTORY.diastolic,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.4,
            },
        ],
    };

    if (isLoading) {
        return <div className="loading-message">Loading comprehensive patient record...</div>;
    }
    if (!patient) {
        return <div className="error-message">Patient record not found. ID: {patientId}</div>;
    }

    return (
        <div className="patient-record-container">
            {/* Header and Back Button */}
            <div className="record-header">
                <button onClick={onBack} className="back-button">
                    <ChevronLeft size={20} /> Back to Triage Dashboard
                </button>
                <h1 className="record-title">Comprehensive Patient Record: {patient.name}</h1>
                <p className="record-meta">ID: {patient.id} | Age: {patient.age} | Location: {patient.location}</p>
            </div>

            {/* Current Vitals Snapshot */}
            <div className="data-section-title">Latest Vitals Snapshot</div>
            <div className="vitals-summary-grid">
                <div className="summary-card status-red">
                    <Heart size={24} />
                    <span className="summary-value">{patient.vitals.heartRate}</span>
                    <span className="summary-label">Heart Rate</span>
                </div>
                <div className="summary-card status-blue">
                    <Activity size={24} />
                    <span className="summary-value">{patient.vitals.bloodPressure}</span>
                    <span className="summary-label">Blood Pressure</span>
                </div>
                <div className="summary-card status-cyan">
                    <Droplets size={24} />
                    <span className="summary-value">{patient.vitals.spo2}</span>
                    <span className="summary-label">SpO2</span>
                </div>
                <div className="summary-card status-orange">
                    <Thermometer size={24} />
                    <span className="summary-value">{patient.vitals.temperature}</span>
                    <span className="summary-label">Temperature</span>
                </div>
            </div>

            {/* Trend Charts */}
            <div className="data-section-title">Vitals Trend Analysis (Last 7 Days)</div>
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
                {patient.consultations && patient.consultations.length > 0 ? (
                    patient.consultations.map((entry, index) => (
                        <div key={index} className="consultation-entry">
                            <div className="consultation-meta">
                                <Calendar size={16} />
                                <p className="consultation-date">{entry.date}</p>
                                <p className="consultation-doctor">Attending: {entry.doctor}</p>
                            </div>
                            <p className="consultation-message">{entry.message}</p>
                        </div>
                    ))
                ) : (
                    <p className="empty-history">No consultation history found for this patient.</p>
                )}
            </div>
        </div>
    );
}
