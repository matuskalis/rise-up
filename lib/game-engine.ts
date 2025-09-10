
import { 
  GameState, 
  Vector2, 
  Balloon, 
  Shield, 
  Obstacle, 
  Pattern,
  PatternParams,
  CollisionInfo,
  GameSettings
} from './types'
import { CollisionSystem } from './collision-system'
import { PatternSystem } from './pattern-system'
import { Renderer } from './renderer'


export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private renderer: Renderer
  private collisionSystem: CollisionSystem
  private patternSystem: PatternSystem

  // Game state
  private gameState: GameState = 'menu'
  private score: number = 0
  private gameTime: number = 0
  private cameraY: number = 0

  // Game objects
  private balloon!: Balloon
  private shield!: Shield
  private obstacles: Obstacle[] = []

  // Physics timing
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly physicsStep: number = 1 / 120 // 120Hz physics
  private animationId: number = 0

  // Input system
  private mousePosition: Vector2 = { x: 0, y: 0 }
  private worldMousePosition: Vector2 = { x: 0, y: 0 }
  private keys: Set<string> = new Set()
  private readonly keyboardSpeed: number = 300

  // Game settings
  private settings: GameSettings = {
    sensitivity: 1.0,
    shieldSize: 'normal',
    debugMode: false
  }

  // Callbacks
  public onScoreChange?: (score: number) => void
  public onGameStateChange?: (state: GameState) => void

  // Constants from spec
  private readonly BALLOON_BASE_VELOCITY = 80  // px/s
  private readonly BALLOON_ACCELERATION = 4    // px/s²
  private readonly BALLOON_MAX_VELOCITY = 160  // px/s
  private readonly SHIELD_LERP_FACTOR = 0.28
  private readonly CAMERA_DEAD_ZONE = 100

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx

    this.renderer = new Renderer(ctx)
    this.collisionSystem = new CollisionSystem()
    this.patternSystem = new PatternSystem()

    this.setupInput()
    this.initializeGameObjects()
  }

  private setupInput() {
    // Mouse input
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      
      this.mousePosition.x = (e.clientX - rect.left) * scaleX
      this.mousePosition.y = (e.clientY - rect.top) * scaleY
      
      // Convert to world coordinates
      this.worldMousePosition.x = this.mousePosition.x
      this.worldMousePosition.y = this.mousePosition.y + this.cameraY
    })

    // Keyboard input
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code)
    })
  }

  private initializeGameObjects() {
    // Create balloon
    this.balloon = {
      id: 'balloon',
      position: { x: this.canvas.width / 2, y: this.canvas.height - 100 },
      velocity: { x: 0, y: -this.BALLOON_BASE_VELOCITY },
      radius: 22, // Slightly smaller than sprite for fair play
      type: 'balloon',
      active: true,
      baseVelocity: this.BALLOON_BASE_VELOCITY,
      acceleration: this.BALLOON_ACCELERATION,
      driftOffset: 0
    }

    // Create shield
    const shieldRadius = this.getShieldRadius()
    this.shield = {
      id: 'shield',
      position: { x: this.canvas.width / 2, y: this.canvas.height - 150 },
      velocity: { x: 0, y: 0 },
      radius: shieldRadius,
      type: 'shield',
      active: true,
      targetPosition: { x: this.canvas.width / 2, y: this.canvas.height - 150 },
      lerpFactor: this.SHIELD_LERP_FACTOR,
      mass: 100,
      lastHitTime: 0
    }
  }

  private getShieldRadius(): number {
    switch (this.settings.shieldSize) {
      case 'small': return 36
      case 'large': return 48
      default: return 42
    }
  }

  public start() {
    this.lastTime = performance.now()
    this.gameLoop()
  }

  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  public startGame() {
    this.resetGame()
    this.gameState = 'playing'
    this.onGameStateChange?.('playing')
  }

  public pauseGame() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused'
      this.onGameStateChange?.('paused')
    }
  }

  public resumeGame() {
    if (this.gameState === 'paused') {
      this.gameState = 'playing'
      this.onGameStateChange?.('playing')
    }
  }

  public restartGame() {
    this.startGame()
  }

  public toggleDebug() {
    this.settings.debugMode = !this.settings.debugMode
  }

  public setSensitivity(sensitivity: number) {
    this.settings.sensitivity = Math.max(0.5, Math.min(1.5, sensitivity))
  }

  public setShieldSize(size: 'small' | 'normal' | 'large') {
    this.settings.shieldSize = size
    this.shield.radius = this.getShieldRadius()
  }

  public getScore(): number {
    return this.score
  }

  private resetGame() {
    this.gameTime = 0
    this.score = 0
    this.cameraY = 0
    this.obstacles = []
    
    // Reset balloon
    this.balloon.position = { x: this.canvas.width / 2, y: this.canvas.height - 100 }
    this.balloon.velocity = { x: 0, y: -this.BALLOON_BASE_VELOCITY }
    this.balloon.active = true
    this.balloon.driftOffset = 0

    // Reset shield
    this.shield.position = { x: this.canvas.width / 2, y: this.canvas.height - 150 }
    this.shield.velocity = { x: 0, y: 0 }
    this.shield.targetPosition = { ...this.shield.position }
    this.shield.active = true
    this.shield.lastHitTime = 0

    this.patternSystem.reset()
    this.onScoreChange?.(0)
  }

  private gameLoop = () => {
    const currentTime = performance.now()
    const frameTime = Math.min((currentTime - this.lastTime) / 1000, 0.25) // Cap at 250ms
    this.lastTime = currentTime
    
    this.accumulator += frameTime

    // Fixed timestep physics updates
    while (this.accumulator >= this.physicsStep) {
      if (this.gameState === 'playing') {
        this.updatePhysics(this.physicsStep)
      }
      this.accumulator -= this.physicsStep
    }

    // Render with interpolation
    const interpolation = this.accumulator / this.physicsStep
    this.render(interpolation)

    this.animationId = requestAnimationFrame(this.gameLoop)
  }

  private updatePhysics(dt: number) {
    this.gameTime += dt

    // Update input
    this.updateInput(dt)

    // Update balloon
    this.updateBalloon(dt)

    // Update shield
    this.updateShield(dt)

    // Update obstacles
    this.updateObstacles(dt)

    // Spawn new obstacles
    this.updateSpawning(dt)

    // Update camera
    this.updateCamera()

    // Check collisions
    this.checkCollisions()

    // Update score
    const altitudeScore = Math.max(0, (this.canvas.height - this.balloon.position.y) / 10)
    this.score = altitudeScore
    this.onScoreChange?.(this.score)

    // Clean up inactive obstacles
    this.obstacles = this.obstacles.filter(obstacle => obstacle.active)
  }

  private updateInput(dt: number) {
    // Update shield target position based on input
    if (this.gameState !== 'playing') return

    // Mouse input (primary)
    this.shield.targetPosition.x = this.worldMousePosition.x * this.settings.sensitivity
    this.shield.targetPosition.y = this.worldMousePosition.y * this.settings.sensitivity

    // WASD fallback
    let keyboardDelta = { x: 0, y: 0 }
    if (this.keys.has('KeyW')) keyboardDelta.y -= this.keyboardSpeed * dt
    if (this.keys.has('KeyS')) keyboardDelta.y += this.keyboardSpeed * dt
    if (this.keys.has('KeyA')) keyboardDelta.x -= this.keyboardSpeed * dt
    if (this.keys.has('KeyD')) keyboardDelta.x += this.keyboardSpeed * dt

    // Apply keyboard delta if any keys are pressed
    if (keyboardDelta.x !== 0 || keyboardDelta.y !== 0) {
      this.shield.targetPosition.x = this.shield.position.x + keyboardDelta.x
      this.shield.targetPosition.y = this.shield.position.y + keyboardDelta.y
    }

    // Clamp shield target to screen bounds
    this.shield.targetPosition.x = Math.max(this.shield.radius, 
      Math.min(this.canvas.width - this.shield.radius, this.shield.targetPosition.x))
    this.shield.targetPosition.y = Math.max(this.shield.radius + this.cameraY, 
      Math.min(this.canvas.height + this.cameraY - this.shield.radius, this.shield.targetPosition.y))
  }

  private updateBalloon(dt: number) {
    // Apply vertical velocity with acceleration
    const currentSpeed = Math.abs(this.balloon.velocity.y)
    const maxSpeed = Math.min(this.BALLOON_MAX_VELOCITY, 
      this.BALLOON_BASE_VELOCITY + this.balloon.acceleration * this.gameTime)
    
    if (currentSpeed < maxSpeed) {
      this.balloon.velocity.y -= this.balloon.acceleration * dt
    }

    // Add subtle horizontal drift using Perlin-like noise
    this.balloon.driftOffset += dt * 0.5
    const drift = Math.sin(this.balloon.driftOffset) * 10 + 
                 Math.sin(this.balloon.driftOffset * 2.3) * 5
    this.balloon.velocity.x = drift

    // Update position
    this.balloon.position.x += this.balloon.velocity.x * dt
    this.balloon.position.y += this.balloon.velocity.y * dt

    // Keep balloon horizontally centered with drift
    const centerX = this.canvas.width / 2
    this.balloon.position.x = centerX + drift
  }

  private updateShield(dt: number) {
    // Lerp shield position towards target with easing
    const dx = this.shield.targetPosition.x - this.shield.position.x
    const dy = this.shield.targetPosition.y - this.shield.position.y
    
    this.shield.position.x += dx * this.shield.lerpFactor
    this.shield.position.y += dy * this.shield.lerpFactor

    // Calculate velocity for collision response
    this.shield.velocity.x = dx * this.shield.lerpFactor / dt
    this.shield.velocity.y = dy * this.shield.lerpFactor / dt
  }

  private updateObstacles(dt: number) {
    for (const obstacle of this.obstacles) {
      // Apply subtle gravitational pull toward shield
      if (!obstacle.anchored && this.gameState === 'playing') {
        const dx = this.shield.position.x - obstacle.position.x
        const dy = this.shield.position.y - obstacle.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Only apply gravity if within a reasonable range and not too close
        if (distance > this.shield.radius + obstacle.radius + 10 && distance < 200) {
          const mass = this.getObstacleMass(obstacle.type)
          const gravitationalStrength = 15 // Very subtle pull
          const force = gravitationalStrength / (distance * distance) // Inverse square law
          
          // Normalize direction and apply force
          const forceX = (dx / distance) * force / mass
          const forceY = (dy / distance) * force / mass
          
          obstacle.velocity.x += forceX * dt
          obstacle.velocity.y += forceY * dt
        }
      }

      // Apply velocity damping for more realistic physics
      const dampingFactor = 0.985 // Slight air resistance
      obstacle.velocity.x *= dampingFactor
      obstacle.velocity.y *= dampingFactor

      // Update position
      obstacle.position.x += obstacle.velocity.x * dt
      obstacle.position.y += obstacle.velocity.y * dt

      // Update rotation for rotors
      if (obstacle.type === 'rotor' && obstacle.rotationSpeed) {
        obstacle.angle = (obstacle.angle || 0) + obstacle.rotationSpeed * dt
      }

      // Update lifetime
      if (obstacle.lifeTime !== undefined) {
        obstacle.lifeTime -= dt
        if (obstacle.lifeTime <= 0) {
          obstacle.active = false
        }
      }

      // Deactivate obstacles that are far below the camera
      if (obstacle.position.y > this.cameraY + this.canvas.height + 200) {
        obstacle.active = false
      }
    }
  }

  private updateSpawning(dt: number) {
    const difficulty = Math.min(1, this.gameTime / 180) // Ramp over 3 minutes
    const spawnParams: PatternParams = {
      centerX: this.canvas.width / 2,
      spawnY: this.cameraY - 100, // Spawn above visible area
      balloonVelocity: Math.abs(this.balloon.velocity.y),
      shieldRadius: this.shield.radius,
      difficulty
    }

    const newObstacles = this.patternSystem.update(dt, spawnParams)
    this.obstacles.push(...newObstacles)
  }

  private updateCamera() {
    // Follow balloon with dead zone
    const targetCameraY = this.balloon.position.y - this.canvas.height + 300
    
    if (targetCameraY < this.cameraY - this.CAMERA_DEAD_ZONE) {
      this.cameraY = targetCameraY + this.CAMERA_DEAD_ZONE
    }
  }

  private checkCollisions() {
    // Check balloon vs obstacles
    for (const obstacle of this.obstacles) {
      if (!obstacle.active) continue

      const collision = this.collisionSystem.checkCollision(this.balloon, obstacle)
      if (collision) {
        // Game over - balloon hit
        this.gameOver()
        return
      }
    }

    // Check shield vs obstacles
    for (const obstacle of this.obstacles) {
      if (!obstacle.active) continue

      const collision = this.collisionSystem.checkCollision(this.shield, obstacle)
      if (collision) {
        // Deflect obstacle
        this.handleShieldCollision(obstacle, collision)
        this.shield.lastHitTime = this.gameTime
      }
    }
  }

  private handleShieldCollision(obstacle: Obstacle, collision: CollisionInfo) {
    const mass = this.getObstacleMass(obstacle.type)
    const baseImpulseStrength = obstacle.anchored ? 50 : 250 // Reduced impulse for anchored objects
    
    // For rectangular objects (blocks, sweepers), use collision normal to prevent sticking
    // For circular objects, use repulsion from shield center for more natural bouncing
    let repulsionDir: Vector2
    
    if (obstacle.type === 'block' || obstacle.type === 'sweeper') {
      // Use collision normal for rectangular objects to prevent sticking
      repulsionDir = {
        x: collision.normal.x,
        y: collision.normal.y
      }
      
      // Add small separation to prevent continued overlap
      const separationDistance = 2
      obstacle.position.x += collision.normal.x * separationDistance
      obstacle.position.y += collision.normal.y * separationDistance
    } else {
      // Use repulsion from shield center for circular objects
      const dx = obstacle.position.x - this.shield.position.x
      const dy = obstacle.position.y - this.shield.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Avoid division by zero
      if (distance === 0) {
        if (!obstacle.anchored) {
          obstacle.velocity.x += (Math.random() - 0.5) * 100 / mass
          obstacle.velocity.y += (Math.random() - 0.5) * 100 / mass
        }
        return
      }
      
      repulsionDir = {
        x: dx / distance,
        y: dy / distance
      }
    }
    
    // Calculate shield movement contribution
    const shieldSpeed = Math.sqrt(this.shield.velocity.x * this.shield.velocity.x + 
                                  this.shield.velocity.y * this.shield.velocity.y)
    
    // Combine repulsion with shield velocity for more realistic bouncing
    const shieldContribution = Math.min(shieldSpeed * 0.3, 150) // Cap shield influence
    const totalImpulse = baseImpulseStrength + (obstacle.anchored ? 0 : shieldContribution)
    
    // Apply impulse in repulsion direction
    const impulse = {
      x: repulsionDir.x * totalImpulse / mass,
      y: repulsionDir.y * totalImpulse / mass
    }

    // For anchored objects, apply limited movement or special behavior
    if (obstacle.anchored) {
      // Anchored objects can still have slight movement for feedback
      if (obstacle.type === 'rotor') {
        // Make rotors spin faster when hit
        obstacle.rotationSpeed = (obstacle.rotationSpeed || 0) + 0.5 * Math.sign(obstacle.rotationSpeed || 1)
      } else if (obstacle.type === 'spike' || obstacle.type === 'block') {
        // Slight position wobble for feedback
        obstacle.position.x += impulse.x * 0.1
        obstacle.position.y += impulse.y * 0.1
        
        // Return to original position (add restoration force)
        if (!obstacle.originalPosition) {
          obstacle.originalPosition = { ...obstacle.position }
        }
        const restoreForce = 0.15
        obstacle.velocity.x = (obstacle.originalPosition.x - obstacle.position.x) * restoreForce
        obstacle.velocity.y = (obstacle.originalPosition.y - obstacle.position.y) * restoreForce
      }
    } else {
      // Non-anchored objects get full physics
      obstacle.velocity.x += impulse.x
      obstacle.velocity.y += impulse.y

      // Add slight randomness to prevent predictable behavior (less for rectangular objects)
      const randomness = (obstacle.type === 'block' || obstacle.type === 'sweeper') ? 10 : 20
      obstacle.velocity.x += (Math.random() - 0.5) * randomness / mass
      obstacle.velocity.y += (Math.random() - 0.5) * randomness / mass
    }

    // Some obstacles are destroyed on impact
    if (obstacle.type === 'shard') {
      obstacle.active = false
    }
  }

  private getObstacleMass(type: string): number {
    switch (type) {
      case 'block': return 0.6
      case 'rotor': return 3.0
      case 'shard': return 0.2
      case 'spike': return 1.0
      case 'sweeper': return 2.0
      default: return 1.0
    }
  }

  private gameOver() {
    this.gameState = 'gameOver'
    this.onGameStateChange?.('gameOver')
  }

  private render(interpolation: number) {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Set camera transform
    this.ctx.save()
    this.ctx.translate(0, -this.cameraY)

    // Render game objects
    this.renderer.renderBalloon(this.balloon)
    this.renderer.renderShield(this.shield)
    
    for (const obstacle of this.obstacles) {
      if (obstacle.active) {
        this.renderer.renderObstacle(obstacle)
      }
    }

    // Debug rendering
    if (this.settings.debugMode) {
      this.renderDebug()
    }

    this.ctx.restore()
  }

  private renderDebug() {
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    this.ctx.lineWidth = 2

    // Balloon collider
    this.ctx.beginPath()
    this.ctx.arc(this.balloon.position.x, this.balloon.position.y, this.balloon.radius, 0, Math.PI * 2)
    this.ctx.stroke()

    // Shield collider
    this.ctx.beginPath()
    this.ctx.arc(this.shield.position.x, this.shield.position.y, this.shield.radius, 0, Math.PI * 2)
    this.ctx.stroke()

    // Obstacle colliders
    for (const obstacle of this.obstacles) {
      if (!obstacle.active) continue
      
      this.ctx.beginPath()
      if (obstacle.width && obstacle.height) {
        this.ctx.rect(obstacle.position.x - obstacle.width/2, 
                     obstacle.position.y - obstacle.height/2,
                     obstacle.width, obstacle.height)
      } else {
        this.ctx.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, Math.PI * 2)
      }
      this.ctx.stroke()
    }
  }
}
