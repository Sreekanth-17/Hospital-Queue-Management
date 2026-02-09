# Hospital Queue Management System with AI/ML

An intelligent hospital queue management system that uses machine learning to optimize doctor assignment, reduce patient wait times, and balance the load across healthcare providers.

## 🌟 Features

### Core Functionality
- **Patient Management**: Register new patients or search existing ones by unique ID
- **AI-Powered Doctor Assignment**: Machine learning model automatically assigns the best doctor based on:
  - Current queue lengths
  - Doctor availability and capacity
  - Average consultation times
  - Historical performance data
  - Patient priority (age, medical history)
- **Real-time Queue Tracking**: Live updates on queue positions and wait times
- **Department-based Routing**: Multiple departments with specialized doctors
- **Token Generation**: Automatic token number generation for appointment tracking
- **Dashboard Analytics**: Real-time statistics on waiting patients, completed appointments, and average wait times

### AI/ML Features
- **Random Forest Regression** for wait time prediction
- **Dynamic doctor assignment** based on multiple factors
- **Priority scoring** for patients (elderly, pediatric, medical emergencies)
- **Continuous learning** capability to improve over time
- **Load balancing** across doctors and departments

### User Interface
- Modern, aesthetic design with gradient backgrounds
- Intuitive workflow for receptionists
- Real-time statistics display
- Responsive design for all devices
- Smooth animations and transitions

## 🏗️ Architecture

```
hospital-queue-system/
├── backend/
│   ├── app.py                    # Flask API server
│   ├── ml_queue_manager.py       # ML model for queue optimization
│   ├── requirements.txt          # Python dependencies
│   └── hospital_queue.db         # SQLite database (auto-generated)
│
├── frontend/
│   ├── src/
│   │   ├── App.js               # Main React component
│   │   ├── App.css              # Styling
│   │   └── index.js             # Entry point
│   ├── public/
│   │   └── index.html           # HTML template
│   └── package.json             # Node dependencies
│
└── README.md                     # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn

### Step 1: Clone or Download the Project

```bash
cd hospital-queue-system
```

### Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install --break-system-packages -r requirements.txt
```

4. Start the Flask server:
```bash
python app.py
```

The backend server will start on `http://localhost:5000`

**Note**: The database will be automatically created on first run, along with sample departments and doctors.

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## 📋 Usage Guide

### For Receptionists

#### 1. Search for Existing Patient
- Enter the patient's unique ID in the search box
- Click "Search Patient"
- If found, you'll be taken to the appointment booking screen

#### 2. Register New Patient
- If patient not found, click "Register New Patient"
- Fill in the required fields:
  - Patient ID (unique identifier)
  - Full Name
  - Age
  - Gender
  - Phone Number
  - Email (optional)
  - Medical History (optional)
- Click "Register Patient"

#### 3. Book Appointment
- Select the appropriate department
- The system shows:
  - Department description
  - Number of available doctors
  - Current availability status
- Click "Book Appointment with AI Assignment"
- The ML model will:
  - Analyze all available doctors in the department
  - Consider current queue lengths
  - Factor in average consultation times
  - Evaluate patient priority
  - Assign the optimal doctor

#### 4. View Appointment Details
- Token number
- Assigned doctor
- Estimated wait time
- Queue position
- Department information

## 🤖 How the AI/ML Works

### Doctor Assignment Algorithm

The system uses a **Random Forest Regression** model with the following features:

1. **Input Features**:
   - Current queue length for each doctor
   - Average consultation time
   - Time of day
   - Day of week
   - Doctor efficiency score (based on load)

2. **Prediction Process**:
   - Model predicts wait time for each available doctor
   - Applies penalties for overloaded doctors (>80% capacity)
   - Selects doctor with minimum predicted wait time

3. **Priority Calculation**:
   - Elderly patients (>65 years): +0.2 priority
   - Children (<5 years): +0.15 priority
   - Emergency keywords in medical history: +0.1 priority
   - Priority score ranges from 0 to 1

### Model Training & Improvement

- Initially trained with synthetic data (1000 samples)
- Can be retrained with real appointment data
- Continuous learning capability through `update_model()` method
- Model automatically saves and loads between sessions

### Load Balancing Strategy

- Tracks real-time queue counts per doctor
- Monitors daily appointment capacity
- Calculates efficiency scores based on current load
- Prevents overloading of individual doctors
- Ensures even distribution across department

## 🗄️ Database Schema

### Tables

**Patient**
- id (primary key, string)
- name, age, gender, phone, email
- medical_history
- created_at

**Department**
- id (primary key)
- name, description

**Doctor**
- id (primary key)
- name, specialization
- department_id (foreign key)
- avg_consultation_time
- max_patients_per_day
- current_queue_count
- is_available

**Appointment**
- id (primary key)
- token_number (unique)
- patient_id, doctor_id, department_id (foreign keys)
- appointment_date
- estimated_wait_time
- actual_wait_time
- status (waiting/in-progress/completed/cancelled)
- priority_score

## 🎨 Customization

### Adding New Departments

Edit `backend/app.py` in the database initialization section:

```python
departments = [
    Department(name='Your Department', description='Description'),
    # Add more departments
]
```

### Adding New Doctors

```python
doctors = [
    Doctor(
        name='Dr. Name',
        department_id=1,  # Department ID
        specialization='Specialty',
        avg_consultation_time=15  # minutes
    ),
    # Add more doctors
]
```

### Adjusting ML Model Parameters

Edit `backend/ml_queue_manager.py`:

```python
self.wait_time_model = RandomForestRegressor(
    n_estimators=100,      # Number of trees
    max_depth=10,          # Maximum depth
    random_state=42
)
```

### Styling Customization

Edit `frontend/src/App.css` to change colors, fonts, or layout.

## 📊 API Endpoints

### Patient Management
- `GET /api/patient/<patient_id>` - Get patient details
- `POST /api/patient` - Register new patient

### Department & Doctors
- `GET /api/departments` - Get all departments
- `GET /api/department/<dept_id>/doctors` - Get doctors by department

### Appointments
- `POST /api/appointment/book` - Book appointment (AI assignment)
- `GET /api/appointments/today` - Get today's appointments
- `PUT /api/appointment/<id>/status` - Update appointment status

### Analytics
- `GET /api/stats/dashboard` - Get dashboard statistics

## 🔧 Troubleshooting

### Backend Issues

**Database errors:**
```bash
# Delete the database and restart
rm hospital_queue.db
python app.py
```

**Port already in use:**
```python
# Change port in app.py
app.run(debug=True, host='0.0.0.0', port=5001)
```

### Frontend Issues

**API connection errors:**
- Ensure backend is running on port 5000
- Check CORS settings in `app.py`

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Production Deployment

### Backend

1. Use a production WSGI server:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. Use PostgreSQL instead of SQLite:
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/hospital_db'
```

### Frontend

1. Build the production bundle:
```bash
npm run build
```

2. Serve with nginx or any static file server

## 📈 Future Enhancements

- Real-time notifications (SMS/Email)
- Doctor dashboard for queue management
- Patient mobile app
- Integration with hospital EHR systems
- Voice-based patient check-in
- Multi-language support
- Advanced analytics and reporting
- Video consultation integration
- Insurance verification
- Billing integration

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

## 📄 License

MIT License - Feel free to use this project for your needs.

## 👥 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using Flask, React, and Machine Learning**