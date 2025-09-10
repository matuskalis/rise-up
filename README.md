# 🎮 Balloon Shield: Precision Protection Game

**A high-performance, physics-based precision game built with Next.js and Canvas 2D**

*Developed as a showcase of advanced web game development techniques, real-time physics simulation, and performance optimization.*

---

## 🎯 **Project Overview**

Balloon Shield is a minimalist, precision-focused arcade game that challenges players to protect a fragile ascending balloon using only a mouse-controlled shield. What appears simple on the surface demonstrates sophisticated engineering: real-time physics simulation, collision detection algorithms, and performance-optimized rendering—all running at 60 FPS in the browser.

### **Core Challenge**
- **One Input**: Mouse-controlled shield with subtle gravitational mechanics
- **Instant Consequence**: Single collision with the balloon ends the game
- **Pure Focus Loop**: Tension → Precision → Failure → Immediate Retry

---

## 🚀 **Technical Achievements**

### **Advanced Physics Engine**
- **Custom Physics Implementation**: Built from scratch without external libraries for maximum performance and control
- **Dual Collision Systems**: 
  - Circle-to-circle collision for organic objects (shards, rotors)
  - Circle-to-AABB collision for rectangular obstacles (blocks, sweepers)
- **Gravitational Field Simulation**: Objects experience subtle attraction to the shield using inverse-square law physics
- **Realistic Collision Response**: Mass-based impulse calculations with velocity inheritance
- **Continuous Collision Detection**: Prevents fast-moving objects from tunneling through barriers

### **Performance Optimization**
- **Fixed Timestep Game Loop**: Decoupled physics (120 Hz) from rendering (60 Hz) for consistent gameplay
- **Spatial Optimization**: Efficient broad-phase collision detection for handling dozens of simultaneous objects
- **Memory Management**: Object pooling and cleanup systems prevent memory leaks during extended play

### **Sophisticated Input System**
- **Lerp-based Movement**: Shield follows mouse with configurable easing (0.2-0.35) for natural feel
- **Dual Control Schemes**: Primary mouse control with WASD keyboard fallback
- **Accessibility Features**: Adjustable sensitivity (0.5x-1.5x) and shield size options

---

## 🎨 **Design Philosophy**

### **Minimalist Aesthetics**
- **Monochromatic Color Palette**: High contrast design for maximum clarity
- **Clean Visual Hierarchy**: No distracting elements—pure focus on gameplay
- **Responsive UI**: Seamless scaling across device resolutions

### **Behavioral Game Design**
- **Immediate Feedback Loop**: No friction between failure and retry
- **Progressive Difficulty**: Algorithmic difficulty scaling based on altitude reached
- **Pattern-Based Challenges**: Deterministic obstacle patterns with guaranteed solvable paths

---

## 🔬 **Technical Deep Dive**

### **Architecture Overview**
┌─ React Component Layer ─────────────────────────┐
│ • Game state management │
│ • UI rendering and event handling │
│ • Settings persistence (localStorage) │
└──────────────────────┬──────────────────────────┘
┌─ Game Engine Core ────▼─────────────────────────┐
│ • Fixed timestep game loop │
│ • Entity-Component architecture │
│ • State machine (Menu → Playing → GameOver) │
└──────────────────────┬──────────────────────────┘
┌─ Systems Layer ───────▼─────────────────────────┐
│ • Physics System • Collision System │
│ • Pattern System • Renderer │
│ • Input System • Camera System │
└─────────────────────────────────────────────────┘


### **Collision Detection Algorithm**
```typescript
// Optimized circle-vs-AABB collision with penetration depth
private circleVsAABB(cx: number, cy: number, r: number, 
                     ax: number, ay: number, aw: number, ah: number) {
  const closestX = Math.max(ax, Math.min(cx, ax + aw))
  const closestY = Math.max(ay, Math.min(cy, ay + ah))
  
  const dx = cx - closestX
  const dy = cy - closestY
  const distanceSquared = dx * dx + dy * dy
  
  return distanceSquared <= r * r ? {
    penetration: r - Math.sqrt(distanceSquared),
    normal: { x: dx / distance, y: dy / distance }
  } : null
}
