import React from 'react';
import './LandingPage.css';

function LandingPage({ onLogin, onSignup }) {
    const highlights = [
        {
            title: 'Patient care in one place',
            text: 'Track vitals, consultations, and emergency support from a single secure dashboard.',
        },
        {
            title: 'Built for clinical teams',
            text: 'Doctors and nurses can move faster with role-based views designed for daily operations.',
        },
        {
            title: 'AI-powered guidance',
            text: 'Use the health assistant and insight tools to surface the most relevant next step.',
        },
    ];

    return (
        <div className="landing-page">
            <section className="landing-hero">
                <div className="landing-brand">MedCare</div>
                <h1>Health monitoring, emergency support, and clinical workflows in one place.</h1>
                <p className="landing-description">
                    MedCare helps patients, doctors, and nurses stay connected with live vitals, guided support,
                    and role-based portals for everyday care.
                </p>
                <div className="landing-actions">
                    <button type="button" className="primary-action" onClick={onLogin}>
                        Login
                    </button>
                    <button type="button" className="secondary-action" onClick={onSignup}>
                        Sign up
                    </button>
                </div>
            </section>

            <section className="landing-grid" aria-label="Project highlights">
                {highlights.map((item) => (
                    <article key={item.title} className="landing-card">
                        <h2>{item.title}</h2>
                        <p>{item.text}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}

export default LandingPage;