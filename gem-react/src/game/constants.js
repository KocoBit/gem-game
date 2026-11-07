export const N = 8; // board size (N x N)
export const T = 7; // number of gem types

// [light, dark] gradient colors per gem type (PRD B-2)
export const COLORS = [
  ['#ff4d6d', '#8a0020'], // 0 red circle
  ['#ff9f1c', '#9a4a00'], // 1 orange hexagon
  ['#ffe14d', '#a68400'], // 2 yellow star
  ['#3ddc84', '#006b33'], // 3 green octagon
  ['#4dabff', '#0a3f8a'], // 4 blue diamond
  ['#b46bff', '#4b1590'], // 5 purple triangle
  ['#f4f4ff', '#8a8aa8'], // 6 white heart
];

export const HINT_MS = 2500; // PRD H-1
export const AUTO_HINT_MS = 8000; // PRD H-2

// PRD P-3
export const levelGoal = (level) => 600 + (level - 1) * 400;
