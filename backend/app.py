from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from ml_queue_manager import QueueMLModel

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hospital_queue.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize ML Model
ml_model = QueueMLModel()

# Database Models
class Patient(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    phone = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(100))
    medical_history = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)
    specialization = db.Column(db.String(100))
    avg_consultation_time = db.Column(db.Integer, default=15)  # in minutes
    max_patients_per_day = db.Column(db.Integer, default=40)
    current_queue_count = db.Column(db.Integer, default=0)
    is_available = db.Column(db.Boolean, default=True)
    
    department = db.relationship('Department', backref='doctors')

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token_number = db.Column(db.String(20), unique=True, nullable=False)
    patient_id = db.Column(db.String(50), db.ForeignKey('patient.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, default=datetime.utcnow)
    estimated_wait_time = db.Column(db.Integer)  # in minutes
    status = db.Column(db.String(20), default='waiting')  # waiting, in-progress, completed, cancelled
    priority_score = db.Column(db.Float, default=0.0)
    actual_wait_time = db.Column(db.Integer)
    called_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    patient = db.relationship('Patient', backref='appointments')
    doctor = db.relationship('Doctor', backref='appointments')
    department = db.relationship('Department', backref='appointments')

class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)
    diagnosis = db.Column(db.Text, nullable=False)
    medications = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    appointment = db.relationship('Appointment', backref='prescription')

# Initialize database
with app.app_context():
    db.create_all()
    
    # Seed initial data if empty
    if Department.query.count() == 0:
        departments = [
            Department(name='General Medicine', description='General health consultations'),
            Department(name='Cardiology', description='Heart and cardiovascular care'),
            Department(name='Orthopedics', description='Bone and joint treatments'),
            Department(name='Pediatrics', description='Child healthcare'),
            Department(name='Dermatology', description='Skin conditions'),
            Department(name='ENT', description='Ear, Nose, and Throat'),
        ]
        db.session.add_all(departments)
        db.session.commit()
        
        # Add sample doctors
        doctors = [
            Doctor(name='Dr. Sarah Johnson', department_id=1, specialization='Internal Medicine', avg_consultation_time=15),
            Doctor(name='Dr. Michael Chen', department_id=1, specialization='Family Medicine', avg_consultation_time=12),
            Doctor(name='Dr. Emily Davis', department_id=2, specialization='Interventional Cardiology', avg_consultation_time=20),
            Doctor(name='Dr. Robert Wilson', department_id=2, specialization='Cardiac Electrophysiology', avg_consultation_time=18),
            Doctor(name='Dr. Lisa Anderson', department_id=3, specialization='Sports Medicine', avg_consultation_time=15),
            Doctor(name='Dr. James Martinez', department_id=3, specialization='Joint Replacement', avg_consultation_time=25),
            Doctor(name='Dr. Jennifer Taylor', department_id=4, specialization='Neonatology', avg_consultation_time=20),
            Doctor(name='Dr. David Brown', department_id=4, specialization='Pediatric Cardiology', avg_consultation_time=18),
            Doctor(name='Dr. Amanda White', department_id=5, specialization='Cosmetic Dermatology', avg_consultation_time=15),
            Doctor(name='Dr. Christopher Lee', department_id=6, specialization='Rhinology', avg_consultation_time=15),
        ]
        db.session.add_all(doctors)
        db.session.commit()
        
        # Note: In production, use proper password hashing (bcrypt)
        # For demo purposes, doctor login credentials are:
        # Username: doctor<id> (e.g., doctor1, doctor2, etc.)
        # Password: password123
        print("Doctor login credentials created (username: doctor<id>, password: password123)")

# API Routes

@app.route('/api/patient/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Fetch patient details by ID"""
    patient = Patient.query.get(patient_id)
    if patient:
        return jsonify({
            'success': True,
            'patient': {
                'id': patient.id,
                'name': patient.name,
                'age': patient.age,
                'gender': patient.gender,
                'phone': patient.phone,
                'email': patient.email,
                'medical_history': patient.medical_history
            }
        })
    return jsonify({'success': False, 'message': 'Patient not found'}), 404

@app.route('/api/patient', methods=['POST'])
def register_patient():
    """Register a new patient"""
    data = request.json
    
    # Check if patient already exists
    existing = Patient.query.get(data['id'])
    if existing:
        return jsonify({'success': False, 'message': 'Patient ID already exists'}), 400
    
    patient = Patient(
        id=data['id'],
        name=data['name'],
        age=data['age'],
        gender=data['gender'],
        phone=data['phone'],
        email=data.get('email', ''),
        medical_history=data.get('medical_history', '')
    )
    
    db.session.add(patient)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Patient registered successfully',
        'patient': {
            'id': patient.id,
            'name': patient.name,
            'age': patient.age,
            'gender': patient.gender,
            'phone': patient.phone,
            'email': patient.email
        }
    })

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get all departments with doctor counts"""
    departments = Department.query.all()
    return jsonify({
        'success': True,
        'departments': [{
            'id': dept.id,
            'name': dept.name,
            'description': dept.description,
            'doctor_count': len(dept.doctors),
            'available_doctors': len([d for d in dept.doctors if d.is_available])
        } for dept in departments]
    })

@app.route('/api/department/<int:dept_id>/doctors', methods=['GET'])
def get_department_doctors(dept_id):
    """Get all doctors in a department"""
    doctors = Doctor.query.filter_by(department_id=dept_id).all()
    return jsonify({
        'success': True,
        'doctors': [{
            'id': doc.id,
            'name': doc.name,
            'specialization': doc.specialization,
            'current_queue': doc.current_queue_count,
            'is_available': doc.is_available,
            'avg_consultation_time': doc.avg_consultation_time
        } for doc in doctors]
    })

@app.route('/api/appointment/book', methods=['POST'])
def book_appointment():
    """Book appointment with AI-based doctor assignment"""
    data = request.json
    patient_id = data['patient_id']
    department_id = data['department_id']
    
    # Verify patient exists
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'success': False, 'message': 'Patient not found'}), 404
    
    # Get available doctors in department
    available_doctors = Doctor.query.filter_by(
        department_id=department_id,
        is_available=True
    ).all()
    
    if not available_doctors:
        return jsonify({'success': False, 'message': 'No doctors available in this department'}), 400
    
    # Use ML model to assign best doctor
    doctor_features = []
    for doc in available_doctors:
        # Get today's appointments for this doctor
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_appointments = Appointment.query.filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date >= today_start,
            Appointment.status.in_(['waiting', 'in-progress'])
        ).count()
        
        doctor_features.append({
            'doctor_id': doc.id,
            'current_queue': doc.current_queue_count,
            'avg_consultation_time': doc.avg_consultation_time,
            'today_appointments': today_appointments,
            'max_capacity': doc.max_patients_per_day
        })
    
    # Get ML prediction for best doctor
    best_doctor_id, estimated_wait = ml_model.assign_doctor(doctor_features, patient)
    best_doctor = Doctor.query.get(best_doctor_id)
    
    # Generate token number
    today = datetime.now().strftime('%Y%m%d')
    dept_code = Department.query.get(department_id).name[:3].upper()
    token_count = Appointment.query.filter(
        Appointment.appointment_date >= datetime.now().replace(hour=0, minute=0, second=0)
    ).count() + 1
    token_number = f"{dept_code}-{today}-{token_count:04d}"
    
    # Create appointment
    appointment = Appointment(
        token_number=token_number,
        patient_id=patient_id,
        doctor_id=best_doctor_id,
        department_id=department_id,
        estimated_wait_time=estimated_wait,
        priority_score=ml_model.calculate_priority(patient)
    )
    
    # Update doctor queue count
    best_doctor.current_queue_count += 1
    
    db.session.add(appointment)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'appointment': {
            'token_number': token_number,
            'patient_name': patient.name,
            'doctor_name': best_doctor.name,
            'department': Department.query.get(department_id).name,
            'estimated_wait_time': estimated_wait,
            'queue_position': best_doctor.current_queue_count,
            'appointment_time': appointment.appointment_date.strftime('%Y-%m-%d %H:%M:%S')
        }
    })

@app.route('/api/appointments/today', methods=['GET'])
def get_today_appointments():
    """Get all appointments for today"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    appointments = Appointment.query.filter(
        Appointment.appointment_date >= today_start
    ).order_by(Appointment.appointment_date.desc()).all()
    
    return jsonify({
        'success': True,
        'appointments': [{
            'token_number': apt.token_number,
            'patient_name': apt.patient.name,
            'doctor_name': apt.doctor.name,
            'department': apt.department.name,
            'status': apt.status,
            'estimated_wait_time': apt.estimated_wait_time,
            'time': apt.appointment_date.strftime('%H:%M')
        } for apt in appointments]
    })

@app.route('/api/appointment/<int:appointment_id>/status', methods=['PUT'])
def update_appointment_status(appointment_id):
    """Update appointment status"""
    data = request.json
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found'}), 404
    
    old_status = appointment.status
    appointment.status = data['status']
    
    # If completing appointment, reduce doctor queue
    if data['status'] == 'completed' and old_status != 'completed':
        appointment.doctor.current_queue_count = max(0, appointment.doctor.current_queue_count - 1)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Status updated'})

@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_patients = Patient.query.count()
    today_appointments = Appointment.query.filter(
        Appointment.appointment_date >= today_start
    ).count()
    waiting_patients = Appointment.query.filter(
        Appointment.status == 'waiting',
        Appointment.appointment_date >= today_start
    ).count()
    completed_today = Appointment.query.filter(
        Appointment.status == 'completed',
        Appointment.appointment_date >= today_start
    ).count()
    
    # Average wait time
    completed_appointments = Appointment.query.filter(
        Appointment.status == 'completed',
        Appointment.actual_wait_time.isnot(None)
    ).all()
    
    avg_wait = 0
    if completed_appointments:
        avg_wait = sum(apt.actual_wait_time for apt in completed_appointments) / len(completed_appointments)
    
    return jsonify({
        'success': True,
        'stats': {
            'total_patients': total_patients,
            'today_appointments': today_appointments,
            'waiting_patients': waiting_patients,
            'completed_today': completed_today,
            'avg_wait_time': round(avg_wait, 1)
        }
    })

# New endpoints for enhanced features

@app.route('/api/queue/all', methods=['GET'])
def get_all_queue():
    """Get all patients in queue with their details"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    appointments = Appointment.query.filter(
        Appointment.appointment_date >= today_start,
        Appointment.status.in_(['waiting', 'in-progress'])
    ).order_by(Appointment.appointment_date.asc()).all()
    
    queue_list = []
    for apt in appointments:
        queue_list.append({
            'id': apt.id,
            'token_number': apt.token_number,
            'patient_id': apt.patient.id,
            'patient_name': apt.patient.name,
            'patient_age': apt.patient.age,
            'patient_gender': apt.patient.gender,
            'doctor_id': apt.doctor.id,
            'doctor_name': apt.doctor.name,
            'department': apt.department.name,
            'status': apt.status,
            'estimated_wait_time': apt.estimated_wait_time,
            'priority_score': apt.priority_score,
            'appointment_time': apt.appointment_date.strftime('%H:%M'),
            'called_at': apt.called_at.strftime('%H:%M:%S') if apt.called_at else None
        })
    
    return jsonify({
        'success': True,
        'queue': queue_list,
        'total_waiting': len([q for q in queue_list if q['status'] == 'waiting']),
        'total_in_progress': len([q for q in queue_list if q['status'] == 'in-progress'])
    })

@app.route('/api/doctor/login', methods=['POST'])
def doctor_login():
    """Simple doctor login (username: doctor<id>, password: password123)"""
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')
    
    # Simple authentication - in production use proper auth with hashed passwords
    if username.startswith('doctor') and password == 'password123':
        try:
            doctor_id = int(username.replace('doctor', ''))
            doctor = Doctor.query.get(doctor_id)
            
            if doctor:
                return jsonify({
                    'success': True,
                    'doctor': {
                        'id': doctor.id,
                        'name': doctor.name,
                        'specialization': doctor.specialization,
                        'department_id': doctor.department_id,
                        'department_name': doctor.department.name
                    }
                })
        except ValueError:
            pass
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/doctor/<int:doctor_id>/queue', methods=['GET'])
def get_doctor_queue(doctor_id):
    """Get queue for a specific doctor"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= today_start,
        Appointment.status.in_(['waiting', 'in-progress'])
    ).order_by(Appointment.priority_score.desc(), Appointment.appointment_date.asc()).all()
    
    queue_list = []
    for apt in appointments:
        queue_list.append({
            'id': apt.id,
            'token_number': apt.token_number,
            'patient_id': apt.patient.id,
            'patient_name': apt.patient.name,
            'patient_age': apt.patient.age,
            'patient_gender': apt.patient.gender,
            'patient_phone': apt.patient.phone,
            'medical_history': apt.patient.medical_history,
            'status': apt.status,
            'estimated_wait_time': apt.estimated_wait_time,
            'priority_score': apt.priority_score,
            'appointment_time': apt.appointment_date.strftime('%H:%M'),
            'called_at': apt.called_at.strftime('%H:%M:%S') if apt.called_at else None
        })
    
    return jsonify({
        'success': True,
        'queue': queue_list,
        'total_waiting': len([q for q in queue_list if q['status'] == 'waiting']),
        'current_patient': next((q for q in queue_list if q['status'] == 'in-progress'), None)
    })

@app.route('/api/appointment/<int:appointment_id>/call', methods=['PUT'])
def call_patient(appointment_id):
    """Call next patient (change status to in-progress)"""
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found'}), 404
    
    # Mark any other in-progress appointments for this doctor as waiting
    Appointment.query.filter(
        Appointment.doctor_id == appointment.doctor_id,
        Appointment.status == 'in-progress',
        Appointment.id != appointment_id
    ).update({'status': 'waiting'})
    
    appointment.status = 'in-progress'
    appointment.called_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Patient called',
        'patient_name': appointment.patient.name,
        'token_number': appointment.token_number
    })

@app.route('/api/appointment/<int:appointment_id>/prescription', methods=['POST'])
def add_prescription(appointment_id):
    """Add prescription for an appointment"""
    data = request.json
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found'}), 404
    
    # Delete existing prescription if any
    existing = Prescription.query.filter_by(appointment_id=appointment_id).first()
    if existing:
        db.session.delete(existing)
    
    prescription = Prescription(
        appointment_id=appointment_id,
        diagnosis=data.get('diagnosis', ''),
        medications=data.get('medications', ''),
        instructions=data.get('instructions', ''),
        notes=data.get('notes', '')
    )
    
    db.session.add(prescription)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Prescription saved',
        'prescription_id': prescription.id
    })

@app.route('/api/appointment/<int:appointment_id>/complete', methods=['PUT'])
def complete_appointment(appointment_id):
    """Mark appointment as completed"""
    appointment = Appointment.query.get(appointment_id)
    
    if not appointment:
        return jsonify({'success': False, 'message': 'Appointment not found'}), 404
    
    appointment.status = 'completed'
    appointment.completed_at = datetime.utcnow()
    
    # Calculate actual wait time
    if appointment.called_at:
        wait_delta = appointment.called_at - appointment.appointment_date
        appointment.actual_wait_time = int(wait_delta.total_seconds() / 60)
    
    # Update doctor queue count
    appointment.doctor.current_queue_count = max(0, appointment.doctor.current_queue_count - 1)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Appointment completed',
        'actual_wait_time': appointment.actual_wait_time
    })

@app.route('/api/appointment/<int:appointment_id>/prescription', methods=['GET'])
def get_prescription(appointment_id):
    """Get prescription for an appointment"""
    prescription = Prescription.query.filter_by(appointment_id=appointment_id).first()
    
    if not prescription:
        return jsonify({'success': False, 'message': 'Prescription not found'}), 404
    
    appointment = Appointment.query.get(appointment_id)
    
    return jsonify({
        'success': True,
        'prescription': {
            'id': prescription.id,
            'diagnosis': prescription.diagnosis,
            'medications': prescription.medications,
            'instructions': prescription.instructions,
            'notes': prescription.notes,
            'created_at': prescription.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'patient_name': appointment.patient.name,
            'doctor_name': appointment.doctor.name
        }
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)