import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function QueueView() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total_waiting: 0, total_in_progress: 0 });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/queue/all`);
      if (response.data.success) {
        setQueue(response.data.queue);
        setStats({
          total_waiting: response.data.total_waiting,
          total_in_progress: response.data.total_in_progress
        });
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchQueue, 10000); // Refresh every 10 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { color: 'bg-yellow-100 text-yellow-800', text: 'Waiting', icon: Clock },
      'in-progress': { color: 'bg-blue-100 text-blue-800', text: 'In Progress', icon: Users },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed', icon: CheckCircle }
    };
    
    const badge = badges[status] || badges.waiting;
    const Icon = badge.icon;
    
    return (
      <span className={`status-badge ${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (score) => {
    if (score > 0.7) return <span className="priority-badge high">High Priority</span>;
    if (score > 0.5) return <span className="priority-badge medium">Medium</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="queue-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-view">
      <div className="queue-header">
        <div>
          <h2 className="queue-title">
            <Users size={28} />
            Patient Queue
          </h2>
          <p className="queue-subtitle">Real-time queue status across all departments</p>
        </div>
        
        <div className="queue-controls">
          <div className="queue-stats-inline">
            <div className="stat-inline waiting">
              <Clock size={18} />
              <span>{stats.total_waiting} Waiting</span>
            </div>
            <div className="stat-inline in-progress">
              <Users size={18} />
              <span>{stats.total_in_progress} In Progress</span>
            </div>
          </div>
          
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
            Refresh
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-queue">
          <AlertCircle size={48} />
          <h3>No patients in queue</h3>
          <p>All appointments have been completed or there are no appointments today.</p>
        </div>
      ) : (
        <div className="queue-table-container">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Age/Gender</th>
                <th>Department</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Est. Wait</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className={item.status === 'in-progress' ? 'in-progress-row' : ''}>
                  <td>
                    <div className="token-cell">
                      <strong>{item.token_number}</strong>
                      {getPriorityBadge(item.priority_score)}
                    </div>
                  </td>
                  <td>
                    <div className="patient-cell">
                      <strong>{item.patient_name}</strong>
                      <span className="patient-id">{item.patient_id}</span>
                    </div>
                  </td>
                  <td>{item.patient_age}y, {item.patient_gender}</td>
                  <td>{item.department}</td>
                  <td>{item.doctor_name}</td>
                  <td>{item.appointment_time}</td>
                  <td>{item.estimated_wait_time} min</td>
                  <td>{getStatusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default QueueView;