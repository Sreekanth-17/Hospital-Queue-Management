import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime

class QueueMLModel:
    """
    Machine Learning model for intelligent queue management.
    Uses ensemble methods to predict wait times and assign doctors optimally.
    """
    
    def __init__(self):
        self.wait_time_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Try to load pre-trained model
        self._load_model()
        
        # If no model exists, train with synthetic data
        if not self.is_trained:
            self._train_initial_model()
    
    def _load_model(self):
        """Load pre-trained model if exists"""
        model_path = 'queue_model.pkl'
        scaler_path = 'scaler.pkl'
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                self.wait_time_model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                self.is_trained = True
                print("Loaded pre-trained model")
            except:
                print("Failed to load model, will train new one")
    
    def _train_initial_model(self):
        """Train initial model with synthetic data"""
        print("Training initial model with synthetic data...")
        
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        # Features: queue_length, avg_consultation_time, time_of_day, day_of_week, doctor_efficiency
        X_train = np.column_stack([
            np.random.randint(0, 20, n_samples),  # queue_length
            np.random.randint(10, 30, n_samples),  # avg_consultation_time
            np.random.randint(0, 24, n_samples),   # time_of_day
            np.random.randint(0, 7, n_samples),    # day_of_week
            np.random.uniform(0.7, 1.3, n_samples) # doctor_efficiency
        ])
        
        # Target: wait_time (realistic calculation)
        y_train = (
            X_train[:, 0] * X_train[:, 1] * X_train[:, 4] +  # queue * consultation * efficiency
            np.random.normal(0, 5, n_samples)  # noise
        )
        y_train = np.maximum(y_train, 0)  # no negative wait times
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.wait_time_model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        # Save model
        joblib.dump(self.wait_time_model, 'queue_model.pkl')
        joblib.dump(self.scaler, 'scaler.pkl')
        
        print("Initial model trained and saved")
    
    def assign_doctor(self, doctor_features, patient):
        """
        Assign the best doctor based on queue optimization.
        
        Args:
            doctor_features: List of dicts with doctor information
            patient: Patient object
        
        Returns:
            tuple: (best_doctor_id, estimated_wait_time)
        """
        
        best_doctor_id = None
        min_wait_time = float('inf')
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()
        
        for doc_info in doctor_features:
            # Extract features
            queue_length = doc_info['current_queue']
            avg_consultation = doc_info['avg_consultation_time']
            today_load = doc_info['today_appointments']
            max_capacity = doc_info['max_capacity']
            
            # Calculate doctor efficiency (based on current load)
            load_ratio = today_load / max_capacity if max_capacity > 0 else 0
            efficiency = 1.0 - (load_ratio * 0.3)  # Efficiency decreases with load
            
            # Prepare features for prediction
            features = np.array([[
                queue_length,
                avg_consultation,
                current_hour,
                current_day,
                efficiency
            ]])
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Predict wait time
            predicted_wait = self.wait_time_model.predict(features_scaled)[0]
            
            # Add penalty for overloaded doctors
            if load_ratio > 0.8:
                predicted_wait *= 1.3
            
            # Select doctor with minimum predicted wait time
            if predicted_wait < min_wait_time:
                min_wait_time = predicted_wait
                best_doctor_id = doc_info['doctor_id']
        
        return best_doctor_id, int(min_wait_time)
    
    def calculate_priority(self, patient):
        """
        Calculate priority score for a patient.
        Higher priority = should be seen sooner
        
        Args:
            patient: Patient object
        
        Returns:
            float: Priority score (0-1)
        """
        priority = 0.5  # Base priority
        
        # Age-based priority
        if patient.age > 65:
            priority += 0.2
        elif patient.age < 5:
            priority += 0.15
        
        # Medical history keywords that increase priority
        if patient.medical_history:
            emergency_keywords = ['heart', 'chest pain', 'breathing', 'diabetic', 
                                'emergency', 'severe', 'acute', 'critical']
            medical_history_lower = patient.medical_history.lower()
            
            for keyword in emergency_keywords:
                if keyword in medical_history_lower:
                    priority += 0.1
                    break
        
        # Normalize to 0-1 range
        return min(priority, 1.0)
    
    def update_model(self, appointment_data):
        """
        Update model with real appointment data for continuous learning.
        
        Args:
            appointment_data: List of completed appointments with actual wait times
        """
        if len(appointment_data) < 50:
            return  # Need minimum data for retraining
        
        # Extract features and targets from real data
        X_new = []
        y_new = []
        
        for apt in appointment_data:
            features = [
                apt['queue_length'],
                apt['avg_consultation_time'],
                apt['hour_of_day'],
                apt['day_of_week'],
                apt['doctor_efficiency']
            ]
            X_new.append(features)
            y_new.append(apt['actual_wait_time'])
        
        X_new = np.array(X_new)
        y_new = np.array(y_new)
        
        # Retrain with new data
        X_scaled = self.scaler.fit_transform(X_new)
        self.wait_time_model.fit(X_scaled, y_new)
        
        # Save updated model
        joblib.dump(self.wait_time_model, 'queue_model.pkl')
        joblib.dump(self.scaler, 'scaler.pkl')
        
        print(f"Model updated with {len(appointment_data)} new data points")
    
    def predict_department_load(self, department_id, doctors_data):
        """
        Predict the load for a department in the next hour.
        
        Args:
            department_id: Department ID
            doctors_data: List of doctor information
        
        Returns:
            dict: Predicted metrics for the department
        """
        total_queue = sum(doc['current_queue'] for doc in doctors_data)
        total_capacity = sum(doc['max_capacity'] for doc in doctors_data)
        avg_wait = sum(doc['current_queue'] * doc['avg_consultation_time'] 
                      for doc in doctors_data) / len(doctors_data) if doctors_data else 0
        
        return {
            'total_queue': total_queue,
            'capacity_utilization': (total_queue / total_capacity) * 100 if total_capacity > 0 else 0,
            'avg_wait_time': avg_wait,
            'recommendation': 'optimal' if total_queue < total_capacity * 0.7 else 'high_load'
        }