# DroneCode - Educational Programming Game Platform

A modern, production-ready platform for learning Python programming through interactive drone simulation games. Built with Django, React, and Pyodide.

## Overview

DroneCode combines:
- **Python Programming Education**: Write real Python code in an in-browser editor
- **Interactive Game Simulation**: Control a virtual drone through grid-based levels
- **Deterministic Game Engine**: Authoritative server-side validation of game logic
- **Django LMS**: Course management, progress tracking, and enrollment system
- **Secure Code Execution**: Python code runs isolated in web workers using Pyodide

## Project Structure

```
project-root/
├── backend/                           # Django REST API + Admin
│   ├── manage.py
│   ├── config/                        # Settings, URLs, WSGI
│   ├── apps/
│   │   ├── accounts/                  # Custom User model
│   │   ├── content/                   # Course, Module, Lesson, Level
│   │   ├── billing/                   # Transactions, Enrollments
│   │   ├── progress/                  # User progress tracking
│   │   └── api/                       # DRF viewsets, serializers, permissions
│   ├── requirements/
│   ├── db.sqlite3                     # Development database
│   └── media/                         # User uploads
│
├── frontend/                          # React + Vite SPA
│   ├── src/
│   │   ├── components/                # React UI components
│   │   │   ├── CodeEditor.jsx         # CodeMirror integration
│   │   │   ├── GameCanvas.jsx         # PixiJS renderer
│   │   │   ├── GameToolbar.jsx        # Run/Stop/Restart buttons
│   │   │   └── GameStatus.jsx         # Logs and status display
│   │   ├── engine/
│   │   │   └── GameEngine.js          # Core game logic
│   │   ├── runtime/
│   │   │   ├── RuntimeManager.js      # Web Worker manager
│   │   │   └── pythonWorker.js        # Pyodide runtime
│   │   ├── api/
│   │   │   └── client.js              # Backend API client
│   │   ├── App.jsx                    # Main app component
│   │   └── index.css                  # Global styles
│   ├── package.json
│   ├── index.html
│   └── vite.config.js
│
├── .gitignore
├── README.md                          # This file
├── backend/.env                       # Development environment variables
└── venv/                              # Python virtual environment
```

## Technology Stack

### Backend
- **Framework**: Django 5.0 + Django REST Framework
- **Database**: PostgreSQL (development: SQLite)
- **Auth**: JWT via djangorestframework-simplejwt
- **Admin**: Django Admin with django-json-widget for Level editing

### Frontend
- **Framework**: React 18 + Vite
- **Editor**: CodeMirror 6 with Python syntax highlighting
- **Graphics**: PixiJS for 2D isometric rendering
- **API**: Fetch API with axios-compatible wrapper
- **State**: React hooks + Redux Toolkit (optional)

### Runtime
- **Python Execution**: Pyodide (Python compiled to WebAssembly)
- **Isolation**: Web Workers for non-blocking execution
- **Security**: No filesystem/network access, restricted imports

## Core Features

### Game Engine
- **Deterministic execution**: Same code + level = same result
- **Authoritative validation**: Server validates all game outcomes
- **Command queue**: Python generates commands, engine validates
- **State management**: Immutable state transitions
- **Win/lose conditions**: Configurable objectives per level

### Python Game API
```python
# Movement
move(NORTH | SOUTH | EAST | WEST)

# Interactions
harvest()  # Collect wheat
cut()      # Cut trees/bushes
shoot()    # Destroy bombs
plant(entity_type)  # Plant at current position

# Utilities
get_position()   # Returns {'x': 0, 'y': 0}
get_facing()     # Returns direction
get_health()     # Returns remaining lives
```

### Learning Management
- **Courses**: Organize lessons into structured courses
- **Modules**: Group lessons by topic
- **Lessons**: Multiple playable levels
- **Levels**: Individual game challenges with configurations
- **Progress Tracking**: Track completion, attempts, stars
- **Enrollment**: Free and paid courses

### Payments
- **Click Integration**: Uzbekistan payment gateway
- **Payme Integration**: Mobile payment provider
- **Automatic Enrollment**: Payment triggers course access

## Setup & Installation

### Backend Setup

1. Create virtual environment:
```bash
cd AlgoGame
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r backend/requirements/base.txt
```

3. Initialize database:
```bash
cd backend
python manage.py migrate
python manage.py createsuperuser  # Create admin user
```

4. Run development server:
```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`
Admin panel: `http://localhost:8000/admin`

### Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/token/` - Login (get JWT tokens)
- `POST /api/auth/token/refresh/` - Refresh access token

### Courses & Content
- `GET /api/courses/` - List published courses
- `GET /api/courses/{id}/hierarchy/` - Get course structure with levels
- `GET /api/levels/{id}/` - Get level configuration

### Game Execution
- `POST /api/levels/{id}/attempt/` - Submit level attempt
  ```json
  {
    "code": "move(EAST)\nharvest()"
  }
  ```

### Progress Tracking
- `GET /api/progress/` - User's level progress
- `GET /api/submissions/` - User's submission history

### Enrollment
- `GET /api/enrollments/` - User's course enrollments
- `POST /api/enrollments/` - Enroll in course

## Database Models

### Course Hierarchy
```
User
  ↓
Enrollment → Course
                ↓
            Module
                ↓
            Lesson
                ↓
            Level (with grid_cells, win_condition, etc.)
                ↓
        UserLevelProgress
                ↓
        UserLevelSubmission
```

### Level Configuration Example
```json
{
  "id": 1,
  "title": "First Harvest",
  "grid_cells": [
    {"x": 0, "y": 0, "type": "grass"},
    {"x": 1, "y": 0, "type": "wheat"},
    {"x": 2, "y": 0, "type": "wheat"}
  ],
  "drone_start": {"x": 0, "y": 0, "facing": "east"},
  "available_functions": ["move", "harvest"],
  "starter_code": "move(EAST)\nharvest()",
  "win_condition": {"type": "all_wheat_harvested"},
  "max_lives": 3,
  "max_steps": 50,
  "stars_thresholds": {"10": 3, "20": 2, "50": 1}
}
```

## Game Logic

### Command Execution Flow
1. User writes Python code
2. Click "Run" → Code sent to Web Worker
3. Pyodide executes code → Generates command list
4. Commands queued in Game Engine
5. Commands executed one-by-one:
   - Validation (collision, bounds, etc.)
   - State update
   - Render update (400ms animation)
6. Win/Lose condition checked after each command
7. Final state persisted to backend

### Example Level Flow
```
Start: Drone at (0,0), facing EAST
Goal: Harvest all wheat

Code:
  move(EAST)      # → Drone at (1,0)
  harvest()       # → Harvest wheat at (1,0)
  move(EAST)      # → Drone at (2,0)  
  harvest()       # → Harvest wheat at (2,0)
                  # → All wheat harvested → WIN!

Result:
  Status: won
  Steps: 4
  Lives: 3
  Stars: 3 (if steps ≤ 10)
```

## Security Considerations

### Production Checklist
- [ ] Set `DEBUG=False` in production
- [ ] Use strong `SECRET_KEY`
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set database to PostgreSQL
- [ ] Enable rate limiting on API
- [ ] Use environment variables for secrets
- [ ] Enable CSRF protection
- [ ] Monitor Pyodide execution time/memory
- [ ] Audit submitted code logs

### Python Execution Limits
- `MAX_WALL_TIME`: 10 seconds per execution
- `MAX_LOOP_ITERATIONS`: 10,000
- `MAX_COMMANDS`: 1,000 per execution
- `MAX_MEMORY`: Limited by browser

## Development Workflow

1. **Backend changes**:
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Frontend changes**: Auto-reload with Vite

3. **Testing backend**:
   ```bash
   python manage.py test
   ```

4. **Testing frontend**:
   ```bash
   npm test
   ```

## Deployment

### Docker (Recommended)
```dockerfile
# See infrastructure/docker/ directory
```

### Heroku
```bash
heroku create dronecode-app
git push heroku main
```

### Manual VM
1. Clone repository
2. Set environment variables
3. Run migrations: `python manage.py migrate`
4. Collect static files: `python manage.py collectstatic`
5. Run with gunicorn: `gunicorn config.wsgi`
6. Build frontend: `npm run build`
7. Serve with nginx

## Contributing

Follow these guidelines:
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following code style
3. Run tests: `npm test` & `python manage.py test`
4. Commit with clear messages: `git commit -m "Add feature X"`
5. Push and create PR

## License

MIT License - See LICENSE file

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Questions**: Support email or Discord

---

**Built with ❤️ for learning Python**
