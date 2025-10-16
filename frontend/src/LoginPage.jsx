import React, { useState } from 'react';
import './LoginPage.css'; // Importing dedicated CSS for modularity

const API_URL = 'https://medcare-api-i5cm.onrender.com/api'; 

function LoginPage({ onLoginSuccess }) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    
    // State for Login Form
    const [loginData, setLoginData] = useState({
        username: '',
        password: '',
    });

    // State for comprehensive Registration Form (Includes all fields for PATIENT role)
    const [registerData, setRegisterData] = useState({
        // Core Fields
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'patient',
        email: '',
        
        // Patient Fields
        age: '',
        gender: '',
        location: '',
        guardian_phone: '',
    });

    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegisterChange = (e) => {
        const { name, value } = e.target;
        setRegisterData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const data = await response.json();

            if (response.ok) {
                // Pass role and name upon successful login
                onLoginSuccess(data.role, data.name); 
            } else {
                setMessage(data.message || "Login failed. Check credentials.");
            }
        } catch (error) {
            setMessage("Network error or server unreachable. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (registerData.password !== registerData.confirmPassword) {
            setMessage("Error: Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                username: registerData.username,
                password: registerData.password,
                full_name: registerData.full_name,
                role: registerData.role,
                email: registerData.email,
            };

            // Conditionally add specific patient data if role is 'patient'
            if (registerData.role === 'patient') {
                payload.age = registerData.age;
                payload.gender = registerData.gender;
                payload.location = registerData.location;
                payload.guardian_phone = registerData.guardian_phone; // NEW FIELD
            }

            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message + " You can now log in.");
                setIsRegistering(false); // Switch to login view
            } else {
                setMessage(data.message || "Registration failed. Please check inputs.");
            }
        } catch (error) {
            setMessage("Network error or server unreachable. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderLoginForm = () => (
        <div className="auth-box">
            <h2 className="form-title">MedCare Login</h2>
            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        name="username"
                        value={loginData.username}
                        onChange={handleLoginChange}
                        required
                        disabled={loading}
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        required
                        disabled={loading}
                        className="input-field"
                    />
                </div>
                <button type="submit" className="button button-login" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p className="form-footer">
                Don't have an account? <a href="#" onClick={() => setIsRegistering(true)}>Register</a>
            </p>
        </div>
    );

    const renderRegisterForm = () => (
        <div className="auth-box registration-form">
            <h2 className="form-title">MedCare Registration</h2>
            <form onSubmit={handleRegister}>
                <div className="role-selector">
                    <label className="label-block">Registering as:</label>
                    <select name="role" value={registerData.role} onChange={handleRegisterChange} className="select-field">
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="nurse">Nurse</option>
                    </select>
                </div>
                
                <div className="form-grid">
                    {/* CORE USER FIELDS */}
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value={registerData.full_name} onChange={handleRegisterChange} required className="input-field" />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={registerData.email} onChange={handleRegisterChange} required className="input-field" />
                    </div>
                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" name="username" value={registerData.username} onChange={handleRegisterChange} required className="input-field" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" value={registerData.password} onChange={handleRegisterChange} required className="input-field" />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" name="confirmPassword" value={registerData.confirmPassword} onChange={handleRegisterChange} required className="input-field" />
                    </div>
                </div>

                {/* PATIENT-SPECIFIC FIELDS */}
                {registerData.role === 'patient' && (
                    <div className="patient-fields">
                        <h3 className="section-header">Patient Profile Data</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Age</label>
                                <input type="number" name="age" value={registerData.age} onChange={handleRegisterChange} required className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select name="gender" value={registerData.gender} onChange={handleRegisterChange} required className="select-field">
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group full-width">
                                <label>Location/Address</label>
                                <input type="text" name="location" value={registerData.location} onChange={handleRegisterChange} required className="input-field" />
                            </div>
                            <div className="form-group full-width">
                                <label>Guardian Phone Number</label>
                                <input type="tel" name="guardian_phone" value={registerData.guardian_phone} onChange={handleRegisterChange} required className="input-field" />
                            </div>
                        </div>
                    </div>
                )}

                <button type="submit" className="button button-register" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Account'}
                </button>
            </form>
            <p className="form-footer">
                Already have an account? <a href="#" onClick={() => setIsRegistering(false)}>Login</a>
            </p>
        </div>
    );

    return (
        <div className="login-page-container">
            <header className="app-header">
                <h1 className="app-title">MedCare</h1>
                <p className="app-subtitle">Your AI-Powered Health Companion</p>
            </header>
            <main className="login-main">
                <p className={`status-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>
                {isRegistering ? renderRegisterForm() : renderLoginForm()}
            </main>
        </div>
    );
}

export default LoginPage;
