import { PlayerColor } from '../types/ludo';

export interface GridCoord {
  r: number;
  c: number;
}

// 52 Perimeter track cells clockwise starting at Green entry point (13, 6)
export const TRACK_COORDINATES: GridCoord[] = [
  { r: 13, c: 6 }, // 0: Green Start (Safe)
  { r: 12, c: 6 }, // 1
  { r: 11, c: 6 }, // 2
  { r: 10, c: 6 }, // 3
  { r: 9, c: 6 },  // 4
  { r: 8, c: 5 },  // 5
  { r: 8, c: 4 },  // 6
  { r: 8, c: 3 },  // 7
  { r: 8, c: 2 },  // 8: Red Star (Safe)
  { r: 8, c: 1 },  // 9
  { r: 8, c: 0 },  // 10
  { r: 7, c: 0 },  // 11
  { r: 6, c: 0 },  // 12
  { r: 6, c: 1 },  // 13: Red Start (Safe)
  { r: 6, c: 2 },  // 14
  { r: 6, c: 3 },  // 15
  { r: 6, c: 4 },  // 16
  { r: 6, c: 5 },  // 17
  { r: 5, c: 6 },  // 18
  { r: 4, c: 6 },  // 19
  { r: 3, c: 6 },  // 20
  { r: 2, c: 6 },  // 21: Blue Star (Safe)
  { r: 1, c: 6 },  // 22
  { r: 0, c: 6 },  // 23
  { r: 0, c: 7 },  // 24
  { r: 0, c: 8 },  // 25
  { r: 1, c: 8 },  // 26: Blue Start (Safe)
  { r: 2, c: 8 },  // 27
  { r: 3, c: 8 },  // 28
  { r: 4, c: 8 },  // 29
  { r: 5, c: 8 },  // 30
  { r: 6, c: 9 },  // 31
  { r: 6, c: 10 }, // 32
  { r: 6, c: 11 }, // 33
  { r: 6, c: 12 }, // 34: Yellow Star (Safe)
  { r: 6, c: 13 }, // 35
  { r: 6, c: 14 }, // 36
  { r: 7, c: 14 }, // 37
  { r: 8, c: 14 }, // 38
  { r: 8, c: 13 }, // 39: Yellow Start (Safe)
  { r: 8, c: 12 }, // 40
  { r: 8, c: 11 }, // 41
  { r: 8, c: 10 }, // 42
  { r: 8, c: 9 },  // 43
  { r: 9, c: 8 },  // 44
  { r: 10, c: 8 }, // 45
  { r: 11, c: 8 }, // 46
  { r: 12, c: 8 }, // 47: Green Star (Safe)
  { r: 13, c: 8 }, // 48
  { r: 14, c: 8 }, // 49
  { r: 14, c: 7 }, // 50
  { r: 14, c: 6 }, // 51
];

// Start offsets matching the user's authentic board layout:
// Top-Left: Red (13), Top-Right: Blue (26), Bottom-Right: Yellow (39), Bottom-Left: Green (0)
export const COLOR_START_OFFSETS: Record<PlayerColor, number> = {
  red: 13,
  blue: 26,
  yellow: 39,
  green: 0,
};

// Safe squares on the 52-tile track (4 starting squares + 4 star squares)
export const SAFE_TRACK_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// 5 colored home-run lane steps for each color leading to center (step 51 to 55)
export const HOME_RUN_COORDINATES: Record<PlayerColor, GridCoord[]> = {
  red: [
    { r: 7, c: 1 },
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 },
  ],
  blue: [
    { r: 1, c: 7 },
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 },
  ],
  yellow: [
    { r: 7, c: 13 },
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 },
  ],
  green: [
    { r: 13, c: 7 },
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 },
  ],
};

// Center Home coordinates (step 56)
export const CENTER_HOME_COORD: GridCoord = { r: 7, c: 7 };

// 4 Yard token spawn coordinates for each color (centered symmetrically inside yard cards with generous margins)
export const YARD_SLOT_COORDINATES: Record<PlayerColor, GridCoord[]> = {
  red: [
    { r: 1.4, c: 1.4 },
    { r: 1.4, c: 3.6 },
    { r: 3.6, c: 1.4 },
    { r: 3.6, c: 3.6 },
  ],
  blue: [
    { r: 1.4, c: 10.4 },
    { r: 1.4, c: 12.6 },
    { r: 3.6, c: 10.4 },
    { r: 3.6, c: 12.6 },
  ],
  yellow: [
    { r: 10.4, c: 10.4 },
    { r: 10.4, c: 12.6 },
    { r: 12.6, c: 10.4 },
    { r: 12.6, c: 12.6 },
  ],
  green: [
    { r: 10.4, c: 1.4 },
    { r: 10.4, c: 3.6 },
    { r: 12.6, c: 1.4 },
    { r: 12.6, c: 3.6 },
  ],
};

// Clockwise turn order in official Ludo: Red -> Blue -> Yellow -> Green
export const COLOR_TURN_ORDER: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

// Visual theme configurations
export const COLOR_CONFIG: Record<
  PlayerColor,
  {
    name: string;
    primary: string;
    gradient: string;
    border: string;
    glow: string;
    shadow: string;
    tokenGradient: string;
    text: string;
    bgMuted: string;
  }
> = {
  red: {
    name: 'Ruby Red',
    primary: '#e11d48',
    gradient: 'from-rose-500 to-rose-700',
    border: 'border-rose-500',
    glow: 'rgba(225, 29, 72, 0.45)',
    shadow: 'shadow-[0_4px_14px_rgba(225,29,72,0.4)]',
    tokenGradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 50%, #9f1239 100%)',
    text: 'text-rose-500',
    bgMuted: 'bg-rose-500/10',
  },
  blue: {
    name: 'Sapphire Blue',
    primary: '#2563eb',
    gradient: 'from-blue-500 to-blue-700',
    border: 'border-blue-500',
    glow: 'rgba(37, 99, 235, 0.45)',
    shadow: 'shadow-[0_4px_14px_rgba(37,99,235,0.4)]',
    tokenGradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)',
    text: 'text-blue-500',
    bgMuted: 'bg-blue-500/10',
  },
  yellow: {
    name: 'Amber Gold',
    primary: '#d97706',
    gradient: 'from-amber-400 to-amber-600',
    border: 'border-amber-500',
    glow: 'rgba(217, 119, 6, 0.45)',
    shadow: 'shadow-[0_4px_14px_rgba(217,119,6,0.4)]',
    tokenGradient: 'linear-gradient(135deg, #fcd34d 0%, #d97706 50%, #78350f 100%)',
    text: 'text-amber-500',
    bgMuted: 'bg-amber-500/10',
  },
  green: {
    name: 'Emerald Green',
    primary: '#059669',
    gradient: 'from-emerald-500 to-emerald-700',
    border: 'border-emerald-500',
    glow: 'rgba(5, 150, 105, 0.45)',
    shadow: 'shadow-[0_4px_14px_rgba(5,150,105,0.4)]',
    tokenGradient: 'linear-gradient(135deg, #34d399 0%, #059669 50%, #064e3b 100%)',
    text: 'text-emerald-500',
    bgMuted: 'bg-emerald-500/10',
  },
};

// Center Home coordinates for each color inside their respective victory triangles
export const HOME_CENTER_COORDINATES: Record<PlayerColor, GridCoord> = {
  red: { r: 7, c: 6.4 },
  blue: { r: 6.4, c: 7 },
  yellow: { r: 7, c: 7.6 },
  green: { r: 7.6, c: 7 },
};


/**
 * Returns grid coordinates {r, c} for a given token step and color.
 * Includes defensive argument detection to ensure locked tokens (step = -1)
 * are NEVER mistakenly placed on the track.
 */
export function getTokenCoordinates(
  color: PlayerColor,
  arg1: number,
  arg2: number = 0
): GridCoord {
  let step: number;
  let tokenIndex: number;

  // If one argument is negative (e.g. -1 for locked token in base) or > 3, it is definitely 'step'
  if (arg1 < 0 || arg1 > 3) {
    step = arg1;
    tokenIndex = Math.max(0, Math.min(3, Math.round(arg2)));
  } else if (arg2 < 0 || arg2 > 3) {
    step = arg2;
    tokenIndex = Math.max(0, Math.min(3, Math.round(arg1)));
  } else {
    // Both 0..3: standard order is (color, step, tokenIndex)
    step = arg1;
    tokenIndex = Math.max(0, Math.min(3, Math.round(arg2)));
  }

  if (step < 0) {
    // In Yard - guaranteed to return slot coordinate inside base card
    const yardSlots = YARD_SLOT_COORDINATES[color] || YARD_SLOT_COORDINATES.red;
    return yardSlots[tokenIndex] || yardSlots[0];
  }
  if (step >= 56) {
    // In Home Center victory triangle
    return HOME_CENTER_COORDINATES[color] || CENTER_HOME_COORD;
  }
  if (step >= 51) {
    // In Home Run lane (step 51 to 55)
    const lane = HOME_RUN_COORDINATES[color] || HOME_RUN_COORDINATES.red;
    const laneIdx = Math.min(4, Math.max(0, step - 51));
    return lane[laneIdx];
  }
  // On outer track (step 0 to 50)
  const trackIdx = (COLOR_START_OFFSETS[color] + step) % 52;
  return TRACK_COORDINATES[trackIdx];
}

/**
 * Checks if a token position is safe from capture
 */
export function isPositionSafe(color: PlayerColor, step: number): boolean {
  if (step < 0 || step >= 51) {
    return true;
  }
  const trackIdx = (COLOR_START_OFFSETS[color] + step) % 52;
  return SAFE_TRACK_INDICES.has(trackIdx);
}
