import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import './WomensHealth.css';
import '../App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const AVERAGE_CYCLE_LENGTH = 28; // days
const AVERAGE_LUTEAL_PHASE = 14; // days
const PREGNANCY_LENGTH = 280; // days

function WomensHealth({ vitals, sendAdvancedInsight }) {
  const [activeTab, setActiveTab] = useState('cycle');
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [pregnancyDate, setPregnancyDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [logMessage, setLogMessage] = useState('');
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [insightMessage, setInsightMessage] = useState('');
  const today = new Date();

  // --- Cycle Tracking Calculations ---
  let cycleStatus = null;
  let nextPeriodDate = null;
  let ovulationDate = null;
  let fertileWindowStart = null;
  let fertileWindowEnd = null;
  let firstDayOfCycle = null;

  if (lastPeriodDate) {
    firstDayOfCycle = new Date(lastPeriodDate);
    const dayOfCycle = Math.ceil((today.getTime() - firstDayOfCycle.getTime()) / MILLISECONDS_IN_DAY);

    if (dayOfCycle <= 0) {
      cycleStatus = "Invalid start date.";
    } else if (dayOfCycle <= 5) {
      cycleStatus = "period";
    } else if (dayOfCycle >= 10 && dayOfCycle <= 17) {
      cycleStatus = "ovulation";
    } else if (dayOfCycle >= 20 && dayOfCycle <= 28) {
      cycleStatus = "pms";
    } else {
      cycleStatus = "normal";
    }

    nextPeriodDate = new Date(firstDayOfCycle.getTime() + (AVERAGE_CYCLE_LENGTH * MILLISECONDS_IN_DAY));
    ovulationDate = new Date(firstDayOfCycle.getTime() + ((AVERAGE_CYCLE_LENGTH - AVERAGE_LUTEAL_PHASE) * MILLISECONDS_IN_DAY));
    fertileWindowStart = new Date(ovulationDate.getTime() - (5 * MILLISECONDS_IN_DAY));
    fertileWindowEnd = new Date(ovulationDate.getTime() + (1 * MILLISECONDS_IN_DAY));
  }

  // --- Pregnancy Tracking Calculations ---
  let pregnancyWeeks = null;
  let estimatedDueDate = null;

  if (pregnancyDate) {
    const lmpDate = new Date(pregnancyDate);
    const dayOfPregnancy = Math.ceil((today.getTime() - lmpDate.getTime()) / MILLISECONDS_IN_DAY);
    pregnancyWeeks = Math.floor(dayOfPregnancy / 7);
    estimatedDueDate = new Date(lmpDate.getTime() + (PREGNANCY_LENGTH * MILLISECONDS_IN_DAY));
  }

  const getDayStatus = (date) => {
    if (!lastPeriodDate) return 'normal';
    const day = new Date(date).getDate();
    const month = new Date(date).getMonth();
    const year = new Date(date).getFullYear();

    const checkDate = (d) => d && d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;

    if (checkDate(nextPeriodDate) || (lastPeriodDate && new Date(lastPeriodDate).getMonth() === month && new Date(lastPeriodDate).getDate() === day)) return 'period';
    if (ovulationDate && checkDate(ovulationDate)) return 'ovulation';
    if (fertileWindowStart && fertileWindowEnd && date >= fertileWindowStart.getTime() && date <= fertileWindowEnd.getTime()) return 'fertile-window';

    return 'normal';
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1));

    return (
      <div className="cycle-calendar">
        {days.map(date => (
          <div key={date.getDate()} className={`calendar-day ${getDayStatus(date.getTime())} ${date.getDate() === today.getDate() ? 'today' : ''}`}>
            {date.getDate()}
          </div>
        ))}
      </div>
    );
  };

  const handleSymptomLog = (e) => {
    e.preventDefault();
    if (symptoms.trim()) {
      const newSymptomEntry = {
        date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        symptom: symptoms.trim()
      };
      setSymptomHistory(prevHistory => [...prevHistory, newSymptomEntry]);
      setLogMessage(`Logged symptoms for today: "${symptoms}".`);
      setSymptoms('');
    } else {
      setLogMessage('Please enter your symptoms to log them.');
    }
  };

  const handleGetInsight = async () => {
    setInsightMessage('Analyzing your data with AI...');
    const payload = {
      vitals: vitals,
      symptom_history: symptomHistory,
      cycle_data: {
        lastPeriodDate,
        nextPeriodDate: nextPeriodDate?.toDateString(),
        ovulationDate: ovulationDate?.toDateString()
      }
    };
    const response = await sendAdvancedInsight(payload);
    setInsightMessage(response);
  };

  // --- Symptom Visualization Data ---
  const symptomLabels = symptomHistory.map(entry => entry.date);
  const symptomData = symptomHistory.map(() => 1); // Simple count for each entry

  const barChartData = {
    labels: symptomLabels,
    datasets: [
      {
        label: 'Symptoms Logged',
        data: symptomData,
        backgroundColor: 'rgba(233, 30, 99, 0.5)',
        borderColor: 'rgba(233, 30, 99, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Symptom History' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  // --- Monthly Symptom Breakdown for Pie Chart ---
  const getMonthlySymptomData = () => {
    // Case 1: No period date set or no symptoms logged at all
    if (!lastPeriodDate || symptomHistory.length === 0) {
        return {
            labels: ['No Symptoms Logged Yet'],
            datasets: [{
                data: [1],
                backgroundColor: ['#E0E0E0'], // Default gray
                borderWidth: 0
            }]
        };
    }
    
    const startOfCycle = new Date(lastPeriodDate);
    const symptomsInCurrentCycle = symptomHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfCycle && entryDate <= today;
    });

    const symptomCounts = symptomsInCurrentCycle.reduce((acc, entry) => {
      const symptom = entry.symptom.toLowerCase().trim();
      acc[symptom] = (acc[symptom] || 0) + 1;
      return acc;
    }, {});

    // Case 2: Symptoms exist, but none in the current cycle
    if (Object.keys(symptomCounts).length === 0) {
        return {
            labels: ['No Symptoms Logged This Cycle'],
            datasets: [{
                data: [1],
                backgroundColor: ['#E0E0E0'],
                borderWidth: 0
            }]
        };
    }

    const labels = Object.keys(symptomCounts);
    const data = Object.values(symptomCounts);
    
    // Generate distinct colors for each symptom
    const colors = labels.map((_, index) => {
      const hue = (index * 137.508) % 360; // Use a golden angle approximation
      return `hsl(${hue}, 70%, 60%)`;
    });

    return {
      labels: labels,
      datasets: [
        {
            label: 'Symptom Count',
            data: data,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
        },
      ],
    };
  };

  const monthlySymptomData = getMonthlySymptomData();
  const firstDay = lastPeriodDate ? new Date(lastPeriodDate).toDateString() : 'N/A';
  const monthlyChartTitle = `Monthly Symptom Breakdown: ${firstDay} to ${today.toDateString()}`;

  return (
    <div className="womens-health-container">
      <h2 className="womens-health-title">Your Health & Cycle</h2>
      <p className="womens-health-subtitle">Track your cycle, log symptoms, and get personalized insights.</p>

      {/* Tab Navigation */}
      <div className="tab-container">
        <button className={`tab-button ${activeTab === 'cycle' ? 'active' : ''}`} onClick={() => setActiveTab('cycle')}>Cycle Tracker</button>
        <button className={`tab-button ${activeTab === 'pregnancy' ? 'active' : ''}`} onClick={() => setActiveTab('pregnancy')}>Pregnancy Tracker</button>
      </div>

      {/* Cycle Tracker Tab Content */}
      {activeTab === 'cycle' && (
        <div className="health-section">
          <h3 className="section-title">Menstrual Cycle & Hormone Insights</h3>
          <div className="form-group">
            <label htmlFor="lastPeriodDate">First Day of Last Period:</label>
            <input
              type="date"
              id="lastPeriodDate"
              value={lastPeriodDate}
              onChange={(e) => setLastPeriodDate(e.target.value)}
              className="date-input"
            />
          </div>
          {lastPeriodDate && (
            <div className="cycle-insights">
              <p>Your cycle day today is **Day {Math.ceil((today.getTime() - new Date(lastPeriodDate).getTime()) / MILLISECONDS_IN_DAY)}**.</p>
              {ovulationDate && <p>You are predicted to ovulate around **{ovulationDate.toDateString()}**.</p>}
              {nextPeriodDate && <p>Your next period is predicted to start around **{nextPeriodDate.toDateString()}**.</p>}
              {vitals.estrogen && <p className="hormone-insight">Current Estrogen: **{vitals.estrogen}**</p>}
              {vitals.progesterone && <p className="hormone-insight">Current Progesterone: **{vitals.progesterone}**</p>}
            </div>
          )}
          {renderCalendar()}
          <div className="legend-container">
            <span className="legend-item"><div className="legend-box period"></div> Period</span>
            <span className="legend-item"><div className="legend-box fertile-window"></div> Fertile Window</span>
            <span className="legend-item"><div className="legend-box ovulation"></div> Ovulation</span>
          </div>
        </div>
      )}

      {/* Pregnancy Tracker Tab Content */}
      {activeTab === 'pregnancy' && (
        <div className="health-section">
          <h3 className="section-title">Pregnancy Progress</h3>
          <p>This tracker uses the first day of your last period or estimated conception date to calculate your due date.</p>
          <div className="form-group">
            <label htmlFor="pregnancyDate">First day of last period or conception date:</label>
            <input
              type="date"
              id="pregnancyDate"
              value={pregnancyDate}
              onChange={(e) => setPregnancyDate(e.target.value)}
              className="date-input"
            />
          </div>
          {pregnancyDate && pregnancyWeeks >= 0 && (
            <div className="pregnancy-insights">
              <p>You are approximately **Week {pregnancyWeeks}** of pregnancy.</p>
              {estimatedDueDate && <p>Your estimated due date is **{estimatedDueDate.toDateString()}**.</p>}
              <p className="hormone-insight">Current Estrogen: **{vitals.estrogen}**</p>
              <p className="hormone-insight">Current Progesterone: **{vitals.progesterone}**</p>
              <p>The **progesterone** level is crucial for maintaining a healthy pregnancy.</p>
            </div>
          )}
        </div>
      )}

      {/* Symptom Log Section (shared between both tabs) */}
      <div className="health-section">
        <h3 className="section-title">Daily Symptom & Mood Log</h3>
        <form onSubmit={handleSymptomLog} className="symptom-form">
          <textarea
            className="symptom-input"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="How are you feeling today? (e.g., 'Headache', 'Bloating', 'Mood swings')"
          ></textarea>
          <button type="submit" className="symptom-button">Log Symptoms</button>
        </form>
        {logMessage && <p className="log-message">{logMessage}</p>}
      </div>

      {/* Symptom History Visualization */}
      {symptomHistory.length > 0 && (
        <div className="health-section">
          <h3 className="section-title">Symptom History</h3>
          <div className="chart-container">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
          
          {lastPeriodDate && (
            <div className="chart-container">
              <h4 className="chart-subtitle">{monthlyChartTitle}</h4>
              <Pie data={monthlySymptomData} />
            </div>
          )}
        </div>
      )}

      {/* Advanced AI Insight Section */}
      <div className="health-section advanced-insight-section">
        <h3 className="section-title">Advanced AI Insights</h3>
        <p>Get a personalized analysis based on your symptoms and vitals.</p>
        <button onClick={handleGetInsight} className="advanced-insight-button">Get Advanced Insight</button>
        {insightMessage && <p className="insight-response">{insightMessage}</p>}
      </div>
    </div>
  );
}

export default WomensHealth;