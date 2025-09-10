
export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver'

export interface Vector2 {
  x: number
  y: number
}

export interface GameObject {
  id: string
  position: Vector2
  velocity: Vector2
  radius: number
  type: string
  active: boolean
}

export interface Balloon extends GameObject {
  type: 'balloon'
  baseVelocity: number
  acceleration: number
  driftOffset: number
}

export interface Shield extends GameObject {
  type: 'shield'
  targetPosition: Vector2
  lerpFactor: number
  mass: number
  lastHitTime: number
}

export interface Obstacle extends GameObject {
  type: 'block' | 'spike' | 'rotor' | 'sweeper' | 'shard'
  width?: number
  height?: number
  angle?: number
  rotationSpeed?: number
  direction?: Vector2
  anchored?: boolean
  arms?: number
  sweepDirection?: number
  lifeTime?: number
  originalPosition?: Vector2
}

export interface Pattern {
  name: string
  weight: number
  minAltitude: number
  spawn: (params: PatternParams) => Obstacle[]
}

export interface PatternParams {
  centerX: number
  spawnY: number
  balloonVelocity: number
  shieldRadius: number
  difficulty: number
}

export interface CollisionInfo {
  penetration: number
  normal: Vector2
  point: Vector2
}

export interface GameSettings {
  sensitivity: number
  shieldSize: 'small' | 'normal' | 'large'
  debugMode: boolean
}
