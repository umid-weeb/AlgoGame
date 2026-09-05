---
name: drone-code-game
version: 2.0.0
description: >-
  Use this skill for all work on the DroneCode project: a production-oriented
  browser programming game in which users write Python code to control a
  virtual drone/agent inside deterministic programmable worlds, backed by a
  Django LMS/admin platform. This skill is authoritative for engineering
  boundaries, technology choices, game-engine behavior, Python execution,
  security, API contracts, data models, testing, and implementation workflow.
  Read this skill before modifying code. Do not guess, silently redesign,
  or introduce conflicting architecture.
---

# DroneCode — Production Engineering Skill

## 0. Mission

DroneCode is a **real product**, not a tutorial, throwaway prototype, or demo.
The product combines:

- Python programming education
- deterministic visual simulation
- virtual drone/agent control
- algorithmic challenges
- level-based learning
- Django LMS and administration
- secure untrusted-code execution
- progress, scoring, and future leaderboards

The core loop is:

```text
User writes Python
      ↓
Parse + validate
      ↓
Execute in isolated runtime
      ↓
Generate allowed game commands
      ↓
Deterministic Game Engine
      ↓
Update authoritative state
      ↓
Render / animate
      ↓
Win / Lose / Progress
```

The first release may be small. The architecture must not be careless.

---

# 1. Non-Negotiable Engineering Rules

These rules apply unless the user explicitly changes the product requirements.

1. **Do not treat the project as a demo.** Build production-quality boundaries from the beginning.
2. **Read this skill before editing code.** Then inspect the existing repository and relevant files.
3. **Do not guess.** If an architectural decision is ambiguous and materially affects correctness, ask before changing it.
4. **Do not silently rewrite unrelated code.** Keep changes scoped to the requested feature.
5. **Do not introduce conflicting abstractions.** Reuse existing domain boundaries and contracts.
6. **Python code is untrusted input.** Never execute arbitrary user Python inside Django, the API process, or a privileged application worker.
7. **The client is not authoritative.** Never trust browser-reported `result`, `lives_left`, `steps_used`, or score as proof of completion.
8. **The Game Engine owns game state.** UI components must not implement game rules.
9. **Python generates commands; the Game Engine validates and applies them.** Python cannot directly mutate world state.
10. **Published levels are versioned.** A submission must be reproducible against the exact level version and rules used for execution.
11. **Deterministic execution is a product requirement.** Same level version + same initial state + same code + same runtime rules must produce the same authoritative result.
12. **Every meaningful feature requires tests.** Do not declare a feature complete because the happy path works manually.
13. **Do not over-engineer infrastructure before the core loop works.** Start simple, preserve clear scaling boundaries, then scale the execution layer independently.
14. **No technology alternatives in implementation decisions.** This skill specifies one default stack; do not switch to another library/framework without an explicit reason and user approval.
15. **Do not change established field names/API shapes casually.** If a breaking change is required, update the relevant specs and migration plan together.

---

# 2. Product Architecture

High-level domains:

```text
EDUCATION DOMAIN
Course → Module → Lesson → Level

GAME DOMAIN
Level → World → Tiles → Entities → Objectives

EXECUTION DOMAIN
Python Source → Parser → Validator → Runtime → Commands

PLATFORM DOMAIN
Users → Enrollment → Billing → Progress → Submissions

INFRASTRUCTURE DOMAIN
API → Database → Queue → Workers → Storage → Observability
```

Keep these domains separated.

The frontend may display and request state, but it does not own authoritative business rules.

---

# 3. Fixed Technology Decisions

Use these technologies unless the user explicitly requests a change.

| Layer | Decision |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Database | PostgreSQL |
| Auth | Django custom User + JWT via SimpleJWT |
| Frontend | React + TypeScript + Vite |
| Code editor | CodeMirror 6 |
| Browser Python runtime | Pyodide inside a Web Worker |
| Game renderer | PixiJS |
| State | Explicit Game Engine state + React UI state only where appropriate |
| Queue | Redis + Celery for authoritative/server-side execution when introduced |
| Payments | Click / Payme webhook adapters behind a billing interface |
| Static/media | Object storage + CDN in production |
| Containers | Docker |
| CI | Automated lint/type/test/build checks |

Do not say "Vanilla JS or React", "Monaco or CodeMirror", or "PixiJS or Three.js" in implementation work. The default decisions above are authoritative.

---

# 4. Repository Architecture

Recommended monorepo:

```text
project-root/
├── backend/
│   ├── manage.py
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── content/
│   │   ├── billing/
│   │   ├── progress/
│   │   ├── game/
│   │   └── api/
│   ├── tests/
│   └── requirements/
│
├── frontend/
│   ├── src/
│   │   ├── editor/
│   │   ├── runtime/
│   │   ├── game/
│   │   ├── engine/
│   │   ├── api/
│   │   ├── features/
│   │   └── shared/
│   ├── tests/
│   └── package.json
│
├── packages/
│   ├── game-schema/
│   └── shared-types/
│
├── infrastructure/
│   ├── docker/
│   └── deployment/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── api/
│   └── game-engine/
│
└── README.md
```

If the existing repository has a different structure, first inspect it. Do not restructure the entire repository merely to match this tree unless requested.

---

# 5. Core Game Model

## 5.1 World

The world is **not limited to 4×4**.

The first level may be 4×4, but the engine must support arbitrary and irregular shapes.

Conceptually:

```text
      🟩 🟩 🟩
   🟩 🟩 🟩 🟩
🟩 🟩 🟩 🟩
   🟩 🟩
      🟩
```

A world contains valid cells plus entities and terrain metadata.

## 5.2 Tile

A tile may contain:

```text
Tile
├── coordinate
├── terrain
├── walkable
├── obstacle
├── resource/entity reference
└── effects/metadata
```

Do not assume one entity per tile unless the level schema explicitly defines that constraint.

## 5.3 Entities

Initial fictional game entities:

- Drone
- Wheat
- Bush
- Tree
- Rock
- Wall
- Water
- Target
- Bomb as a fictional game-object mechanic

Game actions such as `shoot()` or `attack()` are abstract in-game interactions. Do not extend this project into real-world weapon/drone control without a separate, explicitly approved scope.

---

# 6. Python Game API

Initial API:

```python
move(NORTH)
move(SOUTH)
move(EAST)
move(WEST)

harvest()
cut()
collect()
plant()

get_position()
get_tile()
get_health()
get_energy()
```

Potential later APIs:

```python
scan()
inspect()
build()
repair()
```

Only APIs explicitly enabled by a level may be used.

## 6.1 API boundary

A Python call:

```python
move(EAST)
```

must conceptually become:

```text
Python API
   ↓
Command object
   ↓
Command Queue
   ↓
Game Engine validation
   ↓
State transition
   ↓
Domain event
```

Never let Python directly mutate `drone.x`, `drone.y`, tile contents, lives, score, or objective state.

---

# 7. Python Execution Security

## 7.1 Browser runtime

For immediate UI feedback:

```text
React
  ↓
Web Worker
  ↓
Pyodide
  ↓
Restricted game API
  ↓
Command list
```

Pyodide must run in a Web Worker, never on the main UI thread.

## 7.2 Important security distinction

**Web Worker + Pyodide is a UI isolation/performance mechanism, not the authoritative production security boundary.**

Never claim that browser execution alone protects the server.

For authoritative validation, use:

```text
Client
  ↓
Execution API
  ↓
Queue
  ↓
Isolated worker/sandbox
  ↓
Authoritative Game Engine
  ↓
Verified result
  ↓
Progress persistence
```

The exact production sandbox implementation must provide process/container isolation and strict resource controls appropriate to the deployment environment.

## 7.3 Required execution limits

Every execution must have explicit limits:

```text
MAX_WALL_TIME
MAX_CPU_TIME
MAX_INSTRUCTIONS
MAX_LOOP_ITERATIONS
MAX_COMMANDS
MAX_MEMORY
MAX_OUTPUT_SIZE
MAX_SOURCE_SIZE
```

Do not rely only on `max_steps`.

A program such as:

```python
while True:
    pass
```

must terminate safely even though it generates no game commands.

## 7.4 Import and capability policy

Initially, user code should have no general-purpose imports.

If imports are introduced later, use an explicit allowlist and test every exposed capability.

Do not expose:

- filesystem access
- subprocess/process creation
- sockets/network access
- environment secrets
- application internals
- database connections
- OS command execution

---

# 8. Command Queue

Function calls do not immediately animate the drone.

Example:

```python
move(EAST)
move(EAST)
cut()
```

becomes:

```text
1. MOVE EAST
2. MOVE EAST
3. CUT
```

Each command should be serializable and deterministic.

A command should conceptually include:

```text
command_id
sequence
command_type
arguments
source_location (when available)
```

Source location is useful for explaining runtime errors to users.

---

# 9. Deterministic Game Engine

The engine is authoritative for:

- movement
- collisions
- entity interaction
- lives
- objectives
- step counting
- command validity
- level completion/failure
- final state

Example:

```text
Initial State
     +
Command 1
     ↓
State 1
     +
Command 2
     ↓
State 2
     +
Command 3
     ↓
Final State
```

Given the same:

```text
level_version
initial_state
source_code
runtime_rules
```

the engine must produce the same authoritative result.

This enables:

- replay
- debugging
- tests
- server verification
- anti-cheat validation
- scoring

---

# 10. Level Rules

A level contains:

```text
Map definition
Initial drone state
Entities
Allowed functions
Starter code
Objective
Life limit
Execution limits
Step/command limit
Tests
Scoring rules
Version
```

Initial win conditions:

```text
all_wheat_harvested
all_bombs_destroyed
reach_position
survive_n_steps
```

The implementation must use a registry/strategy approach rather than a giant `if/elif` block when the number of objective types grows.

---

# 11. Life System

Default:

```text
❤️❤️❤️
```

Recommended rules:

| Event | Life |
|---|---:|
| Syntax error | 0 |
| Unknown API | 0 |
| Invalid direction | 0 |
| Move outside valid world | -1 |
| Move into obstacle | -1 |
| Invalid interaction | -1 |
| Runtime timeout | -1 |
| Mission failure | -1 |

The exact life rules must come from level configuration when configurable behavior is required.

When lives reach zero:

```text
GAME OVER
[RESTART]
```

A syntax error should normally be an educational editor/runtime error, not a gameplay penalty.

---

# 12. Restart / Stop Semantics

## Restart

`Restart` resets the **game session state**:

- command queue
- current drone state
- world/entity state
- lives
- objective progress
- execution status
- animations

It must **not delete the user's code**.

The editor retains the current source unless the user explicitly resets the code to starter code.

## Stop

`Stop` must:

- request Python runtime termination
- stop/cancel queued execution
- stop future command playback
- return the game to a safe idle state
- prevent stale commands from executing after stop

The implementation must handle race conditions between `Run`, `Stop`, and `Restart`.

Use an execution/session identifier so stale worker results cannot mutate a newer session.

---

# 13. Animation

Default command playback:

```text
400ms per animated step
```

The animation layer must not determine game validity.

Correct order:

```text
Command
 ↓
Engine validates/applies
 ↓
Authoritative state transition
 ↓
Animation/render event
```

Never:

```text
Animation
 ↓
Maybe update state
```

Future controls may include:

- pause
- step
- 2× speed
- 4× speed

---

# 14. Frontend Layout

Desktop baseline:

```text
Left panel:
  Code editor: 450×550px
  Toolbar: 40px

Right panel:
  Game canvas: approximately 800×500px
  Status/resources/lives area: approximately 80px
```

Toolbar:

```text
[Run] [Stop] [Restart]
```

Responsive behavior:

```text
Desktop:
Editor | Game

Small screens:
Game
Editor
```

The exact desktop dimensions are UX defaults, not permission to break accessibility or responsive behavior.

---

# 15. Code Editor

Use **CodeMirror 6**.

Required features:

- Python syntax highlighting
- line numbers
- basic autocomplete for available game APIs
- diagnostics/error markers where possible
- keyboard shortcuts
- starter code
- read-only mode when appropriate

Autocomplete must be generated from the level's `available_functions` rather than exposing every possible game API.

---

# 16. Console

The console is a structured execution log.

Example:

```text
> Program started
> move(EAST)
Drone moved to (1,0)
> move(EAST)
Drone moved to (2,0)
> cut()
Wheat harvested ✓
> Program completed
MISSION COMPLETE ✓
```

Use structured event types internally:

```text
info
success
warning
error
system
```

Do not allow arbitrary user output to overwhelm the UI or backend. Enforce output-size limits.

---

# 17. Django Domain Model

Core entities:

```text
User
Course
Module
Lesson
Level
Enrollment
Transaction
UserLevelProgress
Submission
GameSession
Achievement
```

## 17.1 Custom User

Use a custom user model from the beginning.

Do not introduce a custom user model after migrations and production data already exist without a deliberate migration plan.

## 17.2 Course hierarchy

```text
Course
  ↓
Module
  ↓
Lesson
  ↓
Level
```

Levels are playable units.

---

# 18. Required Level Fields

These names are stable domain fields unless the user explicitly requests a breaking change:

```text
grid_cells
drone_start_x
drone_start_y
drone_start_facing
available_functions
starter_code
win_condition
max_lives
max_steps
stars_thresholds
```

`max_steps` is a gameplay command/step limit. It is **not** a replacement for runtime resource limits.

Recommended additional fields for mature versions:

```text
execution_limits
level_version
published_at
is_published
schema_version
```

---

# 19. Level JSON Contract

Example:

```json
{
  "id": 5,
  "version": 1,
  "title": "Bug'doy o'rish",
  "grid_cells": [
    {"x": 0, "y": 0, "type": "grass"},
    {"x": 1, "y": 0, "type": "wheat"},
    {"x": 2, "y": 3, "type": "bomb"}
  ],
  "drone_start": {
    "x": 0,
    "y": 0,
    "facing": "east"
  },
  "available_functions": [
    "move",
    "harvest",
    "cut"
  ],
  "starter_code": "move(EAST)",
  "win_condition": {
    "type": "all_wheat_harvested"
  },
  "max_lives": 3,
  "max_steps": 200,
  "stars_thresholds": {
    "3": 20,
    "2": 40,
    "1": 200
  }
}
```

The actual schema must be validated server-side and client-side.

Do not trust arbitrary JSON from the client as a level definition.

---

# 20. Access Control

Course access:

```text
Course.price == 0
    → authenticated user may access

Course.price > 0
    → valid Enrollment required
```

Enrollment:

```text
Enrollment
├── user
├── course
├── transaction
└── unique(user, course)
```

The API must enforce access server-side.

Never rely on frontend route guards for authorization.

---

# 21. Progression

Levels inside a lesson unlock sequentially by default.

Conceptually:

```text
Level 1 ✓
   ↓
Level 2 🔓
   ↓
Level 3 🔒
```

Progress entity:

```text
UserLevelProgress
├── user
├── level
├── status
├── last_code
├── attempts
├── stars
└── best_steps
```

Use database constraints to prevent duplicate user-level progress rows.

---

# 22. Authoritative Attempt Architecture

The old pattern of accepting a body such as:

```json
{
  "code": "...",
  "result": "completed",
  "steps_used": 18,
  "lives_left": 2
}
```

must **not** be treated as authoritative.

The client may send:

```json
{
  "code": "...",
  "level_version": 3
}
```

The server/execution service then calculates:

```text
result
steps_used
lives_left
score
errors
final_state
```

and persists the authoritative outcome.

The browser may optimistically render its own local simulation for responsiveness, but server-side validation must remain authoritative wherever competitive/progress-sensitive integrity matters.

---

# 23. API Contract

Initial endpoints:

```text
POST /api/auth/login/
POST /api/auth/refresh/

GET  /api/courses/
GET  /api/courses/{slug}/
GET  /api/levels/{id}/

POST /api/levels/{id}/attempt/

POST /api/enrollments/

POST /api/payments/click/webhook/
POST /api/payments/payme/webhook/
```

The exact request/response serializers must be documented and tested.

Use versioning strategy before introducing breaking API changes.

---

# 24. API Security

All protected endpoints must enforce:

- authentication
- authorization
- object-level access checks
- input validation
- rate limiting where appropriate
- payload-size limits

Never expose sensitive level-authoring data or unpublished content to unauthorized users.

Never trust IDs merely because they came from the authenticated user's browser.

---

# 25. Django Admin

Admin sections:

```text
CONTENT
├── Courses
├── Modules
├── Lessons
└── Levels

GAME
├── Level Objectives
├── Entities
├── Commands
└── Tests

BILLING
├── Transactions
└── Enrollments

USERS
├── Users
├── Progress
├── Submissions
└── Achievements

SYSTEM
├── Game Sessions
├── Errors
├── Audit Logs
└── Feature Flags
```

Use `django-json-widget` or an equivalent JSON editor for early Level JSON administration.

A visual Map/Level Editor should be a later custom admin feature.

Admin must have sensible:

- list_display
- list_filter
- search_fields
- ordering
- readonly fields for immutable/audit data
- autocomplete where relationships are large

---

# 26. Admin Map Editor — Future

A visual editor should allow an administrator to place:

```text
Grass
Wheat
Rock
Tree
Wall
Water
Drone
Target
```

on an irregular map.

It should generate validated level schema rather than bypassing the domain model.

---

# 27. Scoring

Initial scoring dimensions may include:

```text
completion
steps
lives_remaining
execution efficiency
```

Do not let the frontend calculate the authoritative score.

Score calculation belongs to a deterministic server/game-engine service.

---

# 28. Submissions

Conceptual submission data:

```text
Submission
├── user
├── level
├── level_version
├── source_code
├── execution_time
├── instructions_executed
├── result
├── errors
├── lives_remaining
├── score
└── created_at
```

Apply retention policies. Do not retain unlimited source/execution history by default.

If code privacy is relevant, clearly define who can access stored source code.

---

# 29. Observability

Production must have:

```text
structured logs
metrics
error tracking
execution telemetry
audit logs
```

Important metrics:

```text
api_latency
execution_latency
execution_timeout_rate
sandbox_failure_rate
queue_depth
worker_utilization
database_latency
level_completion_rate
```

Never log secrets or unnecessary personal data.

---

# 30. Scalability Architecture

The API should be horizontally scalable:

```text
Load Balancer
      ↓
API 1
API 2
API 3
API N
```

Execution should scale independently:

```text
API
 ↓
Queue
 ↓
Worker Pool
 ↓
Sandboxed Execution
```

PostgreSQL remains the durable source of truth for persistent application state.

Redis is for appropriate ephemeral/caching/queue use cases, not the only durable store for progress.

---

# 31. Caching

Potential Redis cache targets:

- published level definitions
- course metadata
- leaderboard snapshots
- rate-limit counters
- temporary execution/session state

Use versioned cache keys where level content changes.

Never let stale cache data silently override authoritative database state.

---

# 32. Payments

Payment providers must be hidden behind a billing abstraction.

Conceptually:

```text
PaymentProvider
├── ClickAdapter
└── PaymeAdapter
```

Webhook processing must be:

- authenticated/verified according to provider requirements
- idempotent
- transaction-safe
- replay-safe
- auditable

Do not grant enrollment repeatedly if the same webhook is delivered multiple times.

---

# 33. Testing Strategy

Minimum test layers:

```text
Unit tests
Integration tests
API tests
Game Engine tests
Python runtime tests
Security tests
Frontend tests
End-to-end tests
```

Game Engine tests should cover:

```text
valid movement
boundary collision
obstacle collision
invalid interaction
life decrement
objective completion
objective failure
step limits
runtime limits
command ordering
determinism
restart
stale execution result rejection
```

Security tests should cover:

```text
forbidden imports
filesystem attempts
network attempts
subprocess attempts
infinite loops
CPU exhaustion
memory exhaustion
output flooding
oversized source
unauthorized level access
forged completion result
```

---

# 34. Definition of Done

A task is **not complete** merely because the code was written.

Before declaring a task complete, the agent must, where applicable:

```text
✓ inspect affected code
✓ implement the requested change
✓ update relevant types/schemas
✓ add/update tests
✓ run backend tests
✓ run frontend tests
✓ run lint
✓ run type checking
✓ run production builds
✓ run migrations/check migration consistency
✓ verify API contracts
✓ verify security boundaries
✓ check for regressions
```

If a check cannot be run, explicitly state why. Never pretend it passed.

---

# 35. Development Workflow for AI Coding Agents

For every task:

### Step 1 — Understand

Read this skill and relevant docs.

### Step 2 — Inspect

Inspect the repository before making assumptions.

### Step 3 — Plan

Identify:

- affected domain
- files to change
- contracts affected
- tests required
- migration implications
- security implications

### Step 4 — Implement

Make the smallest coherent change.

### Step 5 — Validate

Run relevant tests/checks.

### Step 6 — Review

Look for:

- duplicated logic
- race conditions
- authorization holes
- client trust problems
- stale state
- missing validation
- unintended API changes

### Step 7 — Report

Report:

```text
Changed:
...

Tests:
...

Validation:
...

Known limitations:
...
```

---

# 36. Build Order

Do not skip directly to visual polish.

## Phase 1 — Backend foundation

```text
Django
Custom User
Course
Module
Lesson
Level
Enrollment
Transaction
Progress
Admin
Migrations
```

## Phase 2 — API/auth

```text
DRF
JWT
serializers
permissions
course/level APIs
```

## Phase 3 — Frontend shell

```text
React
TypeScript
CodeMirror 6
Run/Stop/Restart
Console
```

## Phase 4 — Local execution

```text
Pyodide
Web Worker
Python API bindings
command queue
execution limits
```

## Phase 5 — Game Engine

```text
World
Tiles
Drone
Entities
Commands
State transitions
Objectives
Lives
Determinism
```

## Phase 6 — Rendering

```text
PixiJS
Grid
Drone
Entities
Animations
```

## Phase 7 — End-to-end level

One complete level must work:

```text
load level
→ write code
→ run
→ commands
→ game engine
→ animation
→ win/lose
→ restart
```

## Phase 8 — Authoritative execution

```text
Execution API
Queue
Sandbox workers
Verified result
Progress persistence
```

## Phase 9 — LMS/billing

```text
Enrollment
Click
Payme
Progression
```

## Phase 10 — Production hardening

```text
observability
rate limits
security tests
CI/CD
backups
scaling
error handling
```

---

# 37. MVP Scope

MVP must prove the core product loop, not every future feature.

### MVP includes

```text
React + TypeScript + Vite
CodeMirror 6
Pyodide Web Worker
PixiJS
Django + DRF
PostgreSQL

4×4 initial level
Drone
Grass
Wheat
move()
cut()/harvest()
for
while
3 lives
Run
Stop
Restart
Console
Win/Lose
```

### MVP does not require

```text
multiplayer
complex physics
real UAV hardware integration
full robotics middleware
AI model training
massive leaderboard infrastructure
Kubernetes from day one
```

---

# 38. Future Product Direction

The product can grow through:

```text
Python basics
   ↓
Loops / Conditions
   ↓
Drone control
   ↓
Sensors / state
   ↓
Pathfinding
   ↓
Algorithms
   ↓
Robotics simulation
   ↓
Computer vision concepts
   ↓
AI/autonomous-agent challenges
```

The differentiator is:

> **Programming → Algorithms → Robotics → Simulation**

---

# 39. Common Mistakes the AI Agent Must Avoid

Never:

- execute user code with Python `exec()` in Django
- trust client-reported level completion
- put game rules inside React components
- use frontend state as authoritative persistence
- make a fixed 4×4 map assumption
- hard-code every level in source code
- mix payment logic into course models
- create duplicate business logic in frontend/backend
- silently change field names
- introduce both CodeMirror and Monaco
- choose between React/Vanilla at implementation time
- use `max_steps` as the only sandbox protection
- allow stale worker responses to modify a newer session
- store secrets in browser-exposed configuration
- skip tests because the UI appears to work
- rewrite the repository without first inspecting it

---

# 40. Reference Architecture

```text
                         USER
                           │
                           ▼
                ┌───────────────────┐
                │ React + TypeScript│
                │                   │
                │ CodeMirror 6      │
                │ PixiJS            │
                │ Console           │
                │ Level UI          │
                └─────────┬─────────┘
                          │
               ┌──────────┴──────────┐
               │                     │
               ▼                     ▼
       Local Python Runtime      Django API
       Pyodide + Worker          DRF + JWT
               │                     │
               ▼                     ▼
        Local Command List       PostgreSQL
               │                     │
               └──────────┬──────────┘
                          │
                   Authoritative Path
                          │
                          ▼
                   Execution Queue
                          │
                          ▼
                  Sandboxed Worker
                          │
                          ▼
                  Deterministic
                   Game Engine
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
           State        Events       Result
             │            │            │
             ▼            ▼            ▼
          Renderer      Console      Progress
```

---

# 41. AI Agent Operating Contract

When acting as the coding agent for DroneCode, behave as the **Lead Software Engineer / Software Architect** for a real startup product.

Before coding:

1. Read this skill.
2. Inspect the repository.
3. Identify the relevant domain boundary.
4. Read relevant specifications.
5. Form a short implementation plan.

While coding:

1. Preserve existing contracts unless change is explicitly required.
2. Prefer simple, testable abstractions.
3. Keep domain logic independent from UI.
4. Keep untrusted Python isolated.
5. Validate all externally supplied data.
6. Make authoritative decisions server-side where integrity matters.
7. Avoid premature infrastructure complexity.
8. Add tests with behavior changes.

After coding:

1. Run the narrowest relevant tests first.
2. Run broader validation when practical.
3. Check for security regressions.
4. Check for type/lint/build errors.
5. Summarize exact changes and remaining limitations.

If requirements conflict with this skill, **do not silently choose**. Explain the conflict and ask for confirmation unless the user has clearly and intentionally requested the architecture change. If the user confirms a change, update the skill/specification and all dependent contracts together.

---

# 42. Required Documentation Set

As the project grows, maintain these documents:

```text
README.md

architecture/
├── SYSTEM_ARCHITECTURE.md
├── GAME_ENGINE_SPEC.md
├── PYTHON_API_SPEC.md
├── LEVEL_SCHEMA.md
├── GAME_STATE_SCHEMA.md
├── EVENT_SYSTEM_SPEC.md
├── EXECUTION_SANDBOX_SPEC.md
├── DATABASE_SCHEMA.md
├── API_SPEC.md
├── DJANGO_ADMIN_SPEC.md
├── FRONTEND_UI_SPEC.md
├── SECURITY_SPEC.md
├── TESTING_STRATEGY.md
└── DEPLOYMENT_ARCHITECTURE.md
```

`SKILL.md` defines agent behavior and stable project rules. Detailed documents define implementation contracts.

---

# 43. Final Principle

> **Build a small production system, not a disposable demo.**

The first level can be simple.

The first renderer can be simple.

The first Python API can be small.

But the boundaries must be correct:

```text
UI ≠ Game Engine

Python ≠ Authoritative State

Browser ≠ Trusted Client

max_steps ≠ Full Sandbox Security

Level JSON ≠ Unvalidated Input

Payment Webhook ≠ Automatically Trusted Request
```

The product succeeds when this loop is reliable:

```text
WRITE PYTHON
      ↓
RUN
      ↓
DRONE EXECUTES COMMANDS
      ↓
WORLD RESPONDS
      ↓
MISSION COMPLETES
      ↓
PROGRESS SAVED
```

Everything else should be built around making that loop secure, deterministic, understandable, testable, and scalable.
