
import { Balloon, Shield, Obstacle } from './types'

export class Renderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  public renderBalloon(balloon: Balloon) {
    const { position, radius } = balloon

    // Balloon string
    this.ctx.strokeStyle = '#404040'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(position.x, position.y + radius)
    this.ctx.lineTo(position.x, position.y + radius + 60)
    this.ctx.stroke()

    // Balloon body - gradient for depth
    const gradient = this.ctx.createRadialGradient(
      position.x - 8, position.y - 8, 0,
      position.x, position.y, radius + 6
    )
    gradient.addColorStop(0, '#60a5fa')
    gradient.addColorStop(0.7, '#3b82f6')
    gradient.addColorStop(1, '#1e40af')

    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, radius + 6, 0, Math.PI * 2)
    this.ctx.fill()

    // Balloon highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(position.x - 6, position.y - 6, radius * 0.4, 0, Math.PI * 2)
    this.ctx.fill()

    // Balloon outline
    this.ctx.strokeStyle = '#1e293b'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, radius + 6, 0, Math.PI * 2)
    this.ctx.stroke()
  }

  public renderShield(shield: Shield) {
    const { position, radius } = shield
    const currentTime = Date.now()
    
    // Shield glow effect when recently hit
    const timeSinceHit = currentTime - (shield.lastHitTime * 1000)
    if (timeSinceHit < 200) {
      const glowAlpha = Math.max(0, 1 - timeSinceHit / 200)
      this.ctx.shadowColor = '#fbbf24'
      this.ctx.shadowBlur = 20 * glowAlpha
    }

    // Shield body - metallic gradient
    const gradient = this.ctx.createRadialGradient(
      position.x - 10, position.y - 10, 0,
      position.x, position.y, radius
    )
    gradient.addColorStop(0, '#e5e7eb')
    gradient.addColorStop(0.6, '#9ca3af')
    gradient.addColorStop(1, '#4b5563')

    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
    this.ctx.fill()

    // Shield rim
    this.ctx.strokeStyle = '#1f2937'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
    this.ctx.stroke()

    // Shield inner ring detail
    this.ctx.strokeStyle = '#6b7280'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.arc(position.x, position.y, radius * 0.7, 0, Math.PI * 2)
    this.ctx.stroke()

    // Reset shadow
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
  }

  public renderObstacle(obstacle: Obstacle) {
    const { position, radius, type } = obstacle

    switch (type) {
      case 'block':
        this.renderBlock(obstacle)
        break
      case 'spike':
        this.renderSpike(obstacle)
        break
      case 'rotor':
        this.renderRotor(obstacle)
        break
      case 'sweeper':
        this.renderSweeper(obstacle)
        break
      case 'shard':
        this.renderShard(obstacle)
        break
      default:
        // Default circular obstacle
        this.ctx.fillStyle = '#ef4444'
        this.ctx.beginPath()
        this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
        this.ctx.fill()
    }
  }

  private renderBlock(obstacle: Obstacle) {
    const { position, width = 40, height = 40 } = obstacle
    
    // Block shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fillRect(
      position.x - width/2 + 2,
      position.y - height/2 + 2,
      width, height
    )

    // Block body
    this.ctx.fillStyle = '#7c2d12'
    this.ctx.fillRect(
      position.x - width/2,
      position.y - height/2,
      width, height
    )

    // Block highlight
    this.ctx.fillStyle = '#ea580c'
    this.ctx.fillRect(
      position.x - width/2,
      position.y - height/2,
      width, height/3
    )

    // Block outline
    this.ctx.strokeStyle = '#451a03'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      position.x - width/2,
      position.y - height/2,
      width, height
    )
  }

  private renderSpike(obstacle: Obstacle) {
    const { position, radius, angle = 0 } = obstacle
    
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(angle)

    // Spike body
    this.ctx.fillStyle = '#7f1d1d'
    this.ctx.beginPath()
    this.ctx.moveTo(0, -radius)
    this.ctx.lineTo(-radius * 0.5, radius * 0.5)
    this.ctx.lineTo(radius * 0.5, radius * 0.5)
    this.ctx.closePath()
    this.ctx.fill()

    // Spike outline
    this.ctx.strokeStyle = '#450a0a'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    this.ctx.restore()
  }

  private renderRotor(obstacle: Obstacle) {
    const { position, radius, angle = 0, arms = 3 } = obstacle
    
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(angle)

    // Rotor arms
    this.ctx.strokeStyle = '#7f1d1d'
    this.ctx.lineWidth = 8
    this.ctx.lineCap = 'round'

    for (let i = 0; i < arms; i++) {
      const armAngle = (i / arms) * Math.PI * 2
      this.ctx.save()
      this.ctx.rotate(armAngle)
      
      this.ctx.beginPath()
      this.ctx.moveTo(10, 0)
      this.ctx.lineTo(radius, 0)
      this.ctx.stroke()
      
      this.ctx.restore()
    }

    // Rotor center
    this.ctx.fillStyle = '#450a0a'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 12, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.restore()
  }

  private renderSweeper(obstacle: Obstacle) {
    const { position, width = 200, height = 30 } = obstacle
    
    // Sweeper body
    this.ctx.fillStyle = '#374151'
    this.ctx.fillRect(
      position.x - width/2,
      position.y - height/2,
      width, height
    )

    // Sweeper stripes
    this.ctx.fillStyle = '#fbbf24'
    for (let i = 0; i < width; i += 20) {
      if (Math.floor(i / 20) % 2 === 0) {
        this.ctx.fillRect(
          position.x - width/2 + i,
          position.y - height/2,
          Math.min(10, width - i), height
        )
      }
    }

    // Sweeper outline
    this.ctx.strokeStyle = '#111827'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      position.x - width/2,
      position.y - height/2,
      width, height
    )
  }

  private renderShard(obstacle: Obstacle) {
    const { position, radius } = obstacle
    const currentTime = Date.now()
    
    // Spinning shard with trail effect
    const spin = (currentTime * 0.01) % (Math.PI * 2)
    
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(spin)

    // Shard body
    this.ctx.fillStyle = '#dc2626'
    this.ctx.beginPath()
    this.ctx.moveTo(0, -radius)
    this.ctx.lineTo(radius * 0.3, 0)
    this.ctx.lineTo(0, radius)
    this.ctx.lineTo(-radius * 0.3, 0)
    this.ctx.closePath()
    this.ctx.fill()

    // Shard outline
    this.ctx.strokeStyle = '#7f1d1d'
    this.ctx.lineWidth = 1
    this.ctx.stroke()

    this.ctx.restore()

    // Motion trail
    const velocity = obstacle.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
    if (speed > 50) {
      const trailLength = Math.min(speed * 0.3, 30)
      const trailDirection = {
        x: -velocity.x / speed,
        y: -velocity.y / speed
      }

      this.ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(position.x, position.y)
      this.ctx.lineTo(
        position.x + trailDirection.x * trailLength,
        position.y + trailDirection.y * trailLength
      )
      this.ctx.stroke()
    }
  }
}
