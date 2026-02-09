import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { User, Calendar, Clock, Activity, Search, UserPlus, CheckCircle, Users, Stethoscope } from 'lucide-react';
import QueueView from './QueueView';
import DoctorLogin from './DoctorLogin';
import DoctorPortal from './DoctorPortal';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [mode, setMode] = useState('receptionist'); // receptionist, queue, doctor-login, doctor-portal
  const [currentView, setCurrentView] = useState('search'); // search, register, book, success
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsUpdating, setStatsUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedInDoctor, setLoggedInDoctor] = useState(null);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    id: '',
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    medical_history: ''
  });

  useEffect(() => {
    fetchDepartments();
    fetchStats();
    
    // Auto-refresh stats every 5 seconds
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 5000);
    
    return () => clearInterval(statsInterval);
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/departments`);
      setDepartments(response.data.departments);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsUpdating(true);
      const response = await axios.get(`${API_BASE_URL}/stats/dashboard`);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setTimeout(() => setStatsUpdating(false), 300); // Brief flash
    }
  };

  const searchPatient = async () => {
    if (!patientId.trim()) {
      setError('Please enter a patient ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/patient/${patientId}`);
      setPatient(response.data.patient);
      setCurrentView('book');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Patient not found. Would you like to register?');
      } else {
        setError('Error searching for patient');
      }
    } finally {
      setLoading(false);
    }
  };

  const registerPatient = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/patient`, newPatient);
      setPatient(response.data.patient);
      setCurrentView('book');
      setNewPatient({
        id: '', name: '', age: '', gender: 'Male', 
        phone: '', email: '', medical_history: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering patient');
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async () => {
    if (!selectedDepartment) {
      setError('Please select a department');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/appointment/book`, {
        patient_id: patient.id,
        department_id: selectedDepartment
      });
      setAppointment(response.data.appointment);
      setCurrentView('success');
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Error booking appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentView('search');
    setPatientId('');
    setPatient(null);
    setSelectedDepartment(null);
    setAppointment(null);
    setError('');
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Activity className="logo-icon" />
            <h1>MediQueue AI</h1>
          </div>
          
          {/* Navigation */}
          <div className="header-nav">
            <button 
              className={`nav-btn ${mode === 'receptionist' ? 'active' : ''}`}
              onClick={() => setMode('receptionist')}
            >
              <UserPlus size={18} />
              Receptionist
            </button>
            <button 
              className={`nav-btn ${mode === 'queue' ? 'active' : ''}`}
              onClick={() => setMode('queue')}
            >
              <Users size={18} />
              Queue View
            </button>
            <button 
              className={`nav-btn ${mode === 'doctor-login' || mode === 'doctor-portal' ? 'active' : ''}`}
              onClick={() => {
                if (loggedInDoctor) {
                  setMode('doctor-portal');
                } else {
                  setMode('doctor-login');
                }
              }}
            >
              <Stethoscope size={18} />
              Doctor Portal
            </button>
          </div>
          
          <div className={`header-stats ${statsUpdating ? 'updating' : ''}`}>
            {stats && (
              <>
                <div className="stat-card">
                  <User size={20} />
                  <div>
                    <div className="stat-value">{stats.waiting_patients}</div>
                    <div className="stat-label">Waiting</div>
                  </div>
                </div>
                <div className="stat-card">
                  <CheckCircle size={20} />
                  <div>
                    <div className="stat-value">{stats.completed_today}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                </div>
                <div className="stat-card">
                  <Clock size={20} />
                  <div>
                    <div className="stat-value">{stats.avg_wait_time}m</div>
                    <div className="stat-label">Avg Wait</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          
          {/* Queue View Mode */}
          {mode === 'queue' && <QueueView />}
          
          {/* Doctor Login Mode */}
          {mode === 'doctor-login' && (
            <DoctorLogin 
              onLoginSuccess={(doctor) => {
                setLoggedInDoctor(doctor);
                setMode('doctor-portal');
              }}
            />
          )}
          
          {/* Doctor Portal Mode */}
          {mode === 'doctor-portal' && loggedInDoctor && (
            <DoctorPortal 
              doctor={loggedInDoctor}
              onLogout={() => {
                setLoggedInDoctor(null);
                setMode('doctor-login');
              }}
            />
          )}
          
          {/* Receptionist Mode */}
          {mode === 'receptionist' && (
            <>
          
          {/* Patient Search View */}
          {currentView === 'search' && (
            <div className="view-container fade-in">
              <div className="card main-card">
                <h2 className="card-title">
                  <Search className="title-icon" />
                  Patient Lookup
                </h2>
                
                <div className="search-section">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter Patient ID (e.g., P12345)"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPatient()}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={searchPatient}
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Search Patient'}
                  </button>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                    {error.includes('not found') && (
                      <button 
                        className="btn btn-link"
                        onClick={() => {
                          setNewPatient({...newPatient, id: patientId});
                          setCurrentView('register');
                          setError('');
                        }}
                      >
                        Register New Patient
                      </button>
                    )}
                  </div>
                )}

                <div className="divider">OR</div>

                <button 
                  className="btn btn-secondary"
                  onClick={() => setCurrentView('register')}
                >
                  <UserPlus size={18} />
                  Register New Patient
                </button>
              </div>
            </div>
          )}

          {/* Patient Registration View */}
          {currentView === 'register' && (
            <div className="view-container fade-in">
              <div className="card main-card">
                <h2 className="card-title">
                  <UserPlus className="title-icon" />
                  Register New Patient
                </h2>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Patient ID *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={newPatient.id}
                      onChange={(e) => setNewPatient({...newPatient, id: e.target.value})}
                      placeholder="P12345"
                    />
                  </div>

                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      className="input-field"
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                      placeholder="30"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      className="input-field"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                      placeholder="+1234567890"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={newPatient.email}
                      onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Medical History</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={newPatient.medical_history}
                      onChange={(e) => setNewPatient({...newPatient, medical_history: e.target.value})}
                      placeholder="Any relevant medical history, allergies, or conditions..."
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="button-group">
                  <button className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={registerPatient}
                    disabled={loading || !newPatient.id || !newPatient.name || !newPatient.age || !newPatient.phone}
                  >
                    {loading ? 'Registering...' : 'Register Patient'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Book Appointment View */}
          {currentView === 'book' && patient && (
            <div className="view-container fade-in">
              <div className="card main-card">
                <div className="patient-header">
                  <div>
                    <h2 className="card-title">Book Appointment</h2>
                    <div className="patient-info">
                      <User size={18} />
                      <span>{patient.name} ({patient.age}y, {patient.gender})</span>
                    </div>
                  </div>
                  <button className="btn btn-text" onClick={resetForm}>
                    Change Patient
                  </button>
                </div>

                <h3 className="section-title">Select Department</h3>
                <div className="department-grid">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className={`department-card ${selectedDepartment === dept.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDepartment(dept.id)}
                    >
                      <div className="department-header">
                        <h4>{dept.name}</h4>
                        <div className={`availability ${dept.available_doctors > 0 ? 'available' : 'unavailable'}`}>
                          {dept.available_doctors > 0 ? '● Available' : '● Busy'}
                        </div>
                      </div>
                      <p className="department-desc">{dept.description}</p>
                      <div className="department-stats">
                        <span>{dept.available_doctors}/{dept.doctor_count} doctors available</span>
                      </div>
                    </div>
                  ))}
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="button-group">
                  <button className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary btn-large"
                    onClick={bookAppointment}
                    disabled={loading || !selectedDepartment}
                  >
                    {loading ? 'Booking...' : 'Book Appointment with AI Assignment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success View */}
          {currentView === 'success' && appointment && (
            <div className="view-container fade-in">
              <div className="card success-card">
                <div className="success-icon">
                  <CheckCircle size={64} />
                </div>
                
                <h2 className="success-title">Appointment Booked Successfully!</h2>
                
                <div className="appointment-details">
                  <div className="detail-row">
                    <span className="label">Token Number</span>
                    <span className="value token-number">{appointment.token_number}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Patient Name</span>
                    <span className="value">{appointment.patient_name}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Department</span>
                    <span className="value">{appointment.department}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Doctor Assigned</span>
                    <span className="value">{appointment.doctor_name}</span>
                  </div>
                  
                  <div className="detail-row highlight">
                    <span className="label">
                      <Clock size={18} />
                      Estimated Wait Time
                    </span>
                    <span className="value">{appointment.estimated_wait_time} minutes</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Queue Position</span>
                    <span className="value">#{appointment.queue_position}</span>
                  </div>
                </div>

                <div className="info-box">
                  <p>Please arrive 10 minutes before your estimated time. You'll be notified when it's your turn.</p>
                </div>

                <button className="btn btn-primary btn-large" onClick={resetForm}>
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}

            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;