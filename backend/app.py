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

# Load environment variables from .env file
load_dotenv()

# --- Application Setup ---
app = Flask(__name__)

# --- Database Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL","sqlite:///medcare.db") 
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
    full_name = db.Column(db.String(100)) # NEW: Added full name column
    patient_ref = db.relationship('Patient', backref='system_user', uselist=False)

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=True) # Made nullable to accommodate non-patient users
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    location = db.Column(db.String(50))
    is_pregnant = db.Column(db.Boolean, default=False)
    pregnancy_week = db.Column(db.Integer)
    
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
    doctor_name = db.Column(db.String(100)) # Reusing this field to store nurse/doctor name
    notes = db.Column(db.Text)
    alert_level = db.Column(db.String(20))
    escalated_by = db.Column(db.String(100))
    

# --- Seeding Data and Utility Functions ---

# Mock data for seeding (now includes Patient data)
mock_users_and_patients = {
    "patient1": {"password": "password123", "role": "patient", "full_name": "Patient Alpha", "age": 35, "gender": "Male", "location": "Home"},
    "doctor1": {"password": "docpass", "role": "doctor", "full_name": "Dr. Smith", "age": 40, "gender": "Male", "location": "Home"},
    "nurse1": {"password": "nurspass", "role": "nurse", "full_name": "Nurse Jane", "age": 30, "gender": "Female", "location": "Home"},
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
                full_name=data["full_name"] # NEW: Saving full name
            )
            db.session.add(new_user)
            db.session.commit()
            
            if data['role'] == 'patient':
                new_patient = Patient(
                    user_id=new_user.id,
                    name=data['full_name'], # Using full_name as patient record name
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
                print(f"Seeded Patient and initial Vitals for {data['full_name']}")

def create_tables_and_seed_data():
    """Create database tables and seed initial user data."""
    with app.app_context():
        # Check if users exist before seeding
        if not User.query.first():
            seed_database()
        else:
            # IMPORTANT: For existing DBs, ensure 'full_name' is populated
            for user_data in mock_users_and_patients.values():
                user = User.query.filter_by(username=user_data['username']).first()
                if user and not user.full_name:
                    user.full_name = user_data['full_name']
                    db.session.commit()
            
            # This is complex in real life, but the key is running migrations/upgrades
            print("Database already contains data. Run migrations if models changed.")


class VitalsMock:
    def __init__(self, **entries):
        self.__dict__.update(entries)
    
def check_for_alerts(vitals):
    # Logic remains the same, adjusted for database model attributes
    try:
        hr = int(vitals.heart_rate.split(' ')[0])
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
    
    # Simple mock password check against the seeded password
    mock_password = mock_users_and_patients.get(username, {}).get("password")

    if user and bcrypt.check_password_hash(user.password_hash, password):
        # FIX: Return user's full name upon successful login
        return jsonify({
            "message": "Login successful!", 
            "role": user.role,
            "name": user.full_name # NEW: Return the full name
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
    full_name = data.get('full_name', username) # Assume full name is passed or use username

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
        
    db.session.commit()

    return jsonify({"message": f"Registration successful for {full_name} as {role}!"}), 200

@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    """Returns current vital signs data."""
    # Logic remains the same, mock vitals structure used for immediate response
    mock_vitals_data = {
        'heart_rate': f"{random.randint(68, 110)} bpm",
        'blood_pressure': f"{random.randint(115, 140)}/{random.randint(75, 90)} mmHg",
        'spo2': f"{random.randint(90, 99)}%",
        'temperature': f"{round(random.uniform(36.0, 38.0), 1)}°C",
        'ecg_status': random.choice(["Normal Rhythm(1200–2800)"]),
        'cortisol': f"{round(random.uniform(10, 20), 1)} mcg/dL",
        'estrogen': f"{random.randint(25, 35)} pg/mL",
        'progesterone': f"{random.randint(4, 6)} ng/mL",
        'testosterone': f"{random.randint(45, 55)} ng/dL"
    }
    
    vitals_obj = VitalsMock(**mock_vitals_data)
    consultation_message = check_for_alerts(vitals_obj)

    # Format the keys to match the frontend (e.g., heart_rate -> heartRate)
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


@app.route('/api/vitals/manual', methods=['POST'])
def manual_vitals_entry():
    """
    Receives manual vital sign data from the Nurse Portal and saves it to the VitalsRecord table.
    """
    data = request.json
    
    patient_name = data.get('patient_name')
    notes = data.get('notes')
    nurse_name = data.get('nurse_id', 'Unknown Nurse') # Get nurse name from POST data
    
    if not patient_name or not data.get('heart_rate'):
        return jsonify({"message": "Missing patient name or vital data."}), 400

    patient = Patient.query.filter_by(name=patient_name).first()
    if not patient:
        return jsonify({"message": f"Patient '{patient_name}' not found in the database. Cannot save record."}), 404

    new_vitals = VitalsRecord(
        patient_id=patient.id,
        heart_rate=data.get('heart_rate'),
        blood_pressure=data.get('blood_pressure'),
        spo2=data.get('spo2'),
        temperature=data.get('temperature'),
        ecg_status="Manual Entry",
    )
    
    vitals_obj = VitalsMock(
        heart_rate=new_vitals.heart_rate,
        blood_pressure=new_vitals.blood_pressure,
        spo2=new_vitals.spo2,
        temperature=new_vitals.temperature,
        ecg_status=new_vitals.ecg_status
    )
    alert_message = check_for_alerts(vitals_obj)

    try:
        db.session.add(new_vitals)
        
        # Log a consultation entry for the record, including any notes or alerts
        if notes or "ALERT" in alert_message or "WARNING" in alert_message:
            consultation_note = Consultation(
                patient_id=patient.id,
                doctor_name=nurse_name, # Storing nurse name here
                notes=f"MANUAL VITAL ENTRY by {nurse_name}: {new_vitals.heart_rate}, {new_vitals.blood_pressure}, etc. OBSERVATION: {notes or 'None'}. SYSTEM STATUS: {alert_message}",
                alert_level='nurse' if "ALERT" in alert_message else 'none',
                escalated_by=nurse_name
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


@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Returns the mock list of patients under care by querying the database."""
    patients = Patient.query.all()
    patient_list = []
    
    for patient in patients:
        latest_vitals = VitalsRecord.query.filter_by(patient_id=patient.id).order_by(VitalsRecord.timestamp.desc()).first()

        # Determine alert status
        is_alert = False
        alert_level = 'none'
        
        if latest_vitals:
            vitals_obj = VitalsMock(
                heart_rate=latest_vitals.heart_rate,
                blood_pressure=latest_vitals.blood_pressure,
                spo2=latest_vitals.spo2,
                temperature=latest_vitals.temperature,
                ecg_status=latest_vitals.ecg_status or "Normal Rhythm"
            )
            alert_msg = check_for_alerts(vitals_obj)
            is_alert = "ALERT" in alert_msg or "WARNING" in alert_msg
            alert_level = 'nurse' if is_alert else 'none'
            
            patient_vitals_output = {
                "heartRate": latest_vitals.heart_rate,
                "bloodPressure": latest_vitals.blood_pressure,
                "spo2": latest_vitals.spo2,
                "temperature": latest_vitals.temperature,
            }
        else:
            patient_vitals_output = { "heartRate": "N/A", "bloodPressure": "N/A", "spo2": "N/A", "temperature": "N/A" }


        patient_data = {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "location": patient.location,
            "hasAlert": is_alert, 
            "alertLevel": alert_level,
            "alertTime": latest_vitals.timestamp.strftime("%H:%M") if latest_vitals else "N/A",
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
        # NOTE: You must run 'flask db upgrade' first to create the 'full_name' column
        if not User.query.first():
            seed_database()
            print("Database seeded.")

    app.run(debug=True, port=5000)