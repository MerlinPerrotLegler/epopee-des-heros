export interface ParticlePreset {
  speed: { min: number; max: number };
  lifespan: number;
  alpha?: { start: number; end: number };
  scale?: { start: number; end: number };
  gravityY?: number;
  blendMode?: "NORMAL" | "ADD" | "MULTIPLY" | "SCREEN";
  quantity?: number;
  frequency?: number;
  tint?: number[];
}

export const PARTICLE_PRESETS = {
  cardPlay: {
    speed: { min: 50, max: 200 },
    lifespan: 600,
    alpha: { start: 1, end: 0 },
    scale: { start: 0.6, end: 0 },
    blendMode: "ADD",
    quantity: 15,
    tint: [0xffdd44, 0xff8800, 0xffaa22],
  },
  ambientDust: {
    speed: { min: 5, max: 15 },
    lifespan: 4000,
    alpha: { start: 0.3, end: 0 },
    scale: { start: 0.2, end: 0.4 },
    blendMode: "NORMAL",
    frequency: 200,
    quantity: 1,
    tint: [0xffffff, 0xcccccc],
  },
  scorePopup: {
    speed: { min: 100, max: 300 },
    lifespan: 800,
    alpha: { start: 1, end: 0 },
    scale: { start: 0.8, end: 0.2 },
    gravityY: 200,
    blendMode: "ADD",
    quantity: 20,
    tint: [0x44ff44, 0x88ff88],
  },
  diceImpact: {
    speed: { min: 80, max: 250 },
    lifespan: 500,
    alpha: { start: 1, end: 0 },
    scale: { start: 0.5, end: 0 },
    blendMode: "ADD",
    quantity: 25,
    tint: [0xffffff, 0xaaddff, 0x88bbff],
  },
  magicAura: {
    speed: { min: 10, max: 40 },
    lifespan: 1200,
    alpha: { start: 0.6, end: 0 },
    scale: { start: 0.3, end: 0.8 },
    blendMode: "ADD",
    frequency: 50,
    quantity: 2,
    tint: [0x8844ff, 0xaa66ff, 0xcc88ff],
  },
} as const satisfies Record<string, ParticlePreset>;

export type ParticlePresetName = keyof typeof PARTICLE_PRESETS;
