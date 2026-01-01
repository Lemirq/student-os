"use client";

import React, {
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";

interface MousePosition {
  x: number;
  y: number;
}

const SpotlightContext = createContext<MousePosition | null>(null);

export function useMousePosition(): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return mousePosition;
}

interface SpotlightGridProps {
  children: React.ReactNode;
  className?: string;
}

export const SpotlightGrid = ({ children, className }: SpotlightGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition();

  return (
    <div className={className} ref={containerRef}>
      <SpotlightContext.Provider value={mousePosition}>
        {children}
      </SpotlightContext.Provider>
    </div>
  );
};

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SpotlightCard = ({
  children,
  className = "",
}: SpotlightCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const mousePosition = useContext(SpotlightContext);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (divRef.current && mousePosition) {
      const rect = divRef.current.getBoundingClientRect();
      setOverlayPosition({
        x: mousePosition.x - rect.left,
        y: mousePosition.y - rect.top,
      });
    }
  }, [mousePosition]);

  return (
    <div
      ref={divRef}
      className={`relative overflow-hidden rounded-xl bg-background p-px ${className}`}
    >
      {/* Background Glow (Blob) - Visible through the border gap and semi-transparent inner card */}
      <div
        className="pointer-events-none absolute inset-0 transition duration-300"
        style={{
          background: `radial-gradient(600px circle at ${overlayPosition.x}px ${overlayPosition.y}px, #3C41CD, transparent 40%)`,
          opacity: 0.3, // Monochrome glow intensity
        }}
      />

      {/* Inner Content Card */}
      <div className="relative h-full w-full rounded-xl bg-background/40 backdrop-blur-xl p-px">
        {children}
      </div>
    </div>
  );
};
