import os
import google.generativeai as genai
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
import random
from datetime import datetime
import json
import requests

# Load environment variables from .env file
load_dotenv()

# --- Application Setup ---
app = Flask(__name__)

# --- Database Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "sqlite:///medcare.db") 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "a_very_secret_key_please_change_me") 

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173", 
    "http://localhost:3000",
    "https://medcare-frontend-2z67.onrender.com"
]}})

# --- Configure the Gemini API ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found. AI features will be mocked.")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash') 
except Exception:
    model = None

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=True) 
    patient_ref = db.relationship('Patient', backref='system_user', uselist=False)

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    location = db.Column(db.String(50))
    is_pregnant = db.Column(db.Boolean, default=False)
    pregnancy_week = db.Column(db.Integer)
    guardian_phone = db.Column(db.String(30)) 
    
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
    alert_level = db.Column(db.String(20))
    escalated_by = db.Column(db.String(100))
    

# --- Seeding Data and Utility Functions ---
mock_users_and_patients = {
    "patient1": {"password": "password123", "role": "patient", "full_name": "Patient Alpha", "age": 35, "gender": "Male", "location": "Home"},
    "doctor1": {"password": "docpass", "role": "doctor", "full_name": "Dr. Smith", "age": 40, "gender": "Male", "location": "Hospital A"},
    "nurse1": {"password": "nurspass", "role": "nurse", "full_name": "Nurse Jane", "age": 30, "gender": "Female", "location": "Clinic B"},
}

def seed_database():
    """Seeds initial users, patients, and vital records for demonstration."""
    for username, data in mock_users_and_patients.items():
        if not User.query.filter_by(username=username).first():
            hashed_password = bcrypt.generate_password_hash(data["password"]).decode('utf-8')
            new_user = User(
                username=username, 
                password_hash=hashed_password, 
                role=data["role"],
                full_name=data["full_name"],
                email=f"{username}@medcare.com"
            )
            db.session.add(new_user)
            db.session.commit() 

            if data['role'] == 'patient':
                new_patient = Patient(
                    user_id=new_user.id,
                    name=data['full_name'], 
                    age=data.get('age'),
                    gender=data.get('gender'),
                    location=data.get('location'),
                    guardian_phone="555-0101"
                )
                db.session.add(new_patient)
                db.session.commit() 

                db.session.add(VitalsRecord(
                    patient_id=new_patient.id,
                    heart_rate="75 bpm", blood_pressure="120/80 mmHg", spo2="98%", 
                    temperature="36.6°C", ecg_status="Normal Rhythm", cortisol="15 mcg/dL"
                ))
                db.session.commit()
                print(f"Seeded Patient and initial Vitals for {data['full_name']}")

def create_tables_and_seed_data():
    """Create database tables and seed initial user data."""
    with app.app_context():
        if not User.query.first():
            seed_database()
        else:
            for user_data in mock_users_and_patients.values():
                user = User.query.filter_by(username=user_data['username']).first()
                if user and not user.full_name:
                    user.full_name = user_data['full_name']
                    db.session.commit()
            print("Database already contains data. Run migrations if models changed.")


class VitalsMock:
    def __init__(self, **entries):
        self.__dict__.update(entries)
    
def check_for_alerts(vitals):
    """
    Analyzes vital signs and returns an alert message AND level.
    """
    try:
        hr = int(vitals.heart_rate.split(' ')[0])
        bp_systolic = int(vitals.blood_pressure.split('/')[0])
        temp = float(vitals.temperature.split('°')[0])
        spo2 = float(vitals.spo2.split('%')[0])

        # CRITICAL ALERTS
        if (hr > 120 and bp_systolic > 140) or spo2 < 92:
            return "ALERT: Critical vitals detected (HR/BP or SpO2). Escalation recommended.", 'doctor'
        
        # NURSE-LEVEL ALERTS
        if (hr > 100 and bp_systolic > 130) or temp > 37.8 or spo2 < 95:
            return "WARNING: Vitals are outside normal range. Please review.", 'nurse'
        
        return "Your vitals are looking good today. Keep up the good work!", 'none'

    except (ValueError, IndexError, AttributeError):
        return "Vitals data format error. System operational.", 'none'

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
    
    if user and bcrypt.check_password_hash(user.password_hash, password):
        
        patient_id = None
        # NEW: If the user is a patient, find their linked patient record ID
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=user.id).first()
            if patient:
                patient_id = patient.id

        return jsonify({
            "message": "Login successful!", 
            "role": user.role,
            "name": user.full_name,
            "patient_id": patient_id  # FIX: Send patient_id to the frontend
        }), 200
    else:
        return jsonify({"message": "Invalid username or password."}), 401

@app.route('/api/register', methods=['POST'])
def register():
    """Handles new user registration requests, capturing all patient profile data."""
    data = request.json
    
    # 1. Core User Fields (Required for all roles)
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    full_name = data.get('full_name')
    email = data.get('email')
    
    if not username or not password or not role or not full_name or not email:
        return jsonify({"message": "Missing required core fields (Username, Password, Name, Email)."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409
    
    if role not in ['patient', 'doctor', 'nurse']:
        return jsonify({"message": "Invalid role specified."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    # 2. Create User Record
    new_user = User(
        username=username, 
        password_hash=hashed_password, 
        role=role, 
        full_name=full_name,
        email=email 
    )
    db.session.add(new_user)
    
    # 3. Consolidate creation into a single transaction (Final Fix)
    try:
        db.session.flush() # Forces insertion of new_user to get ID before proceeding
        
        # 4. Create Patient Record (Conditional for 'patient' role)
        if role == 'patient':
            # Patient-specific fields
            age = data.get('age')
            gender = data.get('gender')
            location = data.get('location')
            guardian_phone = data.get('guardian_phone')
            
            new_patient = Patient(
                user_id=new_user.id, # Now guaranteed to exist after flush
                name=full_name,
                age=age,
                gender=gender,
                location=location,
                guardian_phone=guardian_phone
            )
            db.session.add(new_patient)
            db.session.flush() # Force insertion of patient to get ID
            
            # Create initial VitalsRecord placeholder
            initial_vitals = VitalsRecord(
                patient_id=new_patient.id, # Now guaranteed to exist after patient flush
                heart_rate="70 bpm", blood_pressure="110/70 mmHg", spo2="97%", 
                temperature="36.5°C", ecg_status="Normal Rhythm"
            )
            db.session.add(initial_vitals)
            
        db.session.commit() # FINAL COMMIT
        return jsonify({"message": f"Registration successful for {full_name} as {role}!"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Database Integrity Error during registration: {e}")
        return jsonify({"message": "Registration failed due to a server error (Database Integrity)."}), 500

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """
    Returns the current vital signs data for Patient Alpha (ID 1).
    Data is persistent if found in the DB, or shows 'N/A' if the device hasn't logged data yet.
    """
    
    # NOTE: In a production app, this ID would be determined by the logged-in user.
    patient_alpha_id = 1 
    latest_vitals = VitalsRecord.query.filter_by(patient_id=patient_alpha_id).order_by(VitalsRecord.timestamp.desc()).first()

    if latest_vitals:
        # Data found in DB (Either Manual Entry or Live Stream)
        vitals_data = {
            'heart_rate': latest_vitals.heart_rate,
            'blood_pressure': latest_vitals.blood_pressure,
            'spo2': latest_vitals.spo2,
            'temperature': latest_vitals.temperature,
            'ecg_status': latest_vitals.ecg_status or "Normal Rhythm",
            'cortisol': latest_vitals.cortisol or "N/A",
            'estrogen': latest_vitals.estrogen or "N/A",
            'progesterone': latest_vitals.progesterone or "N/A",
            'testosterone': latest_vitals.testosterone or "N/A",
        }
    else:
        # Data not found (New user, or device not yet connected)
        vitals_data = {
            'heart_rate': "N/A", 
            'blood_pressure': "N/A", 
            'spo2': "N/A", 
            'temperature': "N/A",
            'ecg_status': "Device Not Connected", # CLEAR STATUS FOR FRONTEND
            'cortisol': "-- mcg/dL",
            'estrogen': "-- pg/mL",
            'progesterone': "-- ng/mL",
            'testosterone': "-- ng/dL",
        }
    
    # Check for alerts using the determined data
    vitals_obj = VitalsMock(**vitals_data)
    consultation_message = check_for_alerts(vitals_obj)
    
    # Check for the initial "Not Connected" status to override general message
    if vitals_data['ecg_status'] == "Device Not Connected":
         consultation_message = "Status: Device is offline. Waiting for first data stream."


    # Format the keys to match the frontend (e.g., heart_rate -> heartRate)
    frontend_vitals = {
        'heartRate': vitals_data['heart_rate'],
        'bloodPressure': vitals_data['blood_pressure'],
        'spo2': vitals_data['spo2'],
        'temperature': vitals_data['temperature'],
        'ecgStatus': vitals_data['ecg_status'],
        'cortisol': vitals_data['cortisol'],
        'estrogen': vitals_data['estrogen'],
        'progesterone': vitals_data['progesterone'],
        'testosterone': vitals_data['testosterone'],
    }
    
    response_data = {"vitals": frontend_vitals, "consultation": consultation_message}
    return jsonify(response_data)


@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    """
    Triggers an SOS alert.
    Receives a patient_id, finds their record, and returns critical contact info.
    """
    data = request.json
    patient_id_raw = data.get('patientId')

    if not patient_id_raw:
        return jsonify({"message": "SOS Failed: No patient ID provided."}), 400

    try:
        # CRITICAL FIX: Cast the incoming ID (which might be a string) to an integer
        patient_id = int(patient_id_raw)
    except (TypeError, ValueError):
        return jsonify({"message": "SOS Failed: Invalid patient ID format."}), 400

    # Look up patient by integer ID
    patient = Patient.query.get(patient_id) 

    if not patient:
        return jsonify({"message": f"SOS Failed: Patient record {patient_id} not found."}), 404
        
    # Log this SOS as a critical consultation entry
    sos_note = Consultation(
        patient_id=patient.id,
        doctor_name="SOS System",
        notes=f"SOS ALERT TRIGGERED by user. Guardian Contact: {patient.guardian_phone}. Location: {patient.location}.",
        alert_level='doctor', 
        escalated_by='Patient SOS'
    )
    db.session.add(sos_note)
    db.session.commit()

    return jsonify({
        "message": "SOS Alert Triggered! Medical staff and guardian have been notified.",
        "guardian_phone": patient.guardian_phone,
        "patient_location": patient.location
    }), 200

@app.route('/api/consult', methods=['POST'])
def get_consultation():
    """Handles chatbot requests using Gemini API (if configured) or mock logic."""
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


@app.route('/api/vitals/manual', methods=['POST'])
def manual_vitals_entry():
    """
    UPDATED: Saves manual vitals AND creates a state-aware Consultation alert.
    """
    data = request.json
    
    patient_name = data.get('patient_name')
    notes = data.get('notes')
    nurse_name = data.get('nurse_id', 'Unknown Nurse') 
    
    if not patient_name or not data.get('heart_rate'):
        return jsonify({"message": "Missing patient name or vital data."}), 400

    patient = Patient.query.filter_by(name=patient_name).first()
    if not patient:
        return jsonify({"message": f"Patient '{patient_name}' not found in the database."}), 404

    # Prepare data for alert check
    vitals_data_for_check = {
        'heart_rate': data.get('heart_rate'),
        'blood_pressure': data.get('blood_pressure'),
        'spo2': data.get('spo2'),
        'temperature': data.get('temperature'),
        'ecg_status': data.get('ecg_status', "Manual Entry"),
    }
    
    vitals_obj = VitalsMock(**vitals_data_for_check)
    # Get both the message AND the alert_level
    alert_message, alert_level = check_for_alerts(vitals_obj) 

    try:
        new_vitals = VitalsRecord(
            patient_id=patient.id,
            heart_rate=vitals_data_for_check['heart_rate'],
            blood_pressure=vitals_data_for_check['blood_pressure'],
            spo2=vitals_data_for_check['spo2'],
            temperature=vitals_data_for_check['temperature'],
            ecg_status=vitals_data_for_check['ecg_status'],
        )
        db.session.add(new_vitals)
        
        # Log a consultation entry with the correct alert_level
        if notes or alert_level != 'none':
            consultation_note = Consultation(
                patient_id=patient.id,
                doctor_name=nurse_name, 
                notes=f"MANUAL VITAL ENTRY by {nurse_name}. OBSERVATION: {notes or 'None'}. SYSTEM STATUS: {alert_message}",
                alert_level=alert_level, # Use the dynamic alert_level
                escalated_by=nurse_name if alert_level != 'none' else None
            )
            db.session.add(consultation_note)
            
        db.session.commit()
        return jsonify({
            "message": f"Vitals saved successfully for {patient_name}. System analysis: {alert_message}",
            "alert": alert_level != 'none'
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Database error during manual entry: {e}")
        return jsonify({"message": "Server error while saving data."}), 500

# --- NEW API ROUTE: LIVE ARDUINO VITAL INGESTION ---
@app.route('/api/vitals/live', methods=['POST'])
def live_vitals_ingestion():
    """
    Receives raw vital sign data directly from the Arduino/ESP device and saves it.
    """
    data = request.json
    
    patient_id = data.get('patient_id') 
    
    if not patient_id:
        return jsonify({"message": "Missing patient ID."}), 400

    patient = Patient.query.get(patient_id) 
    if not patient:
        return jsonify({"message": f"Patient ID {patient_id} not found."}), 404

    new_vitals = VitalsRecord(
        patient_id=patient.id,
        heart_rate=data.get('hr'),
        blood_pressure=data.get('bp'),
        spo2=data.get('spo2_val'),
        temperature=data.get('temp_val'),
        ecg_status=data.get('ecg_status', 'Device Stream'),
    )
    
    try:
        db.session.add(new_vitals)
        
        db.session.add(Consultation(
            patient_id=patient.id,
            doctor_name="Device Stream", 
            notes=f"AUTOMATED STREAM: HR={new_vitals.heart_rate}, BP={new_vitals.blood_pressure}",
            alert_level='low', 
            escalated_by='System'
        ))
        
        db.session.commit()
        
        return jsonify({"message": "Vitals successfully logged."}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Database error during live ingestion: {e}")
        return jsonify({"message": "Server error while saving live vitals."}), 500

@app.route('/api/patients', methods=['GET'])
def get_patients():
    """
    UPDATED: Returns the patient list, using the Consultation table 
    to determine the *true* alert status (not just vitals).
    """
    patient_query = Patient.query.all()
    patient_list = []
    
    for patient in patient_query:
        latest_vitals = VitalsRecord.query.filter_by(patient_id=patient.id).order_by(VitalsRecord.timestamp.desc()).first()
        
        # --- NEW ALERT LOGIC ---
        # Find the most recent UNRESOLVED alert for this patient
        active_alert = Consultation.query.filter(
            Consultation.patient_id == patient.id,
            Consultation.alert_level.in_(['nurse', 'doctor'])
        ).order_by(Consultation.timestamp.desc()).first()

        is_alert = False
        alert_level = 'none'
        escalated_by = None
        
        if active_alert:
            is_alert = True
            alert_level = active_alert.alert_level
            escalated_by = active_alert.escalated_by
        # --- END NEW LOGIC ---

        if latest_vitals:
            patient_vitals_output = {
                "heartRate": latest_vitals.heart_rate,
                "bloodPressure": latest_vitals.blood_pressure,
                "spo2": latest_vitals.spo2,
                "temperature": latest_vitals.temperature,
            }
            alert_time = latest_vitals.timestamp.strftime("%H:%M")
        else:
            patient_vitals_output = { "heartRate": "N/A", "bloodPressure": "N/A", "spo2": "N/A", "temperature": "N/A" }
            alert_time = "N/A"

        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age or 30,
            "gender": patient.gender or "N/A",
            "location": patient.location,
            "hasAlert": is_alert, 
            "alertLevel": alert_level, # Now accurately 'nurse' or 'doctor'
            "alertTime": alert_time,
            "escalatedBy": escalated_by, # NEW: Pass escalation source
            "isPregnant": patient.is_pregnant,
            "vitals": patient_vitals_output 
        }
        patient_list.append(patient_data)
        
    return jsonify(patient_list)

@app.route('/api/patient/<int:patient_id>/details', methods=['GET'])
def get_patient_details(patient_id):
    """
    Fetches comprehensive data for a single patient, including demographics, 
    recent vitals history for charting, and full consultation history.
    """
    
    patient = Patient.query.get_or_404(patient_id)
    
    vitals_history_query = VitalsRecord.query.filter_by(patient_id=patient.id).order_by(VitalsRecord.timestamp.desc()).limit(30).all()
    
    # --- CRITICAL FIX: Add explicit check for non-empty string before processing ---
    def safe_split(value, delimiter):
        # Returns None if value is None or an empty string, otherwise splits and returns the first part
        return value.split(delimiter)[0] if value and delimiter in value else value

    def safe_int(value):
        # Returns None if value is not present or cannot be cast to int
        return int(value) if value and value.strip() and value.split(' ')[0].isdigit() else None

    vitals_history_formatted = {
        "dates": [v.timestamp.strftime("%Y-%m-%d %H:%M") for v in reversed(vitals_history_query)],
        
        # FIXED: Robust error handling for Heart Rate and Blood Pressure components
        "heartRate": [safe_int(safe_split(v.heart_rate, ' ')) for v in reversed(vitals_history_query)],
        "systolic": [safe_int(safe_split(v.blood_pressure, '/')) for v in reversed(vitals_history_query)],
        "diastolic": [safe_int(safe_split(safe_split(v.blood_pressure, '/'), ' ')) for v in reversed(vitals_history_query)],
        
        # FIXED: Robust error handling for SpO2 and Temperature
        "spo2": [float(v.spo2.split('%')[0]) if v.spo2 and '%' in v.spo2 else None for v in reversed(vitals_history_query)],
        "temperature": [float(v.temperature.split('°')[0]) if v.temperature and '°' in v.temperature else None for v in reversed(vitals_history_query)],
    }
    
    # ... (consultations_query and formatting remain the same) ...
    
    # 3. Fetch ALL Consultation History
    consultations_query = Consultation.query.filter_by(patient_id=patient.id).order_by(Consultation.timestamp.desc()).all()
    
    consultations_formatted = [{
        "date": c.timestamp.strftime("%Y-%m-%d %H:%M"),
        "doctor": c.doctor_name,
        "notes": c.notes,
        "alertLevel": c.alert_level,
        "escalatedBy": c.escalated_by
    } for c in consultations_query]
    
    # 4. Construct the final JSON response
    response_data = {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "location": patient.location,
            "isPregnant": patient.is_pregnant,
            "pregnancyWeek": patient.pregnancy_week,
            "guardianPhone": patient.guardian_phone
        },
        "vitals_history": vitals_history_formatted,
        "consultations": consultations_formatted
    }
    
    return jsonify(response_data)

@app.route('/api/patient/<int:patient_id>/escalate', methods=['POST'])
def escalate_case(patient_id):
    """
    Allows a nurse to escalate a 'nurse' level alert to a 'doctor' level alert.
    Requires: 'nurse_name' in JSON payload.
    """
    data = request.json
    nurse_name = data.get('nurse_name', 'Unknown Nurse')
    
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"message": "Patient not found."}), 404

    # Find the most recent 'nurse' level alert to escalate
    alert_to_escalate = Consultation.query.filter(
        Consultation.patient_id == patient_id,
        Consultation.alert_level == 'nurse'
    ).order_by(Consultation.timestamp.desc()).first()

    if not alert_to_escalate:
        return jsonify({"message": "No active 'nurse' level alert found to escalate."}), 404
        
    try:
        # Update the alert status
        alert_to_escalate.alert_level = 'doctor'
        alert_to_escalate.escalated_by = nurse_name
        alert_to_escalate.notes = (alert_to_escalate.notes or "") + \
            f" | ESCALATED TO DOCTOR by {nurse_name}."
            
        db.session.commit()
        return jsonify({
            "message": f"Case for {patient.name} escalated to Doctor.",
            "patient_id": patient_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Database error during escalation: {e}")
        return jsonify({"message": "Failed to escalate case due to server error."}), 500


@app.route('/api/patient/<int:patient_id>/acknowledge', methods=['POST'])
def acknowledge_case(patient_id):
    """
    UPDATED: Formally acknowledges and RESOLVES all active alerts for a patient.
    Requires: 'doctor_name' in JSON payload.
    """
    data = request.json
    doctor_name = data.get('doctor_name', 'Unknown Doctor')
    
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"message": "Patient not found."}), 404

    # Find ALL active alerts ('nurse' or 'doctor') and resolve them
    active_alerts = Consultation.query.filter(
        Consultation.patient_id == patient_id,
        Consultation.alert_level.in_(['nurse', 'doctor'])
    ).all()

    if not active_alerts:
        return jsonify({"message": "No active alerts found for this patient."}), 404

    try:
        for alert in active_alerts:
            alert.alert_level = 'resolved' # This is the "Stable" status
            alert.notes = (alert.notes or "") + \
                f" | CASE ACKNOWLEDGED AND RESOLVED by {doctor_name}."
        
        db.session.commit()
        return jsonify({
            "message": f"Case acknowledged and resolved by {doctor_name}. Triage status updated.",
            "patient_id": patient_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Database error during acknowledgment: {e}")
        return jsonify({"message": "Failed to log acknowledgment due to server error."}), 500

@app.route('/api/patient/<int:patient_id>/add_note', methods=['POST'])
def add_patient_note(patient_id):
    """
    Saves a formal medical note provided by the doctor to the Consultation history.
    Requires: 'doctor_name' and 'notes_content' in JSON payload.
    """
    data = request.json
    doctor_name = data.get('doctor_name', 'Unknown Doctor')
    notes_content = data.get('notes_content')
    
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"message": "Patient not found."}), 404
    
    if not notes_content:
        return jsonify({"message": "Note content is required."}), 400

    try:
        # Create a new Consultation entry with the doctor's note
        db.session.add(Consultation(
            patient_id=patient_id,
            doctor_name=doctor_name,
            notes=f"DOCTOR'S NOTE ({doctor_name}): {notes_content}",
            alert_level='none', # A note is not an alert
            escalated_by='Doctor'
        ))
        
        db.session.commit()
        return jsonify({
            "message": f"Note saved successfully for {patient.name}.",
            "patient_id": patient_id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Database error saving note: {e}")
        return jsonify({"message": "Failed to save note due to server error."}), 500


@app.route('/api/admin/cleanup', methods=['POST'])
def cleanup_test_users():
    """
    Deletes all users from the database except for the initial seeded accounts (patient1, doctor1, nurse1).
    """
    protected_usernames = set(mock_users_and_patients.keys())
    users_to_delete = User.query.filter(User.username.notin_(protected_usernames)).all()
    deleted_count = 0
    
    try:
        for user in users_to_delete:
            patient = Patient.query.filter_by(user_id=user.id).first()
            
            if patient:
                patient_id = patient.id
                
                # Delete all Vitals/Consultation Records linked to this patient
                VitalsRecord.query.filter_by(patient_id=patient_id).delete(synchronize_session=False)
                Consultation.query.filter_by(patient_id=patient_id).delete(synchronize_session=False)
                
                db.session.delete(patient)
            
            db.session.delete(user)
            deleted_count += 1
            
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully cleaned up {deleted_count} test user(s). Only seeded accounts remain.",
            "deleted_count": deleted_count
        }), 200
    
    except Exception as e:
        db.session.rollback()
        print(f"Cleanup failed: {e}")
        return jsonify({"message": "Database cleanup failed due to an internal error."}), 500


# Run the Flask app
if __name__ == '__main__':
    with app.app_context():
        if not User.query.first():
            seed_database()
            print("Database seeded.")

    app.run(debug=True, port=5000)
