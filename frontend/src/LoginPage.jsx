import React, { useState } from 'react';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // New for registration
  const [role, setRole] = useState('patient'); // Default role for registration
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // New state to toggle forms

  const API_URL = 'https://medcare-api-i5cm.onrender.com'; 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.role);
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error("Login API error:", err);
      setError('Network error or server unreachable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message + " Please log in.");
        setIsRegistering(false); // Switch back to login form
        setUsername(''); // Clear fields
        setPassword('');
        setConfirmPassword('');
        setRole('patient');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error("Registration API error:", err);
      setError('Network error or server unreachable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Inline Styles ---
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #e3f2fd, #bbdefb)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif'
  };

  const authBoxStyle = { // Renamed from loginBoxStyle to be generic
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: '24px'
  };

  const formGroupStyle = {
    marginBottom: '20px',
    textAlign: 'left'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '16px',
    color: '#4a5568'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  };

  const selectStyle = { // New style for role dropdown
    ...inputStyle, // Inherit input styles
    appearance: 'none', // Remove default arrow
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234a5568%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1976D2',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    opacity: loading ? 0.7 : 1,
    marginTop: '10px' // Added margin
  };
  // Note: Hover styles for inline CSS need more advanced techniques or external CSS.

  const toggleLinkStyle = {
    color: '#1976D2',
    cursor: 'pointer',
    marginTop: '20px',
    fontSize: '15px',
    textDecoration: 'underline'
  };

  const errorStyle = {
    color: '#ef4444',
    marginTop: '15px',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <div style={authBoxStyle}>
        <h2 style={titleStyle}>MedCare {isRegistering ? 'Register' : 'Login'}</h2>
        
        {isRegistering ? (
          // Registration Form
          <form onSubmit={handleRegister}>
            <div style={formGroupStyle}>
              <label htmlFor="regUsername" style={labelStyle}>Username:</label>
              <input
                type="text"
                id="regUsername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label htmlFor="regPassword" style={labelStyle}>Password:</label>
              <input
                type="password"
                id="regPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label htmlFor="role" style={labelStyle}>Role:</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
              </select>
            </div>
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        ) : (
          // Login Form
          <form onSubmit={handleLogin}>
            <div style={formGroupStyle}>
              <label htmlFor="username" style={labelStyle}>Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label htmlFor="password" style={labelStyle}>Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {error && <p style={errorStyle}>{error}</p>}

        <p style={toggleLinkStyle} onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Login' : 'Don\'t have an account? Register'}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
