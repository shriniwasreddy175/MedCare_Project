import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './LoginPage';
import Chatbot from './components/Chatbot';
import VitalsDashboard from './components/VitalsDashboard';
import WomensHealth from './components/WomensHealth';
import DoctorPortal from './components/DoctorPortal';
import NursePortal from './components/NursePortal';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const [vitals, setVitals] = useState({
    heartRate: '-- bpm',
    bloodPressure: '--/-- mmHg',
    spo2: '--%',
    temperature: '--°C',
    ecgStatus: 'Loading...',
    cortisol: '-- mcg/dL',
    estrogen: '-- pg/mL',
    progesterone: '-- ng/mL',
    testosterone: '-- ng/dL'
  });
  const [consultationMessage, setConsultationMessage] = useState("Fetching health status...");
  const [chatbotMessages, setChatbotMessages] = useState([]);

  const API_URL = 'http://localhost:5000/api';

  const fetchVitals = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const response = await fetch(`${API_URL}/vitals`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setVitals(data.vitals);
      setConsultationMessage(data.consultation);
    } catch (error) {
      console.error("Error fetching vitals:", error);
      setConsultationMessage("Error fetching vitals. Please check the backend connection.");
    }
  }, [isLoggedIn, API_URL]);

  useEffect(() => {
    if (isLoggedIn && (userRole === 'patient' || userRole === 'doctor' || userRole === 'nurse')) {
      fetchVitals();
      const interval = setInterval(fetchVitals, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, userRole, fetchVitals]);

  const triggerSOS = async () => {
    if (!isLoggedIn) { alert("Please log in to trigger SOS."); return; }
    try {
      const response = await fetch(`${API_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'PATIENT-001',
          vitals: vitals,
          triggeringUserRole: userRole
        }),
      });
      const data = await response.json();
      alert(data.message);
      console.log("SOS Response:", data);
    } catch (error) {
      console.error("Error triggering SOS:", error);
      alert("Failed to trigger SOS. Check console for details.");
    }
  };

  const sendChatbotMessage = async (message) => {
    if (!isLoggedIn) { alert("Please log in to use the chatbot."); return; }
    const newUserMessage = { sender: 'user', text: message };
    setChatbotMessages(prevMessages => [...prevMessages, newUserMessage]);

    try {
      const response = await fetch(`${API_URL}/consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, vitals: vitals, userRole: userRole }),
      });
      const data = await response.json();
      const newBotMessage = { sender: 'bot', text: data.response };
      setChatbotMessages(prevMessages => [...prevMessages, newBotMessage]);
    } catch (error) {
      console.error("Error with chatbot:", error);
      const errorMessage = { sender: 'bot', text: "Sorry, I couldn't connect to the health assistant. Please try again later." };
      setChatbotMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const sendAdvancedInsight = async (payload) => {
    if (!isLoggedIn) { alert("Please log in to use this feature."); return; }
    try {
      const response = await fetch(`${API_URL}/womens_health/insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error with advanced insight:", error);
      return "Sorry, I couldn't get an advanced insight at the moment. Please try again later.";
    }
  };

  const handleLoginSuccess = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'patient') {
      setCurrentView('dashboard');
    } else if (role === 'doctor') {
      setCurrentView('doctor_portal');
    }else if (role === 'nurse') {
      setCurrentView('nurse_portal');
    }
    setChatbotMessages([]);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentView('dashboard');
    setChatbotMessages([]);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', roles: ['patient', 'doctor', 'nurse'] },
    { id: 'chatbot', label: 'Chatbot', roles: ['patient', 'doctor', 'nurse'] },
    { id: 'womens_health', label: 'Women\'s Health', roles: ['patient'] },
    { id: 'doctor_portal', label: 'Doctor Portal', roles: ['doctor'] },
    { id: 'nurse_portal', label: 'Nurse Portal', roles: ['nurse'] }
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  const renderCurrentView = () => {
    const currentNavItem = navItems.find(item => item.id === currentView);

    if (!currentNavItem || !currentNavItem.roles.includes(userRole)) {
      return <div className="access-denied">Access Denied: You do not have permission to view this page.</div>;
    }
    
    switch (currentView) {
      case 'dashboard':
        return <VitalsDashboard vitals={vitals} consultationMessage={consultationMessage} triggerSOS={triggerSOS} userRole={userRole} />;
      case 'chatbot':
        return <Chatbot messages={chatbotMessages} onSendMessage={sendChatbotMessage} />;
      case 'womens_health':
        return <WomensHealth vitals={vitals} sendAdvancedInsight={sendAdvancedInsight} />;
      case 'doctor_portal':
        return <DoctorPortal userRole={userRole} />;
      case 'nurse_portal':
        return <NursePortal userRole={userRole} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return isLoggedIn ? (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">MedCare</h1>
        <p className="app-subtitle">At Your FingerTips.</p>
        <nav className="nav-container">
          {visibleNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`nav-button ${currentView === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
          <button onClick={handleLogout} className="nav-button logout-button">
            Logout ({userRole})
          </button>
        </nav>
      </header>
      <main className="main-content">
        {renderCurrentView()}
      </main>
      <footer className="app-footer">
        <p>&copy; 2025 MedCare. All rights reserved.</p>
      </footer>
    </div>
  ) : (
    <LoginPage onLoginSuccess={handleLoginSuccess} />
  );
}

export default App;