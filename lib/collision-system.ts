
import { GameObject, CollisionInfo, Vector2, Obstacle } from './types'

export class CollisionSystem {
  public checkCollision(obj1: GameObject, obj2: GameObject): CollisionInfo | null {
    if (obj2.type === 'block' || obj2.type === 'sweeper') {
      // AABB collision for rectangular obstacles
      return this.circleVsAABB(
        obj1.position.x, obj1.position.y, obj1.radius,
        obj2.position.x - (obj2 as Obstacle).width! / 2,
        obj2.position.y - (obj2 as Obstacle).height! / 2,
        (obj2 as Obstacle).width!,
        (obj2 as Obstacle).height!
      )
    } else {
      // Circle vs Circle collision
      return this.circleVsCircle(obj1, obj2)
    }
  }

  private circleVsCircle(obj1: GameObject, obj2: GameObject): CollisionInfo | null {
    const dx = obj2.position.x - obj1.position.x
    const dy = obj2.position.y - obj1.position.y
    const distanceSquared = dx * dx + dy * dy
    const radiusSum = obj1.radius + obj2.radius
    const radiusSumSquared = radiusSum * radiusSum

    if (distanceSquared <= radiusSumSquared) {
      const distance = Math.sqrt(distanceSquared)
      const penetration = radiusSum - distance
      
      // Avoid division by zero
      if (distance === 0) {
        return {
          penetration,
          normal: { x: 1, y: 0 },
          point: { x: obj1.position.x, y: obj1.position.y }
        }
      }

      const normalX = dx / distance
      const normalY = dy / distance

      return {
        penetration,
        normal: { x: normalX, y: normalY },
        point: {
          x: obj1.position.x + normalX * obj1.radius,
          y: obj1.position.y + normalY * obj1.radius
        }
      }
    }

    return null
  }

  private circleVsAABB(
    cx: number, cy: number, r: number,
    ax: number, ay: number, aw: number, ah: number
  ): CollisionInfo | null {
    // Find closest point on AABB to circle center
    const closestX = Math.max(ax, Math.min(cx, ax + aw))
    const closestY = Math.max(ay, Math.min(cy, ay + ah))

    // Calculate distance to closest point
    const dx = cx - closestX
    const dy = cy - closestY
    const distanceSquared = dx * dx + dy * dy

    if (distanceSquared <= r * r) {
      const distance = Math.sqrt(distanceSquared)
      const penetration = r - distance

      // Handle case where circle center is inside AABB
      if (distance === 0) {
        // Find shortest exit direction
        const leftDist = cx - ax
        const rightDist = (ax + aw) - cx
        const topDist = cy - ay
        const bottomDist = (ay + ah) - cy

        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist)
        
        if (minDist === leftDist) {
          return { penetration: r + leftDist, normal: { x: -1, y: 0 }, point: { x: ax, y: cy } }
        } else if (minDist === rightDist) {
          return { penetration: r + rightDist, normal: { x: 1, y: 0 }, point: { x: ax + aw, y: cy } }
        } else if (minDist === topDist) {
          return { penetration: r + topDist, normal: { x: 0, y: -1 }, point: { x: cx, y: ay } }
        } else {
          return { penetration: r + bottomDist, normal: { x: 0, y: 1 }, point: { x: cx, y: ay + ah } }
        }
      }

      const normalX = dx / distance
      const normalY = dy / distance

      return {
        penetration,
        normal: { x: normalX, y: normalY },
        point: { x: closestX, y: closestY }
      }
    }

    return null
  }

  // Continuous collision detection for fast-moving objects
  public checkContinuousCollision(
    obj1: GameObject, 
    obj2: GameObject, 
    dt: number
  ): CollisionInfo | null {
    // Simple swept collision - check collision along the path
    const steps = Math.ceil(Math.max(
      Math.abs(obj1.velocity.x * dt) / obj1.radius,
      Math.abs(obj1.velocity.y * dt) / obj1.radius,
      Math.abs(obj2.velocity.x * dt) / obj2.radius,
      Math.abs(obj2.velocity.y * dt) / obj2.radius
    ))

    if (steps <= 1) {
      return this.checkCollision(obj1, obj2)
    }

    // Sample collision along the path
    const stepSize = 1 / steps
    for (let i = 0; i <= steps; i++) {
      const t = i * stepSize
      
      // Create temporary objects at interpolated positions
      const tempObj1: GameObject = {
        ...obj1,
        position: {
          x: obj1.position.x + obj1.velocity.x * dt * t,
          y: obj1.position.y + obj1.velocity.y * dt * t
        }
      }

      const tempObj2: GameObject = {
        ...obj2,
        position: {
          x: obj2.position.x + obj2.velocity.x * dt * t,
          y: obj2.position.y + obj2.velocity.y * dt * t
        }
      }

      const collision = this.checkCollision(tempObj1, tempObj2)
      if (collision) {
        return collision
      }
    }

    return null
  }
}
