# SmartAgri-Predict — Setup Guide

## Prerequisites
- Python 3.11+
- MySQL 8.0+
- Node 18+ (frontend runs on Lovable)

## Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL=mysql+pymysql://root:yourpassword@localhost/smartagri
#   SECRET_KEY=your-secret-key-here
#   CORS_ORIGINS=*

# 4. Initialize database
mysql -u root -p < db_init.sql

# 5. Load seed data
mysql -u root -p smartagri < seed.sql

# 6. Run the server
flask run --port 5000
```

## .env.example

```
DATABASE_URL=mysql+pymysql://root:password@localhost/smartagri
SECRET_KEY=change-me-in-production
CORS_ORIGINS=*
```

## Frontend

The React frontend is hosted on Lovable. It connects to the Flask API at the URL
specified in `VITE_API_URL` (defaults to `http://localhost:5000/api`).

## API Endpoints

| Resource       | Endpoints                                      |
|----------------|-------------------------------------------------|
| Agriculteurs   | GET, POST, PUT, DELETE `/api/agriculteurs`       |
| Cultures       | GET, POST, PUT, DELETE `/api/cultures`           |
| Parcelles      | GET, POST, PUT, DELETE `/api/parcelles`          |
| Saison         | POST `/api/parcelles/:id/ouvrir-saison`          |
|                | POST `/api/parcelles/:id/fermer-saison`          |
| Mesures        | GET, POST, PUT, DELETE `/api/mesures`            |
| Besoins        | GET, PUT `/api/besoins/:id/appliquer`, DELETE    |
| Stress         | GET, POST `/api/stress/calculer/:id`, DELETE     |
| Weather        | GET `/api/weather/forecast/:id`                  |
|                | GET `/api/weather/history/:id?start=&end=`       |
|                | POST `/api/weather/sync/:id` (auto-create mesures)|
