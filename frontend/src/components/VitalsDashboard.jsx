import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './VitalsDashboard.css';
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Mock historical data to simulate trends over the last 7 days
const mockHistoricalData = {
  heartRate: [75, 78, 72, 80, 76, 85, 82],
  bloodPressure: [
    { systolic: 125, diastolic: 82 },
    { systolic: 122, diastolic: 80 },
    { systolic: 128, diastolic: 85 },
    { systolic: 120, diastolic: 78 },
    { systolic: 124, diastolic: 81 },
    { systolic: 130, diastolic: 88 },
    { systolic: 127, diastolic: 84 }
  ],
  dates: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
};

function VitalsDashboard({ vitals, consultationMessage, triggerSOS, userRole }) {
  const isPatientOrMedicalStaff = userRole === 'patient' || userRole === 'doctor' || userRole === 'nurse';

  // Chart data for Heart Rate
  const heartRateChartData = {
    labels: mockHistoricalData.dates,
    datasets: [
      {
        label: 'Heart Rate (bpm)',
        data: mockHistoricalData.heartRate,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4,
      },
    ],
  };

  // Chart data for Blood Pressure
  const bloodPressureChartData = {
    labels: mockHistoricalData.dates,
    datasets: [
      {
        label: 'Systolic (mmHg)',
        data: mockHistoricalData.bloodPressure.map(d => d.systolic),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4,
      },
      {
        label: 'Diastolic (mmHg)',
        data: mockHistoricalData.bloodPressure.map(d => d.diastolic),
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
    <div className="card-container-grid">
      <div className="consultation-message-bar">
        <p className="consultation-message-text">{consultationMessage}</p>
        {isPatientOrMedicalStaff && (
          <button onClick={triggerSOS} className="sos-button">
            Trigger SOS!
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="card-header">Heart Rate</h3>
        <p className="card-value">{vitals.heartRate}</p>
        <p className="card-label">Normal: 60-100 bpm</p>
      </div>
      <div className="card">
        <h3 className="card-header">Blood Pressure</h3>
        <p className="card-value">{vitals.bloodPressure}</p>
        <p className="card-label">Normal: 90/60 - 120/80 mmHg</p>
      </div>
      <div className="card">
        <h3 className="card-header">SpO2</h3>
        <p className="card-value">{vitals.spo2}</p>
        <p className="card-label">Normal: &gt; 95%</p>
      </div>
      <div className="card">
        <h3 className="card-header">Body Temperature</h3>
        <p className="card-value">{vitals.temperature}</p>
        <p className="card-label">Normal: 36.1-37.2°C</p>
      </div>
      <div className="card">
        <h3 className="card-header">ECG Status</h3>
        <p className="card-value">{vitals.ecgStatus}</p>
        <p className="card-label">Real-time analysis</p>
      </div>
      <div className="card">
        <h3 className="card-header">Cortisol</h3>
        <p className="card-value">{vitals.cortisol}</p>
        <p className="card-label">Stress Hormone</p>
      </div>
      <div className="card">
        <h3 className="card-header">Estrogen</h3>
        <p className="card-value">{vitals.estrogen}</p>
        <p className="card-label">Female Hormone</p>
      </div>
      <div className="card">
        <h3 className="card-header">Progesterone</h3>
        <p className="card-value">{vitals.progesterone}</p>
        <p className="card-label">Female Hormone</p>
      </div>
      <div className="card">
        <h3 className="card-header">Testosterone</h3>
        <p className="card-value">{vitals.testosterone}</p>
        <p className="card-label">Male/Female Hormone</p>
      </div>

      {/* New Charting Section */}
      <div className="chart-section">
        <div className="chart-container">
          <Line options={chartOptions} data={heartRateChartData} />
        </div>
        <div className="chart-container">
          <Line options={chartOptions} data={bloodPressureChartData} />
        </div>
      </div>
    </div>
  );
}

export default VitalsDashboard;