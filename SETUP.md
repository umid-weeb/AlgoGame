# DroneCode - Setup Guide

Complete setup instructions for development and production.

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite for development)
- Git

## Development Setup (Mac/Linux)

### 1. Clone and navigate to project
```bash
cd /path/to/AlgoGame
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Navigate to backend
cd backend

# Create .env file
cat > .env << EOF
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=django.db.backends.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF

# Run migrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser
# Follow prompts to create admin account

# Collect static files (optional for development)
python manage.py collectstatic --noinput

# Start development server
python manage.py runserver 0.0.0.0:8000
```

Backend will be available at: `http://localhost:8000`
Admin panel: `http://localhost:8000/admin`

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### 4. Test the setup

1. Go to `http://localhost:5173` in browser
2. You should see the DroneCode interface
3. Admin panel at `http://localhost:8000/admin`

## Loading Sample Data

### Create a sample course via admin panel:

1. Go to `http://localhost:8000/admin`
2. Login with superuser credentials
3. Create Course:
   - Title: "Python Basics"
   - Slug: "python-basics"
   - Price: 0 (free)
   - Publish: Yes

4. Create Module:
   - Course: "Python Basics"
   - Title: "Getting Started"
   - Order: 1

5. Create Lesson:
   - Module: "Getting Started"
   - Title: "First Steps"
   - Order: 1

6. Create Level:
   - Lesson: "First Steps"
   - Title: "Simple Move"
   - Grid Cells: `[{"x":0,"y":0,"type":"grass"},{"x":1,"y":0,"type":"grass"},{"x":2,"y":0,"type":"wheat"}]`
   - Drone Start: x=0, y=0, facing=east
   - Available Functions: move, harvest
   - Win Condition: `{"type":"all_wheat_harvested"}`
   - Max Lives: 3
   - Max Steps: 50
   - Starter Code: `move(EAST)\nmove(EAST)\nharvest()`

## Development Workflow

### Terminal 1 - Backend
```bash
cd /path/to/AlgoGame
source venv/bin/activate
cd backend
python manage.py runserver
```

### Terminal 2 - Frontend
```bash
cd /path/to/AlgoGame/frontend
npm run dev
```

### Making changes

**Backend changes:**
- Edit models in `apps/*/models.py`
- Run: `python manage.py makemigrations` → `python manage.py migrate`
- Edit views in `api/views.py` - automatic reload

**Frontend changes:**
- Edit React components in `src/components/` - automatic hot reload
- Edit Game Engine in `src/engine/GameEngine.js` - automatic reload

## Building for Production

### Backend

```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Set production environment
export DEBUG=False
export SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
export DB_ENGINE=django.db.backends.postgresql
export DB_NAME=dronecode
export DB_USER=postgres
export DB_PASSWORD=your-password
export DB_HOST=localhost
export DB_PORT=5432

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Run with gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Dist folder will contain compiled files
# Serve with nginx or static file server
```

## Database Setup (PostgreSQL)

### On Mac (with Homebrew):
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL
brew services start postgresql

# Create database
createdb dronecode

# Create user
createuser dronecode_user
psql -c "ALTER USER dronecode_user WITH PASSWORD 'your-password';"
psql -c "ALTER USER dronecode_user CREATEDB;"
```

### Update backend/.env:
```bash
DB_ENGINE=django.db.backends.postgresql
DB_NAME=dronecode
DB_USER=dronecode_user
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

## Troubleshooting

### Python/Django issues
```bash
# Verify Python version
python --version  # Should be 3.10+

# Clear Django cache
python manage.py clear_cache

# Check database
python manage.py check

# Reset migrations (development only!)
# Delete db.sqlite3 and migration files
python manage.py migrate --run-syncdb
```

### Node/React issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :5173  # Check frontend port
lsof -i :8000  # Check backend port
```

### Pyodide loading issues
- Ensure internet connection (Pyodide downloads from CDN)
- Clear browser cache
- Check browser console for errors
- Try different browser

## IDE Setup

### VS Code
1. Install extensions:
   - Python
   - Django
   - ES7+ React/Redux/React-Native snippets
   - Prettier
   - ESLint

2. Create `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "[python]": {
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.formatOnSave": true
  }
}
```

### PyCharm
1. Set Python interpreter: `venv/bin/python`
2. Mark `frontend/src` as Sources Root
3. Mark `backend` as Sources Root

## Environment Variables

### Development (.env)
```bash
DEBUG=True
SECRET_KEY=your-dev-key
ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=django.db.backends.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Production (.env.prod)
```bash
DEBUG=False
SECRET_KEY=your-secure-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_ENGINE=django.db.backends.postgresql
DB_NAME=dronecode
DB_USER=dronecode_user
DB_PASSWORD=secure_password
DB_HOST=db.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

## Testing

### Backend tests
```bash
cd backend
python manage.py test
```

### Frontend tests
```bash
cd frontend
npm test
```

## Performance Tips

1. **Database**: Use indexes on frequently queried fields
2. **API**: Enable pagination (default: 20 items/page)
3. **Frontend**: Use React.memo for expensive components
4. **Game Engine**: Cache cell lookups with Map
5. **Pyodide**: Cache compiled Python for multiple runs

## Next Steps

1. Read `README.md` for full documentation
2. Check `DroneCode_PRODUCTION_SKILL.md` for production guidelines
3. Explore `backend/api/` for API implementation
4. Check `frontend/src/engine/GameEngine.js` for game logic
5. Review test files for examples

---

**Need help?** Check GitHub issues or contact support.
