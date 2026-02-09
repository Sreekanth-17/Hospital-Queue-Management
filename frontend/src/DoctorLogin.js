import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, LogIn } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

function DoctorLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/doctor/login`, {
        username,
        password
      });

      if (response.data.success) {
        onLoginSuccess(response.data.doctor);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">
          <User size={48} />
        </div>
        
        <h2>Doctor Login</h2>
        <p className="login-subtitle">Access your patient queue and manage appointments</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>
              <User size={18} />
              Username
            </label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="doctor1, doctor2, etc."
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-help">
          <p>Demo Credentials:</p>
          <ul>
            <li>Username: doctor1, doctor2, ... doctor10</li>
            <li>Password: password123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DoctorLogin;