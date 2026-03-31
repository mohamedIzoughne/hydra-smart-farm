# Hydra Smart Farm

Hydra Smart Farm is a modern web application designed for smart agriculture management, focusing on hydric stress monitoring and culture suggestions.

## 🚀 Project Architecture

- **Frontend**: React + Vite + Tailwind CSS (located in the root directory).
- **Backend**: Flask + SQLAlchemy + MySQL (located in the `backend/` directory).
- **Database**: MySQL 8.0.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python 3.9+](https://www.python.org/)
- [Docker & Docker Compose](https://www.docker.com/) (Optional, for database)
- [MySQL Server](https://www.mysql.com/) (Optional, if not using Docker)

---

## 📦 Installation & Setup

### 1. Database Setup

You have two options to set up the database:

#### Option A: Using Docker (Recommended)
This is the easiest way to get the database running with all tables and seed data pre-loaded.
```bash
# From the project root
docker-compose up -d
```
*Note: The database will be accessible on `localhost:3307` as configured in `docker-compose.yml`.*

#### Option B: Normal MySQL Installation
If you prefer to use a local MySQL installation:
1. Log in to your MySQL terminal: `mysql -u root -p`
2. Create the database and user:
   ```sql
   CREATE DATABASE smartagri;
   CREATE USER 'agriuser'@'localhost' IDENTIFIED BY 'agripassword';
   GRANT ALL PRIVILEGES ON smartagri.* TO 'agriuser'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Import the schema and seed data:
   ```bash
   mysql -u agriuser -p smartagri < backend/db_init.sql
   mysql -u agriuser -p smartagri < backend/seed.sql
   ```

   also currently I'm using port 3307, but when using normal mysql, you should use port 3306(default) so then you need to change the port in the .env file to 3306

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
# .venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and update DATABASE_URL if necessary
# If using Docker (Port 3307): 
# DATABASE_URL=mysql+pymysql://agriuser:agripassword@localhost:3307/smartagri
# If using Local MySQL (Port 3306):
# DATABASE_URL=mysql+pymysql://agriuser:agripassword@localhost:3306/smartagri

# Run the backend
python run.py
```

### 3. Frontend Setup
```bash
# From the project root (not backend)
npm install

# Start the development server
npm run dev
```
The application should now be running at `http://localhost:8080`.

---

## ⚙️ Configuration (.env)

The `backend/.env` file contains important configurations:
- `SECRET_KEY`: Used for session security.
- `JWT_SECRET_KEY`: Used for JWT authentication.
- `DATABASE_URL`: Connection string for SQLAlchemy.
- `CORS_ORIGINS`: Allowed frontend origins (defaults to `http://localhost:8080`).

---

## 📖 Features
- **Real-time Monitoring**: Track hydric stress levels across different parcelles.
- **Culture Suggestions**: Intelligent recommendations for alternative cultures.
- **Alert System**: Notifications for critical agricultural conditions.
- **User Management**: Secure login and registration.
