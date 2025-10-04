from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Create a database instance
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    
    # Relationships
    vitals = db.relationship('Vitals', backref='user', lazy=True)
    symptoms = db.relationship('Symptom', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class Vitals(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Vital signs fields
    heartRate = db.Column(db.String(20))
    bloodPressure = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    temperature = db.Column(db.String(20))
    ecgStatus = db.Column(db.String(50))
    cortisol = db.Column(db.String(20))
    estrogen = db.Column(db.String(20))
    progesterone = db.Column(db.String(20))
    testosterone = db.Column(db.String(20))
    
    def __repr__(self):
        return f'<Vitals {self.id}>'

class Symptom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    symptom = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f'<Symptom {self.id}>'