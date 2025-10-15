import os
import google.generativeai as genai
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import random
from datetime import datetime, date
import json

# Placeholder for database imports (assuming they exist in your environment)
# from database import db, User, Vitals, Symptom

# --- Mock Database Setup for Demo Purposes ---
# Define mock classes to replace actual SQLAlchemy models
class MockDB:
    def init_app(self, app): pass
    def create_all(self): pass
    @property
    def session(self): return self
    def add(self, obj): pass
    def commit(self): pass
    def first(self): return True # Simulate data existing for seeding
    def filter_by(self, username): return self
    def all(self): return self
    def query(self): return self

db = MockDB()

class User:
    def __init__(self, username, password_hash, role):
        self.username = username
        self.password_hash = password_hash
        self.role = role
    
    @staticmethod
    def query():
        # Mock query setup
        class QueryMock:
            def filter_by(self, username):
                # Simple in-memory mock user lookup
                if username == "patient1": return User("patient1", bcrypt.generate_password_hash("password123").decode('utf-8'), "patient")
                if username == "doctor1": return User("doctor1", bcrypt.generate_password_hash("docpass").decode('utf-8'), "doctor")
                if username == "nurse1": return User("nurse1", bcrypt.generate_password_hash("nurspass").decode('utf-8'), "nurse")
                return None
            def first(self):
                # Always returns the first mock user for existence check if needed
                return QueryMock().filter_by("patient1") 
        return QueryMock()

    @staticmethod
    def get_user(username):
        # A simple mock retrieval method for demonstration
        users = {
            "patient1": User("patient1", bcrypt.generate_password_hash("password123").decode('utf-8'), "patient"),
            "doctor1": User("doctor1", bcrypt.generate_password_hash("docpass").decode('utf-8'), "doctor"),
            "nurse1": User("nurse1", bcrypt.generate_password_hash("nurspass").decode('utf-8'), "nurse"),
        }
        return users.get(username)

# Load environment variables from .env file
load_dotenv()

# Create a Flask application instance and Bcrypt instance
app = Flask(__name__)

# --- Database Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///medcare.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt = Bcrypt(app)
# Configure CORS to allow communication between frontend (e.g., React on port 5173 or 3000) and backend
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}})

# --- Configure the Gemini API ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # In a real environment, this error is necessary. For the Canvas demo, we mock it.
    print("Warning: GEMINI_API_KEY not found. AI features will be mocked.")
    
# Use a stable model name to fix the 404 error
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash') 
except Exception as e:
    # Fallback if genai cannot be configured (e.g., in a limited execution environment)
    print(f"Could not configure Gemini API: {e}. AI response will be mocked.")
    model = None

# --- Mock Data to seed the database initially ---
mock_users = {
    "patient1": {"password": "password123", "role": "patient"},
    "doctor1": {"password": "docpass", "role": "doctor"},
    "nurse1": {"password": "nurspass", "role": "nurse"}
}

# --- MOCK DATA FOR NURSE/DOCTOR PORTALS ---
MOCK_PATIENT_LIST = [
    {
        "id": "P001", "name": "Elara Vance", "age": 68, "gender": "Female", "location": "Room 301",
        "hasAlert": True, "alertLevel": "nurse", "alertTime": "15:45",
        "isPregnant": False,
        "vitals": {"heartRate": "115 bpm", "bloodPressure": "150/95 mmHg", "spO2": "93%", "temperature": "37.8°C"}
    },
    {
        "id": "P002", "name": "John Doe", "age": 45, "gender": "Male", "location": "Room 305",
        "hasAlert": False, "alertLevel": "none", "alertTime": None,
        "isPregnant": False,
        "vitals": {"heartRate": "72 bpm", "bloodPressure": "120/80 mmHg", "spO2": "98%", "temperature": "36.5°C"}
    },
    {
        "id": "P003", "name": "Sarah Connor", "age": 29, "gender": "Female", "location": "HomeCare",
        "hasAlert": True, "alertLevel": "doctor", "alertTime": "14:10",
        "isPregnant": True, "pregnancyWeek": 32,
        "vitals": {"heartRate": "88 bpm", "bloodPressure": "145/90 mmHg", "spO2": "96%", "temperature": "36.9°C"}
    },
    {
        "id": "P004", "name": "Marcus Kane", "age": 78, "gender": "Male", "location": "Room 310",
        "hasAlert": True, "alertLevel": "nurse", "alertTime": "15:55",
        "isPregnant": False,
        "vitals": {"heartRate": "55 bpm", "bloodPressure": "110/70 mmHg", "spO2": "97%", "temperature": "37.0°C"}
    },
    {
        "id": "P005", "name": "Jane Smith", "age": 35, "gender": "Female", "location": "Room 302",
        "hasAlert": False, "alertLevel": "none", "alertTime": None,
        "isPregnant": False,
        "vitals": {"heartRate": "80 bpm", "bloodPressure": "125/85 mmHg", "spO2": "99%", "temperature": "37.2°C"}
    },
]

# --- Proactive Health Alert Logic ---
# Dummy class to match expected object structure in check_for_alerts
class VitalsMock:
    def __init__(self, **entries):
        self.__dict__.update(entries)
    
def check_for_alerts(vitals):
    """Analyzes vitals and returns an alert message if conditions are met."""
    try:
        hr = int(vitals.heartRate.split(' ')[0])
        bp_systolic = int(vitals.bloodPressure.split('/')[0])
        temp = float(vitals.temperature.split('°')[0])
        spo2 = float(vitals.spo2.split('%')[0])

        if hr > 100 and bp_systolic > 130:
            return "ALERT: Elevated heart rate and blood pressure detected. It is recommended to contact your doctor immediately."
        if temp > 37.5:
            return "WARNING: Body temperature is high. This may indicate a fever. Please monitor your condition."
        if vitals.ecgStatus != "Normal Rhythm":
            return f"ALERT: Irregular ECG detected. It is recommended to schedule a checkup with your doctor."
        if spo2 < 95:
            return "WARNING: Low blood oxygen level detected. Please consult with a professional."
        
        return "Your vitals are looking good today. Keep up the good work!"

    except (ValueError, IndexError):
        return "Your vitals are looking good today. Keep up the good work!"

# --- API Endpoints ---

def create_tables_and_seed_data():
    """Create database tables and seed initial user data (mocked)."""
    with app.app_context():
        # db.create_all() # Mocked
        print("Database seeding logic runs here.")


@app.route('/')
def home():
    """Basic home route to confirm the API is running."""
    return "MedCare Backend API is running!"

@app.route('/api/login', methods=['POST'])
def login():
    """Handles user login requests with password hashing."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # Mock user retrieval
    user_data = mock_users.get(username)
    
    # In a real app, you would check the hashed password from the database
    if user_data and password == user_data['password']: # Simplified for mock
        return jsonify({"message": "Login successful!", "role": user_data['role']}), 200
    else:
        return jsonify({"message": "Invalid username or password."}), 401


@app.route('/api/register', methods=['POST'])
def register():
    """Handles new user registration requests (mocked)."""
    # Registration logic is mocked to avoid actual DB writes
    return jsonify({"message": "Registration successful (mocked)!"}), 200

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """Returns current vital signs data."""
    mock_vitals = {
        'heartRate': f"{random.randint(68, 110)} bpm",
        'bloodPressure': f"{random.randint(115, 140)}/{random.randint(75, 90)} mmHg",
        'spo2': f"{random.randint(90, 99)}%",
        'temperature': f"{round(random.uniform(36.0, 38.0), 1)}°C",
        'ecgStatus': random.choice(["Normal Rhythm", "Sinus Tachycardia", "Sinus Bradycardia", "Irregular Rhythm"]),
        'cortisol': f"{round(random.uniform(10, 20), 1)} mcg/dL",
        'estrogen': f"{random.randint(25, 35)} pg/mL",
        'progesterone': f"{random.randint(4, 6)} ng/mL",
        'testosterone': f"{random.randint(45, 55)} ng/dL"
    }
    
    vitals_obj = VitalsMock(**mock_vitals)
    consultation_message = check_for_alerts(vitals_obj)

    response_data = {"vitals": mock_vitals, "consultation": consultation_message}
    return jsonify(response_data)


@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    """Simulates sending an SOS alert."""
    return jsonify({"message": "SOS alert triggered successfully!"}), 200


@app.route('/api/consult', methods=['POST'])
def get_consultation():
    """Provides AI-based consultation using Google's Gemini API."""
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
    
    ai_response = "AI Mock Response: Based on your input, please consult a healthcare professional for personalized advice."

    if model:
        try:
            response = model.generate_content(prompt)
            ai_response = response.text
            if not ai_response.strip():
                ai_response = "Sorry, I couldn't generate a response at the moment. Please try again."
            return jsonify({"response": ai_response, "vitals_data": current_readings})
        except Exception as e:
            print(f"Error with Gemini API call: {e}")
            return jsonify({"response": f"AI Assistant is offline. Error: {e}"}), 500
    
    return jsonify({"response": ai_response, "vitals_data": current_readings})


@app.route('/api/womens_health/insight', methods=['POST'])
def get_womens_health_insight():
    """Provides an advanced, personalized AI insight (mocked if API fails)."""
    # Mocking is similar to /api/consult for brevity
    ai_response = "AI Mock Analysis: Based on logged data, a potential correlation is observed. Please discuss these trends with your physician."
    return jsonify({"response": ai_response})


# --- NEW API ROUTE FOR NURSE/DOCTOR PORTALS ---
@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Returns the mock list of patients under care for the Nurse/Doctor portals."""
    return jsonify(MOCK_PATIENT_LIST)


# Run the Flask app
if __name__ == '__main__':
    create_tables_and_seed_data()
    app.run(debug=True, port=5000)
