import os
import google.generativeai as genai
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate  # NEW: For managing database migrations
from dotenv import load_dotenv
import random
from datetime import datetime
import json

# Load environment variables from .env file
load_dotenv()

# --- Application Setup ---
app = Flask(__name__)

# --- Database Configuration ---
# 1. NEW: Reads the PostgreSQL URI from Render environment variables
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL") 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "a_very_secret_key_please_change_me") 

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)

# Configure CORS
# 2. NEW: Added the live Render frontend domain to allow cross-origin requests
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173", 
    "http://localhost:3000",
    "https://medcare-api-i5cm.onrender.com" # E.g., https://medcare-frontend.onrender.com
]}})

# --- Configure the Gemini API ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found. AI features will be mocked.")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash') 
except Exception as e:
    print(f"Could not configure Gemini API. AI response will be mocked.")
    model = None

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'patient', 'doctor', 'nurse'
    patient_ref = db.relationship('Patient', backref='system_user', uselist=False) # Link to patient data

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    location = db.Column(db.String(50))
    is_pregnant = db.Column(db.Boolean, default=False)
    pregnancy_week = db.Column(db.Integer)
    
    # Relationships
    vitals = db.relationship('VitalsRecord', backref='patient', lazy='dynamic')
    consultations = db.relationship('Consultation', backref='patient', lazy='dynamic')

class VitalsRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Vital signs
    heart_rate = db.Column(db.String(20))
    blood_pressure = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    temperature = db.Column(db.String(20))
    ecg_status = db.Column(db.String(50))
    cortisol = db.Column(db.String(20))
    estrogen = db.Column(db.String(20))
    progesterone = db.Column(db.String(20))
    testosterone = db.Column(db.String(20))

class Consultation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    doctor_name = db.Column(db.String(100))
    notes = db.Column(db.Text)
    alert_level = db.Column(db.String(20)) # 'none', 'nurse', 'doctor'
    escalated_by = db.Column(db.String(100)) # e.g., 'Nurse Jane'
    

# --- Seeding Data and Utility Functions ---

# Mock data for seeding (now includes Patient data)
mock_users_and_patients = {
    "patient1": {"password": "password123", "role": "patient", "name": "Patient Alpha", "age": 40, "gender": "Male", "location": "Home"},
    "doctor1": {"password": "docpass", "role": "doctor", "name": "Dr. Smith"},
    "nurse1": {"password": "nurspass", "role": "nurse", "name": "Nurse Jane"},
}

def seed_database():
    """Seeds initial users, patients, and vital records for demonstration."""
    for username, data in mock_users_and_patients.items():
        if not User.query.filter_by(username=username).first():
            hashed_password = bcrypt.generate_password_hash(data["password"]).decode('utf-8')
            new_user = User(username=username, password_hash=hashed_password, role=data["role"])
            db.session.add(new_user)
            db.session.commit()
            
            if data['role'] == 'patient':
                new_patient = Patient(
                    user_id=new_user.id,
                    name=data['name'],
                    age=data.get('age'),
                    gender=data.get('gender'),
                    location=data.get('location'),
                )
                db.session.add(new_patient)
                db.session.commit()
                
                # Create initial vitals for the patient
                db.session.add(VitalsRecord(
                    patient_id=new_patient.id,
                    heart_rate="75 bpm", blood_pressure="120/80 mmHg", spo2="98%", 
                    temperature="36.6°C", ecg_status="Normal Rhythm", cortisol="15 mcg/dL"
                ))
                db.session.commit()
                print(f"Seeded Patient and initial Vitals for {data['name']}")

def create_tables_and_seed_data():
    """Create database tables and seed initial user data."""
    with app.app_context():
        # WARNING: In a real environment with Flask-Migrate, you typically DON'T use db.create_all()
        # You would use 'flask db init' and 'flask db upgrade' from the command line.
        # This is for initial setup fallback only.
        # db.create_all() 
        if not User.query.first():
            seed_database()
            print("Database seeded.")
        else:
            print("Database already contains data.")


# --- Proactive Health Alert Logic (remains the same) ---
class VitalsMock:
    # ... (remains the same)
    def __init__(self, **entries):
        self.__dict__.update(entries)
    # ... 
    
def check_for_alerts(vitals):
    # ... (remains the same)
    try:
        hr = int(vitals.heart_rate.split(' ')[0]) # NOTE: Changed from vitals.heartRate to vitals.heart_rate for model consistency
        bp_systolic = int(vitals.blood_pressure.split('/')[0])
        temp = float(vitals.temperature.split('°')[0])
        spo2 = float(vitals.spo2.split('%')[0])

        if hr > 100 and bp_systolic > 130:
            return "ALERT: Elevated heart rate and blood pressure detected. It is recommended to contact your doctor immediately."
        if temp > 37.5:
            return "WARNING: Body temperature is high. This may indicate a fever. Please monitor your condition."
        if vitals.ecg_status != "Normal Rhythm":
            return f"ALERT: Irregular ECG detected. It is recommended to schedule a checkup with your doctor."
        if spo2 < 95:
            return "WARNING: Low blood oxygen level detected. Please consult with a professional."
        
        return "Your vitals are looking good today. Keep up the good work!"

    except (ValueError, IndexError, AttributeError):
        return "Your vitals are looking good today. Keep up the good work!"

# --- API Endpoints ---

@app.route('/')
def home():
    return "MedCare Backend API is running!"

@app.route('/api/login', methods=['POST'])
def login():
    """Handles user login requests by querying the actual database and checking the hashed password."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    # CRITICAL FIX: Use bcrypt.check_password_hash to securely verify the password
    # This works for both seeded users and newly registered users.
    if user and bcrypt.check_password_hash(user.password_hash, password):
        # Successful login, user.role is retrieved from the database
        return jsonify({"message": "Login successful!", "role": user.role}), 200
    else:
        # Failed login attempt
        return jsonify({"message": "Invalid username or password."}), 401

@app.route('/api/register', methods=['POST'])
def register():
    """Handles new user registration requests."""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409
    
    if role not in ['patient', 'doctor', 'nurse']:
        return jsonify({"message": "Invalid role specified."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password_hash=hashed_password, role=role)
    db.session.add(new_user)
    db.session.commit()
    
    # Optionally add a Patient record if the role is 'patient' (simplified)
    if role == 'patient':
        new_patient = Patient(user_id=new_user.id, name=username, age=30, gender="N/A", location="N/A")
        db.session.add(new_patient)
        db.session.commit()

    return jsonify({"message": f"Registration successful for {username} as {role}!"}), 200

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """Returns the latest vitals for a patient (mocked for ANY patient now)."""
    # NOTE: In a real app, you would fetch the logged-in patient's ID and query their latest VitalsRecord.
    
    # For now, simulate real-time data structure with placeholder values
    mock_vitals_data = {
        'heart_rate': f"{random.randint(68, 110)} bpm",
        'blood_pressure': f"{random.randint(115, 140)}/{random.randint(75, 90)} mmHg",
        'spo2': f"{random.randint(90, 99)}%",
        'temperature': f"{round(random.uniform(36.0, 38.0), 1)}°C",
        'ecg_status': random.choice(["Normal Rhythm", "Sinus Tachycardia", "Irregular Rhythm"]),
        'cortisol': f"{round(random.uniform(10, 20), 1)} mcg/dL",
        'estrogen': f"{random.randint(25, 35)} pg/mL",
        'progesterone': f"{random.randint(4, 6)} ng/mL",
        'testosterone': f"{random.randint(45, 55)} ng/dL"
    }
    
    vitals_obj = VitalsMock(**mock_vitals_data)
    consultation_message = check_for_alerts(vitals_obj)

    # Format the keys to match the frontend (e.g., heart_rate -> heartRate)
    frontend_vitals = {k.replace('_', 'R' if k == 'heart_rate' else 'P' if k == 'blood_pressure' else 'S' if k == 'ecg_status' else k): v for k, v in mock_vitals_data.items()}
    frontend_vitals = {
        'heartRate': mock_vitals_data['heart_rate'],
        'bloodPressure': mock_vitals_data['blood_pressure'],
        'spo2': mock_vitals_data['spo2'],
        'temperature': mock_vitals_data['temperature'],
        'ecgStatus': mock_vitals_data['ecg_status'],
        'cortisol': mock_vitals_data['cortisol'],
        'estrogen': mock_vitals_data['estrogen'],
        'progesterone': mock_vitals_data['progesterone'],
        'testosterone': mock_vitals_data['testosterone'],
    }
    
    response_data = {"vitals": frontend_vitals, "consultation": consultation_message}
    return jsonify(response_data)


@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    return jsonify({"message": "SOS alert triggered successfully!"}), 200


@app.route('/api/consult', methods=['POST'])
def get_consultation():
    # ... (AI logic remains the same, but uses corrected keys: heartRate -> heart_rate etc. if querying DB)
    data = request.json
    user_query = data.get('query')
    current_readings = data.get('vitals', {})
    user_role = data.get('userRole', 'patient')

    prompt = f"""
    You are MedCare, a helpful and professional health assistant. Your purpose is to provide general health information and support.
    You must NOT provide specific medical diagnoses or advice.

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

    If user asks vital signs, provide the latest readings in readable structure like sr.no, vital name, reading, descriptions.
    If user asks for medical advice, remind them you are not a doctor and suggest consulting a healthcare professional.

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
    ai_response = "AI Mock Analysis: Based on logged data, a potential correlation is observed. Please discuss these trends with your physician."
    return jsonify({"response": ai_response})


# --- REAL API ROUTE FOR NURSE/DOCTOR PORTALS ---
@app.route('/api/patients', methods=['GET'])
def get_patients():
    """
    Returns the list of patients under care by querying the database.
    NOTE: Currently returns ALL patients with mock alert status.
    """
    patients = Patient.query.all()
    patient_list = []
    
    for patient in patients:
        # NOTE: Implement real alert logic here based on patient's latest VitalsRecord
        is_alert = random.choice([True, False]) 
        alert_level = random.choice(['nurse', 'doctor', 'none']) if is_alert else 'none'
        
        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "location": patient.location,
            "hasAlert": is_alert, 
            "alertLevel": alert_level,
            "alertTime": "N/A", # Needs real implementation
            "isPregnant": patient.is_pregnant,
            "vitals": {
                "heartRate": f"{random.randint(60, 110)} bpm",
                "bloodPressure": f"{random.randint(110, 140)}/{random.randint(70, 90)} mmHg",
                "spO2": f"{random.randint(95, 99)}%",
                "temperature": f"{round(random.uniform(36.0, 37.5), 1)}°C"
            }
        }
        patient_list.append(patient_data)
        
    return jsonify(patient_list)


# Run the Flask app
if __name__ == '__main__':
    with app.app_context():
        # Check if the database and initial tables are set up via Flask-Migrate
        # For first run:
        # 1. flask db init
        # 2. flask db migrate -m "Initial models"
        # 3. flask db upgrade
        
        # Then, seed the data:
        if not User.query.first():
            seed_database()
            print("Database seeded.")

    app.run(debug=True, port=5000)