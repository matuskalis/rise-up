
import { Pattern, PatternParams, Obstacle } from './types'

export class PatternSystem {
  private patterns: Pattern[] = []
  private spawnTimer: number = 0
  private spawnCooldown: number = 1.2 // Starting spawn period
  private lastSpawnY: number = 0
  private patternHistory: string[] = []

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns() {
    this.patterns = [
      // Basic Block Rain
      {
        name: 'blockRain',
        weight: 3,
        minAltitude: 0,
        spawn: this.spawnBlockRain.bind(this)
      },

      // Chicane (alternating walls)
      {
        name: 'chicane',
        weight: 2,
        minAltitude: 50,
        spawn: this.spawnChicane.bind(this)
      },

      // Spike Gauntlet
      {
        name: 'spikeGauntlet',
        weight: 2,
        minAltitude: 100,
        spawn: this.spawnSpikeGauntlet.bind(this)
      },

      // Rotor Windmill
      {
        name: 'rotor',
        weight: 1.5,
        minAltitude: 150,
        spawn: this.spawnRotor.bind(this)
      },

      // Sweeper
      {
        name: 'sweeper',
        weight: 1.5,
        minAltitude: 100,
        spawn: this.spawnSweeper.bind(this)
      },

      // Shard Burst
      {
        name: 'shardBurst',
        weight: 1,
        minAltitude: 200,
        spawn: this.spawnShardBurst.bind(this)
      },

      // Grid Drop
      {
        name: 'gridDrop',
        weight: 2,
        minAltitude: 75,
        spawn: this.spawnGridDrop.bind(this)
      }
    ]
  }

  public reset() {
    this.spawnTimer = 0
    this.spawnCooldown = 1.2
    this.lastSpawnY = 0
    this.patternHistory = []
  }

  public update(dt: number, params: PatternParams): Obstacle[] {
    this.spawnTimer -= dt

    if (this.spawnTimer <= 0) {
      // Update spawn cooldown based on difficulty
      this.spawnCooldown = Math.max(0.55, 1.2 - params.difficulty * 0.65)
      this.spawnTimer = this.spawnCooldown

      // Spawn new pattern
      return this.spawnPattern(params)
    }

    return []
  }

  private spawnPattern(params: PatternParams): Obstacle[] {
    // Filter available patterns by altitude
    const currentAltitude = Math.abs(params.spawnY) / 10
    const availablePatterns = this.patterns.filter(p => 
      p.minAltitude <= currentAltitude
    )

    if (availablePatterns.length === 0) {
      return []
    }

    // Select pattern with weighted random selection
    const pattern = this.selectWeightedPattern(availablePatterns)
    
    // Avoid repeating the same pattern too often
    if (this.patternHistory.length >= 3 && 
        this.patternHistory.slice(-2).every(name => name === pattern.name)) {
      const alternatives = availablePatterns.filter(p => p.name !== pattern.name)
      if (alternatives.length > 0) {
        const altPattern = this.selectWeightedPattern(alternatives)
        return this.executePattern(altPattern, params)
      }
    }

    return this.executePattern(pattern, params)
  }

  private selectWeightedPattern(patterns: Pattern[]): Pattern {
    const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const pattern of patterns) {
      random -= pattern.weight
      if (random <= 0) {
        return pattern
      }
    }
    
    return patterns[patterns.length - 1]
  }

  private executePattern(pattern: Pattern, params: PatternParams): Obstacle[] {
    this.patternHistory.push(pattern.name)
    if (this.patternHistory.length > 5) {
      this.patternHistory.shift()
    }

    this.lastSpawnY = params.spawnY
    return pattern.spawn(params)
  }

  // Pattern implementations
  private spawnBlockRain(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const blockCount = Math.floor(2 + params.difficulty * 3)
    const minGap = params.shieldRadius * 2.4 + 20
    
    // Ensure at least one safe path for the balloon
    const safeZone = {
      x: params.centerX - minGap / 2,
      width: minGap
    }

    for (let i = 0; i < blockCount; i++) {
      let x: number
      let attempts = 0
      
      do {
        x = Math.random() * (800 - 100) + 50
        attempts++
      } while (
        attempts < 10 && 
        x > safeZone.x - 40 && 
        x < safeZone.x + safeZone.width + 40
      )

      obstacles.push({
        id: `block_${Date.now()}_${i}`,
        type: 'block',
        position: { x, y: params.spawnY - Math.random() * 100 },
        velocity: { x: 0, y: Math.random() * 30 + 20 },
        radius: 20,
        width: 40,
        height: 40,
        active: true
      })
    }

    return obstacles
  }

  private spawnChicane(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const side = Math.random() < 0.5 ? -1 : 1
    const gapSize = Math.max(params.shieldRadius * 2.2 + 12, 100)
    
    // Left wall
    if (side === 1) {
      obstacles.push({
        id: `chicane_left_${Date.now()}`,
        type: 'block',
        position: { x: 50, y: params.spawnY },
        velocity: { x: 0, y: 0 },
        radius: 25,
        width: 100,
        height: 50,
        active: true,
        anchored: true
      })
    }

    // Right wall  
    if (side === -1) {
      obstacles.push({
        id: `chicane_right_${Date.now()}`,
        type: 'block',
        position: { x: 750, y: params.spawnY },
        velocity: { x: 0, y: 0 },
        radius: 25,
        width: 100,
        height: 50,
        active: true,
        anchored: true
      })
    }

    return obstacles
  }

  private spawnSpikeGauntlet(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const spikeCount = Math.floor(3 + params.difficulty * 2)
    const minGap = params.shieldRadius * 2.4 + 15
    
    for (let i = 0; i < spikeCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const x = 100 + Math.random() * 600
      
      // Ensure spikes don't block the balloon path completely
      if (Math.abs(x - params.centerX) > minGap / 2) {
        obstacles.push({
          id: `spike_${Date.now()}_${i}`,
          type: 'spike',
          position: { x, y: params.spawnY - i * 60 },
          velocity: { x: 0, y: 0 },
          radius: 25,
          active: true,
          angle,
          anchored: Math.random() < 0.7 // 70% anchored, 30% movable for variety
        })
      }
    }

    return obstacles
  }

  private spawnRotor(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const rotorX = params.centerX + (Math.random() - 0.5) * 200
    const rotationSpeed = (Math.random() - 0.5) * 4 + 2
    
    obstacles.push({
      id: `rotor_${Date.now()}`,
      type: 'rotor',
      position: { x: rotorX, y: params.spawnY },
      velocity: { x: 0, y: 0 },
      radius: 80, // Rotor arm reach
      active: true,
      angle: 0,
      rotationSpeed,
      arms: 3,
      anchored: true
    })

    return obstacles
  }

  private spawnSweeper(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const direction = Math.random() < 0.5 ? -1 : 1
    const startX = direction === 1 ? -50 : 850
    const speed = 150 + params.difficulty * 50
    
    obstacles.push({
      id: `sweeper_${Date.now()}`,
      type: 'sweeper',
      position: { x: startX, y: params.spawnY },
      velocity: { x: direction * speed, y: 0 },
      radius: 15,
      width: 200,
      height: 30,
      active: true,
      sweepDirection: direction
    })

    return obstacles
  }

  private spawnShardBurst(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const shardCount = Math.floor(8 + params.difficulty * 4)
    const centerX = params.centerX + (Math.random() - 0.5) * 200
    
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2
      const speed = 100 + Math.random() * 50
      
      obstacles.push({
        id: `shard_${Date.now()}_${i}`,
        type: 'shard',
        position: { x: centerX, y: params.spawnY },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed + 50 // Slight downward bias
        },
        radius: 8,
        active: true,
        lifeTime: 3 + Math.random() * 2 // Shards expire after a few seconds
      })
    }

    return obstacles
  }

  private spawnGridDrop(params: PatternParams): Obstacle[] {
    const obstacles: Obstacle[] = []
    const columns = 4
    const columnWidth = 800 / columns
    const safeColumn = Math.floor(Math.random() * columns)
    
    for (let col = 0; col < columns; col++) {
      if (col === safeColumn) continue // Keep one column safe
      
      const x = col * columnWidth + columnWidth / 2
      const blockCount = Math.floor(2 + Math.random() * 3)
      
      for (let i = 0; i < blockCount; i++) {
        obstacles.push({
          id: `grid_${Date.now()}_${col}_${i}`,
          type: 'block',
          position: { 
            x: x + (Math.random() - 0.5) * 40,
            y: params.spawnY - i * 80 - Math.random() * 50
          },
          velocity: { x: 0, y: 30 + Math.random() * 20 },
          radius: 20,
          width: 40,
          height: 40,
          active: true,
          anchored: false // Grid blocks can be pushed around
        })
      }
    }

    return obstacles
  }
}
