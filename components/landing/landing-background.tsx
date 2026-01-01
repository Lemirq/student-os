"use client";

import { useEffect, useRef, useState } from "react";

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize] = useState(40); // Matches the CSS background size
  const requestRef = useRef<number>(0);
  const trailRef = useRef<{ x: number; y: number; opacity: number }[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    resizeObserver.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate grid coordinates
      const col = Math.floor(x / gridSize);
      const row = Math.floor(y / gridSize);

      mouseRef.current = { x: col, y: row };

      // Add to trail if not already the most recent point
      const lastPoint = trailRef.current[trailRef.current.length - 1];
      if (!lastPoint || lastPoint.x !== col || lastPoint.y !== row) {
        trailRef.current.push({ x: col, y: row, opacity: 1.0 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const primaryColor = "#3C41CD";

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter and update trail
      trailRef.current = trailRef.current
        .map((point) => ({ ...point, opacity: point.opacity - 0.005 })) // Slower decay
        .filter((point) => point.opacity > 0);

      // Draw trail
      trailRef.current.forEach((point) => {
        // Use color-mix for accurate color blending
        // We calculate the transparency percentage: 100% transparent = 0 opacity
        // 40% max opacity means 60% transparent
        const transparency = 100 - point.opacity * 40;
        ctx.fillStyle = `color-mix(in srgb, ${primaryColor}, transparent ${Math.max(0, transparency)}%)`;

        ctx.fillRect(
          point.x * gridSize,
          point.y * gridSize,
          gridSize,
          gridSize,
        );
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gridSize]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-50 h-full w-full bg-background overflow-hidden"
    >
      {/* Dark gradient background base */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

      {/* Static Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Interactive Grid Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 110%)",
        }}
      />

      {/* Top Spotlight / Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/20 blur-[120px] rounded-[100%] opacity-50 pointer-events-none" />

      {/* Secondary glow for depth */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/30 blur-[100px] rounded-[100%] opacity-40 pointer-events-none" />
    </div>
  );
}
