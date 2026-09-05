/**
 * Game Engine - Authoritative game state and command processing
 * Handles level loading, command execution, state transitions, and win/lose conditions
 */

export class GameEngine {
  constructor(levelData) {
    this.levelData = levelData;
    this.resetState();
  }

  resetState() {
    // Initialize world state
    this.world = {
      cells: new Map(), // coordinate -> cell data
      entities: new Map(), // entity_id -> {type, x, y}
      drone: {
        x: this.levelData.drone_start.x,
        y: this.levelData.drone_start.y,
        facing: this.levelData.drone_start.facing,
        altitude: 0,
        airborne: false,
      },
    };

    // Load grid cells
    this.levelData.grid_cells.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      this.world.cells.set(key, { ...cell });
    });

    // Game state
    this.lives = this.levelData.max_lives;
    this.steps = 0;
    this.maxSteps = this.levelData.max_steps;
    this.commandQueue = [];
    this.log = [];
    this.gameStatus = 'running'; // running, won, lost
    this.errors = [];
  }

  // Direction constants
  static DIRECTIONS = {
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    east: { dx: 1, dy: 0 },
    west: { dx: -1, dy: 0 },
  };

  static DIRECTION_NAMES = ['north', 'south', 'east', 'west'];

  /**
   * Add a command to the queue
   */
  queueCommand(command) {
    if (this.steps >= this.maxSteps) {
      this.addError('Max steps exceeded');
      this.loseGame();
      return false;
    }
    this.commandQueue.push(command);
    return true;
  }

  /**
   * Execute next command in queue
   */
  executeNextCommand() {
    if (this.commandQueue.length === 0 || this.gameStatus !== 'running') {
      return false;
    }

    const command = this.commandQueue.shift();
    this.steps++;

    switch (command.type) {
      case 'move':
        this.executeMove(command.direction);
        break;
      case 'harvest':
        this.executeHarvest();
        break;
      case 'cut':
        this.executeCut();
        break;
      case 'shoot':
        this.executeShoot();
        break;
      case 'plant':
        this.executePlant(command.entity);
        break;
      case 'takeoff':
        this.executeTakeoff();
        break;
      case 'land':
        this.executeLand();
        break;
      case 'turn':
        this.executeTurn(command.direction);
        break;
      case 'hover':
        this.log.push('Drone is hovering in place');
        break;
      default:
        this.addError(`Unknown command: ${command.type}`);
        this.loseGame();
        return false;
    }

    // Check win condition after each command
    if (this.checkWinCondition()) {
      this.winGame();
    }

    return true;
  }

  /**
   * Move drone in specified direction
   */
  executeMove(direction) {
    const dir = GameEngine.DIRECTIONS[direction];
    if (!dir) {
      this.addError(`Invalid direction: ${direction}`);
      this.loseLive('Invalid direction');
      return;
    }

    const newX = this.world.drone.x + dir.dx;
    const newY = this.world.drone.y + dir.dy;

    // Check boundaries
    const cellKey = `${newX},${newY}`;
    if (!this.world.cells.has(cellKey)) {
      this.addError(`Out of bounds: (${newX}, ${newY})`);
      this.loseLive('Move out of bounds');
      return;
    }

    const cell = this.world.cells.get(cellKey);

    // Check walkability
    if (cell.type === 'water' || cell.type === 'wall' || cell.type === 'rock') {
      this.addError(`Cannot move to ${cell.type} at (${newX}, ${newY})`);
      this.loseLive('Collision with obstacle');
      return;
    }

    // Execute move
    this.world.drone.x = newX;
    this.world.drone.y = newY;
    this.world.drone.facing = direction;
    this.log.push(`Drone moved to (${newX}, ${newY}) facing ${direction}`);
  }

  /**
   * Harvest wheat at current position
   */
  executeHarvest() {
    const cellKey = `${this.world.drone.x},${this.world.drone.y}`;
    const cell = this.world.cells.get(cellKey);

    if (!cell || cell.type !== 'wheat') {
      this.addError('No wheat to harvest at current position');
      this.loseLive('Invalid harvest');
      return;
    }

    // Harvest the wheat
    cell.type = 'grass';
    this.log.push(`Harvested wheat at (${this.world.drone.x}, ${this.world.drone.y})`);
  }

  /**
   * Cut tree/bush at current position
   */
  executeCut() {
    const cellKey = `${this.world.drone.x},${this.world.drone.y}`;
    const cell = this.world.cells.get(cellKey);

    if (!cell || (cell.type !== 'tree' && cell.type !== 'bush')) {
      this.addError('Nothing to cut at current position');
      this.loseLive('Invalid cut');
      return;
    }

    cell.type = 'grass';
    this.log.push(`Cut ${cell.type} at (${this.world.drone.x}, ${this.world.drone.y})`);
  }

  /**
   * Shoot in facing direction
   */
  executeShoot() {
    const dir = GameEngine.DIRECTIONS[this.world.drone.facing];
    let targetX = this.world.drone.x + dir.dx;
    let targetY = this.world.drone.y + dir.dy;

    // Find bomb in facing direction
    let found = false;
    while (this.world.cells.has(`${targetX},${targetY}`)) {
      const cell = this.world.cells.get(`${targetX},${targetY}`);
      if (cell.type === 'bomb') {
        cell.type = 'grass';
        this.log.push(`Bomb destroyed at (${targetX}, ${targetY})`);
        found = true;
        break;
      }
      targetX += dir.dx;
      targetY += dir.dy;
    }

    if (!found) {
      this.addError('No bomb to shoot in facing direction');
      this.loseLive('Invalid shoot');
    }
  }

  /**
   * Plant entity at current position
   */
  executePlant(entityType) {
    const cellKey = `${this.world.drone.x},${this.world.drone.y}`;
    const cell = this.world.cells.get(cellKey);

    if (!cell || cell.type !== 'grass') {
      this.addError('Can only plant on grass');
      this.loseLive('Invalid plant');
      return;
    }

    cell.type = entityType;
    this.log.push(`Planted ${entityType} at (${this.world.drone.x}, ${this.world.drone.y})`);
  }

  executeTakeoff() {
    if (this.world.drone.airborne) {
      this.addError('Drone is already airborne');
      return;
    }
    this.world.drone.airborne = true;
    this.world.drone.altitude = 2;
    this.log.push('Drone took off');
  }

  executeLand() {
    if (!this.world.drone.airborne) {
      this.addError('Drone is already on the ground');
      return;
    }
    this.world.drone.airborne = false;
    this.world.drone.altitude = 0;
    this.log.push(`Drone landed at (${this.world.drone.x}, ${this.world.drone.y})`);
  }

  executeTurn(direction) {
    const order = GameEngine.DIRECTION_NAMES;
    const current = order.indexOf(this.world.drone.facing);
    const offset = direction === 'right' ? 1 : -1;
    this.world.drone.facing = order[(current + offset + order.length) % order.length];
    this.log.push(`Drone turned ${direction}, facing ${this.world.drone.facing}`);
  }

  /**
   * Check if win condition is met
   */
  checkWinCondition() {
    const condition = this.levelData.win_condition;

    switch (condition.type) {
      case 'all_wheat_harvested':
        return !Array.from(this.world.cells.values()).some(cell => cell.type === 'wheat');

      case 'all_bombs_destroyed':
        return !Array.from(this.world.cells.values()).some(cell => cell.type === 'bomb');

      case 'reach_position':
        return (
          this.world.drone.x === condition.x &&
          this.world.drone.y === condition.y
        );

      case 'survive_n_steps':
        return this.steps >= condition.steps;

      default:
        return false;
    }
  }

  /**
   * Calculate stars based on steps used
   */
  calculateStars() {
    const thresholds = this.levelData.stars_thresholds || {};
    let stars = 0;

    // Convert string keys to numbers and sort
    const sortedThresholds = Object.entries(thresholds)
      .map(([steps, starCount]) => [parseInt(steps), starCount])
      .sort((a, b) => a[0] - b[0]);

    for (const [stepThreshold, starCount] of sortedThresholds) {
      if (this.steps <= stepThreshold) {
        stars = Math.max(stars, starCount);
      }
    }

    return stars;
  }

  /**
   * Lose a life
   */
  loseLive(reason = '') {
    this.lives--;
    if (reason) {
      this.log.push(`❌ Life lost: ${reason}`);
    }

    if (this.lives <= 0) {
      this.loseGame();
    }
  }

  /**
   * Win the game
   */
  winGame() {
    this.gameStatus = 'won';
    this.log.push(`✅ MISSION COMPLETE! (${this.steps} steps, ${this.lives} lives remaining)`);
  }

  /**
   * Lose the game
   */
  loseGame() {
    this.gameStatus = 'lost';
    this.log.push(`❌ GAME OVER (${this.steps} steps used, ${this.lives} lives remaining)`);
  }

  /**
   * Add error to log
   */
  addError(message) {
    this.errors.push(message);
    this.log.push(`⚠️ ${message}`);
  }

  /**
   * Get current game state
   */
  getState() {
    return {
      drone: { ...this.world.drone },
      cells: Array.from(this.world.cells.values()),
      lives: this.lives,
      steps: this.steps,
      maxSteps: this.maxSteps,
      status: this.gameStatus,
      log: [...this.log],
      errors: [...this.errors],
      stars: this.gameStatus === 'won' ? this.calculateStars() : 0,
    };
  }
}

export default GameEngine;
