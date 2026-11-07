"use client"

import { useEffect, useRef } from "react"

interface Star {
  x: number
  y: number
  z: number
  pz: number
}

interface HyperspaceBackgroundProps {
  isHyperspace: boolean
}

export function HyperspaceBackground({ isHyperspace }: HyperspaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    const numStars = 500
    const stars: Star[] = []

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        pz: Math.random() * width,
      })
    }

    let currentSpeed = isHyperspace ? 35 : 0.4
    const targetSpeed = isHyperspace ? 45 : 0.5

    const render = () => {
      // Smoothly ramp speed up when jumping or down when dropping out
      const desiredSpeed = isHyperspace ? targetSpeed : 0.5
      currentSpeed += (desiredSpeed - currentSpeed) * 0.05

      // Slight motion blur / persistence trail in hyperspace
      ctx.fillStyle = isHyperspace ? "rgba(3, 7, 18, 0.35)" : "rgba(3, 7, 18, 0.95)"
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2

      for (let i = 0; i < numStars; i++) {
        const star = stars[i]
        star.pz = star.z
        star.z -= currentSpeed

        // Recycle star when it passes the camera viewport
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * width * 2
          star.y = (Math.random() - 0.5) * height * 2
          star.z = width
          star.pz = width
        }

        const k = 250 / star.z
        const px = star.x * k + cx
        const py = star.y * k + cy

        const pk = 250 / star.pz
        const prevX = star.x * pk + cx
        const prevY = star.y * pk + cy

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const depthAlpha = Math.min(1, Math.max(0.1, 1 - star.z / width))

          ctx.beginPath()
          if (isHyperspace && currentSpeed > 5) {
            // Hyperspace Streaks: Blue-cyan core with white tips
            const grad = ctx.createLinearGradient(prevX, prevY, px, py)
            grad.addColorStop(0, "rgba(6, 182, 212, 0)")
            grad.addColorStop(0.5, `rgba(6, 182, 212, ${depthAlpha * 0.7})`)
            grad.addColorStop(1, `rgba(255, 255, 255, ${depthAlpha})`)

            ctx.strokeStyle = grad
            ctx.lineWidth = Math.max(1, (1 - star.z / width) * 2.5)
            ctx.moveTo(prevX, prevY)
            ctx.lineTo(px, py)
            ctx.stroke()
          } else {
            // Ambient Sublight Space: subtle twinkling white points
            ctx.fillStyle = `rgba(220, 240, 255, ${depthAlpha * 0.8})`
            ctx.arc(px, py, Math.max(0.6, (1 - star.z / width) * 1.5), 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [isHyperspace])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{ opacity: isHyperspace ? 0.85 : 0.25 }}
    />
  )
}