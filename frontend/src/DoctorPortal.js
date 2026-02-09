import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Clock, FileText, CheckCircle, LogOut, RefreshCw, Phone, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function DoctorPortal({ doctor, onLogout }) {
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [prescription, setPrescription] = useState({
    diagnosis: '',
    medications: '',
    instructions: '',
    notes: ''
  });

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/doctor/${doctor.id}/queue`);
      if (response.data.success) {
        setQueue(response.data.queue);
        setCurrentPatient(response.data.current_patient);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [doctor.id]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchQueue, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, doctor.id]);

  const handleCallPatient = async (appointmentId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/appointment/${appointmentId}/call`);
      if (response.data.success) {
        fetchQueue();
      }
    } catch (error) {
      console.error('Error calling patient:', error);
      alert('Failed to call patient');
    }
  };

  const handleSavePrescription = async (appointmentId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/appointment/${appointmentId}/prescription`,
        prescription
      );
      
      if (response.data.success) {
        alert('Prescription saved successfully!');
      }
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    if (!prescription.diagnosis || !prescription.medications) {
      alert('Please fill in diagnosis and medications before completing the appointment');
      return;
    }

    try {
      // Save prescription first
      await axios.post(
        `${API_BASE_URL}/appointment/${appointmentId}/prescription`,
        prescription
      );

      // Then mark as completed
      const response = await axios.put(`${API_BASE_URL}/appointment/${appointmentId}/complete`);
      
      if (response.data.success) {
        alert('Appointment completed successfully!');
        setPrescription({ diagnosis: '', medications: '', instructions: '', notes: '' });
        setShowPrescription(false);
        fetchQueue();
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      alert('Failed to complete appointment');
    }
  };

  const waitingPatients = queue.filter(q => q.status === 'waiting');

  return (
    <div className="doctor-portal">
      {/* Header */}
      <div className="doctor-header">
        <div className="doctor-info">
          <div className="doctor-avatar">
            <User size={32} />
          </div>
          <div>
            <h2>{doctor.name}</h2>
            <p>{doctor.specialization} • {doctor.department_name}</p>
          </div>
        </div>
        
        <div className="header-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          
          <button className="btn btn-refresh" onClick={fetchQueue}>
            <RefreshCw size={18} />
          </button>
          
          <button className="btn btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="portal-content">
        {/* Current Patient Section */}
        <div className="current-patient-section">
          <h3 className="section-title">
            <User size={20} />
            Current Patient
          </h3>
          
          {currentPatient ? (
            <div className="current-patient-card">
              <div className="patient-header-info">
                <div className="patient-main-info">
                  <div className="token-display">{currentPatient.token_number}</div>
                  <div>
                    <h4>{currentPatient.patient_name}</h4>
                    <p className="patient-details">
                      {currentPatient.patient_age} years • {currentPatient.patient_gender}
                    </p>
                    <p className="patient-contact">
                      <Phone size={14} />
                      {currentPatient.patient_phone}
                    </p>
                  </div>
                </div>
                
                <div className="patient-time-info">
                  <div className="time-badge">
                    <Clock size={16} />
                    Called at {currentPatient.called_at}
                  </div>
                </div>
              </div>

              {currentPatient.medical_history && (
                <div className="medical-history">
                  <strong>Medical History:</strong>
                  <p>{currentPatient.medical_history}</p>
                </div>
              )}

              <div className="patient-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowPrescription(!showPrescription)}
                >
                  <FileText size={18} />
                  {showPrescription ? 'Hide Prescription' : 'Write Prescription'}
                </button>
              </div>

              {showPrescription && (
                <div className="prescription-form">
                  <h4>Prescription</h4>
                  
                  <div className="form-group">
                    <label>Diagnosis *</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      value={prescription.diagnosis}
                      onChange={(e) => setPrescription({...prescription, diagnosis: e.target.value})}
                      placeholder="Enter diagnosis..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Medications *</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={prescription.medications}
                      onChange={(e) => setPrescription({...prescription, medications: e.target.value})}
                      placeholder="List medications with dosage and frequency..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Instructions</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      value={prescription.instructions}
                      onChange={(e) => setPrescription({...prescription, instructions: e.target.value})}
                      placeholder="Special instructions for the patient..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      value={prescription.notes}
                      onChange={(e) => setPrescription({...prescription, notes: e.target.value})}
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="prescription-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleSavePrescription(currentPatient.id)}
                    >
                      Save Draft
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => handleCompleteAppointment(currentPatient.id)}
                    >
                      <CheckCircle size={18} />
                      Complete Appointment
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-current-patient">
              <AlertCircle size={48} />
              <p>No patient currently being seen</p>
              {waitingPatients.length > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleCallPatient(waitingPatients[0].id)}
                >
                  Call Next Patient
                </button>
              )}
            </div>
          )}
        </div>

        {/* Queue Section */}
        <div className="queue-section">
          <h3 className="section-title">
            <Clock size={20} />
            Waiting Queue ({waitingPatients.length})
          </h3>

          {waitingPatients.length === 0 ? (
            <div className="empty-queue-small">
              <p>No patients waiting</p>
            </div>
          ) : (
            <div className="queue-list">
              {waitingPatients.map((patient, index) => (
                <div key={patient.id} className="queue-item">
                  <div className="queue-item-header">
                    <div className="queue-position">#{index + 1}</div>
                    <div className="queue-item-info">
                      <strong>{patient.patient_name}</strong>
                      <span className="queue-token">{patient.token_number}</span>
                    </div>
                  </div>
                  
                  <div className="queue-item-details">
                    <span>{patient.patient_age}y, {patient.patient_gender}</span>
                    <span>•</span>
                    <span>Booked at {patient.appointment_time}</span>
                  </div>

                  {patient.priority_score > 0.7 && (
                    <div className="priority-indicator">High Priority</div>
                  )}

                  <button 
                    className="btn btn-sm btn-call"
                    onClick={() => handleCallPatient(patient.id)}
                    disabled={currentPatient !== null}
                  >
                    Call Patient
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorPortal;