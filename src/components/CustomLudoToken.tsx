import React, { useEffect, useState } from 'react';
import { PlayerColor } from '../types/ludo';
import { COLOR_CONFIG } from '../utils/ludoConstants';
import { sound } from '../utils/soundEffects';

interface CustomLudoTokenProps {
  color: PlayerColor;
  tokenIndex: number;
  isLegal: boolean;
  isHome: boolean;
  isHopping?: boolean;
  hopKey?: number;
  isSwooshing?: boolean;
  theme?: 'dark' | 'light';
  onClick?: () => void;
}

export const CustomLudoToken: React.FC<CustomLudoTokenProps> = ({
  color,
  tokenIndex,
  isLegal,
  isHome,
  isHopping = false,
  hopKey = 0,
  isSwooshing = false,
  theme = 'light',
  onClick,
}) => {
  const cfg = COLOR_CONFIG[color];
  const isLight = theme === 'light';

  // State to trigger squash-and-stretch upon hop landing
  const [isLanding, setIsLanding] = useState<boolean>(false);

  useEffect(() => {
    if (isHopping) {
      setIsLanding(false);
    } else if (hopKey > 0) {
      setIsLanding(true);
      const timer = setTimeout(() => setIsLanding(false), 260);
      return () => clearTimeout(timer);
    }
  }, [isHopping, hopKey]);

  // Distinct theme palettes:
  // Light: Glossy, candy-like token accents (Neon Red, Green, Yellow, Blue)
  // Dark: Emissive neon tokens that cast soft glowing light
  const tokenPalettes = {
    light: {
      red: {
        rim: '#B91C1C',
        body: 'url(#candyRedGrad)',
        innerRing: '#FFFFFF',
        core: '#991B1B',
        glow: 'rgba(239, 68, 68, 0.45)',
        highlight: '#FFFFFF',
      },
      blue: {
        rim: '#1D4ED8',
        body: 'url(#candyBlueGrad)',
        innerRing: '#FFFFFF',
        core: '#1E40AF',
        glow: 'rgba(37, 99, 235, 0.45)',
        highlight: '#FFFFFF',
      },
      yellow: {
        rim: '#B45309',
        body: 'url(#candyYellowGrad)',
        innerRing: '#FFFFFF',
        core: '#92400E',
        glow: 'rgba(245, 158, 11, 0.45)',
        highlight: '#FFFFFF',
      },
      green: {
        rim: '#047857',
        body: 'url(#candyGreenGrad)',
        innerRing: '#FFFFFF',
        core: '#065F46',
        glow: 'rgba(16, 185, 129, 0.45)',
        highlight: '#FFFFFF',
      },
    },
    dark: {
      red: {
        rim: '#FF007F',
        body: 'url(#cyberNeonRedGrad)',
        innerRing: '#FFA8DF',
        core: '#880033',
        glow: 'rgba(255, 0, 127, 0.85)',
        highlight: '#FFFFFF',
      },
      blue: {
        rim: '#00F0FF',
        body: 'url(#cyberNeonBlueGrad)',
        innerRing: '#A5F8FF',
        core: '#005288',
        glow: 'rgba(0, 240, 255, 0.85)',
        highlight: '#FFFFFF',
      },
      yellow: {
        rim: '#FFE600',
        body: 'url(#cyberNeonYellowGrad)',
        innerRing: '#FFF7A5',
        core: '#886B00',
        glow: 'rgba(255, 230, 0, 0.85)',
        highlight: '#FFFFFF',
      },
      green: {
        rim: '#00FF88',
        body: 'url(#cyberNeonGreenGrad)',
        innerRing: '#B5FFD7',
        core: '#006B38',
        glow: 'rgba(0, 255, 136, 0.85)',
        highlight: '#FFFFFF',
      },
    },
  }[isLight ? 'light' : 'dark'][color];

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isLegal && onClick) {
      sound.playClick();
      sound.hapticImpact('light');
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onTouchEnd={handleClick}
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isLegal
          ? 'cursor-pointer pointer-events-auto z-40'
          : 'pointer-events-none z-20'
      }`}
    >
      {/* Tactile legal move beacon with soft glow */}
      {isLegal && (
        <div
          onClick={handleClick}
          className={`absolute -inset-1.5 sm:-inset-2 rounded-full border-2 animate-pulse pointer-events-auto z-50 cursor-pointer ${
            isLight
              ? 'border-amber-400 bg-amber-400/25 shadow-[0_0_12px_rgba(245,158,11,0.65)]'
              : 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_16px_rgba(6,182,212,0.85)]'
          }`}
        />
      )}

      {/* Tactile Token Container with smooth arc hops and squash-and-stretch landing */}
      <div
        key={isHopping ? `hop_${hopKey}` : undefined}
        className={`relative flex items-center justify-center transition-transform duration-150 ${
          isSwooshing
            ? 'animate-token-swoosh z-50'
            : isHopping
            ? 'animate-token-hop z-50'
            : isLanding
            ? 'animate-token-landing z-40'
            : isLegal
            ? 'scale-115 -translate-y-1 animate-bounce z-40 hover:-translate-y-1.5 hover:scale-120'
            : 'hover:scale-[1.05] hover:-translate-y-0.5'
        }`}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-[86%] h-[86%] max-w-[28px] max-h-[28px] aspect-square"
          style={{
            overflow: 'visible',
            // Filter lives on the static SVG, not on the element the hop animation transforms,
            // so it is rasterized once instead of being recomputed every animation frame.
            filter: !isLight
              ? `drop-shadow(0 0 7px ${tokenPalettes.glow}) drop-shadow(0 4px 6px rgba(0,0,0,0.6))`
              : `drop-shadow(0 5px 8px rgba(14,23,38,0.25))`,
          }}
        >
          <defs>
            {/* Light Theme Candy Gradients */}
            <radialGradient id="candyRedGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FF4B72" />
              <stop offset="60%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#9F1239" />
            </radialGradient>
            <radialGradient id="candyBlueGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="60%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </radialGradient>
            <radialGradient id="candyYellowGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#A16207" />
            </radialGradient>
            <radialGradient id="candyGreenGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="60%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#14532D" />
            </radialGradient>

            {/* Dark Theme Emissive Neon Gradients */}
            <radialGradient id="cyberNeonRedGrad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FF77BA" />
              <stop offset="55%" stopColor="#FF007F" />
              <stop offset="100%" stopColor="#7F0038" />
            </radialGradient>
            <radialGradient id="cyberNeonBlueGrad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#70FAFF" />
              <stop offset="55%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#004D73" />
            </radialGradient>
            <radialGradient id="cyberNeonYellowGrad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FFF275" />
              <stop offset="55%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#806200" />
            </radialGradient>
            <radialGradient id="cyberNeonGreenGrad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#6EFFBA" />
              <stop offset="55%" stopColor="#00FF88" />
              <stop offset="100%" stopColor="#005C2E" />
            </radialGradient>
          </defs>

          {/* 1. Beveled Base Shadow */}
          <ellipse
            cx="16"
            cy="18"
            rx="14"
            ry="12"
            fill={isLight ? 'rgba(14,23,38,0.22)' : 'rgba(0,0,0,0.6)'}
          />

          {/* 2. Outer Disk Body */}
          <circle
            cx="16"
            cy="16"
            r="14"
            fill={tokenPalettes.body}
            stroke={tokenPalettes.rim}
            strokeWidth="1.6"
          />

          {/* 3. Concentric Tactile Ring */}
          <circle
            cx="16"
            cy="16"
            r="10.5"
            fill="none"
            stroke={tokenPalettes.innerRing}
            strokeWidth="1.4"
            strokeOpacity={isLight ? '0.85' : '0.9'}
          />

          {/* 4. Raised Core Bevel */}
          <circle
            cx="16"
            cy="16"
            r="6.5"
            fill={tokenPalettes.core}
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeOpacity={isLight ? '0.7' : '0.85'}
          />

          {/* 5. Center Icon (Victory Star/Crown or Polished Core) */}
          {isHome ? (
            <g transform="translate(10.5, 10.5) scale(0.45)">
              <path
                d="M3 17h18M5 17l-2-9 5.5 4L12 4l3.5 8L21 8l-2 9"
                fill="#FBBF24"
                stroke="#D97706"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            <circle cx="15.2" cy="15.2" r="1.6" fill="#FFFFFF" fillOpacity="0.95" />
          )}

          {/* 6. Glossy Top Specular Arc Highlight */}
          <path
            d="M 7 11 A 11 11 0 0 1 25 11"
            fill="none"
            stroke={tokenPalettes.highlight}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={isLight ? '0.65' : '0.8'}
          />
        </svg>
      </div>
    </div>
  );
};
