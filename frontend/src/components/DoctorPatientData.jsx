import React from 'react';
import VitalsDashboard from './VitalsDashboard'; // Reuse the vitals dashboard component
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './DoctorPatientData.css'; // Dedicated CSS for this component
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Mock data for a specific patient's data, now with historical trends
const mockPatientData = {
  'PATIENT-001': {
    vitals: {
      heartRate: "85 bpm",
      bloodPressure: "135/85 mmHg",
      spo2: "96%",
      temperature: "36.8°C",
      ecgStatus: "Irregular heartbeat detected",
      cortisol: "22 mcg/dL",
      estrogen: "45 pg/mL",
      progesterone: "8 ng/mL",
      testosterone: "75 ng/dL"
    },
    historicalVitals: {
      dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      heartRate: [82, 85, 84, 86, 88, 85, 87],
      bloodPressure: [
        { systolic: 130, diastolic: 82 },
        { systolic: 132, diastolic: 84 },
        { systolic: 135, diastolic: 85 },
        { systolic: 131, diastolic: 83 },
        { systolic: 134, diastolic: 86 },
        { systolic: 135, diastolic: 85 },
        { systolic: 138, diastolic: 89 }
      ]
    },
    consultationHistory: [
      { date: '2025-05-15', message: 'Vitals show elevated blood pressure. Advised to monitor and limit sodium intake.' },
      { date: '2025-05-10', message: 'Patient presented with mild symptoms of stress. Recommended meditation.' }
    ]
  },
  'PATIENT-002': {
    vitals: {
      heartRate: "68 bpm",
      bloodPressure: "115/75 mmHg",
      spo2: "99%",
      temperature: "36.2°C",
      ecgStatus: "Normal Rhythm",
      cortisol: "11 mcg/dL",
      estrogen: "35 pg/mL",
      progesterone: "6 ng/mL",
      testosterone: "60 ng/dL"
    },
    historicalVitals: {
      dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      heartRate: [70, 68, 69, 71, 67, 68, 70],
      bloodPressure: [
        { systolic: 118, diastolic: 78 },
        { systolic: 115, diastolic: 75 },
        { systolic: 116, diastolic: 76 },
        { systolic: 117, diastolic: 77 },
        { systolic: 114, diastolic: 74 },
        { systolic: 115, diastolic: 75 },
        { systolic: 118, diastolic: 78 }
      ]
    },
    consultationHistory: [
      { date: '2025-05-12', message: 'Regular check-up. Vitals stable. No issues detected.' },
    ]
  },
  'PATIENT-003': {
    vitals: {
      heartRate: "72 bpm",
      bloodPressure: "120/80 mmHg",
      spo2: "98%",
      temperature: "36.5°C",
      ecgStatus: "Normal Rhythm",
      cortisol: "15 mcg/dL",
      estrogen: "30 pg/mL",
      progesterone: "5 ng/mL",
      testosterone: "50 ng/dL"
    },
    historicalVitals: {
      dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      heartRate: [74, 72, 75, 71, 73, 72, 74],
      bloodPressure: [
        { systolic: 121, diastolic: 81 },
        { systolic: 120, diastolic: 80 },
        { systolic: 123, diastolic: 82 },
        { systolic: 119, diastolic: 79 },
        { systolic: 122, diastolic: 81 },
        { systolic: 120, diastolic: 80 },
        { systolic: 121, diastolic: 82 }
      ]
    },
    consultationHistory: [
      { date: '2025-05-15', message: 'First check-in. Vitals are within normal range. No specific concerns.' },
    ]
  },
};

function DoctorPatientData({ patientId }) {
  const patientData = mockPatientData[patientId];
  const patientName = patientId === 'PATIENT-001' ? 'Alice Johnson' : patientId === 'PATIENT-002' ? 'Bob Williams' : 'Charlie Brown';

  if (!patientData) {
    return <div className="patient-not-found">Patient data not found.</div>;
  }
  
  // Chart data for Heart Rate
  const heartRateChartData = {
    labels: patientData.historicalVitals.dates,
    datasets: [
      {
        label: 'Heart Rate (bpm)',
        data: patientData.historicalVitals.heartRate,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4,
      },
    ],
  };

  // Chart data for Blood Pressure
  const bloodPressureChartData = {
    labels: patientData.historicalVitals.dates,
    datasets: [
      {
        label: 'Systolic (mmHg)',
        data: patientData.historicalVitals.bloodPressure.map(d => d.systolic),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4,
      },
      {
        label: 'Diastolic (mmHg)',
        data: patientData.historicalVitals.bloodPressure.map(d => d.diastolic),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Vital Trends Over Time' },
    },
  };
  
  return (
    <div className="doctor-patient-data">
      <h3 className="patient-name-title">Patient: {patientName}</h3>
      
      {/* Current Vitals Section (reusing the VitalsDashboard component) */}
      <h4 className="data-section-title">Current Vitals</h4>
      <VitalsDashboard
        vitals={patientData.vitals}
        consultationMessage="Vitals are automatically updated."
        triggerSOS={() => alert(`Triggering SOS for ${patientName}...`)}
        userRole="doctor"
      />
      
      {/* New: Vital Trends Charts */}
      <div className="chart-section">
        <h4 className="data-section-title">Vital Trends</h4>
        <div className="chart-container">
          <Line options={chartOptions} data={heartRateChartData} />
        </div>
        <div className="chart-container">
          <Line options={chartOptions} data={bloodPressureChartData} />
        </div>
      </div>
      
      {/* Consultation History Section */}
      <h4 className="data-section-title">Consultation History</h4>
      <div className="consultation-history-list">
        {patientData.consultationHistory.map((entry, index) => (
          <div key={index} className="consultation-entry">
            <p className="consultation-date">{entry.date}</p>
            <p className="consultation-message">{entry.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DoctorPatientData;