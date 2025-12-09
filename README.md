# Prerequisites

Install these before starting:

## Python 3.11+
Download from: https://www.python.org/downloads/  
Select **Add Python to PATH**  
Click **Install Now**

## Node.js (LTS)
Download from: https://nodejs.org/  
Install with default settings

---

# Steps

## 1. Verify Installation
```bash
python --version
node --version
npm --version
```

---

## 2. Open Terminal and Navigate to Project
```bash
cd path/to/agriconnect
```

Example (Windows):
```bash
cd C:\Users\YourName\Desktop\agriconnect
```

Confirm folder:
```bash
dir
```

You should see:
- backend/
- frontend/

---

## 3. Backend Setup
Navigate:
```bash
cd backend
```

Create virtual environment:
```bash
python -m venv venv
```

Activate:
```bash
venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

If that fails:
```bash
pip install flask flask-cors
```

Run backend:
```bash
python main.py
```

Expected:
```
* Running on http://127.0.0.1:5000
```

Keep this terminal open.

---

## 4. Frontend Setup (New Terminal)
Navigate:
```bash
cd path/to/agriconnect/frontend
```

Install dependencies:
```bash
npm install
```

If errors occur:
```bash
npm cache clean --force
npm install
```

Start frontend:
```bash
npm start
```

Expected:
```
Compiled successfully!
Local: http://localhost:3000
```

Browser opens automatically.
