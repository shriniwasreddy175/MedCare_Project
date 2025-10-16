# Import necessary libraries
import os
import google.generativeai as genai
import random
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

# Optional: Import Google Generative AI SDK (requires 'pip install google-genai')
# NOTE: This is wrapped in a try/except to allow running without an API key for development.
try:
    import google.generativeai as genai
except ImportError:
    print("Warning: Google GenAI SDK not installed. Chatbot will use internal mock logic.")
    genai = None

# Load environment variables from .env file (for database URL and secrets)
load_dotenv()

# --- Application Setup ---
app = Flask(__name__)

# --- Database Configuration ---
# Uses PostgreSQL URL from .env, falls back to SQLite for local simplicity
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
    "https://medcare-frontend-2z67.onrender.com" # Updated production URL
]}})

# --- Configure the Gemini API ---
api_key = os.getenv("GEMINI_API_KEY")
model = None
if api_key and genai:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash') 
        print("Gemini API configured successfully.")
    except Exception as e:
        print(f"Gemini API configuration failed: {e}")

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(100))
    # Relationship: One User (System account) can be linked to one Patient record
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
    
    # Relationship: Patient has multiple Vitals and Consultations
    vitals = db.relationship('VitalsRecord', backref='patient', lazy='dynamic')
    consultations = db.relationship('Consultation', backref='patient', lazy='dynamic')

class VitalsRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Vital signs (Stored as String to easily handle units like 'bpm', '%', 'mmHg')
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
    doctor_name = db.Column(db.String(100)) # Stores who logged the note (Doctor/Nurse/System)
    notes = db.Column(db.Text)
    alert_level = db.Column(db.String(20))
    escalated_by = db.Column(db.String(100))
    
# --- Seeding Data and Utility Functions ---

# Mock data for seeding
mock_users_and_patients = {
    "patient1": {"password": "password123", "role": "patient", "full_name": "Patient Alpha", "age": 35, "gender": "Male", "location": "Home"},
    "doctor1": {"password": "docpass", "role": "doctor", "full_name": "Dr. John Smith", "age": 40, "gender": "Male", "location": "Hospital A"},
    "nurse1": {"password": "nurspass", "role": "nurse", "full_name": "Nurse Jane Doe", "age": 30, "gender": "Female", "location": "Clinic B"},
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
                full_name=data["full_name"]
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
                )
                db.session.add(new_patient)
                
                # Create initial vitals for the patient (using String format)
                db.session.add(VitalsRecord(
                    patient_id=new_patient.id,
                    heart_rate="75 bpm", blood_pressure="120/80 mmHg", spo2="98%", 
                    temperature="36.6°C", ecg_status="Normal Rhythm", cortisol="15 mcg/dL",
                    estrogen="30 pg/mL", progesterone="5 ng/mL", testosterone="50 ng/dL"
                ))
                db.session.commit()
                print(f"Seeded Patient and initial Vitals for {data['full_name']}")


class VitalsMock:
    """Helper class to pass vital sign strings for check_for_alerts function."""
    def _init_(self, **entries):
        self._dict_.update(entries)
    
def check_for_alerts(vitals):
    """Analyzes vital signs and returns a consultation message or alert."""
    try:
        # Safely extract numeric values for analysis
        # Note: .split(' ')[0] removes the unit (e.g., 'bpm')
        hr = int(vitals.heart_rate.split(' ')[0]) if vitals.heart_rate and ' ' in vitals.heart_rate else 0
        bp_systolic = int(vitals.blood_pressure.split('/')[0]) if vitals.blood_pressure and '/' in vitals.blood_pressure else 0
        temp = float(vitals.temperature.split('°')[0]) if vitals.temperature and '°' in vitals.temperature else 0.0
        spo2 = float(vitals.spo2.split('%')[0]) if vitals.spo2 and '%' in vitals.spo2 else 0.0

        if hr > 115 or bp_systolic > 140 or vitals.ecg_status != "Normal Rhythm":
            return "ALERT: Critical vital sign combination detected. Contact doctor immediately."
        if temp > 37.5 or spo2 < 94:
            return "WARNING: Elevated temperature or low SpO2 detected. Monitor closely."
        
        return "Your vitals are looking good today. Keep up the good work!"

    except (ValueError, IndexError, AttributeError):
        # Handles cases where data might be "N/A" or improperly formatted
        return "Vitals data format error. System operational."

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
        return jsonify({
            "message": "Login successful!", 
            "role": user.role,
            "name": user.full_name
        }), 200
    else:
        return jsonify({"message": "Invalid username or password."}), 401

@app.route('/api/register', methods=['POST'])
def register():
    """Handles new user registration requests."""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    full_name = data.get('full_name', username)

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409
    
    if role not in ['patient', 'doctor', 'nurse']:
        return jsonify({"message": "Invalid role specified."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password_hash=hashed_password, role=role, full_name=full_name)
    db.session.add(new_user)
    db.session.commit()
    
    if role == 'patient':
        new_patient = Patient(user_id=new_user.id, name=full_name, age=None, gender="N/A", location="N/A")
        db.session.add(new_patient)
        
        # Create initial VitalsRecord placeholder for the patient
        db.session.add(VitalsRecord(
            patient_id=new_patient.id,
            heart_rate="70 bpm", blood_pressure="110/70 mmHg", spo2="97%", 
            temperature="36.5°C", ecg_status="Normal Rhythm", cortisol="12 mcg/dL",
            estrogen="30 pg/mL", progesterone="5 ng/mL", testosterone="50 ng/dL"
        ))
        
    db.session.commit()

    return jsonify({"message": f"Registration successful for {full_name} as {role}!"}), 200

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """Returns current vital signs data."""
    
    # Simulate dynamic vitals for the dashboard
    mock_vitals_data = {
        'heart_rate': f"{random.randint(68, 95)} bpm",
        'blood_pressure': f"{random.randint(110, 130)}/{random.randint(70, 85)} mmHg",
        'spo2': f"{random.randint(95, 99)}%",
        'temperature': f"{round(random.uniform(36.0, 37.5), 1)}°C",
        'ecg_status': random.choice(["Normal Rhythm", "Sinus Rhythm"]),
        'cortisol': f"{round(random.uniform(10, 20), 1)} mcg/dL",
        'estrogen': f"{random.randint(25, 35)} pg/mL",
        'progesterone': f"{random.randint(4, 6)} ng/mL",
        'testosterone': f"{random.randint(45, 55)} ng/dL"
    }
    
    vitals_obj = VitalsMock(**mock_vitals_data)
    consultation_message = check_for_alerts(vitals_obj)

    # Format the keys to match the frontend (e.g., heart_rate -> heartRate)
    frontend_vitals = {
        key.replace('_', ' ').title().replace(' ', ''): value 
        for key, value in mock_vitals_data.items()
    }
    
    response_data = {"vitals": frontend_vitals, "consultation": consultation_message}
    return jsonify(response_data)


@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    data = request.json
    print(f"--- SOS ALERT TRIGGERED: {data.get('patientId')} ---")
    
    # In a real app, this would save a Consultation entry as an SOS log
    
    return jsonify({"message": "SOS alert triggered successfully!"}), 200


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

    The user is a {user_role}. Their current vital signs are as follows: {current_readings}

    The user asks: "{user_query}"

    If user asks about vital signs, provide the latest readings from the provided list in a readable structure.
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
            return jsonify({"response": ai_response})
        except Exception as e:
            print(f"Error with Gemini API call: {e}")
            return jsonify({"response": "AI Assistant is offline. Please check the backend configuration."}), 500
    
    return jsonify({"response": ai_response})


@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Returns the list of patients and their latest vitals for the Doctor/Nurse Portal."""
    
    patient_query = Patient.query.all()
    patient_list = []
    
    for patient in patient_query:
        # Fetch the latest VitalsRecord for the patient
        latest_vitals = VitalsRecord.query.filter_by(patient_id=patient.id).order_by(VitalsRecord.timestamp.desc()).first()
        
        # Prepare Vitals Output
        if latest_vitals:
            vitals_output = {
                "heartRate": latest_vitals.heart_rate,
                "bloodPressure": latest_vitals.blood_pressure,
                "spo2": latest_vitals.spo2,
                "temperature": latest_vitals.temperature,
                "ecgStatus": latest_vitals.ecg_status,
                "alertTime": latest_vitals.timestamp.strftime("%H:%M")
            }
            # Use VitalsMock to check for alerts based on the latest record
            vitals_obj = VitalsMock(
                heart_rate=vitals_output["heartRate"],
                blood_pressure=vitals_output["bloodPressure"],
                spo2=vitals_output["spo2"],
                temperature=vitals_output["temperature"],
                ecg_status=vitals_output["ecgStatus"] or "Normal Rhythm"
            )
            alert_msg = check_for_alerts(vitals_obj)
            is_alert = "ALERT" in alert_msg or "WARNING" in alert_msg
        else:
            vitals_output = {"heartRate": "N/A", "bloodPressure": "N/A", "spo2": "N/A", "temperature": "N/A", "ecgStatus": "N/A", "alertTime": "N/A"}
            is_alert = False
            alert_msg = "No data recorded."

        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age or 30,
            "gender": patient.gender or "N/A",
            "location": patient.location,
            "hasAlert": is_alert,
            "alertMessage": alert_msg,
            "vitals": vitals_output
        }
        patient_list.append(patient_data)
        
    return jsonify(patient_list)


@app.route('/api/vitals/manual', methods=['POST'])
def manual_vitals_entry():
    """
    Receives manual vital sign data from the Nurse Portal and saves it to the VitalsRecord table.
    """
    data = request.json
    
    patient_name = data.get('patient_name')
    notes = data.get('notes')
    nurse_username = data.get('nurse_username', 'Unknown Nurse') 
    
    if not patient_name or not data.get('heart_rate'):
        return jsonify({"message": "Missing patient name or vital data."}), 400

    patient = Patient.query.filter_by(name=patient_name).first()
    if not patient:
        return jsonify({"message": f"Patient '{patient_name}' not found in the database. Cannot save record."}), 404

    # Prepare data for alert check
    vitals_data_for_check = {
        'heart_rate': data.get('heart_rate'),
        'blood_pressure': data.get('blood_pressure'),
        'spo2': data.get('spo2'),
        'temperature': data.get('temperature'),
        'ecg_status': data.get('ecg_status', "Manual Entry"),
    }
    
    vitals_obj = VitalsMock(**vitals_data_for_check)
    alert_message = check_for_alerts(vitals_obj)

    try:
        new_vitals = VitalsRecord(
            patient_id=patient.id,
            heart_rate=vitals_data_for_check['heart_rate'],
            blood_pressure=vitals_data_for_check['blood_pressure'],
            spo2=vitals_data_for_check['spo2'],
            temperature=vitals_data_for_check['temperature'],
            ecg_status=vitals_data_for_check['ecg_status'],
            cortisol=data.get('cortisol', "N/A"), 
            estrogen=data.get('estrogen', "N/A"),
            progesterone=data.get('progesterone', "N/A"),
            testosterone=data.get('testosterone', "N/A"),
        )
        db.session.add(new_vitals)
        
        # Log a consultation entry for the record, including any notes or alerts
        if notes or "ALERT" in alert_message or "WARNING" in alert_message:
            consultation_note = Consultation(
                patient_id=patient.id,
                doctor_name=nurse_username, 
                notes=f"MANUAL VITAL ENTRY by {nurse_username}. Observation: {notes or 'None'}. SYSTEM STATUS: {alert_message}",
                alert_level='high' if "ALERT" in alert_message else 'low',
                escalated_by=nurse_username
            )
            db.session.add(consultation_note)
            
        db.session.commit()
        return jsonify({
            "message": f"Vitals saved successfully for {patient_name}. System analysis: {alert_message}",
            "alert": "ALERT" in alert_message or "WARNING" in alert_message
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Database error during manual entry: {e}")
        return jsonify({"message": "Server error while saving data."}), 500


# Run the Flask app
if __name__ == '__main__':
    with app.app_context():
        # Create all tables if they don't exist
        db.create_all()
        
        # Seed initial data only if the database is empty
        if not User.query.first():
            seed_database()
            print("Database seeded with initial users.")
        else:
            print("Database already contains user data. Skipping seeding.")
            
    app.run(debug=True, port=5000)