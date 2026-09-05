# DroneCode - Development Guide & Architecture Overview

## Project Status

**Version**: 2.0.0 (MVP Complete)  
**Last Updated**: 2026-09-05  
**Status**: ✅ Core features implemented, ready for testing and feature expansion

### What's Implemented

✅ **Backend (Django + DRF)**
- Custom User model with profiles
- 4-level course hierarchy (Course → Module → Lesson → Level)
- 2-tier model separation (content, billing, progress)
- JWT authentication with refresh tokens
- Role-based access control
- Admin interface with JSON configuration for levels

✅ **Frontend (React + Vite)**
- Code editor with syntax highlighting (CodeMirror 6)
- Game canvas with isometric rendering (PixiJS)
- Execution log and status display
- Run/Stop/Restart controls
- Responsive dark theme UI

✅ **Game Engine**
- Deterministic state machine
- 5 game commands (move, harvest, cut, shoot, plant)
- 4 objective types (wheat, bombs, position, survive)
- Life system with event tracking
- Star scoring (1-3 stars based on efficiency)
- Comprehensive error handling

✅ **Python Runtime**
- Pyodide integration in Web Worker
- Safe code execution in browser
- API bindings for game commands
- Error reporting with line numbers

### What's Planned (Post-MVP)

- [ ] Payment integration (Click/Payme webhooks)
- [ ] Multiplayer leaderboards
- [ ] Achievements system
- [ ] Advanced level editor UI
- [ ] Mobile app (React Native)
- [ ] Code templates and hints system
- [ ] Video tutorials
- [ ] Automated test suite

## Architecture

### Request Flow Diagram

```
User Browser
    │
    ├─────────────────────────────────────┐
    │                                     │
[React UI] ◄──────────┐            [Web Worker]
    │                 │                   │
    ├─ Edit code      │            [Pyodide Runtime]
    ├─ Click Run ────►│                   │
    └─ Display game   │              Executes Python
                      │              Generates commands
              [GameEngine] ◄──────────────┘
              Validates commands
              Updates state
              
              └────────────────────────────────────┐
                                                   │
                                            [Django API]
                                        Validates results
                                        Persists progress
```

### Data Flow for Code Execution

```
1. User writes Python code in editor
           │
           ▼
2. Click "Run" button
           │
           ▼
3. Frontend sends code to Web Worker
           │
           ▼
4. Pyodide executes code
   - move(EAST) ────► Command object: {type: 'move', direction: 'east'}
   - harvest()  ────► Command object: {type: 'harvest'}
   - Collects all into array
           │
           ▼
5. Commands returned to GameEngine
           │
           ▼
6. For each command:
   ├─ Validate (bounds, collision, interaction type)
   ├─ Update state (drone position, cell contents, lives)
   ├─ Render (visual update)
   ├─ Wait 400ms (animation)
   └─ Check win condition
           │
           ▼
7. On completion:
   ├─ Calculate stars
   ├─ Show result (Win/Lose)
   └─ Send to backend (optional: POST /api/levels/{id}/attempt/)
```

### Database Schema

```
Course (1) ───────── (N) Module
           is_published     │
           price           (1)│
                            │(N)
                         Lesson
                           │
                          (1)│
                            │(N)
                         Level
                     grid_cells (JSON)
                  win_condition (JSON)
                available_functions (JSON)
                            │
                            ├─ (1)──────(N) UserLevelProgress
                            │         user, status, attempts
                            │         stars, best_steps
                            │
                            └─ (1)──────(N) UserLevelSubmission
                                      source_code, result
                                      steps_used, error_log

User ─────────────────┐
 │                    │
 ├─ (1)───(N) Enrollment ───(1)──────(1) Course
 │                    │
 ├─ (1)───(N) Transaction
 │
 └─ (1)───(N) UserLevelProgress
```

## File Structure Explained

### Backend Organization

```
backend/
├── config/                       # Django project settings
│   ├── settings.py              # All Django config
│   ├── urls.py                  # URL routing
│   └── wsgi.py                  # WSGI application
│
├── apps/
│   ├── accounts/               # User authentication
│   │   ├── models.py          # User model
│   │   ├── admin.py           # Admin customization
│   │   └── migrations/
│   │
│   ├── content/               # Learning content
│   │   ├── models.py          # Course, Module, Lesson, Level
│   │   └── admin.py           # Admin with JSON editor
│   │
│   ├── billing/               # Payments & enrollment
│   │   ├── models.py          # Transaction, Enrollment
│   │   └── admin.py
│   │
│   ├── progress/              # Learning progress
│   │   ├── models.py          # UserLevelProgress, UserLevelSubmission
│   │   └── admin.py
│   │
│   └── api/                   # REST API
│       ├── serializers.py     # DRF serializers for all models
│       ├── views.py           # DRF viewsets with custom actions
│       ├── permissions.py     # Access control logic (CanAccessLevel)
│       ├── urls.py            # API endpoint routing
│       └── filters.py         # Search/filtering (future)
│
├── tests/                     # Test suite (future)
│
├── manage.py                  # Django CLI
├── requirements.txt           # Python dependencies
└── .env                       # Development secrets
```

### Frontend Organization

```
frontend/
├── src/
│   ├── components/            # React UI components
│   │   ├── CodeEditor.jsx     # CodeMirror wrapper with Python mode
│   │   ├── GameCanvas.jsx     # PixiJS game renderer
│   │   ├── GameToolbar.jsx    # Run/Stop/Restart buttons
│   │   └── GameStatus.jsx     # Log output & status display
│   │
│   ├── engine/                # Game logic (no React)
│   │   └── GameEngine.js      # Core game state machine
│   │
│   ├── runtime/               # Python execution
│   │   ├── RuntimeManager.js  # Web Worker wrapper
│   │   └── pythonWorker.js    # Pyodide execution (unused, but structure ready)
│   │
│   ├── api/                   # Backend communication
│   │   └── client.js          # Fetch wrapper with JWT
│   │
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # React entry point
│   └── App.css, index.css     # Global styling
│
├── index.html                 # HTML entry point
├── vite.config.js             # Vite configuration
├── package.json               # Node dependencies
└── public/                    # Static assets
```

## Key Classes & Functions

### GameEngine (Core Game Logic)

```javascript
class GameEngine {
  constructor(levelData)           // Initialize with level config
  resetState()                      // Reset to level start
  queueCommand(command)             // Add command to queue
  executeNextCommand()              // Execute and validate one command
  checkWinCondition()               // Check if level is won
  getState()                        // Get current game state
  
  // Private command executors:
  executeMove(direction)
  executeHarvest()
  executeCut()
  executeShoot()
  executePlant(entity)
}
```

### RuntimeManager (Python Execution)

```javascript
class RuntimeManager {
  constructor()
  async initialize()                // Load Pyodide
  async executeCode(code, maxSteps, availableFunctions)
  terminate()                       // Clean up worker
}

// Returns: { success: boolean, commands: [], error?: string }
```

### API Client

```javascript
class APIClient {
  async login(username, password)
  async register(...)
  async getCourses()
  async getLevel(levelId)
  async submitAttempt(levelId, code)
  async getLevelProgress(levelId)
  async getSubmissions()
  async createEnrollment(courseId, transactionId)
}
```

## Important Design Decisions

### 1. Web Worker for Python Execution
**Why**: Prevents UI blocking, provides execution isolation
**Tradeoff**: Adds ~1sec startup time for Pyodide loading

### 2. GameEngine as Pure JS
**Why**: No dependencies, testable, reusable
**Benefit**: Can run server-side for validation

### 3. Pyodide Runtime
**Why**: No backend Python execution of user code (security)
**Limitation**: ~3.5 MB download on first load

### 4. Deterministic Commands
**Why**: Enables replay, server validation, cheating prevention
**Design**: Python → Commands → Engine → State

### 5. SQLite in Development
**Why**: Zero configuration, file-based
**Production**: Switch to PostgreSQL

### 6. JWT + Session Auth
**Why**: Supports both API and stateless frontend
**Benefit**: Token refresh allows long sessions

## Testing Strategy

### Backend Tests (pytest)
```python
# Model tests
def test_level_creation():
    level = Level.objects.create(...)
    assert level.id

# API tests
def test_get_level_unauthorized():
    response = client.get('/api/levels/1/')
    assert response.status_code == 401

def test_submit_attempt_free_course():
    # Should work for enrolled users
    pass
```

### Frontend Tests (Vitest)
```javascript
// GameEngine tests
test('Move command updates drone position', () => {
  const engine = new GameEngine(sampleLevel)
  engine.executeMove('east')
  assert.equal(engine.world.drone.x, 1)
})

// Component tests
test('CodeEditor displays available functions', () => {
  render(<CodeEditor availableFunctions={['move', 'harvest']} />)
  expect(screen.getByText('move()')).toBeInTheDocument()
})
```

## Common Development Tasks

### Add a new game command

1. **Add to API** (`engine/GameEngine.js`):
```javascript
function executeMyCommand(param) {
  // Validate
  // Update state
  // Log
}
```

2. **Bind in Python** (`runtime/RuntimeManager.js`):
```python
def my_command(param):
    _command_queue.append({'type': 'my_command', 'param': param})
```

3. **Add to available functions** (Level in admin)
4. **Test with a level**

### Create a new Level via Admin

1. Go to `http://localhost:8000/admin/content/level/add/`
2. Fill in Grid Cells JSON
3. Set Win Condition JSON
4. List Available Functions
5. Publish
6. Test in frontend

### Call a new API endpoint

1. **Add to backend** (`api/views.py`):
```python
@action(detail=True, methods=['post'])
def my_action(self, request, pk=None):
    ...
    return Response(data)
```

2. **Add to frontend** (`api/client.js`):
```javascript
async myAction(levelId, data) {
  return this.request(`/levels/${levelId}/my-action/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

3. **Use in component** (`App.jsx`):
```javascript
const result = await apiClient.myAction(levelId, data)
```

## Performance Optimization Tips

### Frontend
- Use `React.memo()` for expensive components
- Lazy load GameCanvas (only load when playing)
- Cache level data with localStorage
- Throttle game state updates

### Backend
- Add database indexes on frequently queried fields
- Use select_related/prefetch_related for foreign keys
- Cache level definitions in Redis
- Use CDN for static files and media

### Game Engine
- Cache cell lookups with Map<"x,y", cell>
- Reuse direction offset calculations
- Batch state updates

## Security Checklist

- [ ] Python execution: No import statements
- [ ] Python execution: No filesystem access
- [ ] Python execution: Max 10 seconds timeout
- [ ] API: CSRF tokens on form submissions
- [ ] API: Rate limiting on auth endpoints
- [ ] Database: SQL injection prevention (ORM used)
- [ ] Frontend: No sensitive data in localStorage
- [ ] Backend: No secrets in version control (.env ignored)
- [ ] HTTPS: Enabled in production
- [ ] CORS: Whitelist only known domains

## Deployment Checklist

### Pre-deployment
- [ ] Run full test suite
- [ ] Update VERSION number
- [ ] Create git tag: `git tag v2.0.0`
- [ ] Build frontend: `npm run build`
- [ ] Collect static files: `python manage.py collectstatic`

### Production Setup
- [ ] Configure PostgreSQL
- [ ] Set SECRET_KEY to random value
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS
- [ ] Setup HTTPS with Let's Encrypt
- [ ] Configure firewall
- [ ] Setup monitoring (Sentry, Datadog)
- [ ] Setup backups

### Post-deployment
- [ ] Test login flow
- [ ] Test course access
- [ ] Run a sample level
- [ ] Check error logs
- [ ] Verify database backups

## Useful Commands

```bash
# Backend
python manage.py shell          # Django REPL
python manage.py dbshell       # Database REPL
python manage.py migrate       # Apply migrations
python manage.py test          # Run tests
python manage.py makemigrations --dry-run  # Preview changes

# Frontend
npm run dev                     # Start dev server
npm run build                   # Build for production
npm run preview                 # Preview build
npm run lint                    # Run ESLint
npm test                        # Run tests

# Git
git log --oneline               # View commit history
git branch -a                   # List all branches
git diff main..feature          # See changes
git rebase main                 # Update from main
```

## Resources

- **Django Docs**: https://docs.djangoproject.com/
- **DRF Docs**: https://www.django-rest-framework.org/
- **React Docs**: https://react.dev/
- **Pyodide Docs**: https://pyodide.org/
- **PixiJS Docs**: https://pixijs.download/release/docs/
- **CodeMirror 6**: https://codemirror.net/

## Contact & Support

- **Issues**: Open GitHub issue with detailed description
- **Questions**: Check documentation first
- **Security**: Email security@dronecode.dev

---

**Last Updated**: 2026-09-05  
**Next Review**: After 100 user sign-ups or 1 month
