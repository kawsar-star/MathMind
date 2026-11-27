import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

export const AmbientGlassBackdrop: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 print:hidden"
    >
      {/* Subtle mathematical coordinate lattice */}
      <div className="absolute inset-0 glass-grid-pattern opacity-60 dark:opacity-45" />

      {/* Top-left bright sky & cyan refraction orb */}
      <div
        className="animate-orb-a absolute -top-28 -left-24 w-[440px] h-[440px] rounded-full blur-3xl opacity-45 dark:opacity-28"
        style={{
          background:
            'radial-gradient(circle at center, rgba(14, 165, 233, 0.42), rgba(6, 182, 212, 0.12) 65%, transparent 75%)',
        }}
      />

      {/* Top-right vibrant violet & magenta refraction orb */}
      <div
        className="animate-orb-b absolute top-12 -right-24 w-[460px] h-[460px] rounded-full blur-3xl opacity-40 dark:opacity-25"
        style={{
          background:
            'radial-gradient(circle at center, rgba(168, 85, 247, 0.36), rgba(236, 72, 153, 0.10) 65%, transparent 75%)',
        }}
      />

      {/* Mid-left warm sunny amber & coral glow */}
      <div
        className="animate-orb-b absolute top-1/2 -left-28 w-[360px] h-[360px] rounded-full blur-3xl opacity-35 dark:opacity-20"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245, 158, 11, 0.34), rgba(244, 63, 94, 0.08) 65%, transparent 75%)',
        }}
      />

      {/* Lower-right fresh emerald & mint glow */}
      <div
        className="animate-orb-a absolute -bottom-32 left-1/3 w-[420px] h-[420px] rounded-full blur-3xl opacity-38 dark:opacity-22"
        style={{
          background:
            'radial-gradient(circle at center, rgba(16, 185, 129, 0.36), rgba(20, 184, 166, 0.08) 65%, transparent 75%)',
        }}
      />
    </div>
  );
};

interface GlassSurface3DProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  tiltMaxDeg?: number;
  hoverLift?: boolean;
  asButton?: boolean;
  ariaLabel?: string;
  delay?: number;
}

export const GlassSurface3D: React.FC<GlassSurface3DProps> = ({
  children,
  className = '',
  onClick,
  tiltMaxDeg = 3.5,
  hoverLift = true,
  asButton = false,
  ariaLabel,
  delay = 0,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 24 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 24 });

  const specularGradient = useMotionTemplate`radial-gradient(280px circle at ${pointerX}% ${pointerY}%, rgba(255, 255, 255, 0.16), transparent 70%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType === 'touch' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    pointerX.set(Math.round(px * 100));
    pointerY.set(Math.round(py * 100));
    rawRotateX.set((0.5 - py) * tiltMaxDeg * 2);
    rawRotateY.set((px - 0.5) * tiltMaxDeg * 2);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  const interactiveProps = asButton
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': ariaLabel,
        onClick,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        },
      }
    : onClick
    ? { onClick }
    : {};

  return (
    <motion.div
      ref={containerRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverLift && !prefersReducedMotion ? { y: -3 } : undefined}
      whileTap={onClick && !prefersReducedMotion ? { scale: 0.99 } : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        prefersReducedMotion
          ? undefined
          : {
              transformPerspective: 920,
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }
      }
      className={`relative overflow-hidden glass-panel-3d border ${
        onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500' : ''
      } ${className}`}
      {...interactiveProps}
    >
      {/* Dynamic 3D Specular Sheen Layer */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: specularGradient,
            opacity: hovered ? 1 : 0,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};
