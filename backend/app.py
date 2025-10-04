import os
import google.generativeai as genai
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import random
from datetime import datetime, date
import json

# Import the database configuration
from database import db, User, Vitals, Symptom

# Load environment variables from .env file
load_dotenv()

# Create a Flask application instance and Bcrypt instance
app = Flask(__name__)

# --- Database Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///medcare.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt = Bcrypt(app)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}})

# --- Configure the Gemini API ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Did you create the .env file?")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')

# --- Mock Data to seed the database initially ---
mock_users = {
    "patient1": {"password": "password123", "role": "patient"},
    "doctor1": {"password": "docpass", "role": "doctor"},
    "nurse1": {"password": "nurspass", "role": "nurse"}
}

# --- Proactive Health Alert Logic ---
def check_for_alerts(vitals):
    """
    Analyzes vitals and returns an alert message if conditions are met.
    """
    try:
        hr = int(vitals.heartRate.split(' ')[0])
        bp_systolic = int(vitals.bloodPressure.split('/')[0])
        bp_diastolic = int(vitals.bloodPressure.split('/')[1].split(' ')[0])
        temp = float(vitals.temperature.split('°')[0])

        if hr > 100 and bp_systolic > 130:
            return "ALERT: Elevated heart rate and blood pressure detected. It is recommended to contact your doctor immediately."
        if temp > 37.5:
            return "WARNING: Body temperature is high. This may indicate a fever. Please monitor your condition."
        if vitals.ecgStatus != "Normal Rhythm":
            return f"ALERT: Irregular ECG detected. It is recommended to schedule a checkup with your doctor."
        if float(vitals.spo2.split('%')[0]) < 95:
            return "WARNING: Low blood oxygen level detected. Please consult with a professional."
        
        return "Your vitals are looking good today. Keep up the good work!"

    except (ValueError, IndexError):
        return "Your vitals are looking good today. Keep up the good work!"

# --- API Endpoints ---

def create_tables_and_seed_data():
    """Create database tables and seed initial user data."""
    with app.app_context():
        db.create_all()
        if not User.query.first():
            print("Seeding initial users...")
            for username, data in mock_users.items():
                hashed_password = bcrypt.generate_password_hash(data["password"]).decode('utf-8')
                new_user = User(username=username, password_hash=hashed_password, role=data["role"])
                db.session.add(new_user)
            db.session.commit()
            print("Database seeded.")

@app.route('/')
def home():
    """Basic home route to confirm the API is running."""
    return "MedCare Backend API is running!"

@app.route('/api/login', methods=['POST'])
def login():
    """
    Handles user login requests with password hashing.
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Login successful!", "role": user.role}), 200
    else:
        return jsonify({"message": "Invalid username or password."}), 401

@app.route('/api/register', methods=['POST'])
def register():
    """
    Handles new user registration requests with password hashing.
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if not username or not password or not role:
        return jsonify({"message": "Username, password, and role are required."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists. Please choose a different one."}), 409
    
    if role not in ['patient', 'doctor', 'nurse']:
        return jsonify({"message": "Invalid role specified."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password_hash=hashed_password, role=role)
    db.session.add(new_user)
    db.session.commit()

    print(f"--- New User Registered ---")
    print(f"Username: {username}, Role: {role}")
    return jsonify({"message": f"Registration successful for {username} as {role}!"}), 200

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """
    Returns current vital signs data, with a mock update and proactive alerts.
    In a real system, this would be tied to a specific user.
    """
    mock_vitals = Vitals(
        heartRate=f"{random.randint(68, 110)} bpm",
        bloodPressure=f"{random.randint(115, 140)}/{random.randint(75, 90)} mmHg",
        spo2=f"{random.randint(90, 99)}%",
        temperature=f"{round(random.uniform(36.0, 38.0), 1)}°C",
        ecgStatus=random.choice(["Normal Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Irregular Rhythm"]),
        cortisol=f"{round(random.uniform(10, 20), 1)} mcg/dL",
        estrogen=f"{random.randint(25, 35)} pg/mL",
        progesterone=f"{random.randint(4, 6)} ng/mL",
        testosterone=f"{random.randint(45, 55)} ng/dL"
    )

    consultation_message = check_for_alerts(mock_vitals)

    response_data = {
        "vitals": {
            "heartRate": mock_vitals.heartRate,
            "bloodPressure": mock_vitals.bloodPressure,
            "spo2": mock_vitals.spo2,
            "temperature": mock_vitals.temperature,
            "ecgStatus": mock_vitals.ecgStatus,
            "cortisol": mock_vitals.cortisol,
            "estrogen": mock_vitals.estrogen,
            "progesterone": mock_vitals.progesterone,
            "testosterone": mock_vitals.testosterone,
        },
        "consultation": consultation_message
    }
    return jsonify(response_data)


@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    """
    Simulates sending an SOS alert.
    """
    return jsonify({"message": "SOS alert triggered successfully!"}), 200

@app.route('/api/consult', methods=['POST'])
def get_consultation():
    """
    Provides AI-based consultation using Google's Gemini API.
    """
    data = request.json
    user_query = data.get('query')
    current_readings = data.get('vitals', {})
    user_role = data.get('userRole', 'patient')

    prompt = f"""
    You are MedCare, a helpful and professional health assistant. Your purpose is to provide general health information and support.
    You must NOT provide specific medical diagnoses or advice. Always recommend consulting a medical professional for personal health concerns.

    The user is a {user_role}. Their current vital signs are as follows:
    - Heart Rate: {current_readings.get('heartRate')}
    - Blood Pressure: {current_readings.get('bloodPressure')}
    - SpO2: {current_readings.get('spo2')}
    - Temperature: {current_readings.get('temperature')}
    - ECG Status: {current_readings.get('ecgStatus')}
    - Cortisol: {current_readings.get('cortisol')}
    - Estrogen: {current_readings.get('estrogen')}
    - Progesterone: {current_readings.get('progesterone')}
    - Testosterone: {current_readings.get('testosterone')}

    The user asks: "{user_query}"

    Please provide a concise, empathetic, and professional response.
    """
    
    try:
        response = model.generate_content(prompt)
        ai_response = response.text
        
        if not ai_response.strip():
            ai_response = "Sorry, I couldn't generate a response at the moment. Please try again."

        return jsonify({"response": ai_response, "vitals_data": current_readings})

    except Exception as e:
        print(f"Error with Gemini API call: {e}")
        return jsonify({"response": "Sorry, I couldn't connect to the health assistant. Please check your API key and internet connection."}), 500

@app.route('/api/womens_health/insight', methods=['POST'])
def get_womens_health_insight():
    """
    Provides an advanced, personalized AI insight based on detailed user data.
    """
    data = request.json
    vitals = data.get('vitals', {})
    symptom_history = data.get('symptom_history', [])
    cycle_data = data.get('cycle_data', {})

    symptom_list_str = ""
    if symptom_history:
        symptom_list_str = "\n".join([f"- Date: {s['date']}, Symptom: {s['symptom']}" for s in symptom_history])
    else:
        symptom_list_str = "No symptoms have been logged yet."

    prompt = f"""
    You are MedCare, a professional health data analyst. Your task is to analyze the provided user data and identify any potential patterns or connections.
    You must NOT provide medical diagnoses or advice. Frame your response as an analysis of data trends.

    The user's current vitals are:
    - Estrogen: {vitals.get('estrogen', 'N/A')}
    - Progesterone: {vitals.get('progesterone', 'N/A')}
    - Other vitals: {vitals}

    The user's menstrual cycle data is:
    - Last period date: {cycle_data.get('lastPeriodDate', 'N/A')}
    - Next predicted period: {cycle_data.get('nextPeriodDate', 'N/A')}
    - Ovulation date: {cycle_data.get('ovulationDate', 'N/A')}

    The user has logged the following symptoms:
    {symptom_list_str}

    Based on this data, please identify any potential patterns or correlations between the logged symptoms, cycle dates, and hormone levels.
    Provide your analysis in a clear and easy-to-read format.
    """
    
    try:
        response = model.generate_content(prompt)
        ai_response = response.text
        
        if not ai_response.strip():
            ai_response = "Sorry, I couldn't generate an analysis. Please log more symptoms to help me identify patterns."

        return jsonify({"response": ai_response})

    except Exception as e:
        print(f"Error with Gemini API call for advanced insight: {e}")
        return jsonify({"response": "Sorry, I am unable to perform this analysis at the moment. Please try again later."}), 500

# Run the Flask app
if __name__ == '__main__':
    create_tables_and_seed_data()
    app.run(debug=True, port=5000)